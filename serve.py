from __future__ import annotations

import json
import os
import threading
import time
from collections import defaultdict
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import posixpath
from urllib.parse import quote, unquote, urlparse


ROOT = Path(__file__).resolve().parent
DOWNLOADS_DIR = ROOT / "downloads"
CONFIG_PATH = ROOT / "site_config.json"
DEFAULT_PORT = int(os.environ.get("PORT", "8080"))

# Only GitHub releases URLs are accepted as redirect targets
_ALLOWED_REDIRECT_PREFIX = "https://github.com/"

# Statik olarak servis edilebilecek path'ler (allowlist)
_STATIC_EXACT = {"/index.html", "/app.css", "/app.js", "/privacy.html"}
_STATIC_PREFIXES = ("/assets/", "/downloads/")

# Rate limiting: 60 saniyede max 15 /download isteği per IP
_RATE_LIMIT = 15
_RATE_WINDOW = 60
_rate_store: dict[str, list[float]] = defaultdict(list)
_rate_lock = threading.Lock()


def _is_rate_limited(ip: str) -> bool:
    now = time.monotonic()
    with _rate_lock:
        timestamps = [t for t in _rate_store[ip] if now - t < _RATE_WINDOW]
        if len(timestamps) >= _RATE_LIMIT:
            _rate_store[ip] = timestamps
            return True
        timestamps.append(now)
        _rate_store[ip] = timestamps
        if len(_rate_store) > 10_000:
            cutoff = now - _RATE_WINDOW
            stale = [k for k, v in _rate_store.items() if not v or v[-1] < cutoff]
            for k in stale:
                del _rate_store[k]
        return False


def _is_static_allowed(path: str) -> bool:
    if path in _STATIC_EXACT:
        return True
    return any(path.startswith(prefix) for prefix in _STATIC_PREFIXES)


def _is_valid_redirect_url(url: str) -> bool:
    return url.startswith(_ALLOWED_REDIRECT_PREFIX)


def ensure_setup() -> None:
    DOWNLOADS_DIR.mkdir(exist_ok=True)
    if not CONFIG_PATH.exists():
        CONFIG_PATH.write_text(
            json.dumps(
                {
                    "download_filename": "",
                    "download_url": "",
                },
                ensure_ascii=False,
                indent=2,
            ),
            encoding="utf-8",
        )


def read_config() -> dict[str, str]:
    if not CONFIG_PATH.exists():
        return {"download_filename": "", "download_url": ""}

    with CONFIG_PATH.open("r", encoding="utf-8") as config_file:
        payload = json.load(config_file)

    return {
        "download_filename": str(payload.get("download_filename", "")).strip(),
        "download_url": str(payload.get("download_url", "")).strip(),
    }


def resolve_download_target() -> dict[str, str]:
    config = read_config()
    env_filename = os.environ.get("DENIKEY_DOWNLOAD_FILENAME", "").strip()

    if env_filename:
        candidate = DOWNLOADS_DIR / env_filename
        if candidate.is_file():
            return {"type": "local", "value": candidate.name}

    if config["download_filename"]:
        candidate = DOWNLOADS_DIR / config["download_filename"]
        if candidate.is_file():
            return {"type": "local", "value": candidate.name}

    for candidate in sorted(DOWNLOADS_DIR.iterdir()):
        if candidate.is_file() and not candidate.name.startswith("."):
            return {"type": "local", "value": candidate.name}

    if config["download_url"] and _is_valid_redirect_url(config["download_url"]):
        return {"type": "redirect", "value": config["download_url"]}

    return {"type": "", "value": ""}


def public_site_state() -> dict[str, object]:
    download_target = resolve_download_target()
    enabled = bool(download_target["value"])
    return {
        "download_enabled": enabled,
        "download_label": "İndir" if enabled else "Çok yakında",
    }


class DeniKeyHandler(SimpleHTTPRequestHandler):
    extensions_map = {
        **SimpleHTTPRequestHandler.extensions_map,
        ".html": "text/html; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".js": "application/javascript; charset=utf-8",
        ".json": "application/json; charset=utf-8",
        ".svg": "image/svg+xml",
        ".png": "image/png",
        ".ico": "image/x-icon",
    }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        clean_path = posixpath.normpath(unquote(parsed.path))

        if clean_path == "/":
            self.path = "/index.html"
            super().do_GET()
            return

        if clean_path == "/api/site-state":
            self.respond_json(public_site_state())
            return

        if clean_path == "/download":
            self.handle_download()
            return

        if _is_static_allowed(clean_path):
            self.path = clean_path
            super().do_GET()
            return

        self.send_error(HTTPStatus.NOT_FOUND)

    def do_POST(self) -> None:
        self.respond_method_not_allowed()

    def do_PUT(self) -> None:
        self.respond_method_not_allowed()

    def do_PATCH(self) -> None:
        self.respond_method_not_allowed()

    def do_DELETE(self) -> None:
        self.respond_method_not_allowed()

    def list_directory(self, path: str):
        self.send_error(HTTPStatus.NOT_FOUND)
        return None

    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()")
        self.send_header("Cross-Origin-Opener-Policy", "same-origin")
        self.send_header("Cross-Origin-Resource-Policy", "same-origin")
        self.send_header(
            "Content-Security-Policy",
            "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; "
            "connect-src 'self'; font-src 'self' data:; object-src 'none'; base-uri 'self'; "
            "form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests",
        )
        super().end_headers()

    def handle_download(self) -> None:
        client_ip = self.client_address[0]
        if _is_rate_limited(client_ip):
            self.send_error(HTTPStatus.TOO_MANY_REQUESTS)
            return

        download_target = resolve_download_target()

        if not download_target["value"]:
            self.send_response(HTTPStatus.FOUND)
            self.send_header("Location", "/#coming-soon")
            self.end_headers()
            return

        if download_target["type"] == "redirect":
            location = download_target["value"]
        else:
            location = f"/downloads/{quote(download_target['value'])}"

        self.send_response(HTTPStatus.FOUND)
        self.send_header("Location", location)
        self.end_headers()

    def respond_json(self, payload: dict[str, object], status: HTTPStatus = HTTPStatus.OK) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def respond_method_not_allowed(self) -> None:
        self.send_response(HTTPStatus.METHOD_NOT_ALLOWED)
        self.send_header("Allow", "GET, HEAD")
        self.end_headers()


def run() -> None:
    ensure_setup()
    server = ThreadingHTTPServer(("0.0.0.0", DEFAULT_PORT), DeniKeyHandler)
    print(f"DeniKey site hazır: http://127.0.0.1:{DEFAULT_PORT}")
    server.serve_forever()


if __name__ == "__main__":
    run()

from __future__ import annotations

import json
import os
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import quote, urlparse


ROOT = Path(__file__).resolve().parent
DOWNLOADS_DIR = ROOT / "downloads"
CONFIG_PATH = ROOT / "site_config.json"
DEFAULT_PORT = int(os.environ.get("PORT", "8080"))


def ensure_setup() -> None:
    DOWNLOADS_DIR.mkdir(exist_ok=True)
    if not CONFIG_PATH.exists():
        CONFIG_PATH.write_text(
            json.dumps(
                {
                    "download_filename": "",
                },
                ensure_ascii=False,
                indent=2,
            ),
            encoding="utf-8",
        )


def read_config() -> dict[str, str]:
    if not CONFIG_PATH.exists():
        return {"download_filename": ""}

    with CONFIG_PATH.open("r", encoding="utf-8") as config_file:
        payload = json.load(config_file)

    return {
        "download_filename": str(payload.get("download_filename", "")).strip(),
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

    return {"type": "", "value": ""}


def public_site_state() -> dict[str, object]:
    download_target = resolve_download_target()
    return {
        "download_enabled": bool(download_target["value"]),
        "download_kind": download_target["type"] or None,
        "download_name": download_target["value"] or None,
        "download_label": "İndir" if download_target["value"] else "Çok yakında",
    }


class DeniKeyHandler(SimpleHTTPRequestHandler):
    extensions_map = {
        **SimpleHTTPRequestHandler.extensions_map,
        ".html": "text/html; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".js": "application/javascript; charset=utf-8",
        ".json": "application/json; charset=utf-8",
        ".svg": "image/svg+xml",
    }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_GET(self) -> None:
        parsed = urlparse(self.path)

        if parsed.path == "/":
            self.path = "/index.html"
            super().do_GET()
            return

        if parsed.path == "/api/site-state":
            self.respond_json(public_site_state())
            return

        if parsed.path == "/download":
            self.handle_download()
            return

        super().do_GET()

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
        download_target = resolve_download_target()

        if not download_target["value"]:
            self.send_response(HTTPStatus.FOUND)
            self.send_header("Location", "/#coming-soon")
            self.end_headers()
            return

        self.send_response(HTTPStatus.FOUND)
        if download_target["type"] == "redirect":
            location = download_target["value"]
        else:
            location = f"/downloads/{quote(download_target['value'])}"
        self.send_header("Location", location)
        self.end_headers()

    def respond_json(self, payload: dict[str, object], status: HTTPStatus = HTTPStatus.OK) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
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

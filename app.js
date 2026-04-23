(function () {
  'use strict';

  // ── Language system ────────────────────────────────
  var LANG_KEY = 'denikey_lang';

  function getLang() {
    return localStorage.getItem(LANG_KEY) || 'en';
  }

  function applyTranslations() {
    var lang = getLang();
    var t = (typeof TRANSLATIONS !== 'undefined' && TRANSLATIONS[lang]) || {};

    document.documentElement.lang = lang;

    if (t['page.title']) document.title = t['page.title'];

    var metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc && t['page.meta.desc']) metaDesc.setAttribute('content', t['page.meta.desc']);

    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      if (t[key] !== undefined) el.textContent = t[key];
    });

    document.querySelectorAll('[data-i18n-html]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-html');
      if (t[key] !== undefined) el.innerHTML = t[key];
    });

    document.querySelectorAll('.lang-option').forEach(function (el) {
      el.classList.toggle('lang-option--active', el.getAttribute('data-lang') === lang);
    });
  }

  applyTranslations();

  // ── Splash animation ───────────────────────────────
  function buildSplash() {
    var splash = document.createElement('div');
    splash.id = 'splash';
    splash.className = 'splash';
    splash.innerHTML =
      '<div class="splash-rings">' +
        '<div class="splash-ring"></div>' +
        '<div class="splash-ring"></div>' +
        '<div class="splash-ring"></div>' +
      '</div>' +
      '<div class="splash-content">' +
        '<div class="splash-logo-wrap">' +
          '<div class="splash-glow"></div>' +
          '<img class="splash-logo" src="assets/denikey_logo.png" alt="DeniKey">' +
        '</div>' +
        '<div class="splash-wordmark">DeniKey</div>' +
      '</div>' +
      '<div class="splash-particles" id="splashParticles"></div>';
    document.body.insertBefore(splash, document.body.firstChild);

    var pc = document.getElementById('splashParticles');
    for (var i = 0; i < 14; i++) {
      var p = document.createElement('div');
      p.className = 'splash-particle';
      var size = Math.random() * 3 + 1.5;
      p.style.width  = size + 'px';
      p.style.height = size + 'px';
      p.style.left   = (10 + Math.random() * 80) + '%';
      p.style.top    = (15 + Math.random() * 70) + '%';
      p.style.animationDuration = (2 + Math.random() * 2.5) + 's';
      p.style.animationDelay    = (Math.random() * 1.8) + 's';
      pc.appendChild(p);
    }

    setTimeout(function () {
      splash.classList.add('splash--exit');
      setTimeout(function () {
        if (splash.parentNode) splash.parentNode.removeChild(splash);
      }, 650);
    }, 2400);
  }

  buildSplash();

  // ── Language dropdown ──────────────────────────────
  var langBtn      = document.getElementById('langBtn');
  var langDropdown = document.getElementById('langDropdown');
  var langSwitcher = document.getElementById('langSwitcher');

  if (langBtn && langDropdown) {
    langBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = langDropdown.classList.toggle('lang-dropdown--open');
      langBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });

    langDropdown.addEventListener('click', function (e) {
      var opt = e.target.closest('.lang-option');
      if (!opt) return;
      var lang = opt.getAttribute('data-lang');
      if (lang) {
        localStorage.setItem(LANG_KEY, lang);
        location.reload();
      }
    });

    document.addEventListener('click', function (e) {
      if (!langSwitcher.contains(e.target)) {
        langDropdown.classList.remove('lang-dropdown--open');
        langBtn.setAttribute('aria-expanded', 'false');
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        langDropdown.classList.remove('lang-dropdown--open');
        langBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // ── Toast ──────────────────────────────────────────
  var toast = document.getElementById('toast');
  var toastTimer = null;

  function showToast(msg, duration) {
    if (msg) document.getElementById('toastMessage').textContent = msg;
    toast.removeAttribute('hidden');
    requestAnimationFrame(function () {
      toast.classList.add('visible');
    });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toast.classList.remove('visible');
      setTimeout(function () { toast.setAttribute('hidden', ''); }, 300);
    }, duration || 3500);
  }

  if (window.location.hash === '#coming-soon') {
    history.replaceState(null, '', window.location.pathname);
    showToast();
  }

  // ── Download button ────────────────────────────────
  var downloadBtn = document.getElementById('downloadButton');

  if (downloadBtn) {
    fetch('/api/site-state')
      .then(function (r) { return r.json(); })
      .then(function (state) {
        if (!state.download_enabled) {
          downloadBtn.addEventListener('click', function (e) {
            e.preventDefault();
            showToast();
          });
        }
      })
      .catch(function () {});
  }

  // ── Reveal on scroll ───────────────────────────────
  var reveals = document.querySelectorAll('.reveal');

  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });

    reveals.forEach(function (el) { observer.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('in-view'); });
  }
}());

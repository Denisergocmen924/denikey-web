(function () {
  'use strict';

  // ── Language system ────────────────────────────────
  var LANG_KEY = 'denikey_lang';
  function getLang() { return localStorage.getItem(LANG_KEY) || 'en'; }

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
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-placeholder');
      if (t[key] !== undefined) el.setAttribute('placeholder', t[key]);
    });
    document.querySelectorAll('.lang-option').forEach(function (el) {
      el.classList.toggle('lang-option--active', el.getAttribute('data-lang') === lang);
    });
  }

  applyTranslations();

  // ── Splash ─────────────────────────────────────────
  function buildSplash() {
    var splash = document.createElement('div');
    splash.id = 'splash'; splash.className = 'splash';
    splash.innerHTML =
      '<div class="splash-rings"><div class="splash-ring"></div><div class="splash-ring"></div><div class="splash-ring"></div></div>' +
      '<div class="splash-content">' +
        '<div class="splash-logo-wrap"><div class="splash-glow"></div>' +
        '<img class="splash-logo" src="assets/denikey_logo.png" alt="DeniKey"></div>' +
        '<div class="splash-wordmark">DeniKey</div>' +
      '</div>' +
      '<div class="splash-particles" id="splashParticles"></div>';
    document.body.insertBefore(splash, document.body.firstChild);
    var pc = document.getElementById('splashParticles');
    for (var i = 0; i < 18; i++) {
      var p = document.createElement('div');
      p.className = 'splash-particle';
      var s = Math.random() * 3 + 1.5;
      p.style.cssText = 'width:' + s + 'px;height:' + s + 'px;left:' + (10 + Math.random() * 80) + '%;top:' + (15 + Math.random() * 70) + '%;animation-duration:' + (2 + Math.random() * 2.5) + 's;animation-delay:' + (Math.random() * 1.8) + 's;';
      pc.appendChild(p);
    }
    setTimeout(function () {
      splash.classList.add('splash--exit');
      setTimeout(function () { if (splash.parentNode) splash.parentNode.removeChild(splash); }, 650);
    }, 2400);
  }
  buildSplash();

  // ── Language dropdown ──────────────────────────────
  var langBtn = document.getElementById('langBtn');
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
      if (lang) { localStorage.setItem(LANG_KEY, lang); location.reload(); }
    });
    document.addEventListener('click', function (e) {
      if (!langSwitcher.contains(e.target)) {
        langDropdown.classList.remove('lang-dropdown--open');
        langBtn.setAttribute('aria-expanded', 'false');
      }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { langDropdown.classList.remove('lang-dropdown--open'); langBtn.setAttribute('aria-expanded', 'false'); }
    });
  }

  // ── Toast ──────────────────────────────────────────
  var toast = document.getElementById('toast');
  var toastTimer = null;
  function showToast(msg, dur) {
    if (msg) document.getElementById('toastMessage').textContent = msg;
    toast.removeAttribute('hidden');
    requestAnimationFrame(function () { toast.classList.add('visible'); });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toast.classList.remove('visible');
      setTimeout(function () { toast.setAttribute('hidden', ''); }, 300);
    }, dur || 3500);
  }
  if (window.location.hash === '#coming-soon') { history.replaceState(null, '', window.location.pathname); showToast(); }
  var downloadBtn = document.getElementById('downloadButton');
  if (downloadBtn) {
    fetch('/api/site-state').then(function (r) { return r.json(); }).then(function (s) {
      if (!s.download_enabled) downloadBtn.addEventListener('click', function (e) { e.preventDefault(); showToast(); });
    }).catch(function () {});
  }

  // ── Reveal on scroll ───────────────────────────────
  if ('IntersectionObserver' in window) {
    var revealObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in-view'); revealObs.unobserve(e.target); } });
    }, { threshold: 0.1 });
    document.querySelectorAll('.reveal').forEach(function (el) { revealObs.observe(el); });
  } else {
    document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('in-view'); });
  }

  // ── Hero parallax ──────────────────────────────────
  var heroSection = document.getElementById('hero');
  var heroVisual  = heroSection ? heroSection.querySelector('.hero-visual') : null;
  if (heroSection && heroVisual) {
    var tgtX = 0, tgtY = 0, curX = 0, curY = 0;
    heroSection.addEventListener('mousemove', function (e) {
      var r = heroSection.getBoundingClientRect();
      tgtX = ((e.clientX - r.left) / r.width  - 0.5) * 22;
      tgtY = ((e.clientY - r.top)  / r.height - 0.5) * 14;
    });
    heroSection.addEventListener('mouseleave', function () { tgtX = 0; tgtY = 0; });
    (function raf() {
      curX += (tgtX - curX) * 0.08;
      curY += (tgtY - curY) * 0.08;
      heroVisual.style.transform = 'translate(' + curX.toFixed(2) + 'px,' + curY.toFixed(2) + 'px)';
      requestAnimationFrame(raf);
    })();
  }

  // ── Hero floating dots ─────────────────────────────
  (function () {
    var hero = document.getElementById('hero');
    if (!hero) return;
    var colors = ['rgba(192,40,30,', 'rgba(34,211,238,', 'rgba(167,139,250,', 'rgba(251,191,36,'];
    for (var i = 0; i < 12; i++) {
      var d = document.createElement('div');
      d.className = 'hero-dot';
      var size = Math.random() * 4 + 2;
      var c = colors[Math.floor(Math.random() * colors.length)];
      var opacity = (Math.random() * 0.35 + 0.1).toFixed(2);
      var dur = (Math.random() * 8 + 6).toFixed(1);
      var delay = (Math.random() * 4).toFixed(1);
      var x = Math.random() * 90 + 5;
      var y = Math.random() * 80 + 10;
      var dist = Math.round(Math.random() * 30 + 10);
      d.style.cssText =
        'width:' + size + 'px;height:' + size + 'px;' +
        'left:' + x + '%;top:' + y + '%;' +
        'background:' + c + opacity + ');' +
        'box-shadow:0 0 ' + (size * 3) + 'px ' + c + (parseFloat(opacity) * 0.8) + ');' +
        'animation:dot-float-' + (i % 2) + ' ' + dur + 's ease-in-out ' + delay + 's infinite alternate;';
      hero.appendChild(d);
    }
    var style = document.createElement('style');
    style.textContent =
      '@keyframes dot-float-0{0%{transform:translate(0,0);}100%{transform:translate(10px,-20px) scale(1.4);}}' +
      '@keyframes dot-float-1{0%{transform:translate(0,0);}100%{transform:translate(-12px,16px) scale(0.7);}}';
    document.head.appendChild(style);
  })();

  // ── Stats counter with glitch ──────────────────────
  function animateCounter(el) {
    var target = parseInt(el.getAttribute('data-target'), 10);
    var dur = 1600;
    var start = performance.now();
    var glitch = '0123456789';
    function tick(now) {
      var p = Math.min((now - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      var current = Math.round(eased * target);
      if (p > 0.08 && p < 0.88 && Math.random() > 0.72) {
        el.textContent = target > 9
          ? String(current).slice(0, -1) + glitch[Math.floor(Math.random() * 10)]
          : glitch[Math.floor(Math.random() * 10)];
      } else {
        el.textContent = current;
      }
      if (p < 1) requestAnimationFrame(tick);
      else el.textContent = target;
    }
    requestAnimationFrame(tick);
  }

  if ('IntersectionObserver' in window) {
    var statObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { animateCounter(e.target); statObs.unobserve(e.target); }
      });
    }, { threshold: 0.6 });
    document.querySelectorAll('.stat-num').forEach(function (el) { statObs.observe(el); });
  }

  // ── Card 3D tilt ───────────────────────────────────
  document.querySelectorAll('.feature-card, .architecture-card, .stack-panel').forEach(function (card) {
    card.addEventListener('mousemove', function (e) {
      var r  = card.getBoundingClientRect();
      var rx = ((e.clientY - r.top)  / r.height - 0.5) * -6;
      var ry = ((e.clientX - r.left) / r.width  - 0.5) *  6;
      card.style.transform = 'perspective(700px) rotateX(' + rx + 'deg) rotateY(' + ry + 'deg) translateZ(6px)';
    });
    card.addEventListener('mouseleave', function () { card.style.transform = ''; });
  });

  // ── Encryption demo ────────────────────────────────
  var CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=!@#$%^&*';
  var HEX   = '0123456789abcdef';
  var OUT_LEN = 256, LINE_W = 64;
  var useHex  = false;

  function randomOutput() {
    var pool = useHex ? HEX : CHARS;
    var s = '';
    for (var i = 0; i < OUT_LEN; i++) {
      if (i > 0 && i % LINE_W === 0) s += '\n';
      s += pool[Math.floor(Math.random() * pool.length)];
    }
    return s;
  }

  var demoInputEl    = document.getElementById('demoInput');
  var demoOutputEl   = document.getElementById('demoOutput');
  var demoOutputText = document.getElementById('demoOutputText');
  var demoLockEl     = document.getElementById('demoLock');
  var demoPacketEl   = document.getElementById('demoPacket');
  var demoServerNode = document.getElementById('demoServerNode');
  var demoRightPanel = demoOutputEl ? demoOutputEl.closest('.demo-panel--right') : null;

  var scrambleRaf = null, sendTimer = null, isSending = false;
  var hexTimer = null;

  function scramble() {
    if (!demoOutputText) return;
    demoOutputText.textContent = randomOutput();
    scrambleRaf = requestAnimationFrame(scramble);
  }
  function stopScramble() {
    if (scrambleRaf) { cancelAnimationFrame(scrambleRaf); scrambleRaf = null; }
  }
  function startDemo() {
    if (scrambleRaf) return;
    if (demoOutputEl)   demoOutputEl.classList.add('scrambling');
    if (demoRightPanel) demoRightPanel.classList.add('active');
    if (demoLockEl)     demoLockEl.classList.add('active');
    useHex = false;
    scramble();
    hexTimer = setTimeout(function () { useHex = true; }, 600);
  }
  function triggerSend() {
    isSending = true;
    stopScramble();
    clearTimeout(hexTimer);
    if (demoLockEl) demoLockEl.classList.remove('active');
    if (demoPacketEl) {
      demoPacketEl.classList.remove('traveling');
      void demoPacketEl.offsetWidth;
      demoPacketEl.classList.add('traveling');
    }
    setTimeout(function () {
      if (demoServerNode) demoServerNode.classList.add('received');
      setTimeout(function () {
        if (demoServerNode) demoServerNode.classList.remove('received');
        isSending = false;
        if (demoInputEl && demoInputEl.value.length > 0) {
          startDemo();
          sendTimer = setTimeout(triggerSend, 3200);
        }
      }, 2400);
    }, 1500);
  }
  function resetDemo() {
    stopScramble(); clearTimeout(sendTimer); clearTimeout(hexTimer);
    if (demoOutputEl)   demoOutputEl.classList.remove('scrambling');
    if (demoRightPanel) demoRightPanel.classList.remove('active');
    if (demoLockEl)     demoLockEl.classList.remove('active');
    if (demoServerNode) demoServerNode.classList.remove('received');
    if (demoPacketEl)   demoPacketEl.classList.remove('traveling');
    if (demoOutputText) demoOutputText.textContent = '';
    isSending = false; useHex = false;
  }
  if (demoInputEl) {
    demoInputEl.addEventListener('input', function () {
      clearTimeout(sendTimer);
      if (demoInputEl.value.length === 0) { resetDemo(); return; }
      if (!isSending) startDemo();
      sendTimer = setTimeout(triggerSend, 1600);
    });
  }

  // ── Subtle glitch on hero heading ──────────────────
  var heroH1 = document.querySelector('.hero-copy h1');
  if (heroH1) {
    setInterval(function () {
      heroH1.style.animation = 'none';
      void heroH1.offsetWidth;
      heroH1.style.animation = '';
      heroH1.style.cssText += 'animation: gradient-shift 6s ease infinite, glitch-flicker 0.15s steps(1) forwards;';
      setTimeout(function () {
        heroH1.style.animation = 'gradient-shift 6s ease infinite';
      }, 150);
    }, 7000 + Math.random() * 4000);
  }

}());

// İletişim formu
function switchTab(type, btn) {
  document.getElementById('contact-type').value = type;
  document.querySelectorAll('.contact-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

async function submitContact(e) {
  e.preventDefault();
  const submit = document.getElementById('contact-submit');
  const result = document.getElementById('contact-result');
  submit.disabled = true;
  result.hidden = true;

  const lang = document.documentElement.lang || 'en';
  const t = (window.TRANSLATIONS && window.TRANSLATIONS[lang]) || {};

  const payload = {
    type: document.getElementById('contact-type').value,
    name: document.getElementById('cf-name').value.trim(),
    email: document.getElementById('cf-email').value.trim(),
    subject: document.getElementById('cf-subject').value.trim(),
    message: document.getElementById('cf-message').value.trim(),
  };

  try {
    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      result.textContent = t['contact.ok'] || 'Message sent!';
      result.className = 'contact-result ok';
      document.getElementById('contact-form').reset();
    } else {
      const err = await res.json().catch(() => ({}));
      result.textContent = err.error || t['contact.err'] || 'Error.';
      result.className = 'contact-result err';
    }
  } catch (_) {
    result.textContent = t['contact.err'] || 'Error.';
    result.className = 'contact-result err';
  }

  result.hidden = false;
  submit.disabled = false;
}

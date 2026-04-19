(function () {
  'use strict';

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

  // Show toast if server redirected back with #coming-soon
  if (window.location.hash === '#coming-soon') {
    history.replaceState(null, '', window.location.pathname);
    showToast('İndirme paketi şu anda hazırlanıyor.');
  }

  // ── Download buttons ───────────────────────────────
  var downloadBtns = document.querySelectorAll('.download-btn');

  if (downloadBtns.length) {
    fetch('/api/site-state')
      .then(function (r) { return r.json(); })
      .then(function (state) {
        if (!state.download_enabled) {
          downloadBtns.forEach(function (btn) {
            btn.addEventListener('click', function (e) {
              e.preventDefault();
              showToast('İndirme paketi şu anda hazırlanıyor.');
            });
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

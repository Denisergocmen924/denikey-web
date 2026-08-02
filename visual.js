/* visual.js — Three.js particle background + GSAP scroll animations + custom cursor */
(function () {
  'use strict';

  // ── Custom Cursor ─────────────────────────────────────
  var cursor = document.getElementById('cCursor');
  if (cursor && window.matchMedia('(hover: hover)').matches) {
    var cx = window.innerWidth / 2, cy = window.innerHeight / 2;
    var mx = cx, my = cy;

    cursor.classList.add('c-cursor--hidden');

    document.addEventListener('mousemove', function (e) {
      mx = e.clientX; my = e.clientY;
      cursor.classList.remove('c-cursor--hidden');
    });
    document.addEventListener('mouseleave', function () {
      cursor.classList.add('c-cursor--hidden');
    });
    document.addEventListener('mouseenter', function () {
      cursor.classList.remove('c-cursor--hidden');
    });

    (function animCursor() {
      cx += (mx - cx) * 0.2;
      cy += (my - cy) * 0.2;
      cursor.style.transform = 'translate(' + (cx - 5.5) + 'px,' + (cy - 5.5) + 'px)';
      requestAnimationFrame(animCursor);
    })();

    function addHover(sel) {
      document.querySelectorAll(sel).forEach(function (el) {
        el.addEventListener('mouseenter', function () { cursor.classList.add('c-cursor--hover'); });
        el.addEventListener('mouseleave', function () { cursor.classList.remove('c-cursor--hover'); });
      });
    }
    addHover('a, button, .feature-card, .architecture-card, .stack-panel, .contact-tab, .contact-submit, .btn-dl, .btn-ghost-arrow, input, textarea');
  } else if (cursor) {
    cursor.style.display = 'none';
  }

  // ── Three.js Particle Background ─────────────────────
  var canvas = document.getElementById('bg-canvas');

  if (typeof THREE !== 'undefined' && canvas) {
    (function () {
      var W = window.innerWidth;
      var H = window.innerHeight;
      var isMobile = W < 768;

      var scene = new THREE.Scene();
      var camera = new THREE.PerspectiveCamera(52, W / H, 1, 3000);
      camera.position.set(0, 0, 700);

      var renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: false });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      renderer.setSize(W, H);

      // Particle field
      var N = isMobile ? 800 : 2400;
      var pos = new Float32Array(N * 3);
      var col = new Float32Array(N * 3);

      // Refined palette — brand crimson, icy cyan, soft violet, warm white, deep amber
      var palette = [
        [0.78, 0.14, 0.10],
        [0.12, 0.82, 0.92],
        [0.62, 0.52, 0.96],
        [0.94, 0.95, 1.00],
        [0.96, 0.72, 0.12],
      ];

      for (var i = 0; i < N; i++) {
        var theta = Math.random() * Math.PI * 2;
        var phi   = Math.acos(2 * Math.random() - 1);
        var r     = 160 + Math.pow(Math.random(), 0.42) * 620;
        pos[i*3]   = r * Math.sin(phi) * Math.cos(theta);
        pos[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
        pos[i*3+2] = (Math.random() - 0.5) * 960;

        var c = palette[Math.floor(Math.random() * palette.length)];
        var b = 0.10 + Math.random() * 0.48;
        col[i*3]   = c[0] * b;
        col[i*3+1] = c[1] * b;
        col[i*3+2] = c[2] * b;
      }

      var pGeo = new THREE.BufferGeometry();
      pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      pGeo.setAttribute('color',    new THREE.BufferAttribute(col, 3));

      var pMat = new THREE.PointsMaterial({
        size: isMobile ? 1.5 : 2.0,
        vertexColors: true,
        transparent: true,
        opacity: 0.48,
        sizeAttenuation: true,
        depthWrite: false,
      });

      var points = new THREE.Points(pGeo, pMat);
      scene.add(points);

      // Wireframe icosahedra — very subtle
      var wireData = [
        { r: 90,  x: -250, y:  85, z: -380, s: 0.00026 },
        { r: 54,  x:  320, y: -75, z: -260, s: 0.00040 },
        { r: 108, x:  -50, y:-180, z: -510, s: 0.00018 },
        { r: 46,  x:  260, y: 170, z: -560, s: 0.00052 },
        { r: 70,  x: -310, y: -30, z: -220, s: 0.00030 },
      ];

      var meshes = wireData.map(function (d) {
        var g = new THREE.IcosahedronGeometry(d.r, 1);
        var m = new THREE.MeshBasicMaterial({
          color: 0xff5900,
          wireframe: true,
          transparent: true,
          opacity: 0.035,
        });
        var mesh = new THREE.Mesh(g, m);
        mesh.position.set(d.x, d.y, d.z);
        mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
        scene.add(mesh);
        return { mesh: mesh, s: d.s };
      });

      // Mouse / scroll tracking
      var pmx = 0, pmy = 0, camX = 0, camY = 0;
      var scrollRatio = 0;

      document.addEventListener('mousemove', function (e) {
        pmx = (e.clientX / window.innerWidth  - 0.5) * 2;
        pmy = (e.clientY / window.innerHeight - 0.5) * 2;
      });
      window.addEventListener('scroll', function () {
        var max = document.body.scrollHeight - window.innerHeight;
        scrollRatio = max > 0 ? window.scrollY / max : 0;
      }, { passive: true });
      window.addEventListener('resize', function () {
        W = window.innerWidth; H = window.innerHeight;
        isMobile = W < 768;
        camera.aspect = W / H;
        camera.updateProjectionMatrix();
        renderer.setSize(W, H);
      });

      // Render loop
      var t = 0;
      function tick() {
        requestAnimationFrame(tick);
        t += 0.0006;

        camX += (pmx * 28 - camX) * 0.028;
        camY += (-pmy * 14 - camY) * 0.028;
        camera.position.x = camX;
        camera.position.y = camY;
        camera.position.z = 700 - scrollRatio * 140;

        points.rotation.y = t * 0.35;
        points.rotation.x = t * 0.12;

        meshes.forEach(function (d) {
          d.mesh.rotation.x += d.s;
          d.mesh.rotation.y += d.s * 1.4;
        });

        renderer.render(scene, camera);
      }
      tick();

      document.body.classList.add('threejs-ready');
    })();
  }

  // ── GSAP Scroll Animations ────────────────────────────
  if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);

    // ── Hero entrance (after splash ~2.4s) ────────────
    var heroTl = gsap.timeline({ delay: 2.55 });
    heroTl
      .from('.hero-copy .eyebrow', {
        opacity: 0, y: 18, duration: 0.55, ease: 'power3.out',
      })
      .from('.hero-copy h1', {
        opacity: 0, y: 60, duration: 0.95, ease: 'power3.out',
      }, '-=0.25')
      .from('.hero-text', {
        opacity: 0, y: 30, duration: 0.72, ease: 'power3.out',
      }, '-=0.48')
      .from('.hero-actions > *', {
        opacity: 0, y: 20, stagger: 0.09, duration: 0.55, ease: 'power3.out',
      }, '-=0.44')
      .from('.hero-visual', {
        opacity: 0, x: 60, duration: 1.0, ease: 'power3.out',
      }, '-=0.65');

    // ── Section headings ──────────────────────────────
    document.querySelectorAll('.section-heading').forEach(function (el) {
      var eyebrow = el.querySelector('.eyebrow');
      var h2 = el.querySelector('h2');
      if (eyebrow) {
        gsap.from(eyebrow, {
          scrollTrigger: { trigger: el, start: 'top 85%', once: true },
          opacity: 0, y: 12, duration: 0.48, ease: 'power3.out',
        });
      }
      if (h2) {
        gsap.from(h2, {
          scrollTrigger: { trigger: el, start: 'top 85%', once: true },
          opacity: 0, y: 38, duration: 0.80, ease: 'power3.out', delay: 0.1,
        });
      }
    });

    // ── Feature cards — slide from left (editorial list) ──
    var fCards = document.querySelectorAll('.feature-card');
    if (fCards.length) {
      fCards.forEach(function (card, i) {
        gsap.from(card, {
          scrollTrigger: { trigger: card, start: 'top 88%', once: true },
          opacity: 0, x: -32, duration: 0.65, ease: 'power3.out',
          delay: i * 0.06,
        });
      });
    }

    // ── Architecture cards ────────────────────────────
    var aCards = document.querySelectorAll('.architecture-card');
    if (aCards.length) {
      gsap.from(aCards, {
        scrollTrigger: { trigger: '.architecture-grid', start: 'top 82%', once: true },
        opacity: 0, y: 40, stagger: 0.10, duration: 0.70, ease: 'power3.out',
      });
    }

    // ── Stack panels ──────────────────────────────────
    var sPanels = document.querySelectorAll('.stack-panel');
    if (sPanels.length) {
      gsap.from(sPanels, {
        scrollTrigger: { trigger: '.stack-shell', start: 'top 82%', once: true },
        opacity: 0, y: 44, stagger: 0.12, duration: 0.70, ease: 'power3.out',
      });
    }

    // ── Stats ─────────────────────────────────────────
    var statItems = document.querySelectorAll('.stat-item');
    if (statItems.length) {
      gsap.from(statItems, {
        scrollTrigger: { trigger: '.stats-strip', start: 'top 88%', once: true },
        opacity: 0, y: 16, stagger: 0.08, duration: 0.55, ease: 'power3.out',
      });
    }

    // ── About text ────────────────────────────────────
    gsap.from('.about-text', {
      scrollTrigger: { trigger: '.about-text', start: 'top 85%', once: true },
      opacity: 0, y: 32, duration: 0.78, ease: 'power3.out',
    });

    // ── Demo arena ────────────────────────────────────
    gsap.from('.demo-arena', {
      scrollTrigger: { trigger: '.demo-arena', start: 'top 82%', once: true },
      opacity: 0, y: 36, duration: 0.82, ease: 'power3.out',
    });
    gsap.from('.demo-wire-section', {
      scrollTrigger: { trigger: '.demo-wire-section', start: 'top 88%', once: true },
      opacity: 0, y: 18, duration: 0.62, ease: 'power3.out',
    });

    // ── Assurance card ────────────────────────────────
    gsap.from('.assurance-card', {
      scrollTrigger: { trigger: '.assurance-card', start: 'top 82%', once: true },
      opacity: 0, y: 48, duration: 0.90, ease: 'power3.out',
    });

    // ── Contact card ──────────────────────────────────
    gsap.from('.contact-card', {
      scrollTrigger: { trigger: '.contact-card', start: 'top 84%', once: true },
      opacity: 0, y: 40, duration: 0.82, ease: 'power3.out',
    });

    // ── Marquee slight parallax on scroll ────────────
    gsap.to('.marquee-inner', {
      scrollTrigger: {
        trigger: '.marquee-wrap',
        start: 'top bottom',
        end: 'bottom top',
        scrub: 1,
      },
      ease: 'none',
    });

    // ── Topbar shadow on scroll ───────────────────────
    ScrollTrigger.create({
      start: 'top -10',
      onUpdate: function (self) {
        var topbar = document.querySelector('.topbar');
        if (!topbar) return;
        if (self.progress > 0) {
          topbar.style.boxShadow = '0 1px 0 rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.55)';
        } else {
          topbar.style.boxShadow = '';
        }
      }
    });

    // ── Vault UI item stagger ─────────────────────────
    var vuiItems = document.querySelectorAll('.vui-item');
    if (vuiItems.length) {
      vuiItems.forEach(function (el, i) {
        setTimeout(function () {
          gsap.to(el, { opacity: 1, x: 0, duration: 0.52, ease: 'power3.out' });
        }, 3400 + i * 120);
      });
    }
  }

  // ── Vault password reveal cycle ───────────────────
  var vaultPwEl = document.getElementById('vaultPwReveal');
  if (vaultPwEl) {
    var _revealed = true;
    var _pwMask = '●●●●●●●●●●';
    var _pwReal = 'Kx7$mP9!qR';
    setInterval(function () {
      _revealed = !_revealed;
      if (_revealed) {
        vaultPwEl.textContent = _pwReal;
        vaultPwEl.classList.remove('vui-hidden');
      } else {
        vaultPwEl.textContent = _pwMask;
        vaultPwEl.classList.add('vui-hidden');
      }
    }, 3200);
  }

  // ── Demo pipeline MutationObserver ────────────────
  var _demoLockEl  = document.getElementById('demoLock');
  var _pipeA       = document.getElementById('dPipeA');
  var _pipeB       = document.getElementById('dPipeB');
  var _pipeFillA   = document.getElementById('dPipeFillA');
  var _pipeFillB   = document.getElementById('dPipeFillB');

  if (_demoLockEl && _pipeFillA && _pipeFillB && typeof gsap !== 'undefined') {
    var _pipeActive = false;
    var _pipeRafA = null, _pipeRafB = null;
    var _pipeValA = 0, _pipeValB = 0;

    function _animPipeA() {
      if (_pipeValA < 100) {
        _pipeValA = Math.min(_pipeValA + 2.2, 100);
        _pipeFillA.style.width = _pipeValA + '%';
        _pipeRafA = requestAnimationFrame(_animPipeA);
      } else {
        setTimeout(_startPipeB, 120);
      }
    }
    function _startPipeB() {
      if (!_pipeActive) return;
      if (_pipeB) _pipeB.classList.add('demo-pipe-stage--active-c');
      _animPipeB();
    }
    function _animPipeB() {
      if (_pipeValB < 100) {
        _pipeValB = Math.min(_pipeValB + 3.6, 100);
        _pipeFillB.style.width = _pipeValB + '%';
        _pipeRafB = requestAnimationFrame(_animPipeB);
      }
    }
    function _resetPipe() {
      _pipeActive = false;
      cancelAnimationFrame(_pipeRafA);
      cancelAnimationFrame(_pipeRafB);
      _pipeValA = 0; _pipeValB = 0;
      _pipeFillA.style.width = '0%';
      _pipeFillB.style.width = '0%';
      if (_pipeA) _pipeA.classList.remove('demo-pipe-stage--active-r');
      if (_pipeB) _pipeB.classList.remove('demo-pipe-stage--active-c');
    }

    new MutationObserver(function () {
      if (_demoLockEl.classList.contains('active')) {
        if (_pipeActive) return;
        _pipeActive = true;
        _pipeValA = 0; _pipeValB = 0;
        if (_pipeA) _pipeA.classList.add('demo-pipe-stage--active-r');
        if (_pipeB) _pipeB.classList.remove('demo-pipe-stage--active-c');
        _animPipeA();
      } else {
        _resetPipe();
      }
    }).observe(_demoLockEl, { attributes: true, attributeFilter: ['class'] });
  }

})();

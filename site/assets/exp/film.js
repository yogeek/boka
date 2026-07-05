/* BoKa · Le Film — scrub d'une séquence de frames au scroll. Zéro-dépendance.
   Repli vers experience.html si mouvement réduit, Canvas absent, ou frames en échec. */
(function () {
  'use strict';

  // --- Fonction pure : timeline t in [0,1] -> index de frame [0, count-1]. ---
  function frameIndexFor(t, count) {
    if (count <= 0) return 0;
    var i = Math.round(t * (count - 1));
    return i < 0 ? 0 : (i > count - 1 ? count - 1 : i);
  }

  // --- Auto-test console (tient lieu de test unitaire dans ce site sans framework). ---
  (function selftest() {
    var ok = true, c = 10;
    ok = ok && frameIndexFor(0, c) === 0;
    ok = ok && frameIndexFor(1, c) === 9;
    ok = ok && frameIndexFor(0.5, c) === 5;   // round(4.5)=5 (arrondi JS vers +inf)
    ok = ok && frameIndexFor(-1, c) === 0;    // borné bas
    ok = ok && frameIndexFor(2, c) === 9;     // borné haut
    ok = ok && frameIndexFor(0.5, 0) === 0;   // count nul
    console.log('[film:selftest] frameIndexFor ' + (ok ? 'PASS' : 'FAIL'));
  })();

  var root = document.documentElement;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canvas = document.getElementById('film-canvas');
  var scenes = Array.prototype.slice.call(document.querySelectorAll('.scene'));
  var landing = document.querySelector('.landing');
  var rail = document.querySelector('.rail');
  var hint = document.querySelector('.scroll-hint');

  function bail() { location.replace('experience.html'); }
  if (reduce || !canvas || !canvas.getContext) { bail(); return; }
  var ctx = canvas.getContext('2d');
  if (!ctx) { bail(); return; }

  // --- Chargement du manifeste puis des frames. ---
  fetch('assets/film/manifest.json').then(function (r) { return r.json(); })
    .then(start).catch(bail);

  function pad(n) { var s = '' + n; while (s.length < 4) s = '0' + s; return s; }
  function frameURL(fmt, i) { return 'assets/film/' + fmt + '/f_' + pad(i + 1) + '.' + fmt; }

  function start(man) {
    var count = man.count | 0;
    if (count <= 0) return bail();

    // Choix de format : tester la 1re frame AVIF, sinon WebP, sinon repli.
    probe('avif', function (fmt) {
      if (!fmt) return bail();
      loadAll(fmt, count, man);
    });
  }

  function probe(fmt, cb) {
    var img = new Image();
    img.onload = function () { cb(fmt); };
    img.onerror = function () { if (fmt === 'avif') probe('webp', cb); else cb(null); };
    img.src = frameURL(fmt, 0);
  }

  function loadAll(fmt, count, man) {
    var frames = new Array(count), loaded = 0, failed = 0, ready = false;

    function onOne() {
      loaded++;
      if (!ready && loaded >= Math.min(20, count)) { ready = true; run(); }
    }
    function load(i, priority) {
      var img = new Image();
      if (!priority) img.loading = 'eager';
      img.onload = onOne;
      img.onerror = function () { failed++; if (failed > count * 0.1) bail(); onOne(); };
      img.src = frameURL(fmt, i);
      frames[i] = img;
    }
    var i;
    for (i = 0; i < Math.min(20, count); i++) load(i, true);
    for (i = 20; i < count; i++) load(i, false);

    // --- État lissé + rendu. ---
    function run() {
      root.classList.add('is-live');
      if (landing) landing.classList.add('buvard');
      buildRail();
      var dots = rail ? Array.prototype.slice.call(rail.children) : [];
      var t = 0, tTarget = 0, cur = -1, scrolled = false, lastReveal = -1;

      function resize() {
        var dpr = Math.min(2, window.devicePixelRatio || 1);
        canvas.width = Math.round(window.innerWidth * dpr);
        canvas.height = Math.round(window.innerHeight * dpr);
        cur = -1; // force un repaint
      }
      function onScroll() {
        var max = document.documentElement.scrollHeight - window.innerHeight;
        tTarget = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
        if (!scrolled && window.scrollY > 8) { scrolled = true; if (hint) hint.classList.add('gone'); }
      }
      function paint(i) {
        var img = frames[i];
        if (!img || !img.complete || !img.naturalWidth) return;
        var cw = canvas.width, ch = canvas.height, iw = img.naturalWidth, ih = img.naturalHeight;
        var s = Math.max(cw / iw, ch / ih), w = iw * s, h = ih * s;
        ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
      }
      function textChoreography() {
        var vh = window.innerHeight;
        var active = Math.round(t * 6);
        for (var k = 0; k < scenes.length; k++) {
          var r = scenes[k].getBoundingClientRect();
          var d = (r.top + r.height / 2 - vh / 2) / vh;
          var vis = Math.max(0, 1 - Math.min(1, Math.abs(d) * 1.7));
          var copy = scenes[k].querySelector('.copy');
          if (copy) {
            copy.style.opacity = vis.toFixed(3);
            copy.style.transform = 'translate3d(0,' + (d * 40).toFixed(1) + 'px,0)';
          }
        }
        for (var j = 0; j < dots.length; j++) dots[j].classList.toggle('on', j === active);

        // Buvard : la goutte « tombe » quand le haut de la landing entre dans le
        // cadre ; la tache d'encre grandit sur ~un écran de scroll et révèle les mots.
        // On n'écrit --reveal que s'il change, et on retire le masque une fois
        // révélé (sinon le navigateur repeint le masque sur toute la longue landing
        // à chaque frame de scroll — coûteux et inutile).
        if (landing) {
          var lt = landing.getBoundingClientRect().top;
          var p = (vh - lt) / (vh * 0.95);
          p = p < 0 ? 0 : (p > 1 ? 1 : p);
          var pr = Math.round(p * 100) / 100;
          if (pr !== lastReveal) {
            lastReveal = pr;
            landing.style.setProperty('--reveal', pr.toFixed(2));
            // Masque actif seulement pendant la transition ; retiré une fois plein.
            landing.classList.toggle('revealed', pr >= 1);
          }
        }
      }
      function frame() {
        t += (tTarget - t) * 0.075;
        var idx = frameIndexFor(t, count);
        if (idx !== cur) { paint(idx); cur = idx; }
        textChoreography();
        requestAnimationFrame(frame);
      }
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', function () { resize(); onScroll(); });
      resize(); onScroll();
      requestAnimationFrame(frame);
    }

    function buildRail() {
      if (!rail) return;
      for (var n = 0; n < 7; n++) {
        var b = document.createElement('button');
        b.className = 'rail-dot'; b.type = 'button';
        b.setAttribute('aria-label', 'Aller à la scène ' + (n + 1));
        b.dataset.i = n;
        b.addEventListener('click', function (e) {
          var target = document.querySelector('[data-scene="' + e.currentTarget.dataset.i + '"]');
          if (target) window.scrollTo({ top: target.offsetTop, behavior: 'smooth' });
        });
        rail.appendChild(b);
      }
    }
  }
})();

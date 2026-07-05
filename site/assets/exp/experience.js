/* BoKa · L'Expérience — moteur de scroll + chorégraphie des scènes.
   Le scroll est la seule entrée : scrollY lissé -> timeline globale t ∈ [0,1].
   Aucune dépendance. Repli statique si WebGL2 absent ou prefers-reduced-motion. */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canvas = document.getElementById('gl');
  var scenes = Array.prototype.slice.call(document.querySelectorAll('.scene'));
  var rail = document.querySelector('.rail');
  var hint = document.querySelector('.scroll-hint');

  // --- Repli statique : pas de canvas, contenu identique, révélation douce ---
  function staticMode() {
    root.classList.add('is-static');
    if (canvas) canvas.style.display = 'none';
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) e.target.classList.add('in'); });
    }, { threshold: 0.35 });
    scenes.forEach(function (s) { io.observe(s); });
    buildRail(true);
  }

  var gl = null;
  if (!reduce && canvas && window.BokaGL) {
    gl = window.BokaGL.init(canvas, {
      sky: 'assets/exp/sky.webp',
      valley: 'assets/exp/valley.webp',
      ger: 'assets/exp/geranium.webp',
      her: 'assets/exp/heritage.webp',
      alam: 'assets/exp/alambic.webp',
      drop: 'assets/exp/drop.webp'
    });
  }
  if (!gl) { staticMode(); return; }

  root.classList.add('is-live');

  // --- Rail de progression (7 points cliquables) ---
  function buildRail(disabled) {
    if (!rail) return;
    for (var i = 0; i < 7; i++) {
      var b = document.createElement('button');
      b.className = 'rail-dot';
      b.type = 'button';
      b.setAttribute('aria-label', 'Aller à la scène ' + (i + 1));
      b.dataset.i = i;
      if (!disabled) b.addEventListener('click', gotoScene);
      rail.appendChild(b);
    }
  }
  function gotoScene(e) {
    var i = +e.currentTarget.dataset.i;
    var target = scenes[i] || document.querySelector('[data-scene="' + i + '"]');
    if (target) window.scrollTo({ top: target.offsetTop, behavior: 'smooth' });
  }
  buildRail(false);
  var dots = rail ? Array.prototype.slice.call(rail.children) : [];

  // --- État lissé ---
  var t = 0, tTarget = 0;
  var px = 0, py = 0, pxT = 0, pyT = 0;
  var start = performance.now();
  var scrolled = false;

  function onScroll() {
    var max = document.documentElement.scrollHeight - window.innerHeight;
    tTarget = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    if (!scrolled && window.scrollY > 8) { scrolled = true; if (hint) hint.classList.add('gone'); }
  }
  function onPointer(e) {
    var x = (e.touches ? e.touches[0].clientX : e.clientX) / window.innerWidth;
    var y = (e.touches ? e.touches[0].clientY : e.clientY) / window.innerHeight;
    pxT = (x - 0.5) * 2; pyT = (y - 0.5) * 2;
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', function () { gl.resize(); onScroll(); });
  window.addEventListener('mousemove', onPointer, { passive: true });
  window.addEventListener('touchmove', onPointer, { passive: true });
  onScroll();

  // Fondu des textes de chaque scène selon leur position dans la fenêtre.
  function textChoreography() {
    var vh = window.innerHeight, active = Math.round(t * 6);
    for (var i = 0; i < scenes.length; i++) {
      var s = scenes[i];
      var r = s.getBoundingClientRect();
      var center = r.top + r.height / 2;
      var d = (center - vh / 2) / vh;            // 0 = centré
      var k = Math.max(0, 1 - Math.min(1, Math.abs(d) * 1.7));
      var copy = s.querySelector('.copy');
      if (copy) {
        copy.style.opacity = k.toFixed(3);
        copy.style.transform = 'translate3d(0,' + (d * 40).toFixed(1) + 'px,0)';
      }
    }
    for (var j = 0; j < dots.length; j++) dots[j].classList.toggle('on', j === active);
  }

  function frame(now) {
    var time = (now - start) / 1000;
    t += (tTarget - t) * 0.075;
    px += (pxT - px) * 0.05;
    py += (pyT - py) * 0.05;
    gl.render({ t: t, time: time, pointer: [px, py] });
    textChoreography();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();

/* COINFIN CURVE · ambient reactive field (homepage hero) + magnetic CTAs.
   A dot grid in ink, lime and gold sits behind the hero plate. It breathes
   on a slow wave, lights up around the pointer, and brightens as the hero
   curve's graduation progress (the figure chart.js writes into #heroPct)
   rises. Pure decoration: pointer-events none, pauses when the hero is
   offscreen or the tab is hidden, one static frame under reduced motion. */
(function () {
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- magnetic primary CTAs (fine pointers only) ---------- */
  if (!reduced && window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    document.querySelectorAll("a.btn").forEach(function (b) {
      b.addEventListener("pointermove", function (e) {
        var r = b.getBoundingClientRect();
        if (!r.width) return;
        var dx = (e.clientX - r.left) / r.width - 0.5;
        var dy = (e.clientY - r.top) / r.height - 0.5;
        b.style.transform = "translate(" + (dx * 7).toFixed(1) + "px," + (dy * 5 - 1).toFixed(1) + "px)";
      });
      b.addEventListener("pointerleave", function () { b.style.transform = ""; });
    });
  }

  /* ---------- ambient field ---------- */
  var cv = document.getElementById("heroField");
  if (!cv) return;
  var hero = cv.parentElement;
  var ctx = cv.getContext("2d");
  if (!ctx || !hero) return;

  var W = 0, H = 0, dots = [], parts = [];
  var px = -9999, py = -9999, vis = true, lift = 0, liftTarget = 0;

  function build() {
    var r = hero.getBoundingClientRect();
    W = Math.max(0, Math.floor(r.width));
    H = Math.max(0, Math.floor(r.height));
    var dpr = Math.min(1.5, window.devicePixelRatio || 1);
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    dots = [];
    var gap = 46;
    for (var y = gap / 2; y < H; y += gap) {
      for (var x = gap / 2; x < W; x += gap) {
        dots.push({ x: x, y: y, gold: ((x / gap + y / gap) % 7 === 0) });
      }
    }
    parts = [];
    var n = Math.min(30, Math.floor(W / 40));
    for (var i = 0; i < n; i++) {
      parts.push({
        x: Math.random() * W, y: Math.random() * H,
        s: 0.12 + Math.random() * 0.35, r: 0.8 + Math.random() * 1.6,
        gold: Math.random() < 0.3, ph: Math.random() * Math.PI * 2
      });
    }
  }

  function readLift() {
    var el = document.getElementById("heroPct");
    if (!el) return;
    var v = parseFloat(el.textContent);
    if (!isNaN(v)) liftTarget = Math.max(0, Math.min(1, v / 100));
  }

  function draw(t) {
    if (!W || !H) return;
    ctx.clearRect(0, 0, W, H);
    lift += (liftTarget - lift) * 0.03;
    var i, d, dx, dy, dist, glow, wave, a;
    for (i = 0; i < dots.length; i++) {
      d = dots[i];
      wave = 0.5 + 0.5 * Math.sin(t / 1500 + (d.x + d.y) * 0.011);
      dx = d.x - px; dy = d.y - py; dist = Math.sqrt(dx * dx + dy * dy);
      glow = Math.max(0, 1 - dist / 200);
      a = 0.05 + wave * 0.05 + lift * 0.13 + glow * 0.38;
      ctx.beginPath();
      ctx.arc(d.x, d.y, 1 + glow * 1.7 + lift * 0.6, 0, Math.PI * 2);
      ctx.fillStyle = d.gold
        ? "rgba(232,184,75," + a.toFixed(3) + ")"
        : "rgba(168,225,12," + a.toFixed(3) + ")";
      ctx.fill();
    }
    for (i = 0; i < parts.length; i++) {
      var p = parts[i];
      p.y -= p.s;
      p.x += Math.sin(t / 2400 + p.ph) * 0.12;
      if (p.y < -4) { p.y = H + 4; p.x = Math.random() * W; }
      var pa = 0.10 + 0.16 * (0.5 + 0.5 * Math.sin(t / 900 + p.ph)) + lift * 0.15;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.gold
        ? "rgba(232,184,75," + pa.toFixed(3) + ")"
        : "rgba(238,247,238," + pa.toFixed(3) + ")";
      ctx.fill();
    }
  }

  build();
  readLift();
  setInterval(readLift, 1000);

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (en) { vis = en[0].isIntersecting; }, { threshold: 0.01 }).observe(hero);
  }
  hero.addEventListener("pointermove", function (e) {
    var r = cv.getBoundingClientRect();
    px = e.clientX - r.left;
    py = e.clientY - r.top;
  });
  hero.addEventListener("pointerleave", function () { px = -9999; py = -9999; });
  var rsz = null;
  window.addEventListener("resize", function () {
    clearTimeout(rsz);
    rsz = setTimeout(function () { build(); if (reduced) draw(600); }, 180);
  });

  if (reduced) { draw(600); return; }
  (function frame(t) {
    if (vis && !document.hidden) draw(t || 0);
    requestAnimationFrame(frame);
  })(0);
})();

/* COINFIN CURVE · hero bonding curve (signature element).
   Draws a rising curve on canvas with a gradient fill, a pulsing gold
   graduation line and a live percentage. Two honest modes:
   - LIVE: board.js calls CFCURVE.setLive({name, reserveBnb}) from chain reads.
   - DEMO: no curve contract configured, a labelled simulation runs instead.
     The DEMO chip in the hero is never hidden in demo mode. */
(function () {
  var canvas = document.getElementById("curveCanvas");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  var C = window.CFIN;
  var GRAD = C.graduationBnb;

  var pctEl = document.getElementById("heroPct");
  var resEl = document.getElementById("heroReserve");
  var nameEl = document.getElementById("heroLaunchName");
  var chipEl = document.getElementById("demoChip");

  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var mode = "demo";
  var liveReserve = 0;
  var simT = 0.37;              /* demo progress seed, drifts upward */
  var simDir = 1;
  var disp = -1;                /* eased display progress (buttery motion) */
  var scrub = -1;               /* pointer position 0..1 while scrubbing, else -1 */

  function draw(progress, t) {
    var w = canvas.clientWidth, h = canvas.clientHeight;
    var dpr = window.devicePixelRatio || 1;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    var padL = 10, padR = 10, padT = 26, padB = 16;
    var iw = w - padL - padR, ih = h - padT - padB;
    function X(f) { return padL + iw * f; }
    function Y(f) { return padT + ih * (1 - f); }
    function curveY(x) { return Math.pow(x, 1.65); }   /* price shape along reserve */

    /* faint full projected curve */
    ctx.beginPath();
    for (var i = 0; i <= 60; i++) { var x = i / 60; i === 0 ? ctx.moveTo(X(x), Y(curveY(x))) : ctx.lineTo(X(x), Y(curveY(x))); }
    ctx.strokeStyle = "rgba(168,225,12,0.20)"; ctx.lineWidth = 2; ctx.stroke();

    /* gold graduation line, pulsing */
    var gy = Y(0.86);
    var pulse = reduced ? 0.85 : 0.6 + 0.4 * Math.sin(t / 480);
    ctx.save();
    ctx.setLineDash([7, 6]);
    ctx.beginPath(); ctx.moveTo(padL, gy); ctx.lineTo(w - padR, gy);
    ctx.strokeStyle = "rgba(232,184,75," + pulse.toFixed(3) + ")"; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();

    /* filled bright curve up to progress */
    var p = Math.max(0.005, Math.min(1, progress));
    var grad = ctx.createLinearGradient(0, padT, 0, h - padB);
    grad.addColorStop(0, "rgba(168,225,12,0.34)");
    grad.addColorStop(1, "rgba(168,225,12,0.02)");
    ctx.beginPath();
    ctx.moveTo(X(0), Y(0));
    var steps = Math.max(2, Math.floor(60 * p));
    for (var j = 1; j <= steps; j++) { var fx = p * j / steps; ctx.lineTo(X(fx), Y(curveY(fx))); }
    ctx.lineTo(X(p), Y(0)); ctx.closePath();
    ctx.fillStyle = grad; ctx.fill();

    ctx.beginPath();
    for (var k = 0; k <= steps; k++) { var gx = p * k / steps; k === 0 ? ctx.moveTo(X(gx), Y(curveY(gx))) : ctx.lineTo(X(gx), Y(curveY(gx))); }
    ctx.strokeStyle = "#a8e10c"; ctx.lineWidth = 3.5; ctx.lineCap = "round"; ctx.stroke();

    /* head dot */
    ctx.beginPath(); ctx.arc(X(p), Y(curveY(p)), 5.5, 0, Math.PI * 2);
    ctx.fillStyle = p >= 0.999 ? "#e8b84b" : "#eef7ee"; ctx.fill();
    ctx.beginPath(); ctx.arc(X(p), Y(curveY(p)), 10.5, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(168,225,12,0.5)"; ctx.lineWidth = 2; ctx.stroke();

    /* readouts */
    var reserve = GRAD * p;
    if (pctEl) pctEl.innerHTML = (p * 100).toFixed(1) + "% <small>TO GRADUATION</small>";
    if (resEl) resEl.textContent = reserve.toFixed(3) + " BNB";
  }

  function baseProgress(t) {
    if (mode === "empty") return 0;
    if (mode === "demo") {
      simT += 0.00045 * simDir;
      if (simT > 0.86) simDir = -1;
      if (simT < 0.34) simDir = 1;
      return Math.max(0.02, Math.min(0.97, simT + Math.sin(t / 2600) * 0.012));
    }
    return Math.max(0.005, Math.min(1, liveReserve / GRAD));
  }

  function frame(t) {
    var target = scrub >= 0 ? scrub : baseProgress(t);
    if (disp < 0 || reduced) disp = target;
    else disp += (target - disp) * 0.085;            /* ease toward the target */
    if (Math.abs(target - disp) < 0.0004) disp = target;
    draw(disp, t);
    if (mode === "empty" && scrub < 0) {
      if (pctEl) pctEl.innerHTML = "0.0% <small>TO GRADUATION</small>";
      if (resEl) resEl.textContent = "0.000 BNB";
    }
    if (!reduced) requestAnimationFrame(frame);
  }

  /* scrub the curve with pointer or touch: preview the road to graduation */
  function pointerPos(e) {
    var r = canvas.getBoundingClientRect();
    return Math.max(0.005, Math.min(1, (e.clientX - r.left) / r.width));
  }
  canvas.addEventListener("pointerdown", function (e) { scrub = pointerPos(e); });
  canvas.addEventListener("pointermove", function (e) { if (scrub >= 0 || e.pointerType === "mouse") scrub = pointerPos(e); });
  function endScrub() { scrub = -1; }
  canvas.addEventListener("pointerup", endScrub);
  canvas.addEventListener("pointerleave", endScrub);
  canvas.addEventListener("pointercancel", endScrub);

  window.CFCURVE = {
    setLive: function (d) {
      mode = "live";
      liveReserve = d.reserveBnb || 0;
      if (chipEl) chipEl.style.display = "none";
      if (nameEl && d.name) nameEl.textContent = d.name;
      if (reduced) draw(Math.max(0.005, Math.min(1, liveReserve / GRAD)), 0);
    },
    setDemo: function () {
      mode = "demo";
      if (chipEl) { chipEl.textContent = "Demo curve"; chipEl.style.display = ""; }
    },
    setEmpty: function () {
      mode = "empty";
      if (chipEl) { chipEl.textContent = "Awaiting first launch"; chipEl.style.display = ""; }
      if (nameEl) nameEl.textContent = "NO LAUNCHES YET";
      if (reduced) { draw(0, 0); if (pctEl) pctEl.innerHTML = "0.0% <small>TO GRADUATION</small>"; if (resEl) resEl.textContent = "0.000 BNB"; }
    }
  };

  if (reduced) { draw(0.62, 0); if (pctEl) { /* static frame already sets readouts */ } }
  else requestAnimationFrame(frame);
})();

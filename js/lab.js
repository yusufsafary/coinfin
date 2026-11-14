/* COINFIN CURVE · dividend simulator + launch blueprint (homepage).
   Simulator: Pass count (1 to 100) against the live vault balance and
   live minted Pass supply, both fed by the CFLIVE hub in pulse.js.
   Labelled estimate only: live vault ÷ live supply, one share per Pass,
   plus the FIN claim total (Passes × 250,000 FIN).
   Blueprint: the four contract steps of a launch as tappable plates,
   with an animated tax-split bar set and a graduation path that fills
   as the active step advances. Auto-cycles until a visitor taps. */
(function () {
  var C = window.CFIN, R = window.CFREAD;
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function $(id) { return document.getElementById(id); }

  /* ---------- dividend simulator ---------- */
  var dvR = $("dvRange"), dvI = $("dvInput");
  if (dvR && dvI && C && R) {
    var live = { passes: null, vaultWei: null };
    var finPer = parseInt(C.finPerPass || "250000", 10);

    function clampN(v) {
      v = parseInt(v, 10);
      if (isNaN(v)) v = 1;
      return Math.max(1, Math.min(100, v));
    }
    function render() {
      var n = clampN(dvR.value);
      var finEl = $("dvFin"), pctEl = $("dvPct"), shareEl = $("dvShare");
      if (finEl) finEl.textContent = R.fmtInt(n * finPer) + " FIN";
      if (live.passes !== null && live.passes > 0 && live.vaultWei !== null) {
        if (pctEl) {
          var pct = n / live.passes * 100;
          pctEl.textContent = (pct < 0.01 ? pct.toFixed(3) : pct.toFixed(2)) + "%";
        }
        if (shareEl) {
          var share = live.vaultWei * BigInt(n) / BigInt(live.passes);
          shareEl.textContent = R.fmtBnb(share, 6) + " BNB";
        }
      } else {
        if (pctEl) pctEl.textContent = "···";
        if (shareEl) shareEl.textContent = "···";
      }
    }
    dvR.addEventListener("input", function () { dvI.value = dvR.value; render(); });
    dvI.addEventListener("input", function () {
      var n = clampN(dvI.value);
      dvR.value = n;
      render();
    });
    dvI.addEventListener("change", function () { dvI.value = clampN(dvI.value); dvR.value = dvI.value; render(); });
    document.querySelectorAll("[data-dv]").forEach(function (b) {
      b.addEventListener("click", function () {
        dvR.value = b.getAttribute("data-dv");
        dvI.value = dvR.value;
        render();
      });
    });
    function takeLive(d) {
      if (!d) return;
      if (d.passes !== null && typeof d.passes !== "undefined") live.passes = d.passes;
      if (d.vaultWei !== null && typeof d.vaultWei !== "undefined") live.vaultWei = d.vaultWei;
      render();
    }
    if (window.CFLIVE) window.CFLIVE.onUpdate(takeLive);
    document.addEventListener("cflive", function (e) { takeLive(e.detail); });
    render();
  }

  /* ---------- launch blueprint ---------- */
  var bp = $("blueprint");
  if (bp) {
    var steps = bp.querySelectorAll(".bp-step");
    var panels = bp.querySelectorAll(".bp-panel");
    var nodes = bp.querySelectorAll(".bp-node");
    var fill = $("bpFill");
    var cur = 0, timer = null;

    function go(i) {
      cur = i;
      steps.forEach(function (b, k) { b.classList.toggle("on", k === i); });
      panels.forEach(function (p, k) { p.classList.toggle("on", k === i); });
      nodes.forEach(function (nd, k) { nd.classList.toggle("on", k <= i); });
      if (fill && steps.length > 1) fill.style.width = (i / (steps.length - 1) * 100).toFixed(2) + "%";
    }
    function stop() {
      if (timer) { clearInterval(timer); timer = null; }
    }
    steps.forEach(function (b, i) {
      b.addEventListener("click", function () { stop(); go(i); });
    });
    bp.addEventListener("pointerdown", stop);
    go(0);
    if (!reduced) {
      timer = setInterval(function () {
        if (!document.hidden) go((cur + 1) % steps.length);
      }, 4500);
    }
  }
})();

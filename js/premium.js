/* COINFIN CURVE · PREMIUM v1 interactions (homepage only).
   Pointer-tracked light and a gentle tilt on the Pass specimen card.
   Pure decoration: no chain reads, no element the live scripts own. */
(function () {
  var card = document.getElementById("passCard");
  if (!card) return;
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced || !window.PointerEvent) return;

  var raf = 0, px = 0, py = 0;
  function apply() {
    raf = 0;
    var r = card.getBoundingClientRect();
    var fx = (px - r.left) / r.width, fy = (py - r.top) / r.height;
    card.style.setProperty("--mx", (fx * 100).toFixed(1) + "%");
    card.style.setProperty("--my", (fy * 100).toFixed(1) + "%");
    card.style.setProperty("--ry", ((fx - 0.5) * 7).toFixed(2) + "deg");
    card.style.setProperty("--rx", ((0.5 - fy) * 7).toFixed(2) + "deg");
  }
  card.addEventListener("pointermove", function (e) {
    px = e.clientX; py = e.clientY;
    if (!raf) raf = requestAnimationFrame(apply);
  });
  card.addEventListener("pointerleave", function () {
    card.style.setProperty("--rx", "0deg");
    card.style.setProperty("--ry", "0deg");
    card.style.setProperty("--mx", "70%");
    card.style.setProperty("--my", "20%");
  });
})();

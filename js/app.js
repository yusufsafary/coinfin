/* COINFIN CURVE · shared behaviours: reveal on scroll, copy buttons,
   ticker feed, season countdown. */
(function () {
  /* reveal */
  var io = ("IntersectionObserver" in window) ? new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
  }, { threshold: 0.12 }) : null;
  document.querySelectorAll(".rv").forEach(function (el) { if (io) io.observe(el); else el.classList.add("in"); });

  /* copy buttons: <button class="copybtn" data-copy="elementId"> */
  document.querySelectorAll(".copybtn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var t = document.getElementById(btn.getAttribute("data-copy"));
      if (!t) return;
      var text = t.textContent;
      function done() {
        var old = btn.textContent;
        btn.textContent = "✓";
        setTimeout(function () { btn.textContent = old; }, 1200);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done).catch(done);
      } else {
        var ta = document.createElement("textarea");
        ta.value = text; document.body.appendChild(ta); ta.select();
        try { document.execCommand("copy"); } catch (e) {}
        document.body.removeChild(ta); done();
      }
    });
  });

  /* ticker: board.js feeds items; a static fallback set ships in the HTML */
  window.CFAPP = {
    setTicker: function (items) {
      var track = document.getElementById("tickerTrack");
      if (!track || !items || !items.length) return;
      var html = items.map(function (i) { return "<span>" + i + "</span>"; }).join("");
      track.innerHTML = html + html; /* doubled for the loop */
    }
  };

  /* season countdown */
  var sNo = document.getElementById("seasonNo");
  var sCount = document.getElementById("seasonCount");
  if (sNo && sCount) {
    var C = window.CFIN;
    function pad(n) { return (n < 10 ? "0" : "") + n; }
    function tickSeason() {
      if (!C.seasonGenesis) { sNo.textContent = "1"; sCount.textContent = "TBA"; return; }
      var now = Math.floor(Date.now() / 1000);
      var len = C.seasonDays * 86400;
      var idx = Math.max(0, Math.floor((now - C.seasonGenesis) / len));
      var end = C.seasonGenesis + (idx + 1) * len;
      var left = Math.max(0, end - now);
      var d = Math.floor(left / 86400), h = Math.floor(left % 86400 / 3600),
          m = Math.floor(left % 3600 / 60), s = left % 60;
      sNo.textContent = String(idx + 1);
      sCount.textContent = d + "d " + pad(h) + ":" + pad(m) + ":" + pad(s);
    }
    tickSeason();
    setInterval(tickSeason, 1000);
  }
})();

/* COINFIN CURVE · living Pass specimen (homepage).
   The Pass card carries a live chart of the bonding curve (same contract
   math as the hero chart), a minted counter read from chain, the dividend
   vault balance, FIN claimed so far, and a per-second season countdown.
   Decoration and reads only: mint and claim flows stay with board/claim. */
(function () {
  var C = window.CFIN;
  var card = document.getElementById("passCard");
  if (!C || !card) return;
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var V0 = 2, SUPPLY = 1e9, GRAD = C.graduationBnb || 8;
  function per1M(R) { var v = V0 + R; return v * v / (V0 * SUPPLY) * 1e6; }
  function $(id) { return document.getElementById(id); }
  var R = window.CFREAD;

  /* ---------- living chart inside the card ---------- */
  var cv = $("passCanvas");
  var baseR = 0, dispR = 0, demo = true, demoT = 0.3, demoDir = 1, vis = true, particles = [];
  if (cv) {
    var ctx = cv.getContext("2d");
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (en) { vis = en[0].isIntersecting; }, { threshold: 0.02 }).observe(cv);
    }
    function draw(t) {
      var w = cv.clientWidth, h = cv.clientHeight;
      if (!w || !h) return;
      var dpr = window.devicePixelRatio || 1;
      if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
        cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      var ym = per1M(GRAD) * 1.1;
      function X(r) { return 3 + (w - 8) * (r / GRAD); }
      function Y(r) { return 6 + (h - 14) * (1 - per1M(r) / ym); }
      /* faint grid */
      ctx.strokeStyle = "rgba(238,247,238,0.08)"; ctx.lineWidth = 1;
      for (var g = 1; g < 4; g++) {
        ctx.beginPath(); ctx.moveTo(w * g / 4, 4); ctx.lineTo(w * g / 4, h - 6); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(3, h * g / 4); ctx.lineTo(w - 5, h * g / 4); ctx.stroke();
      }
      /* full curve, faint */
      ctx.beginPath();
      for (var i = 0; i <= 48; i++) { var r0 = GRAD * i / 48; i === 0 ? ctx.moveTo(X(r0), Y(r0)) : ctx.lineTo(X(r0), Y(r0)); }
      ctx.strokeStyle = "rgba(168,225,12,0.25)"; ctx.lineWidth = 1.5; ctx.stroke();
      /* graduation dash */
      ctx.save(); ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(X(GRAD), 4); ctx.lineTo(X(GRAD), h - 6);
      ctx.strokeStyle = "rgba(232,184,75," + (reduced ? 0.7 : 0.5 + 0.3 * Math.sin(t / 500)).toFixed(3) + ")"; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.restore();
      /* travelled area + glowing line */
      var p = Math.max(0.004, dispR);
      var grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, "rgba(168,225,12,0.32)"); grad.addColorStop(1, "rgba(168,225,12,0.02)");
      var steps = Math.max(2, Math.floor(48 * p / GRAD));
      ctx.beginPath(); ctx.moveTo(X(0), h - 6);
      for (var j = 0; j <= steps; j++) { var rj = p * j / steps; ctx.lineTo(X(rj), Y(rj)); }
      ctx.lineTo(X(p), h - 6); ctx.closePath(); ctx.fillStyle = grad; ctx.fill();
      ctx.save();
      ctx.shadowColor = "rgba(168,225,12,0.6)"; ctx.shadowBlur = 10;
      ctx.beginPath();
      for (var k = 0; k <= steps; k++) { var rk = p * k / steps; k === 0 ? ctx.moveTo(X(rk), Y(rk)) : ctx.lineTo(X(rk), Y(rk)); }
      ctx.strokeStyle = "#a8e10c"; ctx.lineWidth = 3; ctx.lineCap = "round"; ctx.stroke();
      ctx.restore();
      /* particles */
      if (!reduced && p > 0.05) {
        if (particles.length < 14 && Math.random() < 0.3) particles.push({ f: 0, sp: 0.004 + Math.random() * 0.007 });
        particles = particles.filter(function (q) { return q.f <= 1; });
        ctx.fillStyle = "#eef7ee";
        particles.forEach(function (q) {
          q.f += q.sp;
          var rp = p * Math.min(1, q.f);
          ctx.globalAlpha = Math.sin(Math.min(1, q.f) * Math.PI) * 0.9;
          ctx.beginPath(); ctx.arc(X(rp), Y(rp), 1.8, 0, Math.PI * 2); ctx.fill();
        });
        ctx.globalAlpha = 1;
      }
      /* head with pulse */
      var hx = X(p), hy = Y(p);
      if (!reduced) {
        var ph = (t % 1500) / 1500;
        ctx.beginPath(); ctx.arc(hx, hy, 4 + ph * 11, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(168,225,12," + (0.5 * (1 - ph)).toFixed(3) + ")"; ctx.lineWidth = 1.5; ctx.stroke();
      }
      ctx.beginPath(); ctx.arc(hx, hy, 4.5, 0, Math.PI * 2); ctx.fillStyle = "#eef7ee"; ctx.fill();
    }
    function frame(t) {
      if (demo) {
        demoT += 0.0006 * demoDir;
        if (demoT > 0.55) demoDir = -1;
        if (demoT < 0.25) demoDir = 1;
        baseR = GRAD * demoT;
      }
      dispR += (baseR - dispR) * 0.07;
      if (Math.abs(baseR - dispR) < 0.002) dispR = baseR;
      if (vis) draw(t || 0);
      if (!reduced) requestAnimationFrame(frame);
    }
    if (reduced) { dispR = baseR = GRAD * 0.35; draw(0); }
    else requestAnimationFrame(frame);
  }

  /* ---------- live numbers ---------- */
  function countUp(el, to, fmt) {
    if (!el) return;
    if (reduced) { el.textContent = fmt(to); return; }
    var t0 = null, dur = 1100;
    function step(ts) {
      if (!t0) t0 = ts;
      var k = Math.min(1, (ts - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      el.textContent = fmt(Math.round(to * e));
      if (k < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  function reads() {
    if (!R) return;
    R.ethCall(C.pass, R.SEL.totalMinted).then(function (h) {
      var v = R.decUint(h);
      if (v === null) return;
      var n = Number(v);
      countUp($("passMinted"), n, function (x) { return R.fmtInt(x); });
      var bar = $("passMintBar");
      if (bar) bar.style.width = Math.min(100, n / C.passSupply * 100).toFixed(2) + "%";
    }).catch(function () {});
    R.ethCall(C.claim, R.SEL.poolBalance).then(function (h) {
      var v = R.decUint(h);
      var el = $("passClaimed");
      if (v === null || !el) return;
      var pool = Number(v / 1000000000000000000n);
      var claimed = Math.max(0, 2000000000 - pool);
      el.textContent = R.fmtInt(claimed) + " FIN";
    }).catch(function () {});
    R.rpc("eth_getBalance", [C.vault, "latest"]).then(function (h) {
      var v = R.decUint(h);
      var el = $("passVault");
      if (v === null || !el) return;
      el.textContent = R.fmtBnb(v, 4) + " BNB";
    }).catch(function () {});
    R.ethCall(C.curve, R.SEL.launchCount).then(function (h) {
      var n = R.decUint(h);
      if (n === null || n === 0n) return;
      return R.ethCall(C.curve, R.SEL.launchInfo + R.encUint(Number(n) - 1)).then(function (ah) {
        var hex = (ah || "").replace(/^0x/, "");
        if (hex.length < 64 * 3) return;
        baseR = Math.max(0, Math.min(GRAD, Number(BigInt("0x" + hex.slice(128, 192))) / 1e18));
        demo = false;
        if (reduced) { dispR = baseR; var c2 = $("passCanvas"); if (c2) c2.getContext("2d") && frame(0); }
      });
    }).catch(function () {});
  }
  reads();
  setInterval(reads, 120000);

  /* ---------- season countdown, per second ---------- */
  var cd = $("passSeasonCount");
  if (cd && C.seasonGenesis) {
    function tick() {
      var now = Math.floor(Date.now() / 1000);
      var len = C.seasonDays * 86400;
      var idx = Math.max(0, Math.floor((now - C.seasonGenesis) / len));
      var end = C.seasonGenesis + (idx + 1) * len;
      var s = Math.max(0, end - now);
      var d = Math.floor(s / 86400), hh = Math.floor(s % 86400 / 3600), mm = Math.floor(s % 3600 / 60), ss = s % 60;
      function p2(x) { return String(x).padStart(2, "0"); }
      cd.textContent = d + "d " + p2(hh) + ":" + p2(mm) + ":" + p2(ss);
      var sn = $("passSeasonNo");
      if (sn) sn.textContent = String(idx + 1);
    }
    tick();
    setInterval(tick, 1000);
  }
})();

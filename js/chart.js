/* COINFIN CURVE · interactive bonding curve chart (signature element, v2).
   Real contract math (CoinFinCurve.sol): constant product on virtual
   reserves. virtualBnb starts at 2 BNB, token reserve starts at the full
   1,000,000,000 supply. Spot price = virtualBnb / tokenReserve.
   Buys pay 5% tax (2 creator / 2 platform / 1 vault); 95% moves the curve.
   Graduation at 8 BNB of net real reserve into a PancakeSwap V2 pair.

   Full mode mounts on the homepage hero (#curveCanvas) with crosshair,
   a buy simulator and a price/tokens view toggle. Mini mode mounts a
   live ribbon on every other page ([data-cfx-ribbon]).
   board.js drives the base point through window.CFCURVE, as before. */
(function () {
  var C = window.CFIN;
  if (!C) return;
  var V0 = 2, SUPPLY = 1e9, GRAD = C.graduationBnb || 8, TAX = 0.05;
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- exact curve math ---------- */
  function vB(R) { return V0 + R; }
  function tRes(R) { return V0 * SUPPLY / vB(R); }
  function spot(R) { var v = vB(R); return v * v / (V0 * SUPPLY); }        /* BNB per token */
  function per1M(R) { return spot(R) * 1e6; }                              /* BNB per 1M tokens */
  function perBnb(R) { return 1 / spot(R); }                               /* tokens per 1 BNB */
  function buy(R, gross) {
    var net = gross * (1 - TAX);
    var out = tRes(R) - tRes(R + net);
    return { net: net, out: out, R2: R + net, spot2: spot(R + net) };
  }
  function maxGross(R) { return Math.max(0, (GRAD - R) / (1 - TAX)); }

  /* ---------- formatting ---------- */
  function trim(n, d) { return n.toFixed(d).replace(/\.?0+$/, ""); }
  function fmtTok(n) {
    if (n >= 1e6) return trim(n / 1e6, 2) + "M";
    if (n >= 1e3) return trim(n / 1e3, 1) + "K";
    return String(Math.round(n));
  }
  function fmtPrice(R) { return trim(per1M(R), per1M(R) < 0.01 ? 4 : 3); }
  function $(id) { return document.getElementById(id); }

  /* =====================================================================
     FULL CHART (homepage hero)
  ===================================================================== */
  var canvas = $("curveCanvas");
  if (canvas) initFull(canvas);

  function initFull(cv) {
    var ctx = cv.getContext("2d");
    var stage = cv.parentElement;
    var tip = $("curveTip");
    var pctEl = $("heroPct"), resEl = $("heroReserve"), nameEl = $("heroLaunchName"), chipEl = $("demoChip");

    var mode = "empty";            /* empty | demo | live (set by board.js) */
    var baseR = 0;                 /* net real reserve of featured launch */
    var demoT = 0.37, demoDir = 1;
    var hoverR = -1;               /* crosshair reserve, -1 = off */
    var simGross = 0;              /* simulator input, gross BNB */
    var view = "price";            /* price | tokens */
    var intro = reduced ? 1 : 0;   /* entrance sweep 0..1 */
    var dispR = 0;                 /* eased display base */
    var particles = [];
    var visible = true;

    /* simulator controls */
    var simRange = $("simRange"), simInput = $("simInput");
    function setSim(g) {
      var cap = maxGross(baseR);
      simGross = Math.max(0, Math.min(cap, g || 0));
      if (simRange) { simRange.max = Math.max(0.1, cap).toFixed(2); simRange.value = simGross; }
      if (simInput && document.activeElement !== simInput) simInput.value = simGross ? trim(simGross, 3) : "";
      renderSimPanel();
    }
    if (simRange) simRange.addEventListener("input", function () { setSim(parseFloat(simRange.value) || 0); });
    if (simInput) simInput.addEventListener("input", function () { setSim(parseFloat(simInput.value) || 0); });
    var chips = document.querySelectorAll("[data-sim]");
    for (var ci = 0; ci < chips.length; ci++) {
      chips[ci].addEventListener("click", function () { setSim(parseFloat(this.getAttribute("data-sim")) || 0); });
    }
    var tog = document.querySelectorAll("[data-view]");
    for (var ti = 0; ti < tog.length; ti++) {
      tog[ti].addEventListener("click", function () {
        view = this.getAttribute("data-view");
        for (var k = 0; k < tog.length; k++) tog[k].classList.toggle("on", tog[k] === this);
      });
    }

    function simResult() { return simGross > 0 ? buy(baseR, simGross) : null; }

    function renderSimPanel() {
      var r = simResult();
      var set = function (id, v) { var e = $(id); if (e) e.textContent = v; };
      if (!r) {
        set("simTokens", "···"); set("simAvg", "···"); set("simImpact", "···"); set("simProg", (baseR / GRAD * 100).toFixed(1) + "%");
        var note = $("simNote"); if (note) note.style.display = "none";
        return;
      }
      set("simTokens", fmtTok(r.out));
      set("simAvg", trim(simGross / r.out * 1e6, 4) + " BNB / 1M");
      var imp = (r.spot2 / spot(baseR) - 1) * 100;
      set("simImpact", "+" + imp.toFixed(1) + "%");
      set("simProg", (r.R2 / GRAD * 100).toFixed(1) + "%");
      var note2 = $("simNote");
      if (note2) note2.style.display = r.R2 >= GRAD - 1e-9 ? "" : "none";
    }

    /* pointer crosshair */
    function posR(e) {
      var r = cv.getBoundingClientRect();
      var f = (e.clientX - r.left) / r.width;
      var padL = 44, padR = 14;
      var fr = (f * r.width - padL) / (r.width - padL - padR);
      return Math.max(0, Math.min(GRAD, fr * GRAD));
    }
    cv.addEventListener("pointermove", function (e) { hoverR = posR(e); });
    cv.addEventListener("pointerdown", function (e) { hoverR = posR(e); });
    function leave() { hoverR = -1; if (tip) tip.style.opacity = "0"; }
    cv.addEventListener("pointerleave", leave);
    cv.addEventListener("pointercancel", leave);

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }, { threshold: 0.02 }).observe(cv);
    }

    function yMax() { return view === "price" ? per1M(GRAD) * 1.08 : perBnb(0) / 1e6 * 1.08; }
    function yVal(R) { return view === "price" ? per1M(R) : perBnb(R) / 1e6; }

    function draw(t) {
      var w = cv.clientWidth, h = cv.clientHeight;
      if (!w || !h) return;
      var dpr = window.devicePixelRatio || 1;
      if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
        cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      var padL = 44, padR = 14, padT = 18, padB = 24;
      var iw = w - padL - padR, ih = h - padT - padB;
      var ym = yMax();
      function X(R) { return padL + iw * (R / GRAD); }
      function Y(R) { return padT + ih * (1 - yVal(R) / ym); }

      /* grid + axes */
      ctx.font = "10px 'Space Mono', monospace";
      ctx.textBaseline = "middle";
      var gx, gy2;
      ctx.strokeStyle = "rgba(238,247,238,0.07)"; ctx.lineWidth = 1;
      for (gx = 0; gx <= GRAD; gx += 2) {
        ctx.beginPath(); ctx.moveTo(X(gx), padT); ctx.lineTo(X(gx), h - padB); ctx.stroke();
        if (w >= 560) {
          ctx.fillStyle = "rgba(238,247,238,0.45)"; ctx.textAlign = "center";
          ctx.fillText(gx + "", X(gx), h - padB + 12);
        }
      }
      var ticks = view === "price" ? [0.01, 0.02, 0.03, 0.04, 0.05] : [100, 200, 300, 400];
      ctx.textAlign = "right";
      for (var q = 0; q < ticks.length; q++) {
        gy2 = padT + ih * (1 - ticks[q] / ym);
        if (gy2 < padT + 4 || gy2 > h - padB) continue;
        ctx.strokeStyle = "rgba(238,247,238,0.05)";
        ctx.beginPath(); ctx.moveTo(padL, gy2); ctx.lineTo(w - padR, gy2); ctx.stroke();
        ctx.fillStyle = "rgba(238,247,238,0.45)";
        ctx.fillText(view === "price" ? trim(ticks[q], 2) : ticks[q] + "M", padL - 6, gy2);
      }
      ctx.fillStyle = "rgba(238,247,238,0.4)"; ctx.textAlign = "left";
      ctx.fillText(view === "price" ? "BNB / 1M" : "TOKENS / 1 BNB", 2, 8);

      /* full projected curve, faint */
      ctx.beginPath();
      for (var i = 0; i <= 80; i++) { var R = GRAD * i / 80; i === 0 ? ctx.moveTo(X(R), Y(R)) : ctx.lineTo(X(R), Y(R)); }
      ctx.strokeStyle = "rgba(168,225,12,0.22)"; ctx.lineWidth = 2; ctx.stroke();

      /* graduation gate */
      var pulse = reduced ? 0.8 : 0.55 + 0.35 * Math.sin(t / 460);
      ctx.save();
      ctx.setLineDash([6, 6]);
      ctx.beginPath(); ctx.moveTo(X(GRAD), padT); ctx.lineTo(X(GRAD), h - padB);
      ctx.strokeStyle = "rgba(232,184,75," + pulse.toFixed(3) + ")"; ctx.lineWidth = 2; ctx.stroke();
      ctx.restore();

      /* effective end point: simulator beats hover beats base */
      var r = simResult();
      var endR = r ? r.R2 : baseR;
      var shownR = Math.min(endR, endR * intro + (1 - intro) * 0);

      /* area fill under travelled curve */
      var grad = ctx.createLinearGradient(0, padT, 0, h - padB);
      grad.addColorStop(0, "rgba(168,225,12,0.30)"); grad.addColorStop(1, "rgba(168,225,12,0.02)");
      ctx.beginPath(); ctx.moveTo(X(0), h - padB);
      var steps = Math.max(2, Math.floor(80 * Math.max(0.001, shownR / GRAD)));
      for (var j = 0; j <= steps; j++) { var Rj = shownR * j / steps; ctx.lineTo(X(Rj), Y(Rj)); }
      ctx.lineTo(X(shownR), h - padB); ctx.closePath();
      ctx.fillStyle = grad; ctx.fill();

      /* travelled curve, bright with glow */
      ctx.save();
      ctx.shadowColor = "rgba(168,225,12,0.55)"; ctx.shadowBlur = 14;
      ctx.beginPath();
      for (var k = 0; k <= steps; k++) { var Rk = shownR * k / steps; k === 0 ? ctx.moveTo(X(Rk), Y(Rk)) : ctx.lineTo(X(Rk), Y(Rk)); }
      ctx.strokeStyle = "#a8e10c"; ctx.lineWidth = 3.5; ctx.lineCap = "round"; ctx.stroke();
      ctx.restore();

      /* simulator ghost segment (base -> after buy) */
      if (r && intro >= 1) {
        ctx.save();
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        for (var s = 0; s <= 24; s++) { var Rs = baseR + (r.R2 - baseR) * s / 24; s === 0 ? ctx.moveTo(X(Rs), Y(Rs)) : ctx.lineTo(X(Rs), Y(Rs)); }
        ctx.strokeStyle = "rgba(238,247,238,0.85)"; ctx.lineWidth = 2; ctx.stroke();
        ctx.restore();
        ctx.beginPath(); ctx.arc(X(baseR), Y(baseR), 4.5, 0, Math.PI * 2);
        ctx.fillStyle = "#eef7ee"; ctx.fill();
      }

      /* particles flowing along travelled curve */
      if (!reduced && shownR > 0.05) {
        if (particles.length < 26 && Math.random() < 0.35) particles.push({ f: 0, sp: 0.0016 + Math.random() * 0.0028 });
        particles = particles.filter(function (p) { return p.f <= 1; });
        ctx.fillStyle = "rgba(238,247,238,0.8)";
        particles.forEach(function (p) {
          p.f += p.sp;
          var Rp = shownR * Math.min(1, p.f);
          ctx.globalAlpha = Math.sin(Math.min(1, p.f) * Math.PI) * 0.85;
          ctx.beginPath(); ctx.arc(X(Rp), Y(Rp), 2, 0, Math.PI * 2); ctx.fill();
        });
        ctx.globalAlpha = 1;
      }

      /* head point with pulse rings */
      var hx = X(shownR), hy = Y(shownR);
      if (!reduced) {
        var ph = (t % 1600) / 1600;
        ctx.beginPath(); ctx.arc(hx, hy, 6 + ph * 16, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(168,225,12," + (0.5 * (1 - ph)).toFixed(3) + ")"; ctx.lineWidth = 2; ctx.stroke();
      }
      ctx.beginPath(); ctx.arc(hx, hy, 6, 0, Math.PI * 2);
      ctx.fillStyle = endR >= GRAD - 1e-9 ? "#e8b84b" : "#eef7ee"; ctx.fill();
      ctx.beginPath(); ctx.arc(hx, hy, 11, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(168,225,12,0.55)"; ctx.lineWidth = 2; ctx.stroke();

      /* crosshair + tooltip */
      if (hoverR >= 0 && intro >= 1) {
        var cxp = X(hoverR), cyp = Y(hoverR);
        ctx.save(); ctx.setLineDash([4, 5]);
        ctx.strokeStyle = "rgba(238,247,238,0.35)"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(cxp, padT); ctx.lineTo(cxp, h - padB); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(padL, cyp); ctx.lineTo(w - padR, cyp); ctx.stroke();
        ctx.restore();
        ctx.beginPath(); ctx.arc(cxp, cyp, 4, 0, Math.PI * 2);
        ctx.fillStyle = "#e8b84b"; ctx.fill();
        if (tip) {
          tip.innerHTML =
            "<b>" + hoverR.toFixed(2) + " BNB</b> reserve<br>" +
            "Spot " + fmtPrice(hoverR) + " BNB / 1M<br>" +
            fmtTok(perBnb(hoverR)) + " tokens / 1 BNB<br>" +
            (hoverR / GRAD * 100).toFixed(1) + "% to graduation";
          var tx = Math.min(Math.max(cxp + 14, 6), w - 158);
          tip.style.left = tx + "px";
          tip.style.top = Math.max(6, cyp - 30) + "px";
          tip.style.opacity = "1";
        }
      } else if (tip) tip.style.opacity = "0";

      /* readouts follow the effective point */
      var effR = hoverR >= 0 ? hoverR : endR;
      if (pctEl) pctEl.innerHTML = (effR / GRAD * 100).toFixed(1) + "% <small>TO GRADUATION</small>";
      if (resEl) resEl.textContent = effR.toFixed(3) + " BNB";
    }

    function frame(t) {
      if (mode === "demo") {
        demoT += 0.0004 * demoDir;
        if (demoT > 0.8) demoDir = -1;
        if (demoT < 0.3) demoDir = 1;
        baseR = GRAD * demoT;
      }
      if (intro < 1) intro = Math.min(1, intro + 0.016);
      dispR += (baseR - dispR) * 0.08;
      if (Math.abs(baseR - dispR) < 0.002) dispR = baseR;
      var keep = baseR; baseR = dispR;
      if (visible) draw(t || 0);
      baseR = keep;
      if (!reduced) requestAnimationFrame(frame);
    }
    if (reduced) { intro = 1; draw(0); renderSimPanel(); }
    else requestAnimationFrame(frame);

    window.CFCURVE = {
      setLive: function (d) {
        mode = "live"; baseR = Math.max(0, Math.min(GRAD, d.reserveBnb || 0)); dispR = baseR;
        if (chipEl) chipEl.style.display = "none";
        if (nameEl && d.name) nameEl.textContent = d.name;
        setSim(Math.min(simGross, maxGross(baseR)));
        if (reduced) draw(0);
      },
      setDemo: function () {
        mode = "demo";
        if (chipEl) { chipEl.textContent = "Demo curve"; chipEl.style.display = ""; }
        if (reduced) draw(0);
      },
      setEmpty: function () {
        mode = "empty"; baseR = 0; dispR = 0;
        if (chipEl) { chipEl.textContent = "Model curve · awaiting first launch"; chipEl.style.display = ""; }
        if (nameEl) nameEl.textContent = "NO LAUNCHES YET";
        setSim(Math.min(simGross, maxGross(0)));
        if (reduced) draw(0);
      }
    };
    renderSimPanel();
  }

  /* =====================================================================
     MINI RIBBON (every other page)
  ===================================================================== */
  var mounts = document.querySelectorAll("[data-cfx-ribbon]");
  for (var m = 0; m < mounts.length; m++) initRibbon(mounts[m]);

  function initRibbon(mount) {
    var a = document.createElement("a");
    a.className = "cfx-ribbon";
    a.href = "/";
    a.innerHTML =
      '<span class="cfx-rib-label"><span class="en">Curve</span><span class="zh">曲线</span></span>' +
      '<canvas class="cfx-rib-canvas"></canvas>' +
      '<span class="cfx-rib-stat" data-r="pct">···</span>' +
      '<span class="cfx-rib-stat dim" data-r="pass">···</span>' +
      '<span class="cfx-rib-go"><span class="en">Open chart</span><span class="zh">打开图表</span> →</span>';
    mount.replaceWith(a);
    var cv = a.querySelector("canvas");
    var ctx = cv.getContext("2d");
    var pctEl = a.querySelector('[data-r="pct"]');
    var passEl = a.querySelector('[data-r="pass"]');
    var baseR = 0, dispR = 0, vis = true;

    function draw(t) {
      var w = cv.clientWidth, h = cv.clientHeight;
      if (!w || !h) return;
      var dpr = window.devicePixelRatio || 1;
      if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
        cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      var ym = per1M(GRAD) * 1.08;
      function X(R) { return 4 + (w - 8) * (R / GRAD); }
      function Y(R) { return 4 + (h - 10) * (1 - per1M(R) / ym); }
      ctx.beginPath();
      for (var i = 0; i <= 48; i++) { var R = GRAD * i / 48; i === 0 ? ctx.moveTo(X(R), Y(R)) : ctx.lineTo(X(R), Y(R)); }
      ctx.strokeStyle = "rgba(168,225,12,0.25)"; ctx.lineWidth = 1.5; ctx.stroke();
      var p = Math.max(0.004, dispR);
      var grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, "rgba(168,225,12,0.30)"); grad.addColorStop(1, "rgba(168,225,12,0.02)");
      ctx.beginPath(); ctx.moveTo(X(0), h - 4);
      var steps = Math.max(2, Math.floor(48 * p / GRAD));
      for (var j = 0; j <= steps; j++) { var Rj = p * j / steps; ctx.lineTo(X(Rj), Y(Rj)); }
      ctx.lineTo(X(p), h - 4); ctx.closePath(); ctx.fillStyle = grad; ctx.fill();
      ctx.beginPath();
      for (var k = 0; k <= steps; k++) { var Rk = p * k / steps; k === 0 ? ctx.moveTo(X(Rk), Y(Rk)) : ctx.lineTo(X(Rk), Y(Rk)); }
      ctx.strokeStyle = "#a8e10c"; ctx.lineWidth = 2.5; ctx.lineCap = "round"; ctx.stroke();
      var hx = X(p), hy = Y(p);
      if (!reduced) {
        var ph = (t % 1600) / 1600;
        ctx.beginPath(); ctx.arc(hx, hy, 3 + ph * 8, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(168,225,12," + (0.5 * (1 - ph)).toFixed(3) + ")"; ctx.lineWidth = 1.5; ctx.stroke();
      }
      ctx.beginPath(); ctx.arc(hx, hy, 3.5, 0, Math.PI * 2); ctx.fillStyle = "#eef7ee"; ctx.fill();
      /* graduation tick */
      ctx.beginPath(); ctx.moveTo(X(GRAD), 3); ctx.lineTo(X(GRAD), h - 6);
      ctx.strokeStyle = "rgba(232,184,75,0.65)"; ctx.lineWidth = 1.5; ctx.stroke();
    }
    function frame(t) {
      dispR += (baseR - dispR) * 0.08;
      if (Math.abs(baseR - dispR) < 0.002) dispR = baseR;
      if (vis) draw(t || 0);
      if (!reduced) requestAnimationFrame(frame);
    }
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (en) { vis = en[0].isIntersecting; }, { threshold: 0.02 }).observe(cv);
    }
    if (reduced) draw(0); else requestAnimationFrame(frame);

    /* live reads, same helpers as the board */
    try {
      var R = window.CFREAD;
      if (R && C.curve) {
        R.ethCall(C.curve, R.SEL.launchCount).then(function (h) {
          var n = R.decUint(h);
          if (n === null || n === 0n) {
            pctEl.textContent = "awaiting first launch";
            return;
          }
          pctEl.textContent = n.toString() + (n === 1n ? " launch" : " launches");
          return R.ethCall(C.curve, R.SEL.launchInfo + R.encUint(Number(n) - 1)).then(function (ah) {
            var hex = (ah || "").replace(/^0x/, "");
            if (hex.length < 64 * 3) return;
            var reserve = Number(BigInt("0x" + hex.slice(128, 192))) / 1e18;
            baseR = Math.max(0, Math.min(GRAD, reserve));
            pctEl.textContent = (baseR / GRAD * 100).toFixed(1) + "% to graduation · " + n.toString() + " live";
            if (reduced) draw(0);
          });
        }).catch(function () { pctEl.textContent = "model curve · 8 BNB"; });
        R.ethCall(C.pass, R.SEL.totalMinted).then(function (h) {
          var v = R.decUint(h);
          if (v !== null) passEl.textContent = R.fmtInt(v) + " Pass";
        }).catch(function () {});
      } else {
        pctEl.textContent = "model curve · 8 BNB";
      }
    } catch (e) { pctEl.textContent = "model curve · 8 BNB"; }
  }
})();

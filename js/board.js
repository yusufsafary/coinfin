/* COINFIN CURVE · homepage board: Pass stats, launch board, ticker.
   No curve contract configured: runs a clearly badged DEMO board.
   Contract configured: reads the factory through the RPC race; any read
   failure falls back to the demo board, still badged DEMO. */
(function () {
  var C = window.CFIN, R = window.CFREAD;
  var grid = document.getElementById("launchGrid");
  if (!grid) return;

  var DEMO = [
    { sym: "PULSE", name: "Pulse Agent", pct: 62, minted: "6,200,000" },
    { sym: "ORBIT", name: "Orbit Scout", pct: 34, minted: "3,400,000" },
    { sym: "VAULT", name: "Vault Keeper", pct: 91, minted: "9,100,000" }
  ];

  function spark(canvas, pct, seed) {
    var x = canvas.getContext("2d");
    var w = canvas.clientWidth || 300, h = canvas.clientHeight || 64;
    var dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr; canvas.height = h * dpr; x.setTransform(dpr, 0, 0, dpr, 0, 0);
    var rnd = seed * 7919;
    function rand() { rnd = (rnd * 9301 + 49297) % 233280; return rnd / 233280; }
    x.beginPath();
    var steps = 26, upto = Math.max(2, Math.floor(steps * pct / 100));
    for (var i = 0; i <= upto; i++) {
      var fx = i / steps, fy = Math.pow(fx, 1.6) * 0.82 + rand() * 0.07;
      var px = fx * w, py = h - 6 - fy * (h - 14);
      i === 0 ? x.moveTo(px, py) : x.lineTo(px, py);
    }
    x.strokeStyle = "#a8e10c"; x.lineWidth = 2.4; x.lineCap = "round"; x.stroke();
    x.setLineDash([4, 5]); x.beginPath(); x.moveTo(0, 9); x.lineTo(w, 9);
    x.strokeStyle = "rgba(232,184,75,0.65)"; x.lineWidth = 1.4; x.stroke();
  }

  function card(d, isDemo) {
    var el = document.createElement("article");
    el.className = "launch-card";
    var grad = d.pct >= 100;
    el.innerHTML =
      '<span class="badge ' + (isDemo ? "demo" : grad ? "grad" : "") + '">' +
        (isDemo ? "DEMO" : grad ? "GRADUATED" : "ON CURVE") + "</span>" +
      '<div class="sym">$' + d.sym + '</div><div class="nm">' + d.name + "</div>" +
      '<canvas class="spark"></canvas>' +
      '<div class="prog"><i style="width:' + Math.min(100, d.pct) + '%"></i></div>' +
      '<div class="meta"><span>RESERVE <b>' + d.reserve + ' BNB</b></span>' +
      "<span><b>" + d.pct.toFixed(1) + "%</b> / 8 BNB</span></div>" +
      '<div class="meta"><span>SOLD <b>' + d.minted + "</b></span><span>AGENT ID ONLY</span></div>";
    grid.appendChild(el);
    spark(el.querySelector("canvas.spark"), Math.min(100, d.pct), d.sym.length * 13 + d.pct);
    return el;
  }

  function tickerFrom(list, isDemo) {
    if (!window.CFAPP) return;
    var items = list.map(function (d) {
      return (isDemo ? "DEMO · " : "") + "<b>$" + d.sym + "</b> " + d.pct.toFixed(1) + "% <span class='g'>/ 8 BNB</span>";
    });
    items.push("TAX <b>5%</b> · CREATOR 2 · PLATFORM 2 · PASS VAULT 1");
    items.push("GRADUATION <b>8 BNB</b> → PANCAKESWAP V2 · LP BURNED");
    window.CFAPP.setTicker(items);
  }

  var DEMO_NOTE = '<b><span class="en">Read fallback.</span><span class="zh">读取回退。</span></b> <span class="en">Chain reads failed on every endpoint, so the board below shows a labelled demo with invented tokens. Nothing here is real market data; reload to retry the live reads.</span><span class="zh">所有节点的链上读取均失败,因此下方展示板显示标注清楚的演示,使用虚构代币。这里没有任何真实市场数据;重新加载可重试实时读取。</span>';

  function showDemo() {
    grid.innerHTML = "";
    var list = DEMO.map(function (d) {
      return { sym: d.sym, name: d.name, pct: d.pct, minted: d.minted, reserve: (8 * d.pct / 100).toFixed(2) };
    });
    list.forEach(function (d) { card(d, true); });
    tickerFrom(list, true);
    if (window.CFCURVE) window.CFCURVE.setDemo();
    var n = document.getElementById("boardNote");
    if (n) { n.innerHTML = DEMO_NOTE; n.style.display = ""; }
  }

  function showEmpty() {
    grid.innerHTML = "";
    var el = document.createElement("div");
    el.className = "empty-card";
    el.innerHTML = '<b><span class="en">No launches yet</span><span class="zh">尚无发行</span></b>' +
      '<span><span class="en">The factory is live and the curve is open. The first launch appears here the moment it is created.</span>' +
      '<span class="zh">工厂已上线,曲线已开放。第一个发行创建后立即出现在这里。</span></span>';
    grid.appendChild(el);
    tickerFrom([], false);
    if (window.CFCURVE) window.CFCURVE.setEmpty();
    var n = document.getElementById("boardNote");
    if (n) n.style.display = "";
  }

  function setStat(id, txt) { var e = document.getElementById(id); if (e) e.textContent = txt; }

  /* count-up for headline numbers (skipped under reduced motion) */
  var reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function countUp(id, to, fmt) {
    var e = document.getElementById(id);
    if (!e) return;
    if (reducedMotion || to <= 0) { e.textContent = fmt(to); return; }
    var t0 = null, dur = 900;
    function step(ts) {
      if (!t0) t0 = ts;
      var k = Math.min(1, (ts - t0) / dur), ease = 1 - Math.pow(1 - k, 3);
      e.textContent = fmt(Math.round(to * ease));
      if (k < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  /* ---------- live reads ---------- */
  function live() {
    var S = R.SEL;
    /* Pass minted */
    if (C.pass) {
      R.ethCall(C.pass, S.totalMinted).then(function (h) {
        var v = R.decUint(h);
        if (v !== null) countUp("stPassMinted", Number(v), function (n) { return R.fmtInt(n) + " / " + R.fmtInt(C.passSupply); });
      }).catch(function () {});
    }
    /* FIN claim pool */
    if (C.claim) {
      R.ethCall(C.claim, S.poolBalance).then(function (h) {
        var v = R.decUint(h);
        if (v !== null) countUp("stClaimPool", Number(v / 1000000000000000000n), function (n) { return R.fmtInt(n) + " FIN"; });
      }).catch(function () {});
    }
    /* Vault BNB balance (dividend pool so far) */
    if (C.vault) {
      R.rpc("eth_getBalance", [C.vault, "latest"]).then(function (h) {
        var v = R.decUint(h);
        if (v !== null) countUp("stVault", Number(v), function (w) { return R.fmtBnb(BigInt(Math.round(w)), 6) + " BNB"; });
      }).catch(function () {});
    }
    /* Launches */
    return R.ethCall(C.curve, S.launchCount).then(function (h) {
      var count = R.decUint(h);
      if (count === null) throw new Error("no count");
      setStat("stLaunches", count.toString());
      var n = Number(count);
      if (n === 0) { showEmpty(); return; }
      var idx = [];
      for (var i = Math.max(0, n - 6); i < n; i++) idx.push(i);
      return Promise.all(idx.map(function (i) {
        return R.ethCall(C.curve, S.launchInfo + R.encUint(i)).then(function (ah) {
          var hex = (ah || "").replace(/^0x/, "");
          if (hex.length < 64 * 7) throw new Error("no info");
          var word = function (k) { return hex.slice(k * 64, (k + 1) * 64); };
          var token = "0x" + word(0).slice(24);
          var reserve = BigInt("0x" + word(2));
          var grad = BigInt("0x" + word(4)) !== 0n;
          return Promise.all([
            R.ethCall(token, S.symbol).then(R.decString).catch(function () { return "TOKEN"; }),
            R.ethCall(token, S.name).then(R.decString).catch(function () { return ""; }),
            R.ethCall(token, S.totalSupply).then(R.decUint).catch(function () { return null; })
          ]).then(function (r) {
            var pct = Number(reserve) / 1e18 / C.graduationBnb * 100;
            return {
              sym: r[0] || "TOKEN", name: r[1] || "",
              pct: grad ? 100 : Math.min(99.9, pct),
              reserve: R.fmtBnb(reserve, 4),
              minted: r[2] !== null ? R.fmtInt(r[2] / 1000000000000000000n) : "···"
            };
          });
        });
      })).then(function (list) {
        grid.innerHTML = "";
        list.reverse().forEach(function (d) { card(d, false); });
        tickerFrom(list, false);
        var open = list.filter(function (d) { return d.pct < 100; })[0] || list[0];
        if (open && window.CFCURVE) {
          window.CFCURVE.setLive({ name: "$" + open.sym, reserveBnb: parseFloat(open.reserve.replace(/,/g, "")) || 0 });
        }
        var nEl = document.getElementById("boardNote");
        if (nEl) nEl.style.display = "none";
      });
    });
  }

  if (!C.curve) { showDemo(); return; }
  live().catch(function () { showDemo(); });
})();

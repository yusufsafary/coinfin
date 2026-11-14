/* COINFIN CURVE · session pulse + live hub (homepage).
   Reads the same three counters the page already trusts (Pass totalMinted,
   FIN claim poolBalance, vault BNB balance) once at load to set a silent
   baseline, then polls every 60 seconds. A rise against the previous
   snapshot fires a pulse on the tiles that display the value and adds to
   the "this session" strip. Deltas only: nothing here invents activity.
   Also publishes window.CFLIVE + a "cflive" document event for panels
   (dividend simulator) that need the same live figures. */
(function () {
  var C = window.CFIN, R = window.CFREAD;
  if (!C || !R) return;
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var FIN_POOL = 2000000000n;           /* FIN seeded into the claim pool */
  var FIN_PER_CLAIM = 250000n;          /* FIN per claim */
  var E18 = 1000000000000000000n;

  var data = { passes: null, vaultWei: null, poolFin: null, claims: null };
  var base = null, prev = null;
  var subs = [];
  window.CFLIVE = {
    data: data,
    onUpdate: function (fn) {
      subs.push(fn);
      if (data.passes !== null || data.vaultWei !== null) { try { fn(data); } catch (e) {} }
    }
  };

  function $(id) { return document.getElementById(id); }

  function emit() {
    subs.forEach(function (fn) { try { fn(data); } catch (e) {} });
    try { document.dispatchEvent(new CustomEvent("cflive", { detail: data })); } catch (e) {}
  }

  function chip(host, text) {
    if (!host) return;
    var s = document.createElement("span");
    s.className = "pulse-chip";
    s.textContent = text;
    host.appendChild(s);
    setTimeout(function () { if (s.parentNode) s.parentNode.removeChild(s); }, reduced ? 500 : 1700);
  }

  function pulse(ids, text) {
    ids.forEach(function (id) {
      var el = $(id);
      if (!el) return;
      var host = el.closest ? (el.closest(".stat, .pl-tile, .pass-no") || el.parentElement) : el.parentElement;
      if (!host) return;
      host.classList.remove("pulse-hit");
      void host.offsetWidth;
      host.classList.add("pulse-hit");
      setTimeout(function () { host.classList.remove("pulse-hit"); }, 1500);
      chip(host, text);
    });
  }

  function setItem(id, txt, active) {
    var el = $(id);
    if (!el) return;
    el.textContent = txt;
    if (el.parentElement) el.parentElement.classList.toggle("dim", !active);
  }

  function updateStrip() {
    if (!base) return;
    var dp = data.passes - base.passes;
    var dc = data.claims - base.claims;
    var dv = data.vaultWei - base.vaultWei;
    setItem("sesPass", "+" + R.fmtInt(dp), dp > 0);
    setItem("sesClaims", "+" + R.fmtInt(dc), dc > 0);
    setItem("sesVault", "+" + R.fmtBnb(dv, 4), dv > 0n);
    var strip = $("pulseStrip");
    if (strip && (dp > 0 || dc > 0 || dv > 0n)) strip.classList.add("live");
  }

  function snapshot() {
    var snap = { passes: data.passes, claims: data.claims, vaultWei: data.vaultWei };
    if (!base) { base = snap; prev = snap; updateStrip(); emit(); return; }
    if (snap.passes > prev.passes) {
      pulse(["stPassMinted", "passMinted"], "+" + R.fmtInt(snap.passes - prev.passes));
    }
    if (snap.claims > prev.claims) {
      pulse(["passClaimed"], "+" + R.fmtInt((snap.claims - prev.claims) * 250000) + " FIN");
    }
    if (snap.vaultWei > prev.vaultWei) {
      pulse(["stVault", "passVault"], "+" + R.fmtBnb(snap.vaultWei - prev.vaultWei, 4) + " BNB");
    }
    prev = snap;
    updateStrip();
    emit();
  }

  function read() {
    var jobs = [
      R.ethCall(C.pass, R.SEL.totalMinted).then(function (h) {
        var v = R.decUint(h);
        if (v !== null) data.passes = Number(v);
      }).catch(function () {}),
      R.ethCall(C.claim, R.SEL.poolBalance).then(function (h) {
        var v = R.decUint(h);
        if (v !== null) {
          var pool = v / E18;
          data.poolFin = pool;
          var done = (FIN_POOL - pool) / FIN_PER_CLAIM;
          data.claims = Number(done > 0n ? done : 0n);
        }
      }).catch(function () {}),
      R.rpc("eth_getBalance", [C.vault, "latest"]).then(function (h) {
        var v = R.decUint(h);
        if (v !== null) data.vaultWei = v;
      }).catch(function () {})
    ];
    Promise.all(jobs).then(function () {
      if (data.passes === null || data.claims === null || data.vaultWei === null) return;
      snapshot();
    });
  }

  read();
  setInterval(read, 60000);
})();

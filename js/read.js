/* COINFIN CURVE · read layer.
   Every read races several public BSC endpoints with a per-endpoint timeout;
   the first good answer wins. A missing result field is a failed read, never
   a zero. All views degrade gracefully while contracts are undeployed. */
(function () {
  var RPCS = [
    "https://bsc-dataseed.binance.org",
    "https://bsc-dataseed1.bnbchain.org",
    "https://bsc-dataseed2.bnbchain.org",
    "https://bsc.publicnode.com",
    "https://binance.ankr.com"
  ];
  var TIMEOUT = 4500;

  function oneRpc(url, method, params) {
    return new Promise(function (resolve, reject) {
      var ctl = ("AbortController" in window) ? new AbortController() : null;
      var timer = setTimeout(function () { if (ctl) ctl.abort(); reject(new Error("timeout")); }, TIMEOUT);
      fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: method, params: params }),
        signal: ctl ? ctl.signal : undefined
      }).then(function (r) { return r.json(); }).then(function (j) {
        clearTimeout(timer);
        if (!j || typeof j.result === "undefined") reject(new Error("bad result"));
        else resolve(j.result);
      }).catch(function (e) { clearTimeout(timer); reject(e); });
    });
  }

  function rpc(method, params) {
    return new Promise(function (resolve, reject) {
      var done = false, failed = 0;
      RPCS.forEach(function (url) {
        oneRpc(url, method, params).then(function (res) {
          if (!done) { done = true; resolve(res); }
        }).catch(function () {
          failed++;
          if (failed === RPCS.length && !done) reject(new Error("all endpoints failed"));
        });
      });
    });
  }

  function ethCall(to, data) {
    if (!to) return Promise.reject(new Error("no address"));
    return rpc("eth_call", [{ to: to, data: data }, "latest"]);
  }

  /* ---- encoding / decoding helpers ---- */
  function encUint(n) { return BigInt(n).toString(16).padStart(64, "0"); }
  function encAddr(a) { return a.toLowerCase().replace("0x", "").padStart(64, "0"); }
  function decUint(hex) { if (!hex || hex === "0x") return null; return BigInt(hex); }
  function decAddr(hex) { if (!hex || hex.length < 66) return null; return "0x" + hex.slice(26, 66); }
  function decBool(hex) { var v = decUint(hex); return v === null ? null : v !== 0n; }
  function decString(hex) {
    if (!hex || hex.length < 130) return null;
    try {
      var len = Number(BigInt("0x" + hex.slice(66, 130)));
      var out = "", i;
      for (i = 0; i < len; i++) {
        var code = parseInt(hex.slice(130 + i * 2, 132 + i * 2), 16);
        out += String.fromCharCode(code);
      }
      return out;
    } catch (e) { return null; }
  }

  var SEL = {
    totalSupply: "0x18160ddd",
    totalMinted: "0xa2309ff8",
    ownerOf: "0x6352211e",
    balanceOf: "0x70a08231",
    name: "0x06fdde03",
    symbol: "0x95d89b41",
    mintOpen: "0x24bbd049",
    claimOpen: "0x4b8bcb58",
    poolBalance: "0x96365d44",
    claimedById: "0x4c80ee12",
    launchCount: "0x63d0053d",
    launchInfo: "0x6aef1576",
    currentSeason: "0xbcb39621",
    dividendFor: "0x214fbed7"
  };

  /* ---- formatting ---- */
  function fmtInt(v) { /* BigInt or string of digits to grouped decimal */
    if (v === null || typeof v === "undefined") return "···";
    return v.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }
  function fmtBnb(wei, maxDec) {
    if (wei === null || typeof wei === "undefined") return "···";
    var w = BigInt(wei);
    var whole = w / 1000000000000000000n;
    var frac = (w % 1000000000000000000n).toString().padStart(18, "0");
    frac = frac.replace(/0+$/, "");
    if (typeof maxDec === "number") frac = frac.slice(0, maxDec);
    return frac ? fmtInt(whole) + "." + frac : fmtInt(whole);
  }
  function shortAddr(a) { return a ? a.slice(0, 6) + "…" + a.slice(-4) : "···"; }

  window.CFREAD = {
    rpc: rpc, ethCall: ethCall, SEL: SEL,
    encUint: encUint, encAddr: encAddr,
    decUint: decUint, decAddr: decAddr, decBool: decBool, decString: decString,
    fmtInt: fmtInt, fmtBnb: fmtBnb, shortAddr: shortAddr
  };
})();

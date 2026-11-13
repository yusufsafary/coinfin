/* COINFIN CURVE · Pass checker: FIN claim status and season dividend
   for one Pass tokenId. Pre-launch (contracts null) it answers plainly. */
(function () {
  var C = window.CFIN, R = window.CFREAD;
  var btn = document.getElementById("ckGo");
  var input = document.getElementById("ckId");
  var out = document.getElementById("ckResult");
  if (!btn || !input || !out) return;

  var T = {
    en: {
      soon: "Contracts are not deployed yet. The checker goes live with the contracts: FIN claim status and season dividend per Pass, read straight from chain.",
      bad: "Enter a valid Pass token ID (1 to 9999).",
      loading: "Reading from BNB Chain…",
      notMinted: "Pass #ID is not minted yet.",
      owner: "Owner",
      finClaimed: "FIN claim: already claimed.",
      finOpen: "FIN claim: open, 250,000 FIN ready for this Pass.",
      finClosed: "FIN claim: opens with the claim contract.",
      div: "Season dividend: DIV BNB for Season S.",
      divSoon: "Season dividend: accrues from Season 1, paid per Pass.",
      failed: "Read failed on every endpoint. Try again in a moment."
    },
    zh: {
      soon: "合约尚未部署。检查器将随合约上线:每个 Pass 的 FIN 领取状态与季度分红,直接从链上读取。",
      bad: "请输入有效的 Pass 代币 ID(1 到 9999)。",
      loading: "正在从 BNB 链读取…",
      notMinted: "Pass #ID 尚未铸造。",
      owner: "持有者",
      finClaimed: "FIN 领取:已领取。",
      finOpen: "FIN 领取:已开放,此 Pass 可领取 250,000 FIN。",
      finClosed: "FIN 领取:随领取合约开放。",
      div: "季度分红:第 S 季为 DIV BNB。",
      divSoon: "季度分红:从第 1 季开始累计,按 Pass 发放。",
      failed: "所有节点读取失败,请稍后再试。"
    }
  };
  function lang() { return document.documentElement.getAttribute("data-lang") === "zh" ? "zh" : "en"; }
  function say(html) { out.innerHTML = html; }

  btn.addEventListener("click", function () {
    var t = T[lang()];
    var id = input.value.trim();
    if (!/^\d+$/.test(id) || Number(id) >= C.passSupply) { say('<span class="warn">' + t.bad + "</span>"); return; }
    if (!C.pass || !C.claim) { say('<span class="warn">' + t.soon + "</span>"); return; }
    say(t.loading);
    var S = R.SEL;
    var season = 1;
    if (C.seasonGenesis) {
      season = Math.max(1, Math.floor((Date.now() / 1000 - C.seasonGenesis) / (C.seasonDays * 86400)) + 1);
    }
    R.ethCall(C.pass, S.ownerOf + R.encUint(id)).then(function (h) {
      var owner = R.decAddr(h);
      if (!owner) throw new Error("unminted");
      var lines = [t.owner + ": <b>" + owner + "</b>"];
      var jobs = [
        R.ethCall(C.claim, S.claimedById + R.encUint(id)).then(function (ch) {
          var claimed = R.decBool(ch);
          return R.ethCall(C.claim, S.claimOpen).then(function (oh) {
            var open = R.decBool(oh);
            if (claimed) lines.push('<span class="ok">' + t.finClaimed + "</span>");
            else if (open) lines.push('<span class="ok">' + t.finOpen + "</span>");
            else lines.push(t.finClosed);
          }).catch(function () { lines.push(t.finClosed); });
        }).catch(function () { lines.push(t.finClosed); })
      ];
      if (C.vault) {
        jobs.push(R.ethCall(C.vault, S.dividendFor + R.encUint(id) + R.encUint(season)).then(function (dh) {
          var d = R.decUint(dh);
          if (d !== null && d > 0n) lines.push('<span class="ok">' + t.div.replace("DIV", R.fmtBnb(d, 8)).replace("S", season) + "</span>");
          else lines.push(t.divSoon);
        }).catch(function () { lines.push(t.divSoon); }));
      } else {
        lines.push(t.divSoon);
      }
      return Promise.all(jobs).then(function () { say(lines.join("<br>")); });
    }).catch(function (e) {
      if (e && e.message === "unminted") say('<span class="warn">' + t.notMinted.replace("ID", id) + "</span>");
      else say('<span class="warn">' + t.failed + "</span>");
    });
  });
})();

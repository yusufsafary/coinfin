// CoinFin live board. All numbers are read from the contracts.
const CONFIG = { core: "0x1557e5B3bC821e5128A92fB3A94aECf2AF90676e", harvest: "0xdf18D0E158abf572ffe34D9276bf3B0c196319aB", token: "0xB4C9efA5f217a75f48F3f58508ca1D70Df0d8CF4", factory: "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73", wbnb: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", rpc: ["https://bsc-dataseed1.binance.org", "https://bsc-dataseed-public.bnbchain.org", "https://bsc-rpc.publicnode.com"] };
const RATES = [10000, 5000, 2500, 1250, 625, 312, 156, 78, 39, 19, 9];
const PER_EPOCH = 150000;
function fmt(n) { return n.toLocaleString("en-US"); }
function tweenNum(id, to) {
  const el = document.getElementById(id);
  if (!el) return;
  const from = parseInt((el.dataset.v || "0").replace(/[^0-9]/g, ""), 10) || 0;
  el.dataset.v = String(to);
  if (from === to || window.matchMedia("(prefers-reduced-motion: reduce)").matches) { el.textContent = fmt(to); return; }
  const t0 = performance.now(), dur = 650;
  (function step(t) {
    const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
    el.textContent = fmt(Math.round(from + (to - from) * e));
    if (p < 1 && parseInt(el.dataset.v, 10) === to) requestAnimationFrame(step);
  })(t0);
}
async function call(to, data) {
  const body = JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_call", params: [{ to, data }, "latest"] });
  const tries = CONFIG.rpc.map((u) => fetch(u, { method: "POST", headers: { "Content-Type": "application/json" }, body, signal: AbortSignal.timeout(5000) }).then((r) => r.json()).then((j) => { if (!j.result) throw 0; return j.result; }));
  return Promise.any(tries);
}
const pad = (a) => "000000000000000000000000" + a.replace("0x", "");
async function board() {
  let claims = 0n, shares = 0n, pre = 0n, reserve = 0n;
  try { claims = BigInt(await call(CONFIG.harvest, "0xd54ad2a1")); } catch (e) {}
  try { shares = BigInt(await call(CONFIG.core, "0x3a98ef39")); } catch (e) {}
  try { pre = BigInt(await call(CONFIG.core, "0x48cebd67")); } catch (e) {}
  try { reserve = BigInt(await call(CONFIG.core, "0xb753bfe9")); } catch (e) {}
  const epoch = Math.min(11, Number(claims / BigInt(PER_EPOCH)) + 1);
  const per = RATES[epoch - 1];
  const inEpoch = Number(claims % BigInt(PER_EPOCH));
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.innerHTML = v; };
  set("bEpoch", epoch + ' <span style="font-size:.45em">of 11</span>');
  set("bPer", fmt(per));
  tweenNum("bShares", Number(shares));
  tweenNum("bClaims", Number(claims));
  tweenNum("bPre", Number(pre));
  const bar = document.getElementById("bBar");
  if (bar) bar.style.width = (inEpoch / PER_EPOCH * 100).toFixed(2) + "%";
  set("bReserve", (Number(reserve) / 1e18).toFixed(4) + " BNB");
  window.CF = { epoch: epoch, per: per, claims: Number(claims) };
  document.dispatchEvent(new Event("cf:board"));
  // Tandai baris epoch berjalan di tabel jadwal.
  document.querySelectorAll("table.sched tr[data-epoch]").forEach((tr) => {
    tr.classList.toggle("cur", Number(tr.dataset.epoch) === epoch);
  });
  // Harga dan likuiditas pool.
  try {
    const pair = await call(CONFIG.factory, "0xe6a43905" + pad(CONFIG.token) + pad(CONFIG.wbnb));
    const pairAddr = "0x" + pair.slice(-40);
    if (pairAddr !== "0x0000000000000000000000000000000000000000") {
      const res = await call(pairAddr, "0x0902f1ac");
      const t0 = (await call(pairAddr, "0x0dfe1681")).slice(-40);
      const r0 = BigInt("0x" + res.slice(2, 66)), r1 = BigInt("0x" + res.slice(66, 130));
      const isWbnb0 = t0.toLowerCase() === CONFIG.wbnb.slice(2).toLowerCase();
      const rBnb = isWbnb0 ? r0 : r1, rFin = isWbnb0 ? r1 : r0;
      if (rBnb > 0n && rFin > 0n) {
        set("bPrice", "1 BNB = " + fmt(Math.round(Number(rFin) / Number(rBnb))) + " FIN");
        set("bLiq", (Number(rBnb) / 1e18).toFixed(3) + " BNB + " + fmt(Math.round(Number(rFin) / 1e18)) + " FIN");
      }
    }
  } catch (e) {}
}
if (document.getElementById("bEpoch")) { board(); setInterval(board, 30000); }
(function () {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const targets = document.querySelectorAll("section.blk, .board");
  if (!reduced && "IntersectionObserver" in window) {
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("on"); io.unobserve(e.target); } }), { threshold: 0.08 });
    targets.forEach((el) => { el.classList.add("rv"); io.observe(el); });
  }
  document.querySelectorAll(".prompt").forEach((box) => {
    box.addEventListener("click", async () => {
      const p = box.querySelector("p");
      if (!p) return;
      try { await navigator.clipboard.writeText(p.textContent.trim()); } catch (e) {}
      box.classList.add("copied");
      setTimeout(() => box.classList.remove("copied"), 1600);
    });
  });
  // Kalkulator panen.
  const cs = document.getElementById("cShares"), cd = document.getElementById("cDays");
  if (cs && cd) {
    const upd = () => {
      const per = (window.CF && window.CF.per) || 10000;
      const sh = Number(cs.value), dy = Number(cd.value);
      document.getElementById("cSharesV").textContent = sh;
      document.getElementById("cDaysV").textContent = dy;
      const total = sh * dy * per;
      document.getElementById("cOut").textContent = fmt(total) + " FIN";
      const zh = document.documentElement.dataset.lang === "zh";
      document.getElementById("cNote").textContent = zh
        ? "按当前周期每单位 " + fmt(per) + " FIN 估算。创始人仓位每天多 25%。网络领取推进时费率减半，实际收获取决于领取时的周期。"
        : "Estimated at today's rate of " + fmt(per) + " FIN per unit. Founder positions earn 25% more per day. Rates halve as the network claims, so an actual harvest depends on the epoch when you claim.";
    };
    cs.addEventListener("input", upd);
    cd.addEventListener("input", upd);
    document.addEventListener("cf:board", upd);
    upd();
  }
})();

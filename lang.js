function setLang(l) {
  document.documentElement.setAttribute("data-lang", l);
  try { localStorage.setItem("cf-lang", l); } catch (e) {}
  var en = document.getElementById("swEn"), zh = document.getElementById("swZh");
  if (en) en.classList.toggle("on", l === "en");
  if (zh) zh.classList.toggle("on", l === "zh");
  document.documentElement.lang = l === "zh" ? "zh-CN" : "en";
}
(function () {
  var saved = "en";
  try { saved = localStorage.getItem("cf-lang") || "en"; } catch (e) {}
  setLang(saved === "zh" ? "zh" : "en");
})();

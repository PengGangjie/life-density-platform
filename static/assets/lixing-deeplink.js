/* 砺行深链桥：lixing:// scheme → 页面路由（App 壳内生效）
 * 依赖 Capacitor App 插件（App Url Open 事件）。
 * 路由表：lixing://almanac → almanac.html；lixing://decide → index.html（决策区）；
 *         lixing://home / 其他 → index.html。页面已在目标页则不跳。
 */
(function () {
  "use strict";
  function route(urlStr) {
    var m = /^lixing:\/\/([a-z]+)/i.exec(String(urlStr || ""));
    if (!m) return null;
    var page = m[1].toLowerCase();
    var onIndex = /index\.html$/i.test(location.pathname) || /\/$/.test(location.pathname);
    if (page === "almanac" && !/almanac\.html$/i.test(location.pathname)) {
      location.href = "almanac.html";
    } else if (page === "decide") {
      if (!onIndex) { location.href = "index.html#top"; return; }
      var decide = document.querySelector("[data-nav-decide], #navDecide, .decide-entry");
      if (decide && decide.scrollIntoView) decide.scrollIntoView({ behavior: "smooth" });
    }
  }
  function bind() {
    try {
      if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
        window.Capacitor.Plugins.App.addListener("appUrlOpen", function (data) {
          route(data && data.url);
        });
      }
    } catch (e) { /* 非壳环境忽略 */ }
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind);
  } else {
    bind();
  }
  // 冷启动：部分场景 Cap 已就绪但事件错过，读一眼启动参数兜底
  try {
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
      window.Capacitor.Plugins.App.getLaunchUrl && window.Capacitor.Plugins.App.getLaunchUrl().then(function (r) {
        if (r && r.url) route(r.url);
      }).catch(function () {});
    }
  } catch (e) { /* 同上 */ }
})();

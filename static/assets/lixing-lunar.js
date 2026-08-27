/**
 * 砺行 · 日省 — 新历 / 农历日期格式化（Intl 中国农历）
 */
(function () {
  "use strict";

  function parseDateKey(key) {
    if (!key) return null;
    var d = new Date(String(key) + "T12:00:00");
    return isNaN(d.getTime()) ? null : d;
  }

  function formatGregorianLine(dateKey) {
    var d = parseDateKey(dateKey);
    if (!d) return "—";
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    var weekday = d.toLocaleDateString("zh-CN", { weekday: "long" });
    return y + "." + m + "." + day + " · " + weekday;
  }

  function formatLunarLine(dateKey) {
    var d = parseDateKey(dateKey);
    if (!d) return "";
    try {
      var parts = new Intl.DateTimeFormat("zh-CN-u-ca-chinese", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }).formatToParts(d);
      var year = "";
      var month = "";
      var day = "";
      parts.forEach(function (p) {
        if (p.type === "year") year = p.value;
        if (p.type === "month") month = p.value;
        if (p.type === "day") day = p.value;
      });
      if (!month && !day) return "";
      return "农历 " + (year ? year + " " : "") + month + day;
    } catch (_e) {
      return "";
    }
  }

  function formatIssueLine(dateKey) {
    var d = parseDateKey(dateKey);
    if (!d) return "—";
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return y + " · " + m + " · " + day;
  }

  window.LixingLunar = {
    formatGregorianLine: formatGregorianLine,
    formatLunarLine: formatLunarLine,
    formatIssueLine: formatIssueLine,
  };
})();

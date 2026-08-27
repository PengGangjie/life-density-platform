/**
 * 砺行 · 日省 — 新历 / 农历日期格式化（Intl 中国农历）
 */
(function () {
  "use strict";

  var CN = "〇一二三四五六七八九";

  function parseDateKey(key) {
    if (!key) return null;
    var d = new Date(String(key) + "T12:00:00");
    return isNaN(d.getTime()) ? null : d;
  }

  function digitsToChinese(str) {
    return String(str || "").replace(/\d/g, function (d) {
      return CN[+d];
    });
  }

  /** 农历日：初一…三十（不用阿拉伯数字） */
  function lunarDayLabel(n) {
    var day = parseInt(n, 10);
    if (!day || day < 1 || day > 30) return "";
    if (day <= 10) {
      return "初" + ["", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十"][day];
    }
    if (day < 20) {
      return "十" + ["", "一", "二", "三", "四", "五", "六", "七", "八", "九"][day - 10];
    }
    if (day === 20) return "二十";
    if (day < 30) {
      return "廿" + ["", "一", "二", "三", "四", "五", "六", "七", "八", "九"][day - 20];
    }
    return "三十";
  }

  function normalizeLunarMonth(raw) {
    var s = String(raw || "").replace(/[\d]/g, "");
    s = s.replace(/月/g, "");
    if (!s) return "";
    if (s.indexOf("闰") === 0) return "闰" + s.slice(1) + "月";
    return s + "月";
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
      var yMatch = String(year).match(/\d+/);
      var cnYear = yMatch ? digitsToChinese(yMatch[0]) : digitsToChinese(year);
      var dMatch = String(day).match(/\d+/);
      var cnDay = "";
      if (dMatch) cnDay = lunarDayLabel(dMatch[0]);
      else cnDay = String(day).replace(/[\d]/g, "").replace(/日/g, "");
      var cnMonth = normalizeLunarMonth(month);
      var bits = [];
      if (cnYear) bits.push(cnYear + "年");
      if (cnMonth) bits.push(cnMonth);
      if (cnDay) bits.push(cnDay);
      return bits.length ? "农历 " + bits.join("") : "";
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

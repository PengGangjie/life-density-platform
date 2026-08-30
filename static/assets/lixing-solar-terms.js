/**
 * 砺行 · 日省 — 二十四节气中国传统色（参考故宫色彩美学 / 国色×节气）
 * RGB 取代表性「节气色」主色，用于 accent 与选色器。
 */
(function () {
  "use strict";

  /** @type {{ id: string, name: string, colorName: string, color: string, m: number, d: number }[]} */
  var SOLAR_TERMS = [
    { id: "lichun", name: "立春", colorName: "缥碧", color: "#78B4C4", m: 2, d: 4 },
    { id: "yushui", name: "雨水", colorName: "青青", color: "#79BCE1", m: 2, d: 19 },
    { id: "jingzhe", name: "惊蛰", colorName: "黄栗留", color: "#E6B422", m: 3, d: 6 },
    { id: "chunfen", name: "春分", colorName: "皦玉", color: "#9BA8B4", m: 3, d: 21 },
    { id: "qingming", name: "清明", colorName: "翠微", color: "#5C8A68", m: 4, d: 5 },
    { id: "guyu", name: "谷雨", colorName: "螺子黛", color: "#4A4266", m: 4, d: 20 },
    { id: "lixia", name: "立夏", colorName: "翠缥", color: "#48A8A8", m: 5, d: 6 },
    { id: "xiaoman", name: "小满", colorName: "鞠衣", color: "#D0C101", m: 5, d: 21 },
    { id: "mangzhong", name: "芒种", colorName: "青圭", color: "#7FB3A3", m: 6, d: 6 },
    { id: "xiazhi", name: "夏至", colorName: "山矾", color: "#A89888", m: 6, d: 21 },
    { id: "xiaoshu", name: "小暑", colorName: "朱柿", color: "#EB6E1A", m: 7, d: 7 },
    { id: "dashu", name: "大暑", colorName: "青楸", color: "#6B8E8E", m: 7, d: 23 },
    { id: "liqiu", name: "立秋", colorName: "空青", color: "#5D8391", m: 8, d: 8 },
    { id: "chushu", name: "处暑", colorName: "葱倩", color: "#9CC8B8", m: 8, d: 23 },
    { id: "bailu", name: "白露", colorName: "藕丝秋半", color: "#C8C4D0", m: 9, d: 8 },
    { id: "qiufen", name: "秋分", colorName: "蜜褐", color: "#C8935A", m: 9, d: 23 },
    { id: "hanlu", name: "寒露", colorName: "绀宇", color: "#556B8B", m: 10, d: 8 },
    { id: "shuangjiang", name: "霜降", colorName: "棠梨", color: "#8E4B4B", m: 10, d: 23 },
    { id: "lidong", name: "立冬", colorName: "苏方", color: "#8B4C4C", m: 11, d: 8 },
    { id: "xiaoxue", name: "小雪", colorName: "朱殷", color: "#EB5079", m: 11, d: 22 },
    { id: "daxue", name: "大雪", colorName: "雀梅", color: "#6B4A58", m: 12, d: 7 },
    { id: "dongzhi", name: "冬至", colorName: "黪墨", color: "#3D3D3D", m: 12, d: 22 },
    { id: "xiaohan", name: "小寒", colorName: "獭见", color: "#87AFC7", m: 1, d: 6 },
    { id: "dahan", name: "大寒", colorName: "暝色", color: "#6A6370", m: 1, d: 20 },
  ];

  var TERM_BY_ID = {};
  SOLAR_TERMS.forEach(function (t) {
    TERM_BY_ID[t.id] = t;
  });

  /** 近似交节日（不含精确天文历）；1 月 1–5 日仍属冬至 */
  var BOUNDARIES = SOLAR_TERMS.map(function (t) {
    return { id: t.id, m: t.m, d: t.d };
  }).sort(function (a, b) {
    if (a.m !== b.m) return a.m - b.m;
    return a.d - b.d;
  });

  function parseDateKey(key) {
    if (!key || typeof key !== "string") return null;
    var p = key.split("-").map(Number);
    if (p.length < 3 || !p[0]) return null;
    return { y: p[0], m: p[1], d: p[2] };
  }

  function getSolarTermIdForDate(dateKey) {
    var dt = parseDateKey(dateKey);
    if (!dt) return "lichun";
    var m = dt.m;
    var d = dt.d;
    var current = "dongzhi";
    for (var i = 0; i < BOUNDARIES.length; i++) {
      var b = BOUNDARIES[i];
      if (m > b.m || (m === b.m && d >= b.d)) current = b.id;
    }
    return current;
  }

  function getTermById(id) {
    return TERM_BY_ID[id] || TERM_BY_ID.lichun;
  }

  function hexToRgb(hex) {
    var h = String(hex || "").replace("#", "");
    if (h.length === 3) {
      h = h
        .split("")
        .map(function (c) {
          return c + c;
        })
        .join("");
    }
    var n = parseInt(h, 16);
    if (isNaN(n)) return { r: 74, g: 69, b: 64 };
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  function softAccent(hex, alpha) {
    var c = hexToRgb(hex);
    return "rgba(" + c.r + "," + c.g + "," + c.b + "," + (alpha == null ? 0.14 : alpha) + ")";
  }

  window.LixingSolarTerms = {
    SOLAR_TERMS: SOLAR_TERMS,
    getSolarTermIdForDate: getSolarTermIdForDate,
    getTermById: getTermById,
    hexToRgb: hexToRgb,
    softAccent: softAccent,
  };
})();

/* oil-icon 适配性测试注入 —— 删除 index.html / workspace.html 里的引用行即完全回退 */
(function () {
  "use strict";
  var CSS = ".oil-icon{display:inline-block;width:20px;height:20px;vertical-align:-0.32em;margin-right:6px;"
    + "filter:drop-shadow(0 0 1px rgba(26,18,12,.12));pointer-events:none;}"
    + ".home-module-btn .oil-icon{width:22px;height:22px;vertical-align:-0.38em;}"
    + ".home-done-kicker .oil-icon{width:30px;height:30px;vertical-align:-0.55em;}";
  var s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s);

  function icon(name) {
    var img = document.createElement("img");
    img.className = "oil-icon";
    img.src = "assets/icons/" + name + ".png";
    img.alt = ""; img.decoding = "async";
    return img;
  }
  function prepend(sel, name, root) {
    (root || document).querySelectorAll(sel).forEach(function (el) {
      if (el.querySelector(":scope > .oil-icon")) return;
      el.insertBefore(icon(name), el.firstChild);
    });
  }

  /* 主页：三主线 Tab + 记完今日的完成态 */
  var tabMap = { decide: "08-decision-coin", action: "01-today", wish: "03-three-wishes" };
  document.querySelectorAll(".home-module-btn").forEach(function (btn) {
    var m = tabMap[btn.dataset.module];
    if (m) btn.insertBefore(icon(m), btn.firstChild);
  });
  if (document.querySelector(".home-done-kicker")) prepend(".home-done-kicker", "11-harvest");

  /* 工具台：顶部模块导航按钮（愿/01/02…）*/
  var navTabMap = {
    wishes: "03-three-wishes", rational: "13-knowing-doing", density: "06-life-density",
    sampling: "02-daily-reflection", industry: "16-toolbox", reflect: "10-review",
    opinion: "01-today", penetrate: "12-growth", dualcard: "07-life-thickness",
    bias: "15-week-month-year", leon: "09-wheel-of-life", kpi: "05-one-year-vow",
    harvest: "11-harvest"
  };
  document.querySelectorAll("#navTabs button[data-panel]").forEach(function (btn) {
    var n = navTabMap[btn.dataset.panel];
    if (n && !btn.querySelector(":scope > .oil-icon")) btn.insertBefore(icon(n), btn.firstChild);
  });

  /* 工具台：各面板 summary 前缀 */
  var panelMap = {
    "panel-wishes": "03-three-wishes",
    "panel-rational": "13-knowing-doing",
    "panel-density": "06-life-density",
    "panel-sampling": "02-daily-reflection",
    "panel-industry": "16-toolbox",
    "panel-reflect": "10-review",
    "panel-opinion": "01-today",
    "panel-penetrate": "12-growth",
    "panel-dualcard": "07-life-thickness",
    "panel-bias": "15-week-month-year",
    "panel-leon": "09-wheel-of-life",
    "panel-kpi": "05-one-year-vow",
    "panel-harvest": "11-harvest"
  };
  Object.keys(panelMap).forEach(function (pid) {
    var panel = document.getElementById(pid);
    if (!panel) return;
    var head = panel.querySelector("details.guide > summary") || panel.querySelector(".card-title");
    if (head && !head.querySelector(":scope > .oil-icon")) head.insertBefore(icon(panelMap[pid]), head.firstChild);
  });
})();

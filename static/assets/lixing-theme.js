/**
 * 砺行 · 日省 — 中国传统五色（青赤黄白黑）
 */
(function () {
  "use strict";

  var AUTO_ID = "auto";

  /** 正色 accent；「白」用素灰以便浅底可见 */
  var FIVE_COLORS = [
    { id: "qing", name: "青", color: "#008792" },
    { id: "chi", name: "赤", color: "#C3272B" },
    { id: "huang", name: "黄", color: "#D4A017" },
    { id: "bai", name: "白", color: "#7A756E" },
    { id: "hei", name: "黑", color: "#1C1C1C" },
  ];

  var BY_ID = {};
  FIVE_COLORS.forEach(function (c) {
    BY_ID[c.id] = c;
  });

  var LEGACY_MAP = {
    default: AUTO_ID,
    auto: AUTO_ID,
    sand: "huang",
    sage: "qing",
    rose: "chi",
    mist: "bai",
    orchid: "hei",
    ink: "hei",
    green: "qing",
    red: "chi",
    cyan: "qing",
    amber: "huang",
    purple: "hei",
    mono: "hei",
    calm: "bai",
    warm: "chi",
    low: "hei",
    tense: "chi",
    still: "hei",
  };

  FIVE_COLORS.forEach(function (c) {
    LEGACY_MAP[c.id] = c.id;
  });

  ["lichun", "yushui", "jingzhe", "chunfen", "qingming", "guyu"].forEach(function (id) {
    LEGACY_MAP[id] = "qing";
  });
  ["lixia", "xiaoman", "mangzhong", "xiazhi", "xiaoshu", "dashu"].forEach(function (id) {
    LEGACY_MAP[id] = "chi";
  });
  ["liqiu", "chushu", "bailu", "qiufen", "hanlu", "shuangjiang"].forEach(function (id) {
    LEGACY_MAP[id] = "huang";
  });
  ["lidong", "xiaoxue", "daxue", "dongzhi", "xiaohan", "dahan"].forEach(function (id) {
    LEGACY_MAP[id] = "hei";
  });

  function todayStr() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  function getDateKey() {
    var el = document.getElementById("date");
    return (el && el.value) || todayStr();
  }

  function monthFromKey(dateKey) {
    var p = (dateKey || "").split("-").map(Number);
    return p[1] || new Date().getMonth() + 1;
  }

  /** 随季：春青 / 夏赤 / 秋黄 / 冬黑（长夏归土黄） */
  function colorIdForSeason(dateKey) {
    var m = monthFromKey(dateKey);
    if (m >= 3 && m <= 5) return "qing";
    if (m >= 6 && m <= 8) return "chi";
    if (m >= 9 && m <= 11) return "huang";
    return "hei";
  }

  function normalizeStored(raw) {
    if (!raw) return AUTO_ID;
    if (LEGACY_MAP[raw]) return LEGACY_MAP[raw];
    return BY_ID[raw] ? raw : AUTO_ID;
  }

  function resolveColorId(stored, dateKey) {
    var key = normalizeStored(stored);
    if (key === AUTO_ID) return colorIdForSeason(dateKey || getDateKey());
    return key;
  }

  function getColor(id) {
    return BY_ID[id] || BY_ID.qing;
  }

  function softAccent(hex, alpha) {
    var h = String(hex || "").replace("#", "");
    if (h.length === 3) h = h.split("").map(function (c) { return c + c; }).join("");
    var n = parseInt(h, 16);
    if (isNaN(n)) return "rgba(0,135,146,0.14)";
    var r = (n >> 16) & 255;
    var g = (n >> 8) & 255;
    var b = n & 255;
    return "rgba(" + r + "," + g + "," + b + "," + (alpha == null ? 0.14 : alpha) + ")";
  }

  function loadThemeForDate(date) {
    if (typeof loadState !== "function") return AUTO_ID;
    var e = (loadState().entries || {})[date];
    return normalizeStored((e && (e.themeColor || e.mood)) || AUTO_ID);
  }

  function saveThemeForDate(date, theme) {
    if (typeof loadState !== "function" || typeof saveState !== "function") return;
    var st = loadState();
    st.entries = st.entries || {};
    var prev = st.entries[date] || {};
    st.entries[date] = Object.assign({}, prev, { themeColor: normalizeStored(theme) });
    saveState(st);
  }

  function updateLabel(stored, resolvedId) {
    var el = document.getElementById("themeTermName");
    if (!el) return;
    var c = getColor(resolvedId);
    if (normalizeStored(stored) === AUTO_ID) {
      el.textContent = " · " + c.name + "（随季）";
      el.title = "随季自动：" + c.name;
    } else {
      el.textContent = " · " + c.name;
      el.title = c.name;
    }
  }

  function applyTheme(theme, dateKey) {
    var stored = normalizeStored(theme);
    var dk = dateKey || getDateKey();
    var resolved = resolveColorId(stored, dk);
    var col = getColor(resolved);
    document.body.dataset.theme = resolved;
    document.body.style.setProperty("--ts-accent", col.color);
    document.body.style.setProperty("--ts-accent-soft", softAccent(col.color));
    updateLabel(stored, resolved);

    var picker = document.getElementById("themePicker");
    if (!picker) return;
    picker.querySelectorAll(".theme-swatch").forEach(function (btn) {
      var on = btn.dataset.theme === stored;
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  function renderPicker() {
    var host = document.getElementById("themePicker");
    if (!host || host.dataset.ready) return;
    host.dataset.ready = "1";

    var seasonId = colorIdForSeason(getDateKey());
    var seasonCol = getColor(seasonId);
    var html =
      '<button type="button" class="theme-swatch theme-swatch--auto" data-theme="auto" style="--swatch:' +
      seasonCol.color +
      '" title="随季（当前 ' +
      seasonCol.name +
      "）\" aria-label=\"随季自动\"></button>";

    html += FIVE_COLORS.map(function (c) {
      return (
        '<button type="button" class="theme-swatch" data-theme="' +
        c.id +
        '" style="--swatch:' +
        c.color +
        '" title="' +
        c.name +
        '" aria-label="五色 ' +
        c.name +
        '"></button>'
      );
    }).join("");

    host.innerHTML = html;
    host.addEventListener("click", function (ev) {
      var btn = ev.target.closest(".theme-swatch");
      if (!btn) return;
      applyTheme(btn.dataset.theme);
      saveThemeForDate(getDateKey(), btn.dataset.theme);
    });
  }

  function syncFromForm() {
    applyTheme(loadThemeForDate(getDateKey()));
  }

  function init() {
    renderPicker();
    syncFromForm();
    var dateEl = document.getElementById("date");
    if (dateEl) {
      dateEl.addEventListener("change", function () {
        syncFromForm();
        var autoBtn = document.querySelector(".theme-swatch--auto");
        if (autoBtn) {
          var sid = colorIdForSeason(getDateKey());
          autoBtn.style.setProperty("--swatch", getColor(sid).color);
        }
      });
    }
  }

  window.LixingTheme = {
    init: init,
    syncFromForm: syncFromForm,
    applyTheme: applyTheme,
    normalizeTheme: normalizeStored,
    FIVE_COLORS: FIVE_COLORS,
    AUTO_ID: AUTO_ID,
  };

  window.LixingMood = {
    init: init,
    syncFromForm: syncFromForm,
    applyMood: applyTheme,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

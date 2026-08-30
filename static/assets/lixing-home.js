/**
 * 砺行 · 日省 — 主页三模块：抉择 / 行动 / 愿想
 */
(function () {
  "use strict";

  var MODULE_KEY = "lixing-home-module";
  var ACTION_TAB_KEY = "lixing-action-tab";

  var SKIP_YESTERDAY_KEY = "lixing-skip-yesterday";

  function yesterdayStr() {
    var d = new Date();
    d.setDate(d.getDate() - 1);
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  function skippedYesterday() {
    try {
      return localStorage.getItem(SKIP_YESTERDAY_KEY) === yesterdayStr();
    } catch (_e) {
      return false;
    }
  }

  function skipYesterdayReminder() {
    try {
      localStorage.setItem(SKIP_YESTERDAY_KEY, yesterdayStr());
    } catch (_e) {}
    updateYesterdayBanner();
  }

  function needsYesterdayReview(entries) {
    return false;
  }

  function updateYesterdayBanner() {
    var banner = document.getElementById("yesterdayBanner");
    if (banner) banner.hidden = true;
  }

  function setModule(name) {
    document.querySelectorAll(".home-modules [data-module]").forEach(function (btn) {
      btn.classList.toggle("is-active", btn.dataset.module === name);
    });
    document.querySelectorAll(".home-panel").forEach(function (panel) {
      var on = panel.id === "module-" + name;
      panel.hidden = !on;
    });
    var dateBar = document.getElementById("journalDateBar");
    if (dateBar) dateBar.hidden = name !== "action";
    try {
      localStorage.setItem(MODULE_KEY, name);
    } catch (_e) {}
    if (name === "action") {
      ensureTodayDate();
      updateYesterdayBanner();
    }
    if (name !== "wish" && window.LixingV1 && window.LixingV1.clearWishIdleHint) {
      window.LixingV1.clearWishIdleHint();
    }
    if (name === "wish" && window.LixingV1 && window.LixingV1.renderHomeWishes) {
      window.LixingV1.renderHomeWishes();
    }
    if (name === "action") syncActionDoneView();
  }

  function localTodayStr() {
    var d = new Date();
    return (
      d.getFullYear() +
      "-" +
      String(d.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(d.getDate()).padStart(2, "0")
    );
  }

  /** 打开行动模块时默认选中当天（用户手动改日期后不覆盖） */
  function ensureTodayDate() {
    var dateEl = document.getElementById("date");
    if (!dateEl) return;
    if (dateEl.dataset.userPicked === "1") return;
    var today = typeof todayStr === "function" ? todayStr() : localTodayStr();
    if (dateEl.value !== today) {
      dateEl.value = today;
      dateEl.dispatchEvent(new Event("change"));
    } else if (typeof updateNotebookDateDisplay === "function") {
      updateNotebookDateDisplay();
    }
  }

  function setActionTab(tab) {
    document.querySelectorAll("[data-action-tab]").forEach(function (btn) {
      btn.classList.toggle("is-active", btn.dataset.actionTab === tab);
    });
    var record = document.getElementById("action-record");
    var review = document.getElementById("action-review");
    var dateBar = document.getElementById("journalDateBar");
    if (record) record.hidden = tab !== "record";
    if (review) review.hidden = tab !== "review";
    if (dateBar) dateBar.hidden = false;
    document.body.classList.toggle("review-mode", tab === "review");
    try {
      localStorage.setItem(ACTION_TAB_KEY, tab);
    } catch (_e) {}
    if (tab === "review") {
      if (typeof renderReviewSummary === "function") renderReviewSummary();
      if (window.LixingV1) window.LixingV1.updateFeelingNudge();
    }
  }

  function goReviewYesterday() {
    var dateEl = document.getElementById("date");
    if (dateEl) {
      dateEl.value = yesterdayStr();
      dateEl.dataset.userPicked = "1";
      dateEl.dispatchEvent(new Event("change"));
    }
    setModule("action");
    setActionTab("review");
    updateYesterdayBanner();
  }

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function actionDate() {
    var dateEl = document.getElementById("date");
    return dateEl && dateEl.value ? dateEl.value : localTodayStr();
  }

  function currentHarvests() {
    if (typeof loadState !== "function") return [];
    var date = actionDate();
    var e = (loadState().entries || {})[date];
    if (!e) return [];
    var hs = Array.isArray(e.harvests) ? e.harvests : [];
    var filled = hs
      .map(function (s) {
        return String(s || "").trim();
      })
      .filter(Boolean);
    if (filled.length) return filled;
    if (e.harvest) {
      return String(e.harvest)
        .split(/\n+/)
        .map(function (s) {
          return s.trim();
        })
        .filter(Boolean);
    }
    return [];
  }

  function syncActionDoneView() {
    var scene = document.getElementById("actionDoneScene");
    var form = document.getElementById("action-record");
    if (!scene || !form) return;
    var date = actionDate();
    var editing = false;
    try {
      editing = sessionStorage.getItem("lixing-action-editing") === date;
    } catch (_e) {}
    var filled = currentHarvests();
    var show = filled.length > 0 && !editing;
    scene.hidden = !show;
    form.hidden = !!show;
    var lead = document.querySelector("#module-action .harvest-lead");
    if (lead) lead.hidden = !!show;
    if (!show) {
      var btn = document.getElementById("saveRecordBtn");
      if (btn && !filled.length) {
        btn.classList.remove("is-done");
        btn.textContent = "记下今日";
      }
      return;
    }
    var title = document.getElementById("actionDoneTitle");
    var list = document.getElementById("actionDoneList");
    if (title) title.textContent = "今日密度 " + filled.length * 15 + "%";
    if (list) {
      list.innerHTML = filled
        .map(function (t, i) {
          return (
            "<li><span class=\"home-done-num\">" +
            (i + 1) +
            "</span><span>" +
            escapeHtml(t) +
            "</span></li>"
          );
        })
        .join("");
    }
  }

  function beginEditAction() {
    try {
      sessionStorage.setItem("lixing-action-editing", actionDate());
    } catch (_e) {}
    syncActionDoneView();
    var h1 = document.getElementById("harvest1");
    if (h1) {
      try {
        h1.focus();
      } catch (_e2) {}
    }
  }

  function markActionSaved() {
    try {
      sessionStorage.removeItem("lixing-action-editing");
    } catch (_e) {}
    syncActionDoneView();
  }

  function bindModules() {
    document.querySelectorAll(".home-modules [data-module]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        setModule(btn.dataset.module);
      });
    });
    document.querySelectorAll("[data-action-tab]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        setActionTab(btn.dataset.actionTab);
      });
    });
    document.getElementById("yesterdayReviewBtn")?.addEventListener("click", goReviewYesterday);
    document.getElementById("yesterdaySkipBtn")?.addEventListener("click", skipYesterdayReminder);
    document.getElementById("actionDoneEdit")?.addEventListener("click", beginEditAction);
  }

  function initDefaults() {
    var mod = "decide";
    var tab = "record";
    try {
      tab = localStorage.getItem(ACTION_TAB_KEY) || "record";
    } catch (_e) {}
    var dateEl = document.getElementById("date");
    if (dateEl) {
      dateEl.value = typeof todayStr === "function" ? todayStr() : localTodayStr();
      delete dateEl.dataset.userPicked;
    }
    setModule(mod);
    setActionTab(tab);
    updateYesterdayBanner();
  }

  function bindDatePicker() {
    var dateEl = document.getElementById("date");
    if (!dateEl) return;
    dateEl.addEventListener("change", function () {
      dateEl.dataset.userPicked = "1";
    });
  }

  window.LixingHome = {
    init: initDefaults,
    setModule: setModule,
    setActionTab: setActionTab,
    updateYesterdayBanner: updateYesterdayBanner,
    goReviewYesterday: goReviewYesterday,
    skipYesterdayReminder: skipYesterdayReminder,
    syncActionDoneView: syncActionDoneView,
    markActionSaved: markActionSaved,
    beginEditAction: beginEditAction,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      bindModules();
      bindDatePicker();
      initDefaults();
    });
  } else {
    bindModules();
    bindDatePicker();
    initDefaults();
  }
})();

/**
 * 砺行 · 日省 — 主页三模块：抉择 / 行动 / 愿想
 */
(function () {
  "use strict";

  var MODULE_KEY = "lixing-home-module";
  var ACTION_TAB_KEY = "lixing-action-tab";

  function yesterdayStr() {
    var d = new Date();
    d.setDate(d.getDate() - 1);
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  function needsYesterdayReview(entries) {
    var y = yesterdayStr();
    var e = entries[y];
    if (!e) return false;
    var hasContent = (e.three || []).some(function (t) {
      return t && String(t).trim();
    });
    if (!hasContent) return false;
    var marks = e.reviewDone || [];
    var reviewed =
      !!e.reviewedAt ||
      marks.some(function (v) {
        return v === "yes" || v === "no";
      });
    return !reviewed;
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
    if (name === "wish" && window.LixingV1 && window.LixingV1.renderHomeWishes) {
      window.LixingV1.renderHomeWishes();
    }
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

  function updateYesterdayBanner() {
    var banner = document.getElementById("yesterdayBanner");
    if (!banner || typeof loadState !== "function") return;
    banner.hidden = !needsYesterdayReview(loadState().entries || {});
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
  }

  function initDefaults() {
    var mod = "action";
    var tab = "record";
    try {
      mod = localStorage.getItem(MODULE_KEY) || "action";
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

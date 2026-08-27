/**
 * 砺行 · 日省 — 感受 / 三件小事 弹窗书写（与愿想同一 write-dialog 体例）
 */
(function () {
  "use strict";

  var dlg;
  var ta;
  var titleEl;
  var activeKind = null;
  var activeCol = null;

  var GOAL_META = {
    1: { title: "第一件小事", placeholder: "写下今天工作之外想完成的一件小事…" },
    2: { title: "第二件（可空）", placeholder: "第二件，也可以留空…" },
    3: { title: "第三件（可空）", placeholder: "第三件，也可以留空…" },
  };

  function ensureDialog() {
    if (dlg) return;
    dlg = document.createElement("dialog");
    dlg.className = "write-dialog";
    dlg.id = "writeDialog";
    dlg.innerHTML =
      '<form method="dialog" class="write-dialog-form">' +
      '<header class="write-dialog-head">' +
      '<p class="write-dialog-title" id="writeDialogTitle">书写</p>' +
      '<button type="button" class="write-dialog-close" id="writeDialogClose" aria-label="关闭">×</button>' +
      "</header>" +
      '<textarea id="writeDialogInput" rows="5" placeholder="写下…"></textarea>' +
      '<footer class="write-dialog-foot">' +
      '<button type="button" class="write-dialog-cancel" id="writeDialogCancel">取消</button>' +
      '<button type="submit" class="write-dialog-confirm" id="writeDialogConfirm">确认</button>' +
      "</footer>" +
      "</form>";
    document.body.appendChild(dlg);
    ta = document.getElementById("writeDialogInput");
    titleEl = document.getElementById("writeDialogTitle");

    document.getElementById("writeDialogClose")?.addEventListener("click", closeDialog);
    document.getElementById("writeDialogCancel")?.addEventListener("click", closeDialog);
    dlg.addEventListener("cancel", function (ev) {
      ev.preventDefault();
      closeDialog();
    });
    dlg.querySelector("form")?.addEventListener("submit", function (ev) {
      ev.preventDefault();
      confirmWrite();
    });
    dlg.addEventListener("click", function (ev) {
      if (ev.target === dlg) closeDialog();
    });
  }

  function feelPreview() {
    return document.querySelector('.write-feel[data-col="feel"] .card-preview');
  }

  function goalPreview(col) {
    return document.getElementById("previewThree" + col);
  }

  function syncGoalPreview(col) {
    var field = document.getElementById("three" + col);
    var prev = goalPreview(col);
    if (!field || !prev) return;
    var text = field.value.trim();
    prev.textContent = text;
    prev.classList.toggle("is-empty", !text);
  }

  function syncAllGoalPreviews() {
    [1, 2, 3].forEach(syncGoalPreview);
  }

  function openDialog(kind, col) {
    ensureDialog();
    activeKind = kind;
    activeCol = col || null;
    var val = "";
    if (kind === "feel") {
      var feelField = document.getElementById("dailyFeeling");
      val = feelField ? feelField.value : "";
      if (titleEl) titleEl.textContent = "感受";
      if (ta) ta.placeholder = "今日最重要的一种感受…";
    } else if (kind === "goal" && col) {
      var goalField = document.getElementById("three" + col);
      val = goalField ? goalField.value : "";
      var meta = GOAL_META[col] || GOAL_META[1];
      if (titleEl) titleEl.textContent = meta.title;
      if (ta) ta.placeholder = meta.placeholder;
    }
    if (ta) ta.value = val;
    if (typeof dlg.showModal === "function") dlg.showModal();
    else dlg.setAttribute("open", "");
    requestAnimationFrame(function () {
      ta?.focus();
      ta?.setSelectionRange(ta.value.length, ta.value.length);
    });
  }

  function closeDialog() {
    activeKind = null;
    activeCol = null;
    if (!dlg) return;
    if (typeof dlg.close === "function") dlg.close();
    else dlg.removeAttribute("open");
  }

  function confirmWrite() {
    if (!ta) {
      closeDialog();
      return;
    }
    var text = ta.value.trim();
    if (activeKind === "feel") {
      var field = document.getElementById("dailyFeeling");
      if (field) {
        field.value = text;
        var prev = feelPreview();
        if (prev) {
          prev.textContent = text;
          prev.classList.toggle("is-empty", !text);
        }
        field.dispatchEvent(new Event("input", { bubbles: true }));
      }
      if (typeof saveNotebookThree === "function") saveNotebookThree();
    } else if (activeKind === "goal" && activeCol) {
      var goalField = document.getElementById("three" + activeCol);
      if (goalField) {
        goalField.value = text;
        goalField.dispatchEvent(new Event("input", { bubbles: true }));
      }
      syncGoalPreview(activeCol);
      if (typeof saveNotebookThree === "function") saveNotebookThree();
    }
    closeDialog();
  }

  function openFeelDialog() {
    openDialog("feel");
  }

  function bindFeelCard() {
    var feel = document.querySelector('.write-feel[data-col="feel"]');
    if (!feel || feel.dataset.dialogBound) return;
    feel.dataset.dialogBound = "1";
    feel.addEventListener("click", function (ev) {
      if (ev.target.closest("textarea, button, input")) return;
      openFeelDialog();
    });
  }

  function bindGoalCards() {
    [1, 2, 3].forEach(function (col) {
      var item = document.querySelector('.store-item--goal[data-col="' + col + '"]');
      if (!item || item.dataset.dialogBound) return;
      item.dataset.dialogBound = "1";
      item.addEventListener("click", function (ev) {
        if (ev.target.closest(".voice-btn, button, a, input, textarea")) return;
        openDialog("goal", col);
      });
      var prev = goalPreview(col);
      if (prev) {
        prev.addEventListener("click", function (ev) {
          ev.stopPropagation();
          openDialog("goal", col);
        });
      }
    });
  }

  function syncFeelPreview() {
    var feelField = document.getElementById("dailyFeeling");
    var feelPrev = feelPreview();
    if (feelPrev && feelField) {
      feelPrev.textContent = feelField.value || "";
      feelPrev.classList.toggle("is-empty", !feelField.value.trim());
    }
  }

  function init() {
    ensureDialog();
    bindFeelCard();
    bindGoalCards();
    syncFeelPreview();
    syncAllGoalPreviews();
  }

  window.LixingWriteDialog = {
    init: init,
    syncPreviews: function () {
      syncFeelPreview();
      syncAllGoalPreviews();
    },
    openGoalDialog: function (col) {
      openDialog("goal", col);
    },
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

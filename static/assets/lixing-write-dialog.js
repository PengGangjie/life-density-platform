/**
 * 砺行 · 日省 — 感受卡片弹窗书写（小目标直接在卡片内输入）
 */
(function () {
  "use strict";

  var dlg;
  var ta;
  var titleEl;

  function ensureDialog() {
    if (dlg) return;
    dlg = document.createElement("dialog");
    dlg.className = "write-dialog";
    dlg.id = "writeDialog";
    dlg.innerHTML =
      '<form method="dialog" class="write-dialog-form">' +
      '<header class="write-dialog-head">' +
      '<p class="write-dialog-title" id="writeDialogTitle">感受</p>' +
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

  function openFeelDialog() {
    ensureDialog();
    var field = document.getElementById("dailyFeeling");
    var val = field ? field.value : "";
    if (titleEl) titleEl.textContent = "感受";
    if (ta) {
      ta.value = val;
      ta.placeholder = "今日最重要的一种感受…";
    }
    if (typeof dlg.showModal === "function") dlg.showModal();
    else dlg.setAttribute("open", "");
    requestAnimationFrame(function () {
      ta?.focus();
      ta?.setSelectionRange(ta.value.length, ta.value.length);
    });
  }

  function closeDialog() {
    if (!dlg) return;
    if (typeof dlg.close === "function") dlg.close();
    else dlg.removeAttribute("open");
  }

  function confirmWrite() {
    var field = document.getElementById("dailyFeeling");
    if (!field || !ta) {
      closeDialog();
      return;
    }
    field.value = ta.value.trim();
    var prev = feelPreview();
    if (prev) {
      prev.textContent = field.value || "";
      prev.classList.toggle("is-empty", !field.value.trim());
    }
    field.dispatchEvent(new Event("input", { bubbles: true }));
    closeDialog();
    if (typeof saveNotebookThree === "function") saveNotebookThree();
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
    syncFeelPreview();
  }

  window.LixingWriteDialog = {
    init: init,
    syncPreviews: syncFeelPreview,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

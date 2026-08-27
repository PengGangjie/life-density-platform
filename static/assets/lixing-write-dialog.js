/**
 * 砺行 · 日省 — 感受弹窗书写（可选）；记录页直接输入，不用弹窗
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
    field.dispatchEvent(new Event("input", { bubbles: true }));
    closeDialog();
    if (typeof saveNotebookThree === "function") saveNotebookThree();
  }

  function init() {
    ensureDialog();
  }

  window.LixingWriteDialog = {
    init: init,
    syncPreviews: function () {},
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

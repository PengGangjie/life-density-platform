(function () {
  "use strict";

  function qs(id) {
    return document.getElementById(id);
  }

  function isLocalDev() {
    var h = location.hostname;
    return location.protocol === "file:" || h === "127.0.0.1" || h === "localhost";
  }

  function isWorkspacePage() {
    return (
      /workspace\.html$/i.test(location.pathname) ||
      document.body.classList.contains("workspace-only")
    );
  }

  function me() {
    return window.__lixingMe || {};
  }

  function canWrite() {
    if (isLocalDev()) return true;
    var m = me();
    if (!m.auth_configured || !m.auth_required) return true;
    if (m.authenticated) return true;
    if (isWorkspacePage()) return false;
    return true;
  }

  function isGuestReadonly() {
    return isWorkspacePage() && !canWrite();
  }

  function notifyGuestBlocked() {
    var hint = qs("guestReadonlyHint");
    if (hint) {
      hint.classList.add("is-flash");
      setTimeout(function () {
        hint.classList.remove("is-flash");
      }, 2400);
    }
    var toast = qs("guestBlockedToast");
    if (toast) {
      toast.classList.add("show");
      setTimeout(function () {
        toast.classList.remove("show");
      }, 2200);
    }
  }

  function applyGuestReadonlyUi() {
    if (!isGuestReadonly()) return;
    document.body.classList.add("guest-readonly");
    var hint = qs("guestReadonlyHint");
    if (hint) hint.hidden = false;
  }

  function setAuthUi(authMe) {
    var login = qs("navLogin");
    var user = qs("navUser");
    var logout = qs("navLogout");
    var toolLink = qs("navToolLink");
    if (authMe && authMe.authenticated) {
      document.body.classList.remove("auth-pending", "guest-readonly");
      document.body.classList.add("auth-ready");
      if (login) login.hidden = true;
      if (logout) logout.hidden = false;
      if (toolLink) toolLink.hidden = false;
      if (user) {
        var label = authMe.name || authMe.email || authMe.phone || "已登录";
        user.hidden = false;
        user.textContent = label;
        user.title = label;
      }
      var hint = qs("guestReadonlyHint");
      if (hint) hint.hidden = true;
      return;
    }
    document.body.classList.add("auth-pending");
    document.body.classList.remove("auth-ready");
    if (login) login.hidden = false;
    if (logout) logout.hidden = true;
    if (toolLink) toolLink.hidden = false;
    if (user) user.hidden = true;
    applyGuestReadonlyUi();
  }

  function bindWorkspaceGate() {
    document.querySelectorAll("[data-need-auth]").forEach(function (el) {
      el.addEventListener("click", function (ev) {
        if (document.body.classList.contains("auth-ready")) return;
        ev.preventDefault();
        var to = el.getAttribute("href") || "/workspace.html";
        location.href = "/sign-in?return_to=" + encodeURIComponent(to);
      });
    });
  }

  function init() {
    bindWorkspaceGate();
    window.LixingAuth = {
      canWrite: canWrite,
      isGuestReadonly: isGuestReadonly,
      notifyGuestBlocked: notifyGuestBlocked,
    };
    if (isLocalDev()) {
      window.__lixingMe = { authenticated: true, auth_configured: false, auth_required: false };
      setAuthUi({ authenticated: true });
      return;
    }
    fetch("/api/me", { credentials: "same-origin", headers: { Accept: "application/json" } })
      .then(function (r) {
        return r.json();
      })
      .then(function (authMe) {
        window.__lixingMe = authMe;
        if (!authMe.auth_configured || !authMe.auth_required) {
          setAuthUi({ authenticated: true });
          return;
        }
        setAuthUi(authMe);
      })
      .catch(function () {
        window.__lixingMe = { authenticated: false, auth_configured: true, auth_required: true };
        setAuthUi({ authenticated: false });
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

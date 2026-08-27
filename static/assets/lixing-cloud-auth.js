(function () {
  "use strict";

  function qs(id) {
    return document.getElementById(id);
  }

  function isLocalDev() {
    var h = location.hostname;
    return location.protocol === "file:" || h === "127.0.0.1" || h === "localhost";
  }

  function setAuthUi(me) {
    var login = qs("navLogin");
    var user = qs("navUser");
    var logout = qs("navLogout");
    var toolLink = qs("navToolLink");
    if (me && me.authenticated) {
      document.body.classList.remove("auth-pending");
      document.body.classList.add("auth-ready");
      if (login) login.hidden = true;
      if (logout) logout.hidden = false;
      if (toolLink) toolLink.hidden = false;
      if (user) {
        var label = me.name || me.email || me.phone || "已登录";
        user.hidden = false;
        user.textContent = label;
        user.title = label;
      }
      return;
    }
    document.body.classList.add("auth-pending");
    document.body.classList.remove("auth-ready");
    if (login) login.hidden = false;
    if (logout) logout.hidden = true;
    if (toolLink) toolLink.hidden = true;
    if (user) user.hidden = true;
  }

  function bindWorkspaceGate() {
    document.querySelectorAll("[data-need-auth]").forEach(function (el) {
      el.addEventListener("click", function (ev) {
        if (document.body.classList.contains("auth-ready")) return;
        ev.preventDefault();
        var to = el.getAttribute("href") || "/#workspace";
        location.href = "/sign-in?return_to=" + encodeURIComponent(to);
      });
    });
  }

  function init() {
    bindWorkspaceGate();
    if (isLocalDev()) {
      setAuthUi({ authenticated: true });
      return;
    }
    fetch("/api/me", { credentials: "same-origin", headers: { Accept: "application/json" } })
      .then(function (r) {
        return r.json();
      })
      .then(function (me) {
        window.__lixingMe = me;
        if (!me.auth_configured || !me.auth_required) {
          setAuthUi({ authenticated: true });
          return;
        }
        setAuthUi(me);
      })
      .catch(function () {
        setAuthUi({ authenticated: false });
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

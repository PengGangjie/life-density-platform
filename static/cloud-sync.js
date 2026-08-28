/* 人生量化 · 登录态 + 云同步 + PWA 安装 + 工具台门禁 */
(function () {
  const CLOUD_DEBOUNCE_MS = 800;
  let _me = { authenticated: false, auth_configured: false };
  let _cloudTimer = null;
  let _deferredPrompt = null;
  let _hydrating = false;

  function $(id) { return document.getElementById(id); }

  function setSyncHint(text) {
    const el = $("cloudSyncHint");
    if (el) el.textContent = text || "";
  }

  function canUseWorkspace() {
    if (location.protocol === "file:") return true;
    if (_me.authenticated) return true;
    // 未配置 Logto（本地部署）时允许直接用工具台
    return _me.auth_configured === false;
  }

  async function fetchMe() {
    try {
      const res = await fetch("/api/me", { credentials: "same-origin" });
      _me = await res.json();
    } catch {
      _me = { authenticated: false, auth_configured: false };
    }
    paintAuth();
    return _me;
  }

  function paintAuth() {
    const login = $("navLogin");
    const logout = $("navLogout");
    const user = $("navUser");
    const ok = canUseWorkspace();

    document.body.classList.remove("auth-pending");
    document.body.classList.toggle("is-authed", ok);
    document.body.classList.toggle("is-guest", !ok);

    const guest = $("guestGate");
    if (guest) guest.hidden = ok;

    if (_me.authenticated) {
      if (login) login.hidden = true;
      if (logout) logout.hidden = false;
      if (user) {
        user.hidden = false;
        user.textContent = _me.email || _me.phone || _me.name || "已登录";
      }
      setSyncHint("已登录 · 保存会同步到云端");
    } else {
      if (login) login.hidden = false;
      if (logout) logout.hidden = true;
      if (user) {
        user.hidden = true;
        user.textContent = "";
      }
      if (!ok) {
        setSyncHint("登录后可使用工具台，并跨设备同步");
      } else if (_me.auth_configured === false) {
        setSyncHint("云登录未配置 · 数据仅本机");
      } else {
        setSyncHint("未登录 · 数据仅本机，登录后可跨设备");
      }
    }
  }

  function requireLogin(event) {
    if (canUseWorkspace()) return false;
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    location.href = "/sign-in";
    return true;
  }

  function setupAuthGuards() {
    document.addEventListener("click", (event) => {
      if (canUseWorkspace()) return;
      const t = event.target.closest("[data-panel], a[href='#workspace'], a[href='#paths'], .path-card");
      if (!t) return;
      requireLogin(event);
    }, true);
  }

  async function hydrateFromCloud() {
    if (!_me.authenticated) return;
    if (typeof loadState !== "function" || typeof saveState !== "function") return;
    _hydrating = true;
    try {
      const res = await fetch("/api/state", { credentials: "same-origin" });
      if (res.status === 401) return;
      if (!res.ok) return;
      const payload = await res.json();
      const local = loadState();
      const cloud = payload && payload.data ? payload.data : null;
      const localHas = typeof stateHasData === "function" && stateHasData(local);
      const cloudHas = cloud && typeof stateHasData === "function" && stateHasData(cloud);
      if (cloudHas && !localHas) {
        saveState(cloud, { disk: false, cloud: false });
        location.reload();
        return;
      }
      if (!cloudHas && localHas) {
        await pushCloud(local);
        return;
      }
      if (cloudHas && localHas) {
        const localAt = (local.settings && local.settings.updatedAt) || "";
        const cloudAt = payload.updated_at || "";
        if (cloudAt && (!localAt || cloudAt >= localAt)) {
          saveState(cloud, { disk: false, cloud: false });
          location.reload();
        } else {
          await pushCloud(local);
        }
      }
    } catch (e) {
      console.warn("云同步读取失败", e);
    } finally {
      _hydrating = false;
    }
  }

  async function pushCloud(state) {
    if (!_me.authenticated || _hydrating) return;
    try {
      const body = { data: typeof normalizeState === "function" ? normalizeState(state) : state };
      const res = await fetch("/api/state", {
        method: "PUT",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json;charset=utf-8" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const j = await res.json();
        setSyncHint("已同步 " + (j.updated_at || "").replace("T", " ").slice(0, 19));
      } else {
        setSyncHint("云同步失败 " + res.status);
      }
    } catch (e) {
      console.warn("云同步写入失败", e);
      setSyncHint("云同步失败（网络）");
    }
  }

  function scheduleCloudPush(state) {
    if (!_me.authenticated || _hydrating) return;
    clearTimeout(_cloudTimer);
    _cloudTimer = setTimeout(() => pushCloud(state), CLOUD_DEBOUNCE_MS);
  }

  function wrapSaveState() {
    if (typeof saveState !== "function") return;
    const orig = saveState;
    window.saveState = function (state, opts) {
      const next = typeof normalizeState === "function" ? normalizeState(state) : state;
      if (!next.settings) next.settings = {};
      next.settings.updatedAt = new Date().toISOString();
      orig(next, opts);
      if (!opts || opts.cloud !== false) scheduleCloudPush(next);
    };
  }

  function setupInstall() {
    const btn = $("navInstall");
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      _deferredPrompt = e;
      if (btn) btn.hidden = false;
    });
    if (btn) {
      btn.addEventListener("click", async () => {
        if (!_deferredPrompt) return;
        _deferredPrompt.prompt();
        await _deferredPrompt.userChoice;
        _deferredPrompt = null;
        btn.hidden = true;
      });
    }
    if (window.matchMedia("(display-mode: standalone)").matches && btn) {
      btn.hidden = true;
    }
  }

  function registerSw() {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js?v=20260825b").catch(() => {});
  }

  if (!document.body.classList.contains("is-authed") && !document.body.classList.contains("is-guest")) {
    document.body.classList.add("auth-pending");
  }

  setupAuthGuards();
  wrapSaveState();
  setupInstall();
  registerSw();
  fetchMe().then(hydrateFromCloud);
})();

/* 砺行 · 日省 — 登录后云同步（合并本地与 Turso，不单靠 updatedAt 覆盖） */
(function () {
  "use strict";

  var CLOUD_DEBOUNCE_MS = 800;
  var _hydrating = false;
  var _cloudTimer = null;
  var _wrapped = false;

  function isLocalDev() {
    var h = location.hostname;
    return location.protocol === "file:" || h === "127.0.0.1" || h === "localhost";
  }

  function me() {
    return window.__lixingMe || {};
  }

  function canSync() {
    if (isLocalDev()) return false;
    var m = me();
    return !!(m.authenticated && m.auth_configured !== false);
  }

  function setSyncHint(text) {
    var el = document.getElementById("cloudSyncHint");
    if (!el) return;
    if (text) {
      el.hidden = false;
      el.textContent = text;
    } else if (!canSync()) {
      el.hidden = true;
      el.textContent = "";
    }
  }

  function mergeEntries(cloudEntries, localEntries) {
    var merged = Object.assign({}, cloudEntries || {});
    Object.keys(localEntries || {}).forEach(function (day) {
      merged[day] = Object.assign({}, merged[day] || {}, localEntries[day] || {});
    });
    return merged;
  }

  function wheelHasScores(wheel) {
    var scores = wheel && wheel.scores ? wheel.scores : {};
    return Object.keys(scores).some(function (k) {
      return Number(scores[k]) > 0;
    });
  }

  function mergeState(cloud, local) {
    if (typeof stateHasData !== "function" || typeof normalizeState !== "function") {
      return local || cloud;
    }
    if (!cloud || !stateHasData(cloud)) return normalizeState(local);
    if (!local || !stateHasData(local)) return normalizeState(cloud);
    var out = Object.assign({}, normalizeState(cloud));
    var localNorm = normalizeState(local);
    out.entries = mergeEntries(out.entries, localNorm.entries);
    [
      "opinions", "kedaibiaoOpinions", "industries", "rationals", "samplings", "reflections",
      "penetrations", "dualCards", "wheelSnaps", "kpiSnaps",
    ].forEach(function (key) {
      if ((!out[key] || !out[key].length) && localNorm[key] && localNorm[key].length) {
        out[key] = localNorm[key];
      }
    });
    ["biasSpots", "leonMarks", "indSteps", "settings", "lifeWishes"].forEach(function (key) {
      if ((!out[key] || !Object.keys(out[key]).length) && localNorm[key] && Object.keys(localNorm[key]).length) {
        out[key] = localNorm[key];
      }
    });
    if (!wheelHasScores(out.wheel) && wheelHasScores(localNorm.wheel)) out.wheel = localNorm.wheel;
    if ((!out.kpi || !Object.keys(out.kpi.scores || {}).length) && localNorm.kpi) out.kpi = localNorm.kpi;
    out.settings = Object.assign({}, out.settings || {}, localNorm.settings || {});
    return out;
  }

  async function pushCloud(state) {
    if (!canSync() || _hydrating) return;
    try {
      var body = { data: typeof normalizeState === "function" ? normalizeState(state) : state };
      var res = await fetch("/api/state", {
        method: "PUT",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json;charset=utf-8" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        var j = await res.json();
        setSyncHint("已同步云端 · " + String(j.updated_at || "").replace("T", " ").slice(0, 19));
      } else {
        setSyncHint("云同步失败 " + res.status);
      }
    } catch (e) {
      console.warn("云同步写入失败", e);
      setSyncHint("云同步失败（网络）");
    }
  }

  function scheduleCloudPush(state) {
    if (!canSync() || _hydrating) return;
    clearTimeout(_cloudTimer);
    _cloudTimer = setTimeout(function () { pushCloud(state); }, CLOUD_DEBOUNCE_MS);
  }

  function wrapSaveState() {
    if (_wrapped || typeof saveState !== "function") return;
    var orig = saveState;
    window.saveState = function (state, opts) {
      var next = typeof normalizeState === "function" ? normalizeState(state) : state;
      if (!next.settings) next.settings = {};
      next.settings.updatedAt = new Date().toISOString();
      orig(next, opts);
      if (!opts || opts.cloud !== false) scheduleCloudPush(next);
    };
    _wrapped = true;
  }

  function rerenderAll() {
    if (typeof renderDensity === "function") renderDensity();
    if (typeof loadTodayForm === "function") loadTodayForm();
    if (typeof renderLeonPanel === "function") renderLeonPanel();
    if (typeof renderKpiPanel === "function") renderKpiPanel();
    if (window.LixingV1) {
      if (window.LixingV1.renderKeywords) window.LixingV1.renderKeywords();
      if (window.LixingV1.renderWishesPanel) window.LixingV1.renderWishesPanel();
    }
  }

  async function hydrateFromCloud() {
    if (!canSync()) return;
    if (typeof loadState !== "function" || typeof saveState !== "function") return;
    _hydrating = true;
    setSyncHint("正在拉取云端…");
    try {
      var res = await fetch("/api/state", { credentials: "same-origin" });
      if (res.status === 401 || !res.ok) return;
      var payload = await res.json();
      var cloud = payload && payload.data ? payload.data : null;
      var local = loadState();
      var cloudHas = cloud && typeof stateHasData === "function" && stateHasData(cloud);
      var localHas = typeof stateHasData === "function" && stateHasData(local);
      if (!cloudHas && localHas) {
        await pushCloud(local);
        return;
      }
      if (!cloudHas) return;
      var merged = localHas ? mergeState(cloud, local) : mergeState(null, cloud);
      saveState(merged, { disk: true, cloud: false });
      await pushCloud(merged);
      rerenderAll();
      setSyncHint("已与云端对齐 · " + Object.keys(merged.entries || {}).length + " 天记录");
    } catch (e) {
      console.warn("云同步读取失败", e);
      setSyncHint("");
    } finally {
      _hydrating = false;
    }
  }

  function waitForMe(maxMs) {
    return new Promise(function (resolve) {
      var left = maxMs;
      (function tick() {
        if (window.__lixingMe || left <= 0) return resolve(window.__lixingMe || {});
        left -= 50;
        setTimeout(tick, 50);
      })();
    });
  }

  async function init() {
    if (isLocalDev()) return;
    wrapSaveState();
    await waitForMe(3000);
    await hydrateFromCloud();
  }

  window.LixingCloudSync = { init: init, mergeState: mergeState };

  function tryBoot() {
    if (typeof loadState !== "function" || typeof saveState !== "function") {
      setTimeout(tryBoot, 50);
      return;
    }
    init();
  }
  tryBoot();
})();

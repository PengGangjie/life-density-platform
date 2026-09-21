/* 砺行权益层 — 订阅就绪
 * 移植 Supastack 的 entitlements 模式（packages 下 entitlements 模块 + apps/mobile/src/entitlements）：
 * 功能清单（免费/Pro）+ provider 抽象 + DOM 门控（data-need-pro）。
 * 默认休眠：GATED_FEATURES 为空 → 一切可用，行为与引入前完全一致；
 * 在 LixingConfig 里把功能加入 GATED_FEATURES 才真正开始拦截。
 * 许可数据经 lixing-license-store 加密落盘，激活态跨启动保持。
 */
(function () {
  "use strict";

  var cfg = window.LixingConfig || {
    PRO_FEATURES: [], GATED_FEATURES: [], BILLING_PROVIDER: "local", FEATURES: { billing: true }
  };

  var store = window.__lixingLicense;
  var state = { plan: "free", license: null, ready: false };

  function gatedList() {
    return (cfg.GATED_FEATURES || []).slice();
  }

  function isProFeature(feature) {
    return (cfg.PRO_FEATURES || []).indexOf(feature) !== -1;
  }

  /* 未知功能一律放行（fail-open）：新增功能忘了登记清单时，宁可免费也不误锁 */
  function can(feature) {
    if (!feature) return true;
    if (!isProFeature(feature)) return true;
    if (gatedList().indexOf(feature) === -1) return true;
    return state.plan === "pro" && !!(state.license && state.license.plan !== "free");
  }

  function status() {
    return {
      provider: cfg.BILLING_PROVIDER,
      plan: state.plan,
      license: state.license,
      proFeatures: (cfg.PRO_FEATURES || []).slice(),
      gated: gatedList(),
      ready: state.ready,
      can: can
    };
  }

  /* 本地激活：格式 LIXING-PRO（永久）或 LIXING-PRO-YYYYMMDD（到期日）。
     真正的订阅校验未来由后端签名 license 承接（provider=revenuecat/stripe 时走 API），此处先落本地形态。 */
  function parseKey(raw) {
    var s = String(raw || "").trim().toUpperCase();
    if (s === "LIXING-PRO") return { plan: "pro", expiresAt: null, source: "local-key" };
    var m = s.match(/^LIXING-PRO-(\d{8})$/);
    if (m) {
      var y = +m[1].slice(0, 4), mo = +m[1].slice(4, 6), d = +m[1].slice(6, 8);
      var expires = new Date(y, mo - 1, d + 1); /* 到期日当天仍有效，次日零点失效 */
      if (expires.getTime() > Date.now()) return { plan: "pro", expiresAt: m[1], source: "local-key" };
      return null;
    }
    return null;
  }

  function activate(rawKey) {
    return Promise.resolve().then(function () {
      var parsed = parseKey(rawKey);
      if (!parsed) return { ok: false, error: "激活码格式不正确" };
      return store.save(parsed).then(function () {
        state.license = parsed;
        state.plan = parsed.plan;
        applyDomGates();
        return { ok: true };
      });
    });
  }

  function deactivate() {
    return store.clear().then(function () {
      state.license = null;
      state.plan = "free";
      applyDomGates();
      return { ok: true };
    });
  }

  function refresh() {
    return store.load().then(function (lic) {
      if (lic && lic.plan === "pro") {
        if (lic.expiresAt) {
          var m = lic.expiresAt.match(/^(\d{4})(\d{2})(\d{2})$/);
          var valid = m && new Date(+m[1], +m[2] - 1, +m[3] + 1).getTime() > Date.now();
          if (!valid) { state.license = null; state.plan = "free"; state.ready = true; applyDomGates(); return; }
        }
        state.license = lic;
        state.plan = "pro";
      } else {
        state.license = null;
        state.plan = "free";
      }
      state.ready = true;
      applyDomGates();
    });
  }

  /* DOM 门控：与 lixing-cloud-auth 的 bindWorkspaceGate 同构，锁 [data-need-pro] */
  function applyDomGates() {
    document.querySelectorAll("[data-need-pro]").forEach(function (el) {
      var feature = el.getAttribute("data-need-pro");
      var locked = !can(feature);
      el.classList.toggle("pro-locked", locked);
      el.setAttribute("aria-disabled", locked ? "true" : "false");
    });
  }

  function bindDomGates() {
    document.querySelectorAll("[data-need-pro]").forEach(function (el) {
      el.addEventListener("click", function (ev) {
        var feature = el.getAttribute("data-need-pro");
        if (can(feature)) return;
        ev.preventDefault();
        ev.stopPropagation();
        if (window.LixingPaywall) window.LixingPaywall.open(feature);
      });
    });
  }

  function init() {
    bindDomGates();
    refresh();
    /* license 为异步解密，DOM 先按 free 渲染再校正；fail-open 已由 can() 的门控名单空默认兜底 */
  }

  window.LixingEntitlements = {
    can: can, status: status, activate: activate, deactivate: deactivate, refresh: refresh,
    _parseKey: parseKey, _setState: function (s) { Object.assign(state, s); applyDomGates(); }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

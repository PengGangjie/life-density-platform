/* 砺行配置层 — 单一真相源
 * 对应 Supastack packages/config 的角色：API 地址、功能开关、计费 provider
 * 集中在一处，未来切云端后端 / 开启订阅门控时只改这里，不改业务代码。
 * 优先级：内置默认 → 页面预定义 window.LIXING_CONFIG → localStorage 覆盖（life-density-config-override）。
 * 覆盖键走 life-density* 前缀，原生壳内由 cap-storage 自动镜像持久化。
 */
(function () {
  "use strict";

  var defaults = {
    /* API 基址："" = 同源（当前 web 部署的行为，fetch("/api/…") 不变）。
     * Capacitor 壳未来接云端时设为 "https://api.example.com" 即可。 */
    API_BASE: "",
    /* 功能开关：关掉任一项，对应模块整体退回本地模式 */
    FEATURES: { cloudAuth: true, cloudSync: true, billing: true },
    /* 计费 provider：local（现阶段，不启用任何门控展示价格）| revenuecat（移动 IAP）| stripe（web 订阅） */
    BILLING_PROVIDER: "local",
    /* Pro 功能清单（未来付费点，供 paywall 与 entitlements 展示/判断）
     * 0920 v2：+决策法宝（骰子等） +八字五行定制决策币卡面；lifecoach 为增值服务不入此清单 */
    PRO_FEATURES: ["cloud-sync", "ai-insights", "export-pdf", "decision-artifacts", "bazi-coin-skin"],
    /* 实际启用门控的功能：默认空 = 全部免费，行为与引入本层之前完全一致 */
    GATED_FEATURES: [],
    /* 增值服务（教练入驻/定制咨询）是否在升级页展示：默认不展示（后话），机制保留 */
    SHOW_ADDON_SERVICES: false,
    /* 升级页激活码输入框：内测期 true（发放 LIXING-PRO 等）；
     * 提审上架前必须置 false —— 自造兑换码属 3.1.1 红线（详见更新日志 006/012）。
     * Phase 4 收费后改用 ASC 官方 Promo Code / StoreKit，本地激活码退役。 */
    PAYWALL_ACTIVATION_INPUT: true
  };

  function merge(base, extra) {
    var out = Object.assign({}, base);
    Object.keys(extra || {}).forEach(function (k) {
      var v = extra[k];
      if (v && typeof v === "object" && !Array.isArray(v) && typeof base[k] === "object" && !Array.isArray(base[k])) {
        out[k] = merge(base[k], v);
      } else if (v !== undefined) {
        out[k] = v;
      }
    });
    return out;
  }

  function readOverride() {
    try {
      var raw = window.localStorage.getItem("life-density-config-override");
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  var cfg = merge(defaults, window.LIXING_CONFIG);
  var override = readOverride();
  if (override) cfg = merge(cfg, override);

  cfg.setOverride = function (patch) {
    var next = merge(readOverride() || {}, patch);
    try { window.localStorage.setItem("life-density-config-override", JSON.stringify(next)); } catch (e) { /* 存储满不致命 */ }
    return next;
  };
  cfg.clearOverride = function () {
    try { window.localStorage.removeItem("life-density-config-override"); } catch (e) { /* 同上 */ }
  };

  cfg.apiUrl = function (path) {
    return (cfg.API_BASE || "") + path;
  };

  window.LixingConfig = cfg;
})();

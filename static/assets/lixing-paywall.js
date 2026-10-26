/* 砺行升级页（paywall）— 订阅就绪 UI
 * 移植 Supastack apps/mobile/app/paywall.tsx 的角色：功能对比 + 激活入口，
 * 视觉沿用砺行暖纸 + 朱砂（--paper/--accent-warm 设计变量同源）。
 * 现阶段 BILLING_PROVIDER=local：不展示价格（上线时公布），提供激活码入口
 * 供未来内测发放；provider 切换后此处改为拉取订阅商品。
 */
(function () {
  "use strict";

  function t(key) { return window.LixingI18n ? window.LixingI18n.t(key) : key; }
  function lang() { return window.LixingI18n ? window.LixingI18n.lang() : "zh"; }

  var FEATURE_IDS = ["cloud-sync", "ai-insights", "export-pdf", "decision-artifacts", "bazi-coin-skin"];
  /* 增值服务 id 列表（Pro 之外单独议价，不入 PRO_FEATURES 门控清单） */
  var ADDON_IDS = ["lifecoach"];

  function featureLabel(f) {
    var meta = { name: t("pw.f." + f), desc: t("pw.f." + f + ".d") };
    if (meta.name === "pw.f." + f) meta = { name: f, desc: "" };
    return meta;
  }

  var modal = null;

  function cfg() { return window.LixingConfig || { PRO_FEATURES: [], BILLING_PROVIDER: "local" }; }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function featureRows(highlight) {
    var list = (cfg().PRO_FEATURES && cfg().PRO_FEATURES.length) ? cfg().PRO_FEATURES : FEATURE_IDS;
    return list.map(function (f) {
      var meta = featureLabel(f);
      var isHi = highlight === f;
      return '<li class="lxpw-item' + (isHi ? " is-hi" : "") + '">'
        + '<span class="lxpw-badge">' + (isHi ? t("pw.badge.now") : "PRO") + "</span>"
        + '<div class="lxpw-txt"><b>' + esc(meta.name) + "</b>"
        + (meta.desc ? "<small>" + esc(meta.desc) + "</small>" : "")
        + "</div></li>";
    }).join("");
  }

  function statusLine() {
    var st = window.LixingEntitlements && window.LixingEntitlements.status();
    if (!st) return "";
    if (st.plan === "pro") {
      var until = st.license && st.license.expiresAt
        ? t("pw.state.until") + st.license.expiresAt.replace(/^(\d{4})(\d{2})(\d{2})$/, "$1-$2-$3")
        : t("pw.state.forever");
      return '<p class="lxpw-state is-pro">' + t("pw.state.pro") + esc(until) + '　<button type="button" class="lxpw-unlink" data-act="deactivate">' + t("pw.unlink") + "</button></p>";
    }
    return '<p class="lxpw-state">' + t("pw.state.free") + "</p>";
  }

  function addonRows() {
    return ADDON_IDS.map(function (id) {
      var name = t("pw.a." + id);
      var desc = t("pw.a." + id + ".d");
      return '<li class="lxpw-item">'
        + '<span class="lxpw-badge lxpw-badge--addon">' + t("pw.addon.badge") + "</span>"
        + '<div class="lxpw-txt"><b>' + esc(name === "pw.a." + id ? id : name) + "</b>"
        + (desc && desc !== "pw.a." + id + ".d" ? "<small>" + esc(desc) + "</small>" : "")
        + "</div></li>";
    }).join("");
  }

  function build() {
    var style = document.createElement("style");
    style.textContent = [
      ".lxpw-mask{position:fixed;inset:0;background:rgba(26,26,26,.42);z-index:9990;display:flex;align-items:center;justify-content:center;padding:18px;}",
      ".lxpw{background:var(--paper,#fcf9f2);color:var(--ink,#1a1a1a);width:min(420px,100%);max-height:86vh;overflow:auto;border:1px solid var(--line-soft,rgba(201,55,86,.28));box-shadow:0 18px 48px rgba(26,26,26,.22);padding:26px 26px 22px;position:relative;}",
      ".lxpw-hero{text-align:center;padding:0 0 16px;margin:0 0 4px;border-bottom:1px dashed var(--line-soft,rgba(201,55,86,.28));}",
      ".lxpw-hero h3{margin:0;font-family:var(--display,serif);font-size:19px;font-weight:normal;letter-spacing:.34em;color:var(--ink,#1a1a1a);}",
      ".lxpw .char-li{font-family:\"LiFix\",\"KaiTi\",\"STKaiti\",serif;}",
      ".lxpw-hero h3 em{color:var(--accent-warm,#c93756);font-style:normal;letter-spacing:.22em;}",
      ".lxpw-quote{margin:16px 0 0;font-family:var(--display,serif);font-size:21px;line-height:1.85;letter-spacing:.12em;color:var(--ink,#1a1a1a);}",
      ".lxpw-quote b{font-weight:normal;color:var(--accent-warm,#c93756);}",
      ".lxpw-quote-src{margin:6px 0 0;font-size:12px;color:var(--muted,#666);letter-spacing:.28em;}",
      ".lxpw-list{list-style:none;margin:0 0 14px;padding:0;border-top:1px dashed var(--line-soft,rgba(201,55,86,.28));}",
      ".lxpw-item{display:flex;gap:10px;align-items:flex-start;padding:10px 2px;border-bottom:1px dashed var(--line-soft,rgba(201,55,86,.28));}",
      ".lxpw-item.is-hi{background:var(--accent-soft,#fff8f5);margin:0 -8px;padding:10px 10px;border-bottom:1px dashed var(--line-soft,rgba(201,55,86,.28));}",
      ".lxpw-badge{flex:none;font-size:11px;color:var(--accent-warm,#c93756);border:1px solid currentColor;padding:1px 6px;margin-top:2px;}",
      ".lxpw-badge--addon{color:var(--good,#0f766e);}",
      ".lxpw-group{margin:14px 0 2px;font-size:11px;color:var(--muted,#666);letter-spacing:.4em;}",
      ".lxpw-list--addon{border-top:1px dashed rgba(15,118,110,.35);}",
      ".lxpw-txt b{display:block;font-weight:normal;}",
      ".lxpw-txt small{color:var(--muted,#666);}",
      ".lxpw-state{font-size:13px;color:var(--muted,#666);margin:0 0 12px;}",
      ".lxpw-state.is-pro{color:var(--good,#0f766e);}",
      ".lxpw-unlink{background:none;border:none;color:var(--muted,#666);text-decoration:underline;cursor:pointer;font-size:12px;padding:0;}",
      ".lxpw-act{display:flex;gap:8px;margin:0 0 6px;}",
      ".lxpw-act input{flex:1;border:1px solid var(--line-soft,rgba(201,55,86,.28));background:var(--paper-warm,#f9f4e8);padding:8px 10px;font-family:inherit;font-size:14px;}",
      ".lxpw-act button{flex:none;border:1px solid var(--line-deep,#a82845);background:var(--accent-warm,#c93756);color:#fff;padding:8px 16px;cursor:pointer;font-family:inherit;letter-spacing:.12em;}",
      ".lxpw-act button[disabled]{opacity:.55;cursor:default;}",
      ".lxpw-note{font-size:12px;color:var(--muted,#666);margin:0;}",
      ".lxpw-err{font-size:12px;color:var(--bad,#b91c1c);margin:4px 0 0;min-height:1em;}",
      ".lxpw-close{position:absolute;top:10px;right:12px;background:none;border:none;font-size:20px;line-height:1;color:var(--muted,#666);cursor:pointer;}"
    ].join("");

    var el = document.createElement("div");
    el.className = "lxpw-mask";
    el.hidden = true;
    /* 增值服务（教练入驻/定制咨询）为后话，默认不展示；SHOW_ADDON_SERVICES 置 true 启用 */
    var addonSection = cfg().SHOW_ADDON_SERVICES
      ? '<p class="lxpw-group">' + t("pw.addon.group") + "</p>"
        + '<ul class="lxpw-list lxpw-list--addon">' + addonRows() + "</ul>"
      : "";
    var titleParts = t("pw.title").split(" ");
    var titleHtml = titleParts.length > 1 && /^PRO$/i.test(titleParts[0])
      ? "<em>" + titleParts[0] + "</em> " + esc(titleParts.slice(1).join(" "))
      : esc(t("pw.title"));
    var quoteHtml = esc(t("pw.quote"))
      .replace(t("pw.quote.hl1"), "<b>" + t("pw.quote.hl1") + "</b>")
      .replace(t("pw.quote.hl2"), "<b>" + t("pw.quote.hl2") + "</b>");
    if (lang() !== "en") quoteHtml = quoteHtml.replace("，<b>", "，<br/><b>"); /* 中文两行排，英文一行 */
    el.innerHTML = '<div class="lxpw" role="dialog" aria-label="' + esc(t("pw.title")) + '">'
      + '<button type="button" class="lxpw-close" data-act="close" aria-label="×">×</button>'
      + '<div class="lxpw-hero">'
      + "<h3>" + titleHtml + "</h3>"
      + '<p class="lxpw-quote">' + quoteHtml + "</p>"
      + '<p class="lxpw-quote-src">' + esc(t("pw.quote.src")) + "</p>"
      + "</div>"
      + '<p class="lxpw-group">' + esc(t("pw.group")) + "</p>"
      + '<ul class="lxpw-list">' + featureRows() + "</ul>"
      + addonSection
      + '<div data-slot="state">' + statusLine() + "</div>"
      + (cfg().PAYWALL_ACTIVATION_INPUT === false ? "" :
         '<form class="lxpw-act" data-slot="form">'
      + '<input data-slot="key" placeholder="' + esc(t("pw.key.ph")) + '" autocomplete="off" spellcheck="false" />'
      + '<button type="submit">' + esc(t("pw.cta")) + "</button></form>"
      + '<p class="lxpw-err" data-slot="err"></p>')
      + '<p class="lxpw-note">' + esc(t("pw.note")) + "</p>"
      + "</div>";

    document.head.appendChild(style);
    document.body.appendChild(el);
    return el;
  }

  function renderState() {
    if (!modal) return;
    modal.querySelector('[data-slot="state"]').innerHTML = statusLine();
  }

  function open(feature) {
    if (!modal) modal = build();
    var list = modal.querySelector(".lxpw-list");
    if (list) list.innerHTML = featureRows(feature);
    renderState();
    var errEl = modal.querySelector('[data-slot="err"]');
    if (errEl) errEl.textContent = "";
    modal.hidden = false;
    var input = modal.querySelector('[data-slot="key"]');
    if (input && window.LixingEntitlements && window.LixingEntitlements.status().plan !== "pro") input.focus();
  }

  function close() {
    if (modal) modal.hidden = true;
  }

  function onRootClick(ev) {
    var t = ev.target;
    var act = t.getAttribute && t.getAttribute("data-act");
    if (act === "close" || (t.classList && t.classList.contains("lxpw-mask") && t === modal)) { close(); return; }
    if (act === "deactivate" && window.LixingEntitlements) {
      window.LixingEntitlements.deactivate().then(renderState);
    }
  }

  function onSubmit(ev) {
    ev.preventDefault();
    if (!window.LixingEntitlements) return;
    var input = modal.querySelector('[data-slot="key"]');
    var btn = modal.querySelector('.lxpw-act button');
    var err = modal.querySelector('[data-slot="err"]');
    btn.disabled = true;
    window.LixingEntitlements.activate(input.value.trim()).then(function (r) {
      btn.disabled = false;
      if (r.ok) { input.value = ""; err.textContent = ""; renderState(); }
      else err.textContent = (r.error === "激活码格式不正确") ? t("pw.err.format") : (r.error || t("pw.err.format"));
    });
  }

  function init() {
    document.addEventListener("click", onRootClick);
    document.addEventListener("keydown", function (ev) { if (ev.key === "Escape") close(); });
    document.addEventListener("submit", function (ev) {
      if (modal && !modal.hidden && modal.contains(ev.target)) onSubmit(ev);
    });
    /* 入口：带 data-open-paywall 的元素（导航 Pro 链接等）；?paywall=1 直开（演示/验收用） */
    document.querySelectorAll("[data-open-paywall]").forEach(function (el) {
      el.addEventListener("click", function (ev) { ev.preventDefault(); open(el.getAttribute("data-open-paywall") || undefined); });
    });
    try {
      if (/[?&]paywall=1/.test(location.search)) open();
    } catch (e) { /* file:// 等环境无 search，忽略 */ }
  }

  window.LixingPaywall = { open: open, close: close };
  /* 语言切换后销毁已建弹窗，下次 open 按新语言重建 */
  if (window.LixingI18n && window.LixingI18n.onChange) {
    window.LixingI18n.onChange(function () {
      if (modal) { modal.remove(); modal = null; }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

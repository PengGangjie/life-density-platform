/* 砺行 Capacitor 存储适配层
 * Web 环境：不做任何事，localStorage 即真相源，行为与原先完全一致。
 * iOS 壳内：启动时把 Capacitor Preferences（UserDefaults）的数据回灌 localStorage，
 * 完成后才放行 DOMContentLoaded，保证应用初始化时数据已就位；
 * 之后所有 life-density* 写入自动镜像到 Preferences，
 * 规避 WKWebView 的 ITP 存储清理导致日记数据丢失。
 */
(function () {
  var PREFIX = "life-density";
  var native = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  var realAdd = Document.prototype.addEventListener;
  var fired = false;
  var pending = [];

  function Cap() { return window.Capacitor.Plugins.Preferences; }

  function holdDOMContentLoaded() {
    Document.prototype.addEventListener = function (type, fn, opts) {
      if (type === "DOMContentLoaded") {
        if (fired) { invoke(fn); return; }
        pending.push([fn, opts]);
        return;
      }
      return realAdd.apply(this, arguments);
    };
  }

  function invoke(fn) {
    try { fn.call(document, new Event("DOMContentLoaded")); } catch (e) { /* 单个监听器异常不阻断其余 */ }
  }

  function releaseDOMContentLoaded() {
    fired = true;
    var q = pending; pending = [];
    Document.prototype.addEventListener = function (type, fn, opts) {
      if (type === "DOMContentLoaded") { invoke(fn); return; }
      return realAdd.apply(this, arguments);
    };
    q.forEach(function (p) { invoke(p[0]); });
  }

  function mirrorWrites() {
    var ls = window.localStorage;
    var origSet = ls.setItem.bind(ls);
    var origRemove = ls.removeItem.bind(ls);
    ls.setItem = function (k, v) {
      origSet(k, v);
      if (String(k).indexOf(PREFIX) === 0) Cap().set({ key: k, value: String(v) }).catch(function () {});
    };
    ls.removeItem = function (k) {
      origRemove(k);
      if (String(k).indexOf(PREFIX) === 0) Cap().remove({ key: k }).catch(function () {});
    };
  }

  if (!native) {
    window.__capReady = Promise.resolve();
    return;
  }

  holdDOMContentLoaded();
  mirrorWrites();
  window.__capReady = Cap().getAll()
    .then(function (res) {
      var ls = window.localStorage;
      Object.keys(res || {}).forEach(function (k) {
        if (String(k).indexOf(PREFIX) === 0 && res[k] != null) {
          ls.setItem(k, res[k]);
        }
      });
    })
    .catch(function () { /* 回灌失败不阻断启动，退化为纯 localStorage */ })
    .then(releaseDOMContentLoaded);
})();

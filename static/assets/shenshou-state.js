/* 每日神兽的本地状态。键 life-density-shenshou-v1 与旧页面兼容。
 * 旧结构：{ "YYYY-MM-DD": { beast, lit } }
 * 顶层 __meta 可缺，缺了按没有处理。streak / 已逢 / 长明都现算，不另存。
 */
(function (root) {
  "use strict";

  var KEY = "life-density-shenshou-v1";

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function today() {
    var d = new Date();
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }

  function shiftKey(key, delta) {
    var p = key.split("-");
    var d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
    d.setDate(d.getDate() + delta);
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }

  function isDay(key) {
    return /^\d{4}-\d{2}-\d{2}$/.test(key);
  }

  function load() {
    try {
      var raw = root.localStorage.getItem(KEY);
      var st = raw ? JSON.parse(raw) : {};
      if (!st || typeof st !== "object" || Array.isArray(st)) return {};
      return st;
    } catch (e) {
      return {};
    }
  }

  function save(st) {
    try {
      if (!st.__meta) st.__meta = { createdAt: today(), version: 1 };
      root.localStorage.setItem(KEY, JSON.stringify(st));
    } catch (e) {
      console.warn("神兽状态未写入", e);
    }
  }

  function markVisit(beastName) {
    var st = load();
    var k = today();
    var prev = st[k];
    if (!prev || typeof prev !== "object") prev = { beast: beastName, lit: false };
    prev.beast = beastName;
    if (typeof prev.lit !== "boolean") prev.lit = false;
    st[k] = prev;
    save(st);
    return st;
  }

  function lightToday() {
    var st = load();
    var k = today();
    var rec = st[k];
    if (!rec || typeof rec !== "object") rec = { beast: "", lit: false };
    if (rec.lit) return false;
    rec.lit = true;
    st[k] = rec;
    save(st);
    return true;
  }

  function streak() {
    var st = load();
    var k = today();
    if (!(st[k] && st[k].lit)) k = shiftKey(k, -1);
    var n = 0;
    while (st[k] && st[k].lit) {
      n += 1;
      k = shiftKey(k, -1);
      if (n > 4000) break;
    }
    return n;
  }

  function names(pred) {
    var st = load();
    var set = {};
    Object.keys(st).forEach(function (k) {
      if (!isDay(k)) return;
      var rec = st[k];
      if (!rec || !rec.beast) return;
      if (pred && !pred(rec)) return;
      set[rec.beast] = true;
    });
    return set;
  }

  root.ShenState = {
    KEY: KEY,
    load: load,
    save: save,
    today: today,
    shiftKey: shiftKey,
    markVisit: markVisit,
    lightToday: lightToday,
    streak: streak,
    metSet: function () { return names(null); },
    litSet: function () { return names(function (rec) { return !!rec.lit; }); }
  };
})(typeof window !== "undefined" ? window : globalThis);

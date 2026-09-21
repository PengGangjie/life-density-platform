/* 砺行许可存储 — 加密适配层
 * 移植 Supastack packages/auth/src/expo.ts 的 SecureStore 模式：
 * 存储与加密均注入式（createLicenseStore({storage, crypto})），
 * 默认实现 AES-GCM（Web Crypto），密文落 localStorage；
 * 键走 life-density* 前缀，原生壳内由 cap-storage 自动镜像进 Preferences 持久化。
 * crypto.subtle 不可用（非安全上下文）时降级明文并带 "plain:" 前缀标记，
 * 保证任何环境可运行、且能识别出未加密数据。未来接 Keychain 插件时
 * 只需注入新的 crypto 适配器，业务层不动。
 */
(function () {
  "use strict";

  var KEY_DATA = "life-density-license";
  var KEY_SEED = "life-density-license-seed";

  function SubtleCryptoAdapter(subtle, persistSeed, readSeed) {
    /* subtle：实现 SubtleCrypto 接口的对象（浏览器 window.crypto.subtle 或 Node webcrypto） */
    var seedKey = null;

    function b64(buf) {
      return btoa(String.fromCharCode.apply(null, new Uint8Array(buf)));
    }
    function unb64(s) {
      var bin = atob(s), bytes = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return bytes;
    }

    function getKey() {
      if (seedKey) return seedKey;
      return seedKey = Promise.resolve().then(function () {
        var seed = readSeed();
        if (seed) return subtle.importKey("raw", unb64(seed), "AES-GCM", false, ["encrypt", "decrypt"]);
        return subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]).then(function (k) {
          /* extractable=true 仅为持久化种子；种子与密文同存，防的是明文裸奔而非本机攻击者 */
          return subtle.exportKey("raw", k).then(function (raw) {
            persistSeed(b64(raw));
            return subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
          });
        });
      });
    }

    function randomIv() {
      /* 加密路径仅在有 CSPRNG 的环境启用（见 defaultCrypto 的前置判断），这里必有 getRandomValues */
      var iv = new Uint8Array(12);
      window.crypto.getRandomValues(iv);
      return iv;
    }

    return {
      encrypt: function (plain) {
        var iv = randomIv();
        return getKey().then(function (k) {
          return subtle.encrypt({ name: "AES-GCM", iv: iv }, k, new TextEncoder().encode(plain));
        }).then(function (ct) {
          return "enc:v1:" + b64(iv) + ":" + b64(ct);
        });
      },
      decrypt: function (payload) {
        var parts = String(payload).split(":");
        if (parts.length !== 4 || parts[0] !== "enc" || parts[1] !== "v1") return Promise.reject(new Error("bad payload"));
        return getKey().then(function (k) {
          return subtle.decrypt({ name: "AES-GCM", iv: unb64(parts[2]) }, k, unb64(parts[3]));
        }).then(function (pt) {
          return new TextDecoder().decode(pt);
        });
      }
    };
  }

  function PlainAdapter() {
    return {
      encrypt: function (plain) { return Promise.resolve("plain:" + plain); },
      decrypt: function (payload) {
        var s = String(payload);
        if (s.indexOf("plain:") !== 0) return Promise.reject(new Error("bad payload"));
        return Promise.resolve(s.slice(6));
      }
    };
  }

  function defaultCrypto(storage) {
    /* 加密仅在安全上下文（subtle + CSPRNG 齐备）启用；否则明文降级并带标记，
       不用弱随机凑数（Mimosa：加密用途禁 Math.random） */
    var c = window.crypto;
    if (c && c.subtle && c.getRandomValues) {
      return SubtleCryptoAdapter(
        c.subtle,
        function (seed) { storage.setItem(KEY_SEED, seed); },
        function () { return storage.getItem(KEY_SEED); }
      );
    }
    return PlainAdapter();
  }

  function createLicenseStore(opts) {
    opts = opts || {};
    var storage = opts.storage || window.localStorage;
    var cryptoAdapter = opts.crypto || defaultCrypto(storage);

    return {
      save: function (data) {
        var plain = JSON.stringify({ v: 1, savedAt: new Date().toISOString(), data: data });
        return cryptoAdapter.encrypt(plain).then(function (payload) {
          storage.setItem(KEY_DATA, payload);
          return true;
        });
      },
      load: function () {
        var payload = storage.getItem(KEY_DATA);
        if (!payload) return Promise.resolve(null);
        return cryptoAdapter.decrypt(payload)
          .then(function (plain) {
            var parsed = JSON.parse(plain);
            return parsed && parsed.data ? parsed.data : null;
          })
          .catch(function () { return null; }); /* 损坏/换密钥 → 视为无许可，不抛错 */
      },
      clear: function () {
        storage.removeItem(KEY_DATA);
        return Promise.resolve(true);
      },
      /* 调试用：当前落盘形态（enc:v1:…/plain:…/空） */
      format: function () {
        var payload = storage.getItem(KEY_DATA);
        if (!payload) return "none";
        return String(payload).indexOf("plain:") === 0 ? "plain" : "enc:v1";
      }
    };
  }

  window.LixingLicenseStore = { create: createLicenseStore, _adapters: { Plain: PlainAdapter, Subtle: SubtleCryptoAdapter } };
  window.__lixingLicense = createLicenseStore();
})();

/* 每日开屏：当天第一次打开时全屏出示今日神兽画像，1.8 秒后淡出，点一下也可关掉。
 * 同一天在主页和神兽页只出现一次。画像优先用 en-*.jpg，没有则退回印谱卡面。
 */
(function () {
  "use strict";

  var KEY = "life-density-shenshou-splash";

  function pad(n) { return String(n).padStart(2, "0"); }
  function today() {
    var d = new Date();
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }

  function show() {
    var S = window.SHENSHOU;
    if (!S || typeof S.today !== "function") return;
    var day = today();
    try {
      if (localStorage.getItem(KEY) === day) return;
    } catch (e) { return; }

    var t = S.today(new Date());
    var b = t.beast;
    if (!b) return;
    var key = t.key || "baize";

    var wrap = document.createElement("div");
    wrap.setAttribute("role", "dialog");
    wrap.setAttribute("aria-label", b.name + "今日当值");
    wrap.style.cssText = [
      "position:fixed", "inset:0", "z-index:9999", "background:#0a0a0e",
      "display:flex", "flex-direction:column", "justify-content:flex-end",
      "color:#f0ead9", "font-family:KaiTi,STKaiti,serif"
    ].join(";");

    var img = document.createElement("img");
    img.alt = b.name;
    img.style.cssText = "position:absolute;inset:0;width:100%;height:100%;object-fit:cover;";
    img.src = "assets/shenshou-art/en-" + key + ".jpg";
    img.onerror = function () {
      if (img.dataset.fb) { img.style.display = "none"; return; }
      img.dataset.fb = "1";
      img.src = "assets/shenshou-art/" + key + ".png";
    };

    var shade = document.createElement("div");
    shade.style.cssText = "position:absolute;left:0;right:0;bottom:0;height:46%;background:linear-gradient(180deg,rgba(10,10,14,0),#0a0a0e 78%);";

    var cap = document.createElement("div");
    cap.style.cssText = "position:relative;z-index:1;padding:0 28px 48px;text-align:center;";
    var kicker = document.createElement("div");
    kicker.textContent = "今日当值";
    kicker.style.cssText = "letter-spacing:.4em;font-size:13px;color:#c9a85c;margin-bottom:8px;";
    var name = document.createElement("div");
    name.textContent = b.name;
    name.style.cssText = "font-size:48px;letter-spacing:.2em;text-shadow:0 0 18px rgba(201,168,92,.35);";
    var line = document.createElement("div");
    line.textContent = "每天一只神兽，照见你的轮盘";
    line.style.cssText = "margin-top:10px;font-size:14px;letter-spacing:.12em;color:#9a917d;";
    cap.appendChild(kicker);
    cap.appendChild(name);
    cap.appendChild(line);

    if (location.pathname.indexOf("shenshou.html") === -1) {
      var go = document.createElement("a");
      go.href = "shenshou.html";
      go.textContent = "看今日神兽";
      go.style.cssText = "display:inline-block;margin-top:16px;color:#f0d78c;letter-spacing:.28em;font-size:14px;text-decoration:none;border:1px solid rgba(201,168,92,.6);border-radius:999px;padding:8px 18px;";
      cap.appendChild(go);
    }

    wrap.appendChild(img);
    wrap.appendChild(shade);
    wrap.appendChild(cap);
    document.body.appendChild(wrap);

    try { localStorage.setItem(KEY, day); } catch (e) {}

    var gone = false;
    function close() {
      if (gone) return;
      gone = true;
      wrap.style.transition = "opacity .45s ease";
      wrap.style.opacity = "0";
      setTimeout(function () {
        if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
      }, 460);
    }
    wrap.addEventListener("click", function (ev) {
      if (ev.target && ev.target.tagName === "A") return;
      close();
    });
    setTimeout(close, 1800);
  }

  if (document.body) show();
  else document.addEventListener("DOMContentLoaded", show);
})();

/**
 * 砺行 · 日省 — 抉择：摇一摇 / 点击随机 是·否
 */
(function () {
  "use strict";

  var shaking = false;
  var lastShakeAt = 0;
  var SHAKE_THRESHOLD = 14;
  var SHAKE_COOLDOWN = 1800;

  function pickResult() {
    return Math.random() < 0.5 ? "yes" : "no";
  }

  function resultLabel(r) {
    return r === "yes" ? "是" : "否";
  }

  function animateResult(result) {
    var coin = document.getElementById("decideCoin");
    var out = document.getElementById("decideResult");
    var hint = document.getElementById("decideHint");
    if (!coin || !out) return;
    coin.classList.add("is-spinning");
    out.textContent = "…";
    out.classList.remove("is-yes", "is-no", "is-show");
    if (hint) hint.textContent = "正在落位…";

    setTimeout(function () {
      coin.classList.remove("is-spinning");
      out.textContent = resultLabel(result);
      out.classList.add("is-show", result === "yes" ? "is-yes" : "is-no");
      if (hint) hint.textContent = "信则行，疑则再想想。";
    }, 720);
  }

  function saveDecision(result) {
    if (typeof loadState !== "function" || typeof saveState !== "function") return;
    var qEl = document.getElementById("decideQuestion");
    var question = qEl ? qEl.value.trim() : "";
    var st = loadState();
    st.decisions = Array.isArray(st.decisions) ? st.decisions : [];
    st.decisions.unshift({
      id: Date.now(),
      question: question,
      result: result,
      at: new Date().toISOString(),
    });
    st.decisions = st.decisions.slice(0, 30);
    saveState(st);
    renderHistory();
  }

  function renderHistory() {
    var host = document.getElementById("decideHistory");
    if (!host || typeof loadState !== "function") return;
    var list = (loadState().decisions || []).slice(0, 5);
    if (!list.length) {
      host.innerHTML = '<p class="decide-history-empty">尚无抉择记录</p>';
      return;
    }
    host.innerHTML = list
      .map(function (d) {
        var q = d.question ? esc(d.question) + " · " : "";
        var day = (d.at || "").slice(0, 10);
        return (
          '<div class="decide-history-item"><span class="decide-history-q">' +
          q +
          '</span><span class="decide-history-r ' +
          (d.result === "yes" ? "is-yes" : "is-no") +
          '">' +
          resultLabel(d.result) +
          "</span><span class=\"decide-history-d\">" +
          day +
          "</span></div>"
        );
      })
      .join("");
  }

  function esc(s) {
    var d = document.createElement("div");
    d.textContent = s ?? "";
    return d.innerHTML;
  }

  function runDecide() {
    if (shaking) return;
    shaking = true;
    var result = pickResult();
    animateResult(result);
    saveDecision(result);
    setTimeout(function () {
      shaking = false;
    }, 900);
  }

  function onMotion(ev) {
    var acc = ev.accelerationIncludingGravity;
    if (!acc) return;
    var total = Math.sqrt(acc.x * acc.x + acc.y * acc.y + acc.z * acc.z);
    var now = Date.now();
    if (total > SHAKE_THRESHOLD && now - lastShakeAt > SHAKE_COOLDOWN) {
      lastShakeAt = now;
      runDecide();
    }
  }

  var motionBound = false;

  function enableMotion() {
    if (motionBound) return;
    motionBound = true;
    window.addEventListener("devicemotion", onMotion);
  }

  function requestMotionThenRun() {
    if (typeof DeviceMotionEvent !== "undefined" && typeof DeviceMotionEvent.requestPermission === "function") {
      DeviceMotionEvent.requestPermission()
        .then(function (state) {
          if (state === "granted") enableMotion();
        })
        .catch(function () {});
      return;
    }
    enableMotion();
  }

  function bindShake() {
    if (typeof DeviceMotionEvent === "undefined") return;
    if (typeof DeviceMotionEvent.requestPermission !== "function") {
      enableMotion();
    }
  }

  function init() {
    document.getElementById("decideBtn")?.addEventListener("click", function () {
      requestMotionThenRun();
      runDecide();
    });
    document.getElementById("decideCoin")?.addEventListener("click", function () {
      requestMotionThenRun();
      runDecide();
    });
    bindShake();
    renderHistory();
  }

  window.LixingDecide = { init: init, runDecide: runDecide };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

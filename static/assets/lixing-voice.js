/**
 * 砺行 · 日省 — 小目标语音输入（经本机 /api/audio/transcribe → AI Builders Grok STT）
 */
(function () {
  "use strict";

  var recorder = null;
  var chunks = [];
  var activeCol = null;
  var stream = null;
  var sttAvailable = null;

  function qs(sel) {
    return document.querySelector(sel);
  }

  function fieldForCol(col) {
    return document.getElementById("three" + col);
  }

  function btnForCol(col) {
    return document.querySelector('.voice-btn[data-voice-for="' + col + '"]');
  }

  function setBtnState(btn, state) {
    if (!btn) return;
    btn.classList.remove("is-recording", "is-busy");
    if (state === "recording") btn.classList.add("is-recording");
    if (state === "busy") btn.classList.add("is-busy");
    var label = { idle: "语音", recording: "停止", busy: "识别中…" };
    btn.textContent = label[state] || "语音";
    btn.setAttribute("aria-pressed", state === "recording" ? "true" : "false");
  }

  function resetAllBtns() {
    [1, 2, 3].forEach(function (i) {
      setBtnState(btnForCol(i), "idle");
    });
  }

  function stopTracks() {
    if (stream) {
      stream.getTracks().forEach(function (t) {
        t.stop();
      });
      stream = null;
    }
  }

  function dispatchInput(col) {
    var el = fieldForCol(col);
    if (!el) return;
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }

  async function checkAvailability() {
    if (sttAvailable !== null) return sttAvailable;
    try {
      var r = await fetch("/api/audio/config", { headers: { Accept: "application/json" } });
      if (!r.ok) {
        sttAvailable = false;
        return false;
      }
      var j = await r.json();
      sttAvailable = !!j.available;
      return sttAvailable;
    } catch (_e) {
      sttAvailable = false;
      return false;
    }
  }

  async function transcribe(blob) {
    var fd = new FormData();
    fd.append("audio_file", blob, "voice.webm");
    var r = await fetch("/api/audio/transcribe", { method: "POST", body: fd });
    var j = await r.json().catch(function () {
      return { ok: false, error: "响应解析失败" };
    });
    if (!r.ok || !j.ok) throw new Error(j.error || "语音识别失败");
    return (j.text || "").trim();
  }

  /** 浏览器原生识别兜底（无 AI Builder Token 时） */
  function webSpeechFallback() {
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return null;
    var rec = new SR();
    rec.lang = "zh-CN";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    return rec;
  }

  function runWebSpeech(col) {
    var SR = webSpeechFallback();
    var btn = btnForCol(col);
    if (!SR) {
      alert("当前环境无法语音输入：请用打开砺行.bat 启动并配置 AI_BUILDER_TOKEN，或使用 Chrome。");
      return;
    }
    setBtnState(btn, "busy");
    var rec = SR;
    rec.onresult = function (ev) {
      var text = ev.results[0][0].transcript.trim();
      var el = fieldForCol(col);
      if (el && text) {
        el.value = el.value ? el.value.trim() + " " + text : text;
        dispatchInput(col);
      }
      setBtnState(btn, "idle");
    };
    rec.onerror = function () {
      setBtnState(btn, "idle");
    };
    rec.onend = function () {
      setBtnState(btn, "idle");
    };
    rec.start();
  }

  async function startRecord(col) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      runWebSpeech(col);
      return;
    }
    var available = await checkAvailability();
    if (!available && !webSpeechFallback()) {
      alert("语音服务未就绪。请用「打开砺行.bat」启动本地服务，并在 .env 配置 AI_BUILDER_TOKEN。");
      return;
    }
    if (!available) {
      runWebSpeech(col);
      return;
    }

    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (_e) {
      alert("需要麦克风权限才能语音输入。");
      return;
    }

    chunks = [];
    activeCol = col;
    var mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : "audio/webm";
    recorder = new MediaRecorder(stream, { mimeType: mime });
    recorder.ondataavailable = function (ev) {
      if (ev.data && ev.data.size) chunks.push(ev.data);
    };
    recorder.onstop = function () {
      stopTracks();
      var colSnap = activeCol;
      var btn = btnForCol(colSnap);
      var blob = new Blob(chunks, { type: mime });
      chunks = [];
      recorder = null;
      activeCol = null;
      if (!blob.size) {
        setBtnState(btn, "idle");
        return;
      }
      setBtnState(btn, "busy");
      transcribe(blob)
        .then(function (text) {
          var el = fieldForCol(colSnap);
          if (el && text) {
            el.value = el.value ? el.value.trim() + " " + text : text;
            dispatchInput(colSnap);
          }
        })
        .catch(function (err) {
          alert(err.message || "语音识别失败");
        })
        .finally(function () {
          setBtnState(btn, "idle");
        });
    };
    recorder.start();
    [1, 2, 3].forEach(function (i) {
      setBtnState(btnForCol(i), i === col ? "recording" : "idle");
    });
  }

  function stopRecord() {
    if (recorder && recorder.state !== "inactive") recorder.stop();
  }

  function onVoiceClick(col) {
    if (recorder && recorder.state === "recording") {
      if (activeCol === col) stopRecord();
      else {
        stopRecord();
        setTimeout(function () {
          startRecord(col);
        }, 120);
      }
      return;
    }
    startRecord(col);
  }

  function bind() {
    document.querySelectorAll(".voice-btn").forEach(function (btn) {
      var col = parseInt(btn.dataset.voiceFor, 10);
      if (!col) return;
      btn.addEventListener("click", function () {
        onVoiceClick(col);
      });
    });
    checkAvailability().then(function (ok) {
      if (!ok) return;
      document.querySelectorAll(".voice-btn").forEach(function (btn) {
        btn.title = "AI Builders 语音转写";
      });
    });
  }

  window.LixingVoice = { init: bind, checkAvailability: checkAvailability };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind);
  } else {
    bind();
  }
})();

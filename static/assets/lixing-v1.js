/**
 * 砺行 v1：工作外三事、人生三愿、周/月/年关键词
 * 依赖 index.html 中的 loadState / saveState / todayStr / showToast
 */
(function () {
  "use strict";

  const SIX_MONTH_MS = 183 * 24 * 3600 * 1000;
  const YEAR_MS = 365 * 24 * 3600 * 1000;
  const HARVEST_DENSITY_EACH = 15;

  const SPOKE_KEYWORDS = {
    physical: ["身体", "健康", "睡", "跑", "走", "健身", "运动", "医", "病", "牙", "吃", "饭", "步"],
    mental: ["情绪", "焦虑", "压力", "静", "专注", "冥想", "心情", "慌", "稳"],
    spiritual: ["愿", "意义", "省", "平静", "日记", "祈", "信", "空", "觉"],
    money: ["钱", "收入", "花", "预算", "省钱", "工资", "账", "消费"],
    asset: ["投资", "资产", "股票", "基金", "房", "存款"],
    time: ["时间", "早起", "效率", "拖延", "日程", "空闲"],
    experience: ["旅行", "学", "读", "看", "听", "创作", "课", "展", "玩"],
    family: ["家", "父母", "爸", "妈", "孩子", "伴侣", "爱人", "亲"],
    social: ["朋友", "同事", "人", "聚", "聊", "约", "群"],
  };

  function normalizeBirthday(raw) {
    const s = String(raw || "").trim();
    const m = s.match(/^(\d{1,2})[-/.月](\d{1,2})/);
    if (!m) return "";
    const mo = Math.max(1, Math.min(12, parseInt(m[1], 10)));
    const day = Math.max(1, Math.min(31, parseInt(m[2], 10)));
    return String(mo).padStart(2, "0") + "-" + String(day).padStart(2, "0");
  }

  function getBirthday(st) {
    const src = st || (typeof loadState === "function" ? loadState() : null);
    return normalizeBirthday((src && src.settings && src.settings.birthday) || "");
  }

  function nextBirthdayOnOrAfter(from, mmdd) {
    const norm = normalizeBirthday(mmdd);
    if (!norm || !from) return null;
    const mo = parseInt(norm.slice(0, 2), 10);
    const day = parseInt(norm.slice(3, 5), 10);
    let y = from.getFullYear();
    let cand = new Date(y, mo - 1, day, 12, 0, 0);
    const fromNoon = new Date(from.getFullYear(), from.getMonth(), from.getDate(), 12, 0, 0);
    if (cand < fromNoon) cand = new Date(y + 1, mo - 1, day, 12, 0, 0);
    return cand;
  }

  function computeUnlockDate(lockedAtIso, birthday) {
    const t = Date.parse(lockedAtIso);
    if (Number.isNaN(t)) return null;
    const min = new Date(t + YEAR_MS);
    const b = normalizeBirthday(birthday);
    if (!b) return min;
    return nextBirthdayOnOrAfter(min, b) || min;
  }

  const QUIZ = [
    {
      q: "若人生只能留下一种影响，你希望别人怎样记住你？",
      hint: "不必宏大，一句真实方向即可。",
    },
    {
      q: "工作之外，你希望十年后的自己仍在坚持什么？",
      hint: "兴趣、习惯、关系或手艺，都可以。",
    },
    {
      q: "什么状态下，你会感到「这一天没有白过」？",
      hint: "感受比 KPI 更重要。",
    },
  ];

  function defaultLifeWishes() {
    return {
      wishes: ["", "", ""],
      quizAnswers: ["", "", ""],
      completedAt: "",
      wishesLockedAt: "",
      yearlyReviews: [],
      sixMonth: { lines: ["", "", ""], lockedAt: "" },
    };
  }

  function normalizeLifeWishes(w) {
    const base = defaultLifeWishes();
    if (!w || typeof w !== "object") return base;
    return {
      wishes: Array.isArray(w.wishes)
        ? w.wishes.slice(0, 3).concat(["", "", ""]).slice(0, 3)
        : base.wishes,
      quizAnswers: Array.isArray(w.quizAnswers)
        ? w.quizAnswers.slice(0, 3).concat(["", "", ""]).slice(0, 3)
        : base.quizAnswers,
      completedAt: w.completedAt || "",
      wishesLockedAt: w.wishesLockedAt || "",
      wishesUnlockAt: w.wishesUnlockAt || "",
      yearlyReviews: Array.isArray(w.yearlyReviews) ? w.yearlyReviews : [],
      sixMonth: {
        lines: Array.isArray(w.sixMonth && w.sixMonth.lines)
          ? w.sixMonth.lines.slice(0, 3).concat(["", "", ""]).slice(0, 3)
          : base.sixMonth.lines,
        lockedAt: (w.sixMonth && w.sixMonth.lockedAt) || "",
      },
    };
  }

  function wishesLockedUntil(lw, birthday) {
    if (!lw) return null;
    if (lw.wishesUnlockAt) {
      const u = Date.parse(lw.wishesUnlockAt);
      if (!Number.isNaN(u)) return new Date(u);
    }
    const at = lw.wishesLockedAt || lw.completedAt;
    if (!at) return null;
    return computeUnlockDate(at, birthday != null ? birthday : getBirthday());
  }

  function isWishesLocked(lw) {
    const until = wishesLockedUntil(lw);
    return until && Date.now() < until.getTime();
  }

  function yearlyReviewEligibleAt(lw) {
    return wishesLockedUntil(lw);
  }

  function needsYearlyWishReview(lw) {
    if (!lw.completedAt || !lw.wishes.some((w) => w && w.trim())) return false;
    const until = wishesLockedUntil(lw);
    if (until && Date.now() < until.getTime()) return false;
    const year = new Date().getFullYear();
    return !(lw.yearlyReviews || []).some((r) => r && r.year === year);
  }

  function sixMonthLockedUntil(lockedAt) {
    if (!lockedAt) return null;
    const t = Date.parse(lockedAt);
    if (Number.isNaN(t)) return null;
    return new Date(t + SIX_MONTH_MS);
  }

  function isSixMonthLocked(lw) {
    const until = sixMonthLockedUntil(lw.sixMonth.lockedAt);
    return until && Date.now() < until.getTime();
  }

  function formatDate(d) {
    if (!d) return "—";
    try {
      return d.toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" });
    } catch {
      return d.toISOString().slice(0, 10);
    }
  }

  function tokenize(text) {
    if (!text) return [];
    const parts = String(text)
      .replace(/[^\u4e00-\u9fffA-Za-z0-9\s，。；、！？]/g, " ")
      .split(/[\s，。；、！？,.;!?]+/)
      .map((s) => s.trim())
      .filter((s) => s.length >= 2);
    return parts;
  }

  function topKeywords(entries, days) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    const freq = {};
    Object.keys(entries || {}).forEach((date) => {
      if (date < cutoffStr) return;
      const e = entries[date];
      const blob = [
        e.dailyWish,
        ...(e.three || []),
        e.feeling,
        e.harvest,
        ...normalizeHarvests(e),
        e.thickness,
        e.note,
      ]
        .filter(Boolean)
        .join(" ");
      tokenize(blob).forEach((w) => {
        freq[w] = (freq[w] || 0) + 1;
      });
    });
    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([w, c]) => ({ w, c }));
  }

  function renderKeywordTags(list) {
    if (!list.length) return '<span class="kw-empty">尚无足够记录，先写几天日省吧</span>';
    return list.map(({ w, c }) => `<span class="kw-tag">${w}<em>${c}</em></span>`).join("");
  }

  function renderKeywords() {
    const el = document.getElementById("keywordsPanel");
    if (!el || typeof loadState !== "function") return;
    const entries = loadState().entries || {};
    const week = topKeywords(entries, 7);
    const month = topKeywords(entries, 31);
    const year = topKeywords(entries, 365);
    el.innerHTML = `
      <div class="kw-col"><div class="kw-label">近 7 天</div><div class="kw-tags">${renderKeywordTags(week)}</div></div>
      <div class="kw-col"><div class="kw-label">近 30 天</div><div class="kw-tags">${renderKeywordTags(month)}</div></div>
      <div class="kw-col"><div class="kw-label">近 365 天</div><div class="kw-tags">${renderKeywordTags(year)}</div></div>`;
  }

  function extractKeyword(text) {
    const raw = String(text || "").trim();
    if (!raw) return "";
    const tokens = tokenize(raw)
      .map((w) => w.replace(/[^\u4e00-\u9fff]/g, ""))
      .filter((w) => w.length === 2);
    if (tokens.length) return tokens[tokens.length - 1];
    const cjk = raw.replace(/[^\u4e00-\u9fff]/g, "");
    if (cjk.length >= 4 && cjk.charAt(1) === "一") return cjk.charAt(0) + cjk.charAt(cjk.length - 1);
    if (cjk.length >= 2) return cjk.slice(-2);
    if (cjk.length === 1) return cjk;
    return raw.replace(/[^A-Za-z0-9\u4e00-\u9fff]/g, "").slice(0, 2);
  }

  function padThree(arr) {
    const out = (arr || []).map((s) => String(s || "").trim()).slice(0, 3);
    while (out.length < 3) out.push("");
    return out;
  }

  function spokeLabel(id) {
    const spokes = (window.WHEEL_OF_LIFE && window.WHEEL_OF_LIFE.spokes) || [];
    const found = spokes.find((s) => s.id === id);
    return (found && found.zh) || id;
  }

  function normalizeHarvests(e) {
    if (!e || typeof e !== "object") return ["", "", ""];
    if (Array.isArray(e.harvests) && e.harvests.some((s) => String(s || "").trim())) {
      return padThree(e.harvests);
    }
    const h = String(e.harvest || "").trim();
    if (h) {
      const parts = h.split(/\n+/).map((s) => s.trim()).filter(Boolean);
      if (parts.length) return padThree(parts);
    }
    return ["", "", ""];
  }

  function harvestCount(e) {
    return normalizeHarvests(e).filter(Boolean).length;
  }

  function silentDensity(e) {
    const n = harvestCount(e);
    return n > 0 ? n * HARVEST_DENSITY_EACH : null;
  }

  function formulaDensity(e) {
    if (!e || !e.h || e.h <= 0) return null;
    return ((Number(e.c || 0) + Number(e.l || 0) + Number(e.p || 0)) / e.h) * 100;
  }

  function dayDensity(e) {
    const silent = silentDensity(e);
    const formula = formulaDensity(e);
    if (silent == null && formula == null) return null;
    if (silent == null) return formula;
    if (formula == null) return silent;
    return Math.max(silent, formula);
  }

  function inferSpoke(text) {
    const t = String(text || "");
    let best = "";
    let bestN = 0;
    Object.keys(SPOKE_KEYWORDS).forEach(function (id) {
      const n = SPOKE_KEYWORDS[id].filter(function (k) { return t.indexOf(k) >= 0; }).length;
      if (n > bestN) { bestN = n; best = id; }
    });
    return bestN > 0 ? best : "spiritual";
  }

  function harvestsForSpoke(spokeId, entries, limit) {
    const cap = limit || 8;
    const out = [];
    Object.keys(entries || {})
      .sort()
      .reverse()
      .forEach(function (date) {
        if (out.length >= cap) return;
        normalizeHarvests(entries[date]).forEach(function (text) {
          if (!text || out.length >= cap) return;
          if (inferSpoke(text) !== spokeId) return;
          out.push({ date: date, text: text, spoke: spokeId });
        });
      });
    return out;
  }

  function renderSpokeEvidence(spokeId, entries) {
    const items = harvestsForSpoke(spokeId, entries || {}, 8);
    if (!items.length) {
      return '<p class="wheel-harvest-empty">这条维度还没有对应的日省收获。写下来的文字会按关键词归到九维，作为打分依据。</p>';
    }
    return (
      '<div class="wheel-harvest-list"><p class="wheel-harvest-label">日省依据 · ' +
      escapeHtml(spokeLabel(spokeId)) +
      "</p><ul>" +
      items
        .map(function (it) {
          return (
            "<li><time>" +
            escapeHtml(it.date) +
            "</time><span>" +
            escapeHtml(it.text) +
            "</span></li>"
          );
        })
        .join("") +
      "</ul></div>"
    );
  }

  function normalizeDailyEntry(e) {
    const base = {
      dailyWish: "",
      three: ["", "", ""],
      threeKw: ["", "", ""],
      feeling: "",
      mood: "auto",
      themeColor: "auto",
      reviewDone: [null, null, null],
      reviewNote: "",
      reviewedAt: "",
      harvest: "",
      harvests: ["", "", ""],
    };
    if (!e || typeof e !== "object") return base;
    const three = Array.isArray(e.three) ? e.three.slice(0, 3) : ["", "", ""];
    while (three.length < 3) three.push("");
    const threeKw = Array.isArray(e.threeKw) ? e.threeKw.slice(0, 3) : ["", "", ""];
    while (threeKw.length < 3) threeKw.push("");
    const reviewDone = Array.isArray(e.reviewDone) ? e.reviewDone.slice(0, 3) : [null, null, null];
    while (reviewDone.length < 3) reviewDone.push(null);
    const harvests = normalizeHarvests(e);
    return Object.assign(base, e, { three, threeKw, reviewDone, harvests, harvest: harvests.filter(Boolean).join("\n") });
  }

  function getDailyFields() {
    const fields = {
      dailyWish: (document.getElementById("dailyWish") || {}).value?.trim() || "",
      three: [1, 2, 3].map((i) => {
        const el = document.getElementById("three" + i);
        return el ? el.value.trim() : "";
      }),
      threeKw: [1, 2, 3].map((i) => {
        const el = document.getElementById("kw" + i);
        return el ? el.textContent.trim() : "";
      }),
      feeling: (document.getElementById("dailyFeeling") || {}).value?.trim() || "",
      reviewDone: [1, 2, 3].map((i) => {
        const circle = document.getElementById("reviewCircle" + i);
        if (!circle) return null;
        if (circle.classList.contains("is-yes")) return "yes";
        if (circle.classList.contains("is-no")) return "no";
        return null;
      }),
      reviewNote: (document.getElementById("reviewNote") || {}).value?.trim() || "",
      harvest: (document.getElementById("harvest") || {}).value?.trim() || "",
      harvests: [1, 2, 3].map((i) => {
        const el = document.getElementById("harvest" + i);
        if (el) return el.value.trim();
        return "";
      }),
      thickness: (document.getElementById("thickness") || {}).value?.trim() || "",
    };
    if (!fields.harvests.some(Boolean) && fields.harvest) {
      fields.harvests = padThree(fields.harvest.split(/\n+/).map((s) => s.trim()).filter(Boolean));
    }
    if (!fields.harvest) fields.harvest = fields.harvests.filter(Boolean).join("\n");
    if (fields.harvests.some(Boolean) && !fields.three.some(Boolean)) {
      fields.three = fields.harvests.slice();
    }
    return fields;
  }

  function collectHarvestWins(entries) {
    const wins = [];
    Object.keys(entries || {})
      .sort()
      .reverse()
      .forEach(function (date) {
        const e = entries[date];
        if (!e) return;
        normalizeHarvests(e).forEach(function (text, i) {
          if (!text) return;
          wins.push({
            date: date,
            text: text,
            kw: inferSpoke(text),
            index: i + 1,
          });
        });
        const three = e.three || [];
        const kws = e.threeKw || [];
        const marks = e.reviewDone || [];
        [0, 1, 2].forEach(function (i) {
          if (marks[i] !== "yes") return;
          const text = (three[i] || "").trim();
          if (!text) return;
          if (wins.some((w) => w.date === date && w.text === text)) return;
          wins.push({
            date: date,
            text: text,
            kw: (kws[i] || "").trim(),
            index: i + 1,
          });
        });
      });
    return wins;
  }

  function renderHarvestPanel() {
    const host = document.getElementById("harvestPanel");
    if (!host || typeof loadState !== "function") return;
    const wins = collectHarvestWins(loadState().entries || {});
    if (!wins.length) {
      host.innerHTML =
        '<p class="harvest-empty">日省写下的收获会出现在这里 · 也会作为生命之轮各维的依据</p>';
      return;
    }
    host.innerHTML =
      '<ul class="harvest-win-list">' +
      wins
        .map(function (w) {
          return (
            '<li class="harvest-win-item"><div class="harvest-win-meta"><time>' +
            escapeHtml(w.date) +
            "</time>" +
            (w.kw ? '<span class="harvest-win-kw">' + escapeHtml(spokeLabel(w.kw) || w.kw) + "</span>" : "") +
            '</div><p class="harvest-win-text">' +
            escapeHtml(w.text) +
            "</p></li>"
          );
        })
        .join("") +
      "</ul>";
  }

  function persistReviewMarks() {
    if (typeof saveNotebookThree === "function") {
      saveNotebookThree();
      return;
    }
    if (typeof loadState !== "function" || typeof saveState !== "function") return;
    const dateEl = document.getElementById("date");
    const date = (dateEl && dateEl.value) || todayStr();
    const st = loadState();
    st.entries = st.entries || {};
    const prev = st.entries[date] || {};
    const fields = getDailyFields();
    st.entries[date] = Object.assign({}, prev, {
      three: fields.three,
      threeKw: fields.threeKw,
      reviewDone: fields.reviewDone,
      reviewedAt: new Date().toISOString(),
    });
    saveState(st);
    renderHarvestPanel();
  }

  function applyReviewRowUI(i, state, animate) {
    const row = document.querySelector('.review-row[data-col="' + i + '"]');
    if (!row) return;
    row.classList.remove("is-yes-locked", "is-collapsing", "is-dismissed", "is-no-kept");
    const btns = row.querySelector(".review-row-btns");
    const status = document.getElementById("reviewStatus" + i);
    if (status) {
      status.hidden = !(state === "yes" || state === "no");
      status.classList.remove("is-yes", "is-no");
      if (state === "yes") {
        status.textContent = "✓ 已完成";
        status.classList.add("is-yes");
      } else if (state === "no") {
        status.textContent = "未完成";
        status.classList.add("is-no");
      } else {
        status.textContent = "";
      }
    }
    if (state === "yes") {
      row.classList.add("is-yes-locked");
      if (btns) btns.hidden = true;
      return;
    }
    if (state === "no") {
      row.classList.add("is-no-kept");
      if (btns) btns.hidden = true;
      return;
    }
    if (btns) btns.hidden = false;
  }

  function paintReviewMark(i, state, options) {
    const opts = options || {};
    const circle = document.getElementById("reviewCircle" + i);
    const btns = document.querySelectorAll('.review-btns button[data-review="' + i + '"]');
    const row = document.querySelector('.review-row[data-col="' + i + '"]');
    if (!circle) return;
    circle.classList.remove("is-yes", "is-no");
    if (state === "yes") circle.classList.add("is-yes");
    else if (state === "no") circle.classList.add("is-no");
    btns.forEach(function (btn) {
      btn.classList.toggle("is-active", btn.dataset.v === state);
    });
    if (row) {
      row.classList.remove("is-yes", "is-no");
      if (state === "yes" || state === "no") row.classList.add("is-" + state);
    }
    applyReviewRowUI(i, state, opts.animate !== false && state === "yes");
    const foot = document.getElementById("foot" + i);
    if (!foot) return;
    if (state === "yes") foot.textContent = "已完成";
    else if (state === "no") foot.textContent = "未完成";
  }

  function paintWishFeeling(wish, feeling) {
    const footWish = document.getElementById("footWish");
    const footFeel = document.getElementById("footFeel");
    const feelCol = document.querySelector('.write-feel[data-col="feel"]');
    if (footWish) footWish.textContent = wish && wish.trim() ? "已许" : "";
    if (footFeel) footFeel.textContent = feeling && feeling.trim() ? "已写" : "未写";
    if (feelCol) feelCol.classList.toggle("has-feel", !!(feeling && feeling.trim()));
  }

  function updateFeelingNudge() {
    const nudge = document.getElementById("feelingNudge");
    const reviewPane = document.getElementById("action-review");
    const feeling = (document.getElementById("dailyFeeling") || {}).value || "";
    if (!nudge) return;
    const show = reviewPane && !reviewPane.hidden && !feeling.trim();
    nudge.classList.toggle("is-show", show);
  }

  function goalCol(i) {
    return (
      document.querySelector('.store-item[data-col="' + i + '"]') ||
      document.querySelector('.write-card[data-col="' + i + '"]')
    );
  }

  function paintCol(i, text, kw, manual) {
    const col = goalCol(i);
    const kwEl = document.getElementById("kw" + i);
    const foot = document.getElementById("foot" + i);
    const filled = !!(text && text.trim());
    const word = (kw && kw.trim()) || extractKeyword(text);
    if (kwEl) {
      if (!manual) kwEl.textContent = word;
      if (manual) kwEl.dataset.manual = "1";
      else delete kwEl.dataset.manual;
    }
    if (col) {
      col.classList.toggle("has-kw", !!word);
      col.classList.toggle("has-text", filled);
    }
    if (foot && !document.getElementById("threePoster")?.classList.contains("is-review")) {
      foot.textContent = filled ? "已写" : "未写";
    }
  }

  function unlockCols() {
    [1, 2, 3].forEach(function (i) {
      var col = goalCol(i);
      if (col) col.classList.remove("is-wait");
    });
  }

  function syncHomeFromText(i) {
    const ta = document.getElementById("three" + i);
    const kwEl = document.getElementById("kw" + i);
    const text = ta ? ta.value : "";
    const manual = kwEl && kwEl.dataset.manual === "1";
    paintCol(i, text, manual ? kwEl.textContent : "", manual);
    unlockCols();
    syncKwFromText(i);
  }

  function syncKwFromText(i) {
    const ta = document.getElementById("three" + i);
    const kwEl = document.getElementById("kw" + i);
    if (!ta || !kwEl) return;
    if (kwEl.dataset.manual === "1") return;
    kwEl.textContent = extractKeyword(ta.value || "");
  }

  function setDailyFields(e) {
    const entry = normalizeDailyEntry(e);
    const wishEl = document.getElementById("dailyWish");
    const feelEl = document.getElementById("dailyFeeling");
    const reviewNoteEl = document.getElementById("reviewNote");
    if (wishEl) wishEl.value = entry.dailyWish || "";
    if (feelEl) feelEl.value = entry.feeling || "";
    if (reviewNoteEl) reviewNoteEl.value = entry.reviewNote || "";
    paintWishFeeling(entry.dailyWish, entry.feeling);
    [1, 2, 3].forEach((i) => {
      const el = document.getElementById("three" + i);
      if (el) el.value = entry.three[i - 1] || "";
      const kwEl = document.getElementById("kw" + i);
      const savedKw = (entry.threeKw[i - 1] || "").trim();
      if (kwEl) {
        if (savedKw) {
          kwEl.textContent = savedKw;
          kwEl.dataset.manual = "1";
        } else {
          delete kwEl.dataset.manual;
          kwEl.textContent = extractKeyword(entry.three[i - 1] || "");
        }
      }
      paintCol(i, entry.three[i - 1] || "", savedKw || extractKeyword(entry.three[i - 1] || ""), !!savedKw);
      paintReviewMark(i, entry.reviewDone[i - 1] || null, { animate: false });
    });
    unlockCols();
    updateFeelingNudge();
    const harvestEl = document.getElementById("harvest");
    const thickEl = document.getElementById("thickness");
    const noteEl = document.getElementById("note");
    if (harvestEl) harvestEl.value = entry.harvest || "";
    [1, 2, 3].forEach(function (i) {
      const hEl = document.getElementById("harvest" + i);
      if (!hEl) return;
      const fromHarvest = entry.harvests[i - 1] || "";
      const fromThree = (!entry.harvests.some(Boolean) && (entry.three[i - 1] || "")) || "";
      hEl.value = fromHarvest || fromThree;
    });
    if (typeof updateHarvestDensityHint === "function") updateHarvestDensityHint();
    else if (window.LixingV1 && window.LixingV1.updateHarvestDensityHint) window.LixingV1.updateHarvestDensityHint();
    if (thickEl) thickEl.value = entry.thickness || "";
    if (noteEl && !entry.harvest) noteEl.value = entry.note || "";
    if (window.LixingWriteDialog) window.LixingWriteDialog.syncPreviews();
    if (typeof renderReviewSummary === "function") renderReviewSummary();
  }

  function updateHarvestDensityHint() {
    const el = document.getElementById("harvestDensityHint");
    if (!el) return;
    const n = [1, 2, 3].map(function (i) {
      const inp = document.getElementById("harvest" + i);
      return inp && inp.value.trim();
    }).filter(Boolean).length;
    if (n <= 0) el.textContent = "写一条，今日密度即达 15% · 无感计入";
    else el.textContent = "今日密度 " + n * HARVEST_DENSITY_EACH + "% · " + n + " 条收获";
  }

  function saveBirthdayFromInput() {
    const inp = document.getElementById("birthdayInput");
    if (!inp || typeof loadState !== "function") return "";
    const norm = normalizeBirthday(inp.value);
    const st = loadState();
    st.settings = st.settings || {};
    st.settings.birthday = norm;
    saveState(st);
    if (inp.value !== norm && norm) inp.value = norm;
    return norm;
  }

  function lockLifeWishesNow(st) {
    const birthday = getBirthday(st);
    if (!birthday) return { ok: false, reason: "birthday" };
    const now = new Date().toISOString();
    st.lifeWishes.completedAt = st.lifeWishes.completedAt || now;
    st.lifeWishes.wishesLockedAt = now;
    const until = computeUnlockDate(now, birthday);
    st.lifeWishes.wishesUnlockAt = until ? until.toISOString() : "";
    return { ok: true, until: until };
  }

  function showPoster(skipAnim) {
    const poster = document.getElementById("threePoster");
    if (!poster) return;
    poster.hidden = false;
    poster.classList.add("is-in");
    document.getElementById("studyScene")?.classList.add("is-open");
  }

  function initAskFlow() {
    const poster = document.getElementById("threePoster");
    if (!poster) return;
    showPoster(true);
    document.getElementById("dailyWish")?.addEventListener("input", function () {
      paintWishFeeling(this.value, (document.getElementById("dailyFeeling") || {}).value || "");
      unlockCols();
    });
    document.getElementById("dailyFeeling")?.addEventListener("input", function () {
      paintWishFeeling((document.getElementById("dailyWish") || {}).value || "", this.value);
      updateFeelingNudge();
    });
    document.querySelectorAll(".review-btns button").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const i = parseInt(btn.dataset.review, 10);
        const v = btn.dataset.v;
        const circle = document.getElementById("reviewCircle" + i);
        const row = document.querySelector('.review-row[data-col="' + i + '"]');
        if (row && (row.classList.contains("is-yes-locked") || row.classList.contains("is-no-kept"))) return;
        const cur =
          circle && circle.classList.contains("is-yes")
            ? "yes"
            : circle && circle.classList.contains("is-no")
              ? "no"
              : null;
        if (cur === v) return;
        paintReviewMark(i, v, { animate: v === "yes" });
        persistReviewMarks();
        updateFeelingNudge();
        if (window.LixingHome) window.LixingHome.updateYesterdayBanner();
      });
    });
    document.getElementById("openReviewBtn")?.addEventListener("click", function () {
      if (window.LixingHome) {
        window.LixingHome.setModule("action");
        window.LixingHome.setActionTab("review");
      }
    });
    [1, 2, 3].forEach((i) => {
      document.getElementById("three" + i)?.addEventListener("input", function () {
        const kwEl = document.getElementById("kw" + i);
        if (kwEl) delete kwEl.dataset.manual;
        syncHomeFromText(i);
        if (typeof renderReviewSummary === "function") renderReviewSummary();
      });
      document.getElementById("kw" + i)?.addEventListener("keydown", function (ev) {
        if (ev.key === "Enter") ev.preventDefault();
      });
      document.getElementById("kw" + i)?.addEventListener("input", function () {
        const el = this;
        el.dataset.manual = "1";
        let t = el.textContent.replace(/\s/g, "").slice(0, 2);
        if (el.textContent !== t) el.textContent = t;
        const col = goalCol(i);
        if (col) col.classList.toggle("has-kw", !!t);
      });
    });
  }

  function renderWishSummary() {
    const box = document.getElementById("wishSummaryHero");
    if (!box || typeof loadState !== "function") return;
    const lw = normalizeLifeWishes(loadState().lifeWishes);
    const filled = lw.wishes.filter((w) => w && w.trim());
    if (!filled.length) {
      box.innerHTML =
        '<p class="wish-summary-empty">尚未许下人生三愿 · <a href="#workspace" data-panel="wishes">去填写</a></p>';
      return;
    }
    box.innerHTML =
      '<p class="wish-summary-label">人生三愿</p><ol class="wish-summary-list">' +
      filled.map((w) => `<li>${escapeHtml(w)}</li>`).join("") +
      "</ol>";
  }

  function escapeHtml(s) {
    const d = document.createElement("div");
    d.textContent = s ?? "";
    return d.innerHTML;
  }

  let quizStep = 0;

  function renderQuizStep() {
    const host = document.getElementById("wishQuizHost");
    if (!host) return;
    if (quizStep >= QUIZ.length) {
      const lw = normalizeLifeWishes(typeof loadState === "function" ? loadState().lifeWishes : null);
      host.innerHTML = `
        <p class="card-desc">把三个回答收成三条愿望（可再改字）。定稿后 <strong>365 天</strong>不可改，到期对齐你的生日。</p>
        <div class="wish-final-grid">
          ${[0, 1, 2]
            .map(
              (i) => `
          <div class="field"><label for="wishFinal${i}">愿望 ${i + 1}</label>
          <input type="text" id="wishFinal${i}" value="${escapeHtml(
                lw.quizAnswers[i] || lw.wishes[i] || ""
              )}" /></div>`
            )
            .join("")}
        </div>
        <div class="actions"><button type="button" class="btn" id="finalizeQuizBtn">定稿人生三愿</button></div>`;
      document.getElementById("finalizeQuizBtn")?.addEventListener("click", () => {
        saveBirthdayFromInput();
        const st = loadState();
        st.lifeWishes = normalizeLifeWishes(st.lifeWishes);
        [0, 1, 2].forEach((i) => {
          const el = document.getElementById("wishFinal" + i);
          if (el) st.lifeWishes.wishes[i] = el.value.trim();
        });
        const locked = lockLifeWishesNow(st);
        if (!locked.ok) {
          alert("请先填写生日（月-日），再定稿。到期日 = 定稿满 365 天后的下一个生日。");
          return;
        }
        saveState(st);
        quizStep = 0;
        renderWishesPanel();
        renderHomeWishes();
        if (typeof showToast === "function") showToast("savedWishToast");
      });
      return;
    }
    const item = QUIZ[quizStep];
    const lw = normalizeLifeWishes(typeof loadState === "function" ? loadState().lifeWishes : null);
    host.innerHTML = `
      <p class="quiz-progress">第 ${quizStep + 1} / ${QUIZ.length} 问</p>
      <p class="quiz-q">${escapeHtml(item.q)}</p>
      <p class="quiz-hint">${escapeHtml(item.hint)}</p>
      <div class="field"><textarea id="wishQuizInput" rows="3" placeholder="写下第一直觉…">${escapeHtml(
        lw.quizAnswers[quizStep] || ""
      )}</textarea></div>`;
  }

  function renderWishesPanel() {
    const st = typeof loadState === "function" ? loadState() : {};
    const lw = normalizeLifeWishes(st.lifeWishes);
    const yearLocked = isWishesLocked(lw);
    const locked = isSixMonthLocked(lw);
    const until = sixMonthLockedUntil(lw.sixMonth.lockedAt);
    const bdayHost = document.getElementById("wishBirthdayHost");
    if (bdayHost) {
      bdayHost.innerHTML = birthdayBlockHtml(getBirthday(st), yearLocked);
      bindBirthdayInput();
    }

    const lifeList = document.getElementById("lifeWishList");
    if (lifeList) {
      lifeList.innerHTML = [0, 1, 2]
        .map(
          (i) => `
        <div class="field"><label for="lifeWish${i}">人生愿望 ${i + 1}</label>
        <input type="text" id="lifeWish${i}" value="${escapeHtml(lw.wishes[i] || "")}" ${
            yearLocked ? "readonly" : ""
          } /></div>`
        )
        .join("");
    }

    const sixHost = document.getElementById("sixMonthBlock");
    if (sixHost) {
      if (locked && until) {
        sixHost.innerHTML = `
          <p class="lock-badge">六个月愿望已锁定 · 至 ${formatDate(until)} 不可修改</p>
          <ol class="six-month-readonly">${lw.sixMonth.lines
            .filter(Boolean)
            .map((l) => `<li>${escapeHtml(l)}</li>`)
            .join("") || "<li>（未填写）</li>"}</ol>`;
      } else {
        sixHost.innerHTML = `
          <p class="card-desc">未来六个月，你想认真靠近的三条线（确认后 <strong>183 天内不可改</strong>，不设提醒）：</p>
          ${[0, 1, 2]
            .map(
              (i) => `
          <div class="field"><label for="sixMonth${i}">六个月 · ${i + 1}</label>
          <input type="text" id="sixMonth${i}" value="${escapeHtml(lw.sixMonth.lines[i] || "")}" /></div>`
            )
            .join("")}
          <button type="button" class="btn btn-ghost" id="lockSixMonthBtn">锁定六个月愿望</button>`;
      }
    }

    const meta = document.getElementById("wishMeta");
    if (meta) {
      meta.textContent = lw.completedAt
        ? "人生三愿定稿于 " + formatDate(new Date(lw.completedAt))
        : "完成下方三问，收成你的人生三愿";
    }

    renderQuizStep();
    renderWishSummary();
  }

  function saveLifeWishesFromForm() {
    const st = loadState();
    st.lifeWishes = normalizeLifeWishes(st.lifeWishes);
    if (isWishesLocked(st.lifeWishes)) {
      alert("三愿锁定中，到期前不能改。");
      return;
    }
    [0, 1, 2].forEach((i) => {
      const el = document.getElementById("lifeWish" + i);
      if (el) st.lifeWishes.wishes[i] = el.value.trim();
    });
    if (!st.lifeWishes.completedAt && st.lifeWishes.wishes.some((w) => w)) {
      st.lifeWishes.completedAt = new Date().toISOString();
    }
    saveState(st);
    renderWishesPanel();
    renderWishSummary();
    if (typeof showToast === "function") showToast("savedWishToast");
  }

  function lockSixMonth() {
    const st = loadState();
    st.lifeWishes = normalizeLifeWishes(st.lifeWishes);
    if (isSixMonthLocked(st.lifeWishes)) return;
    const lines = [0, 1, 2].map((i) => {
      const el = document.getElementById("sixMonth" + i);
      return el ? el.value.trim() : "";
    });
    if (!lines.some(Boolean)) {
      alert("请至少填写一条六个月愿望后再锁定。");
      return;
    }
    if (!confirm("锁定后 183 天内不可修改，也不推送提醒。确定？")) return;
    st.lifeWishes.sixMonth = { lines, lockedAt: new Date().toISOString() };
    saveState(st);
    renderWishesPanel();
    if (typeof showToast === "function") showToast("savedWishToast");
  }

  function bindQuizNav() {
    document.getElementById("wishQuizPrev")?.addEventListener("click", () => {
      const inp = document.getElementById("wishQuizInput");
      if (inp) {
        const st = loadState();
        st.lifeWishes = normalizeLifeWishes(st.lifeWishes);
        st.lifeWishes.quizAnswers[quizStep] = inp.value.trim();
        saveState(st);
      }
      if (quizStep > 0) {
        quizStep--;
        renderQuizStep();
      }
    });
    document.getElementById("wishQuizNext")?.addEventListener("click", () => {
      const inp = document.getElementById("wishQuizInput");
      if (!inp || !inp.value.trim()) {
        alert("先写一点再往下。");
        return;
      }
      const st = loadState();
      st.lifeWishes = normalizeLifeWishes(st.lifeWishes);
      st.lifeWishes.quizAnswers[quizStep] = inp.value.trim();
      saveState(st);
      if (quizStep < QUIZ.length) quizStep++;
      if (quizStep >= QUIZ.length) {
        [0, 1, 2].forEach((i) => {
          st.lifeWishes.wishes[i] = st.lifeWishes.quizAnswers[i] || st.lifeWishes.wishes[i];
        });
        st.lifeWishes.completedAt = st.lifeWishes.completedAt || new Date().toISOString();
        saveState(st);
      }
      renderQuizStep();
      if (quizStep >= QUIZ.length) renderWishesPanel();
      renderHomeWishes();
    });
  }

  function birthdayBlockHtml(birthday, locked) {
    const b = birthday || "";
    return `
      <div class="birthday-block">
        <label for="birthdayInput">生日（锁定前必填）</label>
        <input type="text" id="birthdayInput" inputmode="numeric" placeholder="月-日，如 08-29" value="${escapeHtml(b)}" ${locked ? "" : ""} />
        <p class="birthday-hint">${locked ? "本次到期日已按定稿时的生日对齐，改生日不影响这一轮。" : "定稿后锁 365 天，到期日再对齐到你的下一个生日。"}</p>
      </div>`;
  }

  function bindBirthdayInput() {
    const inp = document.getElementById("birthdayInput");
    if (!inp) return;
    inp.addEventListener("change", function () {
      const locked = isWishesLocked(normalizeLifeWishes(loadState().lifeWishes));
      saveBirthdayFromInput();
      if (!locked) renderHomeWishes();
    });
  }

  function renderHomeWishes() {
    const host = document.getElementById("wishHomeHost");
    if (!host || typeof loadState !== "function") return;
    const st = loadState();
    const lw = normalizeLifeWishes(st.lifeWishes);
    const birthday = getBirthday(st);
    const locked = isWishesLocked(lw);
    const until = wishesLockedUntil(lw, birthday);
    const yearly = needsYearlyWishReview(lw);
    const hasWishes = lw.completedAt || lw.wishes.some((w) => w && w.trim());

    if (!hasWishes) {
      host.innerHTML =
        birthdayBlockHtml(birthday, false) +
        `
        <p class="wish-home-lead">若人生只能许三个愿望，你会选哪三个？定稿后 <strong>365 天不可改</strong>，到期对齐生日；不设提醒。</p>
        <div class="wish-quiz-nav">
          <button type="button" class="btn-ghost-sm" id="wishQuizPrev">上一问</button>
          <button type="button" class="btn-ghost-sm" id="wishQuizNext">下一问</button>
        </div>
        <div id="wishQuizHost"></div>`;
      bindBirthdayInput();
      bindQuizNav();
      renderQuizStep();
      return;
    }

    let html = birthdayBlockHtml(birthday, locked);
    if (locked && until) {
      html += `<p class="lock-badge">三愿已锁定 · 至 ${formatDate(until)} 不可修改</p>`;
    }
    html += `<ol class="wish-home-list">${[0, 1, 2]
      .map(
        (i) =>
          `<li><span class="wish-home-num">${i + 1}</span><span class="wish-home-text">${escapeHtml(lw.wishes[i] || "—")}</span></li>`
      )
      .join("")}</ol>`;
    if (yearly) {
      html += `
        <div class="yearly-review-box">
          <p class="card-title">年度复盘 · ${new Date().getFullYear()}</p>
          <p class="card-desc">一年一度，回看三愿是否仍值得奔赴。</p>
          <textarea id="yearlyReviewNote" rows="3" placeholder="这一年的靠近与偏差…"></textarea>
          <button type="button" class="btn-save-wish" id="saveYearlyReviewBtn">保存年度复盘</button>
        </div>`;
    } else if ((lw.yearlyReviews || []).length) {
      const last = lw.yearlyReviews[lw.yearlyReviews.length - 1];
      html += `<p class="card-desc yearly-done">已于 ${last.year} 年复盘</p>`;
    } else {
      const eligible = yearlyReviewEligibleAt(lw);
      if (eligible && Date.now() < eligible.getTime()) {
        html += `<p class="card-desc wish-year-wait">压箱底中 · ${formatDate(eligible)} 起可改、可复盘</p>`;
      }
    }
    host.innerHTML = html;
    bindBirthdayInput();

    document.getElementById("saveYearlyReviewBtn")?.addEventListener("click", () => {
      const note = (document.getElementById("yearlyReviewNote") || {}).value?.trim() || "";
      if (!note) {
        alert("写一句年度复盘再保存。");
        return;
      }
      const st2 = loadState();
      st2.lifeWishes = normalizeLifeWishes(st2.lifeWishes);
      const year = new Date().getFullYear();
      st2.lifeWishes.yearlyReviews = (st2.lifeWishes.yearlyReviews || []).filter((r) => r.year !== year);
      st2.lifeWishes.yearlyReviews.push({ year, note, reviewedAt: new Date().toISOString() });
      saveState(st2);
      renderHomeWishes();
      if (typeof showToast === "function") showToast("savedNotebookToast");
    });
  }

  function bindSaveWishes() {
    document.getElementById("saveWishesBtn")?.addEventListener("click", saveLifeWishesFromForm);
  }

  window.LixingV1 = {
    normalizeLifeWishes,
    defaultLifeWishes,
    normalizeDailyEntry,
    extractKeyword,
    setDailyFields,
    getDailyFields,
    refreshHome() {
      paintWishFeeling(
        (document.getElementById("dailyWish") || {}).value || "",
        (document.getElementById("dailyFeeling") || {}).value || ""
      );
      [1, 2, 3].forEach((i) => syncHomeFromText(i));
      unlockCols();
      updateFeelingNudge();
      updateHarvestDensityHint();
    },
    renderKeywords,
    renderHarvestPanel,
    collectHarvestWins,
    renderWishSummary,
    renderWishesPanel,
    renderHomeWishes,
    updateFeelingNudge,
    updateHarvestDensityHint,
    isWishesLocked,
    needsYearlyWishReview,
    dayDensity,
    silentDensity,
    harvestCount,
    harvestsForSpoke,
    renderSpokeEvidence,
    spokeLabel,
    inferSpoke,
    getBirthday,
    normalizeBirthday,
    init() {
      document.getElementById("panel-wishes")?.addEventListener("click", (e) => {
        if (e.target.id === "lockSixMonthBtn") lockSixMonth();
      });
      bindQuizNav();
      bindSaveWishes();
      renderKeywords();
      renderHarvestPanel();
      renderWishSummary();
      renderWishesPanel();
      renderHomeWishes();
      initAskFlow();
      [1, 2, 3].forEach(function (i) {
        const el = document.getElementById("harvest" + i);
        if (!el) return;
        el.addEventListener("input", updateHarvestDensityHint);
        el.addEventListener("change", updateHarvestDensityHint);
      });
      updateHarvestDensityHint();
    },
  };
})();

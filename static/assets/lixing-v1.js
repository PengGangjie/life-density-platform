/**
 * 砺行 v1：工作外三事、人生三愿、周/月/年关键词
 * 依赖 index.html 中的 loadState / saveState / todayStr / showToast
 */
(function () {
  "use strict";

  const SIX_MONTH_MS = 183 * 24 * 3600 * 1000;

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
      sixMonth: {
        lines: Array.isArray(w.sixMonth && w.sixMonth.lines)
          ? w.sixMonth.lines.slice(0, 3).concat(["", "", ""]).slice(0, 3)
          : base.sixMonth.lines,
        lockedAt: (w.sixMonth && w.sixMonth.lockedAt) || "",
      },
    };
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
        ...(e.three || []),
        e.harvest,
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

  function getDailyFields() {
    return {
      three: [1, 2, 3].map((i) => {
        const el = document.getElementById("three" + i);
        return el ? el.value.trim() : "";
      }),
      harvest: (document.getElementById("harvest") || {}).value?.trim() || "",
      thickness: (document.getElementById("thickness") || {}).value?.trim() || "",
    };
  }

  function setDailyFields(e) {
    const entry = e || {};
    const three = entry.three || ["", "", ""];
    [1, 2, 3].forEach((i) => {
      const el = document.getElementById("three" + i);
      if (el) el.value = three[i - 1] || "";
    });
    const harvestEl = document.getElementById("harvest");
    const thickEl = document.getElementById("thickness");
    const noteEl = document.getElementById("note");
    const harvest = entry.harvest || entry.note || "";
    if (harvestEl) harvestEl.value = harvest;
    if (thickEl) thickEl.value = entry.thickness || "";
    if (noteEl && !entry.harvest) noteEl.value = entry.note || "";
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
        <p class="card-desc">把三个回答收成三条愿望（可再改字）：</p>
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
        const st = loadState();
        st.lifeWishes = normalizeLifeWishes(st.lifeWishes);
        [0, 1, 2].forEach((i) => {
          const el = document.getElementById("wishFinal" + i);
          if (el) st.lifeWishes.wishes[i] = el.value.trim();
        });
        st.lifeWishes.completedAt = st.lifeWishes.completedAt || new Date().toISOString();
        saveState(st);
        quizStep = 0;
        renderWishesPanel();
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
    const lw = normalizeLifeWishes(loadState().lifeWishes);
    const locked = isSixMonthLocked(lw);
    const until = sixMonthLockedUntil(lw.sixMonth.lockedAt);

    const lifeList = document.getElementById("lifeWishList");
    if (lifeList) {
      lifeList.innerHTML = [0, 1, 2]
        .map(
          (i) => `
        <div class="field"><label for="lifeWish${i}">人生愿望 ${i + 1}</label>
        <input type="text" id="lifeWish${i}" value="${escapeHtml(lw.wishes[i] || "")}" ${
            lw.completedAt ? "" : ""
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
    });
  }

  function bindSaveWishes() {
    document.getElementById("saveWishesBtn")?.addEventListener("click", saveLifeWishesFromForm);
  }

  window.LixingV1 = {
    normalizeLifeWishes,
    defaultLifeWishes,
    setDailyFields,
    getDailyFields,
    renderKeywords,
    renderWishSummary,
    renderWishesPanel,
    init() {
      document.getElementById("panel-wishes")?.addEventListener("click", (e) => {
        if (e.target.id === "lockSixMonthBtn") lockSixMonth();
      });
      bindQuizNav();
      bindSaveWishes();
      renderKeywords();
      renderWishSummary();
      renderWishesPanel();
    },
  };
})();

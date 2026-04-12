(function () {
  "use strict";

  const LS_KEY = "codenameHistory";

  let WORDS          = [];
  let allCategories  = [];
  let activeCategories = new Set();
  let history        = [];

  // ── Helpers ───────────────────────────────────────────────────────────────

  function pick(pool) {
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // ── Generate ──────────────────────────────────────────────────────────────

  function generate() {
    const errorEl = document.getElementById("gen-error");
    const limitVal = parseInt(document.getElementById("char-limit").value, 10);
    const maxLen = limitVal >= 2 ? limitVal : 0;

    const filtered = activeCategories.size > 0
      ? WORDS.filter((w) => activeCategories.has(w.category))
      : WORDS;

    if (filtered.length < 2) {
      errorEl.textContent = "Select at least two words across active categories.";
      errorEl.classList.remove("hidden");
      return;
    }

    let w1, w2, attempts = 0;
    const maxAttempts = 500;
    do {
      w1 = pick(filtered);
      const pool2 = filtered.filter((w) => w.word !== w1.word);
      w2 = pick(pool2);
      attempts++;
    } while (maxLen && (w1.word.length + w2.word.length) > maxLen && attempts < maxAttempts);

    if (maxLen && (w1.word.length + w2.word.length) > maxLen) {
      errorEl.textContent = "No combination fits under " + maxLen + " characters. Try a higher limit or more categories.";
      errorEl.classList.remove("hidden");
      return;
    }

    errorEl.classList.add("hidden");

    const full  = w1.word + w2.word;
    const short = w1.word.slice(0, 2) + w2.word.slice(0, 2);
    const entry = { full, short };

    history.unshift(entry);
    localStorage.setItem(LS_KEY, JSON.stringify(history));

    renderResult(entry);
    renderHistory();
  }

  // ── Renderers ─────────────────────────────────────────────────────────────

  function renderResult(entry) {
    document.getElementById("result-full").textContent  = entry.full;
    document.getElementById("result-short").textContent = entry.short;
    document.getElementById("result").classList.remove("hidden");
  }

  function renderCategoryFilters() {
    const container = document.getElementById("cat-filters");
    container.innerHTML = "";

    allCategories.forEach((cat) => {
      const btn = document.createElement("button");
      btn.className = "cat-btn" + (activeCategories.has(cat) ? " active" : "");
      btn.textContent = cat;
      btn.addEventListener("click", () => {
        if (activeCategories.has(cat)) {
          activeCategories.delete(cat);
        } else {
          activeCategories.add(cat);
        }
        renderCategoryFilters();
      });
      container.appendChild(btn);
    });
  }

  function renderHistory() {
    const list    = document.getElementById("history-list");
    const emptyEl = document.getElementById("history-empty");
    const countEl = document.getElementById("history-count");

    countEl.textContent = `Generated (${history.length})`;

    if (history.length === 0) {
      list.innerHTML = "";
      emptyEl.classList.remove("hidden");
      return;
    }

    emptyEl.classList.add("hidden");
    list.innerHTML = "";

    const frag = document.createDocumentFragment();
    history.forEach((entry) => {
      const row = document.createElement("div");
      row.className = "history-row";

      const full = document.createElement("span");
      full.className = "history-full";
      full.textContent = entry.full;

      const short = document.createElement("span");
      short.className = "history-short";
      short.textContent = entry.short;

      row.append(full, short);
      frag.appendChild(row);
    });
    list.appendChild(frag);
  }

  // ── Clear ─────────────────────────────────────────────────────────────────

  function clearHistory() {
    history = [];
    localStorage.removeItem(LS_KEY);
    document.getElementById("result").classList.add("hidden");
    renderHistory();
  }

  // ── Lookup ────────────────────────────────────────────────────────────────

  function lookup() {
    const raw      = document.getElementById("lookup-input").value.trim().toUpperCase();
    const errEl    = document.getElementById("lookup-error");
    const resultsEl = document.getElementById("lookup-results");

    if (!/^[A-Z]{4}$/.test(raw)) {
      errEl.textContent = "Enter exactly 4 letters.";
      errEl.classList.remove("hidden");
      resultsEl.classList.add("hidden");
      return;
    }

    errEl.classList.add("hidden");

    const p1 = raw.slice(0, 2);
    const p2 = raw.slice(2, 4);

    const matches1 = WORDS.filter((w) => w.word.startsWith(p1)).map((w) => w.word);
    const matches2 = WORDS.filter((w) => w.word.startsWith(p2)).map((w) => w.word);

    document.getElementById("lookup-label-1").textContent = `${p1}\u2026 \u2192 first word`;
    document.getElementById("lookup-label-2").textContent = `${p2}\u2026 \u2192 second word`;

    [
      [matches1, document.getElementById("lookup-matches-1")],
      [matches2, document.getElementById("lookup-matches-2")],
    ].forEach(([matches, container]) => {
      container.innerHTML = "";
      if (matches.length === 0) {
        const none = document.createElement("span");
        none.className = "lookup-none";
        none.textContent = "no matches";
        container.appendChild(none);
        return;
      }
      matches.forEach((word) => {
        const chip = document.createElement("span");
        chip.className = "lookup-chip";
        chip.textContent = word;
        container.appendChild(chip);
      });
    });

    resultsEl.classList.remove("hidden");
  }

  // ── Theme ─────────────────────────────────────────────────────────────────

  function applyTheme(isLight) {
    document.body.classList.toggle("light", isLight);
    const btn = document.getElementById("theme-btn");
    if (btn) btn.textContent = isLight ? "\u263D" : "\u2600";
  }

  // ── Init ──────────────────────────────────────────────────────────────────

  async function init() {
    try {
      const res = await fetch("wordlist.json");
      const grouped = await res.json();
      WORDS = [];
      for (const [category, words] of Object.entries(grouped)) {
        for (const word of words) WORDS.push({ word, category });
      }
    } catch {
      WORDS = [];
    }

    allCategories = [...new Set(WORDS.map((w) => w.category))].sort();
    activeCategories = new Set(allCategories);

    history = JSON.parse(localStorage.getItem(LS_KEY) || "[]");

    applyTheme(localStorage.getItem("siteTheme") === "light");
    document.getElementById("theme-btn").addEventListener("click", () => {
      const nowLight = !document.body.classList.contains("light");
      applyTheme(nowLight);
      localStorage.setItem("siteTheme", nowLight ? "light" : "dark");
    });

    document.getElementById("generate-btn").addEventListener("click", generate);
    document.getElementById("clear-btn").addEventListener("click", clearHistory);

    const filterToggle = document.getElementById("filter-toggle");
    const catFilters   = document.getElementById("cat-filters");
    filterToggle.addEventListener("click", () => {
      catFilters.classList.toggle("hidden");
      filterToggle.classList.toggle("open");
    });

    document.getElementById("lookup-btn").addEventListener("click", lookup);
    document.getElementById("lookup-input").addEventListener("keydown", (e) => {
      if (e.key === "Enter") lookup();
    });
    document.getElementById("lookup-input").addEventListener("input", (e) => {
      if (e.target.value.replace(/[^a-zA-Z]/g, "").length === 4) lookup();
    });

    renderCategoryFilters();
    renderHistory();
  }

  document.addEventListener("DOMContentLoaded", init);
})();

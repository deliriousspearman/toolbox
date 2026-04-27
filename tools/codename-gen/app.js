(function () {
  "use strict";

  const LS_KEY = "codenameHistory";

  let WORDS          = [];
  let allCategories  = [];
  let activeCategories = new Set();
  let history        = [];
  let pendingFlash   = false;   // true while a fresh entry is waiting to be highlighted
  let toastTimer     = null;

  // ── Helpers ───────────────────────────────────────────────────────────────

  function pick(pool) {
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function showToast(msg) {
    const t = document.getElementById("toast");
    if (!t) return;
    t.textContent = msg;
    t.classList.add("visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("visible"), 1800);
  }

  /* Copy text to the clipboard. Uses the async Clipboard API when
     available and falls back to the hidden-textarea execCommand path
     for older browsers / file:// contexts.                           */
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise((resolve) => {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity  = "0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); } catch (e) { console.warn("copyText fallback failed", e); }
      ta.remove();
      resolve();
    });
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
    safeStorage.save(LS_KEY, JSON.stringify(history));

    pendingFlash = true;
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
    history.forEach((entry, idx) => {
      const row = document.createElement("div");
      row.className = "history-row";
      if (idx === 0 && pendingFlash) row.classList.add("history-flash");

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
    pendingFlash = false;
  }

  // ── Clear ─────────────────────────────────────────────────────────────────

  function clearHistory() {
    history = [];
    safeStorage.remove(LS_KEY);
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
        const chip = document.createElement("button");
        chip.className = "lookup-chip";
        chip.type = "button";
        chip.textContent = word;
        chip.title = "Click to copy";
        chip.addEventListener("click", () => {
          copyText(word).then(() => {
            chip.classList.remove("chip-flash");
            /* Force reflow so the keyframe restarts on repeated clicks. */
            void chip.offsetWidth;
            chip.classList.add("chip-flash");
            showToast('copied "' + word + '"');
          });
        });
        container.appendChild(chip);
      });
    });

    resultsEl.classList.remove("hidden");
  }

  // ── Theme ─────────────────────────────────────────────────────────────────

  // ── Init ──────────────────────────────────────────────────────────────────

  async function init() {
    try {
      const res = await fetch("wordlist.json");
      const grouped = await res.json();
      WORDS = [];
      for (const [category, words] of Object.entries(grouped)) {
        for (const word of words) WORDS.push({ word, category });
      }
    } catch (e) {
      console.warn("codename-gen: wordlist.json load failed", e);
      WORDS = [];
    }

    allCategories = [...new Set(WORDS.map((w) => w.category))].sort();
    activeCategories = new Set(allCategories);

    /* Wordlist loaded — restore the buttons from their "LOADING…"
       placeholder state set in the HTML.                           */
    const genBtn = document.getElementById("generate-btn");
    const lookupBtn = document.getElementById("lookup-btn");
    genBtn.disabled = false;
    genBtn.textContent = "GENERATE";
    lookupBtn.disabled = false;
    lookupBtn.textContent = "DECODE";

    history = JSON.parse(safeStorage.get(LS_KEY) || "[]");

    siteTheme.init();

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

(function () {
  "use strict";

  /* Short getElementById wrapper that throws a descriptive error when
     the id goes missing, so an HTML/JS drift becomes a greppable
     message instead of a null-access crash inside a modal render.   */
  function $(id) {
    const el = document.getElementById(id);
    if (!el) throw new Error("procwordle: missing element #" + id);
    return el;
  }

  const MAX_GUESSES = 5;
  /* State was keyed on "processWordle" (one slot, today only). With the
     archive feature we key per-day as "processWordle:YYYY-MM-DD", so a
     past day's board survives navigation and replaying the same past
     day keeps its guesses.                                             */
  const STORAGE_KEY_BASE = "processWordle";
  function storageKey(dateStr) { return STORAGE_KEY_BASE + ":" + dateStr; }
  // Local-midnight epoch so the date string and the daily word index both
  // advance at the player's local midnight. Using a UTC epoch here while
  // getDailyWord uses local midnight caused a daily window where the two
  // disagreed for users west of UTC.
  const EPOCH       = new Date(2025, 0, 1);

  /* Seeded shuffle of the word list so the daily rotation doesn't walk
     through words.js in source order (which is grouped by length — 56
     three-letter entries first, then 83 four-letter, etc. — producing
     long runs of the same length). A fixed-seed LCG keeps the shuffle
     deterministic: every player sees the same word on the same day.
     Changing WORDS.length reshuffles the whole sequence, so edits to
     words.js will change past/future daily answers — the per-day save
     validates against the current word and resets stale boards.       */
  const DAILY_WORDS = (function () {
    const a = WORDS.slice();
    let s = 0xC0FFEE >>> 0;
    function rand() {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 0x100000000;
    }
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      const tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  })();

  const KEYBOARD_ROWS = [
    ["q","w","e","r","t","y","u","i","o","p"],
    ["a","s","d","f","g","h","j","k","l"],
    ["Enter","z","x","c","v","b","n","m","Backspace"],
  ];

  const EMOJI = { correct: "🟩", present: "🟨", absent: "⬛", penalty: "⬜" };

  const state = {
    word:         "",
    hint:         "",
    wordLen:      0,
    date:         "",
    guesses:      [],
    currentInput: "",
    gameOver:     false,
    won:          false,
    hintRevealed: false,
    hintRow:      -1,
  };

  // ── Utilities ───────────────────────────────────────────

  function formatLocalDate(date) {
    const y  = date.getFullYear();
    const m  = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
  }

  function getTodayString() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return formatLocalDate(d);
  }

  function getTargetDate(offset) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return new Date(d.getTime() + offset * 86400000);
  }

  function getDailyWordAt(offset) {
    const target = getTargetDate(offset);
    const days = Math.floor((target - EPOCH) / 86400000);
    // Normalise modulo so a pre-epoch clock (negative days) still maps to a
    // valid index rather than producing undefined.
    const index = ((days % DAILY_WORDS.length) + DAILY_WORDS.length) % DAILY_WORDS.length;
    return DAILY_WORDS[index];
  }

  // ── Feedback ────────────────────────────────────────────

  function computeFeedback(guess, answer) {
    const result        = Array(answer.length).fill("absent");
    const answerLetters = answer.split("");
    const guessLetters  = guess.split("");

    // Pass 1: exact matches
    for (let i = 0; i < answer.length; i++) {
      if (guessLetters[i] === answerLetters[i]) {
        result[i]        = "correct";
        answerLetters[i] = null;
        guessLetters[i]  = null;
      }
    }

    // Pass 2: present but wrong position
    for (let i = 0; i < answer.length; i++) {
      if (guessLetters[i] === null) continue;
      const idx = answerLetters.indexOf(guessLetters[i]);
      if (idx !== -1) {
        result[i]          = "present";
        answerLetters[idx] = null;
      }
    }

    return result;
  }

  // ── Storage ─────────────────────────────────────────────

  function saveState() {
    safeStorage.save(storageKey(state.date), JSON.stringify({
      date:         state.date,
      /* Stored so we can invalidate the board if the underlying daily
         word for this date changes (e.g. words.js was edited, or the
         shuffle seed / length shifted). Without it a user could see
         their old guesses coloured against a different answer.       */
      word:         state.word,
      guesses:      state.guesses,
      currentInput: state.currentInput,
      gameOver:     state.gameOver,
      won:          state.won,
      hintRevealed: state.hintRevealed,
      hintRow:      state.hintRow,
    }));
  }

  function loadStateForDay(dateStr) {
    const raw = safeStorage.get(storageKey(dateStr));
    if (!raw) return null;
    try { return JSON.parse(raw); }
    catch (e) { console.warn("procwordle: saved state unparseable for " + dateStr, e); return null; }
  }

  /* One-shot migration: older builds stored today's game under the bare
     "processWordle" key. Move that record to its per-day slot and drop
     the legacy key, so the rest of the code can assume per-day storage. */
  function migrateLegacyState() {
    const raw = safeStorage.get(STORAGE_KEY_BASE);
    if (!raw) return;
    try {
      const saved = JSON.parse(raw);
      if (saved && typeof saved.date === "string") {
        const targetKey = storageKey(saved.date);
        if (!safeStorage.get(targetKey)) {
          safeStorage.save(targetKey, raw);
        }
      }
    } catch (e) { console.warn("procwordle: legacy state unparseable, dropping", e); }
    safeStorage.remove(STORAGE_KEY_BASE);
  }

  // ── Stats (persistent, survive the archive prune) ────────
  /* Separate from the per-day boards because those roll off after
     MAX_DAYS_BACK. Stats live forever under "procWordleStats" —
     a dict keyed by date so replays overwrite rather than duplicate. */

  const STATS_KEY = "procWordleStats";

  function loadStats() {
    try { return JSON.parse(safeStorage.get(STATS_KEY) || "{}"); }
    catch (e) { console.warn("procwordle: stats unparseable, starting over", e); return {}; }
  }

  function recordStat() {
    const stats = loadStats();
    stats[state.date] = {
      date:     state.date,
      won:      !!state.won,
      guesses:  state.guesses.length,
      hintUsed: !!state.hintRevealed,
      hardMode: !!hardMode,
    };
    safeStorage.save(STATS_KEY, JSON.stringify(stats));
  }

  function computeStats() {
    const stats = loadStats();
    const entries = Object.values(stats);
    const played = entries.length;
    const wins   = entries.filter(e => e.won).length;
    /* Distribution of winning guess counts, 1..MAX_GUESSES. Losses
       aren't bucketed — they appear in the "played - wins" difference. */
    const dist = Array(MAX_GUESSES).fill(0);
    for (const e of entries) {
      if (e.won && e.guesses >= 1 && e.guesses <= MAX_GUESSES) dist[e.guesses - 1]++;
    }
    /* Current streak walks back from today until it hits a day that
       wasn't won (or wasn't played). Max streak scans all recorded
       wins for the longest consecutive run of dates.                 */
    let current = 0;
    const cursor = new Date();
    cursor.setHours(0, 0, 0, 0);
    while (true) {
      const key = formatLocalDate(cursor);
      const e   = stats[key];
      if (!e || !e.won) break;
      current++;
      cursor.setDate(cursor.getDate() - 1);
    }
    const winDates = Object.keys(stats).filter(k => stats[k].won).sort();
    let max = 0, run = 0, prev = null;
    for (const k of winDates) {
      if (prev) {
        const pDate = new Date(prev + "T00:00:00");
        pDate.setDate(pDate.getDate() + 1);
        run = formatLocalDate(pDate) === k ? run + 1 : 1;
      } else {
        run = 1;
      }
      if (run > max) max = run;
      prev = k;
    }
    return { played, wins, dist, current, max };
  }

  function renderStatsModal() {
    const s = computeStats();
    const winPct = s.played === 0 ? 0 : Math.round((s.wins / s.played) * 100);
    document.getElementById("stat-played").textContent = s.played;
    document.getElementById("stat-winpct").textContent = winPct;
    document.getElementById("stat-cur").textContent    = s.current;
    document.getElementById("stat-max").textContent    = s.max;

    /* Distribution bars: width proportional to count relative to max
       bucket; bucket matching the current game (if won) is accented. */
    const wrap = document.getElementById("stats-dist");
    wrap.textContent = "";
    const peak = Math.max(1, ...s.dist);
    const currentBucket = (state.gameOver && state.won) ? state.guesses.length : -1;
    for (let i = 0; i < s.dist.length; i++) {
      const count = s.dist[i];
      const row = document.createElement("div");
      row.className = "dist-row";
      const label = document.createElement("div");
      label.className = "dist-row-label";
      label.textContent = String(i + 1);
      const bar = document.createElement("div");
      bar.className = "dist-row-bar" + ((i + 1) === currentBucket ? " hilite" : "");
      bar.style.width = Math.max(8, (count / peak) * 100) + "%";
      bar.textContent = String(count);
      row.append(label, bar);
      wrap.appendChild(row);
    }
  }

  function openStats() {
    renderStatsModal();
    document.getElementById("stats-modal").classList.remove("hidden");
  }

  function closeStats() {
    document.getElementById("stats-modal").classList.add("hidden");
  }

  /* Drop any per-day save that's outside the current archive window.
     YYYY-MM-DD strings sort lexicographically so string compare works
     in place of date math. Called once from init() after migration
     but before applyDayState, so today's load never hits pruned data. */
  function pruneStaleArchive() {
    const prefix  = STORAGE_KEY_BASE + ":";
    const today   = getTodayString();
    const cutoff  = formatLocalDate(getTargetDate(-MAX_DAYS_BACK));
    const toRemove = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k || !k.startsWith(prefix)) continue;
        const dateStr = k.slice(prefix.length);
        if (dateStr < cutoff || dateStr > today) toRemove.push(k);
      }
    } catch (e) {
      console.warn("pruneStaleArchive enumeration failed", e);
      return;
    }
    for (const k of toRemove) safeStorage.remove(k);
  }

  // ── Helpers ─────────────────────────────────────────────

  function getEffectiveMax() {
    return MAX_GUESSES - (state.hintRevealed ? 1 : 0);
  }

  function toVisualRow(guessIndex) {
    return (state.hintRevealed && guessIndex >= state.hintRow) ? guessIndex + 1 : guessIndex;
  }

  // ── Rendering ───────────────────────────────────────────

  function renderGrid() {
    const grid = document.getElementById("grid");
    grid.innerHTML = "";
    grid.style.setProperty("--cols", state.wordLen);

    for (let r = 0; r < MAX_GUESSES; r++) {
      const row = document.createElement("div");
      row.className = "row";
      row.style.setProperty("--cols", state.wordLen);

      if (state.hintRevealed && r === state.hintRow) {
        // Greyed-out penalty row — marks where the hint was used
        row.classList.add("hint-penalty");
        for (let c = 0; c < state.wordLen; c++) {
          const cell = document.createElement("div");
          cell.className = "cell empty";
          row.appendChild(cell);
        }
      } else {
        // Map visual row index to guess index (shift down by 1 past the penalty row)
        const g = (state.hintRevealed && r > state.hintRow) ? r - 1 : r;

        if (g < state.guesses.length) {
          // Submitted row
          const feedback = computeFeedback(state.guesses[g], state.word);
          for (let c = 0; c < state.wordLen; c++) {
            const cell = document.createElement("div");
            cell.className = `cell ${feedback[c]}`;
            const letter = state.guesses[g][c];
            cell.textContent = letter.toUpperCase();
            cell.setAttribute("aria-label", `${letter.toUpperCase()}, ${feedback[c]}`);
            row.appendChild(cell);
          }
        } else if (g === state.guesses.length && !state.gameOver) {
          // Active input row
          for (let c = 0; c < state.wordLen; c++) {
            const cell  = document.createElement("div");
            const letter = state.currentInput[c] || "";
            cell.className  = `cell ${letter ? "filled" : "empty"}`;
            cell.textContent = letter.toUpperCase();
            if (letter) cell.setAttribute("aria-label", `${letter.toUpperCase()}, pending`);
            row.appendChild(cell);
          }
        } else {
          // Future empty row
          for (let c = 0; c < state.wordLen; c++) {
            const cell = document.createElement("div");
            cell.className = "cell empty";
            row.appendChild(cell);
          }
        }
      }

      grid.appendChild(row);
    }
  }

  function computeKeyboardState() {
    const priority = { correct: 3, present: 2, absent: 1 };
    const keyState = {};
    for (const guess of state.guesses) {
      const feedback = computeFeedback(guess, state.word);
      for (let i = 0; i < guess.length; i++) {
        const letter = guess[i];
        const status = feedback[i];
        if ((priority[status] || 0) > (priority[keyState[letter]] || 0)) {
          keyState[letter] = status;
        }
      }
    }
    return keyState;
  }

  function renderKeyboard() {
    const keyState = computeKeyboardState();
    document.querySelectorAll(".key[data-key]").forEach(btn => {
      const k = btn.dataset.key;
      btn.className = "key" + (k.length > 1 ? " wide" : "");
      if (keyState[k]) btn.classList.add(keyState[k]);
    });
  }

  function buildKeyboard() {
    const kb = document.getElementById("keyboard");
    kb.innerHTML = "";
    for (const row of KEYBOARD_ROWS) {
      const rowEl = document.createElement("div");
      rowEl.className = "key-row";
      for (const key of row) {
        const btn = document.createElement("button");
        btn.className  = "key" + (key.length > 1 ? " wide" : "");
        btn.dataset.key = key;
        btn.textContent = key === "Backspace" ? "⌫" : key;
        btn.addEventListener("click", () => handleKey(key));
        rowEl.appendChild(btn);
      }
      kb.appendChild(rowEl);
    }
  }

  function renderHint() {
    const hintText = document.getElementById("hint-text");
    const hintBtn  = document.getElementById("hint-btn");
    const showHint = state.hintRevealed || state.gameOver;
    hintText.style.display = showHint ? "" : "none";
    hintBtn.style.display  = showHint ? "none" : "";
    if (!showHint) {
      hintBtn.disabled = state.guesses.length >= MAX_GUESSES - 1;
    }
  }

  function renderAll() {
    renderGrid();
    renderKeyboard();
    renderHint();
  }

  // ── Sounds ──────────────────────────────────────────────

  function _playNotes(notes) {
    if (!soundEnabled) return;
    const ctx = new AudioContext();
    let t = ctx.currentTime;
    notes.forEach(({ freq, dur }) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "square";
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.start(t);
      osc.stop(t + dur);
      t += dur * 0.85;
    });
  }

  function playWinSound() {
    // Rising C major arpeggio — C5 E5 G5 C6
    _playNotes([
      { freq: 523.25,  dur: 0.09 },
      { freq: 659.25,  dur: 0.09 },
      { freq: 783.99,  dur: 0.09 },
      { freq: 1046.50, dur: 0.28 },
    ]);
  }

  function playLoseSound() {
    // Descending minor fall — G4 F4 Eb4 C4
    _playNotes([
      { freq: 392.00, dur: 0.13 },
      { freq: 349.23, dur: 0.13 },
      { freq: 311.13, dur: 0.13 },
      { freq: 261.63, dur: 0.35 },
    ]);
  }

  // ── Animations ──────────────────────────────────────────

  function animateFlip(rowIndex, callback) {
    const rows = document.getElementById("grid").children;
    if (!rows[rowIndex]) return;
    const cells = rows[rowIndex].children;
    const totalDuration = (cells.length - 1) * 150 + 450;

    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      cell.style.animationDelay = `${i * 150}ms`;
      cell.classList.add("flip");
    }

    setTimeout(callback, totalDuration + 50);
  }

  function animateBounce(rowIndex, callback) {
    const rows = document.getElementById("grid").children;
    if (!rows[rowIndex]) { if (callback) callback(); return; }
    const cells = rows[rowIndex].children;
    const totalDuration = (cells.length - 1) * 100 + 600;

    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      cell.style.animationDelay = `${i * 100}ms`;
      cell.classList.add("bounce");
      cell.addEventListener("animationend", () => {
        cell.classList.remove("bounce");
        cell.style.animationDelay = "";
      }, { once: true });
    }

    setTimeout(callback, totalDuration + 50);
  }

  function shakeActiveRow() {
    const rows = document.getElementById("grid").children;
    const active = rows[toVisualRow(state.guesses.length)];
    if (!active) return;
    active.classList.remove("shake");
    void active.offsetWidth; // reflow to restart
    active.classList.add("shake");
    active.addEventListener("animationend", () => active.classList.remove("shake"), { once: true });
  }

  function popLastCell() {
    const rows = document.getElementById("grid").children;
    const active = rows[toVisualRow(state.guesses.length)];
    if (!active) return;
    const cells = active.children;
    const lastFilled = state.currentInput.length - 1;
    if (lastFilled < 0 || !cells[lastFilled]) return;
    const cell = cells[lastFilled];
    cell.classList.remove("pop");
    void cell.offsetWidth;
    cell.classList.add("pop");
    cell.addEventListener("animationend", () => cell.classList.remove("pop"), { once: true });
  }

  // ── Input ────────────────────────────────────────────────

  // Flag so we only toast the "game over" hint once per session rather
  // than on every ignored keystroke.
  let gameOverToastShown = false;

  function handleKey(key) {
    if (state.gameOver) {
      // Only announce for actual gameplay keys; modifier keys and Escape
      // are handled by other listeners and shouldn't trigger the toast.
      if (!gameOverToastShown && (key === "Enter" || key === "Backspace" || /^[a-zA-Z]$/.test(key))) {
        showToast(state.won ? "already solved — new word tomorrow" : "game over — new word tomorrow");
        gameOverToastShown = true;
      }
      return;
    }

    if (key === "Enter") {
      submitGuess();
    } else if (key === "Backspace") {
      if (state.currentInput.length === 0) return;
      state.currentInput = state.currentInput.slice(0, -1);
      saveState();
      renderAll();
    } else if (/^[a-zA-Z]$/.test(key) && state.currentInput.length < state.wordLen) {
      state.currentInput += key.toLowerCase();
      saveState();
      renderAll();
      popLastCell();
    }
  }

  function submitGuess() {
    if (state.currentInput.length !== state.wordLen) {
      shakeActiveRow();
      return;
    }

    if (hardMode && state.guesses.length > 0) {
      const violation = getHardModeViolation(state.currentInput);
      if (violation) {
        showToast(violation);
        shakeActiveRow();
        return;
      }
    }

    const guess      = state.currentInput;
    const rowIndex   = state.guesses.length;
    state.guesses.push(guess);
    state.currentInput = "";

    const won = guess === state.word;
    if (won) {
      state.gameOver = true;
      state.won      = true;
    } else if (state.guesses.length >= getEffectiveMax()) {
      state.gameOver = true;
      state.won      = false;
    }

    if (state.gameOver) recordStat();

    // Announce the guess result for screen readers via the live region.
    const feedback = computeFeedback(guess, state.word);
    const parts = guess.split("").map((ch, i) => `${ch.toUpperCase()} ${feedback[i]}`);
    const msg = `Guess ${rowIndex + 1}: ${parts.join(", ")}` +
      (won ? ". You won!" : state.gameOver ? `. Game over, the answer was ${state.word.toUpperCase()}.` : "");
    const sr = document.getElementById("sr-status");
    if (sr) sr.textContent = msg;

    saveState();
    renderAll();

    // Animate the row that was just submitted, then show modal if needed
    const visualIndex = toVisualRow(rowIndex);
    animateFlip(visualIndex, () => {
      if (state.gameOver) {
        if (state.won) {
          playWinSound();
          const scanline = document.getElementById("scanline");
          scanline.classList.remove("active");
          void scanline.offsetWidth;
          scanline.classList.add("active");
          scanline.addEventListener("animationend", () => scanline.classList.remove("active"), { once: true });
          animateBounce(visualIndex, showEndModal);
        } else {
          playLoseSound();
          showEndModal();
        }
      }
    });
  }

  // ── Share / Clipboard ────────────────────────────────────

  function buildShareText() {
    const score  = state.won ? `${state.guesses.length}/${getEffectiveMax()}` : `X/${getEffectiveMax()}`;
    const header = `ProcWordle ${state.date} ${score}`;
    const rows   = state.guesses.map(guess =>
      computeFeedback(guess, state.word).map(s => EMOJI[s]).join("")
    );
    if (state.hintRevealed) {
      rows.splice(state.hintRow, 0, EMOJI.penalty.repeat(state.wordLen));
    }
    return [header, "", ...rows].join("\n");
  }

  function renderSharePreview() {
    const preview = document.getElementById("share-preview");
    const rows    = state.guesses.map(guess =>
      computeFeedback(guess, state.word).map(s => EMOJI[s]).join("")
    );
    if (state.hintRevealed) {
      rows.splice(state.hintRow, 0, EMOJI.penalty.repeat(state.wordLen));
    }
    preview.textContent = rows.join("\n");
  }

  // ── End Modal ────────────────────────────────────────────

  let countdownTimer = null;
  let hardMode       = false;
  let highContrast   = false;
  let soundEnabled   = true;
  let toastTimer     = null;

  function showEndModal() {
    const modal = $("modal");
    modal.classList.remove("hidden");

    $("modal-status").textContent =
      state.won ? "> PROCESS IDENTIFIED" : "> ACCESS DENIED";

    const wordEl = $("modal-word");
    if (!state.won) {
      wordEl.textContent = `Answer: ${state.word.toUpperCase()}`;
    } else {
      wordEl.textContent = "";
    }

    renderSharePreview();

    // Countdown
    function updateCountdown() {
      const now = new Date();
      const midnight = new Date();
      midnight.setHours(24, 0, 0, 0);
      const diff = midnight - now;
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      document.getElementById("modal-countdown").textContent =
        `Next process in: ${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    }
    updateCountdown();
    if (countdownTimer) clearInterval(countdownTimer);
    countdownTimer = setInterval(updateCountdown, 1000);

    // Copy button
    const copyBtn = document.getElementById("copy-btn");
    copyBtn.textContent = "COPY RESULTS";
    copyBtn.onclick = () => {
      const text = buildShareText();
      const done = () => {
        copyBtn.textContent = "COPIED!";
        setTimeout(() => { copyBtn.textContent = "COPY RESULTS"; }, 2000);
      };
      const fallback = () => {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity  = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        done();
      };
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(done).catch(fallback);
      } else {
        fallback();
      }
    };
  }

  function closeModal() {
    document.getElementById("modal").classList.add("hidden");
    if (countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
  }

  // ── Toast ────────────────────────────────────────────────

  function showToast(message, duration) {
    if (duration === undefined) duration = 1400;
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.classList.remove("fade");
    toast.classList.add("visible");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.add("fade");
      setTimeout(() => toast.classList.remove("visible", "fade"), 350);
    }, duration);
  }

  // ── Hard Mode validation ──────────────────────────────────

  function getHardModeViolation(input) {
    const ordinals = ["1st","2nd","3rd","4th","5th","6th","7th","8th","9th","10th"];
    const requiredAtPos  = {};
    const requiredAnywhere = new Set();

    for (const guess of state.guesses) {
      const feedback = computeFeedback(guess, state.word);
      for (let i = 0; i < feedback.length; i++) {
        if (feedback[i] === "correct") {
          requiredAtPos[i] = guess[i];
        } else if (feedback[i] === "present") {
          requiredAnywhere.add(guess[i]);
        }
      }
    }

    for (const [pos, letter] of Object.entries(requiredAtPos)) {
      if (input[+pos] !== letter) {
        return `${ordinals[+pos]} letter must be ${letter.toUpperCase()}`;
      }
    }

    for (const letter of requiredAnywhere) {
      if (!input.includes(letter)) {
        return `Must use ${letter.toUpperCase()}`;
      }
    }

    return null;
  }

  // ── Hint reveal ──────────────────────────────────────────

  function revealHint() {
    if (state.hintRevealed || state.gameOver) return;
    if (state.guesses.length >= MAX_GUESSES - 1) return;
    state.hintRow      = state.guesses.length;
    state.hintRevealed = true;
    saveState();
    showToast("Hint revealed — 1 guess deducted", 2000);
    renderAll();

    const penaltyRow = document.getElementById("grid").children[state.hintRow];
    if (penaltyRow) {
      penaltyRow.classList.add("hint-animating");
      penaltyRow.addEventListener("animationend", () => {
        penaltyRow.classList.remove("hint-animating");
      }, { once: true });
    }
  }

  // ── How To Play ──────────────────────────────────────────

  function closeHowToPlay() {
    document.getElementById("how-to-play").classList.add("hidden");
    safeStorage.save("procWordleHTP", "1");
  }

  function initHowToPlay() {
    if (!safeStorage.get("procWordleHTP")) {
      document.getElementById("how-to-play").classList.remove("hidden");
    }
    document.getElementById("htplay-close").addEventListener("click", closeHowToPlay);
    document.getElementById("how-to-play").addEventListener("click", (e) => {
      if (e.target === document.getElementById("how-to-play")) closeHowToPlay();
    });
  }

  // ── Settings ──────────────────────────────────────────────

  function applyHighContrast(on) {
    highContrast = on;
    document.body.classList.toggle("high-contrast", on);
    const btn = document.getElementById("toggle-contrast");
    if (btn) { btn.classList.toggle("on", on); btn.setAttribute("aria-checked", String(on)); }
  }

  function applyHardMode(on) {
    hardMode = on;
    const btn = document.getElementById("toggle-hard");
    if (btn) { btn.classList.toggle("on", on); btn.setAttribute("aria-checked", String(on)); }
  }

  function applySound(on) {
    soundEnabled = on;
    const btn = document.getElementById("toggle-sound");
    if (btn) { btn.classList.toggle("on", on); btn.setAttribute("aria-checked", String(on)); }
  }

  function openSettings() {
    document.getElementById("settings-modal").classList.remove("hidden");
    const locked = state.guesses.length > 0 && !state.gameOver;
    document.getElementById("toggle-hard").disabled = locked;
    document.getElementById("hard-mode-note").classList.toggle("hidden", !locked);
  }

  function closeSettings() {
    document.getElementById("settings-modal").classList.add("hidden");
  }

  function initSettings() {
    siteTheme.init();
    applyHighContrast(safeStorage.get("procWordleHC") === "1");
    applyHardMode(safeStorage.get("procWordleHard") === "1");
    applySound(safeStorage.get("procWordleSound") !== "0");

    document.getElementById("settings-btn").addEventListener("click", openSettings);
    document.getElementById("settings-close").addEventListener("click", closeSettings);
    document.getElementById("settings-modal").addEventListener("click", (e) => {
      if (e.target === document.getElementById("settings-modal")) closeSettings();
    });

    document.getElementById("toggle-contrast").addEventListener("click", () => {
      applyHighContrast(!highContrast);
      safeStorage.save("procWordleHC", highContrast ? "1" : "0");
    });

    document.getElementById("toggle-hard").addEventListener("click", () => {
      if (document.getElementById("toggle-hard").disabled) return;
      applyHardMode(!hardMode);
      safeStorage.save("procWordleHard", hardMode ? "1" : "0");
    });

    document.getElementById("toggle-sound").addEventListener("click", () => {
      applySound(!soundEnabled);
      safeStorage.save("procWordleSound", soundEnabled ? "1" : "0");
    });
  }

  // ── Day navigation ───────────────────────────────────────

  /* Archive window: users can go back up to this many days (plus
     today) — one week of playable puzzles. Increase carefully: the
     per-day state keys under this window stay in localStorage. */
  const MAX_DAYS_BACK = 6;

  let dayOffset = 0;

  /* Load the board for the currently-viewed day: set the target word
     from the daily rotation, reset in-memory state, then overlay any
     saved guesses/flags for that day. Called on init and every nav. */
  function applyDayState() {
    const target = getTargetDate(dayOffset);
    const daily  = getDailyWordAt(dayOffset);

    state.word    = daily.word;
    state.hint    = daily.hint;
    state.wordLen = daily.word.length;
    state.date    = formatLocalDate(target);

    state.guesses      = [];
    state.currentInput = "";
    state.gameOver     = false;
    state.won          = false;
    state.hintRevealed = false;
    state.hintRow      = -1;

    const saved = loadStateForDay(state.date);
    /* Only restore when the save is for this date AND its recorded
       word still matches what the rotation produces now. Any mismatch
       means words.js or the shuffle changed under us — keeping the
       guesses would colour them against a different answer, which is
       worse than a fresh board. Pre-word-field saves fall here too.   */
    if (saved && saved.date === state.date && saved.word === state.word) {
      state.guesses      = saved.guesses      || [];
      state.currentInput = saved.currentInput || "";
      state.gameOver     = saved.gameOver     || false;
      state.won          = saved.won          || false;
      state.hintRevealed = saved.hintRevealed || false;
      state.hintRow      = saved.hintRow      ?? -1;
    }

    document.getElementById("hint-text").textContent = state.hint;
    renderAll();
    updateDayNavUI();
  }

  function updateDayNavUI() {
    const prevBtn  = document.getElementById("prev-day-btn");
    const nextBtn  = document.getElementById("next-day-btn");
    const todayBtn = document.getElementById("today-day-btn");
    const label    = document.getElementById("day-label");

    if (prevBtn)  prevBtn.disabled  = dayOffset <= -MAX_DAYS_BACK;
    if (nextBtn)  nextBtn.disabled  = dayOffset >= 0;
    if (todayBtn) todayBtn.disabled = dayOffset === 0;

    if (label) {
      let suffix = "";
      if (dayOffset === 0)       suffix = " (today)";
      else if (dayOffset === -1) suffix = " (yesterday)";
      label.textContent = state.date + suffix;
    }
  }

  function navToDay(offset) {
    if (offset > 0) offset = 0;
    if (offset < -MAX_DAYS_BACK) offset = -MAX_DAYS_BACK;
    if (offset === dayOffset) return;
    dayOffset = offset;
    /* Close the end modal so yesterday's completion doesn't overlay
       whatever we navigated to. Settings / how-to-play are left open. */
    closeModal();
    /* Reset the once-per-day "game over" toast so the new day can
       announce its own state if it's also completed.              */
    gameOverToastShown = false;
    applyDayState();
  }

  // ── Init ─────────────────────────────────────────────────

  function init() {
    migrateLegacyState();
    pruneStaleArchive();

    initSettings();
    initHowToPlay();

    document.getElementById("hint-btn").addEventListener("click", revealHint);
    document.getElementById("prev-day-btn").addEventListener("click", () => navToDay(dayOffset - 1));
    document.getElementById("today-day-btn").addEventListener("click", () => navToDay(0));
    document.getElementById("next-day-btn").addEventListener("click", () => navToDay(dayOffset + 1));

    document.getElementById("stats-btn").addEventListener("click", openStats);
    document.getElementById("stats-close").addEventListener("click", closeStats);
    document.getElementById("stats-modal").addEventListener("click", (e) => {
      if (e.target === document.getElementById("stats-modal")) closeStats();
    });

    buildKeyboard();

    dayOffset = 0;
    applyDayState();

    // Show modal immediately if today's game was already finished on load
    if (dayOffset === 0 && state.gameOver) {
      showEndModal();
    }

    // Physical keyboard
    document.addEventListener("keydown", (e) => {
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      handleKey(e.key);
    });

    // Modal close button
    document.getElementById("modal-close").addEventListener("click", closeModal);

    // ESC closes modal
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { closeModal(); closeHowToPlay(); closeSettings(); closeStats(); }
    });
  }

  document.addEventListener("DOMContentLoaded", init);

})();

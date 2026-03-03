(function () {
  "use strict";

  const MAX_GUESSES = 5;
  const STORAGE_KEY = "processWordle";
  const EPOCH       = new Date("2025-01-01T00:00:00Z");

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

  function getTodayString() {
    return new Date().toISOString().slice(0, 10);
  }

  function getDailyWord() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const index = Math.floor((today - EPOCH) / 86400000) % WORDS.length;
    return WORDS[index];
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      date:         state.date,
      guesses:      state.guesses,
      currentInput: state.currentInput,
      gameOver:     state.gameOver,
      won:          state.won,
      hintRevealed: state.hintRevealed,
      hintRow:      state.hintRow,
    }));
  }

  function loadState() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    let saved;
    try { saved = JSON.parse(raw); } catch { return; }
    if (saved.date !== getTodayString()) return; // stale day
    state.guesses      = saved.guesses      || [];
    state.currentInput = saved.currentInput || "";
    state.gameOver     = saved.gameOver     || false;
    state.won          = saved.won          || false;
    state.hintRevealed = saved.hintRevealed || false;
    state.hintRow      = saved.hintRow      ?? -1;
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
            cell.textContent = state.guesses[g][c].toUpperCase();
            row.appendChild(cell);
          }
        } else if (g === state.guesses.length && !state.gameOver) {
          // Active input row
          for (let c = 0; c < state.wordLen; c++) {
            const cell  = document.createElement("div");
            const letter = state.currentInput[c] || "";
            cell.className  = `cell ${letter ? "filled" : "empty"}`;
            cell.textContent = letter.toUpperCase();
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

  function handleKey(key) {
    if (state.gameOver) return;

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
    const modal = document.getElementById("modal");
    modal.classList.remove("hidden");

    document.getElementById("modal-status").textContent =
      state.won ? "> PROCESS IDENTIFIED" : "> ACCESS DENIED";

    const wordEl = document.getElementById("modal-word");
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
    localStorage.setItem("procWordleHTP", "1");
  }

  function initHowToPlay() {
    if (!localStorage.getItem("procWordleHTP")) {
      document.getElementById("how-to-play").classList.remove("hidden");
    }
    document.getElementById("htplay-close").addEventListener("click", closeHowToPlay);
    document.getElementById("how-to-play").addEventListener("click", (e) => {
      if (e.target === document.getElementById("how-to-play")) closeHowToPlay();
    });
  }

  // ── Settings ──────────────────────────────────────────────

  function applyTheme(isLight) {
    document.body.classList.toggle("light", isLight);
    const btn = document.getElementById("theme-btn");
    if (btn) btn.textContent = isLight ? "\u263D" : "\u2600";
  }

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
    applyTheme(localStorage.getItem("siteTheme") === "light");
    applyHighContrast(localStorage.getItem("procWordleHC") === "1");
    applyHardMode(localStorage.getItem("procWordleHard") === "1");
    applySound(localStorage.getItem("procWordleSound") !== "0");

    document.getElementById("theme-btn").addEventListener("click", () => {
      const nowLight = !document.body.classList.contains("light");
      applyTheme(nowLight);
      localStorage.setItem("siteTheme", nowLight ? "light" : "dark");
    });

    document.getElementById("settings-btn").addEventListener("click", openSettings);
    document.getElementById("settings-close").addEventListener("click", closeSettings);
    document.getElementById("settings-modal").addEventListener("click", (e) => {
      if (e.target === document.getElementById("settings-modal")) closeSettings();
    });

    document.getElementById("toggle-contrast").addEventListener("click", () => {
      applyHighContrast(!highContrast);
      localStorage.setItem("procWordleHC", highContrast ? "1" : "0");
    });

    document.getElementById("toggle-hard").addEventListener("click", () => {
      if (document.getElementById("toggle-hard").disabled) return;
      applyHardMode(!hardMode);
      localStorage.setItem("procWordleHard", hardMode ? "1" : "0");
    });

    document.getElementById("toggle-sound").addEventListener("click", () => {
      applySound(!soundEnabled);
      localStorage.setItem("procWordleSound", soundEnabled ? "1" : "0");
    });
  }

  // ── Init ─────────────────────────────────────────────────

  function init() {
    const daily   = getDailyWord();
    state.word    = daily.word;
    state.hint    = daily.hint;
    state.wordLen = daily.word.length;
    state.date    = getTodayString();

    initSettings();
    initHowToPlay();
    loadState();

    document.getElementById("hint-text").textContent = state.hint;
    document.getElementById("hint-btn").addEventListener("click", revealHint);

    buildKeyboard();
    renderAll();

    // Show modal immediately if the game was already finished today
    if (state.gameOver) {
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
      if (e.key === "Escape") { closeModal(); closeHowToPlay(); closeSettings(); }
    });
  }

  document.addEventListener("DOMContentLoaded", init);

})();

(function () {
  "use strict";

  const EPOCH = new Date("2025-01-01T00:00:00Z");

  const state = {
    words: [],
    dayOffset: 0,
  };


  /* ── Daily index ────────────────────────────────────── */

  function getTargetDate(offset) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(today.getTime() + offset * 86400000);
  }

  function getDayIndex(offset) {
    const target = getTargetDate(offset);
    const diff = Math.floor((target - EPOCH) / 86400000);
    const len = state.words.length;
    return ((diff % len) + len) % len;
  }

  function formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + d;
  }

  /* ── DOM refs (set in init) ─────────────────────────── */

  let dateDisplay, wordDisplay, defDisplay, wordCard, prevBtn, nextBtn, todayBtn;

  function render() {
    if (!state.words.length) return;

    /* First render after fetch clears the ".loading" placeholder set
       in the HTML so the card transitions out of its loading state. */
    wordCard.classList.remove("loading");

    const index = getDayIndex(state.dayOffset);
    const entry = state.words[index];
    const target = getTargetDate(state.dayOffset);
    let label = formatDate(target);

    if (state.dayOffset === 0) label += "  (today)";
    else if (state.dayOffset === -1) label += "  (yesterday)";

    dateDisplay.textContent = label;
    wordDisplay.textContent = entry.word;
    defDisplay.textContent = entry.definition;

    nextBtn.disabled = state.dayOffset >= 0;

    /* retrigger fade animation */
    wordCard.classList.remove("fade-in");
    void wordCard.offsetWidth;
    wordCard.classList.add("fade-in");

    /* retrigger word scale-in — separate animation from the card fade
       so the word feels like it "arrives" rather than appearing. */
    wordDisplay.classList.remove("word-enter");
    void wordDisplay.offsetWidth;
    wordDisplay.classList.add("word-enter");
  }

  /* ── Navigation ─────────────────────────────────────── */

  function prevDay() {
    state.dayOffset--;
    render();
  }

  function nextDay() {
    if (state.dayOffset >= 0) return;
    state.dayOffset++;
    render();
  }

  function goToday() {
    state.dayOffset = 0;
    render();
  }

  /* ── Speech ─────────────────────────────────────────── */

  let speakBtn;
  let speakErrorTimer = null;

  function showSpeakError(msg) {
    const el = document.getElementById("speak-error");
    if (!el) return;
    el.textContent = msg;
    el.classList.remove("hidden");
    clearTimeout(speakErrorTimer);
    speakErrorTimer = setTimeout(() => el.classList.add("hidden"), 3000);
  }

  function speakWord() {
    if (!state.words.length) return;
    if (!("speechSynthesis" in window)) {
      showSpeakError("speech synthesis not supported in this browser");
      return;
    }
    const index = getDayIndex(state.dayOffset);
    const word = state.words[index].word;
    speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(word);
    utter.lang = "en-US";
    utter.rate = 0.85;
    utter.onstart = () => { speakBtn.disabled = true; };
    utter.onend   = () => { speakBtn.disabled = false; };
    utter.onerror = (e) => {
      speakBtn.disabled = false;
      showSpeakError("playback failed" + (e && e.error ? " (" + e.error + ")" : ""));
    };
    speechSynthesis.speak(utter);
  }

  /* ── Init ───────────────────────────────────────────── */

  document.addEventListener("DOMContentLoaded", () => {
    dateDisplay = document.getElementById("date-display");
    wordDisplay = document.getElementById("word-display");
    defDisplay = document.getElementById("definition-display");
    wordCard = document.getElementById("word-card");
    prevBtn = document.getElementById("prev-btn");
    nextBtn = document.getElementById("next-btn");
    todayBtn = document.getElementById("today-btn");
    speakBtn = document.getElementById("speak-btn");

    fetch("words.json")
      .then((res) => res.json())
      .then((data) => {
        state.words = data;
        render();
      })
      .catch((e) => {
        console.warn("word-of-the-day: words.json load failed", e);
        state.words = [{ word: "error", definition: "Failed to load word list." }];
        render();
      });

    siteTheme.init();

    prevBtn.addEventListener("click", prevDay);
    nextBtn.addEventListener("click", nextDay);
    todayBtn.addEventListener("click", goToday);
    speakBtn.addEventListener("click", speakWord);

    document.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") prevDay();
      else if (e.key === "ArrowRight") nextDay();
    });
  });
})();

(function () {
  "use strict";

  var EPOCH = new Date("2025-01-01T00:00:00Z");

  var state = {
    words: [],
    dayOffset: 0
  };

  /* ── Theme ──────────────────────────────────────────── */

  function applyTheme(isLight) {
    document.body.classList.toggle("light", isLight);
    document.getElementById("theme-btn").textContent = isLight ? "\u263D" : "\u2600";
  }

  /* ── Daily index ────────────────────────────────────── */

  function getTargetDate(offset) {
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(today.getTime() + offset * 86400000);
  }

  function getDayIndex(offset) {
    var target = getTargetDate(offset);
    var diff = Math.floor((target - EPOCH) / 86400000);
    var len = state.words.length;
    return ((diff % len) + len) % len;
  }

  function formatDate(date) {
    var y = date.getFullYear();
    var m = String(date.getMonth() + 1).padStart(2, "0");
    var d = String(date.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + d;
  }

  /* ── DOM refs (set in init) ─────────────────────────── */

  var dateDisplay, wordDisplay, defDisplay, wordCard, prevBtn, nextBtn, todayBtn;

  function render() {
    if (!state.words.length) return;

    var index = getDayIndex(state.dayOffset);
    var entry = state.words[index];
    var target = getTargetDate(state.dayOffset);
    var label = formatDate(target);

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

  var speakBtn;

  function speakWord() {
    if (!state.words.length) return;
    var index = getDayIndex(state.dayOffset);
    var word = state.words[index].word;
    speechSynthesis.cancel();
    var utter = new SpeechSynthesisUtterance(word);
    utter.lang = "en-US";
    utter.rate = 0.85;
    utter.onstart = function () { speakBtn.disabled = true; };
    utter.onend   = function () { speakBtn.disabled = false; };
    utter.onerror = function () { speakBtn.disabled = false; };
    speechSynthesis.speak(utter);
  }

  /* ── Init ───────────────────────────────────────────── */

  document.addEventListener("DOMContentLoaded", function () {
    dateDisplay = document.getElementById("date-display");
    wordDisplay = document.getElementById("word-display");
    defDisplay = document.getElementById("definition-display");
    wordCard = document.getElementById("word-card");
    prevBtn = document.getElementById("prev-btn");
    nextBtn = document.getElementById("next-btn");
    todayBtn = document.getElementById("today-btn");
    speakBtn = document.getElementById("speak-btn");

    fetch("words.json")
      .then(function (res) { return res.json(); })
      .then(function (data) {
        state.words = data;
        render();
      })
      .catch(function () {
        state.words = [{ word: "error", definition: "Failed to load word list." }];
        render();
      });

    applyTheme(localStorage.getItem("siteTheme") === "light");

    document.getElementById("theme-btn").addEventListener("click", function () {
      var nowLight = !document.body.classList.contains("light");
      applyTheme(nowLight);
      localStorage.setItem("siteTheme", nowLight ? "light" : "dark");
    });

    prevBtn.addEventListener("click", prevDay);
    nextBtn.addEventListener("click", nextDay);
    todayBtn.addEventListener("click", goToday);
    speakBtn.addEventListener("click", speakWord);

    document.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") prevDay();
      else if (e.key === "ArrowRight") nextDay();
    });
  });
})();

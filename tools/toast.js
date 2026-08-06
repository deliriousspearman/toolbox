// Shared toast/snackbar notification used by every tool: set #toast's
// text, show it, then hide it again after a delay. Every tool markup
// already has a <div id="toast"> for this.
//
// showToast(msg)                    — default 2000ms, no fade animation
// showToast(msg, duration)          — custom duration, no fade animation
// showToast(msg, duration, true)    — fades out over 350ms before hiding
//                                      (used by process-wordle's in-game toasts)

(function (global) {
  "use strict";

  let timer = null;

  function showToast(msg, duration, fade) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    if (duration === undefined) duration = 2000;

    toast.textContent = msg;
    if (fade) toast.classList.remove("fade");
    toast.classList.add("visible");
    clearTimeout(timer);

    if (fade) {
      timer = setTimeout(() => {
        toast.classList.add("fade");
        setTimeout(() => toast.classList.remove("visible", "fade"), 350);
      }, duration);
    } else {
      timer = setTimeout(() => toast.classList.remove("visible"), duration);
    }
  }

  global.showToast = showToast;
})(window);

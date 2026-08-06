// Shared clipboard writer used by several tools. Uses the async Clipboard
// API when available (requires a secure context) and falls back to a
// hidden-textarea + execCommand("copy") for older browsers / plain http://
// / file:// hosting. Always returns a Promise, rejecting if neither path
// actually copied the text — callers can .then()/.catch() uniformly.

(function (global) {
  "use strict";

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise((resolve, reject) => {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand("copy"); }
      catch (e) { console.warn("copyText fallback threw", e); }
      ta.remove();
      ok ? resolve() : reject(new Error("execCommand copy failed"));
    });
  }

  global.copyText = copyText;
})(window);

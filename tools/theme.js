// Shared site-wide theme toggle. Every tool (and the root toolbox) used
// to duplicate this ~8-line pattern: read `siteTheme` from localStorage,
// toggle the body.light class, swap the sun/moon icon on #theme-btn,
// wire the click handler, persist the new state.
//
// Usage:
//   siteTheme.init();       // called by each tool's own init
//   siteTheme.apply(true);  // rarely needed; toggles without persisting
//
// Depends on window.safeStorage (tools/storage.js).

(function (global) {
  "use strict";

  function apply(isLight) {
    document.body.classList.toggle("light", isLight);
    const btn = document.getElementById("theme-btn");
    /* ● / ○ render uniformly across fonts; ☀ / ☽ came out spindly in
       Share Tech Mono. Hollow circle = currently-light (press to go
       dark), filled circle = currently-dark (press to go light).    */
    if (btn) btn.textContent = isLight ? "○" : "●";
  }

  /* safeStorage (tools/storage.js) is loaded before theme.js on every
     page. Trust it rather than carrying a duplicate try/catch fallback
     — if it's missing the page is broken in bigger ways.             */

  function init() {
    apply(global.safeStorage.get("siteTheme") === "light");

    const btn = document.getElementById("theme-btn");
    if (btn) {
      btn.addEventListener("click", function () {
        const nowLight = !document.body.classList.contains("light");
        apply(nowLight);
        global.safeStorage.save("siteTheme", nowLight ? "light" : "dark");
      });
    }

    initKonami();
    initStorageErrorBanner();
  }

  // ── Storage-error banner ───────────────────────────────────
  /* storage.js dispatches a 'storageerror' CustomEvent when a
     localStorage call throws (full quota, private mode, disabled
     storage, …). Show a single persistent banner per page load so
     the user knows progress isn't being saved — otherwise they
     silently lose data.                                          */

  let storageBannerShown = false;

  function initStorageErrorBanner() {
    global.addEventListener("storageerror", function () {
      if (storageBannerShown) return;
      storageBannerShown = true;

      const banner = document.createElement("div");
      banner.id = "storage-error-banner";
      banner.setAttribute("role", "alert");
      banner.textContent =
        "⚠ browser storage is unavailable — changes won't be saved this session";

      const close = document.createElement("button");
      close.textContent = "×";
      close.setAttribute("aria-label", "Dismiss");
      close.addEventListener("click", function () { banner.remove(); });
      banner.appendChild(close);

      document.body.appendChild(banner);
    });
  }

  // ── Konami easter egg ──────────────────────────────────────
  /* Enter the Konami code anywhere on the site (↑↑↓↓←→←→BA) to
     flip site-wide CRT mode: a 2-second chromatic-aberration pass
     on every h1, plus a persistent scanline overlay that remains
     until dismissed (×) or the code is re-entered. State is kept
     in localStorage so the overlay survives reloads.              */

  const KONAMI = [
    "ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown",
    "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight",
    "b", "a"
  ];

  let konamiProgress = 0;

  function initKonami() {
    if (global.safeStorage && global.safeStorage.get("crtMode") === "1") {
      enableCrt(false);
    }

    document.addEventListener("keydown", function (e) {
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (key === KONAMI[konamiProgress]) {
        konamiProgress++;
        if (konamiProgress === KONAMI.length) {
          konamiProgress = 0;
          triggerGlitch();
        }
      } else {
        /* Allow the sequence to re-start if this key matches the first
           step — handles users who begin typing something else mid-code. */
        konamiProgress = key === KONAMI[0] ? 1 : 0;
      }
    });
  }

  function triggerGlitch() {
    document.body.classList.add("glitching");
    setTimeout(function () { document.body.classList.remove("glitching"); }, 2000);

    if (document.body.classList.contains("crt-mode")) {
      disableCrt();
    } else {
      enableCrt(true);
    }
  }

  function enableCrt(persist) {
    document.body.classList.add("crt-mode");
    if (persist && global.safeStorage) global.safeStorage.save("crtMode", "1");
    if (!document.getElementById("crt-dismiss")) {
      const btn = document.createElement("button");
      btn.id = "crt-dismiss";
      btn.className = "crt-dismiss";
      btn.setAttribute("aria-label", "Disable CRT mode");
      btn.textContent = "CRT  ×";
      btn.addEventListener("click", disableCrt);
      document.body.appendChild(btn);
    }
  }

  function disableCrt() {
    document.body.classList.remove("crt-mode");
    if (global.safeStorage) global.safeStorage.remove("crtMode");
    const btn = document.getElementById("crt-dismiss");
    if (btn) btn.remove();
  }

  global.siteTheme = { apply: apply, init: init };
})(window);

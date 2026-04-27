// Shared localStorage wrappers used by every tool.
//
// Each call is wrapped in try/catch because setItem/removeItem throw when
// the browser denies storage (quota exceeded, private-browsing policies).
// A failed persistence is non-fatal — the in-page state is still valid —
// so we just log a warning. getItem can also throw in some restrictive
// modes, so we protect it too and fall back to null.
//
// Exposed as `window.safeStorage` so tools can call
// `safeStorage.save(key, value)` / `.remove(key)` / `.get(key)`.

(function (global) {
  "use strict";

  /* Notify any listener (see theme.js) once per failure. Using a
     CustomEvent on window lets consumers surface a UI toast without
     this module having to know about toast APIs.                    */
  function emitFailure(op, err) {
    console.warn("safeStorage." + op + " failed", err);
    try {
      global.dispatchEvent(new CustomEvent("storageerror", {
        detail: { op: op, error: err },
      }));
    } catch (_) { /* pre-DOM edge; ignore */ }
  }

  function save(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      emitFailure("save", e);
    }
  }

  function remove(key) {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      emitFailure("remove", e);
    }
  }

  function get(key) {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      emitFailure("get", e);
      return null;
    }
  }

  global.safeStorage = { save, remove, get };
})(window);

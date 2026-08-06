// Shared "$(id)" element getter used by several tools: looks up an element
// by id and throws a descriptive error if it's missing, rather than letting
// a later .value/.textContent access NRE-crash with "Cannot read property
// of null". Each tool keeps its own greppable error prefix (e.g.
// "forensics: missing element #foo") via domGetter(prefix).
//
// Usage: const $ = domGetter("my-tool");

(function (global) {
  "use strict";

  function domGetter(prefix) {
    return function (id) {
      const el = document.getElementById(id);
      if (!el) throw new Error(prefix + ": missing element #" + id);
      return el;
    };
  }

  global.domGetter = domGetter;
})(window);

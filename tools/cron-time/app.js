(function () {
  "use strict";

  const OCCURRENCE_COUNT = 12;
  const MAX_SEARCH_YEARS = 4;

  // ── Cron aliases ─────────────────────────────────────────

  const SPECIALS = {
    "@yearly":   "0 0 1 1 *",
    "@annually": "0 0 1 1 *",
    "@monthly":  "0 0 1 * *",
    "@weekly":   "0 0 * * 0",
    "@daily":    "0 0 * * *",
    "@midnight": "0 0 * * *",
    "@hourly":   "0 * * * *",
  };

  const MONTH_NAMES = { jan:1, feb:2, mar:3, apr:4, may:5, jun:6,
                        jul:7, aug:8, sep:9, oct:10, nov:11, dec:12 };
  const DOW_NAMES   = { sun:0, mon:1, tue:2, wed:3, thu:4, fri:5, sat:6 };

  const DOW_LABELS  = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const MONTH_LABELS = ["","January","February","March","April","May","June",
                        "July","August","September","October","November","December"];

  // ── Field parser ─────────────────────────────────────────

  function replaceAliases(str, map) {
    return str.toLowerCase().replace(/[a-z]+/g, m => map[m] !== undefined ? map[m] : m);
  }

  function parseSegment(seg, min, max) {
    // seg is a single part (no commas), may contain - and /
    const stepMatch = seg.match(/^(.+)\/(\d+)$/);
    let base = seg, step = 1;
    if (stepMatch) { base = stepMatch[1]; step = parseInt(stepMatch[2], 10); }
    if (step < 1) throw new Error("Step must be >= 1");

    let from = min, to = max;
    if (base !== "*") {
      const rangeMatch = base.match(/^(\d+)-(\d+)$/);
      if (rangeMatch) {
        from = parseInt(rangeMatch[1], 10);
        to   = parseInt(rangeMatch[2], 10);
      } else if (/^\d+$/.test(base)) {
        from = to = parseInt(base, 10);
      } else {
        throw new Error(`Unexpected token: ${base}`);
      }
    }

    if (from < min || to > max || from > to) {
      throw new Error(`Value out of range [${min}-${max}]: ${seg}`);
    }

    const result = new Set();
    for (let v = from; v <= to; v += step) result.add(v);
    return result;
  }

  function parseField(raw, min, max, nameMap) {
    let str = raw.trim();
    if (nameMap) str = replaceAliases(str, nameMap);
    if (str === "*") return null; // null = "any"

    const result = new Set();
    for (const part of str.split(",")) {
      for (const v of parseSegment(part.trim(), min, max)) result.add(v);
    }
    return result;
  }

  // Normalize dow: some crons use 7 for Sunday; treat as 0
  function normalizeDow(set) {
    if (!set) return null;
    if (set.has(7)) { set.delete(7); set.add(0); }
    return set;
  }

  function parseCron(expr) {
    expr = expr.trim();
    if (SPECIALS[expr.toLowerCase()]) expr = SPECIALS[expr.toLowerCase()];
    const parts = expr.split(/\s+/);
    if (parts.length !== 5) throw new Error("Expected 5 fields: minute hour dom month dow");

    return {
      minute: parseField(parts[0], 0, 59, null),
      hour:   parseField(parts[1], 0, 23, null),
      dom:    parseField(parts[2], 1, 31, null),
      month:  parseField(parts[3], 1, 12, MONTH_NAMES),
      dow:    normalizeDow(parseField(parts[4], 0, 7,  DOW_NAMES)),
      raw:    expr,
    };
  }

  // ── Next occurrence calculator ────────────────────────────

  function nextAfter(set, val, min, max) {
    // find smallest value in set > val; wraps if needed — returns {v, wrapped}
    if (!set) return { v: val, wrapped: false };
    for (let v = val; v <= max; v++) if (set.has(v)) return { v, wrapped: false };
    for (let v = min; v < val; v++) if (set.has(v)) return { v, wrapped: true };
    return null; // impossible
  }

  function dayMatches(fields, date) {
    const domRestricted = fields.dom !== null;
    const dowRestricted = fields.dow !== null;
    const dom = date.getUTCDate();
    const dow = date.getUTCDay();

    // Vixie-cron rule: if both are restricted, a match on either suffices
    if (domRestricted && dowRestricted) {
      return fields.dom.has(dom) || fields.dow.has(dow);
    }
    if (domRestricted) return fields.dom.has(dom);
    if (dowRestricted) return fields.dow.has(dow);
    return true;
  }

  function daysInMonth(year, month) {
    return new Date(Date.UTC(year, month, 0)).getUTCDate(); // month is 1-based
  }

  function nextOccurrences(fields, fromDate, count) {
    const results = [];
    const limit = new Date(fromDate);
    limit.setUTCFullYear(limit.getUTCFullYear() + MAX_SEARCH_YEARS);

    // Round up to next minute
    let cur = new Date(fromDate);
    cur.setUTCSeconds(0, 0);
    cur.setUTCMinutes(cur.getUTCMinutes() + 1);

    while (results.length < count && cur < limit) {
      // ── Month ──────────────────────────────────────────
      if (fields.month && !fields.month.has(cur.getUTCMonth() + 1)) {
        const next = nextAfter(fields.month, cur.getUTCMonth() + 1, 1, 12);
        if (!next) break;
        if (next.wrapped) cur.setUTCFullYear(cur.getUTCFullYear() + 1);
        cur.setUTCMonth(next.v - 1, 1);
        cur.setUTCHours(0, 0, 0, 0);
        continue;
      }

      // ── Day ────────────────────────────────────────────
      if (!dayMatches(fields, cur)) {
        cur.setUTCDate(cur.getUTCDate() + 1);
        cur.setUTCHours(0, 0, 0, 0);
        continue;
      }

      // ── Hour ───────────────────────────────────────────
      if (fields.hour && !fields.hour.has(cur.getUTCHours())) {
        const next = nextAfter(fields.hour, cur.getUTCHours(), 0, 23);
        if (!next) { cur.setUTCDate(cur.getUTCDate() + 1); cur.setUTCHours(0, 0, 0, 0); continue; }
        if (next.wrapped) { cur.setUTCDate(cur.getUTCDate() + 1); cur.setUTCHours(0, 0, 0, 0); continue; }
        cur.setUTCHours(next.v, 0, 0, 0);
        continue;
      }

      // ── Minute ─────────────────────────────────────────
      if (fields.minute && !fields.minute.has(cur.getUTCMinutes())) {
        const next = nextAfter(fields.minute, cur.getUTCMinutes(), 0, 59);
        if (!next) { cur.setUTCHours(cur.getUTCHours() + 1, 0, 0, 0); continue; }
        if (next.wrapped) { cur.setUTCHours(cur.getUTCHours() + 1, 0, 0, 0); continue; }
        cur.setUTCMinutes(next.v, 0, 0);
        continue;
      }

      // ── Match ───────────────────────────────────────────
      results.push(new Date(cur));
      cur.setUTCMinutes(cur.getUTCMinutes() + 1);
    }

    return results;
  }

  // ── Human-readable description ────────────────────────────

  function pad(n) { return String(n).padStart(2, "0"); }

  function setDescription(fields, rawExpr) {
    const { minute: min, hour, dom, month, dow } = fields;

    const allMin   = min   === null;
    const allHour  = hour  === null;
    const allDom   = dom   === null;
    const allMonth = month === null;
    const allDow   = dow   === null;

    // Every minute
    if (allMin && allHour && allDom && allMonth && allDow)
      return "runs every minute";

    // Every N minutes (*/N or single value)
    if (allHour && allDom && allMonth && allDow) {
      if (allMin) return "runs every minute";
      const arr = [...min].sort((a, b) => a - b);
      if (arr.length === 1) return `runs at minute :${pad(arr[0])} of every hour`;
      const gaps = arr.map((v, i) => i === 0 ? null : v - arr[i - 1]).filter(Boolean);
      const uniform = gaps.every(g => g === gaps[0]);
      if (uniform && gaps[0] > 0) return `runs every ${gaps[0]} minute${gaps[0] > 1 ? "s" : ""}`;
      return `runs at minutes ${arr.map(v => ":"+pad(v)).join(", ")} of every hour`;
    }

    // Fixed time patterns
    const timeStr = () => {
      if (!allMin && min.size === 1 && !allHour && hour.size === 1) {
        const h = [...hour][0], m = [...min][0];
        return `${pad(h)}:${pad(m)} UTC`;
      }
      return null;
    };

    const t = timeStr();

    // Daily at fixed time
    if (t && allDom && allMonth && allDow)
      return `runs at ${t} every day`;

    // Weekly on specific days
    if (t && allDom && allMonth && !allDow) {
      const days = [...dow].sort((a, b) => a - b).map(d => DOW_LABELS[d]);
      const dayStr = days.length === 7 ? "every day"
        : days.length === 5 && !dow.has(0) && !dow.has(6) ? "Monday–Friday"
        : days.length === 2 && dow.has(0) && dow.has(6) ? "weekends"
        : days.join(", ");
      return `runs at ${t} on ${dayStr}`;
    }

    // Monthly on specific day
    if (t && !allDom && dom.size === 1 && allMonth && allDow) {
      const d = [...dom][0];
      const suffix = d === 1 ? "st" : d === 2 ? "nd" : d === 3 ? "rd" : "th";
      return `runs at ${t} on the ${d}${suffix} of every month`;
    }

    // Specific month
    if (t && !allDom && dom.size === 1 && !allMonth && month.size === 1 && allDow) {
      const d = [...dom][0];
      const suffix = d === 1 ? "st" : d === 2 ? "nd" : d === 3 ? "rd" : "th";
      const mName = MONTH_LABELS[[...month][0]];
      return `runs at ${t} on ${mName} ${d}${suffix}`;
    }

    // Every hour at fixed minute
    if (!allMin && min.size === 1 && allHour && allDom && allMonth && allDow)
      return `runs at :${pad([...min][0])} past every hour`;

    return `custom schedule (${rawExpr})`;
  }

  // ── Timezone formatting ───────────────────────────────────

  function formatUTC(date) {
    const y  = date.getUTCFullYear();
    const mo = pad(date.getUTCMonth() + 1);
    const d  = pad(date.getUTCDate());
    const h  = pad(date.getUTCHours());
    const mi = pad(date.getUTCMinutes());
    return `${y}-${mo}-${d}  ${h}:${mi}`;
  }

  function formatInTZ(date, tz) {
    try {
      return new Intl.DateTimeFormat("en-GB", {
        timeZone:     tz,
        year:         "numeric",
        month:        "2-digit",
        day:          "2-digit",
        hour:         "2-digit",
        minute:       "2-digit",
        hour12:       false,
      }).format(date).replace(",", "");
    } catch {
      return "—";
    }
  }

  // ── State ─────────────────────────────────────────────────

  const TZ_LS_KEY = "cronExtraTimezones";

  let extraTimezones = [];
  let debounceTimer  = null;
  let lastOccurrences = [];

  function saveTZ() {
    localStorage.setItem(TZ_LS_KEY, JSON.stringify(extraTimezones));
  }

  // ── Rendering ─────────────────────────────────────────────

  function renderResults() {
    const section = document.getElementById("results-section");
    const table   = document.getElementById("results-table");
    const dates   = lastOccurrences;

    if (dates.length === 0) { section.classList.add("hidden"); return; }
    section.classList.remove("hidden");

    document.getElementById("count-label").textContent =
      `— next ${dates.length} occurrence${dates.length !== 1 ? "s" : ""}`;

    // Build column definitions
    const cols = [{ label: "UTC", tz: null }];
    for (const tz of extraTimezones) cols.push({ label: tz, tz });

    const colCount = cols.length;
    const grid = document.createElement("div");
    grid.className = "rt-grid";
    grid.style.gridTemplateColumns = `repeat(${colCount}, auto)`;

    // Header row
    for (let ci = 0; ci < cols.length; ci++) {
      const head = document.createElement("div");
      head.className = ci === 0 ? "rt-col-head" : "rt-col-head extra-tz";
      const label = document.createTextNode(cols[ci].label);
      head.appendChild(label);
      if (ci > 0) {
        const rm = document.createElement("button");
        rm.className   = "remove-tz-btn";
        rm.textContent = "✕";
        rm.title       = `Remove ${cols[ci].tz}`;
        rm.dataset.tz  = cols[ci].tz;
        rm.addEventListener("click", () => {
          extraTimezones = extraTimezones.filter(t => t !== cols[ci].tz);
          saveTZ();
          renderResults();
        });
        head.appendChild(rm);
      }
      grid.appendChild(head);
    }

    // Data rows
    const skewMs = (parseInt(document.getElementById("skew-input").value, 10) || 0) * 60 * 1000;
    for (const date of dates) {
      const d = skewMs ? new Date(date.getTime() + skewMs) : date;
      for (let ci = 0; ci < cols.length; ci++) {
        const cell = document.createElement("div");
        cell.className = ci === 0 ? "rt-cell utc-cell" : "rt-cell tz-cell";
        cell.textContent = ci === 0 ? formatUTC(d) : formatInTZ(d, cols[ci].tz);
        grid.appendChild(cell);
      }
    }

    table.innerHTML = "";
    table.appendChild(grid);
  }

  // ── Parse and update ──────────────────────────────────────

  function update() {
    const cronInput  = document.getElementById("cron-input");
    const errorEl    = document.getElementById("cron-error");
    const descEl     = document.getElementById("description");
    const section    = document.getElementById("results-section");
    const expr       = cronInput.value.trim();

    if (!expr) {
      cronInput.classList.remove("error");
      errorEl.classList.add("hidden");
      descEl.classList.add("hidden");
      section.classList.add("hidden");
      lastOccurrences = [];
      return;
    }

    let fields;
    try {
      fields = parseCron(expr);
    } catch (e) {
      cronInput.classList.add("error");
      errorEl.textContent = e.message;
      errorEl.classList.remove("hidden");
      descEl.classList.add("hidden");
      section.classList.add("hidden");
      lastOccurrences = [];
      return;
    }

    cronInput.classList.remove("error");
    errorEl.classList.add("hidden");

    lastOccurrences = nextOccurrences(fields, new Date(), OCCURRENCE_COUNT);

    descEl.textContent = setDescription(fields, expr);
    descEl.classList.remove("hidden");

    if (lastOccurrences.length === 0) {
      section.classList.add("hidden");
      descEl.textContent = "no occurrences found in the next 4 years — expression may be impossible";
    } else {
      renderResults();
    }
  }

  function debouncedUpdate() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(update, 300);
  }

  // ── Timezone dropdown ─────────────────────────────────────

  function getTZOffset(tz) {
    try {
      const parts = new Intl.DateTimeFormat("en", {
        timeZone:     tz,
        timeZoneName: "shortOffset",
      }).formatToParts(new Date());
      const part = parts.find(p => p.type === "timeZoneName");
      return part ? part.value.replace("GMT", "UTC") : "";
    } catch {
      return "";
    }
  }

  let allZones = [];

  function populateTZSelect() {
    try {
      allZones = Intl.supportedValuesOf("timeZone");
    } catch {
      allZones = ["America/New_York","America/Los_Angeles","America/Chicago","Europe/London",
                  "Europe/Paris","Europe/Berlin","Asia/Tokyo","Asia/Shanghai","Asia/Kolkata",
                  "Australia/Sydney","Pacific/Auckland"];
    }
    const dl = document.getElementById("tz-datalist");
    for (const tz of allZones) {
      const opt    = document.createElement("option");
      const offset = getTZOffset(tz);
      opt.value = offset ? `${tz}  (${offset})` : tz;
      dl.appendChild(opt);
    }
  }

  // ── Theme ─────────────────────────────────────────────────

  function applyTheme(isLight) {
    document.body.classList.toggle("light", isLight);
    const btn = document.getElementById("theme-btn");
    if (btn) btn.textContent = isLight ? "\u263D" : "\u2600";
  }

  // ── Init ──────────────────────────────────────────────────

  function init() {
    applyTheme(localStorage.getItem("siteTheme") === "light");
    document.getElementById("theme-btn").addEventListener("click", () => {
      const nowLight = !document.body.classList.contains("light");
      applyTheme(nowLight);
      localStorage.setItem("siteTheme", nowLight ? "light" : "dark");
    });

    extraTimezones = JSON.parse(localStorage.getItem(TZ_LS_KEY) || "[]");

    populateTZSelect();

    document.getElementById("cron-input").addEventListener("input", debouncedUpdate);
    document.getElementById("skew-input").addEventListener("input", debouncedUpdate);

    document.getElementById("add-tz-btn").addEventListener("click", () => {
      const raw = document.getElementById("tz-select").value.trim();
      const tz  = raw.split("  (")[0].trim();
      if (allZones.includes(tz) && !extraTimezones.includes(tz)) {
        extraTimezones.push(tz);
        saveTZ();
        renderResults();
      }
    });

    // Pre-fill with a friendly example
    const input = document.getElementById("cron-input");
    input.value = "*/5 * * * *";
    update();
  }

  document.addEventListener("DOMContentLoaded", init);

})();

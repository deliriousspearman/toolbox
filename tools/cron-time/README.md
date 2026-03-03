# cron time

Parse a cron expression and preview its next scheduled run times, with optional timezone columns and clock-skew offset.

## Cron format

```
*  *  *  *  *
│  │  │  │  └─ day of week  (0–7, 0 and 7 = Sunday)
│  │  │  └──── month        (1–12)
│  │  └─────── day of month (1–31)
│  └────────── hour         (0–23)
└───────────── minute       (0–59)
```

Supported syntax: `*`, `*/step`, `start-end`, `value,list`, named months (`jan`…`dec`) and weekdays (`mon`…`sun`).

Special strings: `@yearly`, `@monthly`, `@weekly`, `@daily`, `@midnight`, `@hourly`.

## Features

**Next occurrences** — shows the next 12 matching timestamps starting from now.

**UTC column** — always present; times shown as `YYYY-MM-DD  HH:MM`.

**Extra timezone columns** — pick any IANA timezone from the dropdown and click **Add** to add a column. Each column shows a **✕** button to remove it.

**Clock skew** — enter a ±minute offset to shift every displayed timestamp. Useful for visualising what wall-clock time a job will fire on a server whose clock is drifted from real time. The search for next occurrences is always based on the real current time; only the displayed times are shifted.

## Files

| File | Purpose |
|------|---------|
| `app.js` | Single IIFE; `parseCron(expr)` returns a fields object where each field is `null` (wildcard) or a `Set<number>`; `nextOccurrences(fields, from, count)` forward-searches up to 4 years; skew applied in `renderResults()` at display time |
| `style.css` | Self-contained stylesheet with light-theme overrides |

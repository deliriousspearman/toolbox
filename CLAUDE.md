# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

A static multi-tool website served by Apache2. No build system, no package manager, no dependencies — everything is plain HTML, CSS, and vanilla JavaScript. Files are served directly from `/home/user/coding/toolbox/`.

## Git workflow

Remote: `https://gitlab.example.com/user/toolbox.git` (branch: `main`)
Credentials stored via `git config credential.helper store` — pushes work without prompting.

Commit and push after every meaningful unit of work — don't batch up multiple features or fixes into one commit. Each logical change (new feature, bug fix, config tweak) should be its own commit pushed immediately so there is always a saved state in GitLab.

Always commit specific files by name (not `git add .`), with a clean message, and push:
```bash
git add <files>
git commit -m "feat/fix/chore: short description of what and why"
git push
```

Conventional prefix guide:
- `feat:` — new feature or tool
- `fix:` — bug fix or corrected behaviour
- `chore:` — config, docs, tooling (no functional change)

## Adding a new tool

1. Create `tools/<tool-name>/` with `index.html`, `style.css`, `app.js`
2. Add a `<li class="tool-card">` entry to the root `index.html`
3. Copy the CSS variable block and `#home-btn` styles from an existing tool — each tool has its own self-contained stylesheet

## Design system

All tools share the same terminal dark theme, defined via CSS custom properties in each tool's own `style.css` (not a shared file):

| Variable | Value | Role |
|----------|-------|------|
| `--bg` | `#0d0d0d` | page background |
| `--surface` | `#1a1a1a` | card/input background |
| `--border` | `#3a3a3c` | borders |
| `--text` | `#e0e0e0` | primary text |
| `--text-dim` | `#666` | secondary/label text |
| `--accent` | `#00ff88` | green accent, headings, highlights |
| `--green` | `#538d4e` | correct state (procwordle tiles) |
| `--yellow` | `#b59f3b` | present/warning state |
| `--font` | `'Courier New', 'Lucida Console', monospace` | all text |

Every tool header uses `position: relative` with a `#home-btn` anchor (`href="../../"`, text `~/`) absolutely positioned at `left: 14px`. `#theme-btn` is `position: fixed; top: 14px; right: 14px` — pinned to the viewport's top-right corner (not the header) so it's always the outermost control regardless of header height; other right-side buttons (e.g. procwordle's `#settings-btn`/`#stats-btn`) stay absolutely positioned within the header, offset further left to clear it.

## Tool architecture

### `tools/process-wordle/`
Daily Wordle variant where answers are process names. Key files:
- `words.js` — exports `WORDS` array of `{ word, hint }` objects; daily word selected by `Math.floor((today - epoch) / 86400000) % WORDS.length`
- `app.js` — single IIFE; `state` object is the only mutable state; `renderAll()` does a full re-render on every change; game state persisted to `localStorage` under key `"processWordle"`
- Hard mode, light/dark/high-contrast themes stored in separate `localStorage` keys (`procWordleHard`, `procWordleTheme`, `procWordleHC`)
- Hint is hidden by default; revealing it costs one guess (reduces `MAX_GUESSES` from 5 to 4 via `getEffectiveMax()`)

### `tools/cron-time/`
Cron expression parser and schedule previewer. Key files:
- `app.js` — single IIFE; `parseCron(expr)` returns `{ minute, hour, dom, month, dow }` where each field is either `null` (wildcard) or a `Set<number>`; `nextOccurrences(fields, fromDate, count)` uses a forward-search algorithm capped at 4 years
- Clock skew (minutes) is applied to each **displayed** timestamp at render time — it does not affect which occurrences are found, only how they are shown
- Timezone formatting uses `Intl.DateTimeFormat` exclusively; timezone list from `Intl.supportedValuesOf('timeZone')`
- UTC is always the first column; extra timezone columns are stored in the `extraTimezones` array and re-rendered without re-parsing when added/removed

# terminal builder

Paste a code block or terminal session and get back a self-contained, syntax-highlighted "terminal window" as copy-paste HTML — for dropping into blog posts, docs, or any other site.

## Features

**Settings** — window title, syntax-highlighting language, and a single background colour swatch.

**Language** — `terminal` (the default) is built for pasted terminal sessions: it colours bash/zsh prompts (`user@host$`, `user@host:~#`, a bare `$`/`%`), `sudo` gets its own colour, and a curated set of common commands (`whoami`, `nmap`, `curl`, ...) is highlighted even though they aren't shell reserved words. `shell / bash` is the plain version — reserved words, strings, comments, and numbers only, for actual scripts. Other languages (js/py/html/css/json/sql/rust/go) use standard keyword highlighting.

**Live preview** — the terminal window (title bar with traffic-light dots + highlighted body) updates as you type.

**HTML output** — one **copy html** button away from the clipboard. The snippet is fully inline-styled (no external CSS or fonts required), so it renders identically wherever it's pasted.

Body text colour, syntax colours, and the title-bar shade are all derived automatically from the background colour you pick, so the result stays readable whether you choose something near-black or near-white.

## Files

| File | Purpose |
|------|---------|
| `app.js` | Single IIFE; `highlightCode(rawCode, lang, syn)` tokenizes per language (js/py/sh/terminal/html/css/json/sql/rust/go); `SH_PROMPT_RE`/`SH_COMMANDS` back the `terminal`-only prompt/command/sudo highlighting; `buildTerminalHTML(state)` assembles the self-contained inline-styled snippet used for both the live preview and the output textarea; colour helpers (`isDarkColor`, `pickTextColor`, `pickSyntaxPalette`, `titleBarColor`) derive readable text/syntax/chrome colours from the chosen background |
| `style.css` | Self-contained stylesheet, toolbox chrome only — none of it affects the generated output |

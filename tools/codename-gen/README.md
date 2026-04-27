# codename gen

Generate two-word codenames from a curated list of adjectives and nouns, then decode 4-letter short-codes back to the candidate words that could have produced them.

## Features

**Generate** — picks two random words from the active categories and concatenates them. Also shows a 4-letter "short code" made from the first two letters of each half (e.g. `frostwolf` → `frwo`).

**Max length** — optional cap on the combined codename length; the picker retries up to 500 times to find a pair that fits, or reports failure if the pool can't.

**Category filters** — click the `Categories` bar to expand; toggle individual categories on/off. Empty selection = use every category.

**Decode** — enter a 4-letter code to see every word in the list whose first two letters match each half. Each result chip is clickable to copy that word to the clipboard.

**History** — every generated codename is saved to localStorage and listed below the generator. Clearing the list is a single click.

## Files

| File | Purpose |
|------|---------|
| `app.js` | Single IIFE; `generate()` picks from the filtered pool and updates history; `copyText()` handles Clipboard API with an `execCommand` fallback; history persists under `codenameHistory` |
| `style.css` | Self-contained stylesheet with light-theme overrides |
| `wordlist.json` | Flat dict keyed by category — `{ "Colors": ["red", …], "Animals": ["wolf", …] }` — fetched once on init |

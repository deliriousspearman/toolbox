# word of the day

Shows a word + definition that rotates daily, with navigation to browse past days. Also reads the word aloud on demand via `speechSynthesis`.

## How the daily rotation works

Each day index is `Math.floor((today - EPOCH) / 86400000) % words.length`, where `EPOCH = 2025-01-01`. Everyone sees the same word on the same calendar day. When the list rolls over (after `words.length` days), the sequence repeats.

## Features

**Daily word + definition** — static entry pulled from `words.json`.

**Speak** — click the ♪ button to hear the current word; the button disables itself for the duration of the utterance. Shows an inline error line if the browser doesn't support speech synthesis or the platform rejects the request.

**Archive navigation** — **← PREV** / **TODAY** / **NEXT →** to step through past words. Future dates are not reachable (NEXT disables at offset 0). Left/right arrow keys also navigate.

**Loading placeholder** — while `words.json` is in flight, the card shows a dimmed "fetching today's word" so the empty state reads as pending rather than broken.

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| `←` | Previous day |
| `→` | Next day (only when not already at today) |

## Files

| File | Purpose |
|------|---------|
| `app.js` | Single IIFE; `getDayIndex(offset)` computes the rotation, `render()` updates the DOM, `speakWord()` wraps SpeechSynthesis with error handling |
| `style.css` | Self-contained stylesheet with light-theme overrides |
| `words.json` | Flat array of `{ word, definition }` entries — the single source of truth for the rotation |

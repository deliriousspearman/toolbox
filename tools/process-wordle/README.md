# procwordle

Wordle for sysadmins — guess the daily Unix/Linux process name.

## How it works

A new process name is chosen each day (epoch: 2025-01-01, cycling through the word list). You get **5 guesses** to identify it. After each guess the tiles colour-code your progress:

| Colour | Meaning |
|--------|---------|
| 🟩 Green | Correct letter, correct position |
| 🟨 Yellow | Letter is in the word, wrong position |
| ⬛ Grey | Letter is not in the word |

The grid width adapts to the length of the answer — words range from 3 to ~12 characters.

## Hint

A one-line description of what the process does is hidden above the grid. Click **REVEAL HINT** to show it. Revealing the hint costs one guess (max drops from 5 → 4).

## Settings

| Option | Description |
|--------|-------------|
| High Contrast | Swaps green/yellow for colours friendlier to colour-blind users |
| Hard Mode | Revealed letters must be used in every subsequent guess. Cannot be toggled mid-game. |

## Sharing

After the game ends a results modal shows your guess grid as emoji blocks. **COPY RESULTS** puts it on the clipboard for pasting into chat or social media.

## Files

| File | Purpose |
|------|---------|
| `words.js` | `WORDS` array of `{ word, hint }` objects; daily word selected by `(daysSinceEpoch % WORDS.length)` |
| `app.js` | Single IIFE; `state` is the only mutable object; `renderAll()` does a full DOM re-render on every change; game state persisted under `localStorage["processWordle"]` |
| `style.css` | Self-contained stylesheet including high-contrast and light-theme overrides |

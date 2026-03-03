# md → html

Convert Markdown to self-contained HTML. Every element is styled with inline `style="…"` attributes — no external stylesheet needed. The output is ready to paste into an email, embed in a CMS, or save as a standalone file.

## Interface

Two-pane editor filling the viewport:

- **Left pane** — type or paste Markdown
- **Right pane** — live HTML output (read-only)

Toolbar actions: **Upload** a `.md` file, select a **Theme**, open the **Customize** colour editor, **Copy** the HTML to the clipboard, or **Download** it as `output.html`.

## Themes

| Theme | Description |
|-------|-------------|
| Dracula | Dark purple/green palette |
| Nord | Dark arctic blue palette |
| Custom | User-defined colours (see below) |

Switching themes instantly re-converts the Markdown with the new colour set.

## Custom theme

Click **Customize** to open the colour editor. Eight properties are exposed:

- Background, Text, Headings, Links
- Code background, Code text
- Blockquote, Strong / accent

Click **Apply** to save and switch to the Custom theme.

## Supported Markdown

| Element | Syntax |
|---------|--------|
| Headings | `#` through `######` |
| Bold | `**text**` or `__text__` |
| Italic | `*text*` or `_text_` |
| Bold + italic | `***text***` |
| Strikethrough | `~~text~~` |
| Inline code | `` `code` `` |
| Fenced code block | ```` ``` ```` … ```` ``` ```` |
| Link | `[label](url)` |
| Image | `![alt](url)` |
| Blockquote | `> text` (recursive — blockquotes can contain any block element) |
| Unordered list | `- `, `*`, or `+` (one level of nesting supported) |
| Ordered list | `1.`, `2.`, … (one level of nesting supported) |
| Table | `\| col \|` with `\|---\|` separator row |
| Horizontal rule | `---`, `***`, or `___` |

## Files

| File | Purpose |
|------|---------|
| `app.js` | Single IIFE; `THEMES` constant defines Dracula and Nord as CSS-property objects; `parseBlocks()` is the block-level state machine; `inlineToHtml()` applies inline transforms with inline-code protection; `parseMd()` wraps output in a full HTML document |
| `style.css` | Tool UI styles only — not applied to the converted output |

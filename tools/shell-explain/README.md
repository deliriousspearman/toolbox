# shell explain

A searchable, annotated shell command library. Each command is broken into colour-coded tokens with plain-English explanations. All commands are editable and shared across every user via a server-side JSON file.

## Features

- **Search** — filters in real time across command text, description, token names, and their explanations
- **Category filter bar** — pill buttons to narrow the list by category; multiple categories use OR logic
- **Add / Edit / Delete** — any command can be modified through the modal; changes are immediately visible to all users
- **Token highlighting** — each part of a command is coloured and labelled so you can see exactly what each token does

## Using the search

Type anything into the search bar to filter — it matches against the command string, description, category names, token names, and token descriptions.

## Category filters

Click a category pill below the search bar to show only commands in that category. Click multiple pills to show commands from any of those categories. Click an active pill again to deactivate it.

Clicking a category tag on a command card sets that category as the sole active filter and clears the search box.

## Adding a command

1. Click **+ Add Command**
2. Fill in the command string and an optional description
3. Add category tags (type a name and press Enter or `,` to add; click `×` to remove)
4. Add at least one **part** — a token (substring of the command) and what it does
5. Click **SAVE** or press `Ctrl+Enter`

The command is saved to the server immediately and will appear for all users.

## Editing and deleting

Every card has **✎ Edit** and **✕** buttons in the top-right corner. Edits overwrite the existing entry; deletes remove it permanently.

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| `Ctrl+Enter` / `Cmd+Enter` | Save the open modal |
| `Escape` | Close the modal without saving |

## Files

| File | Purpose |
|------|---------|
| `index.html` | Page structure and modal markup |
| `style.css` | Self-contained stylesheet including light-theme overrides |
| `app.js` | Single IIFE; loads commands from `api.php` on init; all mutations go through `saveCommand()` / `deleteCommand()` |
| `api.php` | PHP endpoint — `GET` returns the command list, `POST` with `action: "save"` or `"delete"` writes to the JSON file |
| `commands.json` | Flat JSON array; the single source of truth for all commands |

## Server requirements

`api.php` requires PHP ≥ 8.0. The web server user must have write access to `commands.json`:

```bash
sudo chown www-data:www-data commands.json
```

If the permissions are wrong, `POST save` / `POST delete` return HTTP 500 with `"could not write commands.json (check file permissions)"` rather than silently appearing to succeed.

## Security notes

- `api.php` enforces an **Origin / Referer same-host check** on all POST requests, so opportunistic drive-by writes are rejected with 403. It is *not* real auth — a deliberate attacker who spoofs headers can still write. Fine for a personal site, not fine for anything bigger.
- GET is unrestricted, so `commands.json` is world-readable by design.

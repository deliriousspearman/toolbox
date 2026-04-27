# forensics

A digital-forensics artifact checklist. Pick a platform (Windows, Linux, Proxmox VE, VMware ESXi, TrueNAS, VyOS, pfSense) and a specific version/distro, and get a categorised list of artifacts to collect — registry hives, event logs, config files, logs, persistence paths, and so on. Tick items off as you collect them; progress is kept per-`(platform, version)` in your browser. Edit mode lets you modify the master list, stored on the server.

## Features

- **Platform + version picker** — seven OS families covering Windows (incl. Server + AD artifacts), Linux (Ubuntu/Debian/CentOS/RHEL/Fedora), Proxmox VE 7–9, VMware ESXi 6.5–8.0, TrueNAS CORE + SCALE, VyOS 1.3–1.5, pfSense 2.5–2.7
- **Per-version filtering** — artifacts declare which versions they apply to (e.g. `Amcache.hve` only shows on Win 8+, `dpkg -l` only on Debian-family, `/etc/rc.conf` only on TrueNAS CORE)
- **Checklist** — checkbox per item; collected items grey out and strike through; per-category count next to each heading
- **Browser-local progress** — `localStorage`; separate state per `(platform, version)`
- **Clear** — wipes ticks for the current `(platform, version)` only, not other combinations
- **Edit mode** — add/edit/delete items and categories inline; Save posts the full tree to the server

## How it's used

1. Choose a platform from the dropdown.
2. Pick the version/distro from the next dropdown.
3. Work through the categorised checklist, ticking items as you collect them. The `path` line shows where to find the artifact; `$ …` hints are copy-able collection commands.
4. Hit **Clear** when starting a new investigation on a different host of the same version. (Collected state is per-`(platform, version)`, so switching *between* versions keeps separate checklists automatically.)

For Debian-based appliances (Proxmox, TrueNAS SCALE, VyOS) the appliance family lists only appliance-specific artifacts. If you also need generic Linux triage on the same host (bash history, `/etc/passwd`, etc.), switch to the Linux tab and pick the matching Debian version as a second pass.

## Editing the list

Click **Edit** to enter edit mode:

- Each item becomes a mini-form with Name / Path / Description / Command / Versions.
- The **Versions** field is comma-separated — `*` means "applies to every version in this OS family", otherwise list the exact version strings (e.g. `Ubuntu 22.04, Ubuntu 24.04, Debian 12`).
- **+ Add item** appears under every category; **+ Add category** appears at the bottom.
- **✕ remove** buttons delete items or whole categories.
- **Save** posts the full tree to `api.php`; on success the UI exits edit mode.
- **Cancel** discards every change since you entered edit mode.

## Files

| File | Purpose |
|------|---------|
| `index.html` | Page structure |
| `style.css` | Self-contained stylesheet incl. light-theme inheritance from `theme.css` |
| `app.js` | Single IIFE; fetches artifacts from `api.php` on init; POSTs the full tree on save |
| `api.php` | PHP endpoint — `GET` returns the artifacts JSON, `POST` with `action: "replace"` writes the full tree |
| `artifacts.json` | Source of truth for the artifact tree. Seeded with ~30 items per OS family |

## Server requirements

`api.php` requires PHP ≥ 8.0. The web server user must have write access to `artifacts.json`:

```bash
sudo chown www-data:www-data artifacts.json
```

If the permissions are wrong, `POST` returns HTTP 500 with `"could not write artifacts.json (check file permissions)"` rather than silently appearing to succeed.

## Security notes

- `api.php` enforces an **Origin / Referer same-host check** on all POST requests, so opportunistic drive-by writes are rejected with 403. It is *not* real auth — a deliberate attacker who spoofs headers can still write. Fine for a personal site, not fine for anything bigger.
- GET is unrestricted — `artifacts.json` is world-readable by design.

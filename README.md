# Toolbox

A collection of browser-based tools. No build system, no package manager, no client-side dependencies — plain HTML, CSS, and vanilla JavaScript, served directly by Apache2.

## Tools

| Tool | Path | Description |
|------|------|-------------|
| **procwordle** | `tools/process-wordle/` | Daily Wordle variant — guess the hidden Unix process name |
| **cron time** | `tools/cron-time/` | Parse a cron expression and preview the next run times with timezone and clock skew support |
| **md → html** | `tools/md-to-html/` | Convert Markdown to a self-contained HTML file with Dracula, Nord, or custom inline CSS themes |
| **shell explain** | `tools/shell-explain/` | Searchable annotated shell command library — every command broken into colour-coded, explained tokens; all entries are editable and persisted server-side |

---

## Hosting on Apache2

### Requirements

- Apache2
- PHP (any version ≥ 8.0) with the standard `json` extension (enabled by default)
- The web server user (`www-data` on Debian/Ubuntu) must be able to write to `tools/shell-explain/commands.json`

### 1. Clone the repository

```bash
git clone <project> /var/www/homepage
```

Replace `/var/www/homepage` with whatever document root you prefer.

### 2. Set file permissions

The shell-explain tool stores commands in a flat JSON file that PHP writes to at runtime:

```bash
sudo chown www-data:www-data /var/www/homepage/tools/shell-explain/commands.json
# or, if you prefer to keep your own user as owner:
sudo chmod 664 /var/www/homepage/tools/shell-explain/commands.json
sudo chown :<your-apache-group> /var/www/homepage/tools/shell-explain/commands.json
```

The rest of the files are read-only from Apache's perspective and need no special permissions.

### 3. Configure a virtual host

Create `/etc/apache2/sites-available/homepage.conf`:

```apache
<VirtualHost *:80>
    ServerName yourdomain.com
    DocumentRoot /var/www/homepage

    <Directory /var/www/homepage>
        Options -Indexes
        AllowOverride None
        Require all granted
    </Directory>

    # Enable PHP for the shell-explain API endpoint only
    <Directory /var/www/homepage/tools/shell-explain>
        Options -Indexes
        AllowOverride None
        Require all granted
    </Directory>

    ErrorLog ${APACHE_LOG_DIR}/homepage_error.log
    CustomLog ${APACHE_LOG_DIR}/homepage_access.log combined
</VirtualHost>
```

Enable the site and reload Apache:

```bash
sudo a2ensite homepage.conf
sudo systemctl reload apache2
```

### 4. Enable PHP

If PHP is not already installed:

```bash
sudo apt install php libapache2-mod-php
sudo a2enmod php8.x          # replace 8.x with your installed version
sudo systemctl restart apache2
```

Verify PHP is active:

```bash
php --version
apache2ctl -M | grep php
```

### 5. (Optional) HTTPS with Let's Encrypt

```bash
sudo apt install certbot python3-certbot-apache
sudo certbot --apache -d yourdomain.com
```

Certbot will modify the virtual host automatically and set up auto-renewal.

### 6. Verify

Open `http://yourdomain.com` in a browser. Navigate to **shell explain** and add a command — then reload the page and confirm the command is still there. If it disappears, check that `commands.json` is writable by the web server user (step 2).

---

## Troubleshooting

### Seeing the Apache2 default page instead of the site

Apache routes requests to virtual hosts by the `Host` header (domain name), not by IP address. When accessing by IP, no `ServerName` matches and Apache falls back to the default site (`000-default.conf`), which shows the default page.

**Fix — disable the default site:**

```bash
sudo a2dissite 000-default.conf
sudo systemctl reload apache2
```

Visiting by IP will now hit the homepage config since it is the only enabled site.

Alternatively, if you need the default site to stay enabled, add your server's IP as a `ServerAlias` in `homepage.conf`:

```apache
ServerName yourdomain.com
ServerAlias 192.168.x.x
```

Then reload Apache: `sudo systemctl reload apache2`

**To diagnose which virtual host Apache is routing to:**

```bash
sudo apache2ctl -S
```

This shows all enabled virtual hosts, which one is the default, and which `ServerName`/`ServerAlias` each one matches.

---

## Project structure

```
homepage/
├── index.html               # Tool index / landing page
├── style.css                # Landing page styles
└── tools/
    ├── process-wordle/
    │   ├── index.html
    │   ├── style.css
    │   ├── app.js
    │   └── words.js         # Answer word list
    ├── cron-time/
    │   ├── index.html
    │   ├── style.css
    │   └── app.js
    ├── md-to-html/
    │   ├── index.html
    │   ├── style.css
    │   └── app.js
    └── shell-explain/
        ├── index.html
        ├── style.css
        ├── app.js
        ├── api.php              # PHP read/write endpoint
        └── commands.json # Persistent command store
```

## Adding a new tool

1. Create `tools/<tool-name>/` with `index.html`, `style.css`, `app.js`
2. Add a `<li class="tool-card">` entry to the root `index.html`
3. Copy the CSS variable block and `#home-btn` / `#theme-btn` styles from an existing tool's `style.css`

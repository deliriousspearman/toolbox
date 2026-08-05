#!/usr/bin/env bash
#
# setup.sh — install and configure Apache2 + PHP to serve this toolbox.
#
# Usage:
#   sudo ./setup.sh [--domain example.com] [--docroot /var/www/toolbox] [--https]
#
# Options:
#   --domain   ServerName for the vhost (default: server's hostname -f, falls back to _)
#   --docroot  Where to deploy the site (default: /var/www/toolbox)
#   --https    Also generate a self-signed TLS cert and enable a :443 vhost
#   -h|--help  Show this help
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOCROOT="/var/www/toolbox"
DOMAIN=""
ENABLE_HTTPS=0

usage() {
    grep '^#' "$0" | sed -n '2,/^set -e/p' | sed '$d; s/^# \{0,1\}//'
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --domain)
            DOMAIN="$2"; shift 2 ;;
        --docroot)
            DOCROOT="$2"; shift 2 ;;
        --https)
            ENABLE_HTTPS=1; shift ;;
        -h|--help)
            usage; exit 0 ;;
        *)
            echo "Unknown option: $1" >&2; usage; exit 1 ;;
    esac
done

if [[ $EUID -ne 0 ]]; then
    echo "This script must be run as root (it installs packages and writes to /etc, /var/www). Try: sudo $0 $*" >&2
    exit 1
fi

if [[ -z "$DOMAIN" ]]; then
    DOMAIN="$(hostname -f 2>/dev/null || true)"
    [[ -z "$DOMAIN" ]] && DOMAIN="_"
fi

echo "==> Installing Apache2 and PHP"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y apache2 php libapache2-mod-php >/dev/null

PHP_MOD="$(apache2ctl -M 2>/dev/null | awk -F'_module' '/php[0-9.]*_module/{print $1; exit}')"
if [[ -z "$PHP_MOD" ]]; then
    PHP_BIN_VER="$(php -r 'echo PHP_MAJOR_VERSION.".".PHP_MINOR_VERSION;')"
    a2enmod "php${PHP_BIN_VER}" || true
fi

echo "==> Enabling required Apache modules"
a2enmod rewrite deflate expires headers >/dev/null

echo "==> Deploying site to ${DOCROOT}"
mkdir -p "$DOCROOT"
rsync -a --delete \
    --exclude '.git' \
    --exclude '.claude' \
    --exclude 'setup.sh' \
    "${SCRIPT_DIR}/" "${DOCROOT}/"

echo "==> Setting permissions"
APACHE_USER="www-data"
chown -R root:root "$DOCROOT"
find "$DOCROOT" -type d -exec chmod 755 {} \;
find "$DOCROOT" -type f -exec chmod 644 {} \;

COMMANDS_JSON="${DOCROOT}/tools/shell-explain/commands.json"
if [[ -f "$COMMANDS_JSON" ]]; then
    chown "${APACHE_USER}:${APACHE_USER}" "$COMMANDS_JSON"
    chmod 664 "$COMMANDS_JSON"
fi

echo "==> Writing HTTP vhost (toolbox.conf)"
cat > /etc/apache2/sites-available/toolbox.conf <<EOF
<VirtualHost *:80>
    ServerName ${DOMAIN}
    DocumentRoot ${DOCROOT}

    <Directory ${DOCROOT}>
        Options -Indexes
        AllowOverride None
        Require all granted
    </Directory>

    <Directory ${DOCROOT}/tools/shell-explain>
        Options -Indexes
        AllowOverride None
        Require all granted
    </Directory>

    ErrorLog \${APACHE_LOG_DIR}/toolbox_error.log
    CustomLog \${APACHE_LOG_DIR}/toolbox_access.log combined
EOF

if [[ $ENABLE_HTTPS -eq 1 ]]; then
    cat >> /etc/apache2/sites-available/toolbox.conf <<EOF

    RewriteEngine On
    RewriteCond %{HTTPS} off
    RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
EOF
fi

echo "</VirtualHost>" >> /etc/apache2/sites-available/toolbox.conf

if [[ $ENABLE_HTTPS -eq 1 ]]; then
    echo "==> Enabling SSL module"
    a2enmod ssl >/dev/null

    CERT_DIR="/etc/ssl/toolbox"
    mkdir -p "$CERT_DIR"
    CERT_FILE="${CERT_DIR}/toolbox.crt"
    KEY_FILE="${CERT_DIR}/toolbox.key"

    if [[ -f "$CERT_FILE" && -f "$KEY_FILE" ]]; then
        echo "==> Existing self-signed cert found at ${CERT_DIR}, reusing"
    else
        echo "==> Generating self-signed certificate for ${DOMAIN}"
        openssl req -x509 -nodes -newkey rsa:2048 \
            -keyout "$KEY_FILE" \
            -out "$CERT_FILE" \
            -days 825 \
            -subj "/CN=${DOMAIN}" \
            -addext "subjectAltName=DNS:${DOMAIN}"
        chmod 600 "$KEY_FILE"
    fi

    echo "==> Writing HTTPS vhost (toolbox-ssl.conf)"
    cat > /etc/apache2/sites-available/toolbox-ssl.conf <<EOF
<VirtualHost *:443>
    ServerName ${DOMAIN}
    DocumentRoot ${DOCROOT}

    <Directory ${DOCROOT}>
        Options -Indexes
        AllowOverride None
        Require all granted
    </Directory>

    <Directory ${DOCROOT}/tools/shell-explain>
        Options -Indexes
        AllowOverride None
        Require all granted
    </Directory>

    SSLEngine on
    SSLCertificateFile ${CERT_FILE}
    SSLCertificateKeyFile ${KEY_FILE}

    ErrorLog \${APACHE_LOG_DIR}/toolbox_ssl_error.log
    CustomLog \${APACHE_LOG_DIR}/toolbox_ssl_access.log combined
</VirtualHost>
EOF
fi

echo "==> Enabling site(s)"
a2dissite 000-default.conf >/dev/null 2>&1 || true
a2ensite toolbox.conf >/dev/null
[[ $ENABLE_HTTPS -eq 1 ]] && a2ensite toolbox-ssl.conf >/dev/null

echo "==> Testing Apache config"
apache2ctl configtest

echo "==> Reloading Apache"
systemctl reload apache2 || systemctl restart apache2

echo
echo "Done. Site deployed to ${DOCROOT}, ServerName ${DOMAIN}."
echo "  HTTP:  http://${DOMAIN}/"
if [[ $ENABLE_HTTPS -eq 1 ]]; then
    echo "  HTTPS: https://${DOMAIN}/ (self-signed cert — browsers will warn until you replace it, e.g. with certbot)"
fi

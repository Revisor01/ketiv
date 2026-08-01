#!/bin/bash
set -e

echo "=== LOSUNGEN API CONTAINER STARTING ==="

# Container-Env für Cron-Jobs verfügbar machen (Cron erbt keine Docker-Env-Variablen!)
printenv | grep -E '^(DB_|REDIS_|API_KEY_|BIBLESERVER_|TZ=)' | while IFS='=' read -r key value; do
    printf "export %s='%s'\n" "$key" "${value//\'/\'\\\'\'}"
done > /etc/container.env
chmod 600 /etc/container.env

echo "Starting CRON daemon (daily translation cache at 00:02)..."
service cron start

# Startup-Check im Hintergrund: wartet auf die DB und lädt fehlende
# Übersetzungen für heute nach, ohne den Apache-Start zu blockieren
(sleep 10 && /usr/local/bin/php /var/www/html/scripts/startup_check.php) >> /proc/1/fd/1 2>&1 &

echo "Starting Apache2..."
echo "=== LOSUNGEN API READY ==="
exec apache2-foreground

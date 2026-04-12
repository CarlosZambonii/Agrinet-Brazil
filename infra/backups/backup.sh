#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
FILE="$BACKUP_DIR/agrinet_$DATE.sql.gz"

mysqldump \
  -h "$MYSQL_HOST" \
  -u "$MYSQL_USER" \
  -p"$MYSQL_PASSWORD" \
  "$MYSQL_DATABASE" | gzip > "$FILE"

echo "Backup salvo: $FILE"

# Manter apenas os últimos 7 dias
find "$BACKUP_DIR" -name "agrinet_*.sql.gz" -mtime +7 -delete
echo "Backups antigos removidos"

#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

DB_HOST=${DB_HOST:-127.0.0.1}
DB_PORT=${DB_PORT:-3306}
DB_USER=${DB_USER:-root}
DB_PASS=${DB_PASS:-root}
DB_NAME=${DB_NAME:-agrinet}
DB_WAIT_SECONDS=${DB_WAIT_SECONDS:-60}
NODE_URL_SEED_1=${NODE_URL_SEED_1:-http://localhost:5000}
NODE_URL_SEED_2=${NODE_URL_SEED_2:-https://www.ntari.org}

MYSQL=(mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" "-p$DB_PASS")

echo "Waiting for MariaDB..."

start_ts=$(date +%s)
until "${MYSQL[@]}" -e "SELECT 1" > /dev/null 2>&1; do
  now_ts=$(date +%s)
  if [ $((now_ts - start_ts)) -ge "$DB_WAIT_SECONDS" ]; then
    echo "MariaDB did not become ready in ${DB_WAIT_SECONDS}s."
    exit 1
  fi
  sleep 1
done

echo "MariaDB is up."

echo "Applying schema..."
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" "-p$DB_PASS" "$DB_NAME" < "$PROJECT_ROOT/schema.sql"
echo "✔ cria schema"

echo "Seeding users..."
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" "-p$DB_PASS" "$DB_NAME" <<EOF
INSERT INTO users (id, email, reputation_score)
VALUES
('u1', 'u1@test.com', 0),
('u2', 'u2@test.com', 0),
('u3', 'u3@test.com', 0)
ON DUPLICATE KEY UPDATE id=id;
EOF
echo "✔ seed users"

echo "Seeding wallets..."
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" "-p$DB_PASS" "$DB_NAME" <<EOF
INSERT INTO wallets (user_id, balance)
VALUES
('u1', 100.00),
('u2', 0.00),
('u3', 0.00)
ON DUPLICATE KEY UPDATE user_id=user_id;
EOF
echo "✔ seed wallets"

echo "Seeding node_registry..."
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" "-p$DB_PASS" "$DB_NAME" <<EOF
INSERT INTO node_registry (node_url)
VALUES
('$NODE_URL_SEED_1'),
('$NODE_URL_SEED_2')
ON DUPLICATE KEY UPDATE node_url=node_url;
EOF
echo "✔ seed node_registry"

echo "Bootstrap completed successfully."

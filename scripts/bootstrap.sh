#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

DB_HOST=${DB_HOST:-127.0.0.1}
DB_PORT=${DB_PORT:-3306}
DB_USER=${DB_USER:-root}
DB_PASS=${DB_PASS:-root}
DB_NAME=${DB_NAME:-agrinet}

echo "Waiting for MariaDB..."

until mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASS -e "SELECT 1" > /dev/null 2>&1
do
  sleep 1
done

echo "MariaDB is up."

echo "Applying schema..."
mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASS $DB_NAME < "$PROJECT_ROOT/schema.sql"

echo "Seeding users..."

mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASS $DB_NAME <<EOF

INSERT INTO users (id, email, reputation_score)
VALUES
('u1', 'u1@test.com', 0),
('u2', 'u2@test.com', 0),
('u3', 'u3@test.com', 0)
ON DUPLICATE KEY UPDATE id=id;

INSERT INTO wallets (user_id, balance)
VALUES
('u1', 100.00),
('u2', 0.00),
('u3', 0.00)
ON DUPLICATE KEY UPDATE user_id=user_id;

EOF

echo "Bootstrap completed successfully."

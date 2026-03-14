#!/bin/bash
set -euo pipefail

echo "==============================="
echo "04 - FAILED PAYMENT VELOCITY"
echo "==============================="

: "${TOKEN:?Você precisa export TOKEN antes. Ex: export TOKEN='...'}"

USER_ID="${USER_ID:-016517a3-0fac-4b94-b4c1-69ad38ec6eaa}"
API_URL="${API_URL:-http://localhost:5000}"
MYSQL_DB="${MYSQL_DB:-agrinet}"
MYSQL_USER="${MYSQL_USER:-root}"

FAIL_PM="${FAIL_PM:-pm_card_chargeDeclined}"   # força payment_failed no Stripe
ATTEMPTS="${ATTEMPTS:-5}"

echo ""
echo "0) Resetando bloqueio do usuário (pra não travar o /pix/create)..."
sudo mysql -u "$MYSQL_USER" "$MYSQL_DB" -e "
UPDATE users
SET is_blocked = 0,
    blocked_until = NULL,
    block_level = 'none'
WHERE id = '$USER_ID';
"

echo ""
echo "1) Gerando $ATTEMPTS PaymentIntents e forçando falha no pagamento..."
for i in $(seq 1 "$ATTEMPTS"); do
  echo ""
  echo "---- Attempt $i ----"

  RESP=$(curl -s -X POST "$API_URL/payments/pix/create" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"amount":10}')

  echo "API response: $RESP"

  PI_ID=$(echo "$RESP" | jq -r '.paymentIntentId // empty')
  if [ -z "$PI_ID" ]; then
    echo "❌ Não consegui criar PaymentIntent."
    exit 1
  fi

  echo "✔ Created: $PI_ID"

  # confirma com método que falha (gera payment_intent.payment_failed)
  stripe payment_intents confirm "$PI_ID" --payment-method "$FAIL_PM" >/dev/null 2>&1 || true
  echo "✔ Forced failure (expected)"

  sleep 1
done

echo ""
echo "2) Aguardando webhook processar (5s)..."
sleep 5

echo ""
echo "3) Contando payments failed nos últimos 10 min..."
sudo mysql -u "$MYSQL_USER" "$MYSQL_DB" -e "
SELECT COUNT(*) AS failed_last_10_min
FROM payments
WHERE user_id = '$USER_ID'
  AND status = 'failed'
  AND created_at >= NOW() - INTERVAL 10 MINUTE;
"

echo ""
echo "4) Verificando bloqueio do usuário (esperado: is_blocked=1 após >=5)..."
sudo mysql -u "$MYSQL_USER" "$MYSQL_DB" -e "
SELECT id, is_blocked, block_level, blocked_until
FROM users
WHERE id = '$USER_ID';
"

echo ""
echo "5) Verificando fraud_logs (esperado: failed_payment_velocity)..."
sudo mysql -u "$MYSQL_USER" "$MYSQL_DB" -e "
SELECT user_id, reason, created_at
FROM fraud_logs
WHERE user_id = '$USER_ID'
ORDER BY created_at DESC
LIMIT 5;
"

echo ""
echo "6) Métrica failed_payment_total (deve ter subido)..."
curl -s "$API_URL/metrics" | grep -E '^failed_payment_total ' || true

echo ""
echo "✅ FAILED PAYMENT VELOCITY TEST FINALIZADO"

#!/bin/bash
set -euo pipefail

# ====== CONFIG ======
API="http://localhost:5000"
AMOUNT=10
MYSQL_DB="agrinet"
MYSQL_USER="root"
# Exporta TOKEN no terminal antes:
# export TOKEN="eyJhbGciOi..."

echo "==============================="
echo "01 - STRIPE DEPOSIT SMOKE TEST"
echo "==============================="

if [ -z "${TOKEN:-}" ]; then
  echo "❌ TOKEN não definido. Rode: export TOKEN='SEU_JWT'"
  exit 1
fi

echo ""
echo "1) Criando PaymentIntent via API..."
RESP=$(curl -s -X POST "$API/payments/pix/create" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"amount\":$AMOUNT}")

echo "API response: $RESP"

PI_ID=$(echo "$RESP" | jq -r .paymentIntentId)
if [ "$PI_ID" = "null" ] || [ -z "$PI_ID" ]; then
  echo "❌ Falhou criar PaymentIntent"
  exit 1
fi

echo "✔ paymentIntentId: $PI_ID"

echo ""
echo "2) Confirmando pagamento (card test)..."
stripe payment_intents confirm "$PI_ID" --payment-method pm_card_visa >/dev/null
echo "✔ Confirmado"

echo ""
echo "3) Aguardando webhook processar (3s)..."
sleep 3

echo ""
echo "4) Validando lançamento deposit no banco..."
sudo mysql -u "$MYSQL_USER" "$MYSQL_DB" -e "
SELECT type, amount, payment_id, created_at
FROM wallet_history
WHERE payment_id = '$PI_ID'
ORDER BY created_at DESC
LIMIT 3;
"

echo ""
echo "5) Validando payment status no banco..."
sudo mysql -u "$MYSQL_USER" "$MYSQL_DB" -e "
SELECT id, status, amount, refunded_amount, provider, created_at
FROM payments
WHERE id = '$PI_ID';
"

echo ""
echo "6) Validando métrica stripe_payment_succeeded_total (deve ter incrementado)..."
curl -s "$API/metrics" | grep -E "^stripe_payment_succeeded_total " || true

echo ""
echo "✅ Smoke test concluído"
echo "PaymentIntent: $PI_ID"

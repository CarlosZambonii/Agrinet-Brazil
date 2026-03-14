#!/bin/bash

echo "==============================="
echo "03 - STRIPE REFUND TEST"
echo "==============================="

USER_ID="016517a3-0fac-4b94-b4c1-69ad38ec6eaa"

echo ""
echo "1️⃣ Criando novo depósito..."

RESPONSE=$(curl -s -X POST http://localhost:5000/payments/pix/create \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount":10}')

PI_ID=$(echo "$RESPONSE" | jq -r .paymentIntentId)

if [ "$PI_ID" = "null" ]; then
  echo "❌ Falhou criar PaymentIntent"
  echo "$RESPONSE"
  exit 1
fi

echo "✔ PaymentIntent: $PI_ID"

echo ""
echo "2️⃣ Confirmando pagamento..."
stripe payment_intents confirm $PI_ID --payment-method pm_card_visa >/dev/null

sleep 3

echo ""
echo "3️⃣ Criando REFUND PARCIAL (4 BRL)..."
stripe refunds create --payment-intent $PI_ID --amount 400 >/dev/null

sleep 3

echo ""
echo "4️⃣ Verificando refund parcial no banco..."
mysql -u root -p agrinet -e "
SELECT type, amount, payment_id
FROM wallet_history
WHERE payment_id = '$PI_ID'
ORDER BY created_at DESC;
"

echo ""
echo "5️⃣ Tentando OVER-REFUND (deve falhar)..."
stripe refunds create --payment-intent $PI_ID --amount 900

echo ""
echo "6️⃣ Criando REFUND RESTANTE (6 BRL)..."
stripe refunds create --payment-intent $PI_ID --amount 600 >/dev/null

sleep 3

echo ""
echo "7️⃣ Verificando status final do payment..."
mysql -u root -p agrinet -e "
SELECT id, status, refunded_amount
FROM payments
WHERE id = '$PI_ID';
"

echo ""
echo "8️⃣ Testando idempotência do refund (resend evento)..."

LAST_EVENT=$(stripe events list --limit 5 | jq -r '.data[] | select(.type=="charge.refunded") | .id' | head -n1)

stripe events resend $LAST_EVENT >/dev/null
sleep 2

echo ""
echo "9️⃣ Conferindo que não duplicou refund..."
mysql -u root -p agrinet -e "
SELECT COUNT(*) AS refund_count
FROM wallet_history
WHERE payment_id = '$PI_ID'
AND type = 'refund';
"

echo ""
echo "🔟 Conferindo métricas..."
curl -s http://localhost:5000/metrics | grep -E "stripe_refund_total|refund_total"

echo ""
echo "==============================="
echo "REFUND TEST FINALIZADO"
echo "==============================="

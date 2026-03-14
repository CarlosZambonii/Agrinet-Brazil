#!/bin/bash

echo "======================================="
echo "02 - STRIPE IDEMPOTENCY TEST"
echo "======================================="

if [ -z "$TOKEN" ]; then
  echo "❌ TOKEN não definido"
  exit 1
fi

echo ""
echo "1) Criando novo PaymentIntent..."

RESPONSE=$(curl -s -X POST http://localhost:5000/payments/pix/create \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount":10}')

PI_ID=$(echo "$RESPONSE" | jq -r .paymentIntentId)

if [ "$PI_ID" = "null" ] || [ -z "$PI_ID" ]; then
  echo "❌ Falhou criar PaymentIntent"
  echo "$RESPONSE"
  exit 1
fi

echo "✔ PaymentIntent: $PI_ID"

echo ""
echo "2) Confirmando pagamento..."
stripe payment_intents confirm $PI_ID --payment-method pm_card_visa > /dev/null
echo "✔ Confirmado"

echo ""
echo "3) Aguardando webhook..."
sleep 3

echo ""
echo "4) Verificando quantidade de deposits antes do resend..."

mysql -u root -p agrinet -e "
SELECT COUNT(*) as deposit_count
FROM wallet_history
WHERE payment_id = '$PI_ID'
AND type = 'deposit';
"

echo ""
echo "5) Reenviando evento (Stripe resend)..."
stripe events resend $(stripe events list --limit 1 | jq -r '.data[0].id') > /dev/null
sleep 3

echo ""
echo "6) Verificando novamente quantidade de deposits..."

mysql -u root -p agrinet -e "
SELECT COUNT(*) as deposit_count
FROM wallet_history
WHERE payment_id = '$PI_ID'
AND type = 'deposit';
"

echo ""
echo "7) Métrica duplicate_event_total:"
curl -s http://localhost:5000/metrics | grep duplicate_event_total

echo ""
echo "✅ Idempotency test finalizado"

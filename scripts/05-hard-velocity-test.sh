#!/bin/bash

echo "==============================="
echo "05 - HARD VELOCITY TEST"
echo "==============================="

USER_ID="016517a3-0fac-4b94-b4c1-69ad38ec6eaa"

echo ""
echo "⚠ Resetando usuário para teste limpo..."
mysql -u root -p agrinet -e "
UPDATE users
SET is_blocked = 0,
    block_level = 'none',
    blocked_until = NULL
WHERE id = '$USER_ID';
"

echo ""
echo "🚀 Criando e confirmando 8 depósitos rápidos..."

for i in {1..8}
do
  echo ""
  echo "---- Deposit $i ----"

  RESPONSE=$(curl -s -X POST http://localhost:5000/payments/pix/create \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"amount":10}')

  PI_ID=$(echo "$RESPONSE" | jq -r .paymentIntentId)

  if [ "$PI_ID" = "null" ]; then
    echo "❌ Falhou criar PaymentIntent"
    exit 1
  fi

  echo "✔ Created: $PI_ID"

  stripe payment_intents confirm $PI_ID \
    --payment-method pm_card_visa > /dev/null

  echo "✔ Confirmed"

  sleep 1
done

echo ""
echo "⏳ Aguardando webhook processar (5s)..."
sleep 5

echo ""
echo "📊 Contando deposits últimos 5 min..."
mysql -u root -p agrinet -e "
SELECT COUNT(*) AS deposits_last_5_min
FROM wallet_history
WHERE user_id = '$USER_ID'
AND type = 'deposit'
AND created_at >= DATE_SUB(NOW(), INTERVAL 5 MINUTE);
"

echo ""
echo "🔒 Verificando status do usuário..."
mysql -u root -p agrinet -e "
SELECT id, is_blocked, block_level, blocked_until
FROM users
WHERE id = '$USER_ID';
"

echo ""
echo "📜 Verificando fraud_logs..."
mysql -u root -p agrinet -e "
SELECT user_id, reason, created_at
FROM fraud_logs
WHERE user_id = '$USER_ID'
ORDER BY created_at DESC
LIMIT 3;
"

echo ""
echo "📈 Métrica velocity_trigger_total:"
curl -s http://localhost:5000/metrics | grep velocity_trigger_total

echo ""
echo "📈 Métrica user_block_total:"
curl -s http://localhost:5000/metrics | grep user_block_total

echo ""
echo "✅ HARD VELOCITY TEST FINALIZADO"

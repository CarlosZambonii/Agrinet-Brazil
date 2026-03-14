#!/bin/bash

BASE_URL="http://localhost:5000"
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjAxNjUxN2EzLTBmYWMtNGI5NC1iNGMxLTY5YWQzOGVjNmVhYSIsImVtYWlsIjoic2VjYnV5ZXJAdGVzdC5jb20iLCJyb2xlIjoidXNlciIsImlhdCI6MTc3MTI0OTg4MCwiZXhwIjoxNzcxODU0NjgwfQ.drzl5qeTli96R4JeWlAIJi2zCqReyWK2LSEU4Kb8EhE"

echo "🚀 Creating payment..."

RESPONSE=$(curl -s -X POST $BASE_URL/payments/pix/create \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount":10}')

PI_ID=$(echo $RESPONSE | jq -r .paymentIntentId)

echo "PaymentIntent: $PI_ID"

echo "💳 Confirming payment..."

stripe payment_intents confirm $PI_ID --payment-method pm_card_visa > /dev/null

sleep 3

echo "💸 Refund 4..."
stripe refunds create --payment-intent $PI_ID --amount 400

sleep 2

echo "💥 Refund 7 (should fail)..."
stripe refunds create --payment-intent $PI_ID --amount 700

sleep 2

echo "📊 Wallet history:"
mysql -u root -proot agrinet -e "
SELECT type, amount, payment_id
FROM wallet_history
ORDER BY created_at DESC
LIMIT 10;
"

echo "🏁 Test finished."

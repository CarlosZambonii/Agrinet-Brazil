#!/bin/bash

TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjAxNjUxN2EzLTBmYWMtNGI5NC1iNGMxLTY5YWQzOGVjNmVhYSIsImVtYWlsIjoic2VjYnV5ZXJAdGVzdC5jb20iLCJyb2xlIjoidXNlciIsImlhdCI6MTc3MTI0OTg4MCwiZXhwIjoxNzcxODU0NjgwfQ.drzl5qeTli96R4JeWlAIJi2zCqReyWK2LSEU4Kb8EhE"
USER_ID="016517a3-0fac-4b94-b4c1-69ad38ec6eaa"

echo "🚀 Creating and confirming 6 deposits..."

for i in {1..6}
do
  echo ""
  echo "---- Deposit $i ----"

  RESPONSE=$(curl -s -X POST http://localhost:5000/payments/pix/create \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"amount":10}')

  PI_ID=$(echo "$RESPONSE" | jq -r .paymentIntentId)

  if [ -z "$PI_ID" ] || [ "$PI_ID" = "null" ]; then
    echo "❌ Failed to create PaymentIntent"
    echo "$RESPONSE"
    exit 1
  fi

  echo "✔ Created: $PI_ID"

  stripe payment_intents confirm "$PI_ID" --payment-method pm_card_visa > /dev/null

  echo "✔ Confirmed"

  sleep 1
done

echo ""
echo "⏳ Waiting 3 seconds for webhook..."
sleep 3

echo ""
echo "📊 Checking velocity deposits count..."

mysql -u root -p agrinet -e "
SELECT COUNT(*) AS deposits_last_5_min
FROM wallet_history
WHERE user_id = '$USER_ID'
AND type = 'deposit'
AND created_at >= NOW() - INTERVAL 5 MINUTE;
"

echo ""
echo "🔒 Checking block status..."

mysql -u root -p agrinet -e "
SELECT id, is_blocked
FROM users
WHERE id = '$USER_ID';
"

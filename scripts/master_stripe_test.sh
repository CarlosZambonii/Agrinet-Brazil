#!/bin/bash

TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjAxNjUxN2EzLTBmYWMtNGI5NC1iNGMxLTY5YWQzOGVjNmVhYSIsImVtYWlsIjoic2VjYnV5ZXJAdGVzdC5jb20iLCJyb2xlIjoidXNlciIsImlhdCI6MTc3MTI0OTg4MCwiZXhwIjoxNzcxODU0NjgwfQ.drzl5qeTli96R4JeWlAIJi2zCqReyWK2LSEU4Kb8EhE"
BASE_URL="http://localhost:5000"
AMOUNT=10

echo "==============================="
echo "AGRINET STRIPE MASTER TEST"
echo "==============================="

echo ""
echo "1️⃣ Creating PaymentIntent..."
RESPONSE=$(curl -s -X POST $BASE_URL/payments/pix/create \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"amount\":$AMOUNT}")

PI=$(echo $RESPONSE | jq -r '.paymentIntentId')

if [ "$PI" = "null" ]; then
  echo "❌ Failed to create PaymentIntent"
  echo $RESPONSE
  exit 1
fi

echo "✔ PaymentIntent: $PI"

echo ""
echo "2️⃣ Confirming payment..."
stripe payment_intents confirm $PI --payment-method pm_card_visa > /dev/null
sleep 3

echo ""
echo "3️⃣ Checking deposit in DB..."
mysql -u root -proot agrinet -e "
SELECT type, amount, payment_id 
FROM wallet_history 
WHERE payment_id = '$PI';
"

echo ""
echo "4️⃣ Testing idempotency (resend event)..."
EVENT_ID=$(stripe events list --limit 1 | jq -r '.data[0].id')
stripe events resend $EVENT_ID > /dev/null
sleep 2

mysql -u root -proot agrinet -e "
SELECT COUNT(*) AS deposit_count
FROM wallet_history 
WHERE payment_id = '$PI'
AND type = 'deposit';
"

echo ""
echo "5️⃣ Creating partial refund (4 BRL)..."
stripe refunds create --payment-intent $PI --amount 400 > /dev/null
sleep 3

mysql -u root -proot agrinet -e "
SELECT type, amount 
FROM wallet_history 
WHERE payment_id = '$PI'
AND type = 'refund';
"

echo ""
echo "6️⃣ Trying over-refund (should fail)..."
stripe refunds create --payment-intent $PI --amount 900

echo ""
echo "7️⃣ Testing velocity fraud (6 deposits)..."
for i in {1..6}
do
  RESP=$(curl -s -X POST $BASE_URL/payments/pix/create \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"amount\":5}")

  PI2=$(echo $RESP | jq -r '.paymentIntentId')

  stripe payment_intents confirm $PI2 --payment-method pm_card_visa > /dev/null
  sleep 1
done

echo ""
echo "Checking user block status..."
USER_ID=$(echo $RESPONSE | jq -r '.userId')

mysql -u root -proot agrinet -e "
SELECT id, is_blocked 
FROM users;
"

echo ""
echo "8️⃣ Checking metrics snapshot..."
curl -s $BASE_URL/metrics | grep stripe_payment_succeeded_total

echo ""
echo "==============================="
echo "TEST FINISHED"
echo "==============================="

#!/bin/bash

TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjAxNjUxN2EzLTBmYWMtNGI5NC1iNGMxLTY5YWQzOGVjNmVhYSIsImVtYWlsIjoic2VjYnV5ZXJAdGVzdC5jb20iLCJyb2xlIjoidXNlciIsImlhdCI6MTc3MTI0OTg4MCwiZXhwIjoxNzcxODU0NjgwfQ.drzl5qeTli96R4JeWlAIJi2zCqReyWK2LSEU4Kb8EhE"
USER_ID="016517a3-0fac-4b94-b4c1-69ad38ec6eaa"

echo "Creating 6 deposits..."

RESPONSE=$(curl -s -X POST http://localhost:5000/payments/pix/create \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount":10}')

echo "$RESPONSE"

PI_ID=$(echo "$RESPONSE" | jq -r .paymentIntentId)

if [ -z "$PI_ID" ] || [ "$PI_ID" = "null" ]; then
  echo "❌ Failed to create PaymentIntent"
  exit 1
fi

echo "✔ PaymentIntent created: $PI_ID"

echo ""
echo "Checking block status..."

mysql -u root -p agrinet -e "
SELECT id, is_blocked
FROM users
WHERE id = '$USER_ID';
"

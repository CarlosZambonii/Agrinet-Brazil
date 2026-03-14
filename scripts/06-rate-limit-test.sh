#!/bin/bash

echo "==============================="
echo "06 - RATE LIMIT TEST"
echo "==============================="

for i in {1..25}
do
  echo "Request $i"
  curl -s -o /dev/null -w "%{http_code}\n" \
  -X POST http://localhost:5000/payments/pix/create \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount":10}'
done

#!/bin/bash

TOKEN_BUYER=$TOKEN_BUYER
TOKEN_SELLER=$TOKEN_SELLER
LISTING_ID="11111111-1111-1111-1111-111111111111"

echo "Creating transaction..."

TX=$(curl -s -X POST http://localhost:5000/transactions/from-listing \
-H "Authorization: Bearer $TOKEN_BUYER" \
-H "Content-Type: application/json" \
-d "{\"listingId\":\"$LISTING_ID\",\"quantity\":1}" | jq -r '.transactionId')

echo "Transaction ID: $TX"

echo "Creating payment intent..."

PI=$(curl -s -X POST http://localhost:5000/transactions/$TX/pay \
-H "Authorization: Bearer $TOKEN_BUYER" | jq -r '.clientSecret')

PI_ID=$(echo $PI | sed 's/_secret.*//')

echo "PaymentIntent: $PI_ID"

echo "Confirming payment..."

stripe payment_intents confirm $PI_ID --payment-method pm_card_visa

echo "Waiting webhook..."
sleep 2

echo "Releasing escrow..."

curl -s -X POST http://localhost:5000/transactions/$TX/release \
-H "Authorization: Bearer $TOKEN_SELLER"

echo
echo "Checking metrics..."

curl -s http://localhost:5000/metrics | grep escrow

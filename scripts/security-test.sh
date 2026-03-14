#!/bin/bash

BASE_URL="http://localhost:5000"

BUYER_EMAIL="secbuyer@test.com"
SELLER_EMAIL="secseller@test.com"
PASSWORD="123456"

echo "=== SECURITY TEST START ==="

############################################
# LOGIN / REGISTER
############################################

BUYER_TOKEN=$(curl -s -X POST $BASE_URL/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$BUYER_EMAIL\",\"password\":\"$PASSWORD\"}" | jq -r .token)

if [ "$BUYER_TOKEN" = "null" ]; then
  BUYER_TOKEN=$(curl -s -X POST $BASE_URL/auth/register \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$BUYER_EMAIL\",\"password\":\"$PASSWORD\"}" | jq -r .token)
fi

SELLER_TOKEN=$(curl -s -X POST $BASE_URL/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$SELLER_EMAIL\",\"password\":\"$PASSWORD\"}" | jq -r .token)

if [ "$SELLER_TOKEN" = "null" ]; then
  SELLER_TOKEN=$(curl -s -X POST $BASE_URL/auth/register \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$SELLER_EMAIL\",\"password\":\"$PASSWORD\"}" | jq -r .token)
fi

BUYER_ID=$(echo $BUYER_TOKEN | cut -d '.' -f2 | base64 -d 2>/dev/null | jq -r .id)
SELLER_ID=$(echo $SELLER_TOKEN | cut -d '.' -f2 | base64 -d 2>/dev/null | jq -r .id)

############################################
# CREATE TRANSACTION
############################################

TX_RESPONSE=$(curl -s -X POST $BASE_URL/api/marketplace/transactions \
  -H "Authorization: Bearer $BUYER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"sellerId\":\"$SELLER_ID\",\"amount\":5}")

echo "Create TX response: $TX_RESPONSE"
TX_ID=$(echo $TX_RESPONSE | jq -r .transaction.id)

echo "TX: $TX_ID"
if [ -z "$TX_ID" ] || [ "$TX_ID" = "null" ]; then
  echo "❌ Failed to create transaction. Full response:"
  echo "$TX_RESPONSE"
  exit 1
fi

############################################
# DOUBLE RATING TEST
############################################

echo "Rating twice as buyer (should 409 second)..."
curl -s -X POST $BASE_URL/api/marketplace/transactions/rate \
  -H "Authorization: Bearer $BUYER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"transactionId\":\"$TX_ID\",\"rating\":4}"

curl -s -X POST $BASE_URL/api/marketplace/transactions/rate \
  -H "Authorization: Bearer $BUYER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"transactionId\":\"$TX_ID\",\"rating\":4}"

############################################
# COMPLETE RATING
############################################

curl -s -X POST $BASE_URL/api/marketplace/transactions/rate \
  -H "Authorization: Bearer $SELLER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"transactionId\":\"$TX_ID\",\"rating\":4}"

############################################
# DOUBLE RELEASE TEST
############################################

echo "First release:"
curl -s -X POST $BASE_URL/api/marketplace/transactions/release-escrow \
  -H "Authorization: Bearer $BUYER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"transactionId\":\"$TX_ID\"}"

echo "Second release (should fail 409):"
curl -s -X POST $BASE_URL/api/marketplace/transactions/release-escrow \
  -H "Authorization: Bearer $BUYER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"transactionId\":\"$TX_ID\"}"

############################################
# VERIFY WALLET HISTORY
############################################

echo "Wallet history entries for TX:"
mysql -u root -proot agrinet -e "
SELECT user_id,type,amount,ref_id
FROM wallet_history
WHERE ref_id LIKE '$TX_ID%';
"

echo "=== SECURITY TEST END ==="

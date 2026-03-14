#!/bin/bash

BASE_URL="http://localhost:5000"

BUYER_EMAIL="warbuyer@test.com"
SELLER_EMAIL="warseller@test.com"
PASSWORD="123456"

echo "=== WAR TEST START ==="

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
# CREATE TX
############################################

TX_RESPONSE=$(curl -s -X POST $BASE_URL/api/marketplace/transactions \
  -H "Authorization: Bearer $BUYER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"sellerId\":\"$SELLER_ID\",\"amount\":5}")

echo "Create TX response: $TX_RESPONSE"

TX_ID=$(echo $TX_RESPONSE | jq -r .transaction.id)

echo "TX: $TX_ID"

if [ -z "$TX_ID" ] || [ "$TX_ID" = "null" ]; then
  echo "❌ Failed to create TX"
  exit 1
fi

############################################
# RATE BOTH SIDES
############################################

curl -s -X POST $BASE_URL/api/marketplace/transactions/rate \
  -H "Authorization: Bearer $BUYER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"transactionId\":\"$TX_ID\",\"rating\":4}"

curl -s -X POST $BASE_URL/api/marketplace/transactions/rate \
  -H "Authorization: Bearer $SELLER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"transactionId\":\"$TX_ID\",\"rating\":4}"

############################################
# MAKE ADMIN TOKEN
############################################

ADMIN_EMAIL="admin@test.com"

ADMIN_TOKEN=$(curl -s -X POST $BASE_URL/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"123456\"}" | jq -r .token)

############################################
# WAR: RELEASE VS CANCEL
############################################

echo "⚔️ Running release and cancel simultaneously..."

curl -s -X POST $BASE_URL/api/marketplace/transactions/release-escrow \
  -H "Authorization: Bearer $BUYER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"transactionId\":\"$TX_ID\"}" &

curl -s -X POST $BASE_URL/api/marketplace/admin/resolve-flag \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"transactionId\":\"$TX_ID\",\"action\":\"cancel\"}" &

wait

############################################
# CHECK RESULT
############################################

echo "Final transaction state:"
mysql -u root -proot agrinet -e "
SELECT id,status,escrow_locked FROM transactions WHERE id='$TX_ID';
"

echo "Wallet history:"
mysql -u root -proot agrinet -e "
SELECT user_id,type,amount,ref_id FROM wallet_history WHERE ref_id LIKE '$TX_ID%';
"

echo "=== WAR TEST END ==="

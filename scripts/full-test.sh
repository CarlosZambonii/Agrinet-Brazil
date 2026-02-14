#!/bin/bash

BASE_URL="http://localhost:5000"

echo "🚀 Starting full automated flow..."

BUYER_EMAIL="flowbuyer@test.com"
SELLER_EMAIL="flowseller@test.com"
PASSWORD="123456"

############################################
# 1️⃣ Register/Login Buyer
############################################
echo "🔐 Buyer login/register..."

BUYER_TOKEN=$(curl -s -X POST $BASE_URL/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$BUYER_EMAIL\",\"password\":\"$PASSWORD\"}" | jq -r .token)

if [ "$BUYER_TOKEN" = "null" ]; then
  echo "Buyer not found. Creating..."
  BUYER_TOKEN=$(curl -s -X POST $BASE_URL/auth/register \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$BUYER_EMAIL\",\"password\":\"$PASSWORD\"}" | jq -r .token)
fi

echo "✅ Buyer ready"

############################################
# 2️⃣ Register/Login Seller
############################################
echo "🔐 Seller login/register..."

SELLER_TOKEN=$(curl -s -X POST $BASE_URL/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$SELLER_EMAIL\",\"password\":\"$PASSWORD\"}" | jq -r .token)

if [ "$SELLER_TOKEN" = "null" ]; then
  echo "Seller not found. Creating..."
  SELLER_TOKEN=$(curl -s -X POST $BASE_URL/auth/register \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$SELLER_EMAIL\",\"password\":\"$PASSWORD\"}" | jq -r .token)
fi

echo "✅ Seller ready"

############################################
# 3️⃣ Extract IDs from token
############################################
BUYER_ID=$(echo $BUYER_TOKEN | cut -d '.' -f2 | base64 -d 2>/dev/null | jq -r .id)
SELLER_ID=$(echo $SELLER_TOKEN | cut -d '.' -f2 | base64 -d 2>/dev/null | jq -r .id)

############################################
# 4️⃣ Ensure wallets exist (manual fallback)
############################################
echo "💰 Make sure wallets exist in DB for:"
echo "Buyer ID: $BUYER_ID"
echo "Seller ID: $SELLER_ID"
echo "If missing, insert manually once."

############################################
# 5️⃣ Create Transaction
############################################
echo "💸 Creating transaction..."

TX_RESPONSE=$(curl -s -X POST $BASE_URL/api/marketplace/transactions \
  -H "Authorization: Bearer $BUYER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"sellerId\":\"$SELLER_ID\",\"amount\":5}")

TRANSACTION_ID=$(echo $TX_RESPONSE | jq -r .transaction.id)

echo "Transaction ID: $TRANSACTION_ID"

############################################
# 6️⃣ Buyer rates
############################################
echo "⭐ Buyer rating..."
curl -s -X POST $BASE_URL/api/marketplace/transactions/rate \
  -H "Authorization: Bearer $BUYER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"transactionId\":\"$TRANSACTION_ID\",\"rating\":4}"

############################################
# 7️⃣ Seller rates
############################################
echo "⭐ Seller rating..."
curl -s -X POST $BASE_URL/api/marketplace/transactions/rate \
  -H "Authorization: Bearer $SELLER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"transactionId\":\"$TRANSACTION_ID\",\"rating\":4}"

############################################
# 8️⃣ Release Escrow (buyer)
############################################
echo "🔓 Releasing escrow..."
curl -s -X POST $BASE_URL/api/marketplace/transactions/release-escrow \
  -H "Authorization: Bearer $BUYER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"transactionId\":\"$TRANSACTION_ID\"}"

############################################
# 9️⃣ Verify
############################################
echo ""
echo "📊 Final status:"
mysql -u root -p agrinet -e "SELECT id,status,escrow_locked FROM transactions WHERE id='$TRANSACTION_ID';"

echo "🎉 Flow completed."

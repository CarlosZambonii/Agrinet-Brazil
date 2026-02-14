#!/bin/bash

API="http://localhost:5000"
EMAIL="auto_admin@test.com"
PASS="123456"

echo "🚀 Admin auto test..."

# Try login first
LOGIN_RESPONSE=$(curl -s -X POST $API/auth/login \
-H "Content-Type: application/json" \
-d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}")

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*"' | cut -d '"' -f4)

# If login failed, register
if [ -z "$TOKEN" ]; then
  echo "Admin not found. Creating..."

  curl -s -X POST $API/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\",\"role\":\"admin\"}" > /dev/null

  # Force role = admin in DB
  mysql -u root -p agrinet -e "UPDATE users SET role='admin' WHERE email='$EMAIL';"

  LOGIN_RESPONSE=$(curl -s -X POST $API/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}")

  TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*"' | cut -d '"' -f4)
fi

echo "✅ Admin ready"
echo "🔐 Token acquired"

echo ""
echo "📊 Calling admin stats endpoint..."
curl -s -H "Authorization: Bearer $TOKEN" \
$API/api/marketplace/admin/stats

echo ""
echo "🎉 Done."

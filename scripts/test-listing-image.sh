#!/bin/bash

BASE_URL="http://localhost:5000"

USER_EMAIL="imgtester@test.com"
PASSWORD="123456"

echo "=== IMAGE UPLOAD TEST START ==="

############################################
# LOGIN / REGISTER
############################################

TOKEN=$(curl -s -X POST $BASE_URL/auth/login \
-H "Content-Type: application/json" \
-d "{\"email\":\"$USER_EMAIL\",\"password\":\"$PASSWORD\"}" | jq -r .token)

if [ "$TOKEN" = "null" ]; then
TOKEN=$(curl -s -X POST $BASE_URL/auth/register \
-H "Content-Type: application/json" \
-d "{\"email\":\"$USER_EMAIL\",\"password\":\"$PASSWORD\"}" | jq -r .token)
fi

USER_ID=$(echo $TOKEN | cut -d '.' -f2 | base64 -d 2>/dev/null | jq -r .id)

echo "User: $USER_ID"

############################################
# CREATE LISTING
############################################

echo "Creating listing..."

LISTING_RESPONSE=$(curl -s -X POST $BASE_URL/listings \
-H "Authorization: Bearer $TOKEN" \
-H "Content-Type: application/json" \
-d "{
\"title\":\"Milho teste imagem\",
\"category\":\"graos\",
\"description\":\"Teste de upload de imagem\",
\"price\":100,
\"unit\":\"saca\",
\"quantity_available\":10,
\"city\":\"Ribeirao Preto\",
\"state\":\"SP\"
}")

LISTING_ID=$(echo $LISTING_RESPONSE | jq -r .id)

echo "Listing ID: $LISTING_ID"

############################################
# CREATE TEST IMAGE
############################################

echo "Downloading test image..."
wget -q https://picsum.photos/300 -O test-image.jpg

############################################
# UPLOAD IMAGE
############################################

echo "Uploading image..."

UPLOAD_RESPONSE=$(curl -s -X POST $BASE_URL/listings/$LISTING_ID/images \
-H "Authorization: Bearer $TOKEN" \
-F "image=@test-image.jpg")

echo "$UPLOAD_RESPONSE"

############################################
# VERIFY DATABASE
############################################

echo "Checking listing_images table..."

mysql -u root -proot agrinet -e "
SELECT id, listing_id, image_url
FROM listing_images
WHERE listing_id = '$LISTING_ID';
"

echo "=== IMAGE UPLOAD TEST END ==="

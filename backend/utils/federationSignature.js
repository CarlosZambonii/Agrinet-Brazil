const crypto = require("crypto");

function generateSignature(body, secret) {
  return crypto
    .createHmac("sha256", secret)
    .update(JSON.stringify(body))
    .digest("hex");
}

module.exports = { generateSignature };

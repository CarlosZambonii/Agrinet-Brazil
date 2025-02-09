const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  name: String,
  email: String,
  location: String,
  role: { type: String, enum: ["producer", "consumer"] },
  reputationScore: { type: Number, default: 0 },  // LBTAS Score
});

module.exports = mongoose.model("User", UserSchema);

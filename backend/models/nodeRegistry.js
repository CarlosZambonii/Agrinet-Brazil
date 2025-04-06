const mongoose = require("mongoose");

const NodeRegistrySchema = new mongoose.Schema({
  nodeUrl: { type: String, required: true, unique: true },
  region: { type: String },
  contactEmail: { type: String },
  registeredAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("NodeRegistry", NodeRegistrySchema);

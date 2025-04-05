const mongoose = require("mongoose");

const AgrotourismSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  title: { type: String, required: true },
  location: { type: String, required: true },
  description: { type: String },
  date: { type: Date, required: true },
  maxGuests: { type: Number },
  images: [{ type: String }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Agrotourism", AgrotourismSchema);

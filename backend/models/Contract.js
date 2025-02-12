const mongoose = require("mongoose");

const ContractSchema = new mongoose.Schema({
  producerId: String,
  type: String,
  variety: String,
  category: String,
  amountNeeded: String,
  dateNeeded: Date,
  pingRate: String,
  status: { type: String, default: "open" },
  progressUpdates: [
    {
      progress: String,
      updateTime: { type: Date, default: Date.now }
    }
  ]
});

module.exports = mongoose.model("Contract", ContractSchema);

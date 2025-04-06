const axios = require("axios");
const NodeRegistry = require("../models/nodeRegistry");
const federationRoutes = require("../routes/federationRoutes");
const Listing = require("../models/marketplace/listing");
const Transaction = require("../models/transaction");
const User = require("../models/user");

const upsertMany = async (Model, items, key = "_id") => {
  for (let item of items) {
    const existing = await Model.findOne({ [key]: item[key] });
    if (!existing) {
      await Model.create(item);
    } else if (new Date(item.updatedAt) > new Date(existing.updatedAt)) {
      await Model.updateOne({ [key]: item[key] }, item);
    }
  }
};

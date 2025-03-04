const Transaction = require("../models/Transaction");
const User = require("../models/User");

exports.createTransaction = async (req, res) => {
    try {
        const { contractId, consumerId, producerId } = req.body;

        const newTransaction = new Transaction({
            contractId,
            consumerId,
            producerId,
            rating: null,
            status: "pending"
        });

        await newTransaction.save();
        res.status(201).json({ message: "Transaction created", data: newTransaction });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.submitRating = async (req, res) => {
    try {
        const { transactionId, rating } = req.body;

        if (rating < -1 || rating > 4) {
            return res.status(400).json({ error: "Invalid rating value" });
        }

        const transaction = await Transaction.findById(transactionId);
        if (!transaction) return res.status(404).json({ error: "Transaction not found" });

        transaction.rating = rating;
        transaction.status = "completed";
        await transaction.save();

        res.json({ message: "Rating submitted successfully", data: transaction });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const DepositAccount = require("../models/depositAccount");

// Create or return a user's deposit account
exports.getOrCreateAccount = async (req, res) => {
  try {
    const userId = req.user.id; // Assumes auth middleware adds user
    let account = await DepositAccount.findOne({ userId });
    if (!account) {
      account = new DepositAccount({ userId });
      await account.save();
    }
    res.json(account);
  } catch (error) {
    res.status(500).json({ error: "Error fetching deposit account" });
  }
};

// Fund account
exports.fundAccount = async (req, res) => {
  try {
    const { amount, note } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: "Invalid amount" });

    const userId = req.user.id;
    let account = await DepositAccount.findOne({ userId });
    if (!account) return res.status(404).json({ error: "Account not found" });

    account.balance += amount;
    account.transactionHistory.push({ type: "fund", amount, note });
    await account.save();

    res.json({ message: "Account funded", newBalance: account.balance });
  } catch (error) {
    res.status(500).json({ error: "Error funding account" });
  }
};

// Withdraw from account
exports.withdrawAccount = async (req, res) => {
  try {
    const { amount, note } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: "Invalid amount" });

    const userId = req.user.id;
    let account = await DepositAccount.findOne({ userId });
    if (!account) return res.status(404).json({ error: "Account not found" });

    if (account.balance < amount) return res.status(400).json({ error: "Insufficient funds" });

    account.balance -= amount;
    account.transactionHistory.push({ type: "withdraw", amount, note });
    await account.save();

    res.json({ message: "Withdrawal successful", newBalance: account.balance });
  } catch (error) {
    res.status(500).json({ error: "Error withdrawing from account" });
  }
};

// Get transaction history
exports.getTransactionHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    let account = await DepositAccount.findOne({ userId });
    if (!account) return res.status(404).json({ error: "Account not found" });

    res.json(account.transactionHistory);
  } catch (error) {
    res.status(500).json({ error: "Error retrieving transaction history" });
  }
};

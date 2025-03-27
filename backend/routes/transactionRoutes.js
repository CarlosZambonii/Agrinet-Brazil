router.post("/transactions", async (req, res) => {
  const newTransaction = new Transaction(req.body);
  await newTransaction.save();

  // Real-time notification to buyer and/or seller
  global.io.emit("new-transaction", {
    transactionId: newTransaction._id,
    buyerId: newTransaction.buyerId
  });

  res.status(201).json({ message: "Transaction initiated", transaction: newTransaction });
});

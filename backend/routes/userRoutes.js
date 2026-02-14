const express = require("express");
const userRepository = require("../repositories/userRepository");

const router = express.Router();

router.post("/", async (req, res, next) => {
  try {
    const { id, email } = req.body;

    if (!id || !email) return res.status(400).json({ error: "id and email required" });

    await userRepository.create({ id, email });

    res.status(201).json({ message: "User created", user: { id, email } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

const express = require("express");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const pool = require("../lib/db");
const { sign } = require("../lib/jwt");
const { authLimiter } = require("../middlewares/rateLimiters");

const router = express.Router();

router.post("/register", authLimiter, async (req, res) => {
  const { email, password } = req.body;

  if (!email || typeof email !== "string" || !email.includes("@")) {
    return res.status(400).json({ error: "Invalid email" });
  }

  if (!password || typeof password !== "string" || password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters" });
  }

  const hash = await bcrypt.hash(password, 10);

  const id = crypto.randomUUID();

  await pool.query(
    "INSERT INTO users (id, email) VALUES (?, ?) ON DUPLICATE KEY UPDATE email=email",
    [id, email]
  );

  await pool.query(
    "INSERT IGNORE INTO wallets (user_id, balance) VALUES (?, 0)",
    [id]
  );

  const role = "user";
  const token = sign({ id, email, role });

  res.status(201).json({ token });
});

router.post("/login", authLimiter, async (req, res) => {
  const { email } = req.body;

  if (!email || typeof email !== "string" || !email.includes("@")) {
    return res.status(400).json({ error: "Invalid email" });
  }

  const [rows] = await pool.query(
    "SELECT id, email, role FROM users WHERE email = ?",
    [email]
  );

  if (!rows.length) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const user = rows[0];
  const token = sign({ id: user.id, email: user.email, role: user.role });

  res.json({ token });
});

module.exports = router;

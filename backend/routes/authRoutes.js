const express = require("express");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const pool = require("../lib/db");
const { sign } = require("../lib/jwt");

const router = express.Router();

router.post("/register", async (req, res) => {
  const { email, password } = req.body;

  const hash = await bcrypt.hash(password, 10);

  const id = crypto.randomUUID();

  await pool.query(
    "INSERT INTO users (id, email) VALUES (?, ?) ON DUPLICATE KEY UPDATE email=email",
    [id, email]
  );

  const token = sign({ id, email });

  res.status(201).json({ token });
});

router.post("/login", async (req, res) => {
  const { email } = req.body;

  const [rows] = await pool.query(
    "SELECT id, email FROM users WHERE email = ?",
    [email]
  );

  if (!rows.length) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const user = rows[0];

  const token = sign({ id: user.id, email: user.email });

  res.json({ token });
});

module.exports = router;

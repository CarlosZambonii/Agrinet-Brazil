const express = require('express');
const router = express.Router();
const User = require('../models/user'); // Ensure path is correct

// GET /users - fetch all users, omit sensitive data
router.get('/', async (req, res) => {
  try {
    const users = await User.find({}, '-password'); // omit password field
    res.json(users);
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// POST /users - simple user creation
router.post('/', (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }
  res.status(201).json({ message: 'User created', user: { name } });
});

module.exports = router;

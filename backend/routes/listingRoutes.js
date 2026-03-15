const express = require("express");
const router = express.Router();

// exemplo de rota
router.get("/", (req, res) => {
  res.json({ message: "Listings route working" });
});

module.exports = router;
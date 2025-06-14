const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json([{ id: 1, name: 'Avocado', price: 3.5 }]);
});

module.exports = router;

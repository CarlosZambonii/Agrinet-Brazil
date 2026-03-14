const express = require('express');
const { randomUUID } = require('crypto');
const listingService = require('../services/listingService');
const pool = require('../backend/lib/db');
const { authenticateToken } = require('../backend/middleware/authMiddleware');
const { sanitizeFields } = require('../backend/middleware/sanitizeInput');
const upload = require('../backend/middleware/uploadMiddleware');
const { listingsViewedTotal } = require('../backend/lib/metrics');
const { federatedSearch } = require('../backend/services/federatedSearchService');

const router = express.Router();
router.use(authenticateToken);

router.get('/', async (req, res) => {
  try {
    const { limit, page } = req.query;

    if (limit && (isNaN(limit) || Number(limit) <= 0)) {
      return res.status(400).json({ error: "Invalid limit" });
    }

    if (page && (isNaN(page) || Number(page) <= 0)) {
      return res.status(400).json({ error: "Invalid page" });
    }

    const listings = await listingService.searchListings(req.query);
    return res.json(listings);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/search-global', async (req, res) => {

  const results = await federatedSearch(req.query);

  res.json(results);

});

router.post('/', sanitizeFields(["title", "description"]), async (req, res) => {
  try {
    if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
      return res.status(400).json({ error: "Invalid listing payload" });
    }

    const listing = await listingService.createListing({
      ...req.body,
      user_id: req.user.id
    });
    return res.status(201).json({
      message: "Listing created",
      id: listing.id
    });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

router.post('/:id/images', upload.single('image'), async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const listingId = req.params.id;

    if (!listingId || typeof listingId !== "string") {
      return res.status(400).json({ error: "Invalid listing id" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "Image file is required" });
    }

    const imageUrl = `/uploads/listings/${req.file.filename}`;
    const imageId = randomUUID();

    await connection.query(
      `INSERT INTO listing_images (id, listing_id, image_url, position)
       VALUES (?, ?, ?, 0)`,
      [imageId, listingId, imageUrl]
    );

    return res.status(201).json({
      message: "Image uploaded",
      imageUrl
    });

  } catch (err) {
    return res.status(400).json({ error: err.message });

  } finally {
    connection.release();
  }
});

router.post('/:id/flag', async (req, res) => {
  const listingId = req.params.id;

  await pool.query(
    "UPDATE listings SET moderation_status='flagged' WHERE id=?",
    [listingId]
  );

  res.json({ message: "Listing flagged for review" });
});

router.get('/:id/images', async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { id } = req.params;

    if (!id || typeof id !== "string") {
      return res.status(400).json({ error: "Invalid listing id" });
    }

    const [rows] = await connection.query(
      `SELECT id, image_url, position
       FROM listing_images
       WHERE listing_id = ?
       ORDER BY position ASC`,
      [id]
    );

    return res.json(rows);

  } catch (err) {
    return res.status(500).json({ error: err.message });

  } finally {
    connection.release();
  }
});

router.get('/:id', async (req, res) => {

  const { id } = req.params;

  if (!id || typeof id !== "string") {
    return res.status(400).json({ error: "Invalid listing id" });
  }

  const [rows] = await pool.query(
    `
    SELECT *
    FROM listings
    WHERE id = ?
      AND status = 'active'
    `,
    [id]
  );

  if (!rows.length) {
    return res.status(404).json({ error: "Listing not found" });
  }

  await pool.query(
    "UPDATE listing_stats SET views = views + 1 WHERE listing_id = ?",
    [id]
  );

  listingsViewedTotal.inc();

  res.json(rows[0]);

});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== "string") {
      return res.status(400).json({ error: "Invalid listing id" });
    }

    const userId = req.user.id; // vindo do middleware auth
    await listingService.deleteListing(req.params.id, userId);
    return res.json({ message: 'Listing deleted' });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

router.put('/:id', sanitizeFields(["title", "description"]), async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== "string") {
      return res.status(400).json({ error: "Invalid listing id" });
    }

    if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
      return res.status(400).json({ error: "Invalid update payload" });
    }

    const userId = req.user.id;

    await listingService.updateListing(
      req.params.id,
      userId,
      req.body
    );

    return res.json({ message: 'Listing updated' });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

router.patch('/:id/pause', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== "string") {
      return res.status(400).json({ error: "Invalid listing id" });
    }

    await listingService.changeStatus(
      req.params.id,
      req.user.id,
      'paused'
    );

    return res.json({ message: 'Listing paused' });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

router.patch('/:id/activate', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== "string") {
      return res.status(400).json({ error: "Invalid listing id" });
    }

    await listingService.changeStatus(
      req.params.id,
      req.user.id,
      'active'
    );

    return res.json({ message: 'Listing activated' });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

module.exports = router;

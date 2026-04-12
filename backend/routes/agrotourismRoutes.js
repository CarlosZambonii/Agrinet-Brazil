const express = require("express");
const router = express.Router();
const multer = require("multer");
const Agrotourism = require("../models/agrotourism");
const authMiddleware = require("../middleware/authMiddleware");
const { uploadFile } = require("../lib/storage");

const upload = multer({ storage: multer.memoryStorage() });

// Create Agrotourism Listing
router.post("/create", authMiddleware, upload.array("images", 5), async (req, res) => {
  try {
    const { title, location, description, date, maxGuests } = req.body;
    const imagePaths = await Promise.all(
      req.files.map(file => uploadFile(file.buffer, file.mimetype, "agrotourism"))
    );

    const newListing = new Agrotourism({
      userId: req.user.id,
      title,
      location,
      description,
      date,
      maxGuests,
      images: imagePaths
    });

    await newListing.save();
    res.status(201).json({ message: "Agrotourism listing created", listing: newListing });
  } catch (error) {
    res.status(500).json({ error: "Error creating listing" });
  }
});

// Get all Agrotourism listings
router.get("/all", async (req, res) => {
  try {
    const listings = await Agrotourism.find().sort({ date: -1 });
    res.json(listings);
  } catch (error) {
    res.status(500).json({ error: "Error fetching listings" });
  }
});

module.exports = router;

const Market = require("../models/Market");

exports.createListing = async (req, res) => {
    try {
        const { title, description, category, location, price, images } = req.body;

        const newListing = new Market({
            title,
            description,
            category,
            location,
            price,
            images
        });

        await newListing.save();
        res.status(201).json({ message: "Listing created", data: newListing });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

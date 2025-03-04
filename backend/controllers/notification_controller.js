const Broadcast = require("../models/Broadcast");

exports.createBroadcast = async (req, res) => {
    try {
        const { message, targetUsers } = req.body;

        const newBroadcast = new Broadcast({
            message,
            targetUsers
        });

        await newBroadcast.save();
        res.status(201).json({ message: "Broadcast sent", data: newBroadcast });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

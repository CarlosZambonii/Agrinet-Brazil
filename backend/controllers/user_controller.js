const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

exports.registerUser = async (req, res) => {
    try {
        const { name, email, location, role, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            name,
            email,
            location,
            role, // "producer" or "consumer"
            password: hashedPassword,
            reputationScore: 0,
            verified: false
        });

        await newUser.save();
        res.status(201).json({ message: "User registered successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.verifyUser = async (req, res) => {
    try {
        const { email, verificationCode } = req.body;
        const user = await User.findOne({ email });

        if (!user) return res.status(404).json({ error: "User not found" });
        if (user.verificationCode !== verificationCode)
            return res.status(400).json({ error: "Invalid code" });

        user.verified = true;
        await user.save();
        res.json({ message: "User verified successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

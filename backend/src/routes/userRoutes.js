const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const User = require("../models/User");

// ✅ Get All Users (For Sharing)
router.get("/all", protect, async (req, res) => {
    try {
        const users = await User.find().select("_id name email");

        res.json({
            message: "Users fetched successfully ✅",
            users,
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;

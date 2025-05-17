const express = require("express");
const router = express.Router();
const User = require("../models/User");

// Get all contacts (users)
router.get("/", async (req, res) => {
  try {
    const users = await User.find({}, 'displayName email profilePic status');
    res.json({ contacts: users });
  } catch (error) {
    console.error("Error fetching contacts:", error);
    res.status(500).json({ error: "Failed to fetch contacts" });
  }
});

// Search users
router.get("/search", async (req, res) => {
  try {
    const { term } = req.query;
    if (!term) {
      return res.json({ users: [] });
    }

    const users = await User.find({
      $or: [
        { displayName: { $regex: term, $options: 'i' } },
        { email: { $regex: term, $options: 'i' } }
      ]
    }, 'displayName email profilePic status');

    res.json({ users });
  } catch (error) {
    console.error("Error searching users:", error);
    res.status(500).json({ error: "Failed to search users" });
  }
});

module.exports = router; 
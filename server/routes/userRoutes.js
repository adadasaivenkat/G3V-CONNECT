const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const User = require('../models/User');

const router = express.Router();

// Ensure uploads directory exists
if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// Save or update user
router.post("/saveUser", upload.single("profilePic"), async (req, res) => {
  try {
    const { email, displayName, about } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    const existingUser = await User.findOne({ email });
    let profilePic = existingUser?.profilePic || "/uploads/default-profile.png";

    if (req.file) {
      profilePic = `/uploads/${req.file.filename}`;
      if (
        existingUser?.profilePic &&
        existingUser.profilePic !== "/uploads/default-profile.png"
      ) {
        const oldPath = path.join(
          "uploads",
          path.basename(existingUser.profilePic)
        );
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }
    }

    const user = await User.findOneAndUpdate(
      { email },
      { displayName, about, profilePic },
      { new: true, upsert: true }
    );

    res.json({ message: "User saved successfully", user });
  } catch (error) {
    console.error("Error saving user:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Debug route to check if routes are working
router.get('/test', (req, res) => {
  res.json({ message: 'User routes are working!' });
});

// Get user by email
router.get('/getUser/:email', async (req, res) => {
  try {
    const { email } = req.params;
    console.log('Received request for email:', email);
    const user = await User.findOne({ email });
    
    if (!user) {
      console.log('User not found for email:', email);
      return res.status(404).json({ error: 'User not found' });
    }
    
    console.log('Found user:', user);
    
    // Return in the format expected by client
    res.json({
      _id: user._id,
      email: user.email,
      displayName: user.displayName || user.name || '',
      about: user.about || '',
      profilePic: user.profilePic || user.profile || '/uploads/default-profile.png'
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Delete profile picture
router.delete("/deleteProfilePic/:email", async (req, res) => {
  try {
    const { email } = req.params;
    const user = await User.findOne({ email });
    if (!user || user.profilePic === "/uploads/default-profile.png") {
      return res.status(404).json({ error: "No profile picture to delete" });
    }

    const imagePath = path.join("uploads", path.basename(user.profilePic));
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }

    user.profilePic = "/uploads/default-profile.png";
    await user.save();
    res.json({ 
      message: "Profile picture deleted successfully",
      user: {
        _id: user._id,
        email: user.email,
        displayName: user.displayName,
        about: user.about,
        profilePic: user.profilePic
      }
    });
  } catch (error) {
    console.error("Error deleting profile picture:", error);
    res.status(500).json({ error: "Server error" });
  }
});


// Add or update profile picture
router.post(
  "/addProfilePic/:email",
  upload.single("profilePic"),
  async (req, res) => {
    try {
      const { email } = req.params;
      const existingUser = await User.findOne({ email });
      if (!existingUser)
        return res.status(404).json({ error: "User not found" });

      let profilePic = existingUser.profilePic;

      if (req.file) {
        profilePic = `/uploads/${req.file.filename}`;
        if (
          existingUser.profilePic &&
          existingUser.profilePic !== "/uploads/default-profile.png"
        ) {
          const oldPath = path.join(
            "uploads",
            path.basename(existingUser.profilePic)
          );
          if (fs.existsSync(oldPath)) {
            fs.unlinkSync(oldPath);
          }
        }
      }

      existingUser.profilePic = profilePic;
      await existingUser.save();

      res.json({
        message: "Profile picture updated successfully",
        user: existingUser,
      });
    } catch (error) {
      console.error("Error updating profile picture:", error);
      res.status(500).json({ error: "Server error" });
    }
  }
);

// Get all contacts
router.get('/contacts', async (req, res) => {
  try {
    console.log('Received request for contacts');
    const users = await User.find({}, { password: 0 });
    console.log('Found users:', users);
    
    // Format users for client
    const contacts = users.map(user => ({
      _id: user._id,
      email: user.email,
      displayName: user.displayName || user.name || '',
      about: user.about || '',
      profilePic: user.profilePic || user.profile || '/uploads/default-profile.png',
      isOnline: user.isOnline || false,
      lastSeen: user.lastSeen || new Date()
    }));
    
    console.log('Sending contacts:', contacts);
    res.status(200).json({ contacts });
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
});

// Register a new user
router.post('/register', async (req, res) => {
  try {
    const { displayName, email, password, profilePic } = req.body;
    console.log('Received registration request for:', email);
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    // Create new user
    const newUser = new User({
      name: displayName,
      email,
      password, // In a real app, hash this password
      profile: profilePic || ""
    });
    
    await newUser.save();
    console.log('User registered:', email);
    
    res.status(201).json({ 
      message: 'User registered successfully', 
      user: {
        _id: newUser._id,
        email: newUser.email,
        displayName: newUser.name,
        profilePic: newUser.profile
      }
    });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('Received login request for:', email);
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // In a real app, compare hashed password
    if (user.password !== password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    console.log('User logged in:', email);
    res.json({ 
      message: 'Login successful', 
      user: { 
        _id: user._id,
        email: user.email,
        displayName: user.name,
        about: user.about,
        profilePic: user.profile
      }
    });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

// Optional: add a user for testing if none exists
router.get('/setup-test-user', async (req, res) => {
  try {
    const testEmail = 'adadasuryakumari@gmail.com';
    const existingUser = await User.findOne({ email: testEmail });
    
    if (existingUser) {
      return res.json({ message: 'Test user already exists', user: {
        _id: existingUser._id,
        email: existingUser.email,
        displayName: existingUser.name,
        about: existingUser.about,
        profilePic: existingUser.profile
      }});
    }
    
    const newUser = new User({
      name: 'Test User',
      email: testEmail,
      password: 'password123',
      profile: '',
      about: 'Test account'
    });
    
    await newUser.save();
    
    res.status(201).json({ 
      message: 'Test user created successfully', 
      user: {
        _id: newUser._id,
        email: newUser.email,
        displayName: newUser.name,
        about: newUser.about,
        profilePic: newUser.profile
      }
    });
  } catch (error) {
    console.error('Error creating test user:', error);
    res.status(500).json({ error: 'Failed to create test user' });
  }
});

// Update last seen status
router.post('/:userId/updateLastSeen', async (req, res) => {
  try {
    const { userId } = req.params;
    const { lastSeen, isOnline } = req.body;

    const updateData = {
      lastSeen: lastSeen || new Date()
    };

    // Only update isOnline if it's provided
    if (typeof isOnline === 'boolean') {
      updateData.isOnline = isOnline;
    }

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ 
      message: 'Last seen updated successfully',
      user: {
        _id: user._id,
        lastSeen: user.lastSeen,
        isOnline: user.isOnline
      }
    });
  } catch (error) {
    console.error('Error updating last seen:', error);
    res.status(500).json({ error: 'Failed to update last seen status' });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');

// Get Zego Cloud token
router.post('/get-token', verifyToken, async (req, res) => {
  try {
    const { roomId, userId } = req.body;
    
    // Generate token using Zego Cloud SDK
    const token = generateZegoToken(roomId, userId);
    
    res.json({ token });
  } catch (error) {
    console.error('Error generating call token:', error);
    res.status(500).json({ message: 'Failed to generate call token' });
  }
});

// Helper function to generate Zego Cloud token
function generateZegoToken(roomId, userId) {
  const appID = process.env.ZEGO_APP_ID;
  const appSecret = process.env.ZEGO_APP_SECRET;
  const effectiveTimeInSeconds = 7200; // 2 hours
  const payload = '';

  const timestamp = Math.floor(Date.now() / 1000);
  const nonce = Math.floor(Math.random() * 1000000000);

  const message = `${appID}${roomId}${userId}${timestamp}${nonce}${payload}`;
  const hmac = require('crypto').createHmac('sha256', appSecret);
  const signature = hmac.update(message).digest('base64');

  return {
    token: signature,
    roomId,
    userId,
    timestamp,
    nonce,
    appID
  };
}

module.exports = router; 
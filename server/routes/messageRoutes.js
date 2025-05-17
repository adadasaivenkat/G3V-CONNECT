const express = require("express");
const router = express.Router();
const Message = require("../models/Message");
const User = require("../models/User");
const mongoose = require('mongoose');

// Get messages between two users
router.get("/", async (req, res) => {
  try {
    const { from, to } = req.query;
    if (!from || !to) {
      return res.status(400).json({ error: "Missing required parameters" });
    }
    const messages = await Message.find({
      $or: [
        { senderId: from, receiverId: to },
        { senderId: to, receiverId: from }
      ]
    }).sort({ timestamp: 1 });
    const formattedMessages = messages.map(msg => ({
      id: msg._id.toString(),
      type: msg.type,
      text: msg.text,
      file: msg.file,
      fileName: msg.fileName,
      fileSize: msg.fileSize,
      senderId: msg.senderId,
      timestamp: msg.timestamp,
      replyTo: msg.replyTo,
      read: msg.read
    }));
    res.json({ messages: formattedMessages });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// Save a new message
router.post("/", async (req, res) => {
  try {
    const { from, to, message } = req.body;
    if (!from || !to || !message) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    const newMessage = new Message({
      senderId: from,
      receiverId: to,
      type: message.type,
      text: message.text,
      file: message.file,
      fileName: message.fileName,
      fileSize: message.fileSize,
      timestamp: message.timestamp || new Date(),
      replyTo: message.replyTo
    });

    await newMessage.save();

    // Return the saved message with its MongoDB ID
    res.json({
      message: {
        id: newMessage._id.toString(),
        type: newMessage.type,
        text: newMessage.text,
        file: newMessage.file,
        fileName: newMessage.fileName,
        fileSize: newMessage.fileSize,
        senderId: newMessage.senderId,
        timestamp: newMessage.timestamp,
        replyTo: newMessage.replyTo
      }
    });
  } catch (error) {
    console.error("Error saving message:", error);
    res.status(500).json({ error: "Failed to save message" });
  }
});

// Get recent chats with last message
router.get("/recent/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Get all messages for this user
    const messages = await Message.find({
      $or: [{ senderId: userId }, { receiverId: userId }]
    }).sort({ timestamp: -1 });

    // Group messages by chat partner
    const chatMap = new Map();
    
    messages.forEach(message => {
      const otherUserId = message.senderId === userId ? message.receiverId : message.senderId;
      
      if (!chatMap.has(otherUserId)) {
        chatMap.set(otherUserId, {
          user: null,
          lastMessage: message,
          unreadCount: 0
        });
      } else {
        const chat = chatMap.get(otherUserId);
        if (!chat.lastMessage || message.timestamp > chat.lastMessage.timestamp) {
          chat.lastMessage = message;
        }
        if (message.receiverId === userId && !message.read) {
          chat.unreadCount++;
        }
      }
    });

    // Fetch user details for each chat partner
    const chats = await Promise.all(
      Array.from(chatMap.entries()).map(async ([otherUserId, chat]) => {
        const user = await User.findById(otherUserId).select('displayName email profilePic status');
        return {
          user,
          lastMessage: chat.lastMessage,
          unreadCount: chat.unreadCount
        };
      })
    );

    // Sort by last message timestamp
    chats.sort((a, b) => {
      if (!a.lastMessage) return 1;
      if (!b.lastMessage) return -1;
      return new Date(b.lastMessage.timestamp) - new Date(a.lastMessage.timestamp);
    });

    res.json({ chats });
  } catch (error) {
    console.error("Error fetching recent chats:", error);
    res.status(500).json({ error: "Failed to fetch recent chats" });
  }
});



module.exports = router;

const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  senderId: {
    type: String,
    required: true
  },
  receiverId: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['text', 'image', 'video', 'audio', 'document', 'gif'],
    default: 'text'
  },
  text: {
    type: String
  },
  file: {
    type: String
  },
  fileName: {
    type: String
  },
  fileSize: {
    type: Number
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  read: {
    type: Boolean,
    default: false
  },
  replyTo: {
    id: String,
    text: String,
    senderId: String
  }
}, { timestamps: true });

module.exports = mongoose.model('Message', MessageSchema); 
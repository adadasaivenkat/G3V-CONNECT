const { Server } = require("socket.io");
const Message = require("./models/Message");
const User = require("./models/User");

const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:5173",
      methods: ["GET", "POST"],
    },
  });

  // Track user connections
  const userSockets = new Map(); // userId -> Set of socket IDs
  const socketToUser = new Map(); // socketId -> userId
  const messageCache = new Map(); // messageId -> timestamp

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // Register user
    socket.on("register-user", async (userId) => {
      if (!userId) return;
      
      console.log(`Registering user ${userId} with socket ${socket.id}`);
      
      // Get existing sockets for this user
      const existingSockets = userSockets.get(userId) || new Set();
      
      // Add new socket to the set
      existingSockets.add(socket.id);
      
      // Update tracking maps
      userSockets.set(userId, existingSockets);
      socketToUser.set(socket.id, userId);
      
      // Update user's online status in database
      await User.findByIdAndUpdate(userId, { 
        isOnline: true,
        lastSeen: new Date()
      });
      
      // Broadcast user's online status to all connected clients
      io.emit('user-online', userId);
      
      // Send current online users to the newly connected user
      const onlineUsers = Array.from(userSockets.keys());
      socket.emit('online-users', onlineUsers);
      
      console.log(`User ${userId} connected with socket ${socket.id}`);
      console.log('Current user sockets:', Array.from(userSockets.entries()));
      
      // Send acknowledgment
      socket.emit('user-registered', { userId, socketId: socket.id });
    });

    // Join chat room
    socket.on("join-chat", ({ from, to }) => {
      if (!from || !to) return;
      
      const roomId = [from, to].sort().join("_");
      socket.join(roomId);
      console.log(`User ${from} joined room ${roomId}`);
      console.log('Current rooms:', Array.from(socket.rooms));
    });

    // Handle messages
    socket.on("send-message", async ({ from, to, message }) => {
      try {
        console.log('Received send-message event:', { from, to, message });
        
        // Check if message was already processed
        const lastProcessedTime = messageCache.get(message.id);
        if (lastProcessedTime && Date.now() - lastProcessedTime < 1000) {
          console.log('Message already processed:', message.id);
          return;
        }
        messageCache.set(message.id, Date.now());

        // Get all sockets for the receiver
        const receiverSockets = userSockets.get(to) || new Set();
        console.log(`Found ${receiverSockets.size} sockets for receiver ${to}`);
        console.log('Receiver sockets:', Array.from(receiverSockets));
        
        // Emit to the chat room
        const roomId = [from, to].sort().join("_");
        const room = io.sockets.adapter.rooms.get(roomId);
        console.log(`Room ${roomId} has ${room?.size || 0} sockets`);
        
        // Emit to all sockets in the room
        io.in(roomId).emit("receive-message", { from, message });
        console.log(`Emitted receive-message to room ${roomId}`);
        
        // Also emit directly to receiver's sockets
        receiverSockets.forEach(sid => {
          const receiverSocket = io.sockets.sockets.get(sid);
          if (receiverSocket) {
            receiverSocket.emit("receive-message", { from, message });
            console.log(`Emitted receive-message directly to receiver socket ${sid}`);
          } else {
            console.log(`Receiver socket ${sid} not found`);
          }
        });
        
        // Send acknowledgment to sender
        socket.emit("message-sent", { message });
        console.log('Sent message-sent acknowledgment to sender');

        // Emit to all sender's sockets for contacts update
        const senderSockets = userSockets.get(from) || new Set();
        senderSockets.forEach(sid => {
          const senderSocket = io.sockets.sockets.get(sid);
          if (senderSocket) {
            senderSocket.emit("message-sent", { message });
            console.log(`Emitted message-sent to sender socket ${sid}`);
          }
        });

        // Clean up old message cache entries
        const now = Date.now();
        for (const [msgId, timestamp] of messageCache.entries()) {
          if (now - timestamp > 5000) { // Remove entries older than 5 seconds
            messageCache.delete(msgId);
          }
        }
      } catch (error) {
        console.error("Error sending message:", error);
        socket.emit("message-error", { error: "Failed to send message" });
      }
    });

    // Handle profile updates
    socket.on("profile-updated", ({ userId, updatedData }) => {
      if (!userId) return;
      
      // Broadcast to all connected clients
      io.emit("profile-updated", { userId, updatedData });
      
      // Also emit to all user's own sockets for consistency
      const userSocketIds = userSockets.get(userId) || new Set();
      userSocketIds.forEach(sid => {
        const userSocket = io.sockets.sockets.get(sid);
        if (userSocket) {
          userSocket.emit("profile-updated", { userId, updatedData });
        }
      });
    });

    // Handle disconnection
    socket.on("disconnect", async () => {
      const userId = socketToUser.get(socket.id);
      if (userId) {
        const userSocketIds = userSockets.get(userId);
        if (userSocketIds) {
          userSocketIds.delete(socket.id);
          if (userSocketIds.size === 0) {
            userSockets.delete(userId);
            // Update user's online status in database
            await User.findByIdAndUpdate(userId, { 
              isOnline: false,
              lastSeen: new Date()
            });
            // Broadcast user's offline status to all connected clients
            io.emit('user-offline', {
              userId,
              lastSeen: new Date()
            });
          }
        }
        socketToUser.delete(socket.id);
      }
      console.log("User disconnected:", socket.id);
      console.log('Current user sockets:', Array.from(userSockets.entries()));
    });

    // Handle user-offline event
    socket.on('user-offline', async (data) => {
      if (!data.userId) return;
      
      // Update user's online status in database
      await User.findByIdAndUpdate(data.userId, { 
        isOnline: false,
        lastSeen: data.lastSeen || new Date()
      });
      
      // Broadcast offline status to all clients
      io.emit('user-offline', {
        userId: data.userId,
        lastSeen: data.lastSeen || new Date()
      });
    });

    // Handle call events
    socket.on('initiate_call', (callData) => {
      console.log('Call initiated:', callData);
      console.log('Current user sockets:', Array.from(userSockets.entries()));
      
      // Get all sockets for the target user
      const targetUserSockets = userSockets.get(callData.to);
      if (targetUserSockets) {
        console.log(`Found ${targetUserSockets.size} sockets for target user ${callData.to}`);
        // Send call notification to all target user's sockets
        targetUserSockets.forEach(sid => {
          const targetSocket = io.sockets.sockets.get(sid);
          if (targetSocket) {
            const notificationData = {
              ...callData,
              timestamp: Date.now()
            };
            console.log(`Sending incoming call notification to socket ${sid}:`, notificationData);
            targetSocket.emit('incoming_call', notificationData, (response) => {
              console.log(`Notification sent to socket ${sid}, response:`, response);
            });
          } else {
            console.log(`Target socket ${sid} not found`);
          }
        });
      } else {
        // If target user is not online, notify the caller
        console.log(`No sockets found for target user ${callData.to}`);
        socket.emit('call_failed', { message: 'User is not online' });
      }
    });

    // Handle WebRTC signaling
    socket.on('offer', (data) => {
      console.log('Received offer:', data);
      const targetUserSockets = userSockets.get(data.to);
      if (targetUserSockets) {
        targetUserSockets.forEach(sid => {
          const targetSocket = io.sockets.sockets.get(sid);
          if (targetSocket) {
            targetSocket.emit('offer', {
              offer: data.offer,
              from: data.from
            });
            console.log(`Forwarded offer to socket ${sid}`);
          }
        });
      }
    });

    socket.on('answer', (data) => {
      console.log('Received answer:', data);
      const targetUserSockets = userSockets.get(data.to);
      if (targetUserSockets) {
        targetUserSockets.forEach(sid => {
          const targetSocket = io.sockets.sockets.get(sid);
          if (targetSocket) {
            targetSocket.emit('answer', {
              answer: data.answer,
              from: data.from
            });
            console.log(`Forwarded answer to socket ${sid}`);
          }
        });
      }
    });

    socket.on('ice_candidate', (data) => {
      console.log('Received ICE candidate:', data);
      const targetUserSockets = userSockets.get(data.to);
      if (targetUserSockets) {
        targetUserSockets.forEach(sid => {
          const targetSocket = io.sockets.sockets.get(sid);
          if (targetSocket) {
            targetSocket.emit('ice_candidate', {
              candidate: data.candidate,
              from: data.from
            });
            console.log(`Forwarded ICE candidate to socket ${sid}`);
          }
        });
      }
    });

    socket.on('accept_call', (callData) => {
      console.log('Call accepted:', callData);
      console.log('Current user sockets:', Array.from(userSockets.entries()));
      
      // Get all sockets for the caller
      const callerSockets = userSockets.get(callData.from);
      if (callerSockets) {
        console.log(`Found ${callerSockets.size} sockets for caller ${callData.from}`);
        // Notify all caller's sockets that call was accepted
        callerSockets.forEach(sid => {
          const callerSocket = io.sockets.sockets.get(sid);
          if (callerSocket) {
            const notificationData = {
              ...callData,
              timestamp: Date.now()
            };
            console.log(`Sending call accepted notification to socket ${sid}:`, notificationData);
            callerSocket.emit('call_accepted', notificationData, (response) => {
              console.log(`Call accepted notification sent to socket ${sid}, response:`, response);
            });
          } else {
            console.log(`Caller socket ${sid} not found`);
          }
        });
      } else {
        console.log(`No sockets found for caller ${callData.from}`);
      }
    });

    socket.on('reject_call', (callData) => {
      console.log('Call rejected:', callData);
      console.log('Current user sockets:', Array.from(userSockets.entries()));
      
      // Get all sockets for the caller
      const callerSockets = userSockets.get(callData.from);
      if (callerSockets) {
        console.log(`Found ${callerSockets.size} sockets for caller ${callData.from}`);
        // Notify all caller's sockets that call was rejected
        callerSockets.forEach(sid => {
          const callerSocket = io.sockets.sockets.get(sid);
          if (callerSocket) {
            const notificationData = {
              ...callData,
              timestamp: Date.now()
            };
            console.log(`Sending call rejected notification to socket ${sid}:`, notificationData);
            callerSocket.emit('call_rejected', notificationData, (response) => {
              console.log(`Call rejected notification sent to socket ${sid}, response:`, response);
            });
          } else {
            console.log(`Caller socket ${sid} not found`);
          }
        });
      } else {
        console.log(`No sockets found for caller ${callData.from}`);
      }
    });

    socket.on('end_call', (callData) => {
      console.log('Call ended:', callData);
      
      // Get all sockets for both users
      const callerSockets = userSockets.get(callData.from);
      const targetSockets = userSockets.get(callData.to);
      
      // Notify all sockets of both users that call ended
      if (callerSockets) {
        callerSockets.forEach(sid => {
          const callerSocket = io.sockets.sockets.get(sid);
          if (callerSocket) {
            callerSocket.emit('call_ended', {
              ...callData,
              timestamp: Date.now()
            });
            console.log(`Sent call ended notification to caller socket ${sid}`);
          }
        });
      }
      
      if (targetSockets) {
        targetSockets.forEach(sid => {
          const targetSocket = io.sockets.sockets.get(sid);
          if (targetSocket) {
            targetSocket.emit('call_ended', {
              ...callData,
              timestamp: Date.now()
            });
            console.log(`Sent call ended notification to target socket ${sid}`);
          }
        });
      }
    });

    // Handle get-online-users request
    socket.on('get-online-users', () => {
      const onlineUsers = Array.from(userSockets.keys());
      socket.emit('online-users', onlineUsers);
    });
  });

  return io;
};

module.exports = initializeSocket;

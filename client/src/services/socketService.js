import io from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.eventHandlers = new Map();
    this.connectionPromise = null;
    this.userId = null;
  }

  connect(userId) {
    this.userId = userId;
    console.log(`[SocketService] Attempting to connect for user: ${userId}`);
    
    // If we already have a connected socket, return it
    if (this.socket?.connected) {
      console.log(`[SocketService] Socket already connected for user ${userId}, returning existing socket`);
      return this.socket;
    }

    // If we're in the process of connecting, return the promise
    if (this.connectionPromise) {
      console.log(`[SocketService] Connection in progress for user ${userId}, returning existing promise`);
      return this.connectionPromise;
    }

    console.log(`[SocketService] Creating new socket connection for user ${userId}`);
    this.connectionPromise = new Promise((resolve, reject) => {
      this.socket = io(import.meta.env.VITE_BACKEND_URL, {
        query: { userId },
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        timeout: 10000,
        forceNew: false,
        autoConnect: true
      });

      this.socket.on('connect', () => {
        console.log(`[SocketService] Socket connected successfully for user ${userId}`);
        console.log(`[SocketService] Socket ID: ${this.socket.id}`);
        this.socket.emit('register-user', userId);
        this.connectionPromise = null;
        resolve(this.socket);
      });

      this.socket.on('connect_error', (error) => {
        console.error(`[SocketService] Socket connection error for user ${userId}:`, error);
        this.connectionPromise = null;
        reject(error);
      });

      this.socket.on('disconnect', (reason) => {
        console.log(`[SocketService] Socket disconnected for user ${userId}:`, reason);
        if (reason === 'io server disconnect') {
          console.log(`[SocketService] Attempting to reconnect for user ${userId}`);
          this.socket.connect();
        }
      });

      this.socket.on('reconnect', () => {
        console.log(`[SocketService] Socket reconnected for user ${userId}`);
        console.log(`[SocketService] New Socket ID: ${this.socket.id}`);
        this.socket.emit('register-user', userId);
      });

      // Log all events for debugging
      this.socket.onAny((event, ...args) => {
        console.log(`[SocketService] Received event '${event}' for user ${userId}:`, args);
      });
    });

    return this.connectionPromise;
  }

  disconnect() {
    if (this.socket) {
      console.log(`[SocketService] Disconnecting socket for user ${this.userId}`);
      this.socket.disconnect();
      this.socket = null;
      this.connectionPromise = null;
      this.userId = null;
    }
  }

  on(event, handler) {
    if (!this.socket) {
      console.warn(`[SocketService] Attempting to add event listener '${event}' before socket connection for user ${this.userId}`);
      return;
    }
    
    console.log(`[SocketService] Setting up event listener '${event}' for user ${this.userId}`);
    
    // Remove existing handler if any
    this.off(event);
    
    // Store handler for cleanup
    this.eventHandlers.set(event, handler);
    
    // Add new handler
    this.socket.on(event, handler);
  }

  off(event) {
    if (!this.socket) return;
    
    const handler = this.eventHandlers.get(event);
    if (handler) {
      console.log(`[SocketService] Removing event listener '${event}' for user ${this.userId}`);
      this.socket.off(event, handler);
      this.eventHandlers.delete(event);
    }
  }

  emit(event, data, callback) {
    if (!this.socket?.connected) {
      console.error(`[SocketService] Cannot emit event '${event}': socket not connected for user ${this.userId}`);
      return;
    }
    
    console.log(`[SocketService] Emitting event '${event}' for user ${this.userId}:`, data);
    this.socket.emit(event, data, callback);
  }

  getSocket() {
    return this.socket;
  }

  isConnected() {
    return this.socket?.connected || false;
  }
}

// Create a single instance
const socketService = new SocketService();
export { socketService }; 
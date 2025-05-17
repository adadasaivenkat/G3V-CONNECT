import React, { useState, useRef, useEffect } from 'react';
import { Phone, Video } from 'lucide-react';
import { useAuth } from '../../context/AuthProvider';
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { socketService } from '../../services/socketService';

const ChatHeader = ({ selectedChat, userData, backendUrl }) => {
  const { socket } = useAuth();
  const [userStatus, setUserStatus] = useState({
    isOnline: selectedChat?.isOnline || false,
    lastSeen: selectedChat?.lastSeen ? new Date(selectedChat.lastSeen) : null
  });
  const isMounted = useRef(true);

  // Handle outgoing call
  const handleInitiateCall = (type) => {
    if (!selectedChat || !userData) return;

    if (!socketService.isConnected()) return;

    const callData = {
      type,
      from: userData._id,
      to: selectedChat._id,
      callerName: userData.displayName,
      callerProfilePic: userData.profilePicture,
      timestamp: Date.now()
    };

    socketService.emit('initiate_call', callData, (response) => {
      if (!response) {
        socketService.emit('initiate_call', callData);
      }
    });
  };

  // Listen for online/offline status changes
  useEffect(() => {
    if (!socket || !selectedChat) return;

    const handleUserOnline = (userId) => {
      if (userId === selectedChat._id) {
        setUserStatus({ isOnline: true, lastSeen: new Date() });
      }
    };

    const handleUserOffline = (data) => {
      if (data.userId === selectedChat._id) {
        const seenTime = data.lastSeen ? new Date(data.lastSeen) : new Date();
        setUserStatus({ isOnline: false, lastSeen: seenTime });
      }
    };

    const handleOnlineUsers = (onlineUsers) => {
      if (onlineUsers.includes(selectedChat._id)) {
        setUserStatus({ isOnline: true, lastSeen: new Date() });
      }
    };

    socket.on('user-online', handleUserOnline);
    socket.on('user-offline', handleUserOffline);
    socket.on('online-users', handleOnlineUsers);

    // Initial state
    setUserStatus({
      isOnline: selectedChat.isOnline || false,
      lastSeen: selectedChat.lastSeen ? new Date(selectedChat.lastSeen) : null
    });

    socket.emit('get-online-users');

    return () => {
      socket.off('user-online', handleUserOnline);
      socket.off('user-offline', handleUserOffline);
      socket.off('online-users', handleOnlineUsers);
    };
  }, [socket, selectedChat]);

  const formatLastSeen = (lastSeenDate) => {
    if (!lastSeenDate) return '';
    try {
      const now = new Date();
      const lastSeen = new Date(lastSeenDate);
      if (isNaN(lastSeen.getTime())) return '';

      const diff = now - lastSeen;
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      if (minutes < 1) return 'Just now';
      if (minutes < 60) return `${minutes} minutes ago`;
      if (hours < 24) return `${hours} hours ago`;
      if (days < 7) return `${days} days ago`;

      return lastSeen.toLocaleDateString();
    } catch {
      return '';
    }
  };

  if (!selectedChat) return null;

  return (
    <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center space-x-4">
        <Avatar>
          <AvatarImage
            src={
              selectedChat.profilePic && selectedChat.profilePic.trim() !== ''
                ? selectedChat.profilePic.startsWith('http')
                  ? selectedChat.profilePic
                  : `${backendUrl}${selectedChat.profilePic}`
                : '/uploads/default-profile.png'
            }
            alt={selectedChat.displayName}
          />
          <AvatarFallback>{selectedChat.displayName?.[0] || '?'}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col flex-1 min-w-0">
          <span className="font-semibold text-lg text-gray-900 dark:text-white truncate cursor-default">
            {selectedChat.displayName}
          </span>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {userStatus.isOnline
              ? 'Online'
              : userStatus.lastSeen
              ? `Last seen ${formatLastSeen(userStatus.lastSeen)}`
              : 'Last seen recently'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => handleInitiateCall('voice')}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          title="Voice Call"
        >
          <Phone className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </button>
        <button
          onClick={() => handleInitiateCall('video')}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          title="Video Call"
        >
          <Video className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </button>
      </div>
    </div>
  );
};

export default ChatHeader;

import React, { useState, useRef, useEffect } from "react";
import { ChevronLeft, Phone, Video, PhoneOff } from "lucide-react";
import { useAuth } from "../../context/AuthProvider";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { socketService } from "../../services/socketService";

const ChatHeader = ({ selectedChat, userData, backendUrl, onBack }) => {
  const { socket } = useAuth();
  const [userStatus, setUserStatus] = useState({
    isOnline: selectedChat?.isOnline || false,
    lastSeen: selectedChat?.lastSeen ? new Date(selectedChat.lastSeen) : null,
  });

  const [isRinging, setIsRinging] = useState(false);
  const [callType, setCallType] = useState(null);
  const [callDuration, setCallDuration] = useState(0);
  const timerRef = useRef(null);

  // Handle outgoing call
  const handleInitiateCall = (type) => {
    if (!selectedChat || !userData || !socketService.isConnected()) return;

    const callData = {
      type,
      from: userData._id,
      to: selectedChat._id,
      callerName: userData.displayName,
      callerProfilePic: userData.profilePicture,
      timestamp: Date.now(),
    };

    socketService.emit("initiate_call", callData, (response) => {
      if (!response) {
        socketService.emit("initiate_call", callData);
      }
    });

    setCallType(type);
    setIsRinging(true);
    setCallDuration(0);

    // Start call timer
    startCallTimer();
  };

  const startCallTimer = () => {
    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    setCallDuration(0);
    timerRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
  };

  const endCall = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    setIsRinging(false);
    setCallType(null);

    if (!userData || !selectedChat) return;

    socketService.emit("end_call", {
      from: userData._id,
      to: selectedChat._id,
    });
  };

  // Listen for status & call events
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

    const handleCallCancelled = (data) => {
      if (data.from === selectedChat._id) {
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
        setIsRinging(false);
        setCallType(null);
      }
    };

    const handleCallEnded = (data) => {
      if (data.from === selectedChat._id) {
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
        setIsRinging(false);
        setCallType(null);

        // You could add a toast notification here
        console.log("Call ended by the other user");
      }
    };

    const handleCallAccepted = (data) => {
      if (data.from === selectedChat._id || data.to === selectedChat._id) {
        setIsRinging(false);
        // You could navigate to a call screen here or handle differently
        console.log("Call accepted");
      }
    };

    const handleCallRejected = (data) => {
      if (data.from === selectedChat._id || data.to === selectedChat._id) {
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
        setIsRinging(false);
        setCallType(null);
        console.log("Call rejected");
      }
    };

    socket.on("user-online", handleUserOnline);
    socket.on("user-offline", handleUserOffline);
    socket.on("online-users", handleOnlineUsers);
    socket.on("call_cancelled", handleCallCancelled);
    socket.on("call_ended", handleCallEnded);
    socket.on("call_accepted", handleCallAccepted);
    socket.on("call_rejected", handleCallRejected);

    setUserStatus({
      isOnline: selectedChat.isOnline || false,
      lastSeen: selectedChat.lastSeen ? new Date(selectedChat.lastSeen) : null,
    });

    socket.emit("get-online-users");

    return () => {
      socket.off("user-online", handleUserOnline);
      socket.off("user-offline", handleUserOffline);
      socket.off("online-users", handleOnlineUsers);
      socket.off("call_cancelled", handleCallCancelled);
      socket.off("call_ended", handleCallEnded);
      socket.off("call_accepted", handleCallAccepted);
      socket.off("call_rejected", handleCallRejected);

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [socket, selectedChat]);

  const formatLastSeen = (lastSeenDate) => {
    if (!lastSeenDate) return "";
    try {
      const now = new Date();
      const lastSeen = new Date(lastSeenDate);
      if (isNaN(lastSeen.getTime())) return "";

      const diff = now - lastSeen;
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      if (minutes < 1) return "Just now";
      if (minutes < 60) return `${minutes} minutes ago`;
      if (hours < 24) return `${hours} hours ago`;
      if (days < 7) return `${days} days ago`;

      return lastSeen.toLocaleDateString();
    } catch {
      return "";
    }
  };

  const formatCallDuration = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  };

  if (!selectedChat) return null;

  return (
    <>
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="md:hidden p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Go back">
            <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
          <Avatar>
            <AvatarImage
              src={
                selectedChat.profilePic && selectedChat.profilePic.trim() !== ""
                  ? selectedChat.profilePic.startsWith("http")
                    ? selectedChat.profilePic
                    : `${backendUrl}${selectedChat.profilePic}`
                  : "/uploads/default-profile.png"
              }
              alt={selectedChat.displayName}
            />
            <AvatarFallback>
              {selectedChat.displayName?.[0] || "?"}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="font-semibold text-lg text-gray-900 dark:text-white truncate cursor-default">
              {selectedChat.displayName}
            </span>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {userStatus.isOnline
                ? "Online"
                : userStatus.lastSeen
                ? `Last seen ${formatLastSeen(userStatus.lastSeen)}`
                : "Last seen recently"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleInitiateCall("voice")}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Voice Call">
            <Phone className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
          <button
            onClick={() => handleInitiateCall("video")}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Video Call">
            <Video className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
        </div>
      </div>

      {/* Call Modal - Only shown when a call is active and not accepted/rejected */}
      {isRinging && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 animate-fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg flex flex-col items-center gap-4 w-80 max-w-md">
            <div className="relative w-20 h-20 mb-2">
              <Avatar className="w-20 h-20">
                <AvatarImage
                  src={
                    selectedChat.profilePic &&
                    selectedChat.profilePic.trim() !== ""
                      ? selectedChat.profilePic.startsWith("http")
                        ? selectedChat.profilePic
                        : `${backendUrl}${selectedChat.profilePic}`
                      : "/uploads/default-profile.png"
                  }
                  alt={selectedChat.displayName}
                />
                <AvatarFallback className="text-2xl">
                  {selectedChat.displayName?.[0] || "?"}
                </AvatarFallback>
              </Avatar>
              <div className="absolute bottom-0 right-0 w-6 h-6 bg-green-500 rounded-full border-2 border-white dark:border-gray-800 animate-pulse"></div>
            </div>

            <p className="text-xl font-medium text-gray-800 dark:text-gray-100">
              {selectedChat.displayName}
            </p>

            <p className="text-gray-500 dark:text-gray-400">
              {callDuration > 0
                ? formatCallDuration(callDuration)
                : "Calling..."}
            </p>

            <div className="px-4 py-2 bg-blue-600 text-white rounded-lg mt-2">
              {callType === "voice" ? "Voice Call" : "Video Call"}
            </div>

            <div className="flex items-center mt-4">
              <button
                onClick={endCall}
                className="p-3 bg-red-600 text-white rounded-full hover:bg-red-700 transition-all transform hover:scale-105 animate-pulse"
                title="End Call">
                <PhoneOff className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatHeader;

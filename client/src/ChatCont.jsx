import React, { useState, useRef, useEffect } from "react";
import { EmptyChatCont } from "./EmptyChatCont";
import { useAuth } from "./context/AuthProvider";
import { GiphyFetch } from "@giphy/js-fetch-api";
import { toast } from "react-hot-toast";

// Import our new components
import ChatHeader from "./components/chat/ChatHeader";
import ChatArea from "./components/chat/ChatArea";
import ChatInput from "./components/chat/ChatInput";
import MediaPreviewModal from "./components/chat/MediaPreviewModal";
import AttachmentMenu from "./components/chat/AttachmentMenu";
import EmojiPickerComponent from "./components/chat/EmojiPicker";
import GifPicker from "./components/chat/GifPicker";
import FileInputs from "./components/chat/FileInputs";
import GlobalStyles from "./components/chat/GlobalStyles";
import MessageFetchEffect from "./components/chat/MessageFetchEffect";

// Import utility functions
import { formatTime, formatDuration } from "./components/chat/ChatUtils";

const ChatCont = ({ selectedChat }) => {
  const { setSelectedChat } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [isPlaying, setIsPlaying] = useState({});
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [messageMenu, setMessageMenu] = useState(null);
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const [userId, setUserId] = useState(null);
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const documentInputRef = useRef(null);
  const audioRefs = useRef({});
  const chatContainerRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingStartTime, setRecordingStartTime] = useState(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordingBlob, setRecordingBlob] = useState(null);
  const mediaRecorderRef = useRef(null);
  const durationTimerRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const messagesCache = useRef(new Map());
  const { email, userData, socket } = useAuth();

  // Remove the socket initialization useEffect since we're using the socket from useAuth
  useEffect(() => {
    if (socket && userId) {
      console.log("Registering user with socket:", userId);
      socket.emit("register-user", userId);
    }
  }, [socket, userId]);

  // Join chat room when selected chat changes
  useEffect(() => {
    if (socket && selectedChat && userId) {
      console.log("Joining chat room:", { from: userId, to: selectedChat._id });
      socket.emit("join-chat", { from: userId, to: selectedChat._id });
    }
  }, [socket, selectedChat, userId]);

  // Handle incoming messages
  useEffect(() => {
    if (!socket) return;

    console.log("[ChatCont] Setting up message event listeners");
    console.log(
      "[ChatCont] Current socket state:",
      socket.connected ? "Connected" : "Disconnected"
    );
    console.log("[ChatCont] Socket ID:", socket.id);

    const handleReceiveMessage = ({ from, message }) => {
      console.log("[ChatCont] Received message:", { from, message });

      // Only update messages if the message is for the current chat
      if (
        selectedChat &&
        (from === selectedChat._id || message.senderId === selectedChat._id)
      ) {
        console.log("[ChatCont] Updating messages for current chat");
        setMessages((prev) => {
          // Check if message already exists
          const messageExists = prev.some((m) => m.id === message.id);
          if (messageExists) {
            console.log("[ChatCont] Message already exists, skipping");
            return prev;
          }

          // Add new message and sort by timestamp
          const newMessages = [...prev, message].sort(
            (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
          );

          // Update cache
          messagesCache.current.set(selectedChat._id, newMessages);
          return newMessages;
        });
      }
    };

    // Set up socket event listener
    socket.on("receive-message", handleReceiveMessage);

    // Cleanup function
    return () => {
      console.log("[ChatCont] Cleaning up message event listeners");
      socket.off("receive-message", handleReceiveMessage);
    };
  }, [socket, selectedChat]);

  // Get user ID
  useEffect(() => {
    const fetchUserId = async () => {
      if (!email) return;

      try {
        const response = await fetch(
          `${backendUrl}/api/users/getUser/${email}`
        );
        if (!response.ok) throw new Error("Failed to fetch user data");

        const data = await response.json();
        console.log("Fetched backend user _id:", data._id);
        setUserId(data._id);
      } catch (error) {
        console.error("Error fetching user ID:", error);
        toast.error("Failed to load user data");
      }
    };

    fetchUserId();
  }, [email, backendUrl]);

  // Enhance click outside handler
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!chatContainerRef.current?.contains(event.target)) {
        setShowEmojiPicker(false);
        setShowAttachMenu(false);
        setShowGifPicker(false);
        setMessageMenu(null);
      }
    };

    const handleEscapeKey = (event) => {
      if (event.key === "Escape") {
        setShowEmojiPicker(false);
        setShowAttachMenu(false);
        setShowGifPicker(false);
        setMessageMenu(null);
        setSelectedMedia(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscapeKey);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, []);

  // GIF selection handler
  const onGifSelect = async (gif) => {
    const message = {
      id: Date.now().toString(),
      type: "gif",
      file: gif.images.original.url,
      sender: "user",
      senderId: userId,
      timestamp: new Date(),
    };

    try {
      // Save to server first
      const msgResponse = await fetch(`${backendUrl}/api/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: userId,
          to: selectedChat._id,
          message,
        }),
      });

      if (msgResponse.ok) {
        const data = await msgResponse.json();
        message.id = data.message.id; // Use server-generated ID

        // Update UI with server-generated ID
        setMessages((prev) => [...prev, message]);

        // Emit via socket
        if (socket) {
          socket.emit("send-message", {
            from: userId,
            to: selectedChat?._id,
            message,
          });
        }
      }
    } catch (error) {
      console.error("Error saving GIF message:", error);
    }

    setShowGifPicker(false);
  };

  // Add this function to mark messages as read
  const markMessagesAsRead = async (messages, userId, backendUrl) => {
    let updated = false;
    const newMessages = [...messages];
    for (let i = 0; i < newMessages.length; i++) {
      const msg = newMessages[i];
      // Use _id if present, else id
      const msgId = msg._id || msg.id;
      if (!msg.read && msg.receiverId === userId && msgId) {
        try {
          const res = await fetch(`${backendUrl}/api/messages/${msgId}/read`, {
            method: "PATCH",
          });
          if (res.ok) {
            newMessages[i] = { ...msg, read: true };
            updated = true;
          }
        } catch (err) {
          console.error("Failed to mark message as read", err);
        }
      }
    }
    if (updated) setMessages(newMessages);
  };

  // Fetch messages for selected chat
  useEffect(() => {
    const fetchMessages = async () => {
      if (!selectedChat || !userId) return;

      try {
        const response = await fetch(
          `${backendUrl}/api/messages?from=${userId}&to=${selectedChat._id}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch messages");
        }

        const data = await response.json();
        if (data.messages && Array.isArray(data.messages)) {
          setMessages(data.messages);
          // Mark unread messages as read
          await markMessagesAsRead(data.messages, userId, backendUrl);
        }
      } catch (error) {
        console.error("Error fetching messages:", error);
        toast.error("Failed to load messages");
      }
    };

    fetchMessages();
  }, [selectedChat, userId, backendUrl]);

  // Update cache when new messages are added
  useEffect(() => {
    if (selectedChat?._id && messages.length > 0) {
      messagesCache.current.set(selectedChat._id, messages);
    }
  }, [messages, selectedChat?._id]);

  // Clear cache when component unmounts
  useEffect(() => {
    return () => {
      messagesCache.current.clear();
    };
  }, []);

  // Replace the existing scroll effects with a more robust solution
  const scrollToBottom = () => {
    if (chatEndRef.current) {
      const chatContainer = chatEndRef.current.parentElement;
      if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
    }
  };

  // Scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Scroll when chat is selected
  useEffect(() => {
    if (selectedChat) {
      // Initial scroll
      scrollToBottom();
      // Additional scroll after a short delay to ensure content is rendered
      const timer = setTimeout(scrollToBottom, 100);
      return () => clearTimeout(timer);
    }
  }, [selectedChat]);

  // Scroll when loading state changes
  useEffect(() => {
    if (!isLoadingMessages) {
      scrollToBottom();
    }
  }, [isLoadingMessages]);

  // Add scroll to bottom after sending message
  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const message = {
      id: Date.now().toString(),
      type: "text",
      text: newMessage,
      senderId: userId,
      receiverId: selectedChat._id,
      timestamp: new Date(),
    };

    try {
      // Save to server first
      const response = await fetch(`${backendUrl}/api/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: userId,
          to: selectedChat._id,
          message,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        message.id = data.message.id;

        setMessages((prev) => {
          const newMessages = [...prev, message].sort(
            (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
          );
          messagesCache.current.set(selectedChat._id, newMessages);
          return newMessages;
        });

        // Force scroll after message is added
        setTimeout(scrollToBottom, 0);

        if (socket) {
          socket.emit("send-message", {
            from: userId,
            to: selectedChat._id,
            message,
          });
        }
      }
    } catch (error) {
      console.error("Error saving message:", error);
      toast.error("Failed to send message");
    }

    setNewMessage("");
  };

  // Emoji selection handler
  const handleEmojiSelect = (emoji) => {
    setNewMessage((prev) => prev + emoji.native);
    setShowEmojiPicker(false);
  };

  // Audio controls
  const handleAudioPlayPause = (messageId) => {
    const audioElement = audioRefs.current[messageId];
    if (audioElement) {
      if (isPlaying[messageId]) {
        audioElement.pause();
      } else {
        audioElement.play();
      }
      setIsPlaying((prev) => ({ ...prev, [messageId]: !prev[messageId] }));
    }
  };

  // Recording functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      const chunks = [];

      mediaRecorder.ondataavailable = (e) => {
        chunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        setRecordingBlob(blob);
        stream.getTracks().forEach((track) => track.stop());
        clearInterval(durationTimerRef.current);
        setRecordingStartTime(null);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingStartTime(Date.now());
      durationTimerRef.current = setInterval(() => {
        setRecordingDuration(Date.now() - recordingStartTime);
      }, 100);
    } catch (error) {
      console.error("Error accessing microphone:", error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setRecordingDuration(0);
    }
  };

  const cancelRecording = () => {
    stopRecording();
    setRecordingBlob(null);
    setRecordingDuration(0);
  };

  // Modify sendVoiceMessage to save to server first
  const sendVoiceMessage = async () => {
    if (!recordingBlob) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", recordingBlob, "voice-message.webm");
      formData.append("upload_preset", "G3V-Connect");
      formData.append("cloud_name", "dqtabmahp");

      const response = await fetch(
        "https://api.cloudinary.com/v1_1/dqtabmahp/raw/upload",
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) throw new Error("Upload failed");

      const result = await response.json();
      const message = {
        id: Date.now().toString(),
        type: "audio",
        file: result.secure_url,
        fileName: "Voice Message",
        fileSize: recordingBlob.size,
        senderId: userId,
        timestamp: new Date(),
      };

      // Save to server first
      const msgResponse = await fetch(`${backendUrl}/api/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: userId,
          to: selectedChat._id,
          message,
        }),
      });

      if (msgResponse.ok) {
        const data = await msgResponse.json();
        message.id = data.message.id; // Use server-generated ID

        // Update UI with server-generated ID
        setMessages((prev) => {
          const newMessages = [...prev, message];
          return newMessages.sort(
            (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
          );
        });

        // Emit via socket
        if (socket) {
          socket.emit("send-message", {
            from: userId,
            to: selectedChat?._id,
            message,
          });

          // Emit new-message event for real-time updates
          socket.emit("new-message", {
            message,
            from: selectedChat?._id,
          });
        }
      }

      setRecordingBlob(null);
    } catch (error) {
      console.error("Error uploading voice message:", error);
    } finally {
      setIsUploading(false);
    }
  };

  // Modify handleFileUpload to save to server first
  const handleFileUpload = async (event, type) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
      const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif"];
      const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm"];
      const ALLOWED_DOC_TYPES = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain",
      ];

      if (file.size > MAX_FILE_SIZE) {
        alert("File is too large. Maximum size is 10MB.");
        return;
      }

      const fileType = file.type.split("/")[0];
      const allowedTypes = {
        image: ALLOWED_IMAGE_TYPES,
        video: ALLOWED_VIDEO_TYPES,
        application: ALLOWED_DOC_TYPES,
      };

      if (!allowedTypes[fileType]?.includes(file.type)) {
        alert("Invalid file type");
        return;
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", "G3V-Connect");
      formData.append("cloud_name", "dqtabmahp");

      const uploadUrl =
        fileType === "video"
          ? "https://api.cloudinary.com/v1_1/dqtabmahp/video/upload"
          : "https://api.cloudinary.com/v1_1/dqtabmahp/raw/upload";

      const response = await fetch(uploadUrl, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Upload failed");

      const result = await response.json();
      if (!result.secure_url) throw new Error("No URL returned");

      const message = {
        id: Date.now().toString(),
        type,
        file: result.secure_url,
        fileName: file.name,
        fileSize: file.size,
        senderId: userId,
        timestamp: new Date(),
      };

      // Save to server first
      const msgResponse = await fetch(`${backendUrl}/api/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: userId,
          to: selectedChat._id,
          message,
        }),
      });

      if (msgResponse.ok) {
        const data = await msgResponse.json();
        message.id = data.message.id; // Use server-generated ID

        // Update UI with server-generated ID
        setMessages((prev) => {
          const newMessages = [...prev, message];
          return newMessages.sort(
            (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
          );
        });

        // Emit via socket
        if (socket) {
          socket.emit("send-message", {
            from: userId,
            to: selectedChat?._id,
            message,
          });
        }
      }

      event.target.value = "";
    } catch (error) {
      console.error("Error uploading file:", error);
      alert("Failed to upload file");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div
      className={`
    h-full
    fixed inset-0 md:relative md:inset-auto 
    w-full md:w-[calc(100vw-35vw)] lg:w-[calc(100vw-30vw)] xl:w-[calc(100vw-20vw)]
    bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 
    transform transition-transform duration-300 ease-in-out 
    ${!selectedChat ? "translate-x-full md:translate-x-0" : "translate-x-0"}
  `}
      ref={chatContainerRef}>
      {/* Add MessageFetchEffect for message persistence */}
      <MessageFetchEffect
        selectedChat={selectedChat}
        userId={userId}
        backendUrl={backendUrl}
        setMessages={setMessages}
        messages={messages}
      />

      {selectedChat ? (
        <div className="w-full h-screen flex flex-col">
          {/* Header */}
          <ChatHeader
            selectedChat={selectedChat}
            userData={userData}
            backendUrl={backendUrl}
            onBack={() => setSelectedChat(null)} // ✅ go back to contacts
          />

          {/* Flex wrapper for ChatArea */}
          <div className="flex-1 flex flex-col min-h-0">
            <ChatArea
              messages={messages}
              userId={userId}
              isPlaying={isPlaying}
              handleAudioPlayPause={handleAudioPlayPause}
              formatTime={formatTime}
              setSelectedMedia={setSelectedMedia}
              audioRefs={audioRefs}
              selectedChat={selectedChat}
            />
          </div>

          {/* Media Preview Modal */}
          <MediaPreviewModal
            selectedMedia={selectedMedia}
            setSelectedMedia={setSelectedMedia}
          />

          {/* Attachment Menu */}
          {showAttachMenu && (
            <div className="fixed inset-0 z-50 md:absolute md:inset-auto md:bottom-20 md:left-4">
              <AttachmentMenu
                setShowAttachMenu={setShowAttachMenu}
                fileInputRef={fileInputRef}
                videoInputRef={videoInputRef}
                documentInputRef={documentInputRef}
                setShowGifPicker={setShowGifPicker}
              />
            </div>
          )}

          {/* GIF Picker */}
          {showGifPicker && (
            <div className="fixed inset-0 z-50 md:absolute md:inset-auto md:bottom-20 md:left-4">
              <GifPicker
                setShowGifPicker={setShowGifPicker}
                onGifSelect={onGifSelect}
              />
            </div>
          )}

          {/* Chat Input */}
          <ChatInput
            newMessage={newMessage}
            setNewMessage={setNewMessage}
            isRecording={isRecording}
            recordingDuration={recordingDuration}
            recordingBlob={recordingBlob}
            sendMessage={sendMessage}
            startRecording={startRecording}
            stopRecording={stopRecording}
            cancelRecording={cancelRecording}
            sendVoiceMessage={sendVoiceMessage}
            setShowEmojiPicker={setShowEmojiPicker}
            setShowAttachMenu={setShowAttachMenu}
            setShowGifPicker={setShowGifPicker}
            formatDuration={formatDuration}
            showEmojiPicker={showEmojiPicker}
            showAttachMenu={showAttachMenu}
            replyingTo={replyingTo}
            setReplyingTo={setReplyingTo}
            isUploading={isUploading}
            selectedChat={selectedChat}
            handleEmojiSelect={handleEmojiSelect}
            EmojiPickerComponent={EmojiPickerComponent}
          />

          {/* Hidden File Inputs */}
          <FileInputs
            fileInputRef={fileInputRef}
            videoInputRef={videoInputRef}
            documentInputRef={documentInputRef}
            handleFileUpload={handleFileUpload}
          />
        </div>
      ) : (
        <EmptyChatCont selectedChat={selectedChat} />
      )}

      {/* Global Styles */}
      <GlobalStyles />
    </div>
  );
};

export default ChatCont;

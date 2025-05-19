import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useAuth } from "./context/AuthProvider";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Pencil, LogOut, X, Plus, Trash2, Search } from "lucide-react";
import toast from "react-hot-toast";

export const ContactsCont = () => {
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const {
    email,
    logout,
    setIsProfileComplete,
    socket,
    setSelectedChat,
    selectedChat,
  } = useAuth();

  const formatTime = (date) => {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const [contacts, setContacts] = useState([]);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [editData, setEditData] = useState({ displayName: "", about: "" });
  const defaultImage = `${backendUrl}/uploads/default-profile.png`;
  const [previewPic, setPreviewPic] = useState(defaultImage);
  const fileInputRef = useRef(null);
  const [searchResults, setSearchResults] = useState([]);
  const [recentChats, setRecentChats] = useState([]);
  const [isLoadingChats, setIsLoadingChats] = useState(false);
  const recentChatsCache = useRef(new Map());
  const [unseenMessages, setUnseenMessages] = useState(new Map());
  const processedMessages = useRef(new Set());

  // Fetch recent chats with caching
  useEffect(() => {
    const fetchRecentChats = async () => {
      if (!userData?._id) return;

      setIsLoadingChats(true);
      try {
        // Check cache first
        const cachedChats = recentChatsCache.current.get(userData._id);
        if (cachedChats) {
          setRecentChats(cachedChats);
          setIsLoadingChats(false);
          return;
        }

        const { data } = await axios.get(
          `${backendUrl}/api/messages/recent/${userData._id}`
        );

        // Update cache and state
        if (data.chats && Array.isArray(data.chats)) {
          recentChatsCache.current.set(userData._id, data.chats);
          setRecentChats(data.chats);
        }
      } catch (err) {
        console.error("Error fetching recent chats:", err);
        toast.error("Failed to load recent chats");
      } finally {
        setIsLoadingChats(false);
      }
    };

    fetchRecentChats();
  }, [backendUrl, userData?._id]);

  // Set up socket event listeners
  useEffect(() => {
    if (!socket) {
      console.log("No socket available in ContactsCont");
      return;
    }

    console.log("Setting up socket event listeners in ContactsCont");
    console.log(
      "Current socket state:",
      socket.connected ? "Connected" : "Disconnected"
    );
    console.log("Socket ID:", socket.id);

    // Remove any existing event listeners first
    socket.off("receive-message");
    socket.off("message-sent");
    socket.offAny();

    const handleReceiveMessage = ({ from, message }) => {
      console.log("Received message in ContactsCont:", { from, message });

      // Prevent duplicate message handling
      const messageId = message._id || message.id;
      if (messageId && processedMessages.current.has(messageId)) {
        return;
      }
      if (messageId) {
        processedMessages.current.add(messageId);
      }

      // Update unseen messages if chat is not selected
      if (!selectedChat || selectedChat._id !== from) {
        setUnseenMessages((prev) => {
          const newMap = new Map(prev);
          const count = (newMap.get(from) || 0) + 1;
          newMap.set(from, count);
          return newMap;
        });
      }

      // Update recent chats when a new message is received
      setRecentChats((prev) => {
        const existingChatIndex = prev.findIndex(
          (chat) =>
            chat.user?._id === from ||
            chat.user === from ||
            chat.receiver === from ||
            chat.sender === from
        );

        const updatedChat = {
          user: existingChatIndex >= 0 ? prev[existingChatIndex].user : null,
          lastMessage: {
            ...message,
            type: message.type || "text",
            sender: from,
            receiver: userData?._id,
          },
          updatedAt: new Date(),
        };

        if (existingChatIndex >= 0) {
          const newChats = [...prev];
          newChats.splice(existingChatIndex, 1);
          return [updatedChat, ...newChats];
        } else {
          fetchUserData(from).then((userData) => {
            if (userData) {
              updatedChat.user = userData;
              setRecentChats((prev) => [updatedChat, ...prev]);
            }
          });
          return prev;
        }
      });
    };

    const handleMessageSent = ({ message }) => {
      console.log("Message sent confirmation in ContactsCont:", message);

      setRecentChats((prev) => {
        const existingChatIndex = prev.findIndex(
          (chat) =>
            chat.user?._id === message.receiver ||
            chat.user === message.receiver ||
            chat.receiver === message.receiver ||
            chat.sender === message.receiver
        );

        const updatedChat = {
          user: existingChatIndex >= 0 ? prev[existingChatIndex].user : null,
          lastMessage: {
            ...message,
            type: message.type || "text",
            sender: userData?._id,
            receiver: message.receiver,
          },
          updatedAt: new Date(),
        };

        if (existingChatIndex >= 0) {
          const newChats = [...prev];
          newChats.splice(existingChatIndex, 1);
          return [updatedChat, ...newChats];
        } else {
          fetchUserData(message.receiver).then((userData) => {
            if (userData) {
              updatedChat.user = userData;
              setRecentChats((prev) => [updatedChat, ...prev]);
            }
          });
          return prev;
        }
      });
    };

    // Set up socket event listeners
    socket.on("receive-message", handleReceiveMessage);
    socket.on("message-sent", handleMessageSent);

    // Log all socket events for debugging (excluding call events)
    const excludedEvents = [
      "incoming_call",
      "call_accepted",
      "call_rejected",
      "call_failed",
      "call_ended",
      "offer",
      "answer",
      "ice_candidate",
    ];
    socket.onAny((event, ...args) => {
      if (!excludedEvents.includes(event)) {
        console.log(`Socket event in ContactsCont: ${event}`, args);
      }
    });

    // Cleanup function
    return () => {
      console.log("Cleaning up socket event listeners in ContactsCont");
      socket.off("receive-message", handleReceiveMessage);
      socket.off("message-sent", handleMessageSent);
      socket.offAny();
    };
  }, [socket, selectedChat]);

  // Update cache when recent chats change
  useEffect(() => {
    if (userData?._id && recentChats.length > 0) {
      recentChatsCache.current.set(userData._id, recentChats);
    }
  }, [recentChats, userData?._id]);

  // Clear cache on unmount
  useEffect(() => {
    return () => {
      recentChatsCache.current.clear();
    };
  }, []);

  const fetchContacts = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${backendUrl}/api/contacts`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      // Initialize contacts with online status and lastSeen
      const contactsWithStatus = response.data.contacts.map((contact) => ({
        ...contact,
        isOnline: false,
        lastSeen: contact.lastSeen || null,
      }));
      setContacts(contactsWithStatus);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching contacts:", error);
      toast.error("Failed to load contacts");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, [backendUrl]);

  const getImageUrl = (url) => {
    if (url === defaultImage) return url;
    return `${url}?t=${new Date().getTime()}`;
  };

  const fetchUserData = async () => {
    if (!email) {
      setError("No email provided");
      setLoading(false);
      return;
    }

    try {
      const { data } = await axios.get(
        `${backendUrl}/api/users/getUser/${email}`
      );
      const { displayName, about, profilePic } = data;
      setUserData(data);
      setEditData({ displayName: displayName || "", about: about || "" });
      const imageUrl = profilePic ? `${backendUrl}${profilePic}` : defaultImage;
      setPreviewPic(getImageUrl(imageUrl));
      setIsProfileComplete(Boolean(displayName && about));

      // Register user with socket
      if (socket && data._id) {
        console.log("Registering user with socket:", data._id);
        socket.emit("register-user", data._id);
      }
    } catch (err) {
      console.error("Error fetching user data:", err);
      setError("Failed to load user data");
      toast.error("Failed to load user data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, [email]);

  const truncateAbout = (text) => {
    const words = text.split(" ");
    return words.length > 2 ? `${words.slice(0, 2).join(" ")}...` : text;
  };

  const truncateName = (name) => {
    return name.split(" ")[0];
  };

  const handleEdit = () => setIsEditOpen(true);

  const handleDeleteProfilePic = async () => {
    try {
      if (!userData?.email) {
        toast.error("No user email found");
        return;
      }

      const response = await axios.delete(
        `${backendUrl}/api/users/deleteProfilePic/${userData.email}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (response.data.user) {
        // Update local state
        setUserData(response.data.user);
        setPreviewPic(defaultImage);

        // Update contacts list
        setContacts((prevContacts) =>
          prevContacts.map((contact) =>
            contact && contact._id === response.data.user._id
              ? { ...contact, profilePic: null }
              : contact
          )
        );

        // Emit profile update via socket
        if (socket) {
          socket.emit("profile-updated", {
            userId: response.data.user._id,
            updatedData: {
              profilePic: null,
              updatedAt: new Date(),
            },
          });
        }

        toast.success("Profile picture deleted successfully");
      }
    } catch (err) {
      console.error("Failed to delete image:", err);
      toast.error("Failed to delete profile picture");
    }
  };

  const addProfilePic = () => fileInputRef.current?.click();

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append("email", email);
      formData.append("profilePic", file);

      const tempPreviewUrl = URL.createObjectURL(file);
      setPreviewPic(tempPreviewUrl);

      const { data } = await axios.post(
        `${backendUrl}/api/users/addProfilePic/${email}`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (!data.user?._id) return;

      URL.revokeObjectURL(tempPreviewUrl);

      const serverImageUrl = `${backendUrl}${data.user.profilePic}`;
      setPreviewPic(getImageUrl(serverImageUrl));

      // Update local state immediately
      setUserData((prev) => ({ ...prev, profilePic: data.user.profilePic }));
      setContacts((prevContacts) =>
        prevContacts.map((contact) =>
          contact && contact._id === data.user._id
            ? { ...contact, profilePic: data.user.profilePic }
            : contact
        )
      );

      // Emit profile update via socket
      if (socket) {
        socket.emit("profile-updated", {
          userId: data.user._id,
          updatedData: {
            profilePic: data.user.profilePic,
            updatedAt: new Date(),
          },
        });
      }

      toast.success("Profile picture updated successfully");
    } catch (err) {
      console.error("Failed to upload profile picture:", err);
      toast.error("Failed to upload profile picture");
      await fetchUserData();
    }
  };

  const handleSaveChanges = async () => {
    try {
      if (!userData?.email) {
        toast.error("No user email found");
        return;
      }

      const formData = new FormData();
      formData.append("email", userData.email);
      formData.append("displayName", editData.displayName);
      formData.append("about", editData.about);

      const response = await axios.post(
        `${backendUrl}/api/users/saveUser`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (response.data.user) {
        setUserData(response.data.user);
        setPreviewPic(
          response.data.user.profilePic
            ? `${backendUrl}${response.data.user.profilePic}`
            : defaultImage
        );
        setIsProfileComplete(true);
        setIsEditOpen(false);

        // Emit profile update via socket
        if (socket) {
          socket.emit("profile-updated", {
            userId: response.data.user._id,
            updatedData: {
              displayName: response.data.user.displayName,
              about: response.data.user.about,
              profilePic: response.data.user.profilePic,
              updatedAt: new Date(),
            },
          });
        }

        toast.success("Profile updated successfully");
      }
    } catch (err) {
      console.error("Failed to save changes:", err);
      toast.error("Failed to update profile");
    }
  };

  const handleLogout = async () => {
    try {
      if (socket && userData?._id) {
        const lastSeen = new Date();
        // Update lastSeen in database
        await axios.post(
          `${backendUrl}/api/users/${userData._id}/updateLastSeen`,
          {
            lastSeen: lastSeen,
          },
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );

        // Emit offline status
        socket.emit("user-offline", {
          userId: userData._id,
          lastSeen: lastSeen,
        });
      }
      await logout();
      toast.success("Logged out successfully");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  // Handle search
  const handleSearch = async (e) => {
    const term = e.target.value;
    setSearchTerm(term);

    if (!term.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const { data } = await axios.get(
        `${backendUrl}/api/contacts/search?term=${term}`
      );
      // Filter out current user and only include users that match search
      const filteredResults = data.users.filter(
        (user) =>
          user._id !== userData?._id &&
          (user.displayName?.toLowerCase().includes(term.toLowerCase()) ||
            user.email?.toLowerCase().includes(term.toLowerCase()))
      );
      setSearchResults(filteredResults);
    } catch (err) {
      console.error("Error searching users:", err);
      toast.error("Failed to search users");
    }
  };

  // Update selected chat when clicking on a contact
  const handleContactClick = (contact) => {
    console.log("Selecting contact:", contact);
    setSelectedChat(contact);
  };

  // Clear unseen messages when chat is selected
  useEffect(() => {
    if (selectedChat) {
      setUnseenMessages((prev) => {
        const newMap = new Map(prev);
        newMap.delete(selectedChat._id);
        return newMap;
      });
    }
  }, [selectedChat]);

  const getMessagePreview = (message) => {
    if (!message) return "No messages yet";

    // Check message type
    if (message.type === "text") {
      return message.content || message.text || "";
    } else if (message.type === "image") {
      return "🖼️ Image";
    } else if (message.type === "video") {
      return "🎥 Video";
    } else if (message.type === "audio") {
      return "🎤 Voice message";
    } else if (message.type === "file") {
      return "📎 Document";
    } else if (message.type === "gif") {
      return "🎭 GIF";
    } else {
      return message.content || message.text || "";
    }
  };

  // Update socket event listeners for online status
  useEffect(() => {
    if (!socket) return;

    const handleUserOnline = (userId) => {
      console.log("User online:", userId);
      setContacts((prev) =>
        prev.map((contact) => {
          if (contact._id === userId) {
            return {
              ...contact,
              isOnline: true,
              lastSeen: new Date(),
            };
          }
          return contact;
        })
      );
    };

    const handleUserOffline = async (data) => {
      console.log("User offline:", data);
      try {
        // Update lastSeen in database
        await axios.post(
          `${backendUrl}/api/users/${data.userId}/updateLastSeen`,
          {
            lastSeen: data.lastSeen,
          },
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );

        setContacts((prev) =>
          prev.map((contact) => {
            if (contact._id === data.userId) {
              return {
                ...contact,
                isOnline: false,
                lastSeen: data.lastSeen,
              };
            }
            return contact;
          })
        );
      } catch (err) {
        console.error("Error updating last seen:", err);
      }
    };

    const handleOnlineUsers = (onlineUsers) => {
      console.log("Received online users:", onlineUsers);
      setContacts((prev) =>
        prev.map((contact) => ({
          ...contact,
          isOnline: onlineUsers.includes(contact._id),
        }))
      );
    };

    const handleProfileUpdate = (data) => {
      console.log("Profile updated:", data);
      const { userId, updatedData } = data;

      // Update contacts list
      setContacts((prev) =>
        prev.map((contact) => {
          if (contact._id === userId) {
            return {
              ...contact,
              ...updatedData,
              updatedAt: new Date(),
            };
          }
          return contact;
        })
      );

      // Update selected chat if it's the current user
      if (selectedChat?._id === userId) {
        setSelectedChat((prev) => ({
          ...prev,
          ...updatedData,
          updatedAt: new Date(),
        }));
      }

      // Update recent chats
      setRecentChats((prev) =>
        prev.map((chat) => {
          if (chat.user?._id === userId) {
            return {
              ...chat,
              user: {
                ...chat.user,
                ...updatedData,
                updatedAt: new Date(),
              },
            };
          }
          return chat;
        })
      );
    };

    // Remove any existing listeners first
    socket.off("user-online");
    socket.off("user-offline");
    socket.off("online-users");
    socket.off("profile-updated");

    // Set up new listeners
    socket.on("user-online", handleUserOnline);
    socket.on("user-offline", handleUserOffline);
    socket.on("online-users", handleOnlineUsers);
    socket.on("profile-updated", handleProfileUpdate);

    // Request initial online status and last seen times for all contacts
    socket.emit("get-online-users");

    return () => {
      socket.off("user-online", handleUserOnline);
      socket.off("user-offline", handleUserOffline);
      socket.off("online-users", handleOnlineUsers);
      socket.off("profile-updated", handleProfileUpdate);
    };
  }, [socket, backendUrl, selectedChat]);

  const renderContact = (contact) => {
    // Find the recent chat for this contact
    const recentChat = recentChats.find(
      (chat) =>
        chat.user?._id === contact._id ||
        chat?.user === contact._id ||
        chat?.receiver === contact._id ||
        chat?.sender === contact._id
    );

    const lastMessage = recentChat?.lastMessage;
    const messagePreview = getMessagePreview(lastMessage);
    const lastMessageTime = lastMessage?.createdAt
      ? formatTime(new Date(lastMessage.createdAt))
      : "";
    const isMyMessage = lastMessage?.sender === userData?._id;

    return (
      <div
        key={contact._id}
        onClick={() => handleContactClick(contact)}
        className={`flex items-center p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all duration-200 cursor-pointer ${
          selectedChat?._id === contact._id
            ? "bg-gray-100 dark:bg-gray-800"
            : ""
        }`}>
        <div className="relative">
          <Avatar className="w-12 h-12">
            <AvatarImage
              src={
                contact.profilePic && contact.profilePic !== ""
                  ? `${backendUrl}${contact.profilePic}`
                  : defaultImage
              }
              alt={contact.displayName || "User"}
              className="object-cover"
            />
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white">
              {(contact.displayName?.charAt(0) || "?").toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {/* <div
            className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-gray-900 ${
              contact.isOnline ? "bg-green-500" : "bg-gray-400"
            }`}
          /> */}
        </div>
        <div className="ml-4 flex-1 min-w-0">
          <div className="flex justify-between items-center">
            <h3 className="font-medium text-gray-900 dark:text-white truncate cursor-default">
              {contact.displayName || "Unknown"}
            </h3>
            <div className="flex items-center gap-2">
              {unseenMessages.get(contact._id) && (
                <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                  {unseenMessages.get(contact._id)}
                </span>
              )}
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {contact.isOnline ? "Online" : lastMessageTime}
              </span>
            </div>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 truncate flex items-center gap-1">
            {isMyMessage && <span className="text-xs">You: </span>}
            {messagePreview}
          </p>
        </div>
      </div>
    );
  };

  // Clear processed messages periodically
  useEffect(() => {
    const interval = setInterval(() => {
      processedMessages.current.clear();
    }, 60000); // Clear every minute

    return () => clearInterval(interval);
  }, []);

  if (loading)
    return (
      <div className="flex items-center justify-center h-full bg-white dark:bg-gray-800">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 border-4 border-blue-500/30 dark:border-blue-400/30 rounded-full animate-pulse"></div>
          <div className="absolute inset-2 border-t-4 border-blue-500 dark:border-blue-400 rounded-full animate-spin"></div>
        </div>
      </div>
    );

  if (error)
    return (
      <div className="flex items-center justify-center h-full bg-white dark:bg-gray-800">
        <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
          <p className="text-red-500 dark:text-red-400 text-lg font-semibold">
            {error}
          </p>
        </div>
      </div>
    );

  return (
    <div
      className={`relative w-full h-full flex flex-col bg-white dark:bg-gray-900 text-black dark:text-white transition-colors duration-200 fixed inset-0 md:relative md:inset-auto w-full md:w-[35vw] lg:w-[30vw] xl:w-[20vw] border-r border-gray-200/80 dark:border-gray-700/80 contacts-container transform transition-transform duration-300 ease-in-out ${
        selectedChat ? "translate-x-[-100%] md:translate-x-0" : "translate-x-0"
      }`}>
      {/* Profile Section */}
      <div className="p-4 sm:p-6 border-b border-gray-200/80 dark:border-gray-700/80">
        <div className="flex items-center space-x-4">
          <div className="relative group">
            <Avatar className="w-14 h-14 ring-2 ring-offset-2 ring-blue-500/20 dark:ring-blue-400/20 transition-all duration-300 group-hover:ring-blue-500/40 dark:group-hover:ring-blue-400/40">
              <AvatarImage
                src={previewPic}
                alt={userData?.displayName || "User"}
                className="object-cover"
              />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                {userData?.displayName?.charAt(0).toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200">
              {previewPic !== defaultImage ? (
                <button
                  onClick={handleDeleteProfilePic}
                  className="bg-red-500/90 hover:bg-red-600 p-2 rounded-full transform hover:scale-110 transition-all duration-200 shadow-lg backdrop-blur-sm">
                  <Trash2 size={16} className="text-white" />
                </button>
              ) : (
                <button
                  onClick={addProfilePic}
                  className="bg-blue-500/90 hover:bg-blue-600 p-2 rounded-full transform hover:scale-110 transition-all duration-200 shadow-lg backdrop-blur-sm">
                  <Plus size={16} className="text-white" />
                </button>
              )}
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white truncate cursor-default">
              {truncateName(userData?.displayName || "Unknown")}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
              {truncateAbout(userData?.about || "No bio available")}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              className="relative group text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 p-2 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all duration-200"
              onClick={handleEdit}>
              <Pencil size={20} />
              <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                Edit Profile
              </span>
            </button>
            <button
              className="relative group text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/30 transition-all duration-200"
              onClick={handleLogout}>
              <LogOut size={20} />
              <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                Logout
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-4 border-b border-gray-200/80 dark:border-gray-700/80">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            size={20}
          />
          <input
            type="text"
            placeholder="Search contacts..."
            value={searchTerm}
            onChange={handleSearch}
            className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-800 border-none rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all duration-200 placeholder-gray-400 text-gray-900 dark:text-white"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto border-r border-gray-200/80 dark:border-gray-700/80">
        <div className="divide-y divide-gray-700">
          {searchTerm ? (
            searchResults.length > 0 ? (
              searchResults.map((contact) => renderContact(contact))
            ) : (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                No results found
              </div>
            )
          ) : isLoadingChats ? (
            <div className="flex items-center justify-center p-4">
              <div className="relative w-12 h-12">
                <div className="absolute inset-0 border-4 border-blue-500/30 dark:border-blue-400/30 rounded-full animate-pulse"></div>
                <div className="absolute inset-2 border-t-4 border-blue-500 dark:border-blue-400 rounded-full animate-spin"></div>
              </div>
            </div>
          ) : recentChats.length > 0 ? (
            recentChats.map((chat) => chat?.user && renderContact(chat.user))
          ) : (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              No recent conversations
            </div>
          )}
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50 p-4">
          <div className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-2xl shadow-2xl w-full sm:w-[90%] max-w-md transform transition-all duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
                Edit Profile
              </h3>
              <button
                onClick={() => setIsEditOpen(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200">
                <X size={20} />
              </button>
            </div>

            <div className="mb-6 flex justify-center">
              <Avatar className="w-20 h-20 sm:w-24 sm:h-24 ring-2 ring-offset-2 ring-blue-500/20 dark:ring-blue-400/20">
                <AvatarImage
                  src={previewPic}
                  alt="Profile Preview"
                  className="object-cover"
                />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                  {userData?.displayName?.charAt(0).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  value={editData.displayName}
                  onChange={(e) =>
                    setEditData({ ...editData, displayName: e.target.value })
                  }
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all duration-200"
                  placeholder="Enter your display name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  About
                </label>
                <textarea
                  value={editData.about}
                  onChange={(e) =>
                    setEditData({ ...editData, about: e.target.value })
                  }
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all duration-200 min-h-[100px] resize-none"
                  placeholder="Tell us about yourself"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6">
              <button
                onClick={() => setIsEditOpen(false)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg transition-all duration-200 w-full sm:w-auto">
                Cancel
              </button>
              <button
                onClick={handleSaveChanges}
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-lg transition-all duration-200 w-full sm:w-auto">
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

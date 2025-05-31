import { createContext, useContext, useState, useEffect } from "react";
import { auth } from "../Firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { socketService } from "../services/socketService";
import CallNotification from "../components/chat/CallNotification";
import CallModal from "../components/chat/CallModal";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [isProfileComplete, setIsProfileComplete] = useState(false);
  const [selectedChat, setSelectedChat] = useState(null);
  const [socket, setSocket] = useState(null);
  const [globalCallState, setGlobalCallState] = useState({
    isCallModalOpen: false,
    isCallNotificationOpen: false,
    incomingCall: null,
    callType: null,
  });
  const [isCallMinimized, setIsCallMinimized] = useState(false);

  const handleMinimize = () => {
    setIsCallMinimized((prev) => !prev);
  };
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      if (user) {
        setUser(user);
        setEmail(user.email || "");
        setDisplayName(user.displayName || "");
        try {
          // Fetch user data from backend
          const response = await fetch(
            `${import.meta.env.VITE_BACKEND_URL}/api/users/getUser/${
              user.email
            }`
          );
          const data = await response.json();
          setUserData(data);

          // Connect socket using the service
          try {
            const socket = await socketService.connect(data._id);
            setSocket(socket);
            console.log(
              "[AuthProvider] Socket connected successfully:",
              socket.id
            );
          } catch (error) {
            console.error("[AuthProvider] Error connecting socket:", error);
            setSocket(null);
          }

          if (data && data.displayName && data.about) {
            setIsProfileComplete(true);
          } else {
            setIsProfileComplete(false);
          }
        } catch (error) {
          console.error("[AuthProvider] Error fetching user data:", error);
          setIsProfileComplete(false);
          setUserData(null);
          setSocket(null);
        }
      } else {
        // User signed out
        setUser(null);
        setEmail("");
        setDisplayName("");
        setUserData(null);
        setIsProfileComplete(false);
        socketService.disconnect();
        setSocket(null);
      }
      setLoading(false);
    });

    // Cleanup function
    return () => {
      unsubscribe();
      socketService.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!socket) return;

    console.log("[AuthProvider] Setting up global call event listeners");
    console.log(
      "[AuthProvider] Current socket state:",
      socket.connected ? "Connected" : "Disconnected"
    );
    console.log("[AuthProvider] Socket ID:", socket.id);

    const handleIncomingCall = (callData) => {
      console.log("[AuthProvider] Received incoming call:", callData);
      
      // Check if user is already in a call
      if (globalCallState.isCallModalOpen || globalCallState.isCallNotificationOpen) {
        console.log("[AuthProvider] User is busy, sending busy signal");
        socketService.emit("user_busy", {
          to: callData.from,
          from: userData?._id
        });
        return;
      }

      setGlobalCallState((prev) => ({
        ...prev,
        isCallNotificationOpen: true,
        incomingCall: callData,
        callType: callData.type,
      }));
    };

    const handleCallAccepted = (callData) => {
      console.log("[AuthProvider] Call accepted:", callData);
      setGlobalCallState((prev) => ({
        ...prev,
        isCallModalOpen: true,
        isCallNotificationOpen: false,
        callType: callData.type,
      }));
    };

    const handleCallRejected = (callData) => {
      console.log("[AuthProvider] Call rejected:", callData);
      setGlobalCallState((prev) => ({
        ...prev,
        isCallModalOpen: false,
        isCallNotificationOpen: false,
        incomingCall: null,
        callType: null,
      }));
    };

    const handleCallFailed = (data) => {
      console.log("[AuthProvider] Call failed:", data);
      setGlobalCallState((prev) => ({
        ...prev,
        isCallModalOpen: false,
        isCallNotificationOpen: false,
        incomingCall: null,
        callType: null,
      }));
    };

    const handleCallEnded = (callData) => {
      console.log("[AuthProvider] Call ended:", callData);
      setGlobalCallState((prev) => ({
        ...prev,
        isCallModalOpen: false,
        isCallNotificationOpen: false,
        incomingCall: null,
        callType: null,
      }));
    };

    // Set up socket event listeners
    socket.on("incoming_call", handleIncomingCall);
    socket.on("call_accepted", handleCallAccepted);
    socket.on("call_rejected", handleCallRejected);
    socket.on("call_failed", handleCallFailed);
    socket.on("call_ended", handleCallEnded);

    // Cleanup function
    return () => {
      console.log("[AuthProvider] Cleaning up global call event listeners");
      socket.off("incoming_call", handleIncomingCall);
      socket.off("call_accepted", handleCallAccepted);
      socket.off("call_rejected", handleCallRejected);
      socket.off("call_failed", handleCallFailed);
      socket.off("call_ended", handleCallEnded);
    };
  }, [socket]);

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setEmail("");
      setDisplayName("");
      setUserData(null);
      setIsProfileComplete(false);
      socketService.disconnect();
      setSocket(null);
    } catch (error) {
      console.error("Logout failed:", error);
      throw error;
    }
  };

  const handleAcceptCall = () => {
    if (!globalCallState.incomingCall) return;

    socketService.emit("accept_call", globalCallState.incomingCall);
    setGlobalCallState((prev) => ({
      ...prev,
      isCallModalOpen: true,
      isCallNotificationOpen: false,
    }));
  };

  const handleRejectCall = () => {
    if (!globalCallState.incomingCall) return;

    socketService.emit("reject_call", globalCallState.incomingCall);
    setGlobalCallState((prev) => ({
      ...prev,
      isCallModalOpen: false,
      isCallNotificationOpen: false,
      incomingCall: null,
      callType: null,
    }));
  };

  const handleEndCall = () => {
    // For incoming calls (receiver)
    if (globalCallState.incomingCall) {
      socketService.emit("end_call", {
        from: userData?._id,
        to: globalCallState.incomingCall.from,
      });
    }
    // For outgoing calls (caller)
    else if (globalCallState.callType) {
      socketService.emit("end_call", {
        from: userData?._id,
        to: selectedChat?._id,
      });
    }

    setGlobalCallState((prev) => ({
      ...prev,
      isCallModalOpen: false,
      isCallNotificationOpen: false,
      incomingCall: null,
      callType: null,
    }));
  };

  const value = {
    user,
    email,
    displayName,
    setDisplayName,
    logout,
    loading,
    isProfileComplete,
    setIsProfileComplete,
    selectedChat,
    setSelectedChat,
    userData,
    socket,
    globalCallState,
    handleAcceptCall,
    handleRejectCall,
    handleEndCall,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
      {globalCallState.isCallNotificationOpen &&
        globalCallState.incomingCall && (
          <CallNotification
            callerName={globalCallState.incomingCall.callerName}
            callType={globalCallState.incomingCall.type}
            onAccept={handleAcceptCall}
            onReject={handleRejectCall}
            callerProfilePic={globalCallState.incomingCall.callerProfilePic}
          />
        )}
      {globalCallState.isCallModalOpen && (
        <CallModal
          isOpen={globalCallState.isCallModalOpen}
          isMinimized={isCallMinimized}
          onMinimize={handleMinimize}
          onClose={handleEndCall}
          callType={globalCallState.callType}
          userId={userData?._id}
          userName={userData?.displayName}
          targetUserId={globalCallState.incomingCall ? globalCallState.incomingCall.from : selectedChat?._id}
          targetUserName={globalCallState.incomingCall ? globalCallState.incomingCall.callerName : selectedChat?.displayName}
          socket={socket}
        />
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

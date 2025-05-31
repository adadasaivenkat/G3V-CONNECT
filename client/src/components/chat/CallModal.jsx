import React, { useEffect, useRef, useState } from "react";
import {
  Phone,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Minimize,
  Maximize,
} from "lucide-react";
import { socketService } from "../../services/socketService";

const CallModal = ({
  isOpen,
  isMinimized,
  onMinimize,
  onClose,
  callType,
  userId,
  targetUserId: initialTargetUserId,
  targetUserName,
  isMicOn = true,
  isVideoOn = true,
  socket,
}) => {
  const [localMicOn, setLocalMicOn] = useState(isMicOn);
  const [localVideoOn, setLocalVideoOn] = useState(isVideoOn);
  const [error, setError] = useState(null);
  const [isRemoteVideoReady, setIsRemoteVideoReady] = useState(false);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const [callStatus, setCallStatus] = useState("connecting"); // 'connecting', 'ringing', 'connected', 'ended'
  const peerConnectionRef = useRef(null);
  const [currentTargetUserId, setCurrentTargetUserId] = useState(initialTargetUserId);
  const iceCandidateQueueRef = useRef([]);
  const hasRemoteDescriptionRef = useRef(false);

  // Update currentTargetUserId when initialTargetUserId changes
  useEffect(() => {
    setCurrentTargetUserId(initialTargetUserId);
  }, [initialTargetUserId]);

  // Function to handle video element loading
  const handleVideoLoad = (videoElement, stream, streamType) => {
    if (!videoElement || !stream) {
      console.warn(`[CallModal] Cannot set ${streamType} video: missing element or stream`);
      return;
    }

    // Only set srcObject if it has changed
    if (videoElement.srcObject !== stream) {
      videoElement.srcObject = stream;
      console.log(`[CallModal] ${streamType} video stream set`);
    }

    videoElement.onloadedmetadata = () => {
      console.log(`[CallModal] ${streamType} video metadata loaded`);
      videoElement.play().catch((err) => {
        console.warn(`[CallModal] Error playing ${streamType} video:`, err);
      });
    };

    videoElement.onerror = (err) => {
      console.error(`[CallModal] ${streamType} video error:`, err);
    };
  };

  // Effect to handle video elements
  useEffect(() => {
    if (localVideoRef.current && localStreamRef.current) {
      handleVideoLoad(localVideoRef.current, localStreamRef.current, "Local");
    }
    if (remoteVideoRef.current && remoteVideoRef.current.srcObject) {
      handleVideoLoad(remoteVideoRef.current, remoteVideoRef.current.srcObject, "Remote");
    }
  }, [localVideoRef.current, remoteVideoRef.current]);

  useEffect(() => {
    if (!isOpen || !socket) return;

    let isMounted = true;
    let isInitiator = false;
    let hasReceivedOffer = false;

    const handleUserBusy = (data) => {
      console.log("[CallModal] Received busy signal from:", data.from);
      setError("User is busy with another call");
      setCallStatus("ended");
      onClose();
    };

    const initializeCall = async () => {
      try {
        // Use currentTargetUserId instead of targetUserId
        const effectiveTargetUserId = isInitiator ? currentTargetUserId : userId;
        
        // Ensure we have both user IDs before proceeding
        if (!userId || !effectiveTargetUserId) {
          console.error("[CallModal] Missing user IDs:", { 
            userId, 
            effectiveTargetUserId,
            isInitiator,
            currentTargetUserId,
            initialTargetUserId
          });
          setError("Failed to initialize call: Missing user information");
          setCallStatus("ended");
          onClose();
          return;
        }

        // Validate that we're not trying to call ourselves
        if (userId === effectiveTargetUserId) {
          console.error("[CallModal] Cannot call yourself");
          setError("Cannot call yourself");
          setCallStatus("ended");
          onClose();
          return;
        }

        setCallStatus("connecting");
        console.log(
          "[CallModal] Initializing call as:",
          isInitiator ? "caller" : "receiver"
        );
        console.log("[CallModal] User ID:", userId);
        console.log("[CallModal] Target User ID:", effectiveTargetUserId);

        // Get user media
        const constraints = {
          audio: true,
          video:
            callType === "video"
              ? {
                  width: { ideal: 1280 },
                  height: { ideal: 720 },
                  facingMode: "user",
                }
              : false,
        };

        console.log(
          "[CallModal] Requesting media with constraints:",
          constraints
        );
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (!isMounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        // Set initial track states based on props
        stream.getAudioTracks().forEach(track => {
          track.enabled = isMicOn;
          console.log("[CallModal] Initial audio track state:", track.enabled);
        });
        stream.getVideoTracks().forEach(track => {
          track.enabled = isVideoOn;
          console.log("[CallModal] Initial video track state:", track.enabled);
        });

        localStreamRef.current = stream;

        // Set local video using the new handler
        if (localVideoRef.current) {
          handleVideoLoad(localVideoRef.current, stream, "Local");
        }

        // Initialize WebRTC connection
        const configuration = {
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },
            { urls: "stun:stun2.l.google.com:19302" },
            { urls: "stun:stun3.l.google.com:19302" },
            { urls: "stun:stun4.l.google.com:19302" },
          ],
          iceCandidatePoolSize: 10,
        };

        // Clean up any existing peer connection
        if (peerConnectionRef.current) {
          peerConnectionRef.current.close();
          peerConnectionRef.current = null;
        }

        const peerConnection = new RTCPeerConnection(configuration);
        peerConnectionRef.current = peerConnection;

        // Add local stream tracks to peer connection
        localStreamRef.current.getTracks().forEach((track) => {
          console.log("[CallModal] Adding track to peer connection:", track.kind, "enabled:", track.enabled);
          const sender = peerConnectionRef.current.addTrack(track, localStreamRef.current);
          // Store the sender reference for later use
          if (track.kind === 'video') {
            videoSenderRef.current = sender;
          } else if (track.kind === 'audio') {
            audioSenderRef.current = sender;
            // Ensure the audio track state is properly set in the peer connection
            sender.track.enabled = track.enabled;
          }
        });

        // Handle connection state changes
        peerConnection.onconnectionstatechange = () => {
          console.log(
            "[CallModal] Connection state:",
            peerConnection.connectionState
          );
          if (peerConnection.connectionState === "connected") {
            console.log("[CallModal] Peers connected successfully");
            setCallStatus("connected");
          } else if (peerConnection.connectionState === "disconnected" || 
                    peerConnection.connectionState === "failed" || 
                    peerConnection.connectionState === "closed") {
            console.log("[CallModal] Connection ended");
            setCallStatus("ended");
            cleanupResources();
          }
        };

        // Handle ICE connection state changes
        peerConnection.oniceconnectionstatechange = () => {
          console.log(
            "[CallModal] ICE connection state:",
            peerConnection.iceConnectionState
          );
          if (peerConnection.iceConnectionState === "disconnected" || 
              peerConnection.iceConnectionState === "failed" || 
              peerConnection.iceConnectionState === "closed") {
            setCallStatus("ended");
            cleanupResources();
          }
        };

        // Handle ICE candidates
        peerConnection.onicecandidate = (event) => {
          if (event.candidate) {
            console.log("[CallModal] Sending ICE candidate");
            socketService.emit("ice_candidate", {
              candidate: event.candidate,
              from: userId,
              to: effectiveTargetUserId,
            });
          }
        };

        // Handle incoming streams
        peerConnection.ontrack = (event) => {
          console.log("[CallModal] Received remote track:", event.track.kind);
          if (remoteVideoRef.current && event.streams && event.streams[0]) {
            handleVideoLoad(remoteVideoRef.current, event.streams[0], "Remote");
            setIsRemoteVideoReady(true);
            setCallStatus("connected");

            // Listen for track ended event
            event.track.onended = () => {
              console.log("[CallModal] Remote track ended:", event.track.kind);
              if (remoteVideoRef.current?.srcObject) {
                const tracks = remoteVideoRef.current.srcObject.getTracks();
                if (!tracks || tracks.length === 0) {
                  setIsRemoteVideoReady(false);
                  setCallStatus("ended");
                  if (remoteVideoRef.current) {
                    remoteVideoRef.current.srcObject = null;
                  }
                }
              }
            };
          }
        };

        // If we're the initiator and haven't received an offer, create and send the offer
        if (isInitiator && !hasReceivedOffer) {
          setCallStatus("ringing");
          console.log("[CallModal] Creating and sending offer as initiator");
          const offer = await peerConnection.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: callType === "video",
          });

          await peerConnection.setLocalDescription(offer);
          console.log("[CallModal] Local description set");

          console.log("[CallModal] Sending offer");
          socketService.emit("offer", {
            offer,
            from: userId,
            to: effectiveTargetUserId,
          });
        }
      } catch (err) {
        console.error("[CallModal] Error initializing call:", err);
        if (isMounted) {
          setError(
            "Failed to initialize call. Please check your camera and microphone permissions."
          );
          setCallStatus("ended");
          cleanupResources();
        }
      }
    };

    // Function to process queued ICE candidates
    const processIceCandidateQueue = async () => {
      if (!peerConnectionRef.current || !hasRemoteDescriptionRef.current) return;

      while (iceCandidateQueueRef.current.length > 0) {
        const candidate = iceCandidateQueueRef.current.shift();
        try {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
          console.log("[CallModal] Processed queued ICE candidate");
        } catch (err) {
          console.error("[CallModal] Error processing queued ICE candidate:", err);
        }
      }
    };

    // Handle incoming answer
    const handleAnswer = async (data) => {
      try {
        console.log("[CallModal] Received answer from:", data.from);
        if (!peerConnectionRef.current) {
          console.error("[CallModal] No peer connection available for answer");
          return;
        }

        // Log current signaling state
        console.log("[CallModal] Current signaling state:", peerConnectionRef.current.signalingState);

        // Only set remote description if we're in the correct state
        if (peerConnectionRef.current.signalingState === "have-local-offer") {
          console.log("[CallModal] Setting remote description (answer)");
          await peerConnectionRef.current.setRemoteDescription(
            new RTCSessionDescription(data.answer)
          );
          console.log("[CallModal] Remote description set successfully");
          setCallStatus("connected");
        } else {
          console.warn(
            `[CallModal] Skipped setting remote answer, current state: ${peerConnectionRef.current.signalingState}`
          );
          // If we're already connected, just update the status
          if (peerConnectionRef.current.connectionState === "connected") {
            setCallStatus("connected");
          }
        }
      } catch (err) {
        console.error("[CallModal] Error handling answer:", err);
        if (isMounted) {
          setError("Failed to establish connection.");
          setCallStatus("ended");
          cleanupResources();
        }
      }
    };

    // Handle ICE candidates
    const handleIceCandidate = async (data) => {
      try {
        console.log("[CallModal] Received ICE candidate from:", data.from);
        
        if (!peerConnectionRef.current) {
          console.log("[CallModal] No peer connection, queueing ICE candidate");
          iceCandidateQueueRef.current.push(data.candidate);
          return;
        }

        if (!hasRemoteDescriptionRef.current) {
          console.log("[CallModal] No remote description, queueing ICE candidate");
          iceCandidateQueueRef.current.push(data.candidate);
          return;
        }

        await peerConnectionRef.current.addIceCandidate(
          new RTCIceCandidate(data.candidate)
        );
        console.log("[CallModal] ICE candidate added");
      } catch (err) {
        console.error("[CallModal] Error handling ICE candidate:", err);
        // Queue the candidate if there was an error
        iceCandidateQueueRef.current.push(data.candidate);
      }
    };

    // Handle incoming offer
    const handleOffer = async (data) => {
      try {
        console.log("[CallModal] Received offer from:", data.from);
        console.log("[CallModal] Current user:", userId);

        // Reset state
        setCurrentTargetUserId(data.from);
        hasReceivedOffer = true;
        isInitiator = false;
        setCallStatus("ringing");
        hasRemoteDescriptionRef.current = false;
        iceCandidateQueueRef.current = [];
        
        // Clean up any existing connection before creating a new one
        cleanupResources();

        // Create and configure peer connection first
        const configuration = {
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },
            { urls: "stun:stun2.l.google.com:19302" },
            { urls: "stun:stun3.l.google.com:19302" },
            { urls: "stun:stun4.l.google.com:19302" },
          ],
          iceCandidatePoolSize: 10,
        };

        const peerConnection = new RTCPeerConnection(configuration);
        peerConnectionRef.current = peerConnection;

        // Log signaling state changes
        peerConnection.onsignalingstatechange = () => {
          console.log("[CallModal] Signaling state changed to:", peerConnection.signalingState);
        };

        // Set up peer connection event handlers
        peerConnection.onconnectionstatechange = () => {
          console.log(
            "[CallModal] Connection state:",
            peerConnection.connectionState
          );
          if (peerConnection.connectionState === "connected") {
            console.log("[CallModal] Peers connected successfully");
            setCallStatus("connected");
          } else if (peerConnection.connectionState === "disconnected" || 
                    peerConnection.connectionState === "failed" || 
                    peerConnection.connectionState === "closed") {
            console.log("[CallModal] Connection ended");
            setCallStatus("ended");
            cleanupResources();
          }
        };

        peerConnection.oniceconnectionstatechange = () => {
          console.log(
            "[CallModal] ICE connection state:",
            peerConnection.iceConnectionState
          );
          if (peerConnection.iceConnectionState === "disconnected" || 
              peerConnection.iceConnectionState === "failed" || 
              peerConnection.iceConnectionState === "closed") {
            setCallStatus("ended");
            cleanupResources();
          }
        };

        peerConnection.onicecandidate = (event) => {
          if (event.candidate) {
            console.log("[CallModal] Sending ICE candidate");
            socketService.emit("ice_candidate", {
              candidate: event.candidate,
              from: userId,
              to: data.from,
            });
          }
        };

        peerConnection.ontrack = (event) => {
          console.log("[CallModal] Received remote track:", event.track.kind);
          if (remoteVideoRef.current && event.streams && event.streams[0]) {
            handleVideoLoad(remoteVideoRef.current, event.streams[0], "Remote");
            setIsRemoteVideoReady(true);
            setCallStatus("connected");

            // Listen for track ended event
            event.track.onended = () => {
              console.log("[CallModal] Remote track ended:", event.track.kind);
              if (remoteVideoRef.current?.srcObject) {
                const tracks = remoteVideoRef.current.srcObject.getTracks();
                if (!tracks || tracks.length === 0) {
                  setIsRemoteVideoReady(false);
                  setCallStatus("ended");
                  if (remoteVideoRef.current) {
                    remoteVideoRef.current.srcObject = null;
                  }
                }
              }
            };
          }
        };

        // Get user media
        const constraints = {
          audio: true,
          video: callType === "video" ? {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: "user",
          } : false,
        };

        console.log("[CallModal] Requesting media with constraints:", constraints);
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (!isMounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        localStreamRef.current = stream;

        // Set local video
        if (localVideoRef.current && stream) {
          handleVideoLoad(localVideoRef.current, stream, "Local");
        }

        // Add local stream tracks to peer connection
        localStreamRef.current.getTracks().forEach((track) => {
          console.log("[CallModal] Adding track to peer connection:", track.kind, "enabled:", track.enabled);
          const sender = peerConnectionRef.current.addTrack(track, localStreamRef.current);
          // Store the sender reference for later use
          if (track.kind === 'video') {
            videoSenderRef.current = sender;
          } else if (track.kind === 'audio') {
            audioSenderRef.current = sender;
            // Ensure the audio track state is properly set in the peer connection
            sender.track.enabled = track.enabled;
          }
        });

        // Check current signaling state before setting remote description
        console.log("[CallModal] Current signaling state before setting remote description:", 
          peerConnectionRef.current.signalingState);

        // Set remote description
        console.log("[CallModal] Setting remote description (offer)");
        await peerConnectionRef.current.setRemoteDescription(
          new RTCSessionDescription(data.offer)
        );
        console.log("[CallModal] Remote description set successfully");
        hasRemoteDescriptionRef.current = true;

        // Process any queued ICE candidates
        await processIceCandidateQueue();

        // Create and set local description
        console.log("[CallModal] Creating answer");
        const answer = await peerConnectionRef.current.createAnswer();
        console.log("[CallModal] Setting local description (answer)");
        await peerConnectionRef.current.setLocalDescription(answer);
        console.log("[CallModal] Local description set successfully");

        // Send answer
        console.log("[CallModal] Sending answer");
        socketService.emit("answer", {
          answer,
          from: userId,
          to: data.from,
        });
      } catch (err) {
        console.error("[CallModal] Error handling offer:", err);
        if (isMounted) {
          setError("Failed to handle incoming call.");
          setCallStatus("ended");
          cleanupResources();
        }
      }
    };

    // Set up socket event listeners
    socketService.on("offer", handleOffer);
    socketService.on("answer", handleAnswer);
    socketService.on("ice_candidate", handleIceCandidate);
    socketService.on("user_busy", handleUserBusy);

    // Initialize call if we're the caller (determined by the socket event)
    if (!hasReceivedOffer) {
      isInitiator = true;
      initializeCall();
    }

    return () => {
      isMounted = false;

      // Cleanup socket event listeners
      socketService.off("offer", handleOffer);
      socketService.off("answer", handleAnswer);
      socketService.off("ice_candidate", handleIceCandidate);
      socketService.off("user_busy", handleUserBusy);

      // Cleanup resources
      cleanupResources();
    };
  }, [isOpen, callType, socket, userId, currentTargetUserId]);

  const toggleMic = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      if (audioTracks.length > 0) {
        const newState = !localMicOn;
        audioTracks.forEach(track => {
          track.enabled = newState;
        });
        
        // Update the audio track in the peer connection
        if (peerConnectionRef.current) {
          const senders = peerConnectionRef.current.getSenders();
          const audioSender = senders.find(sender => sender.track?.kind === 'audio');
          if (audioSender) {
            audioSender.track.enabled = newState;
          }
        }
        
        setLocalMicOn(newState);
        console.log("[CallModal] Microphone toggled:", newState);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      if (videoTracks.length > 0) {
        videoTracks.forEach(track => {
          track.enabled = !track.enabled;
        });
        setLocalVideoOn(!localVideoOn);
        console.log("[CallModal] Video toggled:", videoTracks[0].enabled);
      }
    }
  };

  // Add refs for track senders
  const videoSenderRef = useRef(null);
  const audioSenderRef = useRef(null);

  const cleanupResources = () => {
    console.log("[CallModal] Cleaning up resources");
    
    // Reset ICE candidate queue
    iceCandidateQueueRef.current = [];
    hasRemoteDescriptionRef.current = false;
    
    // Cleanup media streams
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        track.stop();
        console.log("[CallModal] Stopped track:", track.kind);
      });
      localStreamRef.current = null;
    }

    // Cleanup peer connection
    if (peerConnectionRef.current) {
      // Close all data channels first
      peerConnectionRef.current.getSenders().forEach(sender => {
        if (sender.track) {
          sender.track.stop();
        }
      });

      // Reset sender refs
      videoSenderRef.current = null;
      audioSenderRef.current = null;

      // Close the peer connection
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
      console.log("[CallModal] Peer connection closed");
    }

    // Reset video elements
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }

    // Reset states
    setIsRemoteVideoReady(false);
    setLocalMicOn(true);
    setLocalVideoOn(true);
    setError(null);
    setCallStatus("ended");
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed ${
        isMinimized
          ? "bottom-4 right-4 w-64 h-48"
          : "inset-0 flex items-center justify-center bg-black/50"
      } z-50 transition-all duration-300`}>
      <div
        className={`${
          isMinimized ? "w-full h-full" : "relative w-full max-w-4xl h-[80vh]"
        } bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden`}>
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/50 to-transparent">
          <div className="text-white">
            <h3 className="text-lg font-semibold">
              {callType === "video" ? "Video Call" : "Voice Call"}
            </h3>
            <p className="text-sm opacity-90">
              {targetUserName} • {callStatus}
            </p>
          </div>
          <button
            onClick={onMinimize}
            className="p-2 rounded-full bg-gray-600 hover:bg-gray-700 transition-colors"
            aria-label={isMinimized ? "Maximize" : "Minimize"}>
            {isMinimized ? (
              <Maximize className="w-5 h-5 text-white" />
            ) : (
              <Minimize className="w-5 h-5 text-white" />
            )}
          </button>
        </div>

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-gray-800/80">
            <div className="text-center p-6">
              <Phone className="w-16 h-16 text-red-500 mx-auto mb-4 transform rotate-135" />
              <p className="text-red-500">{error}</p>
            </div>
          </div>
        )}

        <div className="relative w-full h-full bg-gray-900">
          <div className="absolute inset-0">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className={`w-full h-full object-cover ${
                isRemoteVideoReady ? "opacity-100" : "opacity-0"
              }`}
            />
            {!isRemoteVideoReady && (
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="flex gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse delay-0"></div>
                  <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse delay-300"></div>
                  <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse delay-600"></div>
                </div>
                <div className="text-white text-lg">{callStatus}</div>
              </div>
            )}
          </div>

          {callType === "video" && !isMinimized && (
            <div className="absolute top-4 right-4 w-32 h-32 rounded-lg overflow-hidden border-2 border-white shadow-lg">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {callType === "video" && isMinimized && (
            <div className="absolute inset-0">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            </div>
          )}
        </div>

        {!isMinimized && (
          <div className="absolute bottom-0 left-0 right-0 z-10 flex items-center justify-center gap-4 p-4 bg-gradient-to-t from-black/50 to-transparent">
            <button
              onClick={toggleMic}
              className={`p-3 rounded-full transition-colors ${
                localMicOn
                  ? "bg-gray-600 hover:bg-gray-700"
                  : "bg-red-500 hover:bg-red-600"
              }`}>
              {localMicOn ? (
                <Mic className="w-6 h-6 text-white" />
              ) : (
                <MicOff className="w-6 h-6 text-white" />
              )}
            </button>

            {callType === "video" && (
              <button
                onClick={toggleVideo}
                className={`p-3 rounded-full transition-colors ${
                  localVideoOn
                    ? "bg-gray-600 hover:bg-gray-700"
                    : "bg-red-500 hover:bg-red-600"
                }`}>
                {localVideoOn ? (
                  <Video className="w-6 h-6 text-white" />
                ) : (
                  <VideoOff className="w-6 h-6 text-white" />
                )}
              </button>
            )}

            <button
              onClick={onClose}
              className="p-3 rounded-full bg-red-500 hover:bg-red-600 transition-colors">
              <Phone className="w-6 h-6 text-white transform rotate-135" />
            </button>
          </div>
        )}

        {isMinimized && (
          <div className="absolute bottom-0 left-0 right-0 z-10 flex items-center justify-center gap-2 p-2 bg-gradient-to-t from-black/50 to-transparent">
            <button
              onClick={toggleMic}
              className={`p-2 rounded-full transition-colors ${
                localMicOn
                  ? "bg-gray-600 hover:bg-gray-700"
                  : "bg-red-500 hover:bg-red-600"
              }`}>
              {localMicOn ? (
                <Mic className="w-4 h-4 text-white" />
              ) : (
                <MicOff className="w-4 h-4 text-white" />
              )}
            </button>

            {callType === "video" && (
              <button
                onClick={toggleVideo}
                className={`p-2 rounded-full transition-colors ${
                  localVideoOn
                    ? "bg-gray-600 hover:bg-gray-700"
                    : "bg-red-500 hover:bg-red-600"
                }`}>
                {localVideoOn ? (
                  <Video className="w-4 h-4 text-white" />
                ) : (
                  <VideoOff className="w-4 h-4 text-white" />
                )}
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-full bg-red-500 hover:bg-red-600 transition-colors">
              <Phone className="w-4 h-4 text-white transform rotate-135" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CallModal;

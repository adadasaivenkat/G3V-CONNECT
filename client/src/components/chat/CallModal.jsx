import React, { useEffect, useRef, useState } from "react";
import {
  Phone,
  Video,
  Mic,
  MicOff,
  Camera,
  CameraOff,
  Minimize,
  Maximize,
} from "lucide-react";

const CallModal = ({
  isOpen,
  isMinimized,
  onMinimize,
  onClose,
  callType,
  userId,
  userName,
  targetUserId,
  targetUserName,
  isMicOn = true,
  isVideoOn = true,
  socket,
}) => {
  const [localMicOn, setLocalMicOn] = useState(isMicOn);
  const [localVideoOn, setLocalVideoOn] = useState(isVideoOn);
  const [error, setError] = useState(null);
  const [isRemoteVideoReady, setIsRemoteVideoReady] = useState(false);
  const [callStatus, setCallStatus] = useState("connecting"); // 'connecting', 'ringing', 'connected', 'ended'
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);

  const handleVideoLoad = (videoElement, streamType) => {
    if (videoElement) {
      videoElement.onloadedmetadata = () => {
        console.log(`[CallModal] ${streamType} video metadata loaded`);
        videoElement.play().catch((err) => {
          console.error(`[CallModal] Error playing ${streamType} video:`, err);
        });
      };

      videoElement.onerror = (err) => {
        console.error(`[CallModal] ${streamType} video error:`, err);
      };
    }
  };

  useEffect(() => {
    if (localVideoRef.current) {
      handleVideoLoad(localVideoRef.current, "Local");
    }
    if (remoteVideoRef.current) {
      handleVideoLoad(remoteVideoRef.current, "Remote");
    }
  }, [localVideoRef.current, remoteVideoRef.current]);

  useEffect(() => {
    if (!isOpen || !socket) return;

    let isMounted = true;
    let isInitiator = false;
    let hasReceivedOffer = false;

    const initializeCall = async () => {
      try {
        setCallStatus("connecting");
        console.log(
          "[CallModal] Initializing call as:",
          isInitiator ? "caller" : "receiver"
        );

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

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (!isMounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        localStreamRef.current = stream;

        if (localVideoRef.current && stream) {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.play().catch((err) => {
            console.error("[CallModal] Error playing local video:", err);
          });
        }

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

        localStreamRef.current.getTracks().forEach((track) => {
          peerConnectionRef.current.addTrack(track, localStreamRef.current);
        });

        peerConnection.onconnectionstatechange = () => {
          if (peerConnection.connectionState === "connected") {
            setCallStatus("connected");
          }
        };

        peerConnection.oniceconnectionstatechange = () => {
          if (peerConnection.iceConnectionState === "disconnected") {
            setCallStatus("ended");
          }
        };

        peerConnection.ontrack = (event) => {
          if (remoteVideoRef.current && event.streams && event.streams[0]) {
            remoteVideoRef.current.srcObject = event.streams[0];
            setIsRemoteVideoReady(true);
            setCallStatus("connected");

            event.track.onended = () => {
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

        peerConnection.onicecandidate = (event) => {
          if (event.candidate) {
            if (socket && socket.emit) {
              socket.emit("ice_candidate", {
                candidate: event.candidate,
                from: userId,
                to: targetUserId,
              });
            }
          }
        };

        if (isInitiator && !hasReceivedOffer) {
          setCallStatus("ringing");
          const offer = await peerConnection.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: callType === "video",
          });

          await peerConnection.setLocalDescription(offer);

          if (socket && socket.emit) {
            socket.emit("offer", {
              offer,
              from: userId,
              to: targetUserId,
            });
          }
        }
      } catch (err) {
        console.error("[CallModal] Error initializing call:", err);
        if (isMounted) {
          setError(
            "Failed to initialize call. Please check your camera and microphone permissions."
          );
          setCallStatus("ended");
        }
      }
    };

    const handleOffer = async (data) => {
      try {
        hasReceivedOffer = true;
        isInitiator = false;
        setCallStatus("ringing");

        if (!peerConnectionRef.current) {
          await initializeCall();
        }

        await peerConnectionRef.current.setRemoteDescription(
          new RTCSessionDescription(data.offer)
        );
        const answer = await peerConnectionRef.current.createAnswer();
        await peerConnectionRef.current.setLocalDescription(answer);

        if (socket && socket.emit) {
          socket.emit("answer", {
            answer,
            from: userId,
            to: data.from,
          });
        }
      } catch (err) {
        console.error("[CallModal] Error handling offer:", err);
        if (isMounted) {
          setError("Failed to handle incoming call.");
          setCallStatus("ended");
        }
      }
    };

    const handleAnswer = async (data) => {
      try {
        if (peerConnectionRef.current) {
          await peerConnectionRef.current.setRemoteDescription(
            new RTCSessionDescription(data.answer)
          );
          setCallStatus("connected");
        }
      } catch (err) {
        console.error("[CallModal] Error handling answer:", err);
        if (isMounted) {
          setError("Failed to establish connection.");
          setCallStatus("ended");
        }
      }
    };

    const handleIceCandidate = async (data) => {
      try {
        if (peerConnectionRef.current) {
          await peerConnectionRef.current.addIceCandidate(
            new RTCIceCandidate(data.candidate)
          );
        }
      } catch (err) {
        console.error("[CallModal] Error handling ICE candidate:", err);
      }
    };

    if (socket) {
      if (socket.on) {
        socket.on("offer", handleOffer);
        socket.on("answer", handleAnswer);
        socket.on("ice_candidate", handleIceCandidate);
      }
    }

    if (!hasReceivedOffer) {
      isInitiator = true;
      initializeCall();
    }

    return () => {
      isMounted = false;

      if (socket && socket.off) {
        socket.off("offer", handleOffer);
        socket.off("answer", handleAnswer);
        socket.off("ice_candidate", handleIceCandidate);
      }

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          track.stop();
        });
      }

      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }
    };
  }, [isOpen, callType, socket, userId, targetUserId]);

  const toggleMic = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setLocalMicOn(!localMicOn);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setLocalVideoOn(!localVideoOn);
      }
    }
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
                  <Camera className="w-6 h-6 text-white" />
                ) : (
                  <CameraOff className="w-6 h-6 text-white" />
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

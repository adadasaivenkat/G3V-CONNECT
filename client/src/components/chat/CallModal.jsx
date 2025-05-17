import React, { useEffect, useRef, useState } from 'react';
import { X, Phone, Video, Mic, MicOff, Camera, CameraOff } from 'lucide-react';
import { socketService } from '../../services/socketService';

const CallModal = ({
  isOpen,
  onClose,
  callType,
  userId,
  userName,
  targetUserId,
  targetUserName,
  isMicOn = true,
  isVideoOn = true,
  socket
}) => {
  const [localMicOn, setLocalMicOn] = useState(isMicOn);
  const [localVideoOn, setLocalVideoOn] = useState(isVideoOn);
  const [error, setError] = useState(null);
  const [isRemoteVideoReady, setIsRemoteVideoReady] = useState(false);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);

  // Function to handle video element loading
  const handleVideoLoad = (videoElement, streamType) => {
    if (videoElement) {
      videoElement.onloadedmetadata = () => {
        console.log(`[CallModal] ${streamType} video metadata loaded`);
        videoElement.play().catch(err => {
          console.error(`[CallModal] Error playing ${streamType} video:`, err);
        });
      };
      
      videoElement.onerror = (err) => {
        console.error(`[CallModal] ${streamType} video error:`, err);
      };
    }
  };

  // Effect to handle video elements
  useEffect(() => {
    if (localVideoRef.current) {
      handleVideoLoad(localVideoRef.current, 'Local');
    }
    if (remoteVideoRef.current) {
      handleVideoLoad(remoteVideoRef.current, 'Remote');
    }
  }, [localVideoRef.current, remoteVideoRef.current]);

  useEffect(() => {
    if (!isOpen || !socket) return;

    let isMounted = true;
    let isInitiator = false;
    let hasReceivedOffer = false;

    const initializeCall = async () => {
      try {
        console.log('[CallModal] Initializing call as:', isInitiator ? 'caller' : 'receiver');
        console.log('[CallModal] User ID:', userId);
        console.log('[CallModal] Target User ID:', targetUserId);
        
        // Get user media
        const constraints = {
          audio: true,
          video: callType === 'video' ? {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user'
          } : false
        };

        console.log('[CallModal] Requesting media with constraints:', constraints);
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (!isMounted) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        localStreamRef.current = stream;

        // Set local video
        if (localVideoRef.current && stream) {
          localVideoRef.current.srcObject = stream;
          console.log('[CallModal] Local video stream set');
          localVideoRef.current.play().catch(err => {
            console.error('[CallModal] Error playing local video:', err);
          });
        }

        // Initialize WebRTC connection
        const configuration = {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun3.l.google.com:19302' },
            { urls: 'stun:stun4.l.google.com:19302' }
          ],
          iceCandidatePoolSize: 10
        };

        const peerConnection = new RTCPeerConnection(configuration);
        peerConnectionRef.current = peerConnection;

        // Add local stream tracks to peer connection
        localStreamRef.current.getTracks().forEach(track => {
          console.log('[CallModal] Adding track to peer connection:', track.kind);
          peerConnectionRef.current.addTrack(track, localStreamRef.current);
        });

        // Handle connection state changes
        peerConnection.onconnectionstatechange = () => {
          console.log('[CallModal] Connection state:', peerConnection.connectionState);
          if (peerConnection.connectionState === 'connected') {
            console.log('[CallModal] Peers connected successfully');
          }
        };

        // Handle ICE connection state changes
        peerConnection.oniceconnectionstatechange = () => {
          console.log('[CallModal] ICE connection state:', peerConnection.iceConnectionState);
        };

        // Handle signaling state changes
        peerConnection.onsignalingstatechange = () => {
          console.log('[CallModal] Signaling state:', peerConnection.signalingState);
        };

        // Handle incoming streams
        peerConnection.ontrack = (event) => {
          console.log('[CallModal] Received remote track:', event.track.kind);
          if (remoteVideoRef.current && event.streams && event.streams[0]) {
            remoteVideoRef.current.srcObject = event.streams[0];
            setIsRemoteVideoReady(true);
            console.log('[CallModal] Remote video stream set');
            
            remoteVideoRef.current.play().catch(err => {
              console.error('[CallModal] Error playing remote video:', err);
            });

            // Listen for track ended event
            event.track.onended = () => {
              console.log('[CallModal] Remote track ended:', event.track.kind);
              if (remoteVideoRef.current?.srcObject) {
                const tracks = remoteVideoRef.current.srcObject.getTracks();
                if (!tracks || tracks.length === 0) {
                  setIsRemoteVideoReady(false);
                  if (remoteVideoRef.current) {
                    remoteVideoRef.current.srcObject = null;
                  }
                }
              }
            };
          }
        };

        // Handle ICE candidates
        peerConnection.onicecandidate = (event) => {
          if (event.candidate) {
            console.log('[CallModal] Sending ICE candidate');
            socketService.emit('ice_candidate', {
              candidate: event.candidate,
              from: userId,
              to: targetUserId
            });
          }
        };

        // If we're the initiator and haven't received an offer, create and send the offer
        if (isInitiator && !hasReceivedOffer) {
          console.log('[CallModal] Creating and sending offer as initiator');
          const offer = await peerConnection.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: callType === 'video'
          });
          
          await peerConnection.setLocalDescription(offer);
          console.log('[CallModal] Local description set');

          console.log('[CallModal] Sending offer');
          socketService.emit('offer', {
            offer,
            from: userId,
            to: targetUserId
          });
        }

      } catch (err) {
        console.error('[CallModal] Error initializing call:', err);
        if (isMounted) {
          setError('Failed to initialize call. Please check your camera and microphone permissions.');
        }
      }
    };

    // Handle incoming offer
    const handleOffer = async (data) => {
      try {
        console.log('[CallModal] Received offer from:', data.from);
        console.log('[CallModal] Current user:', userId);
        
        hasReceivedOffer = true;
        isInitiator = false;

        if (!peerConnectionRef.current) {
          await initializeCall();
        }

        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.offer));
        console.log('[CallModal] Remote description set');

        const answer = await peerConnectionRef.current.createAnswer();
        await peerConnectionRef.current.setLocalDescription(answer);
        console.log('[CallModal] Local description set');

        console.log('[CallModal] Sending answer');
        socketService.emit('answer', {
          answer,
          from: userId,
          to: data.from
        });

      } catch (err) {
        console.error('[CallModal] Error handling offer:', err);
        if (isMounted) {
          setError('Failed to handle incoming call.');
        }
      }
    };

    // Handle incoming answer
    const handleAnswer = async (data) => {
      try {
        console.log('[CallModal] Received answer from:', data.from);
        if (peerConnectionRef.current) {
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
          console.log('[CallModal] Remote description set');
        }
      } catch (err) {
        console.error('[CallModal] Error handling answer:', err);
        if (isMounted) {
          setError('Failed to establish connection.');
        }
      }
    };

    // Handle ICE candidates
    const handleIceCandidate = async (data) => {
      try {
        console.log('[CallModal] Received ICE candidate from:', data.from);
        if (peerConnectionRef.current) {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
          console.log('[CallModal] ICE candidate added');
        }
      } catch (err) {
        console.error('[CallModal] Error handling ICE candidate:', err);
      }
    };

    // Set up socket event listeners
    socketService.on('offer', handleOffer);
    socketService.on('answer', handleAnswer);
    socketService.on('ice_candidate', handleIceCandidate);

    // Initialize call if we're the caller (determined by the socket event)
    if (!hasReceivedOffer) {
      isInitiator = true;
      initializeCall();
    }

    return () => {
      isMounted = false;
      
      // Cleanup socket event listeners
      socketService.off('offer', handleOffer);
      socketService.off('answer', handleAnswer);
      socketService.off('ice_candidate', handleIceCandidate);
      
      // Cleanup media streams
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          track.stop();
          console.log('[CallModal] Stopped track:', track.kind);
        });
      }
      
      // Cleanup peer connection
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        console.log('[CallModal] Peer connection closed');
      }

      // Reset video elements
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
        console.log('[CallModal] Microphone toggled:', audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
    setLocalVideoOn(!localVideoOn);
        console.log('[CallModal] Video toggled:', videoTrack.enabled);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative w-full max-w-4xl h-[80vh] bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/50 to-transparent">
          <div className="text-white">
            <h3 className="text-lg font-semibold">
              {callType === 'video' ? 'Video Call' : 'Voice Call'}
            </h3>
            <p className="text-sm opacity-90">{targetUserName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-red-500 hover:bg-red-600 transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* Error state */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-gray-800/80">
            <div className="text-center p-6">
              <X className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <p className="text-red-500">{error}</p>
            </div>
          </div>
        )}

        {/* Video containers */}
        <div className="relative w-full h-full bg-gray-900">
          {/* Remote video */}
          <div className="absolute inset-0">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className={`w-full h-full object-cover ${isRemoteVideoReady ? 'opacity-100' : 'opacity-0'}`}
            />
            {!isRemoteVideoReady && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-white text-lg">Connecting...</div>
              </div>
            )}
          </div>

          {/* Local video */}
          {callType === 'video' && (
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
        </div>

        {/* Call controls */}
        <div className="absolute bottom-0 left-0 right-0 z-10 flex items-center justify-center gap-4 p-4 bg-gradient-to-t from-black/50 to-transparent">
          <button
            onClick={toggleMic}
            className={`p-3 rounded-full transition-colors ${
              localMicOn ? 'bg-gray-600 hover:bg-gray-700' : 'bg-red-500 hover:bg-red-600'
            }`}
          >
            {localMicOn ? (
              <Mic className="w-6 h-6 text-white" />
            ) : (
              <MicOff className="w-6 h-6 text-white" />
            )}
          </button>
          
          {callType === 'video' && (
            <button
              onClick={toggleVideo}
              className={`p-3 rounded-full transition-colors ${
                localVideoOn ? 'bg-gray-600 hover:bg-gray-700' : 'bg-red-500 hover:bg-red-600'
              }`}
            >
              {localVideoOn ? (
                <Camera className="w-6 h-6 text-white" />
              ) : (
                <CameraOff className="w-6 h-6 text-white" />
              )}
            </button>
          )}
          
          <button
            onClick={onClose}
            className="p-3 rounded-full bg-red-500 hover:bg-red-600 transition-colors"
          >
            <Phone className="w-6 h-6 text-white transform rotate-135" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CallModal;
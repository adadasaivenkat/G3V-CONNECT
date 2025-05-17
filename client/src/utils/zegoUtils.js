import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';

export const initializeZegoCall = async (appID, serverSecret, roomId, userId, userName) => {
  try {
    // Ensure appID is a number
    const numericAppID = typeof appID === 'string' ? parseInt(appID, 10) : appID;
    
    if (isNaN(numericAppID)) {
      throw new Error('Invalid ZEGO App ID: must be a number');
    }

    console.log('Initializing ZEGO call with:', {
      appID: numericAppID,
      roomId,
      userId,
      userName,
      serverSecret,
    });

    // Generate token
    const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
      numericAppID,
      serverSecret,
      roomId,
      userId,
      userName
    );

    console.log('Generated kitToken:', kitToken);

    if (!kitToken || typeof kitToken !== 'string') {
      throw new Error('Failed to generate ZEGO token');
    }

    // Create instance
    const zp = ZegoUIKitPrebuilt.create(kitToken);

    if (!zp) {
      throw new Error('Failed to create ZEGO instance');
    }

    return { zp, kitToken };
  } catch (error) {
    console.error('Error initializing ZEGO call:', error);
    throw error;
  }
};

export const joinZegoRoom = async (
  zp,
  container,
  config,
  callType,
  isMicOn,
  isVideoOn,
  targetUserName,
  onClose
) => {
  try {
    if (!zp) {
      throw new Error('ZEGO instance is not initialized');
    }

    if (!container) {
      throw new Error('Container element is not available');
    }

    const roomConfig = {
      container,
      scenario: {
        mode: ZegoUIKitPrebuilt.OneONoneCall,
        config: {
          role: ZegoUIKitPrebuilt.Host
        }
      },
      showPreJoinView: true,
      preJoinViewConfig: {
        title: `Calling ${targetUserName}...`,
        cancelButtonText: 'Cancel',
        confirmButtonText: 'Join'
      },
      turnOnMicrophoneWhenJoining: isMicOn,
      turnOnCameraWhenJoining: isVideoOn,
      showRoomDetailsButton: false,
      showRoomTimer: true,
      showMyCameraToggleButton: true,
      showMyMicrophoneToggleButton: true,
      showAudioVideoSettingsButton: true,
      showTextChat: false,
      showUserList: false,
      showScreenSharingButton: false,
      showPinButton: false,
      onLeaveRoom: () => {
        console.log('User left the room');
        onClose?.();
      },
      onError: (error) => {
        console.error('ZEGO room error:', error);
        onClose?.();
      }
    };

    await zp.joinRoom(roomConfig);
    console.log('Successfully joined ZEGO room');
  } catch (error) {
    console.error('Error joining ZEGO room:', error);
    throw error;
  }
};
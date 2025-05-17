import { Phone, Video } from 'lucide-react';
import { useAuth } from '../../context/AuthProvider';
import { socketService } from '../../services/socketService';

const ChatCont = () => {
  const { userData, selectedChat } = useAuth();

  const handleStartCall = (type) => {
    if (!selectedChat || !userData) {
      console.error('[ChatCont] Cannot initiate call: missing user data or selected chat');
      return;
    }

    if (!socketService.isConnected()) {
      console.error('[ChatCont] Cannot initiate call: socket not connected');
      return;
    }

    const callData = {
      type,
      from: userData._id,
      to: selectedChat._id,
      callerName: userData.displayName,
      timestamp: Date.now()
    };

    console.log('[ChatCont] Initiating call:', callData);
    socketService.emit('initiate_call', callData, (response) => {
      console.log('[ChatCont] Call initiation response:', response);
      if (!response) {
        console.error('[ChatCont] No response from server for call initiation');
        socketService.emit('initiate_call', callData);
      }
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-4">
          {/* ... existing user info ... */}
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleStartCall('voice')}
            className="p-2 text-gray-500 hover:text-blue-500 dark:text-gray-400 dark:hover:text-blue-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <Phone size={20} />
          </button>
          <button
            onClick={() => handleStartCall('video')}
            className="p-2 text-gray-500 hover:text-blue-500 dark:text-gray-400 dark:hover:text-blue-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <Video size={20} />
          </button>
        </div>
      </div>

      {/* ... existing chat content ... */}
    </div>
  );
};

export default ChatCont; 
import React, { useRef, useEffect } from 'react';
import MessageBubble from './MessageBubble';

const ChatArea = ({ 
  messages, 
  userId, 
  isPlaying, 
  handleAudioPlayPause, 
  formatTime, 
  setSelectedMedia, 
  audioRefs 
}) => {
  const chatEndRef = useRef(null);
  
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 h-[calc(100vh-180px)] overflow-y-auto px-4 py-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 custom-scrollbar">
      <div className="flex flex-col space-y-4 w-full">
        {messages.reduce((acc, message, index, array) => {
          const messageDate = new Date(message.timestamp);
          const prevMessage = array[index - 1];
          const prevMessageDate = prevMessage ? new Date(prevMessage.timestamp) : null;
          
          // Add date separator if needed
          if (!prevMessageDate || messageDate.toDateString() !== prevMessageDate.toDateString()) {
            acc.push(
              <div key={`date-${message.id}`} className="flex justify-center my-4">
                <span className="px-4 py-1.5 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm text-xs font-medium text-gray-500 dark:text-gray-400 shadow-sm border border-gray-200/50 dark:border-gray-700/50">
                  {messageDate.toDateString() === new Date().toDateString()
                    ? 'Today'
                    : messageDate.toDateString() === new Date(Date.now() - 86400000).toDateString()
                    ? 'Yesterday'
                    : messageDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>
            );
          }
          
          // Check if this message is consecutive (from same sender within 1 minute)
          const isConsecutive = prevMessage && 
            prevMessage.senderId === message.senderId && 
            (messageDate - new Date(prevMessage.timestamp)) < 60000;
          
          // Add message bubble
          acc.push(
            <div
              key={message.id}
              className={`flex ${message.senderId === userId ? 'justify-end' : 'justify-start'} ${isConsecutive ? 'mt-1' : 'mt-4'}`}
            >
              <MessageBubble
                message={message}
                userId={userId}
                isPlaying={isPlaying}
                handleAudioPlayPause={handleAudioPlayPause}
                formatTime={formatTime}
                setSelectedMedia={setSelectedMedia}
                audioRefs={audioRefs}
              />
            </div>
          );
          
          return acc;
        }, [])}
        <div ref={chatEndRef} />
      </div>
    </div>
  );
};

export default ChatArea; 
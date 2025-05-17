import React, { useRef, useState } from 'react';
import { Play, Pause, FileText } from 'lucide-react';

const MessageBubble = ({ 
  message, 
  userId, 
  isPlaying, 
  handleAudioPlayPause, 
  formatTime, 
  setSelectedMedia, 
  audioRefs 
}) => {
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  
  const onEnded = () => {
    setIsVideoPlaying(false);
  };

  const renderMessage = () => {
    switch (message.type) {
      case 'text':
        return (
          <div className="relative">
            <p className="text-[15px] leading-relaxed">{message.text}</p>
          </div>
        );
  
      case 'image':
      case 'gif':
        return message.file ? (
          <div className="relative group">
            <div onClick={() => setSelectedMedia(message)} className="cursor-pointer">
              <img 
                src={message.file} 
                alt={message.fileName || message.type} 
                className="w-full h-auto max-h-[300px] rounded-xl object-contain bg-black/5"
                loading="lazy"
              />
            </div>
          </div>
        ) : <p className="text-red-500 text-sm">Image not available</p>;
  
      case 'video':
        return message.file ? (
          <div className="relative group">
            <div onClick={() => setSelectedMedia(message)} className="cursor-pointer">
              <div className="relative rounded-xl overflow-hidden">
                <video 
                  controls
                  className="max-w-full sm:max-w-[300px] transition-transform duration-200 hover:scale-[0.98]"
                  preload="metadata"
                  onPlay={() => setIsVideoPlaying(true)}
                  onPause={() => setIsVideoPlaying(false)}
                  onEnded={onEnded}
                >
                  <source src={message.file} type="video/mp4" />
                </video>
              </div>
            </div>
          </div>
        ) : <p className="text-red-500 text-sm">Video not available</p>;
  
      case 'audio':
        return message.file ? (
          <div className="relative">
            <div className="flex items-center gap-3 bg-gray-100/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-xl p-3 max-w-[300px]">
              <button
                onClick={() => handleAudioPlayPause(message.id)}
                className="w-10 h-10 flex items-center justify-center bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 rounded-full text-white transition-colors"
              >
                {isPlaying[message.id] ? (
                  <Pause className="w-5 h-5" />
                ) : (
                  <Play className="w-5 h-5" />
                )}
              </button>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium">Voice Message</span>
                </div>
                <audio
                  ref={el => audioRefs.current[message.id] = el}
                  src={message.file}
                  onEnded={onEnded}
                  className="hidden"
                />
                <div className="w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-full">
                  <div className="h-full w-0 bg-blue-500 rounded-full transition-all duration-200" />
                </div>
              </div>
            </div>
          </div>
        ) : <p className="text-red-500 text-sm">Audio not available</p>;
  
      case 'document':
        return message.file ? (
          <div className="relative">
            <a
              href={getDocumentPreviewUrl(message.file)}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 bg-gray-100/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-xl p-4 max-w-[300px] hover:bg-gray-200/80 dark:hover:bg-gray-700/80 transition-colors"
            >
              <div className="w-12 h-12 flex items-center justify-center bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                <FileText className="w-6 h-6 text-blue-500 dark:text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{message.fileName}</p>
              </div>
            </a>
          </div>
        ) : <p className="text-red-500 text-sm">Document not available</p>;
  
      default:
        return null;
    }
  };

  // Helper functions
  const getDocumentPreviewUrl = (url) => {
    return url.replace('/upload/', '/upload/fl_attachment/');
  };

  const isSender = message.senderId === userId;

  return (
    <div className={`flex ${isSender ? 'justify-end' : 'justify-start'} w-full`}>
      <div className={`relative max-w-[70%] rounded-2xl px-4 py-2.5 ${
        isSender
          ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-br-none shadow-lg shadow-blue-500/20'
          : 'bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm text-gray-900 dark:text-white rounded-bl-none shadow-lg'
      }`}>
        {renderMessage()}
        <span className="text-[10px] opacity-75 mt-1 block text-right">
          {formatTime(message.timestamp)}
        </span>
      </div>
    </div>
  );
};

export default MessageBubble; 
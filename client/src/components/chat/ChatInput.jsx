import React from 'react';
import { Send, Smile, Paperclip, Mic, Square, Trash2, X } from 'lucide-react';

const ChatInput = ({
  newMessage,
  setNewMessage,
  isRecording,
  recordingDuration,
  recordingBlob,
  sendMessage,
  startRecording,
  stopRecording,
  cancelRecording,
  sendVoiceMessage,
  setShowEmojiPicker,
  setShowAttachMenu,
  setShowGifPicker,
  formatDuration,
  showEmojiPicker,
  showAttachMenu,
  replyingTo,
  setReplyingTo,
  isUploading,
  selectedChat,
  handleEmojiSelect,
  EmojiPickerComponent
}) => {
  return (
    <div className="relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg border-t border-gray-200/80 dark:border-gray-700/80">
      <form onSubmit={sendMessage} className="p-4">
        {replyingTo && (
          <div className="flex items-center gap-2 mb-3 p-2 rounded-lg bg-blue-50/80 dark:bg-blue-900/20 backdrop-blur-sm border-l-4 border-blue-500 animate-slideUp">
            <div className="flex-1">
              <p className="text-xs font-medium text-blue-500 dark:text-blue-400">
                Replying to {replyingTo.senderId === selectedChat._id ? 'yourself' : selectedChat.displayName}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
                {replyingTo.text || replyingTo.fileName}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setReplyingTo(null)}
              className="p-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-full transition-all duration-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        
        <div className="flex items-center gap-2 relative">
          <button
            type="button"
            onClick={() => {
              setShowEmojiPicker(!showEmojiPicker);
              setShowAttachMenu(false);
              setShowGifPicker(false);
            }}
            className="p-2.5 rounded-full hover:bg-yellow-50 dark:hover:bg-yellow-900/30 transition-all duration-200 hover:scale-105 group"
            id="emoji-btn"
          >
            <Smile className="w-6 h-6 text-yellow-600 dark:text-yellow-400 transition-transform group-hover:rotate-12" />
          </button>
          {showEmojiPicker && EmojiPickerComponent && (
            <div className="absolute bottom-14 left-0 z-50" style={{ minWidth: 320 }}>
              <EmojiPickerComponent 
                setShowEmojiPicker={setShowEmojiPicker} 
                handleEmojiSelect={handleEmojiSelect} 
              />
            </div>
          )}
          <button
            type="button"
            onClick={() => {
              setShowAttachMenu(!showAttachMenu);
              setShowEmojiPicker(false);
              setShowGifPicker(false);
            }}
            className="p-2.5 rounded-full hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-all duration-200 hover:scale-105 group"
          >
            <Paperclip className="w-6 h-6 text-purple-600 dark:text-purple-400 transition-transform group-hover:rotate-45" />
          </button>

          {isRecording ? (
            <div className="flex-1 flex items-center gap-3 bg-red-50/90 dark:bg-red-900/20 backdrop-blur-sm rounded-full px-4 py-2.5 animate-pulse">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
              <span className="text-sm font-medium text-red-600 dark:text-red-400 flex-1">
                Recording... {formatDuration(recordingDuration)}
              </span>
              <button
                type="button"
                onClick={stopRecording}
                className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-full transition-all duration-200 hover:scale-105"
              >
                <Square className="w-5 h-5" />
              </button>
            </div>
          ) : recordingBlob ? (
            <div className="flex-1 flex items-center gap-3 bg-gray-100/80 dark:bg-gray-700/80 backdrop-blur-sm rounded-full px-4 py-2">
              <button
                type="button"
                onClick={cancelRecording}
                className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-full transition-all duration-200 hover:scale-105"
              >
                <Trash2 className="w-5 h-5" />
              </button>
              <div className="flex-1">
                <audio controls src={URL.createObjectURL(recordingBlob)} className="w-full h-8" />
              </div>
              <button
                type="button"
                onClick={sendVoiceMessage}
                disabled={isUploading}
                className="p-2 text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded-full transition-all duration-200 hover:scale-105 disabled:opacity-50"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <>
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={replyingTo ? "Reply to message..." : "Type a message"}
                className="flex-1 px-4 py-2.5 bg-gray-100/80 dark:bg-gray-700/80 backdrop-blur-sm text-gray-900 dark:text-white rounded-full placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all duration-200"
              />
              {!newMessage.trim() ? (
                <button
                  type="button"
                  onMouseDown={startRecording}
                  onMouseUp={stopRecording}
                  onMouseLeave={stopRecording}
                  className="p-2.5 rounded-full hover:bg-red-50 dark:hover:bg-red-900/30 transition-all duration-200 hover:scale-105 group"
                >
                  <Mic className="w-6 h-6 text-red-500 dark:text-red-400 transition-transform group-hover:scale-110" />
                </button>
              ) : (
                <button
                  type="submit"
                  className="p-2.5 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white rounded-full transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg shadow-blue-500/25"
                >
                  <Send className="w-6 h-6" />
                </button>
              )}
            </>
          )}
        </div>
      </form>
    </div>
  );
};

export default ChatInput; 
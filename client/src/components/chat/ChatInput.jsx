import React, { useRef, useEffect } from "react";
import { Send, Smile, Paperclip, Mic, Square, Trash2, X } from "lucide-react";

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
  EmojiPickerComponent,
}) => {
  const textareaRef = useRef(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        120
      )}px`;
    }
  }, [newMessage]);

  return (
    <div className="sticky bottom-0 left-0 right-0 bg-white/95 dark:bg-gray-800/95 backdrop-blur-lg border-t border-gray-200/80 dark:border-gray-700/80 pb-safe">
      <form onSubmit={sendMessage} className="p-4">
        {replyingTo && (
          <div className="flex items-center gap-2 mb-3 p-2 rounded-lg bg-blue-50/80 dark:bg-blue-900/20 backdrop-blur-sm border-l-4 border-blue-500 animate-slideUp">
            <div className="flex-1">
              <p className="text-xs font-medium text-blue-500 dark:text-blue-400">
                Replying to{" "}
                {replyingTo.senderId === selectedChat._id
                  ? "yourself"
                  : selectedChat.displayName}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
                {replyingTo.text || replyingTo.fileName}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setReplyingTo(null)}
              className="p-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-full transition-all duration-200">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="flex items-end gap-2 relative">
          <button
            type="button"
            onClick={() => {
              setShowEmojiPicker(!showEmojiPicker);
              setShowAttachMenu(false);
              setShowGifPicker(false);
            }}
            className="p-2.5 rounded-full hover:bg-yellow-50 dark:hover:bg-yellow-900/30 transition-all duration-200">
            <Smile className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
          </button>
          {showEmojiPicker && EmojiPickerComponent && (
            <div
              className="absolute bottom-14 left-0 z-50"
              style={{ minWidth: 320 }}>
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
            className="p-2.5 rounded-full hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-all duration-200">
            <Paperclip className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </button>

          {isRecording ? (
            <div className="flex-1 flex items-center gap-3 bg-red-50/90 dark:bg-red-900/20 backdrop-blur-sm rounded-full px-4 py-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
              <span className="text-sm font-medium text-red-600 dark:text-red-400 flex-1">
                Recording... {formatDuration(recordingDuration)}
              </span>
              <button
                type="button"
                onClick={stopRecording}
                className="p-2 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-full">
                <Square className="w-5 h-5 text-red-500" />
              </button>
            </div>
          ) : recordingBlob ? (
            <div className="flex-1 flex items-center gap-3 bg-gray-100/80 dark:bg-gray-700/80 backdrop-blur-sm rounded-full px-4 py-2">
              <button
                type="button"
                onClick={cancelRecording}
                className="p-2 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-full">
                <Trash2 className="w-5 h-5 text-red-500" />
              </button>
              <div className="flex-1">
                <audio
                  controls
                  src={URL.createObjectURL(recordingBlob)}
                  className="w-full h-8"
                />
              </div>
              <button
                type="button"
                onClick={sendVoiceMessage}
                disabled={isUploading}
                className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded-full disabled:opacity-50">
                <Send className="w-5 h-5 text-blue-500" />
              </button>
            </div>
          ) : (
            <>
              <textarea
                ref={textareaRef}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={
                  replyingTo ? "Reply to message..." : "Type a message"
                }
                className="flex-1 px-4 py-2.5 bg-gray-100/80 dark:bg-gray-700/80 backdrop-blur-sm text-gray-900 dark:text-white rounded-2xl placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 resize-none max-h-[120px] min-h-[44px]"
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage(e);
                  }
                }}
              />
              {!newMessage.trim() ? (
                <button
                  type="button"
                  onTouchStart={startRecording}
                  onTouchEnd={stopRecording}
                  onMouseDown={startRecording}
                  onMouseUp={stopRecording}
                  onMouseLeave={stopRecording}
                  className="p-2.5 rounded-full hover:bg-red-50 dark:hover:bg-red-900/30 transition-all duration-200">
                  <Mic className="w-6 h-6 text-red-500 dark:text-red-400" />
                </button>
              ) : (
                <button
                  type="submit"
                  className="p-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-full transition-all duration-200">
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

import React from 'react';
import { Image, Film, FileText, Gift } from 'lucide-react';

const AttachmentMenu = ({ 
  setShowAttachMenu, 
  fileInputRef, 
  videoInputRef, 
  documentInputRef,
  setShowGifPicker 
}) => {
  return (
    <div className="fixed inset-0 z-10" onClick={() => setShowAttachMenu(false)}>
      <div 
        className="absolute bottom-20 left-4 sm:left-[15%] bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden w-[280px]"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-2 space-y-1">
          <button
            onClick={() => {
              fileInputRef.current?.click();
              setShowAttachMenu(false);
            }}
            className="flex items-center gap-3 w-full px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Image className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-gray-700 dark:text-gray-300">Photo</span>
          </button>
          <button
            onClick={() => {
              videoInputRef.current?.click();
              setShowAttachMenu(false);
            }}
            className="flex items-center gap-3 w-full px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Film className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
            <span className="text-gray-700 dark:text-gray-300">Video</span>
          </button>
          <button
            onClick={() => {
              documentInputRef.current?.click();
              setShowAttachMenu(false);
            }}
            className="flex items-center gap-3 w-full px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <FileText className="w-4 h-4 text-orange-600 dark:text-orange-400" />
            </div>
            <span className="text-gray-700 dark:text-gray-300">Document</span>
          </button>
          <button
            onClick={() => {
              setShowGifPicker(true);
              setShowAttachMenu(false);
            }}
            className="flex items-center gap-3 w-full px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center">
              <Gift className="w-4 h-4 text-pink-600 dark:text-pink-400" />
            </div>
            <span className="text-gray-700 dark:text-gray-300">GIF</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AttachmentMenu; 
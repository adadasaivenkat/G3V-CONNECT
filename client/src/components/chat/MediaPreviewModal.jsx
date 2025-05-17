import React from 'react';
import { X } from 'lucide-react';

const MediaPreviewModal = ({ selectedMedia, setSelectedMedia }) => {
  if (!selectedMedia) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/90 backdrop-blur-xl flex items-center justify-center z-50 p-4"
      onClick={() => setSelectedMedia(null)}
    >
      <button
        onClick={() => setSelectedMedia(null)}
        className="absolute top-4 right-4 p-2.5 text-white/80 hover:text-white bg-black/20 hover:bg-black/40 rounded-full transition-all"
      >
        <X className="w-6 h-6" />
      </button>
      <div className="max-w-4xl max-h-[90vh] overflow-hidden">
        {selectedMedia.type === 'image' || selectedMedia.type === 'gif' ? (
          <img 
            src={selectedMedia.file} 
            alt={selectedMedia.fileName || "Preview"} 
            className="w-auto max-w-full max-h-[90vh] rounded-lg shadow-2xl object-contain"
          />
        ) : (
          <video 
            controls 
            className="w-auto max-w-full max-h-[90vh] rounded-lg shadow-2xl"
            autoPlay
          >
            <source src={selectedMedia.file} type="video/mp4" />
          </video>
        )}
      </div>
    </div>
  );
};

export default MediaPreviewModal; 
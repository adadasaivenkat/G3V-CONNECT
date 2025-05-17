import React from 'react';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';

const EmojiPickerComponent = ({ setShowEmojiPicker, handleEmojiSelect }) => {
  return (
    <div className="fixed inset-0 z-10" onClick={() => setShowEmojiPicker(false)}>
      <div 
        className="absolute bottom-20 left-4 sm:left-[15%]"
        onClick={e => e.stopPropagation()}
      >
        <div className="shadow-2xl rounded-2xl overflow-hidden">
          <Picker 
            data={data} 
            onEmojiSelect={handleEmojiSelect}
            theme={document.documentElement.classList.contains('dark') ? 'dark' : 'light'}
            previewPosition="none"
            className="!border-0"
            perLine={8}
            skinTonePosition="none"
          />
        </div>
      </div>
    </div>
  );
};

export default EmojiPickerComponent; 
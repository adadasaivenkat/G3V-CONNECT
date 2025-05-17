import React from 'react';

const FileInputs = ({ fileInputRef, videoInputRef, documentInputRef, handleFileUpload }) => {
  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => handleFileUpload(e, 'image')}
        className="hidden"
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        onChange={(e) => handleFileUpload(e, 'video')}
        className="hidden"
      />
      <input
        ref={documentInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.txt"
        onChange={(e) => handleFileUpload(e, 'document')}
        className="hidden"
      />
    </>
  );
};

export default FileInputs; 
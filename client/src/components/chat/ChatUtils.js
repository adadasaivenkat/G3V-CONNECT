// Format date and time
export const formatTime = (date) => {
  const messageDate = new Date(date);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (messageDate.toDateString() === today.toDateString()) {
    return messageDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  } else if (messageDate.toDateString() === yesterday.toDateString()) {
    return 'Yesterday ' + messageDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  } else {
    return messageDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    }) + ' ' + messageDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }
};

// Format file size for display
export const formatFileSize = (size) => {
  return `${Math.round(size)} MB`;
};

// Format recording duration
export const formatDuration = (ms) => {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

// Transform document URL for preview
export const getDocumentPreviewUrl = (url) => {
  return url.replace('/upload/', '/upload/fl_attachment/');
}; 
import { useEffect, useRef } from 'react';

/**
 * Component to handle message fetching from MongoDB
 * This component doesn't render anything, it just handles the side effects
 */
const MessageFetchEffect = ({ 
  selectedChat, 
  userId, 
  backendUrl, 
  setMessages,
  messages
}) => {
  const isInitialMount = useRef(true);
  const lastFetchTime = useRef(null);
  const isMounted = useRef(true);
  const lastMessageId = useRef(null);

  // Fetch messages from MongoDB when selectedChat changes
  useEffect(() => {
    isMounted.current = true;
    const currentTime = Date.now();

    // Prevent multiple fetches within 1 second
    if (lastFetchTime.current && currentTime - lastFetchTime.current < 1000) {
      return;
    }

    const fetchMessages = async () => {
      if (!selectedChat || !userId) return;
      
      try {
        // Only clear messages if there are no messages yet
        if (messages.length === 0 && isMounted.current) {
          setMessages([]);
        }

        const response = await fetch(
          `${backendUrl}/api/messages?from=${userId}&to=${selectedChat._id}`
        );
        
        if (response.ok && isMounted.current) {
          const data = await response.json();
          if (data.messages && Array.isArray(data.messages)) {
            // Sort messages by timestamp
            const sortedMessages = data.messages.sort((a, b) => 
              new Date(a.timestamp) - new Date(b.timestamp)
            );

            // Only update if we have new messages or if this is the initial mount
            if (isMounted.current && (isInitialMount.current || sortedMessages.length > messages.length)) {
              // Check if the latest message is different from what we have
              const latestMessage = sortedMessages[sortedMessages.length - 1];
              if (latestMessage && latestMessage.id !== lastMessageId.current) {
                setMessages(sortedMessages);
                lastMessageId.current = latestMessage.id;
              }
            }
          }
        } else {
          console.error('Failed to fetch messages:', await response.text());
        }
      } catch (error) {
        console.error('Error fetching messages:', error);
      }
    };

    // Only fetch if this is the initial mount or if selectedChat changed
    if (isInitialMount.current || selectedChat?._id) {
      fetchMessages();
      lastFetchTime.current = currentTime;
    }

    isInitialMount.current = false;

    return () => {
      isMounted.current = false;
      // Don't clear messages on unmount to preserve real-time updates
    };
  }, [selectedChat?._id, userId, backendUrl, setMessages, messages]);
  
  return null; // This component doesn't render anything
};

export default MessageFetchEffect; 
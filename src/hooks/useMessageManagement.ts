import { useState, useEffect, useRef } from 'react';
import { flushSync } from 'react-dom';
import { useSearchParams } from 'next/navigation';
import { messageAPI, Message, Chat } from '@/api/message';
import socketManager from '@/utils/socket';
import { requestChatCache } from '@/utils/requestChatCache';
import { refreshUnreadCounts } from '@/hooks/useUnreadCounts';
import { messageQueue } from '@/utils/messageQueue';
import { deletedMessagesCache } from '@/utils/deletedMessagesCache';

interface UseMessageManagementProps {
  selectedChat: string | null;
  user: any;
  setChats: React.Dispatch<React.SetStateAction<Chat[]>>;
  messageRequests?: Chat[];
  viewedRequests?: Set<string>;
  markRequestAsViewed?: (chatId: string) => void;
  refreshChatsWithAccurateUnreadCounts?: () => Promise<void>;
  markChatAsRead?: (chatId: string) => void;
}

// Extended Message type for optimistic updates
interface OptimisticMessage extends Message {
  _tempId?: string;
  _sending?: boolean;
  _failed?: boolean;
  _retryCount?: number;
}

// Message queue item
interface QueuedMessage {
  tempId: string;
  text: string;
  chatId: string;
  retryCount: number;
}

export const useMessageManagement = ({ selectedChat, user, setChats, messageRequests, viewedRequests, markRequestAsViewed, refreshChatsWithAccurateUnreadCounts, markChatAsRead }: UseMessageManagementProps) => {
  const [messages, setMessages] = useState<OptimisticMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Debug messages state changes
  const originalSetMessages = setMessages;
  const debugSetMessages = (newMessages: OptimisticMessage[] | ((prev: OptimisticMessage[]) => OptimisticMessage[])) => {
    if (typeof newMessages === 'function') {
      originalSetMessages(prev => {
        const result = newMessages(prev);
        //console.log('Messages state updated (function):', result.length, 'previous:', prev.length);
        return result;
      });
    } else {
      //console.log('Messages state updated (direct):', newMessages.length, 'messages');
      originalSetMessages(newMessages);
    }
  };
  // Override setMessages with debug version
  const setMessagesWithDebug = debugSetMessages;
  const [sendingMessage, setSendingMessage] = useState(false);
  const [isRequestChat, setIsRequestChat] = useState(false); // Track if this is a request chat
  const [newMessage, setNewMessage] = useState("");
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map());
  const [showContextMenu, setShowContextMenu] = useState<{messageId: string, x: number, y: number, timestamp?: string} | null>(null);

  // Message queue for handling rapid sends
  const messageQueueRef = useRef<QueuedMessage[]>([]);
  const isProcessingQueueRef = useRef(false);
  
  const searchParams = useSearchParams();
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLInputElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Typing indicators
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  // Track the current chat to prevent race conditions
  const currentChatRef = useRef<string | null>(null);

  // Track if user is near bottom of messages
  const isNearBottomRef = useRef(true);
  const previousMessagesLengthRef = useRef(0);
  const hasScrolledForCurrentChatRef = useRef(false);
  const lastChatIdRef = useRef<string | null>(null);

  // Scroll to bottom when new messages arrive.
  // Uses scrollTop for instant scroll during send (avoids conflict with keyboard animation)
  // and scrollIntoView with smooth behavior for incoming messages.
  const scrollToBottom = (force = false, instant = false) => {
    const shouldScroll = force || isNearBottomRef.current;
    if (!shouldScroll) return;

    const container = messagesContainerRef.current;
    if (instant && container) {
      // Instant scroll: set scrollTop directly - no animation conflict with keyboard
      container.scrollTop = container.scrollHeight;
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Helper to apply stored deleted state to messages
  // This ensures deleted messages stay deleted even after refetch
  // Uses the shared deletedMessagesCache utility
  const applyDeletedState = (msgs: Message[]): OptimisticMessage[] => {
    return deletedMessagesCache.applyToMessages(msgs);
  };

  // Keep a ref for messageRequests so the message-loading effect only
  // re-runs when selectedChat changes, not on every request-list update.
  const messageRequestsRef = useRef(messageRequests);
  useEffect(() => {
    messageRequestsRef.current = messageRequests;
  }, [messageRequests]);

  /**
   * Set messages from server response while preserving any in-flight
   * optimistic messages. Without this, a re-fetch triggered by a socket
   * event would wipe out optimistic messages the server hasn't saved yet,
   * causing them to "disappear" until the API response arrives.
   */
  const setServerMessages = (serverMessages: OptimisticMessage[]) => {
    setMessagesWithDebug(prev => {
      // Collect optimistic messages still being sent or recently failed
      const pendingOptimistic = prev.filter(msg => {
        const opt = msg as OptimisticMessage;
        return opt._tempId && (opt._sending || opt._failed);
      });

      if (pendingOptimistic.length === 0) {
        return serverMessages;
      }

      // Build a set of server message IDs for fast lookup
      const serverIds = new Set(serverMessages.map(m => m._id));

      // Keep optimistic messages whose real counterpart hasn't arrived yet
      const stillPending = pendingOptimistic.filter(m => !serverIds.has(m._id));

      if (stillPending.length === 0) {
        return serverMessages;
      }

      return [...serverMessages, ...stillPending];
    });
  };

  // Track scroll position to determine if user is near bottom
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) {
      return;
    }

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      const isNearBottom = distanceFromBottom < 100;
      isNearBottomRef.current = isNearBottom;
    };

    // Initial check
    handleScroll();

    container.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [selectedChat]); // Re-attach when chat changes

  useEffect(() => {
    // Check if chat has changed
    const chatHasChanged = selectedChat !== lastChatIdRef.current;

    // Reset refs only when chat changes
    if (chatHasChanged) {
      lastChatIdRef.current = selectedChat;
      previousMessagesLengthRef.current = 0;
      hasScrolledForCurrentChatRef.current = false;
      isNearBottomRef.current = true;
    }

    // Only auto-scroll when:
    // 1. User is near the bottom (has isNearBottomRef = true)
    // 2. OR it's the first load (previousMessagesLengthRef = 0)
    const isFirstLoad = previousMessagesLengthRef.current === 0 && messages.length > 0 && !hasScrolledForCurrentChatRef.current;
    const hasNewMessages = messages.length > previousMessagesLengthRef.current;

    // Only scroll if there are actually NEW messages (count increased), not just updates
    if (isFirstLoad) {
      // Force instant scroll on first load (only once per chat)
      scrollToBottom(true, true);
      previousMessagesLengthRef.current = messages.length;
      hasScrolledForCurrentChatRef.current = true;
    } else if (hasNewMessages) {
      // New message arrived, smooth scroll if user is near bottom
      scrollToBottom(false, false);
      previousMessagesLengthRef.current = messages.length;
    }

    // Note: We don't mark messages as read here anymore
    // The Intersection Observer handles marking messages as seen when they come into view
  }, [messages, selectedChat]);

  // Handle prefill message event
  useEffect(() => {
    const handlePrefillMessage = (event: CustomEvent) => {
      const { message } = event.detail;
      if (message && selectedChat) {
        setNewMessage(message);
        // Focus the input field
        setTimeout(() => {
          messageInputRef.current?.focus();
        }, 100);
      }
    };

    window.addEventListener('prefillMessage', handlePrefillMessage as EventListener);
    return () => {
      window.removeEventListener('prefillMessage', handlePrefillMessage as EventListener);
    };
  }, [selectedChat]);

  // Load messages when chat is selected
  useEffect(() => {
    const loadMessages = async () => {
      if (!selectedChat) {
        setMessagesWithDebug([]);
        setLoadingMessages(false);
        currentChatRef.current = null;
        return;
      }

      // Update current chat ref and set loading state
      const chatId = selectedChat;
      currentChatRef.current = chatId;
      setLoadingMessages(true);

      // Note: Scroll tracking reset is handled in the messages effect
      // to ensure it only resets once per chat change

      // Don't clear messages immediately - let them show during loading
      // This prevents the blank screen flicker

      try {
        // Check if this selected chat is in the messageRequests array (faster than API call)
        // Use ref to avoid re-running this entire effect when messageRequests changes.
        const isRequestChatFromState = messageRequestsRef.current?.some(req => req._id === chatId);
        const hasBeenViewed = viewedRequests?.has(chatId) || false;

        if (isRequestChatFromState) {
          //console.log('Detected request chat from state:', chatId);

          // Mark this as a request chat so we can disable messaging
          setIsRequestChat(true);

          // Try to load messages directly using the chat ID - no temporary acceptance needed
          //console.log('Loading messages directly for request chat:', chatId);
          try {
            const response = await messageAPI.getChatMessages(chatId);

            // Only update if we're still on the same chat
            if (currentChatRef.current !== chatId) return;

            //console.log('Messages loaded for request chat:', chatId, 'Count:', response.messages?.length || 0);

            if (response.messages && response.messages.length > 0) {
              setServerMessages(applyDeletedState(response.messages));
              setLoadingMessages(false);
              //console.log('Successfully loaded', response.messages.length, 'messages for request chat');
            } else {
              //console.log('No messages returned for request chat, checking cached messages and lastMessage');

              // First, check if we have cached messages for this request chat
              const cachedMessages = requestChatCache.getMessages(chatId);
              const requestChat = messageRequestsRef.current?.find(req => req._id === chatId);

              if (cachedMessages.length > 0) {
                //console.log('Found', cachedMessages.length, 'cached messages for request chat');
                if (currentChatRef.current === chatId) {
                  setServerMessages(applyDeletedState(cachedMessages));
                  setLoadingMessages(false);
                }
              } else if (requestChat && requestChat.lastMessage && requestChat.lastMessage.message) {
                //console.log('No cached messages, caching and displaying lastMessage');

                // Cache the lastMessage using the utility function
                requestChatCache.addLastMessage(
                  chatId,
                  requestChat.lastMessage,
                  requestChat.participants
                );

                // Now get the cached messages (which should include the lastMessage we just cached)
                const updatedCachedMessages = requestChatCache.getMessages(chatId);
                if (currentChatRef.current === chatId) {
                  setServerMessages(applyDeletedState(updatedCachedMessages));
                  setLoadingMessages(false);
                }
                //console.log('Cached and displaying lastMessage, total messages:', updatedCachedMessages.length);
              } else {
                if (currentChatRef.current === chatId) {
                  setMessagesWithDebug([]);
                  setLoadingMessages(false);
                }
              }
            }

            // Mark this request as viewed for UI purposes
            markRequestAsViewed?.(chatId);
            
          } catch (error: any) {
            console.error('Failed to load request messages:', error);
            
            // For automated contact info messages, the sender can see them even if receiver can't initially
            // Check if the current user is the sender (creator) of this chat
            const requestChat = messageRequestsRef.current?.find(req => req._id === chatId);
            if (requestChat && requestChat.createdBy && requestChat.createdBy._id === user?._id) {
              //console.log('Current user is the sender of this request chat, trying regular message loading...');
              try {
                // Try loading as a regular chat since sender should always see their messages
                const regularResponse = await messageAPI.getChatMessages(chatId);

                // Only update if we're still on the same chat
                if (currentChatRef.current !== chatId) return;

                //console.log('Messages loaded as regular chat for sender:', regularResponse.messages.length);
                setServerMessages(applyDeletedState(regularResponse.messages || []));
                setLoadingMessages(false);
                setIsRequestChat(false); // Allow sender to continue messaging
              } catch (regularError) {
                console.error('Failed to load messages even as sender:', regularError);
                if (currentChatRef.current === chatId) {
                  setMessagesWithDebug([]);
                  setLoadingMessages(false);
                }
              }
            } else {
              // This is a true request chat where receiver can't see messages yet
              //console.log('Receiver cannot see messages until acceptance - showing empty state');
              if (currentChatRef.current === chatId) {
                setMessagesWithDebug([]);
                setLoadingMessages(false);
              }
            }
          }
        } else {
          // This chat is NOT in messageRequests, so it's an active chat
          // The user should always be able to send messages in active chats
          setIsRequestChat(false);
          

          const response = await messageAPI.getChatMessages(chatId);

          // Only update if we're still on the same chat
          if (currentChatRef.current !== chatId) return;

          //console.log('Loaded messages for regular chat:', chatId, 'count:', response.messages.length);

          setServerMessages(applyDeletedState(response.messages));
          setLoadingMessages(false);
        }

        // Only proceed with socket and read marking if still on same chat
        if (currentChatRef.current !== chatId) return;

        socketManager.joinChat(chatId);

        // Mark messages as read (skip for request chats as they'll handle this after acceptance)
        if (!isRequestChatFromState) {
          try {
            await messageAPI.markAllMessagesRead(chatId);
            // Refresh unread counts immediately after marking messages as read
            setTimeout(() => refreshUnreadCounts(), 100);
            // Refresh again after a delay to ensure backend has updated
            setTimeout(() => refreshUnreadCounts(), 500);
            setTimeout(() => refreshUnreadCounts(), 1000);
            // Refresh chats with accurate unread counts from server
            if (refreshChatsWithAccurateUnreadCounts) {
              setTimeout(() => refreshChatsWithAccurateUnreadCounts(), 1000);
            }
          } catch (error) {
            console.error('Failed to mark messages as read:', error);
          }
        }

        // Always update local chat unread count to 0 when opening a chat
        setChats(prev => prev.map(chat =>
          chat._id === chatId
            ? { ...chat, unreadCount: 0 }
            : chat
        ));

        // Mark this chat as read to persist the unreadCount: 0 across refreshes
        if (markChatAsRead) {
          markChatAsRead(chatId);
        }
      } catch (error) {
        console.error('Failed to load messages:', error);
        setLoadingMessages(false);
      }
    };

    loadMessages();

    return () => {
      if (selectedChat) {
        stopTypingIndicator();
        socketManager.leaveChat(selectedChat);
        // Clear pending messages queue when leaving chat
        messageQueue.clearChat(selectedChat);
      }
    };
  // IMPORTANT: Only depend on selectedChat. messageRequests is read via
  // messageRequestsRef to avoid re-running (and re-fetching all messages)
  // every time the request list changes. That re-fetch was wiping out
  // optimistic messages that the server hadn't saved yet, causing the
  // "message disappears then reappears" bug.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChat]);

  // Intersection Observer to mark messages as seen when they come into view
  useEffect(() => {
    if (!messagesContainerRef.current || !user) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const messageId = entry.target.getAttribute('data-message-id');
            if (messageId) {
              markMessageAsSeen(messageId);
            }
          }
        });
      },
      {
        root: messagesContainerRef.current,
        threshold: 0.8,
      }
    );

    const messageElements = messagesContainerRef.current.querySelectorAll('[data-message-id]');
    messageElements.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
    };
  }, [messages, user]);

  // Send message function
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMessage.trim() || !selectedChat) return;

    // Prevent sending messages if this is a request chat
    if (isRequestChat) {
      //console.log('Cannot send message - this is a request chat. User must accept first.');
      return;
    }

    const messageText = newMessage.trim();
    const tempId = `temp-${Date.now()}-${Math.random()}`;

    // Create optimistic message
    const optimisticMessage: OptimisticMessage = {
      _id: tempId,
      _tempId: tempId,
      _sending: true,
      message: messageText,
      sender: {
        _id: user._id,
        username: user.username,
        fullName: user.fullName,
        profileImageUrl: user.profileImageUrl
      },
      chatId: selectedChat,
      timestamp: new Date().toISOString(),
      readBy: [user._id],
      messageType: 'text',
      isDeleted: false,
      reactions: []
    };

    // Add to pending messages queue for FIFO matching
    messageQueue.add(tempId, selectedChat, messageText);

    // Use flushSync to immediately render the optimistic message before the API call
    // This ensures the message appears instantly on screen
    flushSync(() => {
      setMessagesWithDebug(prev => [...prev, optimisticMessage]);
      setNewMessage("");
    });

    // Stop typing indicator in background
    stopTypingIndicator();

    // Instant scroll after optimistic message is flushed to DOM.
    // Using instant (non-smooth) scroll here avoids conflict with
    // mobile keyboard animation and prevents the "message appears
    // below keyboard then jumps up" effect.
    scrollToBottom(true, true);

    try {
      // Send the message - API returns the created message directly
      const sentMessage = await messageAPI.sendMessage(selectedChat, messageText);

      // Remove from pending queue. If the socket `new_message` handler
      // already dequeued it, this is a no-op (returns false).
      messageQueue.remove(tempId);

      // Update the optimistic message with real server data.
      // Use functional update so this works correctly even if the socket
      // handler has already replaced the optimistic message (the _tempId
      // match would simply find nothing, and the direct _id check
      // prevents adding a duplicate).
      setMessagesWithDebug(prev => {
        // If the socket handler already replaced this message (matched
        // by server _id), don't add a duplicate.
        const alreadyHasServerId = prev.some(msg => msg._id === sentMessage._id);
        if (alreadyHasServerId) {
          // Just make sure the _sending flag is cleared
          return prev.map(msg =>
            msg._id === sentMessage._id
              ? { ...msg, _sending: false, _failed: false }
              : msg
          );
        }

        // Otherwise replace the optimistic message by _tempId
        return prev.map(msg =>
          msg._tempId === tempId
            ? {
                ...sentMessage,
                _tempId: tempId, // Keep tempId for React key stability
                _sending: false,
                _failed: false
              }
            : msg
        );
      });

    } catch (error) {
      console.error('Failed to send message:', error);

      // Remove from queue on failure so socket handler doesn't try to match
      messageQueue.remove(tempId);

      // Mark message as failed only if API call fails
      setMessagesWithDebug(prev => prev.map(msg =>
        msg._tempId === tempId ? { ...msg, _sending: false, _failed: true } : msg
      ));
    }
  };

  // Mark unread messages as seen
  const markUnreadMessagesAsSeen = async (messagesToCheck: Message[]) => {
    if (!user || !selectedChat) return;

    const unreadMessages = messagesToCheck.filter(msg =>
      msg.sender._id !== user._id && !msg.readBy.includes(user._id)
    );

    if (unreadMessages.length > 0) {
      const unreadMessageIds = unreadMessages.map(msg => msg._id);
      try {
        await messageAPI.markMessagesRead(selectedChat, unreadMessageIds);
        setMessagesWithDebug(prev => prev.map(msg =>
          unreadMessageIds.includes(msg._id)
            ? { ...msg, readBy: [...msg.readBy, user._id] }
            : msg
        ));
        // Refresh unread counts after marking messages as read with multiple retries
        setTimeout(() => refreshUnreadCounts(), 100);
        setTimeout(() => refreshUnreadCounts(), 500);
      } catch (error) {
        console.error('Failed to mark messages as read:', error);
      }
    }
  };

  // Mark messages as seen when they come into view
  const markMessageAsSeen = async (messageId: string) => {
    if (!user || !selectedChat) return;

    const message = messages.find(msg => msg._id === messageId);
    if (!message || message.sender._id === user._id || message.readBy.includes(user._id)) {
      return;
    }

    try {
      await messageAPI.markMessagesRead(selectedChat, [messageId]);
      setMessagesWithDebug(prev => prev.map(msg =>
        msg._id === messageId
          ? { ...msg, readBy: [...msg.readBy, user._id] }
          : msg
      ));
      // Refresh unread counts after marking message as read with retries
      setTimeout(() => refreshUnreadCounts(), 100);
      setTimeout(() => refreshUnreadCounts(), 500);
    } catch (error) {
      console.error('Failed to mark message as read:', error);
    }
  };

  // Handle message deletion
  const handleDeleteMessage = async (messageId: string, deleteType: 'for_everyone' | 'for_me') => {
    if (!selectedChat) return;

    // Show confirmation for delete for everyone
    if (deleteType === 'for_everyone') {
      if (!window.confirm('Are you sure you want to delete this message for everyone?')) return;
    }

    // Close context menu immediately
    setShowContextMenu(null);

    // Optimistic update - update UI immediately before API call
    if (deleteType === 'for_everyone') {
      // Store the deleted state to persist across refetches (uses shared cache)
      const deletedAt = new Date().toISOString();
      deletedMessagesCache.markDeleted(messageId, deletedAt);

      // Mark message as deleted for everyone (show "You deleted this message")
      // Don't modify the message text - MessageItem will show the deleted UI based on the flag
      setMessagesWithDebug(prev => prev.map(msg =>
        msg._id === messageId
          ? { ...msg, deletedForEveryone: true, deletedForEveryoneAt: deletedAt }
          : msg
      ));
    } else {
      // Remove message from UI for "delete for me"
      setMessagesWithDebug(prev => prev.filter(msg => msg._id !== messageId));
    }

    try {
      if (deleteType === 'for_everyone') {
        await messageAPI.deleteMessageForEveryone(selectedChat, messageId);
      } else {
        await messageAPI.deleteMessageForMe(selectedChat, messageId);
      }
    } catch (error: any) {
      console.error('Failed to delete message:', error);

      // Revert optimistic update on error
      if (deleteType === 'for_everyone') {
        // Remove from the stored deleted messages (uses shared cache)
        deletedMessagesCache.removeDeleted(messageId);

        // Revert the deletedForEveryone flag
        setMessagesWithDebug(prev => prev.map(msg =>
          msg._id === messageId
            ? { ...msg, deletedForEveryone: false, deletedForEveryoneAt: undefined }
            : msg
        ));
      }
      // Note: For "delete for me", we'd need to store the original message to revert
      // For now, user will need to refresh to see the message again if API fails

      if (error.response?.status === 400 && error.response?.data?.message?.includes('24 hours')) {
        alert('Cannot delete messages older than 24 hours for everyone. Use "Delete for Me" instead.');
      } else {
        alert('Failed to delete message. Please try again.');
      }
    }
  };

  // Handle typing indicators with API calls
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    
    if (selectedChat) {
      if (!isTypingRef.current) {
        isTypingRef.current = true;
        messageAPI.startTyping(selectedChat).catch(console.error);
        socketManager.startTyping(selectedChat);
      }
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      typingTimeoutRef.current = setTimeout(async () => {
        if (isTypingRef.current) {
          isTypingRef.current = false;
          try {
            await messageAPI.stopTyping(selectedChat);
            socketManager.stopTyping(selectedChat);
          } catch (error) {
            console.error('Error stopping typing:', error);
          }
        }
      }, 3000);
    }
  };

  // Stop typing when user sends message or leaves chat
  const stopTypingIndicator = async () => {
    if (selectedChat && isTypingRef.current) {
      isTypingRef.current = false;
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      try {
        await messageAPI.stopTyping(selectedChat);
        socketManager.stopTyping(selectedChat);
      } catch (error) {
        console.error('Error stopping typing:', error);
      }
    }
  };

  // Retry failed message
  const retryMessage = async (tempId: string) => {
    const failedMessage = messages.find(msg => msg._tempId === tempId);
    if (!failedMessage || !selectedChat) return;

    // Add back to pending messages queue for FIFO matching
    messageQueue.add(tempId, selectedChat, failedMessage.message);

    // Mark as sending again with immediate render
    flushSync(() => {
      setMessagesWithDebug(prev =>
        prev.map(msg =>
          msg._tempId === tempId
            ? { ...msg, _sending: true, _failed: false }
            : msg
        )
      );
    });

    try {
      // Send the message - let socket handle the confirmation
      await messageAPI.sendMessage(selectedChat, failedMessage.message);

      // Socket will handle updating the message when 'new_message' event arrives
      // This ensures consistency with the normal send flow

    } catch (error) {
      console.error('Failed to retry message:', error);

      // Remove from queue on failure
      messageQueue.remove(tempId);

      // Mark as failed again only if API call fails
      setMessagesWithDebug(prev =>
        prev.map(msg =>
          msg._tempId === tempId
            ? { ...msg, _sending: false, _failed: true }
            : msg
        )
      );
    }
  };

  // Cleanup stale optimistic messages and message queue
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      // Clean up stale messages from the queue
      messageQueue.cleanup();

      setMessagesWithDebug(prev => {
        const now = Date.now();
        const cleaned = prev.map(msg => {
          const optimisticMsg = msg as any;
          // If message has been sending for more than 60 seconds, mark it as failed
          if (optimisticMsg._tempId && optimisticMsg._sending) {
            const messageAge = now - new Date(msg.timestamp).getTime();
            if (messageAge > 60000) {
              console.warn('Message stuck in sending state for >60s, marking as failed:', msg.message);
              // Also remove from queue
              messageQueue.remove(optimisticMsg._tempId);
              return { ...msg, _sending: false, _failed: true };
            }
          }
          return msg;
        });

        // Only update state if we actually made changes
        const hasChanges = cleaned.some((msg, idx) => {
          const optimisticMsg = msg as any;
          const prevMsg = prev[idx] as any;
          return optimisticMsg._failed !== prevMsg._failed || optimisticMsg._sending !== prevMsg._sending;
        });

        return hasChanges ? cleaned : prev;
      });
    }, 10000); // Check every 10 seconds

    return () => clearInterval(cleanupInterval);
  }, []);

  // Cleanup typing indicators on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      stopTypingIndicator();
    };
  }, []);

  // Note: Socket listeners for message deletion are handled in useSocket.ts
  // to avoid duplicate event handlers

  return {
    // State
    messages,
    setMessages: setMessagesWithDebug,
    sendingMessage,
    newMessage,
    setNewMessage,
    typingUsers,
    setTypingUsers,
    showContextMenu,
    setShowContextMenu,
    isRequestChat,
    loadingMessages,

    // Refs
    messagesEndRef,
    messageInputRef,
    messagesContainerRef,

    // Functions
    handleSendMessage,
    handleDeleteMessage,
    handleInputChange,
    scrollToBottom,
    markUnreadMessagesAsSeen,
    stopTypingIndicator,
    retryMessage
  };
};
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/store/useUserStore';
import { messageAPI, Chat, Message } from '@/api/message';
import socketManager from '@/utils/socket';
import { requestChatCache } from '@/utils/requestChatCache';
import { refreshUnreadCounts } from '@/hooks/useUnreadCounts';

// Extended Message type for optimistic updates
interface OptimisticMessage extends Message {
  _sending?: boolean;
}

interface UseSocketProps {
  selectedChat: string | null;
  user: any;
  chats: Chat[];
  messageRequests: Chat[];
  setChats: React.Dispatch<React.SetStateAction<Chat[]>>;
  setMessageRequests: React.Dispatch<React.SetStateAction<Chat[]>>;
  setAllChatsCache: React.Dispatch<React.SetStateAction<Chat[]>>;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  setTypingUsers: React.Dispatch<React.SetStateAction<Map<string, string>>>;
  scrollToBottom: () => void;
  isIncomingRequest: (chat: Chat, currentUserId: string) => boolean;
}

export const useSocket = ({
  selectedChat,
  user,
  chats,
  messageRequests,
  setChats,
  setMessageRequests,
  setAllChatsCache,
  setMessages,
  setTypingUsers,
  scrollToBottom,
  isIncomingRequest
}: UseSocketProps) => {
  const router = useRouter();
  const selectedChatRef = useRef<string | null>(null);
  const chatsRef = useRef<Chat[]>([]);
  const messageRequestsRef = useRef<Chat[]>([]);
  const processedMessageIds = useRef<Set<string>>(new Set());

  // Create refs for functions that might change to prevent re-registering handlers
  const scrollToBottomRef = useRef(scrollToBottom);
  const isIncomingRequestRef = useRef(isIncomingRequest);

  // Update refs when values change
  useEffect(() => {
    selectedChatRef.current = selectedChat;
  }, [selectedChat]);

  useEffect(() => {
    chatsRef.current = chats;
  }, [chats]);

  useEffect(() => {
    messageRequestsRef.current = messageRequests;
  }, [messageRequests]);

  useEffect(() => {
    scrollToBottomRef.current = scrollToBottom;
  }, [scrollToBottom]);

  useEffect(() => {
    isIncomingRequestRef.current = isIncomingRequest;
  }, [isIncomingRequest]);

  // Initialize socket connection
  useEffect(() => {
    const { validateAndGetToken, logout } = useUserStore.getState();
    const validToken = validateAndGetToken();
    
    if (validToken) {
      socketManager.connect(validToken);
    } else {
      // console.warn('No valid token for socket connection');
    }

    const handleAuthFailure = (data: any) => {
      // console.error('Permanent authentication failure:', data.message);
      alert('Your session has expired. Please log in again.');
      logout();
      router.push('/signin');
    };

    const handleConnectionFailure = (data: any) => {
      // console.error('Permanent connection failure:', data.message);
    };

    socketManager.on('auth_failure_permanent', handleAuthFailure);
    socketManager.on('connection_failed_permanent', handleConnectionFailure);

    return () => {
      socketManager.off('auth_failure_permanent', handleAuthFailure);
      socketManager.off('connection_failed_permanent', handleConnectionFailure);
      // DO NOT disconnect socket on cleanup - it should persist across component remounts
      // Socket will be disconnected when user logs out via logout() function
    };
  }, [router]);

  // Socket event handlers
  useEffect(() => {
    const handleNewMessage = (data: { chatId: string; message: Message; unreadCount?: number }) => {
      // Deduplicate: Check if we've already processed this message FIRST
      const messageKey = `${data.chatId}-${data.message._id}`;

      console.log('📨 Socket new_message received:', {
        chatId: data.chatId,
        messageId: data.message._id,
        messageKey: messageKey,
        alreadyProcessed: processedMessageIds.current.has(messageKey),
        processedCount: processedMessageIds.current.size
      });

      if (processedMessageIds.current.has(messageKey)) {
        console.log('⚠️ DUPLICATE MESSAGE DETECTED - SKIPPING:', messageKey);
        return;
      }

      console.log('✅ New message, processing:', messageKey);
      processedMessageIds.current.add(messageKey);

      // Clean up old message IDs to prevent memory leak (keep last 1000)
      if (processedMessageIds.current.size > 1000) {
        const idsArray = Array.from(processedMessageIds.current);
        processedMessageIds.current = new Set(idsArray.slice(-1000));
      }

      const chatInRegular = chats.find(c => c._id === data.chatId);
      const chatInRequests = messageRequests.find(r => r._id === data.chatId);
      const chat = chatInRegular || chatInRequests;
      
      if (!chat) {
        // //console.log('New message from unknown chat, reloading chats...');
        if (user) {
          Promise.all([
            messageAPI.getActiveChats(),
            messageAPI.getMessageRequests()
          ]).then(([activeChatsResponse, requestsResponse]) => {
            // Filter out declined chats
            const sortedActiveChats = activeChatsResponse.chats
              .filter(chat => chat.status !== 'declined')
              .sort((a, b) =>
                new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
              );

            const filteredRequests = requestsResponse.chats.filter(chat => {
              if (!user?._id) return false;
              if (chat.status === 'declined') return false;
              return isIncomingRequestRef.current(chat, user._id);
            });

            const sortedRequests = filteredRequests.sort((a, b) =>
              new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
            );
            setChats(sortedActiveChats);
            setMessageRequests(sortedRequests);
            setAllChatsCache([...sortedActiveChats, ...sortedRequests]);
          }).catch(error => {
            // console.error('Failed to reload chats:', error);
          });
        }
        return;
      }

      // Update messages if this is the selected chat
      if (data.chatId === selectedChatRef.current) {
        // //console.log('Socket: Received new message', data.message._id);
        setMessages(prev => {
          // Check if message already exists by ID or if there's a pending optimistic message
          const messageExists = prev.some(msg =>
            msg._id === data.message._id ||
            ((msg as OptimisticMessage)._sending && msg.message === data.message.message)
          );

          if (messageExists) {
            // Replace optimistic message with real one if it exists
            return prev.map(msg => {
              if ((msg as OptimisticMessage)._sending && msg.message === data.message.message) {
                return data.message;
              }
              return msg;
            });
          }
          // //console.log('Socket: Adding new message to state');

          // If this is a request chat that we're currently viewing, update the cache as well
          const chatInRequests = messageRequests.find(r => r._id === data.chatId);
          if (chatInRequests) {
            // //console.log('Adding message to cache for currently selected request chat');
            requestChatCache.addMessage(data.chatId, data.message);
          }

          return [...prev, data.message];
        });
        scrollToBottomRef.current();
      }

      // Update the appropriate chat list
      if (chatInRegular) {
        setChats(prev => {
          const updatedChats = prev.map(chat => {
            if (chat._id === data.chatId) {
              // Determine the correct unread count
              let newUnreadCount = 0;

              if (data.chatId === selectedChatRef.current) {
                // If this is the selected chat, keep unread count at 0 (messages are being read)
                newUnreadCount = 0;
              } else if (typeof data.unreadCount === 'number') {
                // If backend provides the unread count in socket data, use it (most accurate)
                newUnreadCount = data.unreadCount;
                console.log('✅ Using backend unread count from socket:', newUnreadCount);
              } else {
                // Fallback: increment locally if backend doesn't provide count
                newUnreadCount = (chat.unreadCount || 0) + 1;
                console.log('📊 Incrementing locally:', newUnreadCount);
              }

              return {
                ...chat,
                lastMessage: {
                  sender: data.message.sender._id,
                  message: data.message.message,
                  timestamp: data.message.timestamp
                },
                lastMessageAt: data.message.timestamp,
                unreadCount: newUnreadCount
              };
            }
            return chat;
          });

          return updatedChats.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
        });

        // Don't call refreshUnreadCounts() here to avoid flickering
        // The local increment is accurate enough, and calling the API causes the count to flicker
        // The count will be refreshed when user navigates or reloads
      } else if (chatInRequests) {
        // Cache the message for request chats so recipients can see the full conversation
        // //console.log('Caching message for request chat:', data.chatId, data.message.message);
        requestChatCache.addMessage(data.chatId, data.message);

        setMessageRequests(prev => {
          const updated = prev.map(request =>
            request._id === data.chatId
              ? {
                  ...request,
                  lastMessage: {
                    sender: data.message.sender._id,
                    message: data.message.message,
                    timestamp: data.message.timestamp
                  },
                  lastMessageAt: data.message.timestamp
                }
              : request
          );
          // Sort by lastMessageAt to keep most recent at the top
          return updated.sort((a, b) =>
            new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
          );
        });
      }
    };

    const handleUserTyping = (data: { userId: string; chatId: string; username: string; fullName?: string }) => {
      if (data.chatId === selectedChatRef.current && data.userId !== user?._id) {
        setTypingUsers(prev => {
          const newMap = new Map(prev);
          newMap.set(data.userId, data.fullName || data.username);
          return newMap;
        });
      }
    };

    const handleUserStoppedTyping = (data: { userId: string; chatId: string }) => {
      if (data.chatId === selectedChatRef.current) {
        setTypingUsers(prev => {
          const newMap = new Map(prev);
          newMap.delete(data.userId);
          return newMap;
        });
      }
    };

    const handleMessageDeleted = (data: { chatId: string; messageId: string }) => {
      if (data.chatId === selectedChatRef.current) {
        setMessages(prev => prev.filter(msg => msg._id !== data.messageId));
      }
    };

    const handleMessagesRead = (data: { chatId: string; readBy: {_id: string}; messageIds?: string[] }) => {
      if (data.chatId === selectedChatRef.current) {
        setMessages(prev => prev.map(msg => {
          if (data.messageIds) {
            if (data.messageIds.includes(msg._id)) {
              return { ...msg, readBy: [...msg.readBy.filter(id => id !== data.readBy._id), data.readBy._id] };
            }
          } else {
            if (!msg.readBy.includes(data.readBy._id)) {
              return { ...msg, readBy: [...msg.readBy, data.readBy._id] };
            }
          }
          return msg;
        }));
      }
    };

    const handleChatRequestDeclined = (data: { chatId: string; declinedBy: { _id: string; username: string; fullName: string } }) => {
      // Remove the chat from both lists (it might be in either)
      setChats(prev => prev.filter(chat => chat._id !== data.chatId));
      setMessageRequests(prev => prev.filter(request => request._id !== data.chatId));
      setAllChatsCache(prev => prev.filter(chat => chat._id !== data.chatId));

      // Clear cached messages for this chat
      requestChatCache.clearChat(data.chatId);

      // Import toast dynamically to show notification
      import('react-toastify').then(({ toast }) => {
        toast.info(`${data.declinedBy.fullName} declined your message request`);
      });
    };

    const handleChatRequestAccepted = (data: { chatId: string; acceptedBy: { _id: string; username: string; fullName: string } }) => {
      // Find the chat in message requests and move it to active chats
      const requestChat = messageRequestsRef.current.find(r => r._id === data.chatId);

      if (requestChat) {
        // Update the chat status to 'active'
        const updatedChat = { ...requestChat, status: 'active' as const };

        // Remove from message requests
        setMessageRequests(prev => prev.filter(request => request._id !== data.chatId));

        // Add to active chats if not already there
        setChats(prev => {
          const exists = prev.some(chat => chat._id === data.chatId);
          if (exists) {
            // Update existing chat status
            return prev.map(chat =>
              chat._id === data.chatId ? updatedChat : chat
            );
          }
          // Add the chat to active chats
          return [updatedChat, ...prev].sort((a, b) =>
            new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
          );
        });

        // Update the all chats cache
        setAllChatsCache(prev => {
          const filtered = prev.filter(chat => chat._id !== data.chatId);
          return [updatedChat, ...filtered];
        });

        // Clear cached messages from request cache
        requestChatCache.clearChat(data.chatId);
      }

      // Import toast dynamically to show notification
      import('react-toastify').then(({ toast }) => {
        toast.success(`${data.acceptedBy.fullName} accepted your message request`);
      });
    };

    // Remove all previous listeners first to prevent duplicates
    socketManager.off('new_message');
    socketManager.off('user_typing');
    socketManager.off('user_stopped_typing');
    socketManager.off('message_deleted');
    socketManager.off('messages_read');
    socketManager.off('chat_request_declined');
    socketManager.off('chat_request_accepted');

    console.log('🔧 Registering socket handlers');

    socketManager.on('new_message', handleNewMessage);
    socketManager.on('user_typing', handleUserTyping);
    socketManager.on('user_stopped_typing', handleUserStoppedTyping);
    socketManager.on('message_deleted', handleMessageDeleted);
    socketManager.on('messages_read', handleMessagesRead);
    socketManager.on('chat_request_declined', handleChatRequestDeclined);
    socketManager.on('chat_request_accepted', handleChatRequestAccepted);

    return () => {
      console.log('🧹 Cleaning up socket handlers');
      socketManager.off('new_message', handleNewMessage);
      socketManager.off('user_typing', handleUserTyping);
      socketManager.off('user_stopped_typing', handleUserStoppedTyping);
      socketManager.off('message_deleted', handleMessageDeleted);
      socketManager.off('messages_read', handleMessagesRead);
      socketManager.off('chat_request_declined', handleChatRequestDeclined);
      socketManager.off('chat_request_accepted', handleChatRequestAccepted);
    };
    // CRITICAL FIX: Minimal dependencies to prevent infinite re-renders
    // We use refs for state values and the setters are stable from useState
    // Only re-register handlers when user changes (login/logout)
  }, [user]);

  return {
    selectedChatRef
  };
};
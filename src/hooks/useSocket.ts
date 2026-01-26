import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/store/useUserStore';
import { messageAPI, Chat, Message } from '@/api/message';
import socketManager from '@/utils/socket';
import { requestChatCache } from '@/utils/requestChatCache';
import { refreshUnreadCounts } from '@/hooks/useUnreadCounts';
import { messageQueue } from '@/utils/messageQueue';

// Extended Message type for optimistic updates
interface OptimisticMessage extends Message {
  _tempId?: string;
  _sending?: boolean;
  _failed?: boolean;
}

interface UseSocketProps {
  selectedChat: string | null;
  user: any;
  chats: Chat[];
  messageRequests: Chat[];
  setChats: React.Dispatch<React.SetStateAction<Chat[]>>;
  setMessageRequests: React.Dispatch<React.SetStateAction<Chat[]>>;
  setAllChatsCache: React.Dispatch<React.SetStateAction<Chat[]>>;
  setMessages: React.Dispatch<React.SetStateAction<OptimisticMessage[]>>;
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

  // Online status tracking
  const [onlineUsers, setOnlineUsers] = useState<Map<string, { online: boolean; lastSeen: string | null; canSeeStatus: boolean }>>(new Map());

  // Fetch initial online status when chat is selected
  useEffect(() => {
    const fetchOnlineStatus = async () => {
      if (selectedChat && chats.length > 0) {
        const chat = chats.find(c => c._id === selectedChat);
        if (chat) {
          const participantIds = chat.participants.map(p => p._id);
          try {
            const status = await messageAPI.getOnlineStatus(participantIds);
            const statusMap = new Map(
              Object.entries(status).map(([userId, data]) => [
                userId,
                { ...data, canSeeStatus: data.canSeeStatus !== false }
              ])
            );
            setOnlineUsers(statusMap);
          } catch (error) {
            console.error('Failed to fetch online status:', error);
          }
        }
      }
    };

    fetchOnlineStatus();
  }, [selectedChat, chats]);

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
      // Deduplicate: Check if we've already processed this message
      const messageKey = `${data.chatId}-${data.message._id}`;

      if (processedMessageIds.current.has(messageKey)) {
        //console.log('Skipping duplicate message event:', messageKey);
        // With FIFO queue, duplicates are handled automatically - just skip
        return;
      }

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
        setMessages(prev => {
          // Check if this is the current user's own message
          const isOwnMessage = data.message.sender._id === user?._id;

          // Strategy 1: Direct ID match (already exists with server ID)
          const directMatch = prev.findIndex(msg => msg._id === data.message._id);
          if (directMatch !== -1) {
            //console.log('Message already exists, skipping duplicate');
            return prev;
          }

          // Strategy 2: For own messages, use FIFO queue to find optimistic message
          if (isOwnMessage) {
            // Get the next pending message from the FIFO queue for this chat
            const pendingMessage = messageQueue.dequeueForChat(data.chatId);

            if (pendingMessage) {
              // Find the optimistic message by tempId (FIFO guarantees correct order)
              const optimisticIndex = prev.findIndex(msg => {
                const optimisticMsg = msg as any;
                return optimisticMsg._tempId === pendingMessage.tempId;
              });

              if (optimisticIndex !== -1) {
                //console.log('[FIFO] Matched server message with optimistic message:', pendingMessage.tempId);
                const optimisticMsg = prev[optimisticIndex] as any;

                // Replace the optimistic message in-place to maintain array position
                const updatedMessages = [...prev];
                updatedMessages[optimisticIndex] = {
                  ...data.message,
                  _tempId: optimisticMsg._tempId, // Preserve temp ID for React key stability
                  _sending: false,
                  _failed: false
                } as OptimisticMessage;

                return updatedMessages;
              } else {
                // Optimistic message was already removed (shouldn't happen)
                console.warn('[FIFO] Optimistic message not found for tempId:', pendingMessage.tempId);
                // Add as new message
              }
            } else {
              // No pending message in queue - this might be a message sent from another device
              // or the queue was cleared. Check if we have any orphaned optimistic messages
              const hasOrphanedOptimistic = prev.some(msg => {
                const optimisticMsg = msg as any;
                return optimisticMsg._tempId && optimisticMsg._sending;
              });

              if (hasOrphanedOptimistic) {
                console.warn('[FIFO] Found orphaned optimistic message but no queue entry');
                // Try content matching as fallback for orphaned messages
                const optimisticIndex = prev.findIndex(msg => {
                  const optimisticMsg = msg as any;
                  if (!optimisticMsg._tempId || !optimisticMsg._sending) return false;

                  const optimisticContent = msg.message.trim().toLowerCase();
                  const serverContent = data.message.message.trim().toLowerCase();
                  return optimisticContent === serverContent;
                });

                if (optimisticIndex !== -1) {
                  const optimisticMsg = prev[optimisticIndex] as any;
                  const updatedMessages = [...prev];
                  updatedMessages[optimisticIndex] = {
                    ...data.message,
                    _tempId: optimisticMsg._tempId,
                    _sending: false,
                    _failed: false
                  } as OptimisticMessage;
                  return updatedMessages;
                }
              }
            }
          }

          // Strategy 3: New message from another user or no optimistic match found
          const chatInRequests = messageRequests.find(r => r._id === data.chatId);
          if (chatInRequests) {
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
              } else {
                // Fallback: increment locally if backend doesn't provide count
                newUnreadCount = (chat.unreadCount || 0) + 1;
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

          // Sort chats by most recent message
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

    const handleMessageDeletedForEveryone = (data: { chatId: string; messageId: string; deletedBy: any; deletedAt: string }) => {
      if (data.chatId === selectedChatRef.current) {
        setMessages(prev => prev.map(msg =>
          msg._id === data.messageId
            ? { ...msg, deletedForEveryone: true, deletedForEveryoneAt: data.deletedAt }
            : msg
        ));
      }
    };

    const handleMessageDeletedForMe = (data: { chatId: string; messageId: string }) => {
      if (data.chatId === selectedChatRef.current) {
        setMessages(prev => prev.filter(msg => msg._id !== data.messageId));
      }
    };

    const handleUserStatusChanged = (data: { userId: string; status: string; timestamp: string; canSeeStatus?: boolean }) => {
      setOnlineUsers(prev => {
        const newMap = new Map(prev);
        const existingStatus = prev.get(data.userId);
        newMap.set(data.userId, {
          online: data.status === 'online',
          lastSeen: data.status === 'online' ? null : data.timestamp,
          canSeeStatus: data.canSeeStatus !== false && (existingStatus?.canSeeStatus !== false)
        });
        return newMap;
      });
    };

    const handleUserOffline = (data: { userId: string; timestamp: string; lastSeenAt?: string; canSeeStatus?: boolean }) => {
      setOnlineUsers(prev => {
        const newMap = new Map(prev);
        const existingStatus = prev.get(data.userId);
        newMap.set(data.userId, {
          online: false,
          lastSeen: data.lastSeenAt || data.timestamp,
          canSeeStatus: data.canSeeStatus !== false && (existingStatus?.canSeeStatus !== false)
        });
        return newMap;
      });
    };

    const handleMessagesDelivered = (data: { messageIds: string[]; deliveredTo: any; deliveredAt: string }) => {
      if (selectedChatRef.current) {
        setMessages(prev => prev.map(msg => {
          if (data.messageIds.includes(msg._id) && msg.status !== 'seen') {
            return {
              ...msg,
              status: 'delivered' as const,
              deliveryStatus: msg.deliveryStatus ? [
                ...msg.deliveryStatus.filter(ds => ds.userId !== data.deliveredTo._id),
                { userId: data.deliveredTo._id, status: 'delivered' as const, deliveredAt: data.deliveredAt }
              ] : [{ userId: data.deliveredTo._id, status: 'delivered' as const, deliveredAt: data.deliveredAt }]
            };
          }
          return msg;
        }));
      }
    };

    const handleMessagesRead = (data: { chatId: string; readBy: {_id: string}; messageIds?: string[]; seenAt?: string }) => {
      if (data.chatId === selectedChatRef.current) {
        setMessages(prev => prev.map(msg => {
          // Only update if message needs updating (prevents unnecessary re-renders)
          const shouldUpdate = data.messageIds
            ? data.messageIds.includes(msg._id) && !msg.readBy.includes(data.readBy._id)
            : !msg.readBy.includes(data.readBy._id);

          if (shouldUpdate) {
            return {
              ...msg,
              status: 'seen' as const,
              readBy: [...msg.readBy, data.readBy._id],
              deliveryStatus: msg.deliveryStatus ? msg.deliveryStatus.map(ds =>
                ds.userId === data.readBy._id ? { ...ds, status: 'seen' as const, seenAt: data.seenAt || new Date().toISOString() } : ds
              ) : [{ userId: data.readBy._id, status: 'seen' as const, seenAt: data.seenAt || new Date().toISOString() }]
            };
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
    socketManager.off('message_deleted_for_everyone');
    socketManager.off('message_deleted_for_me');
    socketManager.off('messages_read');
    socketManager.off('messages_delivered');
    socketManager.off('user_status_changed');
    socketManager.off('user_offline');
    socketManager.off('chat_request_declined');
    socketManager.off('chat_request_accepted');

    socketManager.on('new_message', handleNewMessage);
    socketManager.on('user_typing', handleUserTyping);
    socketManager.on('user_stopped_typing', handleUserStoppedTyping);
    socketManager.on('message_deleted', handleMessageDeleted);
    socketManager.on('message_deleted_for_everyone', handleMessageDeletedForEveryone);
    socketManager.on('message_deleted_for_me', handleMessageDeletedForMe);
    socketManager.on('messages_read', handleMessagesRead);
    socketManager.on('messages_delivered', handleMessagesDelivered);
    socketManager.on('user_status_changed', handleUserStatusChanged);
    socketManager.on('user_offline', handleUserOffline);
    socketManager.on('chat_request_declined', handleChatRequestDeclined);
    socketManager.on('chat_request_accepted', handleChatRequestAccepted);

    return () => {
      socketManager.off('new_message', handleNewMessage);
      socketManager.off('user_typing', handleUserTyping);
      socketManager.off('user_stopped_typing', handleUserStoppedTyping);
      socketManager.off('message_deleted', handleMessageDeleted);
      socketManager.off('message_deleted_for_everyone', handleMessageDeletedForEveryone);
      socketManager.off('message_deleted_for_me', handleMessageDeletedForMe);
      socketManager.off('messages_read', handleMessagesRead);
      socketManager.off('messages_delivered', handleMessagesDelivered);
      socketManager.off('user_status_changed', handleUserStatusChanged);
      socketManager.off('user_offline', handleUserOffline);
      socketManager.off('chat_request_declined', handleChatRequestDeclined);
      socketManager.off('chat_request_accepted', handleChatRequestAccepted);
    };
    // CRITICAL FIX: Minimal dependencies to prevent infinite re-renders
    // We use refs for state values and the setters are stable from useState
    // Only re-register handlers when user changes (login/logout)
  }, [user]);

  return {
    selectedChatRef,
    onlineUsers
  };
};
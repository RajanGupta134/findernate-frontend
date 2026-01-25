import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { messageAPI, Chat } from '@/api/message';
import { getFollowing } from '@/api/user';
import { AxiosError } from 'axios';
import { followEvents } from '@/utils/followEvents';
import { isIncomingRequest, getChatDisplayName, getChatAvatar, formatTime, calculateUnreadCounts } from '@/utils/message/chatUtils';
import { requestChatCache } from '@/utils/requestChatCache';
import { toast } from 'react-toastify';

const REQUEST_DECISIONS_KEY = 'message_request_decisions';
const VIEWED_REQUESTS_KEY = 'viewedMessageRequests';
const READ_CHATS_KEY = 'readChats';

interface UseChatManagementProps {
  user: any;
}

export const useChatManagement = ({ user }: UseChatManagementProps) => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [messageRequests, setMessageRequests] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<'direct' | 'group' | 'requests'>('direct');
  const [allChatsCache, setAllChatsCache] = useState<Chat[]>([]);
  const [userFollowingList, setUserFollowingList] = useState<string[]>([]);
  const [requestDecisionCache, setRequestDecisionCache] = useState<Map<string, 'accepted' | 'declined'>>(new Map());

  // Track chats that have been opened and should have unreadCount: 0 (persist to localStorage)
  const [readChats, setReadChats] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(READ_CHATS_KEY);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    }
    return new Set();
  });
  
  // Track which requests we've viewed (to prevent auto-acceptance after refresh)
  const [viewedRequests, setViewedRequests] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(VIEWED_REQUESTS_KEY);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    }
    return new Set();
  });
  
  // Function to clear a request from viewed list (when actually accepted/declined)
  const clearViewedRequest = (chatId: string) => {
    const newViewedRequests = new Set(viewedRequests);
    newViewedRequests.delete(chatId);
    setViewedRequests(newViewedRequests);
    localStorage.setItem(VIEWED_REQUESTS_KEY, JSON.stringify(Array.from(newViewedRequests)));
  };
  
  // Function to mark a request as viewed
  const markRequestAsViewed = (chatId: string) => {
    const newViewedRequests = new Set(viewedRequests);
    newViewedRequests.add(chatId);
    setViewedRequests(newViewedRequests);
    localStorage.setItem(VIEWED_REQUESTS_KEY, JSON.stringify(Array.from(newViewedRequests)));
  };
  const [followingUsers, setFollowingUsers] = useState<any[]>([]);
  const [loadingFollowing, setLoadingFollowing] = useState(false);
  
  const router = useRouter();
  const searchParams = useSearchParams();

  const selected = [...chats, ...messageRequests].find((chat) => chat._id === selectedChat);

  // Function to mark a chat as read and add it to readChats set
  const markChatAsRead = (chatId: string) => {
    setReadChats(prev => {
      const newReadChats = new Set([...prev, chatId]);
      // Persist to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem(READ_CHATS_KEY, JSON.stringify(Array.from(newReadChats)));
      }
      return newReadChats;
    });
  };

  // Function to refresh chats with accurate unread counts
  const refreshChatsWithAccurateUnreadCounts = async () => {
    try {
      const [activeChatsResponse, requestsResponse] = await Promise.all([
        messageAPI.getActiveChats(),
        messageAPI.getMessageRequests()
      ]);

      // Filter out declined chats and sort
      const sortedActiveChats = activeChatsResponse.chats
        .filter(chat => chat.status !== 'declined')
        .sort((a, b) =>
          new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
        );

      // Clear readChats for chats that have NEW unread messages from server
      const chatsToRemoveFromRead = sortedActiveChats
        .filter(chat => (chat.unreadCount || 0) > 0 && readChats.has(chat._id))
        .map(chat => chat._id);

      if (chatsToRemoveFromRead.length > 0) {
        setReadChats(prev => {
          const newReadChats = new Set([...prev]);
          chatsToRemoveFromRead.forEach(id => newReadChats.delete(id));
          if (typeof window !== 'undefined') {
            localStorage.setItem(READ_CHATS_KEY, JSON.stringify(Array.from(newReadChats)));
          }
          return newReadChats;
        });
      }

      // Preserve unreadCount: 0 for all chats that have been read (including currently selected)
      const chatsWithPreservedSelection = sortedActiveChats.map(chat => {
        // Force unreadCount to 0 for any chat that's been opened or is currently selected
        if ((chat._id === selectedChat || readChats.has(chat._id)) && !chatsToRemoveFromRead.includes(chat._id)) {
          return { ...chat, unreadCount: 0 };
        }
        return chat;
      });

      // Filter out declined chats from requests as well
      const filteredRequests = requestsResponse.chats.filter(chat => {
        if (!user?._id) return false;
        if (chat.status === 'declined') return false;
        return isIncomingRequest(chat, user._id);
      });

      const sortedRequests = filteredRequests.sort((a, b) =>
        new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
      );

      setChats(chatsWithPreservedSelection);
      setMessageRequests(sortedRequests);
      setAllChatsCache([...chatsWithPreservedSelection, ...sortedRequests]);
    } catch (error) {
      console.error('Failed to refresh chats with accurate unread counts:', error);
    }
  };

  // Load cached decisions and user following list on mount
  useEffect(() => {
    const savedDecisions = localStorage.getItem(REQUEST_DECISIONS_KEY);
    if (savedDecisions) {
      try {
        const decisionsArray = JSON.parse(savedDecisions);
        setRequestDecisionCache(new Map(decisionsArray));
      } catch (error) {
        console.error('Error loading cached decisions:', error);
      }
    }

    const loadUserFollowing = async () => {
      if (user) {
        try {
          //console.log('Loading following list for user:', user.username);
          const following = await messageAPI.getUserFollowing(user._id);
          const followingArray = (following || []);
          const followingIds = followingArray.filter(u => u && u._id).map(u => u._id);
          //console.log('Following list loaded:', {
          //  count: followingIds.length,
          //  users: followingArray.filter(u => u && u._id).map(u => ({ id: u._id, username: u.username }))
          // });
          setUserFollowingList(followingIds);
        } catch (error) {
          console.error('Failed to load user following:', error);
          setUserFollowingList([]);
        }
      }
    };

    loadUserFollowing();
  }, [user]);

  // Load chats on mount
  useEffect(() => {
    const loadChatsAndRequests = async () => {
      try {
        setLoading(true);
        
        //console.log('Loading active chats and requests from:', process.env.NEXT_PUBLIC_API_BASE_URL);
        
        const [activeChatsResponse, requestsResponse] = await Promise.all([
          messageAPI.getActiveChats(),
          messageAPI.getMessageRequests()
        ]);
        
        //console.log('Active chats from server:', activeChatsResponse.chats.length);
        //console.log('Message requests from server:', requestsResponse.chats.length);
        
        // Filter out declined chats from active chats
        const activeChatsFiltered = activeChatsResponse.chats.filter(chat => chat.status !== 'declined');

        // Include chats created by current user (outgoing requests) in active chats for Instagram-like behavior
        const outgoingChats = requestsResponse.chats.filter(chat =>
          chat.createdBy && chat.createdBy._id === user._id && chat.status !== 'declined'
        );

        //console.log('Outgoing chats (created by current user):', outgoingChats.length);

        // Merge active chats and outgoing chats, avoiding duplicates by checking participants
        const combinedChats = [...activeChatsFiltered];
        
        outgoingChats.forEach(outgoingChat => {
          // Check if there's already a chat with the same participants
          const existingChat = combinedChats.find(chat => {
            if (chat.chatType !== 'direct' || outgoingChat.chatType !== 'direct') return false;
            
            const chatParticipants = chat.participants.map(p => p._id).sort();
            const outgoingParticipants = outgoingChat.participants.map(p => p._id).sort();
            
            return JSON.stringify(chatParticipants) === JSON.stringify(outgoingParticipants);
          });
          
          if (!existingChat) {
            // No duplicate found, add the outgoing chat
            combinedChats.push(outgoingChat);
            //console.log('Added outgoing chat to active chats:', outgoingChat._id);
          } else {
            //console.log('Found duplicate chat, skipping outgoing chat:', outgoingChat._id, 'existing:', existingChat._id);
          }
        });
        
        const sortedActiveChats = combinedChats.sort((a, b) =>
          new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
        );

        // Clear readChats for chats that have NEW unread messages from server
        // Only clear if server explicitly says unreadCount > 0
        const chatsToRemoveFromRead = sortedActiveChats
          .filter(chat => (chat.unreadCount || 0) > 0 && readChats.has(chat._id))
          .map(chat => chat._id);

        if (chatsToRemoveFromRead.length > 0) {
          setReadChats(prev => {
            const newReadChats = new Set([...prev]);
            chatsToRemoveFromRead.forEach(id => newReadChats.delete(id));
            if (typeof window !== 'undefined') {
              localStorage.setItem(READ_CHATS_KEY, JSON.stringify(Array.from(newReadChats)));
            }
            return newReadChats;
          });
        }

        // Apply readChats to force unreadCount: 0 for chats that were previously read
        // This preserves the read state across page refreshes
        const sortedActiveChatsWithReadState = sortedActiveChats.map(chat => {
          if (readChats.has(chat._id) && !chatsToRemoveFromRead.includes(chat._id)) {
            // Force unreadCount to 0 for chats we've read (and haven't received new messages)
            return { ...chat, unreadCount: 0 };
          }
          return chat;
        });

        // Filter out declined chats from requests
        const filteredRequests = requestsResponse.chats.filter(chat => {
          if (!user?._id) return false;
          if (chat.status === 'declined') return false;
          return isIncomingRequest(chat, user._id);
        });
        
        //console.log('Original requests:', requestsResponse.chats.length);
        //console.log('Filtered requests (incoming only):', filteredRequests.length);
        
        const sortedRequests = filteredRequests.sort((a, b) => 
          new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
        );
        
        // Pre-mark outgoing chats as "accepted" so they stay in regular chats
        const newDecisions = new Map(requestDecisionCache);
        outgoingChats.forEach(chat => {
          newDecisions.set(chat._id, 'accepted');
        });
        if (outgoingChats.length > 0) {
          setRequestDecisionCache(newDecisions);
          localStorage.setItem(REQUEST_DECISIONS_KEY, 
            JSON.stringify(Array.from(newDecisions.entries())));
        }

        setChats(sortedActiveChatsWithReadState);
        setMessageRequests(sortedRequests);
        setAllChatsCache([...sortedActiveChatsWithReadState, ...sortedRequests]);
        
        // Cache any existing lastMessages from the initial load
        //console.log('Caching initial lastMessages for', sortedRequests.length, 'request chats');
        sortedRequests.forEach(request => {
          if (request.lastMessage && request.lastMessage.message) {
            requestChatCache.addLastMessage(
              request._id, 
              request.lastMessage, 
              request.participants
            );
          }
        });
        
      } catch (error) {
        console.error('Failed to load chats:', error);
        const axiosError = error as AxiosError;
        //console.log(axiosError.response?.status);
        setChats([]);
        setMessageRequests([]);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      loadChatsAndRequests();
    }
  }, [user]);

  // Simple categorization for when we need to update chats locally
  const categorizeChats = (allChats: Chat[]) => {
    //console.log('Local categorization called with:', allChats.length, 'chats');

    const regularChats: Chat[] = [];
    const requestChats: Chat[] = [];

    allChats.forEach((chat) => {
      // Filter out declined chats
      if (chat.status === 'declined') {
        return;
      }

      const decision = requestDecisionCache.get(chat._id);

      if (decision === 'declined') {
        return;
      } else if (decision === 'accepted') {
        regularChats.push(chat);
      } else {
        const existsInRequests = messageRequests.some(r => r._id === chat._id);
        const existsInRegular = chats.some(c => c._id === chat._id);

        if (existsInRequests) {
          requestChats.push(chat);
        } else {
          regularChats.push(chat);
        }
      }
    });

    //console.log('Local categorization result:', {
    //  regularChats: regularChats.length,
    //  requestChats: requestChats.length
    // });

    setChats(regularChats);
    setMessageRequests(requestChats);
  };

  // Recategorize chats when following list or decisions change
  // Removed allChatsCache from dependencies to prevent flickering caused by socket updates
  useEffect(() => {
    if (allChatsCache.length > 0 && userFollowingList.length >= 0) {
      //console.log('Recategorizing due to state change');
      categorizeChats(allChatsCache);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userFollowingList, requestDecisionCache, user]);

  // Monitor messageRequests for lastMessage changes and cache them
  useEffect(() => {
    if (!user || messageRequests.length === 0) return;
    
    //console.log('Monitoring message requests for lastMessage caching...');
    
    messageRequests.forEach(request => {
      if (request.lastMessage && request.lastMessage.message) {
        // Cache the lastMessage to preserve conversation history
        requestChatCache.addLastMessage(
          request._id, 
          request.lastMessage, 
          request.participants
        );
      }
    });
  }, [messageRequests, user]);

  // Handle chatId from URL parameters
  useEffect(() => {
    const chatId = searchParams.get('chatId');
    if (chatId && chats.length > 0 && !selectedChat) {
      const chatExists = chats.find(chat => chat._id === chatId);
      if (chatExists) {
        //console.log('Setting selectedChat from URL params:', chatId);
        setSelectedChat(chatId);
      }
    }
  }, [searchParams, chats, selectedChat]);

  // Handle userId and message parameters for direct messaging from product/service details
  useEffect(() => {
    const userId = searchParams.get('userId');
    const message = searchParams.get('message');
    const fromContactInfo = searchParams.get('fromContactInfo') === 'true';
    
    if (userId && message && user && chats.length >= 0) {
      const handleDirectMessage = async () => {
        try {
          //console.log('Processing direct message request for userId:', userId, 'fromContactInfo:', fromContactInfo);
          
          // Check if chat already exists in active chats or requests
          const existingChat = [...chats, ...messageRequests].find(chat => 
            chat.chatType === 'direct' &&
            chat.participants.some(p => p && p._id === user._id) &&
            chat.participants.some(p => p && p._id === userId)
          );

          if (existingChat) {
            //console.log('Found existing chat, selecting it:', existingChat._id);
            
            // If this is from contact info and chat is currently in requests, move it to regular chats
            if (fromContactInfo && messageRequests.some(r => r._id === existingChat._id)) {
              //console.log('Moving existing chat from requests to regular chats for contact info');
              
              // Mark as accepted in cache
              const newDecisions = new Map(requestDecisionCache);
              newDecisions.set(existingChat._id, 'accepted');
              setRequestDecisionCache(newDecisions);
              localStorage.setItem(REQUEST_DECISIONS_KEY, 
                JSON.stringify(Array.from(newDecisions.entries())));
              
              // Move from requests to chats
              setMessageRequests(prev => prev.filter(r => r._id !== existingChat._id));
              setChats(prev => [existingChat, ...prev.filter(c => c._id !== existingChat._id)]);
              
              setActiveTab('direct');
            }
            
            setSelectedChat(existingChat._id);
            
            // Store message for later use when chat loads
            setTimeout(() => {
              const messageEvent = new CustomEvent('prefillMessage', { 
                detail: { message: decodeURIComponent(message) } 
              });
              window.dispatchEvent(messageEvent);
            }, 1000);
          } else if (fromContactInfo) {
            // Special handling for "Get Contact Info" - create chat directly and send message
            //console.log('Creating direct chat from Contact Info, bypassing follow requirements');
            try {
              const newChat = await messageAPI.createChat([user._id, userId], 'direct');
              //console.log('Created new chat:', newChat._id);
              
              // For contact info requests, always add to sender's regular chats
              // The receiver will see it in their requests tab until they accept
              setChats(prev => [newChat, ...prev]);
              setSelectedChat(newChat._id);
              
              // Cache the decision that this chat should always be in regular chats for sender
              const newDecisions = new Map(requestDecisionCache);
              newDecisions.set(newChat._id, 'accepted');
              setRequestDecisionCache(newDecisions);
              localStorage.setItem(REQUEST_DECISIONS_KEY, 
                JSON.stringify(Array.from(newDecisions.entries())));
              
              // Send the message immediately - this message will be visible to sender
              // and will appear in receiver's requests tab
              setTimeout(async () => {
                try {
                  const sentMessage = await messageAPI.sendMessage(newChat._id, decodeURIComponent(message));
                  //console.log('Message sent successfully to new chat from Contact Info');
                  
                  // Update the chat with the last message to ensure it stays visible in Direct tab
                  setChats(prev => prev.map(chat => 
                    chat._id === newChat._id 
                      ? { 
                          ...chat, 
                          lastMessage: { 
                            sender: sentMessage.sender._id, 
                            message: sentMessage.message, 
                            timestamp: sentMessage.timestamp 
                          }, 
                          lastMessageAt: sentMessage.timestamp 
                        }
                      : chat
                  ));
                  
                  // Ensure the Direct tab is active to show the conversation
                  setActiveTab('direct');
                  
                } catch (err) {
                  console.error('Failed to send message to new chat:', err);
                }
              }, 1000);
              
            } catch (createError) {
              console.error('Failed to create chat from Contact Info:', createError);
              alert('Unable to start conversation. Please try again.');
            }
          } else {
            // Normal flow - check mutual follow status
            const { canDirectMessage } = checkMutualFollow(userId);
            
            if (canDirectMessage) {
              // Both users follow each other - allow direct messaging
              //console.log('Users mutually follow - creating direct chat');
              try {
                const newChat = await messageAPI.createChat([user._id, userId], 'direct');
                //console.log('Created mutual follow chat:', newChat._id);
                
                setChats(prev => [newChat, ...prev]);
                setSelectedChat(newChat._id);
                
                // Prefill message for direct chats
                setTimeout(() => {
                  const messageEvent = new CustomEvent('prefillMessage', { 
                    detail: { message: decodeURIComponent(message) } 
                  });
                  window.dispatchEvent(messageEvent);
                }, 1000);
                
              } catch (createError) {
                console.error('Failed to create mutual follow chat:', createError);
              }
            } else {
              // Users don't mutually follow - create request chat with message capability
              //console.log('Users don\'t mutually follow - creating request chat with messaging capability');
              try {
                const newChat = await messageAPI.createChat([user._id, userId], 'direct');
                //console.log('Created request chat:', newChat._id);
                
                // Add to sender's regular chats (Instagram-like: sender can always message)
                setChats(prev => [newChat, ...prev]);
                setSelectedChat(newChat._id);
                
                // Cache the decision that this chat should always be in regular chats for sender
                const newDecisions = new Map(requestDecisionCache);
                newDecisions.set(newChat._id, 'accepted');
                setRequestDecisionCache(newDecisions);
                localStorage.setItem(REQUEST_DECISIONS_KEY, 
                  JSON.stringify(Array.from(newDecisions.entries())));
                
                // Prefill message - sender can send messages before acceptance
                setTimeout(() => {
                  const messageEvent = new CustomEvent('prefillMessage', { 
                    detail: { message: decodeURIComponent(message) } 
                  });
                  window.dispatchEvent(messageEvent);
                }, 1000);
                
              } catch (createError) {
                console.error('Failed to create request chat:', createError);
              }
            }
          }
          
          // Clear URL parameters to prevent re-triggering
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.delete('userId');
          newUrl.searchParams.delete('message');
          newUrl.searchParams.delete('fromContactInfo');
          router.replace(newUrl.pathname + newUrl.search);
          
        } catch (error) {
          console.error('Error handling direct message request:', error);
        }
      };

      // Only trigger once when we have the necessary data
      if (!selectedChat) {
        handleDirectMessage();
      }
    }
  }, [searchParams, user, chats, selectedChat, router]);

  // Filter chats based on search query and tab
  const filteredChats = (() => {
    let chatList: Chat[] = [];
    
    if (activeTab === 'requests') {
      chatList = messageRequests;
    } else {
      chatList = chats.filter(chat => {
        if (activeTab === 'direct' && chat.chatType !== 'direct') return false;
        if (activeTab === 'group' && chat.chatType !== 'group') return false;
        return true;
      });
    }
    
    if (!searchQuery.trim()) return chatList;
    
    const searchLower = searchQuery.toLowerCase();
    return chatList.filter(chat => {
      const chatName = getChatDisplayName(chat, user).toLowerCase();
      const lastMessage = chat.lastMessage?.message?.toLowerCase() || '';
      return chatName.includes(searchLower) || lastMessage.includes(searchLower);
    });
  })();

  // Calculate unread counts
  const { directUnreadCount, groupUnreadCount } = calculateUnreadCounts(chats);

  // Load following users for new chat
  const loadFollowingUsers = async () => {
    if (!user) return;
    
    setLoadingFollowing(true);
    try {
      const following = await getFollowing(user._id);
      setFollowingUsers((following || []).filter(user => user && user._id));
    } catch (error) {
      console.error('Failed to load following users:', error);
      setFollowingUsers([]);
    } finally {
      setLoadingFollowing(false);
    }
  };

  // Check if users mutually follow each other
  const checkMutualFollow = (targetUserId: string): { canDirectMessage: boolean, isMutualFollowing: boolean } => {
    if (!user?._id) return { canDirectMessage: false, isMutualFollowing: false };
    
    // Check if current user follows the target
    const currentUserFollowsTarget = userFollowingList.includes(targetUserId);
    
    // For now, we'll assume mutual follow if we have the target in our following list
    // In a real implementation, you might need an API to check if target user follows back
    const isMutualFollowing = currentUserFollowsTarget; // Simplified check
    
    return {
      canDirectMessage: isMutualFollowing, // Can message directly if mutual follow
      isMutualFollowing
    };
  };

  // Create chat with selected user (considers follow status)
  const createChatWithUser = async (selectedUser: any, skipFollowCheck = false) => {
    try {
      if (!user) return;
      
      const { canDirectMessage } = checkMutualFollow(selectedUser._id);
      
      // If users don't mutually follow and skipFollowCheck is false, 
      // still create chat but it will go to requests
      const participants = [user._id, selectedUser._id];
      const chat = await messageAPI.createChat(participants, 'direct');
      
      // If mutual follow or skipFollowCheck, add to regular chats
      // Otherwise, it will appear in requests for the receiver
      if (canDirectMessage || skipFollowCheck) {
        setChats(prev => {
          const chatExists = prev.some(c => c._id === chat._id);
          if (chatExists) {
            const updatedChats = prev.filter(c => c._id !== chat._id);
            return [chat, ...updatedChats];
          }
          return [chat, ...prev];
        });
      } else {
        // For the sender, add to regular chats (they can send messages even without mutual follow)
        setChats(prev => {
          const chatExists = prev.some(c => c._id === chat._id);
          if (chatExists) {
            const updatedChats = prev.filter(c => c._id !== chat._id);
            return [chat, ...updatedChats];
          }
          return [chat, ...prev];
        });
      }
      
      setSelectedChat(chat._id);
    } catch (error) {
      console.error('Failed to create chat:', error);
    }
  };

  // Accept message request with auto-follow
  const handleAcceptRequest = async (chatId: string) => {
    const request = messageRequests.find(r => r._id === chatId);
    if (!request || !user) return;

    try {
      const otherParticipant = request.participants.filter(p => p && p._id).find(p => p._id !== user._id);
      
      if (!otherParticipant) {
        if (request.lastMessage?.sender && request.lastMessage.sender !== user._id) {
          const senderID = request.lastMessage.sender;
          await messageAPI.acceptMessageRequest(chatId);
          await messageAPI.followUser(senderID);
          setUserFollowingList(prev => [...prev, senderID]);
        } else {
          throw new Error('Cannot find the other participant to accept request');
        }
      } else {
        await messageAPI.acceptMessageRequest(chatId);
        await messageAPI.followUser(otherParticipant._id);
        setUserFollowingList(prev => [...prev, otherParticipant._id]);
      }

      // Move from requests to regular chats
      setChats(prev => [request, ...prev]);
      setMessageRequests(prev => prev.filter(r => r._id !== chatId));

      // Cache decision
      const newDecisions = new Map(requestDecisionCache);
      newDecisions.set(chatId, 'accepted');
      setRequestDecisionCache(newDecisions);

      localStorage.setItem(REQUEST_DECISIONS_KEY, 
        JSON.stringify(Array.from(newDecisions.entries())));

      // Clear from viewed requests since it's now actually accepted
      clearViewedRequest(chatId);

      // Clear cached messages since we'll now get them from backend
      requestChatCache.clearChat(chatId);
      //console.log('Cleared cached messages for accepted request:', chatId);

      // Only switch to direct tab and select chat after explicit acceptance
      setSelectedChat(chatId);
      setActiveTab('direct');

    } catch (error) {
      console.error('Failed to accept request:', error);
      toast.error(`Failed to accept request: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Decline message request
  const handleDeclineRequest = async (chatId: string) => {
    try {
      await messageAPI.declineMessageRequest(chatId);
      setMessageRequests(prev => prev.filter(r => r._id !== chatId));

      const newDecisions = new Map(requestDecisionCache);
      newDecisions.set(chatId, 'declined');
      setRequestDecisionCache(newDecisions);

      localStorage.setItem(REQUEST_DECISIONS_KEY, 
        JSON.stringify(Array.from(newDecisions.entries())));

      // Clear from viewed requests since it's now declined
      clearViewedRequest(chatId);

      // Clear cached messages since the request is declined
      requestChatCache.clearChat(chatId);
      //console.log('Cleared cached messages for declined request:', chatId);

    } catch (error) {
      console.error('Failed to decline request:', error);
      toast.error(`Failed to decline request: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Handle when user follows/unfollows someone from other parts of the app
  const handleUserFollowUpdate = (userId: string, isFollowing: boolean) => {
    //console.log(`Follow update: ${userId}, following: ${isFollowing}`);
    
    setUserFollowingList(prev => {
      const newList = isFollowing 
        ? (prev.includes(userId) ? prev : [...prev, userId])
        : prev.filter(id => id !== userId);
      
      //console.log('Updated following list:', newList);
      return newList;
    });
  };

  // Expose the follow update handler globally for other components to use
  useEffect(() => {
    const unsubscribe = followEvents.subscribe(handleUserFollowUpdate);
    return unsubscribe;
  }, [userFollowingList, chats, messageRequests, requestDecisionCache]);

  // Handle profile navigation for direct chats and group details for group chats
  const handleProfileClick = (chat: Chat, setShowGroupDetails?: (show: boolean) => void) => {
    //console.log('Profile clicked for chat:', chat._id, 'type:', chat.chatType);
    
    if (chat.chatType === 'direct') {
      //console.log('Chat participants:', chat.participants);
      //console.log('Current user ID:', user?._id);
      
      const otherParticipant = chat.participants.find(p => p && p._id && p._id !== user?._id);
      //console.log('Found other participant:', otherParticipant);
      
      if (otherParticipant && otherParticipant.username) {
        //console.log('Navigating to profile:', otherParticipant.username);
        router.push(`/userprofile/${otherParticipant.username}`);
      } else {
        console.warn('Could not find other participant or username missing', otherParticipant);
      }
    } else if (chat.chatType === 'group' && setShowGroupDetails) {
      setShowGroupDetails(true);
    }
  };

  return {
    // State
    chats,
    setChats,
    messageRequests,
    setMessageRequests,
    selectedChat,
    setSelectedChat,
    loading,
    searchQuery,
    setSearchQuery,
    activeTab,
    setActiveTab,
    allChatsCache,
    setAllChatsCache,
    selected,
    filteredChats,
    directUnreadCount,
    groupUnreadCount,
    followingUsers,
    loadingFollowing,
    
    // Functions
    loadFollowingUsers,
    createChatWithUser,
    checkMutualFollow,
    handleAcceptRequest,
    handleDeclineRequest,
    handleProfileClick,
    refreshChatsWithAccurateUnreadCounts,
    markChatAsRead,
    
    // Utility functions (re-exported for convenience)
    getChatDisplayName: (chat: Chat) => getChatDisplayName(chat, user),
    getChatAvatar: (chat: Chat) => getChatAvatar(chat, user),
    formatTime,
    isIncomingRequest: (chat: Chat) => isIncomingRequest(chat, user?._id || ''),
    
    // Viewed requests functions
    viewedRequests,
    markRequestAsViewed,
    clearViewedRequest
  };
};
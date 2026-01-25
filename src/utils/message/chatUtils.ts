import { Chat } from '@/api/message';

// Format time helper
export const formatTime = (timestamp: string): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 1) return 'now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
  return date.toLocaleDateString();
};

// Get chat display name
export const getChatDisplayName = (chat: Chat, user: any): string => {
  if (chat.chatType === 'group') {
    return chat.groupName || 'Group Chat';
  }
  const otherParticipant = chat.participants.find(p => p._id !== user?._id);
  return otherParticipant?.fullName || otherParticipant?.username || 'Unknown User';
};

// Get chat avatar
export const getChatAvatar = (chat: Chat, user: any): string => {
  if (chat.chatType === 'group') {
    return chat.groupImage || '/placeholderimg.png';
  }
  const otherParticipant = chat.participants.find(p => p._id !== user?._id);
  return otherParticipant?.profileImageUrl || '/placeholderimg.png';
};

// Helper function to determine if a message request is incoming
export const isIncomingRequest = (chat: Chat, currentUserId: string): boolean => {
  // 1. Must be a direct chat
  if (chat.chatType !== 'direct') {
    return false;
  }
  
  // 2. Check participants - should have exactly 2 participants
  const validParticipants = chat.participants.filter(p => p && p._id);
  if (validParticipants.length !== 2) {
    return false;
  }
  
  // 3. Current user must be one of the participants
  const isParticipant = validParticipants.some(p => p._id === currentUserId);
  if (!isParticipant) {
    return false;
  }
  
  // 4. Key fix: Check who created the chat, not who sent the last message
  // If current user created the chat, it's an outgoing request (should be hidden)
  if (chat.createdBy && chat.createdBy._id === currentUserId) {
    //console.log('Filtering out outgoing request (created by current user):', chat._id);
    return false;
  }
  
  // 5. Ensure there's another participant who is not the current user
  const otherParticipant = validParticipants.find(p => p._id !== currentUserId);
  if (!otherParticipant) {
    //console.log('Filtering out request with no other participant:', chat._id);
    return false;
  }
  
  //console.log('Allowing incoming request:', {
  //  chatId: chat._id,
  //  otherParticipant: otherParticipant.username || otherParticipant.fullName,
  //  createdBy: chat.createdBy?._id || 'unknown'
  // });
  
  return true;
};

// Calculate unread counts for different chat types
export const calculateUnreadCounts = (chats: Chat[]) => {
  const directUnreadCount = chats
    .filter(chat => chat.chatType === 'direct')
    .reduce((total, chat) => total + (chat.unreadCount || 0), 0);
  
  const groupUnreadCount = chats
    .filter(chat => chat.chatType === 'group')
    .reduce((total, chat) => total + (chat.unreadCount || 0), 0);

  return { directUnreadCount, groupUnreadCount };
};
import axiosInstance from './base';
import { createMessageNotification, pushNotificationManager } from '../utils/pushNotifications';
import { FontStyle } from '@/types';

// Types for API responses
export interface Message {
  _id: string;
  chatId: string;
  sender: {
    _id: string;
    username: string;
    fullName: string;
    profileImageUrl?: string;
  };
  message: string;
  messageType: 'text' | 'image' | 'video' | 'file' | 'audio' | 'location';
  mediaUrl?: string;
  fileName?: string;
  fileSize?: number;
  duration?: number;
  location?: {
    latitude: number;
    longitude: number;
    address: string;
  };
  replyTo?: string;
  timestamp: string;
  readBy: string[];
  isDeleted: boolean;
  deletedAt?: string;
  editedAt?: string;
  reactions: Array<{
    user: string;
    emoji: string;
    timestamp: string;
  }>;
  // New fields for messaging features
  status?: 'sent' | 'delivered' | 'seen';
  deletedForEveryone?: boolean;
  deletedForEveryoneAt?: string;
  deliveryStatus?: Array<{
    userId: string;
    status: 'sent' | 'delivered' | 'seen';
    deliveredAt?: string;
    seenAt?: string;
  }>;
  fontStyle?: FontStyle;
}

export interface Chat {
  _id: string;
  participants: Array<{
    _id: string;
    username: string;
    fullName: string;
    profileImageUrl?: string;
  }>;
  chatType: 'direct' | 'group';
  status?: 'requested' | 'active' | 'declined';
  groupName?: string;
  groupDescription?: string;
  groupImage?: string;
  admins?: string[];
  createdBy: {
    _id: string;
    username: string;
    fullName: string;
    profileImageUrl?: string;
  };
  lastMessage?: {
    sender: string;
    message: string;
    timestamp: string;
  };
  lastMessageAt: string;
  unreadCount?: number;
  mutedBy?: string[];
  pinnedMessages?: string[];
  blockedUsers?: string[];
  themeColor?: string; // Chat theme color for message bubbles
}

export interface ChatResponse {
  chats: Chat[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalChats: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface MessagesResponse {
  messages: Message[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalMessages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

// API functions
export const messageAPI = {
  // Get all chats for the current user (legacy method - now gets active chats)
  getUserChats: async (page = 1, limit = 20): Promise<ChatResponse> => {
    try {
      const response = await axiosInstance.get(`/chats?page=${page}&limit=${limit}&chatStatus=active`);
      return response.data.data;
    } catch (error: any) {
      throw error;
    }
  },

  // Get active chats for the current user
  getActiveChats: async (page = 1, limit = 20): Promise<ChatResponse> => {
    try {
      const response = await axiosInstance.get(`/chats?page=${page}&limit=${limit}&chatStatus=active`);
      return response.data.data;
    } catch (error: any) {
      throw error;
    }
  },

  // Create a new chat
  createChat: async (participants: string[], chatType = 'direct', groupName?: string, groupDescription?: string): Promise<Chat> => {
    try {
      const response = await axiosInstance.post('/chats', {
        participants,
        chatType,
        groupName,
        groupDescription
      });
      return response.data.data;
    } catch (error: any) {
      throw error;
    }
  },

  // Get messages for a specific chat
  getChatMessages: async (chatId: string, page = 1, limit = 50): Promise<MessagesResponse> => {
    try {
      const response = await axiosInstance.get(`/chats/${chatId}/messages?page=${page}&limit=${limit}`);
      return response.data.data;
    } catch (error: any) {
      throw error;
    }
  },

  // Send a message
  sendMessage: async (chatId: string, message: string, messageType = 'text', replyTo?: string, fileName?: string, fileSize?: number, mediaUrl?: string, fontStyle?: FontStyle): Promise<Message> => {
    const payload: any = {
      message,
      messageType,
      replyTo
    };

    // Add file metadata if provided
    if (fileName) payload.fileName = fileName;
    if (fileSize) payload.fileSize = fileSize;
    if (mediaUrl) payload.mediaUrl = mediaUrl;
    if (fontStyle) payload.fontStyle = fontStyle;

    const response = await axiosInstance.post(`/chats/${chatId}/messages`, payload);
    return response.data.data;
  },

  // Upload file using upload-single-media API
  uploadFileToMedia: async (file: File): Promise<{
    secure_url: string;
    resource_type: string;
    format: string;
    bytes: number;
    original_name: string;
    mimetype: string;
  }> => {
    const formData = new FormData();
    formData.append('media', file);
    
    const response = await axiosInstance.post('/media/upload-single', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    if (response.data.success && response.data.data) {
      return {
        secure_url: response.data.data.secure_url,
        resource_type: response.data.data.resource_type,
        format: response.data.data.format,
        bytes: response.data.data.bytes,
        original_name: response.data.data.original_name,
        mimetype: response.data.data.mimetype,
      };
    }
    
    throw new Error('Failed to upload media: ' + (response.data.message || 'Unknown error'));
  },

  // Send a message with media file (upload using upload-single-media API first, then send URL as JSON message)
  sendMessageWithFile: async (chatId: string, file: File, message?: string, messageType?: string, replyTo?: string): Promise<Message> => {

    try {
      // Step 1: Upload file using upload-single-media API and get response
      const uploadResponse = await messageAPI.uploadFileToMedia(file);
      
      // Step 2: Determine message type based on file type and extension
      let finalMessageType = messageType;
      if (!finalMessageType) {
        // Check file extension from original_name as additional safeguard
        const fileExtension = uploadResponse.original_name.split('.').pop()?.toLowerCase();
        
        // Always use the original file.type, not Cloudinary's resource_type
        // because Cloudinary sometimes categorizes PDFs as 'image' resource_type
        if (file.type.startsWith('image/') && !['pdf'].includes(fileExtension || '')) {
          finalMessageType = 'image';
        } else if (file.type.startsWith('video/')) {
          finalMessageType = 'video';
        } else if (file.type.startsWith('audio/')) {
          finalMessageType = 'audio';
        } else if (
          file.type === 'application/pdf' || 
          fileExtension === 'pdf' ||
          file.type.includes('document') ||
          file.type.includes('word') ||
          file.type.includes('excel') ||
          file.type.includes('powerpoint') ||
          file.type === 'text/plain' ||
          file.type === 'text/csv' ||
          ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv'].includes(fileExtension || '')
        ) {
          finalMessageType = 'file';
        } else {
          // Everything else is treated as a file (PDFs, documents, etc.)
          finalMessageType = 'file';
        }
        
      }
      
      // Step 3: Send the media URL as a regular JSON message using existing sendMessage function
      const finalMessage = message ? `${message}\n${uploadResponse.secure_url}` : uploadResponse.secure_url;
      
      // Use the existing sendMessage function with JSON format (not form data)
      // Pass file metadata and mediaUrl for proper rendering
      return await messageAPI.sendMessage(
        chatId, 
        finalMessage, 
        finalMessageType, 
        replyTo, 
        uploadResponse.original_name, 
        uploadResponse.bytes,
        uploadResponse.secure_url // Pass the secure_url as mediaUrl
      );
      
    } catch (error) {
      throw error;
    }
  },

  // Mark messages as read
  markMessagesRead: async (chatId: string, messageIds?: string[]): Promise<void> => {
    await axiosInstance.patch(`/chats/${chatId}/read`, {
      messageIds
    });
  },

  // Mark all messages in a chat as read
  markAllMessagesRead: async (chatId: string): Promise<void> => {
    await axiosInstance.patch(`/chats/${chatId}/read-all`);
  },

  // Get unread count for a specific chat
  getChatUnreadCount: async (chatId: string): Promise<{ unreadCount: number }> => {
    const response = await axiosInstance.get(`/chats/${chatId}/unread-count`);
    return response.data.data;
  },

  // Delete a message for everyone (24-hour time limit)
  deleteMessageForEveryone: async (chatId: string, messageId: string): Promise<void> => {
    await axiosInstance.delete(`/chats/${chatId}/messages/${messageId}`);
  },

  // Delete a message for me only (no time limit)
  deleteMessageForMe: async (chatId: string, messageId: string): Promise<void> => {
    await axiosInstance.delete(`/chats/${chatId}/messages/${messageId}/for-me`);
  },

  // Legacy method for backward compatibility - defaults to delete for everyone
  deleteMessage: async (chatId: string, messageId: string): Promise<void> => {
    await axiosInstance.delete(`/chats/${chatId}/messages/${messageId}`);
  },

  // Restore a deleted message
  restoreMessage: async (chatId: string, messageId: string): Promise<Message> => {
    const response = await axiosInstance.patch(`/chats/${chatId}/messages/${messageId}/restore`);
    return response.data.data;
  },

  // Start typing indicator
  startTyping: async (chatId: string): Promise<void> => {
    await axiosInstance.post(`/chats/${chatId}/typing/start`);
  },

  // Stop typing indicator
  stopTyping: async (chatId: string): Promise<void> => {
    await axiosInstance.post(`/chats/${chatId}/typing/stop`);
  },

  // Get online status of users (updated with last seen support and privacy)
  getOnlineStatus: async (userIds: string[]): Promise<{
    [userId: string]: {
      online: boolean;
      lastSeen: string | null;
      canSeeStatus: boolean;
    }
  }> => {
    const response = await axiosInstance.get('/chats/users/online-status', {
      params: { userIds }
    });
    return response.data.data.onlineStatus;
  },

  // Search messages in a chat
  searchMessages: async (chatId: string, query: string, page = 1, limit = 20): Promise<{
    messages: Message[];
    query: string;
    totalResults: number;
    pagination: {
      currentPage: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  }> => {
    const response = await axiosInstance.get(`/chats/${chatId}/search?query=${encodeURIComponent(query)}&page=${page}&limit=${limit}`);
    return response.data.data;
  },

  // Get user's following list
  getUserFollowing: async (userId: string): Promise<Array<{
    _id: string;
    username: string;
    fullName: string;
    profileImageUrl?: string;
  }>> => {
    try {
      const response = await axiosInstance.get(`/users/following/${userId}`);
      return Array.isArray(response.data.data) ? response.data.data : [];
    } catch (error: any) {
      return []; // Return empty array instead of throwing error
    }
  },

  // Follow a user
  followUser: async (userId: string): Promise<void> => {
    try {
      await axiosInstance.post('/users/follow', { userId });
    } catch (error: any) {
      throw error;
    }
  },

  // Accept message request
  acceptMessageRequest: async (chatId: string): Promise<void> => {
    try {
      await axiosInstance.patch(`/chats/${chatId}/accept`);
    } catch (error: any) {
      throw error;
    }
  },

  // Decline message request
  declineMessageRequest: async (chatId: string): Promise<void> => {
    try {
      await axiosInstance.patch(`/chats/${chatId}/decline`);
    } catch (error: any) {
      throw error;
    }
  },

  // Get message requests
  getMessageRequests: async (page = 1, limit = 20): Promise<ChatResponse> => {
    try {
      const response = await axiosInstance.get(`/chats?page=${page}&limit=${limit}&chatStatus=requested`);
      return response.data.data;
    } catch (error: any) {
      throw error;
    }
  },

  // Get messaging privacy settings
  getMessagingPrivacy: async (): Promise<{
    onlineStatus: 'everyone' | 'followers' | 'nobody';
    lastSeen: 'everyone' | 'followers' | 'nobody';
    canSeeOthersStatus: boolean;
  }> => {
    const response = await axiosInstance.get('/users/messaging/privacy');
    return response.data.data.privacy;
  },

  // Update messaging privacy settings
  updateMessagingPrivacy: async (settings: {
    onlineStatus?: 'everyone' | 'followers' | 'nobody';
    lastSeen?: 'everyone' | 'followers' | 'nobody';
  }): Promise<{
    onlineStatus: 'everyone' | 'followers' | 'nobody';
    lastSeen: 'everyone' | 'followers' | 'nobody';
    canSeeOthersStatus: boolean;
  }> => {
    const response = await axiosInstance.patch('/users/messaging/privacy', settings);
    return response.data.data.privacy;
  },

  // Add reaction to a message
  addReaction: async (chatId: string, messageId: string, emoji: string): Promise<Message> => {
    const response = await axiosInstance.post(`/chats/${chatId}/messages/${messageId}/reactions`, { emoji });
    return response.data.data;
  },

  // Remove reaction from a message
  removeReaction: async (chatId: string, messageId: string): Promise<Message> => {
    const response = await axiosInstance.delete(`/chats/${chatId}/messages/${messageId}/reactions`);
    return response.data.data;
  },

  // Update chat theme color
  updateChatTheme: async (chatId: string, themeColor: string): Promise<Chat> => {
    const response = await axiosInstance.patch(`/chats/${chatId}/theme`, { themeColor });
    return response.data.data;
  }
};

// Helper function to handle incoming messages and trigger notifications
export const handleIncomingMessage = (message: Message, currentUserId: string) => {
  // Only show notification if the message is not from the current user
  if (message.sender._id !== currentUserId) {
    const senderName = message.sender.fullName || message.sender.username || 'Unknown';
    const notificationData = createMessageNotification(message, senderName);
    
    // Show local notification if the user is currently on the app but not focused on the chat
    // or if the app is in the background
    if (typeof document !== 'undefined' && (document.hidden || !document.hasFocus())) {
      pushNotificationManager.showLocalNotification(notificationData);
    }
  }
};

// Helper function to setup real-time message listeners (for WebSocket/Socket.IO)
export const setupMessageNotifications = (currentUserId: string) => {
  // This function would typically be called when setting up WebSocket listeners
  // For now, it's a placeholder for the integration point
  
  // You would integrate this with your WebSocket/Socket.IO setup
  // Example:
  // socket.on('newMessage', (message: Message) => {
  //   handleIncomingMessage(message, currentUserId);
  // });
};
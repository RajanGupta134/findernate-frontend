import { Message } from '@/api/message';

const REQUEST_MESSAGES_CACHE_KEY = 'request_chat_messages_cache';

interface CachedRequestMessage {
  chatId: string;
  messages: Message[];
  lastUpdated: number;
}

interface RequestMessageCache {
  [chatId: string]: CachedRequestMessage;
}

// Load cache from localStorage
const loadCache = (): RequestMessageCache => {
  if (typeof window === 'undefined') return {};
  
  try {
    const cached = localStorage.getItem(REQUEST_MESSAGES_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      
      // Clean up old cache entries (older than 7 days)
      const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      const cleanedCache: RequestMessageCache = {};
      
      Object.keys(parsed).forEach(chatId => {
        if (parsed[chatId].lastUpdated > sevenDaysAgo) {
          cleanedCache[chatId] = parsed[chatId];
        }
      });
      
      return cleanedCache;
    }
  } catch (error) {
    console.error('Failed to load request message cache:', error);
  }
  
  return {};
};

// Save cache to localStorage
const saveCache = (cache: RequestMessageCache): void => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(REQUEST_MESSAGES_CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.error('Failed to save request message cache:', error);
  }
};

export const requestChatCache = {
  // Add a message to the cache for a specific chat
  addMessage: (chatId: string, message: Message): void => {
    const cache = loadCache();
    
    if (!cache[chatId]) {
      cache[chatId] = {
        chatId,
        messages: [],
        lastUpdated: Date.now()
      };
    }
    
    // Check if message already exists (avoid duplicates)
    const existingMessage = cache[chatId].messages.find(m => m._id === message._id);
    if (existingMessage) {
      //console.log('Message already cached, skipping:', message._id);
      return;
    }
    
    // Add new message and sort by timestamp
    cache[chatId].messages.push(message);
    cache[chatId].messages.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    cache[chatId].lastUpdated = Date.now();
    
    //console.log(`Cached message for request chat ${chatId}:`, message.message);
    saveCache(cache);
  },

  // Get cached messages for a specific chat
  getMessages: (chatId: string): Message[] => {
    const cache = loadCache();
    return cache[chatId]?.messages || [];
  },

  // Update multiple messages for a chat (when we get them from backend)
  updateMessages: (chatId: string, messages: Message[]): void => {
    const cache = loadCache();
    
    if (!cache[chatId]) {
      cache[chatId] = {
        chatId,
        messages: [],
        lastUpdated: Date.now()
      };
    }
    
    // Merge existing cached messages with new ones, avoiding duplicates
    const existingIds = new Set(cache[chatId].messages.map(m => m._id));
    const newMessages = messages.filter(m => !existingIds.has(m._id));
    
    cache[chatId].messages = [...cache[chatId].messages, ...newMessages];
    cache[chatId].messages.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    cache[chatId].lastUpdated = Date.now();
    
    //console.log(`Updated cached messages for request chat ${chatId}, total:`, cache[chatId].messages.length);
    saveCache(cache);
  },

  // Clear cached messages for a specific chat (when request is accepted/declined)
  clearChat: (chatId: string): void => {
    const cache = loadCache();
    
    if (cache[chatId]) {
      delete cache[chatId];
      //console.log(`Cleared cached messages for chat ${chatId}`);
      saveCache(cache);
    }
  },

  // Clear all cached messages (cleanup function)
  clearAll: (): void => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(REQUEST_MESSAGES_CACHE_KEY);
      //console.log('Cleared all request message cache');
    }
  },

  // Add a message from lastMessage data (for when we only have lastMessage info)
  addLastMessage: (chatId: string, lastMessage: any, participants: any[]): void => {
    if (!lastMessage || !lastMessage.message) return;
    
    // Create a proper message object from lastMessage data
    const messageFromLastMessage: Message = {
      _id: `lastmsg-${chatId}-${lastMessage.timestamp || Date.now()}`,
      chatId: chatId,
      sender: {
        _id: lastMessage.sender,
        username: participants.find(p => p._id === lastMessage.sender)?.username || 'Unknown',
        fullName: participants.find(p => p._id === lastMessage.sender)?.fullName || 'Unknown User',
        profileImageUrl: participants.find(p => p._id === lastMessage.sender)?.profileImageUrl
      },
      message: lastMessage.message,
      messageType: 'text',
      timestamp: lastMessage.timestamp || new Date().toISOString(),
      readBy: [],
      isDeleted: false,
      reactions: []
    };
    
    // Check if this exact message is already cached
    const existingCached = requestChatCache.getMessages(chatId);
    const alreadyCached = existingCached.some(msg => 
      msg.message === lastMessage.message && 
      msg.sender._id === lastMessage.sender &&
      Math.abs(new Date(msg.timestamp).getTime() - new Date(lastMessage.timestamp).getTime()) < 1000 // Within 1 second
    );
    
    if (!alreadyCached) {
      //console.log('Caching lastMessage for request chat:', chatId, lastMessage.message);
      requestChatCache.addMessage(chatId, messageFromLastMessage);
    }
  },

  // Get cache stats for debugging
  getStats: (): { totalChats: number; totalMessages: number } => {
    const cache = loadCache();
    const totalChats = Object.keys(cache).length;
    const totalMessages = Object.values(cache).reduce((sum, chat) => sum + chat.messages.length, 0);
    
    return { totalChats, totalMessages };
  }
};
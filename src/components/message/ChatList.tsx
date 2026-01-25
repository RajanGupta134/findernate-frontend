import React from 'react';
import Image from 'next/image';
import { Search } from 'lucide-react';
import { Chat } from '@/api/message';

type TabType = 'direct' | 'group' | 'requests';

interface OnlineStatusInfo {
  online: boolean;
  lastSeen: string | null;
  canSeeStatus: boolean;
}

// Memoized ChatItem component to prevent unnecessary re-renders
const ChatItem = React.memo(({
  chat,
  selectedChat,
  activeTab,
  getChatAvatar,
  getChatDisplayName,
  formatTime,
  renderChatPreview,
  setSelectedChat,
  onAcceptRequest,
  onDeclineRequest,
  onlineStatus,
  currentUserId,
  themeColor
}: {
  chat: Chat;
  selectedChat: string | null;
  activeTab: TabType;
  getChatAvatar: (chat: Chat) => string;
  getChatDisplayName: (chat: Chat) => string;
  formatTime: (timestamp: string) => string;
  renderChatPreview: (chat: Chat) => React.ReactNode;
  setSelectedChat: (chatId: string) => void;
  onAcceptRequest?: (chatId: string) => void;
  onDeclineRequest?: (chatId: string) => void;
  onlineStatus?: Map<string, OnlineStatusInfo>;
  currentUserId?: string;
  themeColor?: string;
}) => {
  const getOtherParticipantStatus = () => {
    if (chat.chatType !== 'direct' || !onlineStatus || !currentUserId) return null;
    const otherParticipant = chat.participants.find(p => p._id !== currentUserId);
    if (!otherParticipant) return null;
    const status = onlineStatus.get(otherParticipant._id);
    if (!status || !status.canSeeStatus) return null;
    return status;
  };

  const participantStatus = getOtherParticipantStatus();
  const defaultColor = '#DBB42C';
  const indicatorColor = themeColor || defaultColor;

  return (
    <div
      key={chat._id}
      className={`flex items-start gap-3 p-3 rounded-lg transition cursor-pointer ${
        activeTab === 'requests'
          ? `hover:bg-orange-50 ${selectedChat === chat._id ? "bg-orange-50 border border-orange-300" : ""}`
          : `hover:bg-yellow-50 ${selectedChat === chat._id ? "bg-yellow-50 border border-yellow-300" : ""}`
      }`}
      onClick={() => setSelectedChat(chat._id)}
    >
      <div className="relative">
        <Image
          src={getChatAvatar(chat)}
          alt={getChatDisplayName(chat)}
          width={48}
          height={48}
          className="rounded-full"
          loading="lazy"
          unoptimized
        />
        {participantStatus?.online && (
          <div
            className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white"
            style={{ backgroundColor: indicatorColor }}
            title="Online"
          />
        )}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-black">{getChatDisplayName(chat)}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            activeTab === 'requests'
              ? 'bg-orange-100 text-orange-700'
              : 'bg-yellow-100 text-yellow-700'
          }`}>
            {activeTab === 'requests' ? 'Request' : (chat.chatType === 'group' ? 'Group' : 'Direct')}
          </span>
          <span className="ml-auto text-xs text-gray-400">{formatTime(chat.lastMessageAt)}</span>
        </div>
        <p className="text-sm text-gray-600 truncate max-w-[200px] overflow-hidden whitespace-nowrap">
          {renderChatPreview(chat)}
        </p>

        {activeTab === 'requests' && onAcceptRequest && onDeclineRequest && (
          <div className="flex gap-2 mt-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAcceptRequest(chat._id);
              }}
              className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white text-xs rounded-full transition-colors"
            >
              Accept
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeclineRequest(chat._id);
              }}
              className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-xs rounded-full transition-colors"
            >
              Decline
            </button>
          </div>
        )}
      </div>
      {/* Unread count badge */}
      {activeTab !== 'requests' && (chat.unreadCount ?? 0) > 0 && (
        <div className="ml-2 bg-yellow-500 text-white text-xs min-w-[20px] h-5 flex items-center justify-center rounded-full px-1 animate-pulse">
          {chat?.unreadCount && chat.unreadCount > 99 ? '99+' : chat.unreadCount}
        </div>
      )}
    </div>
  );
});

ChatItem.displayName = 'ChatItem';

interface ChatListProps {
  chats: Chat[];
  selectedChat: string | null;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  setSelectedChat: (chatId: string) => void;
  activeTab: TabType;
  getChatAvatar: (chat: Chat) => string;
  getChatDisplayName: (chat: Chat) => string;
  formatTime: (timestamp: string) => string;
  onAcceptRequest?: (chatId: string) => void;
  onDeclineRequest?: (chatId: string) => void;
  loading: boolean;
  onlineStatus?: Map<string, OnlineStatusInfo>;
  currentUserId?: string;
  themeColor?: string;
}

export const ChatList: React.FC<ChatListProps> = ({
  chats,
  selectedChat,
  searchQuery,
  setSearchQuery,
  setSelectedChat,
  activeTab,
  getChatAvatar,
  getChatDisplayName,
  formatTime,
  onAcceptRequest,
  onDeclineRequest,
  loading,
  onlineStatus,
  currentUserId,
  themeColor
}) => {
  // Remove duplicate chats by _id and filter out declined chats
  const uniqueChats = React.useMemo(() => {
    const seen = new Set();
    return chats.filter(chat => {
      // Filter out declined chats
      if (chat.status === 'declined') {
        return false;
      }
      // Remove duplicates
      if (seen.has(chat._id)) {
        return false;
      }
      seen.add(chat._id);
      return true;
    });
  }, [chats]);

  // Memoize chat preview rendering to avoid recalculating on every render
  const renderChatPreview = React.useCallback((chat: Chat) => {
    const msg = chat.lastMessage?.message;
    if (!msg) return 'No messages yet';
    
    const urlRegex = /https?:\/\/[^\s]+/g;
    const urls = msg.match(urlRegex);
    if (urls && urls.length > 0) {
      const url = urls[0];
      const isCloudinary = url.includes('res.cloudinary.com');
      const isFindernateMedia = url.includes('findernate-media.b-cdn.net');
      const imageExt = /(\.jpg|\.jpeg|\.png|\.gif|\.webp|\.bmp|\.svg)$/i;
      const videoExt = /(\.mp4|\.mov|\.webm|\.avi|\.mkv|\.flv|\.wmv)$/i;
      
      if (isCloudinary || isFindernateMedia) {
        if (imageExt.test(url)) return 'Image';
        if (videoExt.test(url)) return 'Video';
      } else {
        const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
        if (ytMatch && ytMatch[1]) {
          return '🎥 YouTube Video';
        }

        try {
          const { hostname } = new URL(url);
          return `🔗 ${hostname}`;
        } catch {
          return 'Attachment';
        }
      }
    }
    
    const textWithoutUrl = msg.replace(urlRegex, '').trim();
    const maxLength = 50; // Limit message preview to 50 characters
    if (textWithoutUrl.length > maxLength) {
      return textWithoutUrl.substring(0, maxLength) + '...';
    }
    return textWithoutUrl || 'No messages yet';
  }, []);

  return (
    <>
      {/* Search bar - always visible */}
      <div className="px-6 py-4 relative">
        <Search className="absolute left-9 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input 
          type="text" 
          placeholder="Search conversations..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-black placeholder-gray-400" 
        />
      </div>

      {/* Content area */}
      <div className="overflow-y-auto px-4 flex-1">
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="text-gray-500">Loading chats...</div>
          </div>
        ) : chats.length === 0 ? (
          <div className="flex justify-center items-center py-8">
            <div className="text-gray-500">
              {searchQuery.trim() 
                ? `No ${activeTab === 'requests' ? 'requests' : 'chats'} found matching your search` 
                : activeTab === 'requests' 
                  ? 'No message requests'
                  : activeTab === 'group'
                    ? 'No group chats available'
                    : 'No direct chats available'
              }
            </div>
          </div>
        ) : (
          uniqueChats.map((chat) => (
            <ChatItem
              key={chat._id}
              chat={chat}
              selectedChat={selectedChat}
              activeTab={activeTab}
              getChatAvatar={getChatAvatar}
              getChatDisplayName={getChatDisplayName}
              formatTime={formatTime}
              renderChatPreview={renderChatPreview}
              setSelectedChat={setSelectedChat}
              onAcceptRequest={onAcceptRequest}
              onDeclineRequest={onDeclineRequest}
              onlineStatus={onlineStatus}
              currentUserId={currentUserId}
              themeColor={themeColor}
            />
          ))
        )}
      </div>
    </>
  );
};
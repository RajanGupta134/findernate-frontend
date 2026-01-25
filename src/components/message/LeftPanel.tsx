import React from 'react';
//import Image from 'next/image';
import { ChatTabs } from './ChatTabs';
import { ChatList } from './ChatList';
import { Chat } from '@/api/message';

type TabType = 'direct' | 'group' | 'requests';

interface OnlineStatusInfo {
  online: boolean;
  lastSeen: string | null;
  canSeeStatus: boolean;
}

interface LeftPanelProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  directUnreadCount: number;
  groupUnreadCount: number;
  requestCount: number;
  onNewChat: () => void;
  onNewGroup: () => void;
  chats: Chat[];
  selectedChat: string | null;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  setSelectedChat: (chatId: string) => void;
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

export const LeftPanel: React.FC<LeftPanelProps> = ({
  activeTab,
  setActiveTab,
  directUnreadCount,
  groupUnreadCount,
  requestCount,
  onNewChat,
  onNewGroup,
  chats,
  selectedChat,
  searchQuery,
  setSearchQuery,
  setSelectedChat,
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
  return (
    <div className={`border-r bg-white flex flex-col w-full sm:w-1/3 ${selectedChat ? 'hidden sm:flex' : 'flex'}`}>
      <div className="px-6 pt-6">
        <ChatTabs
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          directUnreadCount={directUnreadCount}
          groupUnreadCount={groupUnreadCount}
          requestCount={requestCount}
        />

        <div className="flex gap-2">
          <button 
            onClick={onNewChat}
            className="flex-1 bg-button-gradient text-black py-2.5 rounded-lg font-medium shadow hover:bg-yellow-500 transition cursor-pointer"
          >
            + New Chat
          </button>
          <button 
            onClick={onNewGroup}
            className="flex-1 bg-green-500 text-white py-2.5 rounded-lg font-medium shadow hover:bg-green-600 transition cursor-pointer"
          >
            + New Group
          </button>
        </div>
      </div>

      <ChatList
        chats={chats}
        selectedChat={selectedChat}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        setSelectedChat={setSelectedChat}
        activeTab={activeTab}
        getChatAvatar={getChatAvatar}
        getChatDisplayName={getChatDisplayName}
        formatTime={formatTime}
        onAcceptRequest={onAcceptRequest}
        onDeclineRequest={onDeclineRequest}
        loading={loading}
        onlineStatus={onlineStatus}
        currentUserId={currentUserId}
        themeColor={themeColor}
      />
    </div>
  );
};
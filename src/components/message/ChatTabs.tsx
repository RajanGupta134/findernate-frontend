import React from 'react';
import { MessageCircle, Users, Mail } from 'lucide-react';

type TabType = 'direct' | 'group' | 'requests';

interface ChatTabsProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  directUnreadCount: number;
  groupUnreadCount: number;
  requestCount: number;
}

export const ChatTabs: React.FC<ChatTabsProps> = ({
  activeTab,
  setActiveTab,
  directUnreadCount,
  groupUnreadCount,
  requestCount
}) => {
  return (
    <div className="flex bg-gray-100 rounded-lg p-1 mb-4">
      <button
        onClick={() => setActiveTab('direct')}
        className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
          activeTab === 'direct'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        <MessageCircle className="w-4 h-4" />
        Direct
        {/* {directUnreadCount > 0 && (
          <span className="bg-red-500 text-white text-xs min-w-[18px] h-4 flex items-center justify-center rounded-full px-1">
            {directUnreadCount > 99 ? '99+' : directUnreadCount}
          </span>
        )} */}
      </button>
      <button
        onClick={() => setActiveTab('group')}
        className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
          activeTab === 'group'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        <Users className="w-4 h-4" />
        Groups
        {groupUnreadCount > 0 && (
          <span className="bg-red-500 text-white text-xs min-w-[18px] h-4 flex items-center justify-center rounded-full px-1">
            {groupUnreadCount > 99 ? '99+' : groupUnreadCount}
          </span>
        )}
      </button>
      <button
        onClick={() => setActiveTab('requests')}
        className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
          activeTab === 'requests'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        <Mail className="w-4 h-4" />
        Requests
        {requestCount > 0 && (
          <span className="bg-orange-500 text-white text-xs min-w-[18px] h-4 flex items-center justify-center rounded-full px-1">
            {requestCount > 99 ? '99+' : requestCount}
          </span>
        )}
      </button>
    </div>
  );
};
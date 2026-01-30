import React from 'react';
import Image from 'next/image';
import { Chat } from '@/api/message';
import { ChevronLeft, Phone, Video, Loader2 } from 'lucide-react';
import { ChatThemeColorPicker } from './ChatThemeColorPicker';

interface ChatHeaderProps {
  selected: Chat;
  typingUsers: Map<string, string>;
  getChatAvatar: (chat: Chat) => string;
  getChatDisplayName: (chat: Chat) => string;
  onProfileClick: (chat: Chat) => void;
  onBack?: () => void;
  onVoiceCall?: (chat: Chat) => void;
  onVideoCall?: (chat: Chat) => void;
  isInitiatingCall?: boolean;
  onlineStatus?: {
    [userId: string]: {
      online: boolean;
      lastSeen: string | null;
      canSeeStatus?: boolean;
    }
  };
  onThemeChange?: (themeColor: string) => void;
  currentUserId?: string;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  selected,
  typingUsers,
  getChatAvatar,
  getChatDisplayName,
  onProfileClick,
  onBack,
  onVoiceCall,
  onVideoCall,
  isInitiatingCall = false,
  onlineStatus,
  onThemeChange,
  currentUserId
}) => {
  const defaultColor = '#DBB42C';
  const themeColor = selected.themeColor || defaultColor;

  // Get the other participant's status for direct chats
  const getOtherParticipantStatus = () => {
    if (selected.chatType !== 'direct' || !onlineStatus) return null;

    const currentId = currentUserId || selected.createdBy._id;
    const otherParticipant = selected.participants.find(p => p._id !== currentId);
    if (!otherParticipant) return null;

    const status = onlineStatus[otherParticipant._id];
    if (!status || status.canSeeStatus === false) return null;

    return status;
  };

  const formatLastSeen = (lastSeen: string | null) => {
    if (!lastSeen) return null;

    const lastSeenDate = new Date(lastSeen);
    const now = new Date();
    const diffMs = now.getTime() - lastSeenDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Last seen just now';
    if (diffMins < 60) return `Last seen ${diffMins}m ago`;
    if (diffHours < 24) return `Last seen ${diffHours}h ago`;
    if (diffDays === 1) return 'Last seen yesterday';
    if (diffDays < 7) return `Last seen ${diffDays}d ago`;
    return `Last seen ${lastSeenDate.toLocaleDateString()}`;
  };

  const participantStatus = getOtherParticipantStatus();
  return (
    <div className="z-10 p-3 sm:p-6 border-b border-gray-200 bg-white shrink-0">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center min-w-0 flex-1">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="sm:hidden p-2 mr-1 rounded-full hover:bg-gray-100 text-gray-700 flex-shrink-0"
              aria-label="Back to chats"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <div
            className="flex items-center space-x-2 sm:space-x-4 cursor-pointer hover:bg-gray-50 -m-2 p-2 rounded-lg transition-colors min-w-0 flex-1"
            onClick={() => onProfileClick(selected)}
          >
          <Image
            width={12}
            height={12}
            src={getChatAvatar(selected)}
            alt={getChatDisplayName(selected)}
            className="w-9 h-9 sm:w-12 sm:h-12 rounded-full object-cover flex-shrink-0"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center space-x-2">
              <h2 className="text-sm sm:text-lg font-semibold text-gray-900 truncate">{getChatDisplayName(selected)}</h2>
              {participantStatus?.online && (
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: themeColor }}
                  title="Online"
                />
              )}
              <div className="hidden sm:block bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium flex-shrink-0">
                {selected.chatType === 'group' ? 'Group' : 'Direct'}
              </div>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 truncate">
              {typingUsers.size > 0 ? (
                typingUsers.size === 1
                  ? `${Array.from(typingUsers.values())[0]} is typing...`
                  : `${typingUsers.size} users are typing...`
              ) : selected.chatType === 'group' ? (
                `${selected.participants.length} members • Click to view details`
              ) : participantStatus?.online ? (
                'Online'
              ) : participantStatus?.lastSeen ? (
                formatLastSeen(participantStatus.lastSeen)
              ) : (
                'Click to view profile'
              )}
            </p>
          </div>
          </div>
        </div>
        <div className="flex items-center space-x-2 sm:space-x-5 sm:pr-8 flex-shrink-0">
          {/* Chat Theme Color Picker */}
          <ChatThemeColorPicker selected={selected} onThemeChange={onThemeChange} />

          {/* Voice Call Button */}
          {onVoiceCall && selected.chatType === 'direct' && (
            <button
              type="button"
              onClick={() => onVoiceCall(selected)}
              disabled={isInitiatingCall}
              className="group relative p-2 sm:p-3 rounded-full bg-gradient-to-r from-yellow-50 to-yellow-50 hover:from-yellow-100 hover:to-yellow-100 text-yellow-600 hover:text-yellow-700 transition-all duration-300 ease-in-out transform hover:scale-110 hover:shadow-lg active:scale-95 border border-yellow-200 hover:border-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              title={isInitiatingCall ? "Connecting..." : "Start voice call"}
            >
              {isInitiatingCall ? (
                <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
              ) : (
                <Phone className="w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-300 group-hover:rotate-12" />
              )}
              {/* Ripple effect */}
              <div className="absolute inset-0 rounded-full bg-yellow-400 opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
              {/* Pulse animation on hover */}
              <div className="absolute inset-0 rounded-full bg-yellow-400 opacity-0 group-hover:opacity-20 animate-ping"></div>
            </button>
          )}

          {/* Video Call Button */}
          {onVideoCall && selected.chatType === 'direct' && (
            <button
              type="button"
              onClick={() => onVideoCall(selected)}
              disabled={isInitiatingCall}
              className="group relative p-2 sm:p-3 rounded-full bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 text-blue-600 hover:text-blue-700 transition-all duration-300 ease-in-out transform hover:scale-110 hover:shadow-lg active:scale-95 border border-blue-200 hover:border-blue-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              title={isInitiatingCall ? "Connecting..." : "Start video call"}
            >
              {isInitiatingCall ? (
                <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
              ) : (
                <Video className="w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-300 group-hover:rotate-12" />
              )}
              {/* Ripple effect */}
              <div className="absolute inset-0 rounded-full bg-blue-400 opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
              {/* Pulse animation on hover */}
              <div className="absolute inset-0 rounded-full bg-blue-400 opacity-0 group-hover:opacity-20 animate-ping"></div>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
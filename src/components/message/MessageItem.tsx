import React, { useState, useRef, useCallback, memo, useMemo } from 'react';
import { Check, CheckCheck, MoreVertical, Clock, AlertCircle, RotateCw, Ban } from 'lucide-react';
import { Message, Chat } from '@/api/message';
import { MediaRenderer } from './MediaRenderer';
import MessageMediaModal from './MessageMediaModal';
import { deletedMessagesCache } from '@/utils/deletedMessagesCache';

interface OptimisticMessage extends Message {
  _tempId?: string;
  _sending?: boolean;
  _failed?: boolean;
  _retryCount?: number;
}

interface MessageItemProps {
  msg: OptimisticMessage;
  isCurrentUser: boolean;
  selected: Chat;
  user: any;
  onContextMenu: (messageId: string, x: number, y: number, timestamp: string) => void;
  onRetry?: (tempId: string) => void;
  themeColor?: string; // Chat theme color
}

const MessageItemComponent: React.FC<MessageItemProps> = ({
  msg,
  isCurrentUser,
  selected,
  user,
  onContextMenu,
  onRetry,
  themeColor
}) => {
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [isLongPressing, setIsLongPressing] = useState(false);

  // Check if message is deleted - use prop OR check localStorage cache as fallback
  // This ensures deleted messages stay deleted even if the state wasn't properly propagated
  const isDeletedForEveryone = useMemo(() => {
    if (msg.deletedForEveryone) return true;
    // Fallback: check the localStorage cache
    return deletedMessagesCache.isDeleted(msg._id);
  }, [msg._id, msg.deletedForEveryone]);

  // Long press handling for mobile
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);

  // Handle touch start for long press
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!isCurrentUser || isDeletedForEveryone) return;

    const touch = e.touches[0];
    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };

    longPressTimerRef.current = setTimeout(() => {
      setIsLongPressing(true);
      // Trigger context menu at touch position
      if (touchStartPosRef.current) {
        onContextMenu(msg._id, touchStartPosRef.current.x, touchStartPosRef.current.y, msg.timestamp);
      }
      // Vibrate for haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, 1000); // 1 second hold
  }, [isCurrentUser, msg._id, msg.timestamp, isDeletedForEveryone, onContextMenu]);

  // Handle touch move - cancel long press if finger moves too much
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartPosRef.current || !longPressTimerRef.current) return;

    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStartPosRef.current.x);
    const deltaY = Math.abs(touch.clientY - touchStartPosRef.current.y);

    // Cancel if moved more than 10 pixels
    if (deltaX > 10 || deltaY > 10) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
      touchStartPosRef.current = null;
    }
  }, []);

  // Handle touch end - cancel long press timer
  const handleTouchEnd = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    touchStartPosRef.current = null;
    setIsLongPressing(false);
  }, []);

  // Handle right-click for desktop
  const handleRightClick = useCallback((e: React.MouseEvent) => {
    if (!isCurrentUser || isDeletedForEveryone) return;

    e.preventDefault();
    e.stopPropagation();
    onContextMenu(msg._id, e.clientX, e.clientY, msg.timestamp);
  }, [isCurrentUser, msg._id, msg.timestamp, isDeletedForEveryone, onContextMenu]);

  // Default color if no theme color is set
  const defaultColor = '#DBB42C';
  const bubbleColor = themeColor || defaultColor;

  const handleMediaClick = () => {
    setShowMediaModal(true);
  };

  const getSeenTime = (msg: Message) => {
    if (!msg.deliveryStatus || msg.deliveryStatus.length === 0) return null;
    const seenStatus = msg.deliveryStatus.find(ds => ds.status === 'seen');
    if (!seenStatus?.seenAt) return null;
    const seenDate = new Date(seenStatus.seenAt);
    const now = new Date();
    const isToday = seenDate.toDateString() === now.toDateString();
    if (isToday) {
      return seenDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return seenDate.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderMessageContent = () => {
    if (!msg.message) return null;

    const urlRegex = /https?:\/\/[^\s]+/g;
    const urls = msg.message.match(urlRegex);
    
    if (urls && urls.length > 0) {
      const url = urls[0];
      const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
      if (ytMatch && ytMatch[1]) {
        const videoId = ytMatch[1];
        return (
          <div className="my-2 w-full">
            <iframe
              width="100%"
              height="150"
              src={`https://www.youtube.com/embed/${videoId}`}
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="rounded-lg border max-w-full"
              style={{ aspectRatio: '16/9', maxWidth: '280px' }}
            ></iframe>
          </div>
        );
      }
    }
    
    if (msg.messageType !== 'text') {
      const urlRegex = /https?:\/\/[^\s]+/;
      const textWithoutUrl = msg.message.replace(urlRegex, '').trim();
      return textWithoutUrl ? <p>{textWithoutUrl}</p> : null;
    }
    
    return <p className="break-words">{msg.message}</p>;
  };

  return (
    <div
      data-message-id={msg._tempId || msg._id}
      className={`flex ${isCurrentUser ? "justify-end" : "justify-start"} mb-4 group relative animate-fadeIn`}
    >
      <div
        className={`max-w-xs px-4 py-3 rounded-2xl relative break-words ${
          isCurrentUser
            ? "text-white"
            : "bg-gray-100 text-gray-900"
        } ${msg._sending ? 'opacity-90' : 'opacity-100'} ${isLongPressing ? 'scale-[0.98] opacity-80' : ''}`}
        style={{
          wordWrap: 'break-word',
          overflowWrap: 'break-word',
          transition: 'opacity 300ms cubic-bezier(0.4, 0, 0.2, 1), transform 200ms ease-out',
          backgroundColor: isCurrentUser ? bubbleColor : undefined,
          userSelect: 'none', // Prevent text selection on long press
          WebkitUserSelect: 'none',
        }}
        onContextMenu={handleRightClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        {(!isCurrentUser || selected?.chatType === 'group') && (
          <p className="text-xs font-medium mb-1 opacity-80">
            {isCurrentUser ? 'You' : (msg.sender.fullName || msg.sender.username)}
          </p>
        )}

        {isDeletedForEveryone ? (
          <div className={`flex items-center gap-1.5 ${isCurrentUser ? 'text-white/70' : 'text-gray-500'}`}>
            <Ban className="w-3.5 h-3.5" />
            <p className="italic text-sm">
              {isCurrentUser ? 'You deleted this message' : 'This message was deleted'}
            </p>
          </div>
        ) : (
          <>
            <MediaRenderer msg={msg} onMediaClick={handleMediaClick} />
            {renderMessageContent()}
          </>
        )}
        
        <div className={`flex items-center justify-between mt-1 text-xs ${
          isCurrentUser ? "text-yellow-100" : "text-gray-500"
        }`}>
          <span className="flex-1 text-right">
            {new Date(msg.timestamp).toLocaleString([], {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </span>
          {isCurrentUser && (
            <span className="ml-2 flex items-center gap-1 transition-all duration-300 ease-in-out">
              {msg._sending ? (
                <span title="Sending..." className="animate-fadeIn">
                  <Clock className="w-3 h-3 animate-pulse" />
                </span>
              ) : msg._failed ? (
                <button
                  onClick={() => msg._tempId && onRetry?.(msg._tempId)}
                  className="flex items-center gap-1 hover:opacity-80 transition-opacity animate-fadeIn"
                  title="Failed to send. Click to retry"
                >
                  <AlertCircle className="w-3 h-3 text-red-300" />
                  <RotateCw className="w-3 h-3" />
                </button>
              ) : msg.status === 'seen' || (msg.readBy && msg.readBy.length > 1) ? (
                <span
                  title={`Seen${getSeenTime(msg) ? ` at ${getSeenTime(msg)}` : ''}`}
                  className="animate-fadeIn flex items-center gap-1"
                >
                  <CheckCheck
                    className="w-3 h-3 transition-all duration-200 ease-out"
                    style={{ color: bubbleColor }}
                  />
                  {getSeenTime(msg) && (
                    <span className="text-[10px] opacity-70">{getSeenTime(msg)}</span>
                  )}
                </span>
              ) : msg.status === 'delivered' ? (
                <span title="Delivered" className="animate-fadeIn">
                  <CheckCheck className="w-3 h-3 transition-all duration-200 ease-out opacity-70" />
                </span>
              ) : (
                <span title="Sent" className="animate-fadeIn">
                  <Check className="w-3 h-3 transition-all duration-200 ease-out opacity-70" />
                </span>
              )}
            </span>
          )}
        </div>
        
        {isCurrentUser && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onContextMenu(msg._id, e.clientX, e.clientY, msg.timestamp);
            }}
            className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 bg-gray-600 text-white p-1 rounded-full hover:bg-gray-700 transition-all"
          >
            <MoreVertical className="w-3 h-3" />
          </button>
        )}
      </div>
      
      {!isCurrentUser && !msg.readBy.includes(user?._id || '') && (
        <div className="w-2 h-2 bg-blue-500 rounded-full ml-2 mt-2" title="Unread message" />
      )}
      
      {/* Media Modal */}
      <MessageMediaModal
        isOpen={showMediaModal}
        onClose={() => setShowMediaModal(false)}
        message={msg}
      />
    </div>
  );
};

// Memoize to prevent re-renders when message props haven't changed
export const MessageItem = memo(MessageItemComponent, (prevProps, nextProps) => {
  // Custom comparison for optimal re-rendering
  const prevMsg = prevProps.msg;
  const nextMsg = nextProps.msg;

  // Re-render only if these specific properties change
  return (
    prevMsg._id === nextMsg._id &&
    prevMsg._tempId === nextMsg._tempId &&
    prevMsg._sending === nextMsg._sending &&
    prevMsg._failed === nextMsg._failed &&
    prevMsg.status === nextMsg.status &&
    prevMsg.readBy.length === nextMsg.readBy.length &&
    prevMsg.message === nextMsg.message &&
    prevMsg.deletedForEveryone === nextMsg.deletedForEveryone &&
    prevProps.isCurrentUser === nextProps.isCurrentUser &&
    prevProps.themeColor === nextProps.themeColor
  );
});
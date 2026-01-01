import React, { useState } from 'react';
import { Check, CheckCheck, MoreVertical } from 'lucide-react';
import { Message, Chat } from '@/api/message';
import { MediaRenderer } from './MediaRenderer';
import MessageMediaModal from './MessageMediaModal';

interface MessageItemProps {
  msg: Message;
  isCurrentUser: boolean;
  selected: Chat;
  user: any;
  onContextMenu: (messageId: string, x: number, y: number) => void;
}

export const MessageItem: React.FC<MessageItemProps> = ({
  msg,
  isCurrentUser,
  selected,
  user,
  onContextMenu
}) => {
  const [showMediaModal, setShowMediaModal] = useState(false);

  const handleMediaClick = () => {
    setShowMediaModal(true);
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
      data-message-id={msg._id}
      className={`flex ${isCurrentUser ? "justify-end" : "justify-start"} mb-4 group relative`}
    >
      <div 
        className={`max-w-xs px-4 py-3 rounded-2xl relative break-words ${
          isCurrentUser 
            ? "bg-[#DBB42C] text-white" 
            : "bg-gray-100 text-gray-900"
        }`}
        style={{ wordWrap: 'break-word', overflowWrap: 'break-word' }}
      >
        {(!isCurrentUser || selected?.chatType === 'group') && (
          <p className="text-xs font-medium mb-1 opacity-80">
            {isCurrentUser ? 'You' : (msg.sender.fullName || msg.sender.username)}
          </p>
        )}
        
        <MediaRenderer msg={msg} onMediaClick={handleMediaClick} />
        
        {renderMessageContent()}
        
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
            <span className="ml-2 flex items-center">
              {msg.readBy.length > 1 ? (
                <CheckCheck className="w-3 h-3" />
              ) : (
                <Check className="w-3 h-3" />
              )}
            </span>
          )}
        </div>
        
        {isCurrentUser && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onContextMenu(msg._id, e.clientX, e.clientY);
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
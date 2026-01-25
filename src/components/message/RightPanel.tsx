import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Chat, Message } from '@/api/message';
import { ChatHeader } from './ChatHeader';
import { MessageItem } from './MessageItem';
import { MessageInput } from './MessageInput';
import { EmojiClickData } from 'emoji-picker-react';
import { useBlockedUsers } from '@/hooks/useBlockedUsers';
import { unblockUser } from '@/api/user';
import { socketManager } from '@/utils/socket';

interface RightPanelProps {
  selected: Chat;
  messages: Message[];
  user: { _id?: string } | null;
  typingUsers: Map<string, string>;
  onlineUsers: Map<string, { online: boolean; lastSeen: string | null; canSeeStatus?: boolean }>;
  getChatAvatar: (chat: Chat) => string;
  getChatDisplayName: (chat: Chat) => string;
  onProfileClick: (chat: Chat) => void;
  onBack?: () => void;
  onContextMenu: (messageId: string, x: number, y: number, timestamp?: string) => void;
  onVoiceCall?: (chat: Chat) => void;
  onVideoCall?: (chat: Chat) => void;
  isInitiatingCall?: boolean;
  onRetryMessage?: (tempId: string) => void;
  onUpdateChatTheme?: (chatId: string, themeColor: string) => void;

  // Message input props
  newMessage: string;
  setNewMessage: (message: string) => void;
  onSendMessage: (e: React.FormEvent) => void;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFileUpload: () => void;
  onRemoveFile: () => void;
  onEmojiClick: () => void;
  onEmojiSelect: (emojiData: EmojiClickData) => void;
  sendingMessage: boolean;
  uploadingFile: boolean;
  selectedFile: File | null;
  filePreview: string | null;
  showEmojiPicker: boolean;
  emojiPickerRef: React.RefObject<HTMLDivElement | null>;
  messageInputRef: React.RefObject<HTMLInputElement | null>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  messagesContainerRef: React.RefObject<HTMLDivElement | null>;
  isRequestChat?: boolean;
  loadingMessages?: boolean;
}

export const RightPanel: React.FC<RightPanelProps> = ({
  selected,
  messages,
  user,
  typingUsers,
  onlineUsers,
  getChatAvatar,
  getChatDisplayName,
  onProfileClick,
  onBack,
  onContextMenu,
  onVoiceCall,
  onVideoCall,
  isInitiatingCall = false,
  onRetryMessage,
  onUpdateChatTheme,
  newMessage,
  setNewMessage,
  onSendMessage,
  onInputChange,
  onFileSelect,
  onFileUpload,
  onRemoveFile,
  onEmojiClick,
  onEmojiSelect,
  sendingMessage,
  uploadingFile,
  selectedFile,
  filePreview,
  showEmojiPicker,
  emojiPickerRef,
  messageInputRef,
  fileInputRef,
  messagesEndRef,
  messagesContainerRef,
  isRequestChat = false,
  loadingMessages = false
}) => {
  const { isUserBlocked, removeBlockedUser } = useBlockedUsers();
  const [isUnblocking, setIsUnblocking] = useState(false);
  const previousMessageIdsRef = useRef<Set<string>>(new Set());

  // Track current theme color in local state for instant updates
  const [currentThemeColor, setCurrentThemeColor] = useState(selected.themeColor);

  // Update local theme color when selected chat changes
  useEffect(() => {
    setCurrentThemeColor(selected.themeColor);
  }, [selected._id, selected.themeColor]);

  // Check if the other participant in the chat is blocked
  const blockedUserInfo = useMemo(() => {
    if (!selected || selected.chatType !== 'direct' || !user) return null;

    const otherParticipant = selected.participants.find(p => p._id !== user._id);
    if (!otherParticipant || !isUserBlocked(otherParticipant._id)) return null;

    return {
      userId: otherParticipant._id,
      username: otherParticipant.username,
      fullName: otherParticipant.fullName,
    };
  }, [selected, user, isUserBlocked]);

  // Delivery confirmation: Emit confirm_delivery for new messages received
  useEffect(() => {
    if (!user?._id || !messages.length) return;

    // Find new messages that are not sent by current user
    const newMessageIds: string[] = [];

    messages.forEach((msg) => {
      // Skip messages sent by current user
      if (msg.sender._id === user._id) return;

      // Skip if we've already confirmed this message
      if (previousMessageIdsRef.current.has(msg._id)) return;

      // Skip temporary/optimistic messages
      if ((msg as any)._tempId || (msg as any)._sending) return;

      newMessageIds.push(msg._id);
      previousMessageIdsRef.current.add(msg._id);
    });

    // Emit delivery confirmation for new messages
    if (newMessageIds.length > 0) {
      socketManager.confirmDelivery(newMessageIds);
    }
  }, [messages, user]);

  const handleUnblock = async () => {
    if (!blockedUserInfo || isUnblocking) return;

    try {
      setIsUnblocking(true);
      await unblockUser(blockedUserInfo.userId);
      removeBlockedUser(blockedUserInfo.userId);
    } catch (error: any) {
      console.error('Error unblocking user:', error);
      alert(error?.response?.data?.message || error?.message || 'Failed to unblock user');
    } finally {
      setIsUnblocking(false);
    }
  };

  // Handle theme color change optimistically
  const handleThemeChange = (themeColor: string) => {
    // Update local state immediately for instant visual feedback
    setCurrentThemeColor(themeColor);

    // Call the parent function to update the theme color in the chats state
    if (onUpdateChatTheme) {
      onUpdateChatTheme(selected._id, themeColor);
    }
  };

  return (
    <div className="flex flex-col w-full h-full">
      <ChatHeader
        selected={{ ...selected, themeColor: currentThemeColor }}
        typingUsers={typingUsers}
        onlineStatus={Object.fromEntries(
          Array.from(onlineUsers.entries()).map(([id, status]) => [
            id,
            { ...status, canSeeStatus: status.canSeeStatus !== false }
          ])
        )}
        getChatAvatar={getChatAvatar}
        getChatDisplayName={getChatDisplayName}
        onProfileClick={onProfileClick}
        onBack={onBack}
        onVoiceCall={onVoiceCall}
        onVideoCall={onVideoCall}
        isInitiatingCall={isInitiatingCall}
        onThemeChange={handleThemeChange}
      />

      <div ref={messagesContainerRef} className="flex-1 min-h-0 overflow-y-auto p-6 bg-gray-50 pt-20 sm:pt-6 pb-36 sm:pb-32 scroll-smooth">
        {messages.length === 0 ? (
          <div className="flex justify-center items-center h-full">
            <div className="text-center">
              <div className="text-gray-500 mb-2">
                {isRequestChat ? 
                  "This is a message request. Messages will appear here once you accept the request." : 
                  "No messages yet. Start a conversation!"
                }
              </div>
              {isRequestChat && (
                <div className="text-sm text-orange-600">
                  💬 Check the message requests tab to accept this conversation
                </div>
              )}
            </div>
          </div>
        ) : loadingMessages && messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-400">
              <svg className="animate-spin h-8 w-8 mx-auto mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Loading messages...
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageItem
              key={(msg as any)._tempId || msg._id}
              msg={msg}
              isCurrentUser={msg.sender._id === user?._id}
              selected={selected}
              user={user}
              onContextMenu={onContextMenu}
              onRetry={onRetryMessage}
              themeColor={currentThemeColor}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {isRequestChat ? (
        <div className="p-4 border-t bg-orange-50 border-orange-200">
          <div className="flex items-center justify-center">
            <div className="bg-orange-100 border border-orange-300 rounded-lg p-3 text-center">
              <p className="text-orange-800 font-medium text-sm">
                📩 This is a message request. Accept or decline to continue.
              </p>
              <p className="text-orange-600 text-xs mt-1">
                You can read the messages above, but cannot reply until you accept the request.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <MessageInput
          newMessage={newMessage}
          setNewMessage={setNewMessage}
          onSendMessage={onSendMessage}
          onInputChange={onInputChange}
          onFileSelect={onFileSelect}
          onFileUpload={onFileUpload}
          onRemoveFile={onRemoveFile}
          onEmojiClick={onEmojiClick}
          onEmojiSelect={onEmojiSelect}
          sendingMessage={sendingMessage}
          uploadingFile={uploadingFile}
          selectedFile={selectedFile}
          filePreview={filePreview}
          showEmojiPicker={showEmojiPicker}
          emojiPickerRef={emojiPickerRef}
          messageInputRef={messageInputRef}
          fileInputRef={fileInputRef}
          isBlocked={!!blockedUserInfo}
          blockedUserInfo={blockedUserInfo ? {
            username: blockedUserInfo.username,
            onUnblock: handleUnblock,
            isUnblocking: isUnblocking
          } : undefined}
        />
      )}
    </div>
  );
};
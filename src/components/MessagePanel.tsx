"use client";
import React, { useRef } from "react";
import { useUserStore } from "@/store/useUserStore";
import { messageAPI, Chat } from "@/api/message";
import { EmojiClickData } from 'emoji-picker-react';

// Custom hooks
import { useChatManagement } from '@/hooks/useChatManagement';
import { useMessageManagement } from '@/hooks/useMessageManagement';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useModalState } from '@/hooks/useModalState';
import { useSocket } from '@/hooks/useSocket';
import { useVideoCall } from '@/hooks/useVideoCall';

// Components
import { LeftPanel } from './message/LeftPanel';
import { RightPanel } from './message/RightPanel';
import { EmptyState } from './message/EmptyState';
import { ContextMenu } from './message/ContextMenu';
import { NewChatModal } from './message/NewChatModal';
import { GroupChatModal } from './message/GroupChatModal';
import { GroupDetailsModal } from './message/GroupDetailsModal';

export default function MessagePanel() {
  const user = useUserStore((state) => state.user);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  // Chat management
  const {
    chats,
    setChats,
    messageRequests,
    setMessageRequests,
    selectedChat,
    setSelectedChat,
    loading,
    searchQuery,
    setSearchQuery,
    activeTab,
    setActiveTab,
    setAllChatsCache,
    selected,
    filteredChats,
    directUnreadCount,
    groupUnreadCount,
    followingUsers,
    loadingFollowing,
    loadFollowingUsers,
    createChatWithUser,
    handleAcceptRequest,
    handleDeclineRequest,
    handleProfileClick,
    getChatDisplayName,
    getChatAvatar,
    formatTime,
    isIncomingRequest,
    viewedRequests,
    markRequestAsViewed,
    refreshChatsWithAccurateUnreadCounts,
    markChatAsRead
  } = useChatManagement({ user });

  // Message management
  const {
    messages,
    setMessages,
    sendingMessage,
    newMessage,
    setNewMessage,
    typingUsers,
    setTypingUsers,
    showContextMenu,
    setShowContextMenu,
    isRequestChat,
    loadingMessages,
    messagesEndRef,
    messageInputRef,
    messagesContainerRef,
    handleSendMessage,
    handleDeleteMessage,
    handleInputChange,
    scrollToBottom,
    retryMessage
  } = useMessageManagement({ selectedChat, user, setChats, messageRequests, viewedRequests, markRequestAsViewed, refreshChatsWithAccurateUnreadCounts, markChatAsRead });

  // File upload
  const {
    selectedFile,
    filePreview,
    uploadingFile,
    fileInputRef,
    handleFileSelect,
    handleRemoveFile,
    handleFileUpload,
    handleSendFileMessage
  } = useFileUpload({
    selectedChat,
    newMessage,
    setNewMessage,
    setMessages,
    setChats,
    scrollToBottom,
    messageInputRef
  });

  // Modal state
  const {
    showNewChatModal,
    setShowNewChatModal,
    showGroupModal,
    showGroupDetails,
    setShowGroupDetails,
    showEmojiPicker,
    groupName,
    setGroupName,
    groupDescription,
    setGroupDescription,
    selectedGroupMembers,
    handleNewChat,
    handleNewGroup,
    handleEmojiClick,
    toggleGroupMember,
    closeGroupModal
  } = useModalState();

  // Socket management
  useSocket({
    selectedChat,
    user,
    chats,
    messageRequests,
    setChats,
    setMessageRequests,
    setAllChatsCache,
    setMessages,
    setTypingUsers,
    scrollToBottom,
    isIncomingRequest
  });

  // Video call management
  const {
    isVideoCallOpen,
    incomingCall,
    currentCall,
    streamToken,
    isInitiating,
    initiateCall,
    acceptCall,
    declineCall,
    endCall
  } = useVideoCall({ user });

  // Handle emoji selection
  const onEmojiClick = (emojiData: EmojiClickData) => {
    setNewMessage(prev => prev + emojiData.emoji);
    messageInputRef.current?.focus();
  };

  // Handle form submission (either text or file message)
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedFile) {
      await handleSendFileMessage();
    } else {
      await handleSendMessage(e);
    }
  };

  // Create group chat
  const createGroupChat = async () => {
    try {
      if (!user || !groupName.trim() || selectedGroupMembers.length === 0) return;
      
      const participants = [user._id, ...selectedGroupMembers];
      const chat = await messageAPI.createChat(participants, 'group', groupName.trim(), groupDescription.trim() || undefined);
      
      setChats(prev => [chat, ...prev]);
      setSelectedChat(chat._id);
      closeGroupModal();
      setActiveTab('group');
    } catch (error) {
      console.error('Failed to create group chat:', error);
    }
  };

  // Handle new group with loading following users
  const handleNewGroupWithLoad = () => {
    handleNewGroup();
    loadFollowingUsers();
  };

  // Handle new chat with loading following users
  const handleNewChatWithLoad = () => {
    handleNewChat();
    loadFollowingUsers();
  };

  // Handle creating chat with user and closing modal
  const handleCreateChatWithUser = async (selectedUser: any) => {
    await createChatWithUser(selectedUser);
    setShowNewChatModal(false);
  };

  return (
    <div className="flex w-full h-screen">
      <LeftPanel
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        directUnreadCount={directUnreadCount}
        groupUnreadCount={groupUnreadCount}
        requestCount={messageRequests.length}
        onNewChat={handleNewChatWithLoad}
        onNewGroup={handleNewGroupWithLoad}
        chats={filteredChats}
        selectedChat={selectedChat}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        setSelectedChat={setSelectedChat}
        getChatAvatar={getChatAvatar}
        getChatDisplayName={getChatDisplayName}
        formatTime={formatTime}
        onAcceptRequest={handleAcceptRequest}
        onDeclineRequest={handleDeclineRequest}
        loading={loading}
      />

      <div className={`flex-1 min-h-0 flex ${selected ? 'flex-col' : 'items-center justify-center'} bg-gray-50 ${selected ? 'flex' : 'hidden'} sm:flex overflow-hidden`}>
        {selected ? (
          <RightPanel
            selected={selected}
            messages={messages}
            user={user}
            typingUsers={typingUsers}
            getChatAvatar={getChatAvatar}
            getChatDisplayName={getChatDisplayName}
            onProfileClick={(chat) => handleProfileClick(chat, setShowGroupDetails)}
            onBack={() => setSelectedChat(null)}
            onContextMenu={(messageId, x, y) => setShowContextMenu({ messageId, x, y })}
            onRetryMessage={retryMessage}
            newMessage={newMessage}
            setNewMessage={setNewMessage}
            onSendMessage={handleFormSubmit}
            onInputChange={handleInputChange}
            onFileSelect={handleFileSelect}
            onFileUpload={handleFileUpload}
            onRemoveFile={handleRemoveFile}
            onEmojiClick={handleEmojiClick}
            onEmojiSelect={onEmojiClick}
            sendingMessage={sendingMessage}
            uploadingFile={uploadingFile}
            selectedFile={selectedFile}
            filePreview={filePreview}
            showEmojiPicker={showEmojiPicker}
            emojiPickerRef={emojiPickerRef}
            messageInputRef={messageInputRef}
            fileInputRef={fileInputRef}
            messagesEndRef={messagesEndRef}
            messagesContainerRef={messagesContainerRef}
            isRequestChat={isRequestChat}
            loadingMessages={loadingMessages}
            onVoiceCall={(chat) => initiateCall(chat, 'voice')}
            onVideoCall={(chat) => initiateCall(chat, 'video')}
            isInitiatingCall={isInitiating}
          />
        ) : (
          <EmptyState onNewChat={handleNewChatWithLoad} />
        )}
      </div>

      {showContextMenu && (
        <ContextMenu
          messageId={showContextMenu.messageId}
          x={showContextMenu.x}
          y={showContextMenu.y}
          onDelete={handleDeleteMessage}
          onClose={() => setShowContextMenu(null)}
        />
      )}

      <NewChatModal
        show={showNewChatModal}
        onClose={() => setShowNewChatModal(false)}
        followingUsers={followingUsers}
        loadingFollowing={loadingFollowing}
        onCreateChat={handleCreateChatWithUser}
      />

      <GroupChatModal
        show={showGroupModal}
        onClose={closeGroupModal}
        groupName={groupName}
        setGroupName={setGroupName}
        groupDescription={groupDescription}
        setGroupDescription={setGroupDescription}
        selectedGroupMembers={selectedGroupMembers}
        toggleGroupMember={toggleGroupMember}
        followingUsers={followingUsers}
        loadingFollowing={loadingFollowing}
        onCreate={createGroupChat}
      />

      <GroupDetailsModal
        show={showGroupDetails}
        onClose={() => setShowGroupDetails(false)}
        selected={selected!}
        getChatAvatar={getChatAvatar}
        getChatDisplayName={getChatDisplayName}
        user={user}
      />

      {/* Call modals are now handled globally by GlobalCallProvider */}

    </div>
  );
}
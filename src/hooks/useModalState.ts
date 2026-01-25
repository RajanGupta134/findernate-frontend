import { useState } from 'react';

export const useModalState = () => {
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showGroupDetails, setShowGroupDetails] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  // Group chat form state
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<string[]>([]);

  const handleNewChat = () => {
    setShowNewChatModal(true);
  };

  const handleNewGroup = () => {
    setShowGroupModal(true);
  };

  const handleEmojiClick = () => {
    setShowEmojiPicker(!showEmojiPicker);
  };

  const toggleGroupMember = (userId: string) => {
    setSelectedGroupMembers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const resetGroupForm = () => {
    setGroupName("");
    setGroupDescription("");
    setSelectedGroupMembers([]);
  };

  const closeGroupModal = () => {
    setShowGroupModal(false);
    resetGroupForm();
  };

  return {
    // Modal states
    showNewChatModal,
    setShowNewChatModal,
    showGroupModal,
    setShowGroupModal,
    showGroupDetails,
    setShowGroupDetails,
    showEmojiPicker,
    setShowEmojiPicker,
    
    // Group form state
    groupName,
    setGroupName,
    groupDescription,
    setGroupDescription,
    selectedGroupMembers,
    setSelectedGroupMembers,
    
    // Functions
    handleNewChat,
    handleNewGroup,
    handleEmojiClick,
    toggleGroupMember,
    resetGroupForm,
    closeGroupModal
  };
};
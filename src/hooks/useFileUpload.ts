import { useState, useRef } from 'react';
import { messageAPI, Chat } from '@/api/message';

interface UseFileUploadProps {
  selectedChat: string | null;
  newMessage: string;
  setNewMessage: (message: string) => void;
  setMessages: React.Dispatch<React.SetStateAction<any[]>>;
  setChats: React.Dispatch<React.SetStateAction<Chat[]>>;
  scrollToBottom: () => void;
  messageInputRef?: React.RefObject<HTMLInputElement | null>;
}

export const useFileUpload = ({
  selectedChat,
  newMessage,
  setNewMessage,
  setMessages,
  setChats,
  scrollToBottom,
  messageInputRef
}: UseFileUploadProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Restrict to images and videos only
    if (!(file.type.startsWith('image/') || file.type.startsWith('video/'))) {
      alert('Only image and video files are allowed.');
      return;
    }

    // Check file size (limit to 50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      alert('File size should not exceed 50MB');
      return;
    }

    setSelectedFile(file);

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFilePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }

    // Clear the input value so the same file can be selected again
    if (e.target) {
      e.target.value = '';
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
  };

  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  // Send file message
  const handleSendFileMessage = async () => {
    if (!selectedFile || !selectedChat || uploadingFile) return;

    // Keep the input focused before clearing (prevents keyboard close on mobile)
    messageInputRef?.current?.focus();

    try {
      setUploadingFile(true);
      const message = await messageAPI.sendMessageWithFile(
        selectedChat,
        selectedFile,
        newMessage.trim() || undefined
      );

      // Add message immediately from API response
      setMessages(prev => {
        const messageExists = prev.some(msg => msg._id === message._id);
        if (messageExists) return prev;
        return [...prev, message];
      });

      // Update chat list
      setChats(prev => {
        const updatedChats = prev.map(chat =>
          chat._id === selectedChat
            ? {
                ...chat,
                lastMessage: {
                  sender: message.sender._id,
                  message: message.message,
                  timestamp: message.timestamp
                },
                lastMessageAt: message.timestamp
              }
            : chat
        );
        return updatedChats.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
      });

      // Clear file and message
      setSelectedFile(null);
      setFilePreview(null);

      // Clear input via DOM directly to avoid re-render that
      // would dismiss the mobile keyboard.
      if (messageInputRef?.current) {
        messageInputRef.current.value = '';
      }
      setNewMessage("");

      scrollToBottom();

      // Keep input focused after sending (like WhatsApp)
      messageInputRef?.current?.focus({ preventScroll: true });
      
    } catch (error: any) {
      console.error('Failed to send file:', error);
      console.error('Error response data:', error.response?.data);
      console.error('Error status:', error.response?.status);
      
      const errorMessage = error.response?.data?.message || 'Failed to send file. Please try again.';
      alert(`Failed to send file: ${errorMessage}`);
    } finally {
      setUploadingFile(false);
    }
  };

  return {
    selectedFile,
    filePreview,
    uploadingFile,
    fileInputRef,
    handleFileSelect,
    handleRemoveFile,
    handleFileUpload,
    handleSendFileMessage
  };
};
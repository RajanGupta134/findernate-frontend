import React from 'react';
import { MessageSquare } from 'lucide-react';

interface EmptyStateProps {
  onNewChat: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ onNewChat }) => {
  return (
    <div className="text-center">
      <MessageSquare className="mx-auto mb-4 w-10 h-10 text-gray-400" />
      <h3 className="text-xl font-semibold text-gray-800">Select a conversation</h3>
      <p className="text-gray-500 mt-1">Choose a conversation to start messaging</p>
      <button 
        onClick={onNewChat}
        className="mt-4 bg-button-gradient text-black px-4 py-2 rounded-lg hover:bg-yellow-500 cursor-pointer"
      >
        Start New Chat
      </button>
    </div>
  );
};
import React from 'react';
import Image from 'next/image';
import { MessageSquare } from 'lucide-react';

interface NewChatModalProps {
  show: boolean;
  onClose: () => void;
  followingUsers: any[];
  loadingFollowing: boolean;
  onCreateChat: (user: any) => void;
}

export const NewChatModal: React.FC<NewChatModalProps> = ({
  show,
  onClose,
  followingUsers,
  loadingFollowing,
  onCreateChat
}) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/40 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Start New Chat</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loadingFollowing ? (
            <div className="flex justify-center items-center py-8">
              <div className="text-gray-500">Loading your following...</div>
            </div>
          ) : followingUsers.length === 0 ? (
            <div className="flex justify-center items-center py-8">
              <div className="text-gray-500">You&apos;re not following anyone yet</div>
            </div>
          ) : (
            <div className="space-y-3">
              {followingUsers.filter(followingUser => followingUser && followingUser._id).map((followingUser) => (
                <div
                  key={followingUser._id}
                  onClick={() => onCreateChat(followingUser)}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <Image
                    src={followingUser.profileImageUrl || '/placeholderimg.png'}
                    alt={followingUser.fullName || followingUser.username}
                    width={40}
                    height={40}
                    className="rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      {followingUser.fullName || followingUser.username}
                    </p>
                    {followingUser.username && followingUser.fullName && (
                      <p className="text-sm text-gray-500">@{followingUser.username}</p>
                    )}
                  </div>
                  <MessageSquare className="w-5 h-5 text-gray-400" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
import React from 'react';
import Image from 'next/image';

interface GroupChatModalProps {
  show: boolean;
  onClose: () => void;
  groupName: string;
  setGroupName: (name: string) => void;
  groupDescription: string;
  setGroupDescription: (description: string) => void;
  selectedGroupMembers: string[];
  toggleGroupMember: (userId: string) => void;
  followingUsers: any[];
  loadingFollowing: boolean;
  onCreate: () => void;
}

export const GroupChatModal: React.FC<GroupChatModalProps> = ({
  show,
  onClose,
  groupName,
  setGroupName,
  groupDescription,
  setGroupDescription,
  selectedGroupMembers,
  toggleGroupMember,
  followingUsers,
  loadingFollowing,
  onCreate
}) => {
  if (!show) return null;

  const handleClose = () => {
    onClose();
    setGroupName("");
    setGroupDescription("");
  };

  return (
    <div className="fixed inset-0 bg-black/40 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Create Group Chat</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-6 border-b">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Group Name *
                </label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Enter group name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-black placeholder-gray-400"
                  maxLength={50}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={groupDescription}
                  onChange={(e) => setGroupDescription(e.target.value)}
                  placeholder="Enter group description"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-black placeholder-gray-400"
                  maxLength={200}
                />
              </div>
            </div>
          </div>

          <div className="p-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              Select Members ({selectedGroupMembers.length} selected)
            </h3>
            {loadingFollowing ? (
              <div className="flex justify-center items-center py-8">
                <div className="text-gray-500">Loading your following...</div>
              </div>
            ) : followingUsers.length === 0 ? (
              <div className="flex justify-center items-center py-8">
                <div className="text-gray-500">You're not following anyone yet</div>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {followingUsers.filter(followingUser => followingUser && followingUser._id).map((followingUser) => (
                  <label
                    key={followingUser._id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedGroupMembers.includes(followingUser._id)}
                      onChange={() => toggleGroupMember(followingUser._id)}
                      className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500"
                    />
                    <Image
                      src={followingUser.profileImageUrl || '/placeholderimg.png'}
                      alt={followingUser.fullName || followingUser.username}
                      width={32}
                      height={32}
                      className="rounded-full object-cover"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 text-sm">
                        {followingUser.fullName || followingUser.username}
                      </p>
                      {followingUser.username && followingUser.fullName && (
                        <p className="text-xs text-gray-500">@{followingUser.username}</p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onCreate}
            disabled={!groupName.trim() || selectedGroupMembers.length === 0}
            className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Create Group
          </button>
        </div>
      </div>
    </div>
  );
};
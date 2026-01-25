import React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Chat } from '@/api/message';

interface GroupDetailsModalProps {
  show: boolean;
  onClose: () => void;
  selected: Chat;
  getChatAvatar: (chat: Chat) => string;
  getChatDisplayName: (chat: Chat) => string;
  user: any;
}

export const GroupDetailsModal: React.FC<GroupDetailsModalProps> = ({
  show,
  onClose,
  selected,
  getChatAvatar,
  getChatDisplayName,
  user
}) => {
  const router = useRouter();

  if (!show || !selected || selected.chatType !== 'group') return null;

  const handleMemberClick = (participant: any) => {
    if (!participant || !participant.username) return;
    
    if (participant._id === user?._id) {
      // Navigate to own profile
      router.push('/profile');
    } else {
      // Navigate to other user's profile
      router.push(`/userprofile/${participant.username}`);
    }
    
    // Close the modal after navigation
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Group Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-6 border-b">
            <div className="flex items-center space-x-4 mb-4">
              <Image
                src={getChatAvatar(selected)}
                alt={getChatDisplayName(selected)}
                width={60}
                height={60}
                className="rounded-full object-cover"
              />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{getChatDisplayName(selected)}</h3>
                <p className="text-sm text-gray-500">{selected.participants.length} members</p>
              </div>
            </div>
            {selected.groupDescription && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Description</h4>
                <p className="text-sm text-gray-600">{selected.groupDescription}</p>
              </div>
            )}
          </div>

          <div className="p-6">
            <h4 className="text-sm font-medium text-gray-700 mb-4">Members ({selected.participants.length})</h4>
            <div className="space-y-3">
              {selected.participants.filter(participant => participant && participant._id).map((participant) => (
                <div 
                  key={participant._id} 
                  className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
                  onClick={() => handleMemberClick(participant)}
                >
                  <Image
                    src={participant.profileImageUrl || '/placeholderimg.png'}
                    alt={participant.fullName || participant.username}
                    width={40}
                    height={40}
                    className="rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      {participant.fullName || participant.username}
                      {participant._id === user?._id && (
                        <span className="text-xs text-gray-500 ml-2">(You)</span>
                      )}
                      {selected.admins?.includes(participant._id) && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full ml-2">Admin</span>
                      )}
                      {participant._id === selected.createdBy?._id && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full ml-2">Creator</span>
                      )}
                    </p>
                    {participant.username && participant.fullName && (
                      <p className="text-sm text-gray-500">@{participant.username}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
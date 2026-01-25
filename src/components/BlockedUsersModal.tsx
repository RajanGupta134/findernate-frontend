"use client";

import React, { useState, useEffect } from 'react';
import { X, UserMinus } from 'lucide-react';
import Image from 'next/image';
import { getBlockedUsers, unblockUser } from '@/api/user';
import { useRouter } from 'next/navigation';

interface BlockedUser {
  blockedUserId: string;
  fullName: string;
  username: string;
  profileImage?: string;
  blockedAt: string;
  reason?: string;
}

interface BlockedUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const BlockedUsersModal: React.FC<BlockedUsersModalProps> = ({
  isOpen,
  onClose
}) => {
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [unblockingUserId, setUnblockingUserId] = useState<string | null>(null);
  const router = useRouter();

  const getInitials = (name: string) => {
    if (!name || typeof name !== 'string') return '??';
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const fetchBlockedUsers = async () => {
    try {
      setLoading(true);
      const blockedUsersData = await getBlockedUsers();
      setBlockedUsers(blockedUsersData || []);
    } catch (error) {
      console.error('Error fetching blocked users:', error);
      setBlockedUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUnblock = async (blockedUserId: string) => {
    if (unblockingUserId) return; // Prevent multiple concurrent unblock operations
    
    try {
      setUnblockingUserId(blockedUserId);
      await unblockUser(blockedUserId);
      
      // Remove the user from the blocked users list
      setBlockedUsers(prev => prev.filter(user => user.blockedUserId !== blockedUserId));
    } catch (error: any) {
      console.error('Error unblocking user:', error);
      
      // Show user-friendly error message
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to unblock user';
      alert(errorMessage);
    } finally {
      setUnblockingUserId(null);
    }
  };

  const handleUserClick = (username: string) => {
    if (!username) return;
    onClose();
    router.push(`/userprofile/${username}`);
  };

  useEffect(() => {
    if (isOpen) {
      fetchBlockedUsers();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Blocked Users</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600"></div>
            </div>
          ) : blockedUsers.length === 0 ? (
            <div className="text-center py-8 px-4">
              <div className="text-gray-500 text-sm">
                You haven't blocked anyone yet.
              </div>
            </div>
          ) : (
            <div className="py-2">
              {blockedUsers.map((user) => (
                <div key={user.blockedUserId} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div
                      className="cursor-pointer"
                      onClick={() => handleUserClick(user.username)}
                    >
                      {user.profileImage ? (
                        <Image
                          src={user.profileImage}
                          alt={user.fullName}
                          width={40}
                          height={40}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600 flex items-center justify-center text-white font-bold text-sm">
                          {getInitials(user.fullName)}
                        </div>
                      )}
                    </div>
                    
                    <div className="min-w-0 flex-1">
                      <div
                        className="cursor-pointer"
                        onClick={() => handleUserClick(user.username)}
                      >
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {user.fullName}
                        </p>
                        <p className="text-sm text-gray-500 truncate">
                          @{user.username}
                        </p>
                        {user.reason && (
                          <p className="text-xs text-gray-400 truncate mt-1">
                            Reason: {user.reason}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Unblock Button */}
                  <button
                    onClick={() => handleUnblock(user.blockedUserId)}
                    disabled={unblockingUserId === user.blockedUserId}
                    className="ml-2 px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded-md font-medium flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {unblockingUserId === user.blockedUserId ? (
                      <div className="w-4 h-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    ) : (
                      <>
                        <UserMinus className="w-4 h-4" />
                        Unblock
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BlockedUsersModal;
"use client";

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import Image from 'next/image';
import { getFollowers, getFollowing } from '@/api/user';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/store/useUserStore';

interface User {
  _id: string;
  username: string;
  fullName: string;
  profileImageUrl?: string;
  isFollowing?: boolean;
}

interface FollowersModalProps {
  userId: string;
  username: string;
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'followers' | 'following';
}

const FollowersModal: React.FC<FollowersModalProps> = ({
  userId,
  username,
  isOpen,
  onClose,
  initialTab = 'followers'
}) => {
  const [activeTab, setActiveTab] = useState<'followers' | 'following'>(initialTab);
  const [followers, setFollowers] = useState<User[]>([]);
  const [following, setFollowing] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { user: currentUser } = useUserStore();

  // Update activeTab when initialTab prop changes
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const getInitials = (name: string) => {
    if (!name || typeof name !== 'string') return '??';
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const fetchFollowers = async () => {
    try {
      //console.log("=== DEBUG: Fetching followers for userId:", userId);
      setLoading(true);
      const followersData = await getFollowers(userId);
      //console.log("=== DEBUG: Followers data received:", followersData);
      //console.log("=== DEBUG: Followers data type:", typeof followersData);
      //console.log("=== DEBUG: Is followers data array?", Array.isArray(followersData));
      setFollowers(followersData || []);
    } catch (error) {
      console.error('Error fetching followers:', error);
      setFollowers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchFollowing = async () => {
    try {
      //console.log("=== DEBUG: Fetching following for userId:", userId);
      setLoading(true);
      const followingData = await getFollowing(userId);
      //console.log("=== DEBUG: Following data received:", followingData);
      //console.log("=== DEBUG: Following data type:", typeof followingData);
      //console.log("=== DEBUG: Is following data array?", Array.isArray(followingData));
      setFollowing(followingData || []);
    } catch (error) {
      console.error('Error fetching following:', error);
      setFollowing([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (activeTab === 'followers') {
        fetchFollowers();
      } else {
        fetchFollowing();
      }
    }
  }, [isOpen, activeTab, userId]);

  const handleTabChange = (tab: 'followers' | 'following') => {
    setActiveTab(tab);
  };

  const handleUserClick = (clickedUsername: string) => {
    if (!clickedUsername) return;
    onClose();
    router.push(`/userprofile/${clickedUsername}`);
  };

  if (!isOpen) return null;

  const currentList = Array.isArray(activeTab === 'followers' ? followers : following) 
    ? (activeTab === 'followers' ? followers : following) 
    : [];

  //console.log("=== DEBUG: FollowersModal render:", {
  //  isOpen,
  //  activeTab,
  //  followersLength: followers.length,
  //  followingLength: following.length,
  //  currentListLength: currentList.length,
  //  loading
  // });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 bg-opacity-50">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md max-h-[80vh] mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            @{username}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => handleTabChange('following')}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
              activeTab === 'following'
                ? 'text-yellow-600 border-b-2 border-yellow-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Following
          </button>
          <button
            onClick={() => handleTabChange('followers')}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
              activeTab === 'followers'
                ? 'text-yellow-600 border-b-2 border-yellow-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Followers
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-96">
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
            </div>
          ) : currentList.length === 0 ? (
            <div className="flex justify-center items-center py-8">
              <p className="text-gray-500">
                No {activeTab} yet
              </p>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {currentList.filter(user => user && user._id).map((user) => (
                <div key={user._id} className="flex items-center">
                  <div 
                    className="flex items-center gap-3 cursor-pointer flex-1"
                    onClick={() => handleUserClick(user.username)}
                  >
                    {user.profileImageUrl ? (
                      <Image
                        src={user.profileImageUrl}
                        alt={user.fullName}
                        width={40}
                        height={40}
                        className="rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-yellow-500 flex items-center justify-center text-white font-medium text-sm">
                        {getInitials(user.fullName || user.username || 'User')}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {user.fullName || user.username || 'Unknown User'}
                      </p>
                      <p className="text-sm text-gray-500 truncate">
                        @{user.username || 'unknown'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FollowersModal;
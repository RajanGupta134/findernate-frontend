'use client';

import React, { useState, useEffect } from 'react';
import PrivateProfileView from './PrivateProfileView';
import EnhancedFollowButton from './EnhancedFollowButton';
import ProfilePostsSection from './ProfilePostsSection';
import { useUserStore } from '@/store/useUserStore';

interface PrivacyAwareProfileProps {
  userData: {
    _id: string;
    username: string;
    fullName: string;
    profileImageUrl?: string;
    privacy: 'public' | 'private';
    isFullPrivate?: boolean;
    bio?: string;
    followers?: any[];
    following?: any[];
    posts?: any[];
  };
  posts?: any[];
  reels?: any[];
  videos?: any[];
  savedPosts?: any[];
  isFollowing?: boolean;
  isPending?: boolean;
  onFollowStateChange?: (newState: { isFollowing: boolean; isPending: boolean }) => void;
}

const PrivacyAwareProfile: React.FC<PrivacyAwareProfileProps> = ({
  userData,
  posts = [],
  reels = [],
  videos = [],
  savedPosts = [],
  isFollowing = false,
  isPending = false,
  onFollowStateChange
}) => {
  const { user } = useUserStore();
  const [currentFollowState, setCurrentFollowState] = useState({
    isFollowing,
    isPending
  });

  const isOwnProfile = user?._id === userData._id;
  const canViewContent = isOwnProfile || userData.privacy === 'public' || currentFollowState.isFollowing;

  const handleFollowStateChange = (newState: { isFollowing: boolean; isPending: boolean }) => {
    setCurrentFollowState(newState);
    onFollowStateChange?.(newState);
  };

  // If private account and user is not following and it's not their own profile
  if (userData.privacy === 'private' && !isOwnProfile && !currentFollowState.isFollowing) {
    return (
      <PrivateProfileView
        userData={userData}
        isFollowing={currentFollowState.isFollowing}
        isPending={currentFollowState.isPending}
        isOwnProfile={isOwnProfile}
        onFollowStateChange={handleFollowStateChange}
      />
    );
  }

  // Public profile or authorized to view content
  return (
    <div className="space-y-6">
      {/* Regular Profile Header */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center">
              {userData.profileImageUrl ? (
                <img
                  src={userData.profileImageUrl}
                  alt={userData.fullName}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <span className="text-2xl font-semibold text-gray-500">
                  {userData.fullName.charAt(0)}
                </span>
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">{userData.fullName}</h1>
              <p className="text-gray-600">@{userData.username}</p>
              {userData.privacy === 'private' && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800 mt-1">
                  🔒 Private Account
                </span>
              )}
            </div>
          </div>

          {/* Follow Button for other users */}
          {!isOwnProfile && (
            <EnhancedFollowButton
              userId={userData._id}
              username={userData.username}
              fullName={userData.fullName}
              isFollowing={currentFollowState.isFollowing}
              isPending={currentFollowState.isPending}
              targetUserPrivacy={userData.privacy}
              onFollowStateChange={handleFollowStateChange}
            />
          )}
        </div>

        {/* Bio */}
        {userData.bio && (
          <p className="text-gray-700 mb-4">{userData.bio}</p>
        )}

        {/* Stats */}
        <div className="flex space-x-6">
          <div className="text-center">
            <div className="text-xl font-semibold text-gray-800">
              {posts.length}
            </div>
            <div className="text-sm text-gray-600">Posts</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-semibold text-gray-800">
              {userData.followers?.length || 0}
            </div>
            <div className="text-sm text-gray-600">Followers</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-semibold text-gray-800">
              {userData.following?.length || 0}
            </div>
            <div className="text-sm text-gray-600">Following</div>
          </div>
        </div>
      </div>

      {/* Posts Section - Only show if user can view content */}
      {canViewContent && (
        <ProfilePostsSection
          PostCard={() => <div>Post Component</div>} // Replace with your actual PostCard component
          posts={posts}
          reels={reels}
          videos={videos}
          savedPosts={isOwnProfile ? savedPosts : []} // Only show saved posts for own profile
          isOtherUser={!isOwnProfile}
          isFullPrivate={userData.isFullPrivate || false}
        />
      )}

      {/* Private content message for followers of private accounts */}
      {userData.privacy === 'private' && !isOwnProfile && currentFollowState.isFollowing && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800 text-sm text-center">
            You're following this private account
          </p>
        </div>
      )}
    </div>
  );
};

export default PrivacyAwareProfile;
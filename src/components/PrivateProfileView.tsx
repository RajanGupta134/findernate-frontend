'use client';

import React from 'react';
import { Lock, Users, Grid3X3, User } from 'lucide-react';
import Image from 'next/image';
import EnhancedFollowButton from './EnhancedFollowButton';

interface PrivateProfileViewProps {
  userData: {
    _id: string;
    username: string;
    fullName: string;
    profileImageUrl?: string;
    privacy: 'public' | 'private';
    bio?: string;
    followers?: any[];
    following?: any[];
    posts?: any[];
  };
  isFollowing?: boolean;
  isPending?: boolean;
  isOwnProfile?: boolean;
  onFollowStateChange?: (newState: { isFollowing: boolean; isPending: boolean }) => void;
}

const PrivateProfileView: React.FC<PrivateProfileViewProps> = ({
  userData,
  isFollowing = false,
  isPending = false,
  isOwnProfile = false,
  onFollowStateChange
}) => {
  // If it's a public account or user's own profile, don't show private view
  if (userData.privacy !== 'private' || isOwnProfile || isFollowing) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-100 to-gray-200 px-6 py-8">
        <div className="flex flex-col items-center">
          {/* Profile Image */}
          <div className="relative w-24 h-24 mb-4">
            {userData.profileImageUrl ? (
              <Image
                src={userData.profileImageUrl}
                alt={userData.fullName}
                fill
                className="rounded-full object-cover border-4 border-white shadow-lg"
              />
            ) : (
              <div className="w-full h-full bg-gray-300 rounded-full flex items-center justify-center border-4 border-white shadow-lg">
                <User className="w-12 h-12 text-gray-500" />
              </div>
            )}
          </div>

          {/* Basic Info */}
          <h1 className="text-2xl font-bold text-gray-800 mb-1">{userData.fullName}</h1>
          <p className="text-gray-600 mb-3">@{userData.username}</p>

          {/* Privacy Badge */}
          <div className="flex items-center space-x-2 bg-gray-800 text-white px-3 py-1 rounded-full text-sm mb-4">
            <Lock className="w-4 h-4" />
            <span>Private Account</span>
          </div>

          {/* Follow Button */}
          <EnhancedFollowButton
            userId={userData._id}
            username={userData.username}
            fullName={userData.fullName}
            isFollowing={isFollowing}
            isPending={isPending}
            targetUserPrivacy={userData.privacy}
            onFollowStateChange={onFollowStateChange}
            className="mb-4"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="px-6 py-4 border-b">
        <div className="flex justify-around text-center">
          <div>
            <div className="text-lg font-semibold text-gray-800">
              {userData.posts?.length || 0}
            </div>
            <div className="text-sm text-gray-600">Posts</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-gray-800">
              {userData.followers?.length || 0}
            </div>
            <div className="text-sm text-gray-600">Followers</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-gray-800">
              {userData.following?.length || 0}
            </div>
            <div className="text-sm text-gray-600">Following</div>
          </div>
        </div>
      </div>

      {/* Private Content Message */}
      <div className="p-8 text-center">
        <div className="flex flex-col items-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Lock className="w-10 h-10 text-gray-400" />
          </div>

          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            This Account is Private
          </h3>

          <p className="text-gray-600 text-center mb-4 max-w-sm">
            Follow this account to see their photos, videos, and other content.
          </p>

          {isPending && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <p className="text-yellow-800 text-sm text-center">
                Your follow request is pending approval
              </p>
            </div>
          )}

          {/* Visual representation of hidden content */}
          <div className="grid grid-cols-3 gap-2 w-40 mt-4">
            {[...Array(9)].map((_, index) => (
              <div
                key={index}
                className="aspect-square bg-gray-200 rounded-lg flex items-center justify-center"
              >
                <Grid3X3 className="w-6 h-6 text-gray-400" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivateProfileView;
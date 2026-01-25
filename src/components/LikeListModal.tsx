"use client";

import React, { useState, useEffect } from 'react';
import { X, Heart } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

interface User {
  _id: string;
  username: string;
  fullName: string;
  profileImageUrl?: string;
  isVerified?: boolean;
}

interface LikeListModalProps {
  postId: string;
  isOpen: boolean;
  onClose: () => void;
  initialLikes?: User[]; // Pre-loaded likes if available
}

const LikeListModal: React.FC<LikeListModalProps> = ({
  postId,
  isOpen,
  onClose,
  initialLikes = []
}) => {
  const [likes, setLikes] = useState<User[]>(initialLikes);
  const [loading, setLoading] = useState(false);
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

  useEffect(() => {
    if (isOpen && initialLikes.length > 0) {
      setLikes(initialLikes);
    }
  }, [isOpen, initialLikes]);

  const handleUserClick = (clickedUsername: string) => {
    if (!clickedUsername) return;
    onClose();
    router.push(`/userprofile/${clickedUsername}`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 bg-opacity-50">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md max-h-[80vh] mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-500 fill-current" />
            <h2 className="text-lg font-semibold text-gray-900">
              Likes
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-96">
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
            </div>
          ) : likes.length === 0 ? (
            <div className="flex flex-col justify-center items-center py-8">
              <Heart className="w-12 h-12 text-gray-300 mb-2" />
              <p className="text-gray-500">No likes yet</p>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {likes.filter(user => user && user._id).map((user) => (
                <div
                  key={user._id}
                  className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
                  onClick={() => handleUserClick(user.username)}
                >
                  {user.profileImageUrl ? (
                    <Image
                      src={user.profileImageUrl}
                      alt={user.fullName}
                      width={40}
                      height={40}
                      className="rounded-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-yellow-500 flex items-center justify-center text-white font-medium text-sm">
                      {getInitials(user.fullName || user.username || 'User')}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <p className="font-medium text-gray-900 truncate">
                        {user.fullName || user.username || 'Unknown User'}
                      </p>
                      {user.isVerified && (
                        <svg className="w-4 h-4 text-blue-500 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                          <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 truncate">
                      @{user.username}
                    </p>
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

export default LikeListModal;

'use client';

import React, { useState, useEffect } from 'react';
import { UserPlus, UserCheck, Clock, UserX } from 'lucide-react';
import { followUser, unfollowUser } from '@/api/privacy';
import { toast } from 'react-toastify';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { inMemoryStateManager } from '@/utils/inMemoryState';

interface EnhancedFollowButtonProps {
  userId: string;
  username?: string;
  fullName?: string;
  isFollowing?: boolean;
  isPending?: boolean;
  targetUserPrivacy?: 'public' | 'private';
  className?: string;
  onFollowStateChange?: (newState: {
    isFollowing: boolean;
    isPending: boolean;
  }) => void;
}

// Constants for localStorage keys
const FOLLOW_STORAGE_KEY = 'user_follow_states';

const EnhancedFollowButton: React.FC<EnhancedFollowButtonProps> = ({
  userId,
  username = '',
  fullName = '',
  isFollowing = false,
  isPending = false,
  targetUserPrivacy = 'public',
  className = '',
  onFollowStateChange
}) => {
  const [loading, setLoading] = useState(false);
  const [currentIsFollowing, setCurrentIsFollowing] = useState(isFollowing);
  const [currentIsPending, setCurrentIsPending] = useState(isPending);
  const { requireAuth } = useAuthGuard();

  // Helper functions for follow state persistence
  const getFollowStateFromStorage = (userId: string): boolean | null => {
    try {
      const stored = localStorage.getItem(FOLLOW_STORAGE_KEY);
      if (!stored) return null;
      const followStates = JSON.parse(stored);
      return followStates[userId] || null;
    } catch {
      return null;
    }
  };

  const saveFollowStateToStorage = (userId: string, isFollowed: boolean): void => {
    try {
      const stored = localStorage.getItem(FOLLOW_STORAGE_KEY);
      const followStates = stored ? JSON.parse(stored) : {};
      followStates[userId] = isFollowed;
      localStorage.setItem(FOLLOW_STORAGE_KEY, JSON.stringify(followStates));
    } catch (error) {
      console.warn('Failed to save follow state to localStorage:', error);
    }
  };

  // Initialize follow state from localStorage on mount
  useEffect(() => {
    const storedFollowState = getFollowStateFromStorage(userId);
    if (storedFollowState !== null) {
      setCurrentIsFollowing(storedFollowState);
      setCurrentIsPending(false); // Clear pending state when loading from storage
    }
  }, [userId]);

  const handleFollowToggle = async () => {
    requireAuth(async () => {
      setLoading(true);
      try {
        if (currentIsFollowing) {
          // Unfollow
          const response = await unfollowUser(userId);
          setCurrentIsFollowing(false);
          setCurrentIsPending(false);

          onFollowStateChange?.({
            isFollowing: false,
            isPending: false
          });

          // Save to localStorage and inMemoryStateManager
          saveFollowStateToStorage(userId, false);
          inMemoryStateManager.setUserFollowState(userId, false);

          toast.success(`Unfollowed ${fullName || username}`, {
            position: "top-right",
            autoClose: 2000,
          });
        } else if (currentIsPending) {
          // Cancel follow request (unfollow endpoint handles this)
          const response = await unfollowUser(userId);
          setCurrentIsPending(false);
          setCurrentIsFollowing(false);

          onFollowStateChange?.({
            isFollowing: false,
            isPending: false
          });

          // Save to localStorage and inMemoryStateManager
          saveFollowStateToStorage(userId, false);
          inMemoryStateManager.setUserFollowState(userId, false);

          toast.success('Follow request cancelled', {
            position: "top-right",
            autoClose: 2000,
          });
        } else {
          // Follow or send follow request
          const response = await followUser(userId);

          if (response.data.isFollowing) {
            // Public account - immediate follow
            setCurrentIsFollowing(true);
            setCurrentIsPending(false);

            onFollowStateChange?.({
              isFollowing: true,
              isPending: false
            });

            // Save to localStorage and inMemoryStateManager
            saveFollowStateToStorage(userId, true);
            inMemoryStateManager.setUserFollowState(userId, true);

            toast.success(`Now following ${fullName || username}`, {
              position: "top-right",
              autoClose: 2000,
            });
          } else if (response.data.isPending) {
            // Private account - follow request sent
            setCurrentIsFollowing(false);
            setCurrentIsPending(true);

            onFollowStateChange?.({
              isFollowing: false,
              isPending: true
            });

            toast.success(`Follow request sent to ${fullName || username}`, {
              position: "top-right",
              autoClose: 3000,
            });
          }
        }
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || 'Failed to update follow status';
        toast.error(errorMessage, {
          position: "top-right",
          autoClose: 3000,
        });
      } finally {
        setLoading(false);
      }
    });
  };

  // Determine button state and appearance
  const getButtonConfig = () => {
    if (currentIsFollowing) {
      return {
        text: 'Following',
        icon: UserCheck,
        className: 'bg-gray-100 text-gray-700 hover:bg-red-100 hover:text-red-600',
        hoverText: 'Unfollow'
      };
    } else if (currentIsPending) {
      return {
        text: 'Requested',
        icon: Clock,
        className: 'bg-yellow-100 text-yellow-700 hover:bg-red-100 hover:text-red-600',
        hoverText: 'Cancel'
      };
    } else {
      return {
        text: targetUserPrivacy === 'private' ? 'Request' : 'Follow',
        icon: UserPlus,
        className: 'bg-yellow-500 text-black hover:bg-yellow-600',
        hoverText: targetUserPrivacy === 'private' ? 'Send Request' : 'Follow'
      };
    }
  };

  const buttonConfig = getButtonConfig();
  const Icon = buttonConfig.icon;

  return (
    <button
      onClick={handleFollowToggle}
      disabled={loading}
      className={`
        flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200
        ${buttonConfig.className}
        ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}
        ${className}
      `}
      title={loading ? 'Processing...' : buttonConfig.hoverText}
    >
      {loading ? (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        <Icon className="w-4 h-4" />
      )}
      <span className="text-sm">
        {loading ? 'Processing...' : buttonConfig.text}
      </span>
    </button>
  );
};

export default EnhancedFollowButton;
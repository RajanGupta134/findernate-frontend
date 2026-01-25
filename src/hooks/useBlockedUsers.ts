"use client";

import { useState, useEffect } from 'react';
import { getBlockedUsers } from '@/api/user';

interface BlockedUser {
  blockedUserId: string;
  fullName: string;
  username: string;
  profileImage?: string;
  blockedAt: string;
  reason?: string;
}

export const useBlockedUsers = () => {
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [blockedUserIds, setBlockedUserIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBlockedUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const blockedUsersData = await getBlockedUsers();
      setBlockedUsers(blockedUsersData || []);

      // Create a Set of blocked user IDs for efficient lookup
      const blockedIds = new Set<string>((blockedUsersData || []).map((user: BlockedUser) => user.blockedUserId));
      setBlockedUserIds(blockedIds);
    } catch (err: any) {
      // Only log non-authentication errors to avoid console noise
      if (err?.response?.status !== 401) {
        console.error('Error fetching blocked users:', err);
      }
      setError(err?.message || 'Failed to fetch blocked users');
      setBlockedUsers([]);
      setBlockedUserIds(new Set());
    } finally {
      setLoading(false);
    }
  };

  const isUserBlocked = (userId: string) => {
    return blockedUserIds.has(userId);
  };

  const addBlockedUser = (userId: string, userDetails?: Partial<BlockedUser>) => {
    setBlockedUserIds(prev => new Set([...prev, userId]));
    if (userDetails) {
      setBlockedUsers(prev => [...prev, {
        blockedUserId: userId,
        fullName: userDetails.fullName || 'Unknown',
        username: userDetails.username || 'unknown',
        profileImage: userDetails.profileImage,
        blockedAt: new Date().toISOString(),
        reason: userDetails.reason,
      }]);
    }
  };

  const removeBlockedUser = (userId: string) => {
    setBlockedUserIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(userId);
      return newSet;
    });
    setBlockedUsers(prev => prev.filter(user => user.blockedUserId !== userId));
  };

  useEffect(() => {
    // Only fetch blocked users if user is logged in
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        fetchBlockedUsers();
      }
    }
  }, []);

  return {
    blockedUsers,
    blockedUserIds,
    loading,
    error,
    isUserBlocked,
    addBlockedUser,
    removeBlockedUser,
    refetch: fetchBlockedUsers,
  };
};
// SuggestedUsers.tsx
'use client';

import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { followUser, getSuggestedUsers, unfollowUser } from '@/api/user';
import { UserPlus, UserMinus } from 'lucide-react';
import { AxiosError } from 'axios';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { AuthDialog } from '@/components/AuthDialog';
import { useRouter } from 'next/navigation';

interface SuggestedUser {
  _id: string;
  fullName: string;
  username: string;
  followersCount: number;
  profileImageUrl?: string;
  isFollowing?: boolean;
}

interface SuggestedUsersProps {
  users?: SuggestedUser[];
}

export default function SuggestedUsers({ users: initialUsers }: SuggestedUsersProps) {
  const router = useRouter();
  const [users, setUsers] = useState<SuggestedUser[]>(Array.isArray(initialUsers) ? initialUsers : []);
  const [userStates, setUserStates] = useState<{[key: string]: {isFollowing: boolean, followersCount: number, isLoading: boolean}}>(() => {
    return (Array.isArray(initialUsers) ? initialUsers : []).reduce((acc, user) => ({
      ...acc,
      [user._id]: {
        isFollowing: user.isFollowing || false,
        followersCount: user.followersCount,
        isLoading: false
      }
    }), {});
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { requireAuth, showAuthDialog, closeAuthDialog } = useAuthGuard();

  useEffect(() => {
    async function fetchSuggestedUsers() {
      setLoading(true);
      setError(null);
      try {
        const res = await getSuggestedUsers();
        //console.log("suggested for you",res)
        const safeUsers = Array.isArray(res) ? res : [];
        setUsers(safeUsers);
        setUserStates(safeUsers.reduce((acc, user) => ({
          ...acc,
          [user._id]: {
            isFollowing: user.isFollowing || false,
            followersCount: user.followersCount,
            isLoading: false
          }
        }), {}));
      } catch {
        //console.log(err);
        setError('suggestions not found.');
        // Don't set default users - let the component hide itself
        setUsers([]);
        setUserStates({});
      } finally {
        setLoading(false);
      }
    }
    fetchSuggestedUsers();
  }, []);

  const formatFollowers = (count: number) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`;
    }
    return count.toString();
  };

  const handleFollowToggle = (userId: string) => {
    const currentState = userStates[userId];
    if (currentState?.isLoading) return;

    requireAuth(async () => {
      setUserStates(prev => ({
        ...prev,
        [userId]: { ...prev[userId], isLoading: true }
      }));

      try {
        if (currentState?.isFollowing) {
          await unfollowUser(userId);
          setUserStates(prev => ({
            ...prev,
            [userId]: {
              isFollowing: false,
              followersCount: prev[userId].followersCount - 1,
              isLoading: false
            }
          }));
        } else {
          await followUser(userId);
          setUserStates(prev => ({
            ...prev,
            [userId]: {
              isFollowing: true,
              followersCount: prev[userId].followersCount + 1,
              isLoading: false
            }
          }));
        }
      } catch (error) {
        console.error('Error toggling follow status:', error);
        const axiosError = error as AxiosError<unknown>;
        const responseData = axiosError.response?.data as unknown;
        let extractedMessage: string | undefined;
        if (typeof responseData === 'string') {
          extractedMessage = responseData;
        } else if (responseData && typeof responseData === 'object' && 'message' in responseData) {
          const maybeMessage = (responseData as { message?: unknown }).message;
          extractedMessage = typeof maybeMessage === 'string' ? maybeMessage : undefined;
        }
        const fallbackMessage = axiosError.message || 'Failed to update follow status';
        const errorMessage = extractedMessage || fallbackMessage;
        
        // Handle specific error cases
        if (errorMessage === 'Already following') {
          // Update state to reflect reality
          setUserStates(prev => ({
            ...prev,
            [userId]: {
              isFollowing: true,
              followersCount: prev[userId].followersCount,
              isLoading: false
            }
          }));
        } else if (errorMessage === 'Not following this user') {
          // Update state to reflect reality
          setUserStates(prev => ({
            ...prev,
            [userId]: {
              isFollowing: false,
              followersCount: prev[userId].followersCount,
              isLoading: false
            }
          }));
        } else if (errorMessage === 'Cannot follow yourself') {
          alert('You cannot follow yourself');
          setUserStates(prev => ({
            ...prev,
            [userId]: {
              isFollowing: false,
              followersCount: prev[userId].followersCount,
              isLoading: false
            }
          }));
        } else {
          // Show user-friendly error message for other errors
          alert(errorMessage);
          
          // Reset to original state on other errors
          const originalUser = users.find(u => u._id === userId);
          setUserStates(prev => ({
            ...prev,
            [userId]: { 
              isFollowing: originalUser?.isFollowing || false,
              followersCount: originalUser?.followersCount || 0,
              isLoading: false 
            }
          }));
        }
      }
    });
  };

  // Don't render the component if there are no users to display and not loading
  if (!loading && (!users || users.length === 0)) {
    return null;
  }

  return (
    <div className="  bg-white rounded-xl shadow-sm border border-gray-200 p-6">
     <div className="flex items-center gap-2 mb-4">
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="lucide lucide-users w-5 h-5 text-gray-600"
  >
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
  </svg>
  <h3 className="text-lg font-semibold text-gray-900">Suggested for You</h3>
</div>

      {loading ? (
        <div className="py-8 text-center text-gray-500">Loading suggestions...</div>
      ) : error ? (
        <div className="py-8 text-center text-yellow-500">{error}</div>
      ) : (
        <div className="space-y-4">
          {users.slice(0, 4).map((user) => {
            const userState = userStates[user._id];
            const truncatedFullName = user.fullName.length > 20 
              ? user.fullName.substring(0, 20) + '...' 
              : user.fullName;

            return (
              <div
                key={user._id}
                className="flex items-center p-3 hover:bg-gray-200 rounded-lg transition-colors duration-150 cursor-pointer"
                onClick={(e) => {
                  // Prevent navigation if clicking the follow/unfollow button
                  if ((e.target as HTMLElement).closest('button')) return;
                  requireAuth(() => {
                    router.push(`/userprofile/${user.username}`);
                  });
                }}
              >
                {/* Profile Image - Fixed Width */}
                <div className="flex-shrink-0 w-10 h-10 mr-3">
                  <Image
                    width={40}
                    height={40}
                    src={user.profileImageUrl || '/placeholderimg.png'}
                    alt='profile_image'
                    className="w-full h-full rounded-full object-cover"
                  />
                </div>

                {/* User Info - Flexible Width with Truncation */}
                <div className="flex-1 min-w-0 mr-3">
                  <p className="font-medium text-gray-900 text-sm truncate" title={user.fullName}>
                    {truncatedFullName}
                  </p>
                  <p className="text-xs text-gray-600 truncate" title={`@${user.username}`}>
                    @{user.username}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFollowers(userState?.followersCount || user.followersCount)} followers
                  </p>
                </div>

                {/* Follow Button - Fixed Width */}
                <div className="flex-shrink-0">
                  <Button
                    size="sm"
                    variant="custom"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFollowToggle(user._id);
                    }}
                    disabled={userState?.isLoading}
                    className={`text-xs px-3 py-1.5 cursor-pointer flex items-center gap-1 min-w-[80px] justify-center ${
                      userState?.isFollowing 
                        ? 'bg-gray-500 hover:bg-gray-600 text-white border-gray-500' 
                        : 'bg-button-gradient border-[#FCD45C] text-black hover:bg-[#FCD45C]'
                    }`}
                  >
                    {userState?.isLoading ? (
                      <div className="w-3 h-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    ) : userState?.isFollowing ? (
                      <>
                        <UserMinus className="w-3 h-3" />
                        Unfollow
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-3 h-3" />
                        Follow
                      </>
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      {/* Auth Dialog */}
      <AuthDialog isOpen={showAuthDialog} onClose={closeAuthDialog} />
    </div>
  );
}

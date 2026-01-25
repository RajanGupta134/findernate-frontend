import { SearchUser } from "@/types";
import Image from "next/image";
import { User, Plus, MessageCircle, MoreVertical, Flag } from "lucide-react";
import { useState, useEffect } from "react";
import { messageAPI } from "@/api/message";
import { followUser, unfollowUser } from "@/api/user";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/store/useUserStore";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { AuthDialog } from "@/components/AuthDialog";
import { AxiosError } from "axios";
import ReportModal from './ReportModal';
import { inMemoryStateManager } from '@/utils/inMemoryState';
import SubscriptionBadge from './ui/SubscriptionBadge';

// Constants for localStorage keys
const FOLLOW_STORAGE_KEY = 'user_follow_states';

interface UserCardProps {
  user: SearchUser;
  onFollow?: (userId: string) => void;
}

const UserCard: React.FC<UserCardProps> = ({ user, onFollow }) => {
  // Prefer _doc fields if present (Mongoose-style object)
  const userData = user._doc ? { ...user, ...user._doc } : user;
  const [isFollowing, setIsFollowing] = useState(userData.isFollowing || false);
  const [isLoading, setIsLoading] = useState(false);
  const [creatingChat, setCreatingChat] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const router = useRouter();
  const { requireAuth, showAuthDialog, closeAuthDialog } = useAuthGuard();
  const currentUser = useUserStore(state => state.user);
  const isCurrentUser = currentUser?._id === userData._id;

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

  console.log('🎴 UserCard Render:', {
    username: userData.username,
    userId: userData._id,
    propIsFollowing: userData.isFollowing,
    stateIsFollowing: isFollowing
  });

  // Update local state when user prop changes, checking localStorage first
  useEffect(() => {
    console.log('🎴 UserCard useEffect: Updating isFollowing for', userData.username, 'from', isFollowing, 'to', userData.isFollowing);
    
    // Check localStorage first for follow state, then fall back to API data
    const storedFollowState = getFollowStateFromStorage(userData._id);
    const initialFollowState = storedFollowState !== null ? storedFollowState : (userData.isFollowing || false);
    setIsFollowing(initialFollowState);
  }, [userData.isFollowing, userData._id]);

  const handleFollowClick = async () => {
    requireAuth(async () => {
      if (isLoading) return;
      setIsLoading(true);
      try {
        if (isFollowing) {
          await unfollowUser(userData._id);
          setIsFollowing(false);
          // Save to localStorage and inMemoryStateManager
          saveFollowStateToStorage(userData._id, false);
          inMemoryStateManager.setUserFollowState(userData._id, false);
        } else {
          await followUser(userData._id);
          setIsFollowing(true);
          // Save to localStorage and inMemoryStateManager
          saveFollowStateToStorage(userData._id, true);
          inMemoryStateManager.setUserFollowState(userData._id, true);
        }
        onFollow?.(userData._id);
      } catch (error: any) {
        console.error('Error toggling follow status:', error);
        
        const errorMessage = error instanceof Error ? error.message : '';
        const responseMessage = error.response?.data?.message || '';
        const status = error.response?.status;
        
        //console.log('Error details:', {
        //  status,
        //  responseMessage,
        //  errorMessage,
        //  currentFollowState: isFollowing
        // });
        
        // Handle specific error cases - these are actually success cases
        if (status === 400) {
          if (responseMessage.includes('Already following') || errorMessage.includes('Already following')) {
            //console.log('Already following - user should see Unfollow button');
            setIsFollowing(true); // User is following, show Unfollow
            // Save to localStorage and inMemoryStateManager
            saveFollowStateToStorage(userData._id, true);
            inMemoryStateManager.setUserFollowState(userData._id, true);
            onFollow?.(user._id);
          } else if (responseMessage.includes('Not following') || errorMessage.includes('Not following')) {
            //console.log('Not following - user should see Follow button');
            setIsFollowing(false); // User is not following, show Follow
            // Save to localStorage and inMemoryStateManager
            saveFollowStateToStorage(userData._id, false);
            inMemoryStateManager.setUserFollowState(userData._id, false);
            onFollow?.(user._id);
          } else if (responseMessage.includes('yourself')) {
            alert("You can't follow yourself");
            setIsFollowing(false);
          } else {
            // For other 400 errors, revert the optimistic state (don't use original user prop)
            //console.log('Other 400 error, reverting optimistic state:', responseMessage || errorMessage);
            setIsFollowing(!isFollowing); // Revert the optimistic change
          }
        } else if (status === 409) {
          // Conflict - status already updated, keep optimistic state
          //console.log('Conflict error - keeping optimistic state');
          onFollow?.(user._id);
        } else {
          // For other errors, revert the optimistic state (don't use original user prop)
          //console.log('Reverting optimistic state due to error:', status);
          setIsFollowing(!isFollowing); // Revert the optimistic change
          alert(errorMessage || responseMessage || 'Failed to update follow status');
        }
      } finally {
        setIsLoading(false);
      }
    });
  };

  const handleMessageClick = async () => {
    requireAuth(async () => {
      if (creatingChat) return;
      
      setCreatingChat(true);
      try {
        // Get current user from store
        const currentUser = useUserStore.getState().user;
        if (!currentUser) {
          alert('Please log in to send messages');
          return;
        }
        // Create a direct chat with both users (current user + target user)
        const participants = [currentUser._id, userData._id];
        const chat = await messageAPI.createChat(participants, 'direct');
        router.push(`/chats?chatId=${chat._id}`);
      } catch (error) {
        const axiosError = error as AxiosError;
        console.error('Error creating chat:', axiosError);

        if (axiosError.response?.status === 404) {
          alert('Chat functionality is not available on this server yet. Please contact the administrator.');
        } else {
          const errorMessage = axiosError.response?.data as string || 'Failed to create chat';
          alert(errorMessage);
        }
      } finally {
        setCreatingChat(false);
      }
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength).trim() + "...";
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showDropdown && !(event.target as Element).closest('.relative')) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  return (
    <>
      <div
        className="w-full max-w-2xl bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden group cursor-pointer"
        onClick={(e) => {
          // Prevent navigation if clicking any button inside
            if ((e.target as HTMLElement).closest('button')) return;
            requireAuth(() => {
              if (isCurrentUser) {
                // Navigate to dedicated self profile route if available
                router.push('/profile');
              } else {
                router.push(`/userprofile/${userData.username}`);
              }
            });
          }}
      >
        {/* Header with profile image and basic info */}
        <div className="p-4 pb-3">
          <div className="flex items-start gap-3">
            {/* Profile Image or Avatar */}
            <div className="flex-shrink-0">
              {userData.profileImageUrl ? (
                <Image
                  width={56}
                  height={56}
                  src={userData.profileImageUrl}
                  alt={userData.username || userData.fullName || "User"}
                  className="w-14 h-14 rounded-full object-cover border-2 border-gray-100"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-button-gradient flex items-center justify-center text-black font-semibold text-lg border-2 border-gray-100">
                  {userData.fullName ? getInitials(userData.fullName) : 
                   userData.username ? getInitials(userData.username) : 
                   <User size={24} />}
                </div>
              )}
            </div>
            {/* User Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  {/* Name */}
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900 text-base leading-tight">
                      {userData.fullName || userData.username || "Unknown User"}
                    </h3>
                    <SubscriptionBadge badge={userData.subscriptionBadge} size="sm" />
                  </div>
                  {/* Username (if different from display name) */}
                  {userData.username && userData.fullName && userData.username !== userData.fullName && (
                    <p className="text-sm text-gray-500 mt-0.5">
                      @{userData.username}
                    </p>
                  )}
                  {/* Professional Title/Description */}
                  {userData.bio && (
                    <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                      {truncateText(userData.bio, 80)}
                    </p>
                  )}
                  {/* Location */}
                  {/* {user.location && (
                    <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                      <MapPin size={12} className="flex-shrink-0" />
                      <span className="truncate">{user.location}</span>
                    </div>
                  )}  */}
                </div>
                {/* Action Buttons - hide for current logged-in user's own card */}
                {!isCurrentUser && (
                <div className="ml-3 flex gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleFollowClick(); }}
                    disabled={isLoading}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-1.5 ${
                      isFollowing
                        ? "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300"
                        : "bg-button-gradient text-black hover:bg-blue-700"
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {isLoading ? (
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-md animate-spin" />
                    ) : (
                      <>
                        {!isFollowing && <Plus size={14} />}
                        {isFollowing ? "Following" : "Follow"}
                      </>
                    )}
                  </button>
                </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Auth Dialog */}
      <AuthDialog isOpen={showAuthDialog} onClose={closeAuthDialog} />

      {/* Report Modal */}
      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        contentType="user"
  contentId={userData._id}
      />
    </>
  );
};

export default UserCard;
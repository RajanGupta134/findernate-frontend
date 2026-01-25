"use client";

import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { useStories } from "@/hooks/useStories";
import { useUserStore } from "@/store/useUserStore";
import { StoryUser, Story } from "@/types/story";
import { Plus } from "lucide-react";
import StoryViewer from "./StoryViewer";
import CreateStoryModal from "./CreateStoryModal";
import StoryAnalytics from "./StoryAnalytics";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { AuthDialog } from "./AuthDialog";
import { getUserProfile } from "@/api/user";

interface StoriesBarProps {
  onCreateStory?: () => void;
}

const VIEWED_STORIES_KEY = 'findernate_viewed_stories';

// Helper functions for localStorage
const loadViewedStoriesFromStorage = (): Set<string> => {
  if (typeof window === 'undefined') return new Set();
  
  try {
    const stored = localStorage.getItem(VIEWED_STORIES_KEY);
    if (stored) {
      const parsedArray = JSON.parse(stored);
      return new Set(parsedArray);
    }
  } catch (error) {
    console.error('Error loading viewed stories from localStorage:', error);
  }
  return new Set();
};

const saveViewedStoriesToStorage = (viewedStories: Set<string>) => {
  if (typeof window === 'undefined') return;
  
  try {
    const arrayToStore = Array.from(viewedStories);
    localStorage.setItem(VIEWED_STORIES_KEY, JSON.stringify(arrayToStore));
  } catch (error) {
    console.error('Error saving viewed stories to localStorage:', error);
  }
};

export default function StoriesBar({ onCreateStory }: StoriesBarProps) {
  const [selectedUser, setSelectedUser] = useState<StoryUser | null>(null);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(() => {
    // Check if modal should be open from localStorage
    if (typeof window !== 'undefined') {
      return localStorage.getItem('create-story-modal-open') === 'true';
    }
    return false;
  });
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [analyticsStory, setAnalyticsStory] = useState<Story | null>(null);
  const [viewedStories, setViewedStories] = useState<Set<string>>(loadViewedStoriesFromStorage);
  const modalStateRef = useRef(false);
  
  const { user, token } = useUserStore();
  const { requireAuth, showAuthDialog, closeAuthDialog } = useAuthGuard();
  const [meAvatarUrl, setMeAvatarUrl] = useState<string | "">("");

  // Initialize from store immediately
  useEffect(() => {
    if (user?.profileImageUrl?.trim()) {
      setMeAvatarUrl(user.profileImageUrl.trim());
    }
  }, [user?.profileImageUrl]);

  // If logged-in user's avatar is missing in the store, hydrate it from API
  useEffect(() => {
    if (!user || (user.profileImageUrl?.trim() && user.profileImageUrl.trim() !== "")) return;
    (async () => {
      try {
        const data = await getUserProfile();
        const p = data?.userId || data;
        if (p?.profileImageUrl?.trim()) {
          const trimmedUrl = p.profileImageUrl.trim();
          useUserStore.getState().updateUser({
            profileImageUrl: trimmedUrl,
            fullName: p.fullName,
            username: p.username,
          });
          setMeAvatarUrl(trimmedUrl);
        }
      } catch (e) {
        console.warn("Failed to hydrate user avatar", e);
      }
    })();
  }, [user?._id, user?.profileImageUrl]);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };
  
  // Always call useStories - hooks must be called unconditionally
  const { storyUsers, loading, hasActiveStories, uploadStory } = useStories();

  // Sync modal state with localStorage on state changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedState = localStorage.getItem('create-story-modal-open') === 'true';
      if (storedState && !showCreateModal) {
        setShowCreateModal(true);
      }
    }
  }, [storyUsers, showCreateModal]);

  // Clean up expired stories from viewed list
  useEffect(() => {
    if (storyUsers.length > 0) {
      const currentStoryIds = new Set<string>();
      storyUsers.forEach(user => {
        user.stories?.forEach(story => {
          currentStoryIds.add(story._id);
        });
      });

      setViewedStories(prev => {
        const filteredViewed = new Set(Array.from(prev).filter(storyId => 
          currentStoryIds.has(storyId)
        ));
        
        // Only save if there were changes
        if (filteredViewed.size !== prev.size) {
          saveViewedStoriesToStorage(filteredViewed);
        }
        
        return filteredViewed;
      });
    }
  }, [storyUsers]);

  // When no user is logged in, show only a login prompt
  if (!user || !token) {
    return (
      <>
        <div className="flex overflow-x-auto space-x-6 pb-0 sm:pb-2 px-2 md:mx-3 lg:mx-4 scrollbar-hide bg-white shadow-md rounded-lg">
          <div className="flex flex-col items-center mt-5 flex-shrink-0">
            <div 
              className="w-16 h-16 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 border-2 border-white shadow-lg flex items-center justify-center cursor-pointer hover:from-yellow-500 hover:to-orange-600 transition-all transform hover:scale-105"
              onClick={() => requireAuth()}
            >
              <Plus size={28} className="text-white" strokeWidth={3} />
            </div>
            <p className="text-xs mt-2 text-center text-gray-700 font-medium max-w-[64px] truncate">
              Add Story
            </p>
          </div>
        </div>

        {/* Auth Dialog */}
        <AuthDialog
          isOpen={showAuthDialog}
          onClose={closeAuthDialog}
        />
      </>
    );
  }

  const openStoryModal = (storyUser: StoryUser) => {
    console.log('📖 [StoriesBar] Opening story modal for user:', {
      username: storyUser.username,
      isCurrentUser: storyUser.isCurrentUser,
      storiesCount: storyUser.stories?.length || 0,
      storyIds: storyUser.stories?.map(s => s._id.slice(-6)) || []
    });

    // If current user has no stories, show create modal
    if (storyUser.isCurrentUser && (!storyUser.stories || storyUser.stories.length === 0)) {
      handleCreateStory();
      return;
    }

    // For all other cases (current user with stories OR other users with stories), show story viewer
    if (storyUser.stories && storyUser.stories.length > 0) {
      setSelectedUser(storyUser);
      // Start from the first unviewed story (Instagram behavior)
      const startIndex = getFirstUnviewedStoryIndex(storyUser);
      console.log('📖 [StoriesBar] Starting at story index:', startIndex);
      setCurrentStoryIndex(startIndex);
    }
  };

  const closeStoryModal = () => {
    setSelectedUser(null);
    setCurrentStoryIndex(0);
  };

  const handleStoryViewed = (storyId: string) => {
    setViewedStories(prev => {
      const newViewedStories = new Set(prev).add(storyId);
      saveViewedStoriesToStorage(newViewedStories);
      return newViewedStories;
    });
  };

  const areAllStoriesViewed = (storyUser: StoryUser): boolean => {
    if (!storyUser.stories || storyUser.stories.length === 0) return false;
    return storyUser.stories.every(story => viewedStories.has(story._id));
  };

  const getFirstUnviewedStoryIndex = (storyUser: StoryUser): number => {
    if (!storyUser.stories || storyUser.stories.length === 0) return 0;
    
    // Find the first story that hasn't been viewed
    const firstUnviewedIndex = storyUser.stories.findIndex(story => !viewedStories.has(story._id));
    
    // If all stories are viewed, start from the beginning (0)
    // If some are unviewed, start from the first unviewed story
    return firstUnviewedIndex === -1 ? 0 : firstUnviewedIndex;
  };

  const handleCreateStory = () => {
    requireAuth(() => {
      modalStateRef.current = true;
      localStorage.setItem('create-story-modal-open', 'true');
      setShowCreateModal(true);
    });
  };

  const handleStoryUpload = async (media: File, caption?: string) => {
    const success = await uploadStory(media, caption);
    // Don't auto-close modal to allow multiple story uploads
    return success;
  };

  const handleShowAnalytics = (story: Story) => {
    setAnalyticsStory(story);
    setShowAnalytics(true);
  };

  const handleCloseAnalytics = () => {
    setShowAnalytics(false);
    setAnalyticsStory(null);
  };


  // Use actual story users from API, or create current user if no stories
  let displayUsers = [...storyUsers];
  
  // If user exists but doesn't appear in story users (no stories), add them
  if (user && !storyUsers.some(storyUser => storyUser.isCurrentUser)) {
    const currentUserStory: StoryUser = {
      _id: user._id,
      username: user.username || user.fullName || 'You',
      profileImageUrl: user.profileImageUrl || '',
      stories: [],
      hasNewStories: false,
      isCurrentUser: true,
    };
    displayUsers.unshift(currentUserStory); // Add current user at the beginning
  }

  // Remove loading state for now - we'll show user immediately

  return (
    <>
      <div className="flex overflow-x-auto space-x-3 sm:space-x-6 pb-0 sm:pb-2 px-2 md:mx-3 lg:mx-4 bg-white shadow-md rounded-lg subtle-scrollbar">
        {displayUsers.map((storyUser) => {
          const isMe = storyUser.isCurrentUser;
          // Better avatar URL logic that handles empty strings
          const avatarUrl = isMe 
            ? (meAvatarUrl?.trim() || user?.profileImageUrl?.trim() || storyUser.profileImageUrl?.trim()) 
            : storyUser.profileImageUrl?.trim();
          
          // Debug logging for current user
          if (isMe && process.env.NODE_ENV === 'development') {
            console.log('Current user story avatar debug:', {
              meAvatarUrl,
              userProfileImageUrl: user?.profileImageUrl,
              storyUserProfileImageUrl: storyUser.profileImageUrl,
              finalAvatarUrl: avatarUrl,
              username: user?.username,
              fullName: user?.fullName
            });
          }
          
          const initials = getInitials(isMe ? (user?.username || user?.fullName || storyUser.username) : storyUser.username);
          return (
            <div key={storyUser._id} className="flex flex-col items-center mt-5 flex-shrink-0">
              <div
                onClick={() => openStoryModal(storyUser)}
                className={`relative w-12 h-12 sm:w-16 sm:h-16 rounded-full border-2 ${
                  areAllStoriesViewed(storyUser)
                    ? "border-gray-400"
                    : storyUser.hasNewStories
                    ? "border-2 bg-gradient-to-r from-yellow-400 to-yellow-600 p-[2px]"
                    : "border-gray-300"
                } cursor-pointer transition-transform hover:scale-105`}
              >
                <div className={`w-full h-full rounded-full overflow-hidden ${
                  storyUser.hasNewStories && !areAllStoriesViewed(storyUser) ? 'bg-white p-[2px]' : ''
                }`}>
                  {avatarUrl && avatarUrl.length > 0 ? (
                    <Image
                      src={avatarUrl}
                      alt={storyUser.username}
                      width={64}
                      height={64}
                      className="object-cover w-full h-full rounded-full"
                    />
                  ) : (
                    <div className="w-full h-full bg-button-gradient rounded-full flex items-center justify-center">
                      <span className="text-white text-shadow text-sm font-bold">
                        {initials}
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Instagram-style add story plus icon for current user with no stories */}
                {storyUser.isCurrentUser && (!storyUser.stories || storyUser.stories.length === 0) && (
                  <div 
                    className="absolute bottom-0 right-0 w-5 h-5 bg-yellow-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center cursor-pointer hover:bg-yellow-600 transition-all hover:scale-110 z-20"
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent the parent click handler
                      handleCreateStory();
                    }}
                    style={{
                      transform: 'translate(30%, 30%)'
                    }}
                  >
                    <Plus size={10} className="text-white" strokeWidth={3} />
                  </div>
                )}
              </div>
              <p className="text-xs mt-2 text-center text-gray-700 font-medium max-w-[48px] sm:max-w-[64px] truncate">
                {storyUser.isCurrentUser ? "Your Story" : storyUser.username}
              </p>
            </div>
          );
        })}
      </div>

      {/* Story Viewer Modal */}
      {selectedUser && (
        <StoryViewer
          storyUser={selectedUser}
          initialStoryIndex={currentStoryIndex}
          allStoryUsers={displayUsers}
          onClose={closeStoryModal}
          onShowAnalytics={handleShowAnalytics}
          onStoryViewed={handleStoryViewed}
        />
      )}

      {/* Create Story Modal */}
      <CreateStoryModal
        key="create-story-modal"
        isOpen={showCreateModal}
        onClose={() => {
          modalStateRef.current = false;
          localStorage.removeItem('create-story-modal-open');
          setShowCreateModal(false);
        }}
        onUpload={handleStoryUpload}
      />

      {/* Story Analytics Modal - Independent of StoryViewer */}
      {showAnalytics && analyticsStory && (
        <StoryAnalytics
          story={analyticsStory}
          onClose={handleCloseAnalytics}
        />
      )}

      {/* Auth Dialog */}
      <AuthDialog
        isOpen={showAuthDialog}
        onClose={closeAuthDialog}
      />
    </>
  );
}

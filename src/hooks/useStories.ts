import { useState, useEffect, useCallback } from 'react';
import { storyAPI } from '@/api/story';
import { Story, StoryUser, StoryFeed } from '@/types/story';
import { useUserStore } from '@/store/useUserStore';
import { useBlockedUsers } from '@/hooks/useBlockedUsers';
import { toast } from 'react-toastify';

export const useStories = () => {
  const [stories, setStories] = useState<Story[]>([]);
  const [storyUsers, setStoryUsers] = useState<StoryUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useUserStore();
  const { blockedUserIds } = useBlockedUsers();

  // Transform stories array into grouped story users
  const transformStoriesToUsers = useCallback((storiesData: Story[]) => {
    if (!user) return [];

    const userMap = new Map<string, StoryUser>();
    
    // Add current user first if they have stories
    const currentUserStories = storiesData.filter(story => story.userId._id === user._id);

    console.log('🔍 [transformStoriesToUsers] Current user stories:', {
      userId: user._id,
      totalStoriesFromAPI: storiesData.length,
      currentUserStoriesCount: currentUserStories.length,
      currentUserStoryIds: currentUserStories.map(s => ({
        id: s._id.slice(-6),
        createdAt: s.createdAt,
        userId: s.userId._id === user._id ? 'ME' : 'OTHER'
      }))
    });

    if (currentUserStories.length > 0) {
      userMap.set(user._id, {
        _id: user._id,
        username: user.username || user.fullName,
        profileImageUrl: user.profileImageUrl,
        stories: currentUserStories,
        hasNewStories: true,
        isCurrentUser: true,
      });
    }

    // Add other users' stories (excluding blocked users)
    storiesData.forEach(story => {
      if (story.userId._id === user._id) return; // Skip current user, already added
      
      // Skip blocked users
      if (blockedUserIds.has(story.userId._id)) return;

      const userId = story.userId._id;
      if (!userMap.has(userId)) {
        userMap.set(userId, {
          _id: userId,
          username: story.userId.username,
          profileImageUrl: story.userId.profileImageUrl,
          stories: [],
          hasNewStories: true,
          isCurrentUser: false,
        });
      }
      
      const storyUser = userMap.get(userId)!;
      storyUser.stories.push(story);
    });

    // Sort stories within each user by creation time (oldest first, newest last)
    Array.from(userMap.values()).forEach(storyUser => {
      storyUser.stories.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    });

    // Convert to array and sort: current user first, then by most recent story
    const result = Array.from(userMap.values());
    const sortedResult = result.sort((a, b) => {
      if (a.isCurrentUser) return -1;
      if (b.isCurrentUser) return 1;

      const aLatest = new Date(a.stories[0]?.createdAt || 0).getTime();
      const bLatest = new Date(b.stories[0]?.createdAt || 0).getTime();
      return bLatest - aLatest;
    });

    // Log final result for current user
    const currentUserResult = sortedResult.find(u => u.isCurrentUser);
    if (currentUserResult) {
      console.log('✅ [transformStoriesToUsers] FINAL current user result:', {
        username: currentUserResult.username,
        storiesCount: currentUserResult.stories.length,
        storyIds: currentUserResult.stories.map(s => s._id.slice(-6))
      });
    }

    return sortedResult;
  }, [user?._id, user?.username, user?.fullName, user?.profileImageUrl, blockedUserIds]);

  // Fetch stories feed
  const fetchStories = useCallback(async () => {
    if (!user) {
      console.log('📖 [useStories] No user authenticated, clearing stories');
      setStories([]);
      setStoryUsers([]);
      setLoading(false);
      setError(null);
      return;
    }

    console.log('📖 [useStories] Fetching stories feed for user:', user.username || user._id);
    setLoading(true);
    setError(null);

    try {
      const storiesData = await storyAPI.fetchStoriesFeed();
      console.log(`📖 [useStories] Received ${storiesData.length} stories from backend`);

      // Log story details for debugging - ENHANCED
      if (storiesData.length > 0) {
        const ownStories = storiesData.filter(s => s.userId._id === user._id);
        console.log('📖 [useStories] Story breakdown:', {
          total: storiesData.length,
          ownStories: ownStories.length,
          ownStoryIds: ownStories.map(s => ({
            id: s._id.slice(-6),
            createdAt: s.createdAt,
            mediaUrl: s.mediaUrl ? s.mediaUrl.slice(-20) : 'no-media'
          })),
          othersStories: storiesData.filter(s => s.userId._id !== user._id).length,
          uniqueUsers: new Set(storiesData.map(s => s.userId._id)).size
        });

        // Check if backend is returning duplicate story IDs
        const storyIds = storiesData.map(s => s._id);
        const uniqueStoryIds = new Set(storyIds);
        if (storyIds.length !== uniqueStoryIds.size) {
          console.warn('⚠️ [useStories] DUPLICATE STORY IDs DETECTED IN BACKEND RESPONSE!');
        }

        // Detailed log for each user's stories
        const userStoryCounts = new Map<string, number>();
        storiesData.forEach(s => {
          const userId = s.userId._id;
          userStoryCounts.set(userId, (userStoryCounts.get(userId) || 0) + 1);
        });
        console.log('📖 [useStories] Stories per user:', Array.from(userStoryCounts.entries()).map(([userId, count]) => ({
          userId: userId.slice(-6),
          storyCount: count,
          isCurrentUser: userId === user._id
        })));
      } else {
        console.log('⚠️ [useStories] No stories returned from backend. Possible causes:');
        console.log('   1. No one has uploaded stories');
        console.log('   2. Backend privacy filtering is too restrictive');
        console.log('   3. Backend /stories/feed endpoint needs privacy implementation');
      }

      setStories(storiesData);
      const transformedUsers = transformStoriesToUsers(storiesData);
      console.log(`📖 [useStories] Transformed into ${transformedUsers.length} story users`);
      setStoryUsers(transformedUsers);
    } catch (err: any) {
      setError('Failed to fetch stories');
      console.error('❌ [useStories] Error fetching stories:', {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data
      });
      // Set empty data on error to prevent crashes
      setStories([]);
      setStoryUsers([]);
    } finally {
      setLoading(false);
    }
  }, [user?._id, user?.username, transformStoriesToUsers]);

  // Upload a new story
  const uploadStory = useCallback(async (media: File, caption?: string) => {
    if (!user) {
      console.warn('⚠️ [useStories] Cannot upload story: User not authenticated');
      return false;
    }

    console.log('📤 [useStories] Uploading story:', {
      mediaType: media.type,
      mediaSize: `${(media.size / 1024 / 1024).toFixed(2)}MB`,
      hasCaption: !!caption,
      userId: user._id,
      username: user.username,
      accountPrivacy: user.privacy || 'public'
    });

    setLoading(true);
    setError(null);

    try {
      const result = await storyAPI.uploadStory({ media, caption });
      console.log('✅ [useStories] Story uploaded successfully:', result);

      // Refresh stories after upload
      console.log('🔄 [useStories] Refreshing stories feed...');
      await fetchStories();

      return true;
    } catch (err: any) {
      setError('Failed to upload story');
      console.error('❌ [useStories] Error uploading story:', {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, fetchStories]);

  // Mark story as seen
  const markStoryAsSeen = useCallback(async (storyId: string) => {
    if (!user) {
      console.warn('⚠️ Cannot mark story as seen: User not authenticated');
      return false;
    }

    try {
      console.log('👁️ [useStories] Attempting to mark story as seen:', storyId);
      await storyAPI.markStorySeen(storyId);
      console.log('✅ [useStories] Story marked as seen successfully');
      return true;
    } catch (err: any) {
      console.error('❌ [useStories] Error marking story as seen:', {
        storyId,
        error: err.message,
        status: err.response?.status,
        data: err.response?.data
      });
      return false;
    }
  }, [user]);

  // Save a story
  const saveStory = useCallback(async (storyId: string) => {
    if (!user) {
      console.warn('Cannot save story: User not authenticated');
      return false;
    }
    
    try {
      await storyAPI.saveStory(storyId);
      toast.success('Story saved successfully!', {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      return true;
    } catch (err: any) {
      console.error('Error saving story:', err);
      toast.error('Failed to save story. Please try again.', {
        position: "top-right",
        autoClose: 4000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      return false;
    }
  }, [user]);

  // Unsave a story
  const unsaveStory = useCallback(async (storyId: string) => {
    if (!user) {
      console.warn('Cannot unsave story: User not authenticated');
      return false;
    }
    
    try {
      await storyAPI.unsaveStory(storyId);
      toast.success('Story removed from saved!', {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      return true;
    } catch (err: any) {
      console.error('Error unsaving story:', err);
      toast.error('Failed to remove story from saved. Please try again.', {
        position: "top-right",
        autoClose: 4000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      return false;
    }
  }, [user]);

  // Check if current user has any active stories
  const hasActiveStories = useCallback(() => {
    if (!user) return false;
    return storyUsers.some(storyUser => storyUser.isCurrentUser && storyUser.stories.length > 0);
  }, [user, storyUsers]);

  // Delete a story
  const deleteStory = useCallback(async (storyId: string) => {
    if (!user) {
      console.warn('⚠️ [useStories] Cannot delete story: User not authenticated');
      return false;
    }

    console.log('🗑️ [useStories] Deleting story:', storyId);
    setLoading(true);
    setError(null);

    try {
      const result = await storyAPI.deleteStory(storyId);
      console.log('✅ [useStories] Story deleted successfully:', result);

      // Refresh stories after deletion
      console.log('🔄 [useStories] Refreshing stories feed...');
      await fetchStories();

      toast.success('Story deleted successfully!', {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });

      return true;
    } catch (err: any) {
      setError('Failed to delete story');
      console.error('❌ [useStories] Error deleting story:', {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data
      });

      toast.error('Failed to delete story. Please try again.', {
        position: "top-right",
        autoClose: 4000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });

      return false;
    } finally {
      setLoading(false);
    }
  }, [user, fetchStories]);

  // Get current user's story user object
  const getCurrentUserStories = useCallback((): StoryUser | null => {
    return storyUsers.find(storyUser => storyUser.isCurrentUser) || null;
  }, [storyUsers]);

  // Initial fetch
  useEffect(() => {
    fetchStories();
  }, [fetchStories]);

  return {
    stories,
    storyUsers,
    loading,
    error,
    fetchStories,
    uploadStory,
    markStoryAsSeen,
    deleteStory,
    saveStory,
    unsaveStory,
    hasActiveStories,
    getCurrentUserStories,
  };
};
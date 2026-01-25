"use client";

import Image from "next/image";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { StoryUser, Story } from "@/types/story";
import { useStories } from "@/hooks/useStories";
import { X, ChevronLeft, ChevronRight, Eye, Plus, MoreVertical, Flag, Trash2 } from "lucide-react";
import CreateStoryModal from "./CreateStoryModal";
import { storyAPI } from "@/api/story";
import { useUserStore } from "@/store/useUserStore";
import ReportModal from './ReportModal';
import { videoManager } from "@/utils/videoManager";

interface StoryViewerProps {
  storyUser: StoryUser;
  initialStoryIndex: number;
  allStoryUsers: StoryUser[];
  onClose: () => void;
  onShowAnalytics?: (story: Story) => void;
  onStoryViewed?: (storyId: string) => void;
}

export default function StoryViewer({
  storyUser,
  initialStoryIndex,
  allStoryUsers,
  onClose,
  onShowAnalytics,
  onStoryViewed,
}: StoryViewerProps) {
  const [currentUserIndex, setCurrentUserIndex] = useState(
    allStoryUsers.findIndex(user => user._id === storyUser._id)
  );
  const [currentStoryIndex, setCurrentStoryIndex] = useState(initialStoryIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [shouldAdvance, setShouldAdvance] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  const { user } = useUserStore();
  const router = useRouter();

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };
  
  const progressRef = useRef<NodeJS.Timeout | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { markStoryAsSeen, uploadStory, deleteStory} = useStories();

  const currentUser = allStoryUsers[currentUserIndex];
  const currentStory = currentUser?.stories?.[currentStoryIndex];
  const isVideo = currentStory?.mediaType === 'video' || currentStory?.postType === 'video';

  // Calculate duration based on media type
  const getStoryDuration = useCallback((story: Story): number => {
    const isVideoStory = story.mediaType === 'video' || story.postType === 'video';
    
    if (isVideoStory && videoRef.current?.duration) {
      // For videos, use actual video duration (max 30s)
      return Math.min(30000, videoRef.current.duration * 1000);
    } else if (isVideoStory) {
      // Default for videos when duration isn't loaded yet
      return 30000;
    }
    return 15000; // 15 seconds for images
  }, []);

  // Start progress timer
  const startProgress = useCallback(() => {
    if (!currentStory || isPaused) return;

    const duration = getStoryDuration(currentStory);
    const increment = 100 / (duration / 100); // Update every 100ms

    progressRef.current = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          setShouldAdvance(true);
          return 100;
        }
        return prev + increment;
      });
    }, 100);
  }, [currentStory, isPaused, getStoryDuration]);

  // Stop progress timer
  const stopProgress = useCallback(() => {
    if (progressRef.current) {
      clearInterval(progressRef.current);
      progressRef.current = null;
    }
  }, []);

  // Register video with manager when it changes
  useEffect(() => {
    if (videoRef.current && currentStory && isVideo) {
      videoManager.register({
        id: `story-${currentStory._id}`,
        videoElement: videoRef.current,
        location: 'story',
        pauseCallback: () => {
          setIsPaused(true);
          stopProgress();
        }
      });

      return () => {
        videoManager.unregister(`story-${currentStory._id}`);
      };
    }
  }, [currentStory, isVideo, stopProgress]);

  // Next story logic
  const nextStory = useCallback(() => {
    // Mark current story as viewed before moving to next (for custom callback)
    if (currentStory && onStoryViewed) {
      console.log('📝 [StoryViewer] Calling onStoryViewed callback for:', currentStory._id);
      onStoryViewed(currentStory._id);
    }

    if (currentStoryIndex < currentUser.stories.length - 1) {
      // Next story in same user
      setCurrentStoryIndex(prev => prev + 1);
      stopProgress();
      setProgress(0);
      setShouldAdvance(false);
      setTimeout(startProgress, 100);
    } else {
      // Next user
      const nextUserIndex = currentUserIndex + 1;
      if (nextUserIndex < allStoryUsers.length) {
        const nextUser = allStoryUsers[nextUserIndex];
        if (nextUser && nextUser.stories && nextUser.stories.length > 0) {
          setCurrentUserIndex(nextUserIndex);
          setCurrentStoryIndex(0);
          stopProgress();
          setProgress(0);
          setShouldAdvance(false);
          setTimeout(startProgress, 100);
        } else {
          onClose();
        }
      } else {
        onClose();
      }
    }
  }, [currentUser, currentStory, currentStoryIndex, currentUserIndex, allStoryUsers, onClose, onStoryViewed, stopProgress, startProgress]);

  // Reset and restart progress  
  const resetProgress = useCallback(() => {
    stopProgress();
    setProgress(0);
    setShouldAdvance(false);
    setTimeout(startProgress, 100);
  }, [stopProgress, startProgress]);

  // Handle story advancement when progress completes
  useEffect(() => {
    if (shouldAdvance) {
      setShouldAdvance(false);
      nextStory();
    }
  }, [shouldAdvance, nextStory]);

  // Previous story logic
  const prevStory = useCallback(() => {
    if (currentStoryIndex > 0) {
      // Previous story in same user
      setCurrentStoryIndex(prev => prev - 1);
      stopProgress();
      setProgress(0);
      setShouldAdvance(false);
      setTimeout(startProgress, 100);
    } else {
      // Previous user
      const prevUserIndex = currentUserIndex - 1;
      if (prevUserIndex >= 0) {
        const prevUser = allStoryUsers[prevUserIndex];
        if (prevUser && prevUser.stories && prevUser.stories.length > 0) {
          setCurrentUserIndex(prevUserIndex);
          setCurrentStoryIndex(prevUser.stories.length - 1);
          stopProgress();
          setProgress(0);
          setShouldAdvance(false);
          setTimeout(startProgress, 100);
        }
      }
    }
  }, [currentStoryIndex, currentUserIndex, allStoryUsers, stopProgress, startProgress]);

  // Handle close with story marking
  const handleClose = useCallback(() => {
    // Mark current story as viewed when closing (for custom callback)
    if (currentStory && onStoryViewed) {
      console.log('📝 [StoryViewer] Calling onStoryViewed callback on close for:', currentStory._id);
      onStoryViewed(currentStory._id);
    }
    console.log('🚪 [StoryViewer] Closing story viewer');
    onClose();
  }, [currentStory, onStoryViewed, onClose]);

  // Handle keyboard navigation
  const handleKeyPress = useCallback((e: KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowRight':
      case ' ':
        e.preventDefault();
        nextStory();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        prevStory();
        break;
      case 'Escape':
        handleClose();
        break;
    }
  }, [nextStory, prevStory, handleClose]);

  // Handle touch/click navigation
  const handleScreenClick = (e: React.MouseEvent, side: 'left' | 'right') => {
    e.stopPropagation();
    if (side === 'left') {
      prevStory();
    } else {
      nextStory();
    }
  };

  // Handle pause/resume on mouse events
  const handleMouseEnter = () => {
    setIsPaused(true);
    stopProgress();
  };

  const handleMouseLeave = () => {
    setIsPaused(false);
    startProgress();
  };


  // Handle add story
  const handleAddStory = () => {
    setIsPaused(true);
    stopProgress();
    setShowCreateModal(true);
  };

  // Handle analytics modal
  const handleShowAnalytics = () => {
    if (onShowAnalytics && currentStory) {
      onShowAnalytics(currentStory);
    }
  };

  // Handle delete story
  const handleDeleteStory = async () => {
    if (!currentStory) return;

    // Confirm deletion
    const confirmed = window.confirm('Are you sure you want to delete this story? This action cannot be undone.');
    if (!confirmed) return;

    // Pause story and stop progress
    setIsPaused(true);
    stopProgress();

    console.log('🗑️ [StoryViewer] Deleting story:', currentStory._id);
    const success = await deleteStory(currentStory._id);

    if (success) {
      console.log('✅ [StoryViewer] Story deleted successfully, closing viewer');
      // Close the viewer after successful deletion
      handleClose();
    } else {
      console.error('❌ [StoryViewer] Failed to delete story');
      // Resume story if deletion failed
      setIsPaused(false);
      startProgress();
    }
  };

  const handleStoryUpload = async (media: File, caption?: string) => {
    const success = await uploadStory(media, caption);
    if (success) {
      setShowCreateModal(false);
      setIsPaused(false);
      // Refresh will happen automatically through useStories hook
    }
    return success;
  };

  const handleCreateModalClose = () => {
    setShowCreateModal(false);
    setIsPaused(false);
    startProgress();
  };

  
  // Mark story as seen and fetch viewer count
  useEffect(() => {
    if (currentStory) {
      console.log('👁️ [StoryViewer] Current story changed, marking as seen:', {
        storyId: currentStory._id,
        userId: currentUser._id,
        username: currentUser.username,
        isCurrentUser: currentUser.isCurrentUser
      });

      // Mark story as seen (async but don't wait)
      markStoryAsSeen(currentStory._id).then(success => {
        if (success) {
          console.log('✅ [StoryViewer] Story view recorded successfully');
        } else {
          console.warn('⚠️ [StoryViewer] Failed to record story view');
        }
      });

      // Fetch accurate viewer count for current user's stories
      if (currentUser.isCurrentUser) {
        const fetchViewerCount = async () => {
          try {
            console.log('📊 [StoryViewer] Fetching viewer count for own story:', currentStory._id);
            const analytics = await storyAPI.fetchStoryViewers(currentStory._id, 1, 1);
            const count = analytics.pagination.total;
            console.log('✅ [StoryViewer] Viewer count fetched:', count);
            setViewerCount(count);
          } catch (error) {
            console.warn('⚠️ [StoryViewer] Failed to fetch viewer count, using fallback');
            // Fallback to story viewers array length
            setViewerCount(currentStory.viewers?.length || 0);
          }
        };

        fetchViewerCount();
      }
    }
  }, [currentStory, markStoryAsSeen, currentUser.isCurrentUser, currentUser._id, currentUser.username]);

  // Setup progress and keyboard listeners
  useEffect(() => {
    resetProgress();
    
    document.addEventListener('keydown', handleKeyPress);
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
      stopProgress();
    };
  }, [handleKeyPress, resetProgress, stopProgress]);

  // Handle video events
  const handleVideoLoaded = () => {
    if (videoRef.current && !isPaused) {
      videoRef.current.play();
      // Reset progress when video metadata is loaded to get accurate duration
      resetProgress();
    }
  };

  const handleVideoLoadedMetadata = () => {
    // Called when video metadata (including duration) is loaded
    if (videoRef.current && isVideo) {
      resetProgress();
    }
  };

  const formatTimeAgo = (dateString: string): string => {
    const now = new Date();
    const storyTime = new Date(dateString);
    const diffInHours = Math.floor((now.getTime() - storyTime.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return "Just now";
    if (diffInHours === 1) return "1 hour ago";
    return `${diffInHours}h ago`;
  };

  const handleProfileClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPaused(true);
    stopProgress();
    
    if (currentUser.isCurrentUser) {
      // Navigate to own profile
      router.push('/profile');
    } else {
      // Navigate to other user's profile
      router.push(`/userprofile/${currentUser.username}`);
    }
    
    // Close the story viewer after navigation
    handleClose();
  };

  // Log story information for debugging
  useEffect(() => {
    if (currentUser && currentUser.stories) {
      console.log('📺 [StoryViewer] Displaying stories for user:', {
        username: currentUser.username,
        isCurrentUser: currentUser.isCurrentUser,
        totalStories: currentUser.stories.length,
        currentStoryIndex: currentStoryIndex,
        storyIds: currentUser.stories.map(s => s._id.slice(-6))
      });
    }
  }, [currentUser, currentStoryIndex]);

  // Ensure we have valid data before proceeding
  if (!currentUser || !currentUser.stories || currentUser.stories.length === 0 || !currentStory) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={handleClose}
    >
      <div 
        className="relative max-w-md w-full h-[90vh] bg-black rounded-xl border border-gray-600 shadow-2xl overflow-hidden"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Progress Bars */}
        <div className="absolute top-4 left-4 right-4 flex space-x-1 z-20">
          {currentUser.stories.map((_, index) => (
            <div key={index} className="flex-1 h-1 bg-gray-600 rounded-full overflow-hidden">
              <div
                className={`h-full bg-white transition-all duration-100 ${
                  index === currentStoryIndex 
                    ? `w-[${progress}%]` 
                    : index < currentStoryIndex 
                    ? "w-full" 
                    : "w-0"
                }`}
                style={{
                  width: index === currentStoryIndex ? `${progress}%` : index < currentStoryIndex ? '100%' : '0%'
                }}
              />
            </div>
          ))}
        </div>

        {/* User Info Header */}
        <div className="absolute top-8 left-4 right-4 flex items-center justify-between z-20">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={handleProfileClick}>
            {currentUser.profileImageUrl ? (
              <Image
                src={currentUser.profileImageUrl}
                alt={currentUser.username}
                width={32}
                height={32}
                className="rounded-full border-2 border-white hover:border-yellow-400 transition-colors"
              />
            ) : (
              <div className="w-8 h-8 rounded-full border-2 border-white hover:border-yellow-400 bg-button-gradient flex items-center justify-center transition-colors">
                <span className="text-white text-shadow text-xs font-bold">
                  {getInitials(currentUser.username)}
                </span>
              </div>
            )}
            <div>
              <p className="text-white font-semibold text-base hover:text-yellow-400 transition-colors">{currentUser.username}</p>
              <p className="text-gray-200 text-sm">
                {formatTimeAgo(currentStory.createdAt)}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Add Story Button for current user */}
            {currentUser.isCurrentUser && (
              <button
                onClick={handleAddStory}
                className="flex items-center justify-center w-8 h-8 bg-blue-500 rounded-full text-white hover:bg-blue-600 transition-colors"
                title="Add to Story"
              >
                <Plus size={16} />
              </button>
            )}

            {/* View count for current user's stories */}
            {currentUser.isCurrentUser && (
              <button
                onClick={handleShowAnalytics}
                className="flex items-center space-x-1 text-white hover:text-gray-300"
              >
                <Eye size={16} />
                <span className="text-sm">{viewerCount}</span>
              </button>
            )}

            {/* Delete button for current user's stories */}
            {currentUser.isCurrentUser && (
              <button
                onClick={handleDeleteStory}
                className="flex items-center justify-center w-8 h-8 text-white hover:text-red-400 transition-colors"
                title="Delete Story"
              >
                <Trash2 size={16} />
              </button>
            )}

            {/* More Options for non-current user stories */}
            {!currentUser.isCurrentUser && user && (
              <div className="relative">
                <button
                  onClick={() => {
                    setIsPaused(true);
                    stopProgress();
                    setShowMoreOptions(!showMoreOptions);
                  }}
                  className="flex items-center justify-center w-8 h-8 text-black hover:text-gray-600 transition-colors"
                >
                  <MoreVertical size={16} />
                </button>

                {showMoreOptions && (
                  <div className="absolute right-0 top-full mt-1 bg-white border rounded-lg shadow-lg z-20 min-w-[120px]">
                    <button
                      onClick={() => {
                        setShowReportModal(true);
                        setShowMoreOptions(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Flag className="w-3 h-3" />
                      Report Story
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Close Button */}
            <button
              onClick={handleClose}
              className="text-black hover:text-gray-600"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Story Content */}
        <div className="relative w-full h-full flex items-center justify-center bg-black">
          {isVideo ? (
            <video
              ref={videoRef}
              src={currentStory.mediaUrl}
              className="max-w-full max-h-full object-contain"
              onLoadedData={handleVideoLoaded}
              onLoadedMetadata={handleVideoLoadedMetadata}
              muted
              playsInline
            />
          ) : (
            <img
              src={currentStory.mediaUrl}
              alt={`${currentUser.username}'s story`}
              className="max-w-full max-h-full object-contain"
            />
          )}

          {/* Caption */}
          {currentStory.caption && (
            <div className="absolute bottom-20 left-4 right-4">
              <p className="text-white text-base font-medium bg-black bg-opacity-60 rounded-lg p-3">
                {currentStory.caption}
              </p>
            </div>
          )}

          {/* Navigation Areas */}
          <div className="absolute inset-0 flex z-10">
            <div 
              className="w-1/2 h-full cursor-pointer flex items-center justify-start pl-4"
              onClick={(e) => handleScreenClick(e, 'left')}
            >
              {currentStoryIndex > 0 || currentUserIndex > 0 ? (
                <ChevronLeft className="text-white opacity-0 hover:opacity-75 transition-opacity" size={32} />
              ) : null}
            </div>
            <div 
              className="w-1/2 h-full cursor-pointer flex items-center justify-end pr-4"
              onClick={(e) => handleScreenClick(e, 'right')}
            >
              <ChevronRight className="text-white opacity-0 hover:opacity-75 transition-opacity" size={32} />
            </div>
          </div>
        </div>
      </div>

      {/* Create Story Modal */}
      <CreateStoryModal
        isOpen={showCreateModal}
        onClose={handleCreateModalClose}
        onUpload={handleStoryUpload}
      />

      {/* Report Modal */}
      <ReportModal
        isOpen={showReportModal}
        onClose={() => {
          setShowReportModal(false);
          setIsPaused(false);
          startProgress();
        }}
        contentType="story"
        contentId={currentStory?._id || ''}
      />
    </div>
  );
}
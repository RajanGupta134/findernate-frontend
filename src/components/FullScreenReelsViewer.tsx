'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  Heart,
  MessageCircle,
  Bookmark,
  BookmarkCheck,
  Volume2,
  VolumeX,
  X,
  MoreVertical,
  Share2
} from 'lucide-react';
import { getReels, likeReel, unlikeReel } from '@/api/reels';
import { savePost, unsavePost } from '@/api/post';
import { followUser, unfollowUser, blockUser } from '@/api/user';
import { videoManager } from '@/utils/videoManager';
import {
  getLikedReelsFromStorage,
  getLikeCountsFromStorage,
  saveLikedReelToStorage,
  getFollowedUsersFromStorage,
  saveFollowStateToStorage,
  getSavedReelsFromStorage,
  saveSaveStateToStorage,
  getCommentCountsFromStorage,
  saveCommentCountToStorage,
  getReelsFeedFromSession
} from '@/utils/reelsStorage';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { AuthDialog } from '@/components/AuthDialog';
import ReelCommentsSection from '@/components/ReelCommentsSection';
import PostShareModal from '@/components/PostShareModal';
import ReportModal from '@/components/ReportModal';

interface FullScreenReelsViewerProps {
  initialReelId: string;
}

const FullScreenReelsViewer: React.FC<FullScreenReelsViewerProps> = ({ initialReelId }) => {
  const router = useRouter();
  const { requireAuth, showAuthDialog, closeAuthDialog } = useAuthGuard();

  // State management
  const [reelsData, setReelsData] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);

  // Modal states
  const [showComments, setShowComments] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [reportType, setReportType] = useState<'post' | 'user'>('post');

  // Toast notification
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get current reel data
  const currentReel = reelsData[currentIndex] || {};

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // ============================================================
  // DATA LOADING
  // ============================================================

  useEffect(() => {
    const loadReelsData = async () => {
      try {
        setLoading(true);

        // Try sessionStorage cache first (instant navigation)
        const cached = getReelsFeedFromSession();
        if (cached) {
          console.log('Using cached reels data from sessionStorage');
          setReelsData(cached.data);

          // Find starting index
          const startIndex = cached.data.findIndex((reel: any) => reel._id === initialReelId);
          if (startIndex !== -1) {
            setCurrentIndex(startIndex);
            // Scroll to starting position after render
            setTimeout(() => {
              if (containerRef.current) {
                containerRef.current.scrollTo({
                  top: startIndex * window.innerHeight,
                  behavior: 'instant' as ScrollBehavior
                });
              }
            }, 100);
          }
          setLoading(false);
          return;
        }

        // Fallback to API if no cache or expired
        console.log('Fetching reels from API');
        const response = await getReels();

        if (!response.reels || response.reels.length === 0) {
          setError('No reels available');
          setLoading(false);
          return;
        }

        // Transform API response
        const transformedData = response.reels.map((item: any) => {
          const userObj = item.userId || {};
          const userDetail = item.userDetails?.[0] || {};

          // Get cached states from localStorage
          const likedReels = getLikedReelsFromStorage();
          const likeCounts = getLikeCountsFromStorage();
          const commentCounts = getCommentCountsFromStorage();
          const followedUsers = getFollowedUsersFromStorage();
          const savedReels = getSavedReelsFromStorage();

          const isLikedFromStorage = likedReels.has(item._id);
          const likeCountFromStorage = likeCounts.get(item._id);
          const commentCountFromStorage = commentCounts.get(item._id);
          const userIdToCheck = userObj._id || userDetail._id || item.userId || '';
          const isFollowedFromStorage = followedUsers.has(userIdToCheck);
          const isSavedFromStorage = savedReels.has(item._id);

          // Merge with API data
          const finalIsLiked = isLikedFromStorage || Boolean(item.isLikedBy || item.isLikedByUser || false);
          const finalLikeCount = likeCountFromStorage !== undefined ? likeCountFromStorage : (item.engagement?.likes || item.likesCount || 0);
          const finalCommentCount = commentCountFromStorage !== undefined ? commentCountFromStorage : (item.engagement?.comments || 0);
          const finalIsFollowed = isFollowedFromStorage || Boolean(item.isFollowed || item.isFollowedByUser || false);
          const finalIsSaved = isSavedFromStorage || Boolean(item.isSaved || false);

          // Extract video URL
          let videoUrl = '';
          if (item.media && item.media.length > 0) {
            const videoMedia = item.media.find((m: any) => m.type === 'video');
            videoUrl = videoMedia?.url || item.media[0]?.url || '';
          }

          return {
            _id: item._id,
            userId: {
              _id: userObj._id || userDetail._id || item.userId || '',
              review: userObj.review,
              username: userObj.username || userDetail.username || 'Unknown User',
              profileImageUrl: userObj.profileImageUrl || userDetail.profileImageUrl || item.profileImageUrl || '/placeholderimg.png',
            },
            username: userObj.username || userDetail.username || 'Unknown User',
            profileImageUrl: userObj.profileImageUrl || userDetail.profileImageUrl || item.profileImageUrl || '/placeholderimg.png',
            description: item.description || '',
            caption: item.caption || '',
            contentType: item.contentType || 'normal',
            postType: item.postType || 'reel',
            videoUrl,
            hashtags: item.hashtags || [],
            engagement: {
              likes: finalLikeCount,
              comments: finalCommentCount,
              shares: item.engagement?.shares || 0,
              views: item.engagement?.views || 0,
            },
            isLiked: finalIsLiked,
            isFollowed: finalIsFollowed,
            isSaved: finalIsSaved,
            location: item.location,
            customization: item.customization,
            createdAt: item.createdAt,
          };
        });

        setReelsData(transformedData);

        // Find starting index
        const startIndex = transformedData.findIndex((reel: any) => reel._id === initialReelId);
        if (startIndex !== -1) {
          setCurrentIndex(startIndex);
          // Scroll to starting position after render
          setTimeout(() => {
            if (containerRef.current) {
              containerRef.current.scrollTo({
                top: startIndex * window.innerHeight,
                behavior: 'instant' as ScrollBehavior
              });
            }
          }, 100);
        }

        setLoading(false);
      } catch (err) {
        console.error('Error loading reels:', err);
        setError('Failed to load reels');
        setLoading(false);
      }
    };

    loadReelsData();
  }, [initialReelId]);

  // ============================================================
  // VIDEO PLAYBACK MANAGEMENT
  // ============================================================

  // Register videos with VideoManager
  useEffect(() => {
    videoRefs.current.forEach((video, index) => {
      if (video && reelsData[index]) {
        videoManager.register({
          id: `fullscreen-reel-${reelsData[index]._id}`,
          videoElement: video,
          location: 'reel',
          pauseCallback: () => {
            if (index === currentIndex) {
              setIsPlaying(false);
            }
          }
        });
      }
    });

    // Cleanup on unmount
    return () => {
      reelsData.forEach((reel) => {
        videoManager.unregister(`fullscreen-reel-${reel._id}`);
      });
    };
  }, [reelsData, currentIndex]);

  // Play current video, pause others
  useEffect(() => {
    if (reelsData.length === 0) return;

    videoRefs.current.forEach((video, index) => {
      if (!video) return;

      if (index === currentIndex) {
        // Play current video
        video.muted = isMuted;
        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise.catch((error) => {
            console.log('Video play prevented:', error);
          });
        }
        setIsPlaying(true);
      } else {
        // Pause others
        video.pause();
      }
    });
  }, [currentIndex, reelsData, isMuted]);

  // ============================================================
  // SCROLL HANDLING & URL SYNC
  // ============================================================

  const handleScroll = useCallback(() => {
    if (!containerRef.current || reelsData.length === 0) return;

    // Clear previous timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // Debounce scroll detection
    scrollTimeoutRef.current = setTimeout(() => {
      const container = containerRef.current;
      if (!container) return;

      const scrollTop = container.scrollTop;
      const windowHeight = window.innerHeight;
      const newIndex = Math.round(scrollTop / windowHeight);

      if (newIndex !== currentIndex && newIndex >= 0 && newIndex < reelsData.length) {
        setCurrentIndex(newIndex);

        // Update URL without adding to browser history
        const newReelId = reelsData[newIndex]._id;
        window.history.replaceState(null, '', `/reels/watch/${newReelId}`);
      }
    }, 100);
  }, [currentIndex, reelsData]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // ============================================================
  // KEYBOARD NAVIGATION
  // ============================================================

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showComments || showShareModal || showReportModal || showMoreMenu) {
        // Don't handle keys when modals are open
        if (e.key === 'Escape') {
          setShowComments(false);
          setShowShareModal(false);
          setShowReportModal(false);
          setShowMoreMenu(false);
        }
        return;
      }

      switch (e.key) {
        case 'Escape':
          router.push('/reels');
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (currentIndex > 0 && containerRef.current) {
            containerRef.current.scrollTo({
              top: (currentIndex - 1) * window.innerHeight,
              behavior: 'smooth'
            });
          }
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (currentIndex < reelsData.length - 1 && containerRef.current) {
            containerRef.current.scrollTo({
              top: (currentIndex + 1) * window.innerHeight,
              behavior: 'smooth'
            });
          }
          break;
        case 'm':
        case 'M':
          setIsMuted(!isMuted);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, reelsData.length, showComments, showShareModal, showReportModal, showMoreMenu, isMuted, router]);

  // ============================================================
  // INTERACTION HANDLERS
  // ============================================================

  const showToastNotification = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  // Like/Unlike handler
  const handleLikeToggle = async () => {
    if (!currentReel._id) return;

    const wasLiked = currentReel.isLiked;
    const newLikeCount = wasLiked ? currentReel.engagement.likes - 1 : currentReel.engagement.likes + 1;

    // Optimistic update
    setReelsData(prev => prev.map((reel, idx) =>
      idx === currentIndex
        ? { ...reel, isLiked: !wasLiked, engagement: { ...reel.engagement, likes: newLikeCount } }
        : reel
    ));

    // Save to localStorage immediately
    saveLikedReelToStorage(currentReel._id, !wasLiked, newLikeCount);

    try {
      if (wasLiked) {
        await unlikeReel(currentReel._id);
      } else {
        await likeReel(currentReel._id);
      }
    } catch (error: any) {
      console.error('Like toggle error:', error);
      // Revert on error
      setReelsData(prev => prev.map((reel, idx) =>
        idx === currentIndex
          ? { ...reel, isLiked: wasLiked, engagement: { ...reel.engagement, likes: currentReel.engagement.likes } }
          : reel
      ));
      saveLikedReelToStorage(currentReel._id, wasLiked, currentReel.engagement.likes);
    }
  };

  // Save/Unsave handler
  const handleSaveToggle = async () => {
    if (!currentReel._id) return;

    // Check if it's a valid MongoDB ObjectID (24 characters)
    if (currentReel._id.length !== 24) {
      showToastNotification('Cannot save this reel');
      return;
    }

    const wasSaved = currentReel.isSaved;

    // Optimistic update
    setReelsData(prev => prev.map((reel, idx) =>
      idx === currentIndex ? { ...reel, isSaved: !wasSaved } : reel
    ));

    // Save to localStorage immediately
    saveSaveStateToStorage(currentReel._id, !wasSaved);

    try {
      if (wasSaved) {
        await unsavePost(currentReel._id);
        showToastNotification('Removed from saved');
      } else {
        await savePost(currentReel._id);
        showToastNotification('Saved!');
      }
    } catch (error) {
      console.error('Save toggle error:', error);
      // Revert on error
      setReelsData(prev => prev.map((reel, idx) =>
        idx === currentIndex ? { ...reel, isSaved: wasSaved } : reel
      ));
      saveSaveStateToStorage(currentReel._id, wasSaved);
      showToastNotification('Failed to save');
    }
  };

  // Follow/Unfollow handler
  const handleFollowToggle = async () => {
    if (!currentReel.userId?._id) return;

    const wasFollowed = currentReel.isFollowed;

    // Optimistic update
    setReelsData(prev => prev.map((reel, idx) =>
      idx === currentIndex ? { ...reel, isFollowed: !wasFollowed } : reel
    ));

    // Save to localStorage immediately
    saveFollowStateToStorage(currentReel.userId._id, !wasFollowed);

    try {
      if (wasFollowed) {
        await unfollowUser(currentReel.userId._id);
      } else {
        await followUser(currentReel.userId._id);
      }
    } catch (error) {
      console.error('Follow toggle error:', error);
      // Revert on error
      setReelsData(prev => prev.map((reel, idx) =>
        idx === currentIndex ? { ...reel, isFollowed: wasFollowed } : reel
      ));
      saveFollowStateToStorage(currentReel.userId._id, wasFollowed);
    }
  };

  // Comment count change handler
  const handleCommentCountChange = (newCount: number) => {
    setReelsData(prev => prev.map((reel, idx) =>
      idx === currentIndex
        ? { ...reel, engagement: { ...reel.engagement, comments: newCount } }
        : reel
    ));
    saveCommentCountToStorage(currentReel._id, newCount);
  };

  // Profile navigation
  const handleProfileClick = () => {
    if (currentReel.username && currentReel.username !== 'Unknown User') {
      router.push(`/userprofile/${currentReel.username}`);
    }
  };

  // Hashtag click
  const handleHashtagClick = (tag: string) => {
    const cleanTag = tag.replace(/^#/, '').trim();
    router.push(`/search?q=${encodeURIComponent(cleanTag)}`);
  };

  // Report modal handlers
  const handleOpenReportModal = (type: 'post' | 'user') => {
    setReportType(type);
    setShowReportModal(true);
    setShowMoreMenu(false);
  };

  // ============================================================
  // RENDER HELPERS
  // ============================================================

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  // ============================================================
  // LOADING & ERROR STATES
  // ============================================================

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading reels...</p>
        </div>
      </div>
    );
  }

  if (error || reelsData.length === 0) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
        <div className="text-white text-center">
          <p className="text-xl mb-4">{error || 'No reels available'}</p>
          <button
            onClick={() => router.push('/reels')}
            className="px-6 py-2 bg-white text-black rounded-full hover:bg-gray-200 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // ============================================================
  // MAIN RENDER
  // ============================================================

  return (
    <div className="fixed inset-0 bg-black z-50 overflow-hidden">
      {/* Close Button */}
      <button
        onClick={() => router.push('/reels')}
        className="absolute top-4 right-4 z-50 p-2 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
        aria-label="Close"
      >
        <X className="w-6 h-6 text-white" />
      </button>

      {/* Mute/Unmute Button */}
      <button
        onClick={() => setIsMuted(!isMuted)}
        className="absolute top-4 left-4 z-50 p-2 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
        aria-label={isMuted ? 'Unmute' : 'Mute'}
      >
        {isMuted ? (
          <VolumeX className="w-6 h-6 text-white" />
        ) : (
          <Volume2 className="w-6 h-6 text-white" />
        )}
      </button>

      {/* Scroll Container */}
      <div
        ref={containerRef}
        className="h-full w-full overflow-y-auto snap-y snap-mandatory scrollbar-hide"
      >
        {reelsData.map((reel, index) => (
          <div
            key={reel._id}
            className="h-full w-full snap-start relative"
          >
            {/* Video - Full Screen */}
            <video
              ref={(el) => { videoRefs.current[index] = el; }}
              src={reel.videoUrl}
              className="w-full h-full object-cover bg-black"
              loop
              playsInline
              muted={isMuted}
            />

            {/* Gradient Overlays for better text readability */}
            <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/60 via-black/30 to-transparent pointer-events-none" />
            <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/40 to-transparent pointer-events-none" />

            {/* Interaction Controls - Right Side */}
            <div className="absolute right-4 bottom-32 flex flex-col gap-6 items-center">
              {/* Profile Picture */}
              <div className="relative drop-shadow-lg">
                <Image
                  src={reel.profileImageUrl || '/placeholderimg.png'}
                  alt={reel.username}
                  width={48}
                  height={48}
                  className="rounded-full object-cover cursor-pointer border-2 border-white shadow-lg"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (index === currentIndex) handleProfileClick();
                  }}
                  unoptimized
                />
              </div>

              {/* Like Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (index === currentIndex) {
                    requireAuth(handleLikeToggle);
                  }
                }}
                className="flex flex-col items-center drop-shadow-lg"
              >
                <Heart
                  className={`w-7 h-7 ${
                    reel.isLiked ? 'fill-red-500 text-red-500' : 'text-white'
                  } transition-all duration-200 ${
                    reel.isLiked ? 'scale-110' : ''
                  }`}
                  style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.8))' }}
                />
                <span
                  className="text-white text-xs mt-1 font-semibold"
                  style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}
                >
                  {formatNumber(reel.engagement.likes)}
                </span>
              </button>

              {/* Comment Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (index === currentIndex) {
                    setShowComments(true);
                  }
                }}
                className="flex flex-col items-center drop-shadow-lg"
              >
                <MessageCircle
                  className="w-7 h-7 text-white"
                  style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.8))' }}
                />
                <span
                  className="text-white text-xs mt-1 font-semibold"
                  style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}
                >
                  {formatNumber(reel.engagement.comments)}
                </span>
              </button>

              {/* Share Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (index === currentIndex) {
                    setShowShareModal(true);
                  }
                }}
                className="flex flex-col items-center drop-shadow-lg"
              >
                <Share2
                  className="w-7 h-7 text-white"
                  style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.8))' }}
                />
              </button>

              {/* Save Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (index === currentIndex) {
                    requireAuth(handleSaveToggle);
                  }
                }}
                className="flex flex-col items-center drop-shadow-lg"
              >
                {reel.isSaved ? (
                  <BookmarkCheck
                    className="w-7 h-7 text-yellow-400 fill-yellow-400"
                    style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.8))' }}
                  />
                ) : (
                  <Bookmark
                    className="w-7 h-7 text-white"
                    style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.8))' }}
                  />
                )}
              </button>

              {/* More Options */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (index === currentIndex) {
                    requireAuth(() => setShowMoreMenu(!showMoreMenu));
                  }
                }}
                className="flex flex-col items-center drop-shadow-lg"
              >
                <MoreVertical
                  className="w-7 h-7 text-white"
                  style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.8))' }}
                />
              </button>
            </div>

            {/* User Info & Caption - Bottom Left */}
            <div className="absolute left-4 bottom-6 right-20 text-white">
              <div className="flex items-center gap-3 mb-2">
                <span
                  className="font-semibold text-base cursor-pointer hover:underline drop-shadow-lg"
                  style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (index === currentIndex) handleProfileClick();
                  }}
                >
                  @{reel.username}
                </span>
                {!reel.isFollowed && reel.userId?._id && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (index === currentIndex) {
                        requireAuth(handleFollowToggle);
                      }
                    }}
                    className="px-4 py-1 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-full transition-colors shadow-lg"
                  >
                    Follow
                  </button>
                )}
              </div>
              {reel.description && (
                <p
                  className="text-sm mb-2 line-clamp-2 drop-shadow-lg"
                  style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}
                >
                  {reel.description}
                </p>
              )}
              {reel.hashtags && reel.hashtags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {reel.hashtags.slice(0, 3).map((tag: string, idx: number) => (
                    <span
                      key={idx}
                      className="text-sm text-blue-300 cursor-pointer hover:underline drop-shadow-lg"
                      style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (index === currentIndex) handleHashtagClick(tag);
                      }}
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Comments Drawer/Sidebar */}
      {showComments && (
        <div
          className={`fixed inset-0 z-[60] ${isMobile ? 'bg-black/50 flex items-end' : ''}`}
          onClick={() => setShowComments(false)}
        >
          <div
            className={`bg-white ${
              isMobile
                ? 'w-full h-4/5 rounded-t-3xl'
                : 'absolute right-0 top-0 h-full w-96 shadow-2xl'
            } flex flex-col`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Comments ({currentReel.engagement?.comments || 0})
              </h3>
              <button
                onClick={() => setShowComments(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Comments Content */}
            <div className="flex-1 overflow-y-auto p-4">
              <ReelCommentsSection
                postId={currentReel._id}
                initialCommentCount={currentReel.engagement?.comments || 0}
                onCommentCountChange={handleCommentCountChange}
                maxVisible={50}
              />
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      <PostShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        postId={currentReel._id}
        postType={currentReel.postType as 'photo' | 'reel' | 'video' | 'story'}
        authorName={currentReel.username || 'this creator'}
        caption={currentReel.description}
      />

      {/* Report Modal */}
      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        contentType={reportType}
        contentId={reportType === 'post' ? currentReel._id : currentReel.userId?._id || ''}
      />

      {/* More Options Menu */}
      {showMoreMenu && (
        <div
          className="fixed inset-0 z-[70]"
          onClick={() => setShowMoreMenu(false)}
        >
          <div className="absolute right-16 bottom-36 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 min-w-[140px]">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleOpenReportModal('post');
              }}
              className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
            >
              <svg className="w-3.5 h-3.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span>Report Post</span>
            </button>
          </div>
        </div>
      )}

      {/* Auth Dialog */}
      <AuthDialog isOpen={showAuthDialog} onClose={closeAuthDialog} />

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[80] bg-gray-800 text-white px-6 py-3 rounded-lg shadow-lg transition-all duration-300">
          {toastMessage}
        </div>
      )}
    </div>
  );
};

export default FullScreenReelsViewer;

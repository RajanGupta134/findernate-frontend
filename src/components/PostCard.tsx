'use client';

import { Heart, MessageCircle, MapPin, ChevronLeft, ChevronRight, MoreVertical, Bookmark, BookmarkCheck, Flag, Trash2, Pencil, Globe, Lock, Link as LinkIcon } from 'lucide-react';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { FeedPost, SavedPostsResponse } from '@/types';
import formatPostDate, { formatRelativeTime, formatExactDateTime } from '@/utils/formatDate';
import { useState, useEffect, useRef } from 'react';
import { useUserStore } from '@/store/useUserStore';
import ServiceCard from './post-window/ServiceCard';
import { Badge } from './ui/badge';
import ProductCard from './post-window/ProductCard';
import BusinessPostCard from './post-window/BusinessCard';
import { likePost, unlikePost, savePost, unsavePost, getPrivateSavedPosts, deletePost, editPost, EditPostPayload, getPostById } from '@/api/post';
//import { createComment } from '@/api/comment';
import { postEvents } from '@/utils/postEvents';
import { AxiosError } from 'axios';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { AuthDialog } from '@/components/AuthDialog';
import CommentDrawer from './CommentDrawer';
import ReportModal from './ReportModal';
import ImageModal from './ImageModal';
import LikeListModal from './LikeListModal';
import PostShareModal from './PostShareModal';
import { toast } from 'react-toastify';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';
import { getCommentsByPost } from '@/api/comment';
import { videoManager } from '@/utils/videoManager';
import StarRating from './StarRating';
import SubscriptionBadge from './ui/SubscriptionBadge';
import CreatePaymentLinkModal from './CreatePaymentLinkModal';

// Singleton cache for saved posts to prevent multiple API calls
let savedPostsPromise: Promise<string[]> | null = null;
const CACHE_KEY = 'saved_posts_cache';
const CACHE_TIME_KEY = 'saved_posts_cache_time';
const CACHE_EXPIRY = 2 * 60 * 1000; // 2 minutes

const getSavedPostsCache = async (): Promise<string[]> => {
  // If there's already a pending request, wait for it
  if (savedPostsPromise) {
    return savedPostsPromise;
  }

  // Check cache first
  const cacheTime = localStorage.getItem(CACHE_TIME_KEY);
  const currentTime = Date.now();

  if (cacheTime && (currentTime - parseInt(cacheTime)) < CACHE_EXPIRY) {
    const cachedData = localStorage.getItem(CACHE_KEY);
    if (cachedData) {
      return JSON.parse(cachedData);
    }
  }

  // Create a new promise for the API call
  savedPostsPromise = (async () => {
    try {
      // Fetch all saved posts from unified endpoint
      const response = await getPrivateSavedPosts(1, 100);

      // Extract post IDs from response
      const savedPosts = response.data?.savedPosts || [];
      const savedPostIds = savedPosts
        .filter(savedPost => savedPost.postId?._id)
        .map(savedPost => savedPost.postId!._id);

      localStorage.setItem(CACHE_KEY, JSON.stringify(savedPostIds));
      localStorage.setItem(CACHE_TIME_KEY, currentTime.toString());

      return savedPostIds;
    } finally {
      // Clear the promise after completion (success or failure)
      savedPostsPromise = null;
    }
  })();

  return savedPostsPromise;
};

export interface PostCardProps {
  post: FeedPost;
  onPostDeleted?: (postId: string) => void; // Optional callback for when post is deleted
  // onPostClick is currently unused within this component; keep prop for compatibility
  onPostClick?: () => void;
  showComments?: boolean; // Whether to display comments inline
  // Hint to mark this post's first media as high priority for LCP
  isPriority?: boolean;
  // Timestamp format: 'relative' for feed (5m ago), 'exact' for profile/detail (Jan 6, 2025 at 2:30 PM)
  timestampFormat?: 'relative' | 'exact';
}

export default function PostCard({ post, onPostDeleted, onPostClick, showComments = false, isPriority = false, timestampFormat = 'relative' }: PostCardProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { requireAuth, showAuthDialog, closeAuthDialog } = useAuthGuard();
  const { user } = useUserStore();

  const [profileImageError, setProfileImageError] = useState(false);
  const [mediaImageError, setMediaImageError] = useState(false);
  const [isLiked, setIsLiked] = useState(post.isLikedBy);
  const [likesCount, setLikesCount] = useState(post.engagement.likes);
  const [likedByUsers, setLikedByUsers] = useState<Array<{_id: string; username: string; fullName: string; profileImageUrl?: string; isVerified?: boolean}>>([]);
  const [showLikeListModal, setShowLikeListModal] = useState(false);
  const [commentsCount, setCommentsCount] = useState(post.engagement.comments);
  const [isLoading, setIsLoading] = useState(false);
  const [hasRefreshed, setHasRefreshed] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  // const [comment, setComment] = useState('');
  // const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPostSaved, setIsPostSaved] = useState(false);
  const [checkingSaved, setCheckingSaved] = useState(true);
  const [showCommentDrawer, setShowCommentDrawer] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showPaymentLinkModal, setShowPaymentLinkModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  //const [isOnProfilePage, setIsOnProfilePage] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [isEditingPost, setIsEditingPost] = useState(false);
  const [editForm, setEditForm] = useState<EditPostPayload>({
    caption: post.caption || '',
    description: post.description || '',
    tags: Array.isArray(post.tags) ? post.tags.map(t => (typeof t === 'string' ? t : String(t))) : []
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(true);

  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Intersection observer for lazy loading videos
  const { elementRef, hasIntersected } = useIntersectionObserver({
    threshold: 0.1,
    rootMargin: '500px', // Start loading 500px before the video enters viewport
  });

  // When the card becomes visible, fetch the latest total comments once to correct any stale count
  useEffect(() => {
    let cancelled = false;
    const syncCommentCount = async () => {
      try {
        if (!hasIntersected) return;
        const data = await getCommentsByPost(post._id, 1, 1);
        const total = data?.totalComments ?? post.engagement.comments ?? commentsCount;
        if (!cancelled && typeof total === 'number' && total >= 0) {
          setCommentsCount(total);
          // Persist corrected value so it stays consistent across interactions
          if (isClient) {
            localStorage.setItem(`post_comments_count_${post._id}`, String(total));
          }
        }
      } catch {
        // Ignore fetch errors; fallback count will be used
      }
    };
    syncCommentCount();
    return () => { cancelled = true; };
  }, [hasIntersected, post._id, isClient]);

  // Allow editing on own posts anywhere (feed, profile, userprofile)
  const canEdit = !!user?.username && ((post.username || post.userId?.username) === user.username);

  // Check if this is the user's own post (for hiding save/report options)
  const isOwnPost = !!user?.username && ((post.username || post.userId?.username) === user.username);

  // Derive a human-readable location name to avoid rendering [object Object]
  const locationName: string | undefined = (
    post.customization?.normal?.location?.name ||
    post.customization?.business?.location?.name ||
    post.customization?.service?.location?.name ||
    post.customization?.product?.location?.name ||
    (typeof post.location === 'string'
      ? post.location
      : (post.location?.name || (post.location as { label?: string; address?: string })?.label || (post.location as { label?: string; address?: string })?.address)) ||
    undefined
  );
  const normalizedLocationName = typeof locationName === 'string' ? locationName.trim() : '';
  const shouldShowLocation = Boolean(
    normalizedLocationName &&
    !/^unknown location$/i.test(normalizedLocationName) &&
    !/^unknown$/i.test(normalizedLocationName) &&
    normalizedLocationName.toLowerCase() !== 'n/a'
  );

  // Track whether we're on any profile-like page (for UI decisions)
  // useEffect(() => {
  //   setIsOnProfilePage(pathname.includes('/profile') || pathname.includes('/userprofile'));
  // }, [pathname]);

  // Sync local state with prop changes (important for page refreshes)
  useEffect(() => {
    setIsLiked(post.isLikedBy);
    setLikesCount(post.engagement.likes);

    // Use actual comments array length if available, otherwise use engagement count
    const actualCommentsCount = post.comments && Array.isArray(post.comments)
      ? post.comments.length
      : post.engagement.comments;
    setCommentsCount(actualCommentsCount);

    // //console.log(`PostCard ${post._id} - Setting comments count to ${actualCommentsCount} (from ${post.comments ? 'comments array' : 'engagement'})`);
  }, [post.isLikedBy, post.engagement.likes, post.engagement.comments, post.comments]);

  // Reset media index when post changes
  useEffect(() => {
    setCurrentMediaIndex(0);
    setMediaImageError(false);
  }, [post._id]);

  // Reset media error when media index changes
  useEffect(() => {
    setMediaImageError(false);
  }, [currentMediaIndex]);

  // Cleanup video manager registration on unmount or media change
  useEffect(() => {
    return () => {
      if (post._id) {
        videoManager.unregister(`post-${post._id}-media-${currentMediaIndex}`);
      }
    };
  }, [post._id, currentMediaIndex]);

  // (image preloading and related state removed to reduce overhead)

  // Set client-side flag to prevent hydration issues
  useEffect(() => {
    setIsClient(true);
  }, []);

  // For debugging - log the initial state including comments
  useEffect(() => {
    // //console.log(`PostCard loaded for post ${post._id}: isLikedBy=${post.isLikedBy}, likes=${post.engagement.likes}, comments=${post.engagement.comments}`);
    // //console.log(`PostCard comments array:`, post.comments);
    // //console.log(`PostCard showComments prop:`, showComments);
  }, [post._id, post.comments, showComments, post.tags]);

  // No-op effect to mark onPostClick as used (prop is consumed by parent flows like Search page)
  useEffect(() => { }, [onPostClick]);

  // Load like status and comment count from localStorage on component mount (for persistence across refreshes)
  // Skip this on individual post pages since the page level handles localStorage
  useEffect(() => {
    if (!hasRefreshed && isClient && !pathname.includes('/post/')) {
      const savedLikeStatus = localStorage.getItem(`post_like_${post._id}`);
      const savedLikesCount = localStorage.getItem(`post_likes_count_${post._id}`);
      const savedCommentsCount = localStorage.getItem(`post_comments_count_${post._id}`);

      if (savedLikeStatus !== null) {
        const isLikedFromStorage = savedLikeStatus === 'true';
        const likesCountFromStorage = savedLikesCount ? parseInt(savedLikesCount) : post.engagement.likes;

        // //console.log(`Loading like status from localStorage for post ${post._id}: isLiked=${isLikedFromStorage}, count=${likesCountFromStorage}`);
        setIsLiked(isLikedFromStorage);
        setLikesCount(likesCountFromStorage);
      }

      if (savedCommentsCount !== null) {
        const commentsCountFromStorage = parseInt(savedCommentsCount);
        // Only use saved count if it's higher than the server count (to account for new comments)
        if (commentsCountFromStorage > post.engagement.comments) {
          // //console.log(`Loading comment count from localStorage for post ${post._id}: ${commentsCountFromStorage}`);
          setCommentsCount(commentsCountFromStorage);
        }
      }

      setHasRefreshed(true);
    }
  }, [post._id, hasRefreshed, isClient]);

  // Listen for comment count changes from other tabs/components
  useEffect(() => {
    const cleanup = postEvents.on(post._id, 'commentCountChange', (newCount: number) => {
      // //console.log(`Comment count updated for post ${post._id}: ${newCount}`);
      setCommentsCount(newCount);
    });

    return cleanup;
  }, [post._id]);

  // Handle keyboard navigation for media carousel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (post.media.length <= 1) return;

      if (e.key === 'ArrowLeft') {
        setCurrentMediaIndex((prev) =>
          prev > 0 ? prev - 1 : post.media.length - 1
        );
      } else if (e.key === 'ArrowRight') {
        setCurrentMediaIndex((prev) =>
          prev < post.media.length - 1 ? prev + 1 : 0
        );
      }
    };

    // Only add listener when hovering over the media
    const mediaElement = document.querySelector(`[data-post-id="${post._id}"] .post-media`);
    if (mediaElement) {
      const handleMouseEnter = () => document.addEventListener('keydown', handleKeyDown);
      const handleMouseLeave = () => document.removeEventListener('keydown', handleKeyDown);

      mediaElement.addEventListener('mouseenter', handleMouseEnter);
      mediaElement.addEventListener('mouseleave', handleMouseLeave);

      return () => {
        mediaElement.removeEventListener('mouseenter', handleMouseEnter);
        mediaElement.removeEventListener('mouseleave', handleMouseLeave);
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [post._id, post.media.length]);

  const handleLikeToggle = async () => {
    requireAuth(async () => {
      if (isLoading) return;


      setIsLoading(true);
      const previousIsLiked = isLiked;
      const previousLikesCount = likesCount;

      // Determine the action BEFORE updating state
      const shouldLike = !isLiked;

      // Optimistic update
      const newLikesCount = shouldLike ? likesCount + 1 : likesCount - 1;
      setIsLiked(shouldLike);
      setLikesCount(newLikesCount);

      // Save to localStorage for persistence
      if (isClient) {
        localStorage.setItem(`post_like_${post._id}`, shouldLike.toString());
        localStorage.setItem(`post_likes_count_${post._id}`, newLikesCount.toString());
      }


      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), 15000)
        );

        if (shouldLike) {
          // //console.log(`API Call: Liking post ${post._id}`);
          try {
            const response = await Promise.race([likePost(post._id), timeoutPromise]);
            // Store likedBy users from response
            if (response && typeof response === 'object' && 'data' in response) {
              const responseData = response.data as { likedBy?: Array<{_id: string; username: string; fullName: string; profileImageUrl?: string; isVerified?: boolean}> };
              if (responseData.likedBy && Array.isArray(responseData.likedBy)) {
                setLikedByUsers(responseData.likedBy);
              }
            }
            // //console.log(`API Call: Successfully liked post ${post._id}`);
          } catch (likeError) {
            // Handle "already liked" error
            const axiosError = likeError as AxiosError;
            // //console.log('Like error details:', {
            //   error: likeError,
            //   responseData: axiosError?.response?.data,
            //   responseStatus: axiosError?.response?.status,
            //   code: axiosError?.code
            // });

            if (axiosError?.response?.status === 409) {
              // //console.log(`Post ${post._id} already liked - treating as successful like`);
              // Don't revert the optimistic update since the post is effectively "liked"
              return;
            }
            // Re-throw other errors to be handled by outer catch
            throw likeError;
          }
        } else {
          // //console.log(`Unliking post ${post._id}`);
          try {
            const response = await Promise.race([unlikePost(post._id), timeoutPromise]);
            // Store likedBy users from response
            if (response && typeof response === 'object' && 'data' in response) {
              const responseData = response.data as { likedBy?: Array<{_id: string; username: string; fullName: string; profileImageUrl?: string; isVerified?: boolean}> };
              if (responseData.likedBy && Array.isArray(responseData.likedBy)) {
                setLikedByUsers(responseData.likedBy);
              }
            }
            // //console.log(`Successfully unliked post ${post._id}`);
          } catch (unlikeError) {
            // Handle specific "Like not found" error or timeout
            const axiosError = unlikeError as AxiosError;
            const errorMessage = (unlikeError as Error)?.message;

            // //console.log('Unlike error details:', {
            //   error: unlikeError,
            //   axiosError: axiosError,
            //   errorMessage: errorMessage,
            //   responseData: axiosError?.response?.data,
            //   responseStatus: axiosError?.response?.status,
            //   code: axiosError?.code
            // });

            if ((axiosError?.response?.data as { message?: string })?.message === 'Like not found for this post' ||
              errorMessage?.includes('timeout') ||
              axiosError?.code === 'ECONNABORTED') {
              // //console.log(`Unlike failed (${errorMessage || 'Like not found'}) - treating as successful unlike`);
              // Don't revert the optimistic update since the post is effectively "unliked"
              return;
            }
            // Re-throw other errors to be handled by outer catch
            throw unlikeError;
          }
        }
      } catch {
        // Revert optimistic update on error
        // console.error(`Error ${shouldLike ? 'liking' : 'unliking'} post:`, error);
        // console.error('Error details:', (error as AxiosError)?.response?.data || (error as Error)?.message);
        // console.error('Full error object:', error);
        setIsLiked(previousIsLiked);
        setLikesCount(previousLikesCount);

        // Revert localStorage as well
        if (isClient) {
          localStorage.setItem(`post_like_${post._id}`, previousIsLiked.toString());
          localStorage.setItem(`post_likes_count_${post._id}`, previousLikesCount.toString());
        }
      } finally {
        // //console.log(`=== LIKE TOGGLE END - Expected final state: isLiked: ${shouldLike}, loading: false ===`);
        setIsLoading(false);
      }
    });
  };

  const handlePrevMedia = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentMediaIndex((prev) =>
      prev > 0 ? prev - 1 : post.media.length - 1
    );
  };

  const handleNextMedia = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentMediaIndex((prev) =>
      prev < post.media.length - 1 ? prev + 1 : 0
    );
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingEdit) return;
    try {
      setIsSavingEdit(true);
      const payload: EditPostPayload = {
        caption: editForm.caption?.trim() || '',
        description: editForm.description?.trim() || '',
        tags: (editForm.tags || []).filter(Boolean)
      };
      await editPost(post._id, payload);
      // Optimistically update visible fields
      (post as unknown as { caption?: string }).caption = payload.caption;
      (post as unknown as { description?: string }).description = payload.description;
      (post as unknown as { tags?: string[] }).tags = payload.tags;
      setIsEditingPost(false);
      toast.success('Post updated');
    } catch {
      // console.error('Failed to update post', err);
      toast.error('Failed to update post');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Touch handlers for swipe functionality
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe && post.media.length > 1) {
      handleNextMedia({ stopPropagation: () => { } } as React.MouseEvent);
    }
    if (isRightSwipe && post.media.length > 1) {
      handlePrevMedia({ stopPropagation: () => { } } as React.MouseEvent);
    }
  };

  // (removed unused handlePostClick helper)

  // const handleCommentSubmit = async (e: React.FormEvent) => {
  //   e.preventDefault();
  //   requireAuth(async () => {
  //     if (!comment.trim() || isSubmittingComment) return;

  //     setIsSubmittingComment(true);
  //     try {
  //       //console.log(`Adding comment to post ${post._id}:`, comment);

  //       // Call the actual API to create comment
  //       const newComment = await createComment({
  //         postId: post._id,
  //         content: comment.trim()
  //       });

  //       //console.log('Comment created successfully:', newComment);

  //       // Update comments count optimistically and clear input
  //       const newCount = commentsCount + 1;
  //       setCommentsCount(newCount);
  //       setComment('');

  //       // Save the updated comment count to localStorage for persistence
  //       if (isClient) {
  //         localStorage.setItem(`post_comments_count_${post._id}`, newCount.toString());
  //       }

  //       // Emit event for comment count change to sync across components
  //       postEvents.emit(post._id, 'commentCountChange', newCount);

  //       // Note: The backend automatically updates the post's comment count
  //       // The saved count will persist until the server provides a higher count

  //     } catch (error: any) {
  //       console.error('Error adding comment:', error);

  //       // Revert the comment count on error
  //       setCommentsCount(commentsCount);
  //       if (isClient) {
  //         localStorage.setItem(`post_comments_count_${post._id}`, commentsCount.toString());
  //       }

  //       // Show user-friendly error message
  //       const errorMessage = error?.response?.data?.message || 'Failed to add comment. Please try again.';
  //       alert(errorMessage);
  //     } finally {
  //       setIsSubmittingComment(false);
  //     }
  //   });
  // };

  const handleCommentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    requireAuth(() => {
      // If we're on a single post page, focus on the existing comments section instead of opening drawer
      if (pathname.includes('/post/')) {
        // Find and focus the comments section on the page
        const commentsSection = document.querySelector('[data-comments-section]');
        if (commentsSection) {
          commentsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
          // Focus on the comment input if it exists
          const commentInput = commentsSection.querySelector('textarea, input[type="text"]') as HTMLElement;
          if (commentInput) {
            setTimeout(() => commentInput.focus(), 300); // Small delay for smooth scroll
          }
        }
      } else {
        // On home page or other pages, show the comment drawer
        setShowCommentDrawer(true);
      }
    });
  };

  const handleShareClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Open share modal - works for both guests and authenticated users
    setShowShareModal(true);
  };

  const handleTagClick = (tag: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // Remove the # if it exists and clean the tag
    const cleanTag = tag.replace(/^#/, '').trim();
    // Navigate to search page with the tag as query
    router.push(`/search?q=${encodeURIComponent(cleanTag)}`);
  };

  const handleToggleSavePost = async () => {
    requireAuth(async () => {
      if (isSaving) return;

      setIsSaving(true);
      const previousSavedState = isPostSaved;

      try {
        if (isPostSaved) {
          // //console.log(`Unsaving post ${post._id}`);
          await unsavePost(post._id);
          setIsPostSaved(false);

          // Update cache
          updateSavedPostsCache(post._id, false);

          // //console.log('Post unsaved successfully');
          toast.info('Post removed from saved!', { autoClose: 2000 });
        } else {
          // //console.log(`Saving post ${post._id}`);
          await savePost(post._id);
          setIsPostSaved(true);

          // Update cache
          updateSavedPostsCache(post._id, true);

          // //console.log('Post saved successfully');
          toast.success('Post saved successfully!', { autoClose: 2000 });
        }
        setShowDropdown(false);
      } catch {
        // console.error('Error toggling save status:', error);
        setIsPostSaved(previousSavedState); // Revert state on error
        toast.error(`Error ${isPostSaved ? 'removing' : 'saving'} post. Please try again.`);
      } finally {
        setIsSaving(false);
      }
    });
  };

  // Helper function to update cached saved posts
  const updateSavedPostsCache = (postId: string, isSaved: boolean) => {
    try {
      const cachedData = localStorage.getItem(CACHE_KEY);
      if (cachedData) {
        let savedPostIds: string[] = JSON.parse(cachedData);

        if (isSaved && !savedPostIds.includes(postId)) {
          savedPostIds.push(postId);
        } else if (!isSaved) {
          savedPostIds = savedPostIds.filter(id => id !== postId);
        }

        localStorage.setItem(CACHE_KEY, JSON.stringify(savedPostIds));
      }
    } catch {
      // console.error('Error updating cache:', error);
    }
  };

  // Helper function to format timestamp based on context (feed vs profile/detail)
  const getFormattedTimestamp = () => {
    return timestampFormat === 'exact'
      ? formatExactDateTime(post.createdAt)
      : formatRelativeTime(post.createdAt);
  };

  // Handle opening like list modal
  const handleLikeCountClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (likesCount > 0) {
      try {
        // Fetch the post to get the full list of users who liked it
        const postData = await getPostById(post._id);
        if (postData && postData.likedBy && Array.isArray(postData.likedBy)) {
          setLikedByUsers(postData.likedBy);
        }
      } catch (error) {
        console.error('Error fetching likes:', error);
      }
      setShowLikeListModal(true);
    }
  };

  // Toast-based confirm helper
  const confirmWithToast = (message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      const id = toast(
        <div className="flex flex-col gap-3">
          <p className="text-sm text-gray-900">{message}</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { toast.dismiss(id); resolve(true); }}
              className="px-3 py-1 rounded-md bg-red-600 text-white text-xs"
            >
              Delete
            </button>
            <button
              onClick={() => { toast.dismiss(id); resolve(false); }}
              className="px-3 py-1 rounded-md border text-xs"
            >
              Cancel
            </button>
          </div>
        </div>,
        { autoClose: false, closeOnClick: false }
      );
    });
  };

  const handleDeletePost = async () => {
    requireAuth(async () => {
      if (isDeleting) return;

      const confirmDelete = await confirmWithToast('Are you sure you want to delete this post? This action cannot be undone.');
      if (!confirmDelete) return;

      setIsDeleting(true);
      try {
        // //console.log(`Deleting post ${post._id}`);
        await deletePost(post._id);

        // //console.log('Post deleted successfully');
        setShowDropdown(false);

        // Call the callback if provided to remove from UI
        if (onPostDeleted) {
          onPostDeleted(post._id);
        }

        toast.success('Post deleted successfully!', { autoClose: 2000 });
      } catch {
        // console.error('Error deleting post:', error);
        toast.error('Error deleting post. Please try again.');
      } finally {
        setIsDeleting(false);
      }
    });
  };

  const handleReportPost = () => {
    requireAuth(() => {
      setShowReportModal(true);
      setShowDropdown(false);
    });
  };


  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showDropdown && !(event.target as Element).closest('.dropdown-menu')) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  // Check if post is saved on component mount
  useEffect(() => {
    const checkSavedStatus = async () => {
      try {
        const savedPostIds = await getSavedPostsCache();
        const isCurrentPostSaved = savedPostIds.includes(post._id);
        setIsPostSaved(isCurrentPostSaved);
      } catch {
        // console.error('Error checking saved status:', error);
        setIsPostSaved(false);
      } finally {
        setCheckingSaved(false);
      }
    };

    if (isClient && user) {
      checkSavedStatus();
    } else if (isClient && !user) {
      setIsPostSaved(false);
      setCheckingSaved(false);
    }
  }, [post._id, isClient, user]);

  // Don't render if essential post data is missing
  if (!post || !post._id || !post.media || post.media.length === 0) {
    // console.warn('PostCard: Essential post data missing', { post: post?._id, hasMedia: post?.media?.length > 0 });
    return null;
  }

  return (
    <div className="relative overflow-x-hidden w-full">
      <div
        className={`w-full max-w-full bg-white ${showCommentDrawer ? 'rounded-t-3xl shadow-none border-b-0' : 'rounded-none sm:rounded-3xl shadow-sm'} border border-gray-200 overflow-hidden hover:shadow-md transition-all duration-200 relative ${pathname.includes('/post/') ? 'cursor-default' : 'cursor-pointer'
          }`}
        onClick={(e) => {
          // Do not redirect while editing
          if (isEditingPost) return;

          // Only open post in new tab if not clicking interactive elements
          const target = e.target as HTMLElement;
          if (
            target.closest('.post-media') ||
            target.closest('.edit-panel') ||
            target.closest('button') ||
            target.closest('a') ||
            target.closest('input') ||
            target.closest('textarea') ||
            target.closest('select') ||
            target.closest('.fixed') ||
            target.closest('[role="dialog"]')
          ) {
            return;
          }
          // Check authentication before opening post
          requireAuth(() => {
            router.push(`/post/${post._id}`);
          });
        }}
        data-post-id={post._id}
      >
        {/* Desktop Layout: Media + Info Side-by-Side | Mobile Layout: Stacked */}
        <div className="flex flex-col md:flex-row gap-3 md:gap-4 p-2 sm:p-3 md:p-4 md:max-w-full md:mx-auto">

          {/* Mobile: User Profile and Name with Location (Top Section) */}
          <div className="md:hidden flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  requireAuth(() => {
                    router.push(`/userprofile/${post.username || post.userId?.username}`);
                  });
                }}
                className="cursor-pointer"
              >
                <Image
                  width={40}
                  height={40}
                  src={
                    profileImageError || !post.profileImageUrl
                      ? '/placeholderimg.png'
                      : post.profileImageUrl
                  }
                  alt={(post.username || post.userId?.username) || 'User Profile Image'}
                  className="w-10 h-10 rounded-full object-cover hover:opacity-80 transition-opacity"
                  onError={() => setProfileImageError(true)}
                />
              </div>
              <div>
                <div className='flex gap-2 items-center'>
                  <h3
                    className="font-semibold text-gray-900 cursor-pointer hover:text-[#cc9b2e] transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      requireAuth(() => {
                        router.push(`/userprofile/${post.username || post.userId?.username}`);
                      });
                    }}
                  >
                    {post.username || post.userId?.username || 'No Username'}
                  </h3>
                  {/* Subscription Badge */}
                  <SubscriptionBadge badge={post.userId?.subscriptionBadge} size="sm" />
                  {/* Review Stars */}
                  {post.userId?.review && (
                    <StarRating
                      currentRating={post.userId.review.averageRating}
                      readonly={true}
                      size="sm"
                    />
                  )}
                  {/* Privacy Indicator */}
                  {post.settings?.privacy === 'private' && (
                    <div className="flex items-center gap-1 px-2 py-0.5 bg-orange-50 border border-orange-200 rounded-full">
                      <Lock className="w-3 h-3 text-orange-600" />
                      <span className="text-xs font-medium text-orange-700">Private</span>
                    </div>
                  )}
                  {post.settings?.privacy === 'public' && isOwnPost && (
                    <div className="flex items-center gap-1 px-2 py-0.5 bg-green-50 border border-green-200 rounded-full">
                      <Globe className="w-3 h-3 text-green-600" />
                      <span className="text-xs font-medium text-green-700">Public</span>
                    </div>
                  )}
                </div>
                {/* Content Type Badge - Moved to separate row */}
                {post.contentType && post.contentType.toLowerCase() !== 'normal' && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <Badge className='bg-button-gradient' variant='outline'>{post.contentType}</Badge>
                  </div>
                )}
                {shouldShowLocation && (
                  <div className="flex items-center gap-1 text-gray-700">
                    <MapPin className="w-3 h-3 text-[#ffd65c]" />
                    <p className="text-xs">{normalizedLocationName}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile: Three Dot Menu */}
            <div className="relative dropdown-menu">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  // Gate opening the menu behind auth
                  const opened = requireAuth(() => {
                    setShowDropdown(prev => !prev);
                  });
                  if (!opened) return; // AuthDialog will show
                }}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <MoreVertical className="w-5 h-5 text-gray-600" />
              </button>

              {/* Dropdown Menu */}
              {showDropdown && (
                <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 min-w-[120px]">
                  {/* Save button - only show if not own post */}
                  {!isOwnPost && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleSavePost();
                      }}
                      disabled={isSaving || checkingSaved}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50"
                    >
                      {checkingSaved ? (
                        <>
                          <Bookmark className="w-4 h-4" />
                          Checking...
                        </>
                      ) : isPostSaved ? (
                        <>
                          <BookmarkCheck className="w-4 h-4 text-[#cc9b2e]" />
                          {isSaving ? 'Removing...' : 'Unsave'}
                        </>
                      ) : (
                        <>
                          <Bookmark className="w-4 h-4" />
                          {isSaving ? 'Saving...' : 'Save'}
                        </>
                      )}
                    </button>
                  )}

                  {/* Delete button - only for own posts */}
                  {canEdit && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePost();
                      }}
                      disabled={isDeleting}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                      {isDeleting ? 'Deleting...' : 'Delete'}
                    </button>
                  )}

                  {/* Edit button - only show when allowed */}
                  {canEdit && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditForm({
                          caption: post.caption || '',
                          description: post.description || '',
                          tags: Array.isArray(post.tags) ? post.tags.map(t => (typeof t === 'string' ? t : String(t))) : []
                        });
                        setIsEditingPost(true);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Pencil className="w-4 h-4" />
                      Edit
                    </button>
                  )}

                  {/* Create Payment Link - only for business users on their product/service/business posts */}
                  {canEdit && user?.isBusinessProfile && (post.contentType === 'product' || post.contentType === 'service' || post.contentType === 'business') && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDropdown(false);
                        setShowPaymentLinkModal(true);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <LinkIcon className="w-4 h-4" />
                      Create Payment Link
                    </button>
                  )}

                  {/* Report button - only show if not own post */}
                  {!isOwnPost && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReportPost();
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Flag className="w-4 h-4" />
                      Report
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Mobile: Edit Panel */}
          {canEdit && isEditingPost && (
            <form
              onSubmit={handleEditSubmit}
              onClick={(e) => e.stopPropagation()}
              className="md:hidden mt-2 bg-[#fefdf5] border border-[#ffe08a] rounded-xl p-4 text-black edit-panel shadow-sm"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Pencil className="w-4 h-4 text-[#b8871f]" />
                  <span className="font-semibold">Edit Post</span>
                </div>
                <button
                  type="button"
                  aria-label="Close edit"
                  onClick={(e) => { e.stopPropagation(); setIsEditingPost(false); }}
                  className="px-2 py-1 rounded-md text-sm text-yellow-800 hover:bg-yellow-100"
                >
                  ×
                </button>
              </div>

              <div className="grid gap-3">
                <div>
                  <label className="block text-xs font-medium text-yellow-800 mb-1">Caption</label>
                  <input
                    type="text"
                    value={editForm.caption || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, caption: e.target.value }))}
                    placeholder="Write a catchy caption"
                    className="w-full border border-yellow-300 rounded-md p-2 text-sm text-black placeholder-gray-600 bg-[#fefdf5] focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-yellow-800 mb-1">Description</label>
                  <textarea
                    value={editForm.description || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Add more details about your post"
                    className="w-full border border-yellow-300 rounded-md p-2 text-sm text-black placeholder-gray-600 bg-[#fefdf5] focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-yellow-800 mb-1">Tags</label>
                  <input
                    type="text"
                    value={(editForm.tags || []).join(', ')}
                    onChange={(e) => setEditForm(prev => ({ ...prev, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) }))}
                    placeholder="Comma separated (e.g., updated, edited)"
                    className="w-full border border-yellow-300 rounded-md p-2 text-sm text-black placeholder-gray-600 bg-[#fefdf5] focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => setIsEditingPost(false)}
                  className="px-3 py-2 rounded-md text-sm bg-white/70 hover:bg-white text-gray-800 border border-amber-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className={`px-4 py-2 rounded-md text-sm text-white text-shadow ${isSavingEdit ? 'bg-gray-400' : 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600'} shadow`}
                >
                  {isSavingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          )}

          {/* Business/Service/Product Details - Mobile Only (Before Media) */}
          <div className="md:hidden mb-2 w-full max-w-full overflow-x-hidden">
            {post.contentType === 'service' && <ServiceCard post={post} />}
            {post.contentType === 'product' && <ProductCard post={post} />}
            {post.contentType === 'business' && <BusinessPostCard post={post} />}
          </div>

          {/* Media Section */}
          <div
            ref={elementRef}
            className="post-media relative w-full md:w-[21rem] md:flex-shrink-0 overflow-hidden rounded-2xl group flex items-center justify-center"
            style={{ height: '400px' }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* Prepare current media with safe guards to avoid empty src warnings */}
            {(() => {
              const currentMedia = post.media[currentMediaIndex];
              const rawUrl = typeof currentMedia?.url === 'string' ? currentMedia.url.trim() : '';
              const safeUrl = rawUrl.length > 0 ? rawUrl : undefined; // undefined so browser/next won't treat as empty string
              const rawThumb = typeof currentMedia?.thumbnailUrl === 'string' ? currentMedia.thumbnailUrl.trim() : '';
              const safeThumb = rawThumb.length > 0 ? rawThumb : '/placeholderimg.png';
              const isVideo = currentMedia?.type === 'video' && !!safeUrl;

              if (isVideo) {
                return (
                  <div className="relative w-full h-full">
                    <video
                      ref={(el) => {
                        videoRef.current = el;

                        // Register with video manager when ref is set
                        if (el && post._id) {
                          videoManager.register({
                            id: `post-${post._id}-media-${currentMediaIndex}`,
                            videoElement: el,
                            location: 'post',
                            pauseCallback: () => {
                              // Update component state when paused by manager
                              if (el && !el.paused) {
                                el.pause();
                              }
                            }
                          });
                        }
                      }}
                      className="w-full h-full object-cover rounded-xl cursor-zoom-in"
                      poster={safeThumb}
                      muted={isVideoMuted}
                      loop
                      autoPlay
                      preload="auto"
                      playsInline
                      onCanPlay={(e) => {
                        // Ensure video is visible once it can play
                        const video = e.currentTarget;
                        video.style.opacity = '1';
                      }}
                      onLoadStart={(e) => {
                        // Show poster/first frame immediately
                        const video = e.currentTarget;
                        video.style.opacity = '1';
                      }}
                      onLoadedMetadata={() => {
                        // Let CSS object-cover handle the fit
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowImageModal(true);
                      }}
                    >
                      {/* Always render source if we have a valid video URL */}
                      {safeUrl && <source src={safeUrl} type="video/mp4" />}
                      Your browser does not support the video tag.
                    </video>

                    {/* Sound Control Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsVideoMuted(!isVideoMuted);
                      }}
                      className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 transition-all duration-200 z-10"
                      title={isVideoMuted ? "Unmute" : "Mute"}
                    >
                      {isVideoMuted ? (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                        </svg>
                      )}
                    </button>
                  </div>
                );
              }

              // Image fallback (also covers case where media.type === 'video' but url missing/empty)
              const firstNonEmptyUrl = post.media.find(m => (m.url || '').trim().length > 0)?.url?.trim();
              const imageUrl = mediaImageError
                ? '/placeholderimg.png'
                : safeUrl || firstNonEmptyUrl || '/placeholderimg.png';

              return (
                <Image
                  src={imageUrl}
                  alt="Post content"
                  fill
                  sizes="(min-width: 768px) 336px, 100vw"
                  className="rounded-xl w-full h-full object-cover cursor-zoom-in"
                  priority={Boolean(isPriority && currentMediaIndex === 0)}
                  placeholder="blur"
                  blurDataURL={safeThumb}
                  onError={() => {
                    setMediaImageError(true);
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowImageModal(true);
                  }}
                />
              );
            })()}

            {/* Navigation Controls - Only show if more than 1 media item */}
            {post.media.length > 1 && (
              <>
                {/* Previous Button */}
                <button
                  onClick={handlePrevMedia}
                  className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                {/* Next Button */}
                <button
                  onClick={handleNextMedia}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>

                {/* Media Count Indicator */}
                <div className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
                  {currentMediaIndex + 1} / {post.media.length}
                </div>

                {/* Dots Indicator */}
                <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex space-x-1">
                  {post.media.map((_, index) => (
                    <button
                      key={index}
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentMediaIndex(index);
                      }}
                      className={`w-2 h-2 rounded-full transition-all duration-200 ${index === currentMediaIndex
                          ? 'bg-white'
                          : 'bg-white/50 hover:bg-white/75'
                        }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Desktop: Profile + Info - Hidden on mobile */}
          <div className="hidden md:flex flex-col justify-start flex-1 space-y-1 relative pb-16 w-full md:max-w-md lg:max-w-lg overflow-x-hidden">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    requireAuth(() => {
                      router.push(`/userprofile/${post.username || post.userId?.username}`);
                    });
                  }}
                  className="cursor-pointer"
                >
                  <Image
                    width={40}
                    height={40}
                    src={
                      profileImageError || !post.profileImageUrl
                        ? '/placeholderimg.png'
                        : post.profileImageUrl
                    }
                    alt={(post.username || post.userId?.username) || 'User Profile Image'}
                    className="w-10 h-10 rounded-full object-cover hover:opacity-80 transition-opacity"
                    onError={() => setProfileImageError(true)}
                  />
                </div>
                <div>
                  <div className='flex gap-2'>
                    <h3
                      className="font-semibold text-gray-900 cursor-pointer hover:text-[#cc9b2e] transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        requireAuth(() => {
                          router.push(`/userprofile/${post.username || post.userId?.username}`);
                        });
                      }}
                    >
                      {post.username || post.userId?.username || 'No Username'}
                    </h3>
                    {/* Subscription Badge */}
                    <SubscriptionBadge badge={post.userId?.subscriptionBadge} size="sm" />
                    {/* Review Stars */}
                    {post.userId?.review && (
                      <StarRating
                        currentRating={post.userId.review.averageRating}
                        readonly={true}
                        size="sm"
                      />
                    )}
                    {/* Privacy Indicator */}
                    {post.settings?.privacy === 'private' && (
                      <div className="flex items-center gap-1 px-2 py-0.5 bg-orange-50 border border-orange-200 rounded-full">
                        <Lock className="w-3 h-3 text-orange-600" />
                        <span className="text-xs font-medium text-orange-700">Private</span>
                      </div>
                    )}
                    {post.settings?.privacy === 'public' && isOwnPost && (
                      <div className="flex items-center gap-1 px-2 py-0.5 bg-green-50 border border-green-200 rounded-full">
                        <Globe className="w-3 h-3 text-green-600" />
                        <span className="text-xs font-medium text-green-700">Public</span>
                      </div>
                    )}
                  </div>
                  {/* Content Type Badge - Moved to separate row */}
                  {post.contentType && post.contentType.toLowerCase() !== 'normal' && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <Badge className='bg-button-gradient' variant='outline'>{post.contentType}</Badge>
                    </div>
                  )}
                  {shouldShowLocation && (
                    <div className="flex items-center gap-1 text-gray-700">
                      <MapPin className="w-3 h-3 text-[#ffd65c]" />
                      <p className="text-xs">{normalizedLocationName}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Desktop: Three Dot Menu */}
              <div className="relative dropdown-menu">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDropdown(!showDropdown);
                  }}
                  className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <MoreVertical className="w-5 h-5 text-gray-600" />
                </button>

                {/* Dropdown Menu */}
                {showDropdown && (
                  <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 min-w-[120px]">
                    {/* Save button - only show if not own post */}
                    {!isOwnPost && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleSavePost();
                        }}
                        disabled={isSaving || checkingSaved}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50"
                      >
                        {checkingSaved ? (
                          <>
                            <Bookmark className="w-4 h-4" />
                            Checking...
                          </>
                        ) : isPostSaved ? (
                          <>
                            <BookmarkCheck className="w-4 h-4 text-[#cc9b2e]" />
                            {isSaving ? 'Removing...' : 'Unsave'}
                          </>
                        ) : (
                          <>
                            <Bookmark className="w-4 h-4" />
                            {isSaving ? 'Saving...' : 'Save'}
                          </>
                        )}
                      </button>
                    )}

                    {/* Delete button - only for own posts */}
                    {canEdit && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePost();
                        }}
                        disabled={isDeleting}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                        {isDeleting ? 'Deleting...' : 'Delete'}
                      </button>
                    )}

                    {/* Edit button - only show for own posts */}
                    {canEdit && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditForm({
                            caption: post.caption || '',
                            description: post.description || '',
                            tags: Array.isArray(post.tags) ? post.tags.map(t => (typeof t === 'string' ? t : String(t))) : []
                          });
                          setIsEditingPost(true);
                          setShowDropdown(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Pencil className="w-4 h-4" />
                        Edit
                      </button>
                    )}

                    {/* Create Payment Link - only for business users on their product/service/business posts */}
                    {canEdit && user?.isBusinessProfile && (post.contentType === 'product' || post.contentType === 'service' || post.contentType === 'business') && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowDropdown(false);
                          setShowPaymentLinkModal(true);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <LinkIcon className="w-4 h-4" />
                        Create Payment Link
                      </button>
                    )}

                    {/* Report button - only show if not own post */}
                    {!isOwnPost && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReportPost();
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Flag className="w-4 h-4" />
                        Report
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            <p className="text-gray-900 leading-relaxed">{post.caption}</p>
            {canEdit && isEditingPost && (
              <form
                onSubmit={handleEditSubmit}
                onClick={(e) => e.stopPropagation()}
                className="mt-2 bg-[#fefdf5] border border-[#ffe08a] rounded-xl p-4 text-black edit-panel shadow-sm"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Pencil className="w-4 h-4 text-[#b8871f]" />
                    <span className="font-semibold">Edit Post</span>
                  </div>
                  <button
                    type="button"
                    aria-label="Close edit"
                    onClick={(e) => { e.stopPropagation(); setIsEditingPost(false); }}
                    className="px-2 py-1 rounded-md text-sm text-yellow-800 hover:bg-yellow-100"
                  >
                    ×
                  </button>
                </div>

                <div className="grid gap-3">
                  <div>
                    <label className="block text-xs font-medium text-yellow-800 mb-1">Caption</label>
                    <input
                      type="text"
                      value={editForm.caption || ''}
                      onChange={(e) => setEditForm(prev => ({ ...prev, caption: e.target.value }))}
                      placeholder="Write a catchy caption"
                      className="w-full border border-yellow-300 rounded-md p-2 text-sm text-black placeholder-gray-600 bg-[#fefdf5] focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-yellow-800 mb-1">Description</label>
                    <textarea
                      value={editForm.description || ''}
                      onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Add more details about your post"
                      className="w-full border border-yellow-300 rounded-md p-2 text-sm text-black placeholder-gray-600 bg-[#fefdf5] focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none"
                      rows={3}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-yellow-800 mb-1">Tags</label>
                    <input
                      type="text"
                      value={(editForm.tags || []).join(', ')}
                      onChange={(e) => setEditForm(prev => ({ ...prev, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) }))}
                      placeholder="Comma separated (e.g., updated, edited)"
                      className="w-full border border-yellow-300 rounded-md p-2 text-sm text-black placeholder-gray-600 bg-[#fefdf5] focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 mt-4">
                  <button
                    type="button"
                    onClick={() => setIsEditingPost(false)}
                    className="px-3 py-2 rounded-md text-sm bg-white/70 hover:bg-white text-gray-800 border border-amber-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingEdit}
                    className={`px-4 py-2 rounded-md text-sm text-white text-shadow ${isSavingEdit ? 'bg-gray-400' : 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600'} shadow`}
                  >
                    {isSavingEdit ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            )}

            {/* Desktop: Business/Service/Product Details */}
            <div className="w-full max-w-full overflow-hidden">
              {post.contentType === 'service' && <ServiceCard post={post} />}
              {post.contentType === 'product' && <ProductCard post={post} />}
              {post.contentType === 'business' && <BusinessPostCard post={post} />}
            </div>

            {/* Desktop: Hashtags */}
            <div className="px-1 pb-2">
              <div className="flex flex-wrap gap-2">
                {post.tags && Array.isArray(post.tags) && post.tags.length > 0 && post.tags.map((tag, index) => (
                  <button
                    key={index}
                    onClick={(e) => handleTagClick(typeof tag === 'string' ? tag : String(tag), e)}
                    className='text-[#cc9b2e] hover:text-yellow-800 hover:underline transition-colors cursor-pointer'
                  >
                    #{typeof tag === 'string' ? tag : String(tag)}
                  </button>
                ))}
              </div>
            </div>

            {/* Comment Box - Only show for normal/regular posts and not on single post pages */}
            {/* {(!post.contentType || post.contentType === 'normal' || post.contentType === 'regular') && !pathname.includes('/post/') && (
              <div className="px-2 -mb-5 mt-auto">
                <form onSubmit={handleCommentSubmit} className="flex items-center gap-3 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-full border border-[#ffe08a] px-4 py-2 shadow-sm hover:shadow-md transition-all duration-200">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Add a comment..."
                      className="w-full py-2 px-4 text-sm bg-transparent border-none focus:outline-none text-gray-800 placeholder-gray-500 font-medium"
                      disabled={isSubmittingComment}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!comment.trim() || isSubmittingComment}
                    className={`flex items-center justify-center p-2 rounded-full transition-all duration-200 ${
                      comment.trim() && !isSubmittingComment
                        ? 'bg-gradient-to-r from-yellow-400 to-orange-400 hover:from-yellow-500 hover:to-orange-500 text-white shadow-md hover:shadow-lg transform hover:scale-105'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {isSubmittingComment ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <MessageCircle className="w-4 h-4" />
                    )}
                  </button>
                </form>
              </div>
            )} */}

            {/* Desktop: Engagement buttons and timestamp - inside info panel */}
            <div className="px-1 sm:px-2 py-1 absolute bottom-0 w-full pr-20 sm:pr-24">
              <div className="flex items-center">
                <div className="flex items-center space-x-2 sm:space-x-4">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleLikeToggle(); }}
                    disabled={isLoading}
                    className={`flex items-center space-x-1 sm:space-x-2 p-1 sm:p-2 rounded-lg transition-colors ${isLiked
                        ? 'text-red-500'
                        : 'text-gray-600 hover:text-red-500'
                      } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'}`}
                  >
                    <Heart className={`w-4 h-4 sm:w-5 sm:h-5 ${isLiked ? 'fill-current' : ''}`} />
                    <span
                      onClick={handleLikeCountClick}
                      className={`text-xs sm:text-sm font-medium ${likesCount > 0 ? 'cursor-pointer hover:underline' : ''}`}
                    >
                      {likesCount}
                    </span>
                  </button>
                  <button
                    onClick={handleCommentClick}
                    className="flex items-center space-x-1 sm:space-x-2 p-1 sm:p-2 rounded-lg text-gray-600 hover:text-blue-500 hover:bg-gray-100 transition-colors"
                  >
                    <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="text-xs sm:text-sm font-medium">{commentsCount || 0}</span>
                  </button>
                  <button
                    onClick={handleShareClick}
                    className="flex items-center space-x-1 sm:space-x-2 p-1 sm:p-2 rounded-lg text-gray-600 hover:text-green-500 hover:bg-gray-100 transition-colors"
                  >
                    <Image
                      src="/reply.png"
                      alt="Share"
                      width={20}
                      height={20}
                      className="w-4 h-4 sm:w-5 sm:h-5"
                    />
                    <span className="text-xs sm:text-sm font-medium hidden xs:inline">{post.engagement.shares || 0}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Desktop: Timestamp */}
            <div className="absolute bottom-1 sm:bottom-2 right-1 sm:right-2 text-xs text-gray-500">
              <p className="text-xs text-gray-700 p-1 sm:p-2 whitespace-nowrap">{getFormattedTimestamp()}</p>
            </div>
          </div>

          {/* Mobile: Content Below Media */}
          <div className="md:hidden space-y-2">
            {/* Mobile: Caption */}
            <p className="text-gray-900 leading-relaxed text-sm">{post.caption}</p>

            {/* Mobile: Hashtags */}
            {post.tags && Array.isArray(post.tags) && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {post.tags.map((tag, index) => (
                  <button
                    key={index}
                    onClick={(e) => handleTagClick(typeof tag === 'string' ? tag : String(tag), e)}
                    className='text-[#cc9b2e] hover:text-yellow-800 hover:underline transition-colors cursor-pointer text-sm'
                  >
                    #{typeof tag === 'string' ? tag : String(tag)}
                  </button>
                ))}
              </div>
            )}

            {/* Mobile: Engagement Buttons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={(e) => { e.stopPropagation(); handleLikeToggle(); }}
                  disabled={isLoading}
                  className={`flex items-center space-x-2 p-2 rounded-lg transition-colors ${isLiked
                      ? 'text-red-500'
                      : 'text-gray-600 hover:text-red-500'
                    } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'}`}
                >
                  <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
                  <span
                    onClick={handleLikeCountClick}
                    className={`text-sm font-medium ${likesCount > 0 ? 'cursor-pointer hover:underline' : ''}`}
                  >
                    {likesCount}
                  </span>
                </button>
                <button
                  onClick={handleCommentClick}
                  className="flex items-center space-x-2 p-2 rounded-lg text-gray-600 hover:text-blue-500 hover:bg-gray-100 transition-colors"
                >
                  <MessageCircle className="w-5 h-5" />
                  <span className="text-sm font-medium">{commentsCount || 0}</span>
                </button>
                <button
                  onClick={handleShareClick}
                  className="flex items-center space-x-2 p-2 rounded-lg text-gray-600 hover:text-green-500 hover:bg-gray-100 transition-colors"
                >
                  <Image
                    src="/reply.png"
                    alt="Share"
                    width={20}
                    height={20}
                    className="w-5 h-5"
                  />
                  <span className="text-sm font-medium">{post.engagement.shares || 0}</span>
                </button>
              </div>

              {/* Mobile: Timestamp */}
              <p className="text-xs text-gray-500">{getFormattedTimestamp()}</p>
            </div>
          </div>
        </div>

        {/* Create Payment Link Button - Only for business users on their own product/service/business posts */}
        {canEdit && user?.isBusinessProfile && (post.contentType === 'product' || post.contentType === 'service' || post.contentType === 'business') && (
          <div className="px-4 pb-4 pt-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowPaymentLinkModal(true);
              }}
              className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-md"
            >
              <LinkIcon className="w-5 h-5" />
              Create Payment Link
            </button>
          </div>
        )}
      </div>



      {/* Comment Drawer - positioned directly attached to post card */}
      {showCommentDrawer && (
        <CommentDrawer
          isOpen={showCommentDrawer}
          onClose={() => setShowCommentDrawer(false)}
          post={post}
        />
      )}

      {/* Auth Dialog */}
      <AuthDialog isOpen={showAuthDialog} onClose={closeAuthDialog} />

      {/* Report Modal */}
      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        contentType="post"
        contentId={post._id}
      />

      {/* Share Modal */}
      <PostShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        postId={post._id}
        postType={post.postType as 'photo' | 'reel' | 'video' | 'story'}
        authorName={post.username || post.userId?.username || 'this creator'}
        caption={post.caption}
      />

      {/* Image Modal */}
      <ImageModal
        isOpen={showImageModal}
        onClose={() => setShowImageModal(false)}
        post={post}
      />

      {/* Like List Modal */}
      <LikeListModal
        postId={post._id}
        isOpen={showLikeListModal}
        onClose={() => setShowLikeListModal(false)}
        initialLikes={likedByUsers}
      />

      {/* Create Payment Link Modal */}
      <CreatePaymentLinkModal
        isOpen={showPaymentLinkModal}
        onClose={() => setShowPaymentLinkModal(false)}
        postId={post._id}
        productName={
          post.contentType === 'product'
            ? (post.customization?.product?.name || post.caption || 'Product')
            : post.contentType === 'service'
            ? (post.customization?.service?.name || post.caption || 'Service')
            : post.contentType === 'business'
            ? (post.customization?.business?.businessName || post.caption || 'Business')
            : (post.caption || 'Item')
        }
        productImage={post.media?.[0]?.url}
        suggestedPrice={
          post.contentType === 'product'
            ? (typeof post.customization?.product?.price === 'number' ? post.customization.product.price : parseFloat(post.customization?.product?.price || '0'))
            : post.contentType === 'service'
            ? (typeof post.customization?.service?.price === 'number' ? post.customization.service.price : parseFloat(post.customization?.service?.price || '0'))
            : undefined
        }
      />
    </div>
  );
}

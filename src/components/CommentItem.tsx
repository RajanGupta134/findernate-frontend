'use client';

import { useState, memo, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Heart, MessageCircle, MoreHorizontal, Edit, Trash2, Flag } from 'lucide-react';
import { Button } from './ui/button';
import { Comment, likeComment, unlikeComment, updateComment, deleteComment, getCommentById } from '@/api/comment';
import { useUserStore } from '@/store/useUserStore';
import { formatRelativeTime } from '@/utils/formatDate';
import ReportModal from './ReportModal';
import AddComment from './AddComment';
import { emitCommentLikeNotification } from '@/hooks/useCommentNotifications';
import SubscriptionBadge from './ui/SubscriptionBadge';

interface CommentItemProps {
  comment: Comment;
  onUpdate: (updatedComment: Comment) => void;
  onDelete: (commentId: string) => void;
  onReplyAdded?: (reply: Comment) => void;
  isReply?: boolean;
  parentCommentId?: string; // For nested replies - track the root comment ID
  parentCommentUsername?: string; // Username of the user being replied to (fallback)
}

const CommentItem = memo(({ comment, onUpdate, onDelete, onReplyAdded, isReply = false, parentCommentId, parentCommentUsername }: CommentItemProps) => {
  const { user } = useUserStore();
  const router = useRouter();

  // Helper to safely get the username being replied to
  const getReplyToUsername = () => {
    // Priority 1: Check if replyToUserId object has username
    if (comment.replyToUserId && typeof comment.replyToUserId === 'object' && comment.replyToUserId.username) {
      return comment.replyToUserId.username;
    }
    // Priority 2: Use fallback from props
    if (parentCommentUsername) {
      return parentCommentUsername;
    }
    // Priority 3: Check if comment.user exists (for backwards compatibility)
    if (comment.user && comment.parentCommentId) {
      return null; // Will show without mention if we can't determine
    }
    return null;
  };

  const replyToUsername = getReplyToUsername();

  // Extract user data - handle both string userId and object userId
  const commentUser = (comment.user || (typeof comment.userId === 'object' ? comment.userId : null)) as typeof comment.user;
  const commentUserId = typeof comment.userId === 'string' ? comment.userId : comment.userId?._id;

  // Determine depth and limits BEFORE state initialization
  const MAX_REPLY_DEPTH = 4;
  const MAX_COLLAPSIBLE_DEPTH = 2;
  const currentDepth = comment.depth || (isReply ? 1 : 0);
  const canReply = currentDepth < MAX_REPLY_DEPTH;
  const shouldShowViewButton = currentDepth <= MAX_COLLAPSIBLE_DEPTH;

  // Use the new backend field: isLikedBy
  const [isLiked, setIsLiked] = useState(comment.isLikedBy || false);
  const [likesCount, setLikesCount] = useState(comment.likesCount || 0);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [showOptions, setShowOptions] = useState(false);
  const [isLikeLoading, setIsLikeLoading] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [replies, setReplies] = useState<Comment[]>(comment.replies || []);
  // For depth 3+, always show replies (no toggle)
  const [showReplies, setShowReplies] = useState(currentDepth > MAX_COLLAPSIBLE_DEPTH);
  const [isLoadingReplies, setIsLoadingReplies] = useState(false);
  const [repliesFetched, setRepliesFetched] = useState(false);
  const [actualReplyCount, setActualReplyCount] = useState<number | null>(null); // Actual count from backend
  const [hasLocalReplies, setHasLocalReplies] = useState(false); // Track if we have manually added replies

  const isOwnComment = user?._id === commentUserId;
  const canLikeComment = !isOwnComment; // Disable like for own comments

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleProfileClick = () => {
    if (commentUser?.username) {
      // Check if this is the current user's own comment
      if (user?._id === commentUserId) {
        router.push('/profile');
      } else {
        router.push(`/userprofile/${commentUser.username}`);
      }
    }
  };

  const handleLikeToggle = async () => {
    if (isLikeLoading) return;

    setIsLikeLoading(true);
    const previousIsLiked = isLiked;
    const previousLikesCount = likesCount;

    // Optimistic update
    const shouldLike = !isLiked;
    setIsLiked(shouldLike);
    setLikesCount(shouldLike ? likesCount + 1 : likesCount - 1);

    try {
      if (shouldLike) {
        try {
          const response = await likeComment(comment._id);

          // Update with response data from backend
          if (response.data) {
            const { likedBy, isLikedBy } = response.data;

            // Update parent component with new like status from backend
            onUpdate({
              ...comment,
              likes: likedBy,
              isLikedBy: isLikedBy,
              likesCount: likedBy.length
            });

            // Update local state with backend response
            setLikesCount(likedBy.length);
            setIsLiked(isLikedBy);
          }

          // Emit notification for comment like
          if (user?.username && comment.user?._id) {
            emitCommentLikeNotification({
              commentId: comment._id,
              likerUsername: user.username,
              commentOwnerId: comment.user._id
            });
          }
        } catch (likeError: any) {
          // Handle "already liked" error or self-like restriction
          if (likeError?.response?.status === 409) {
            //console.log(`Comment ${comment._id} already liked or self-like not allowed - treating as successful`);
            return; // Keep the optimistic update
          }
          throw likeError;
        }
      } else {
        try {
          const response = await unlikeComment(comment._id);

          // Update with response data from backend
          if (response.data) {
            const { likedBy, isLikedBy } = response.data;

            // Update parent component with new unlike status from backend
            onUpdate({
              ...comment,
              likes: likedBy,
              isLikedBy: isLikedBy,
              likesCount: likedBy.length
            });

            // Update local state with backend response
            setLikesCount(likedBy.length);
            setIsLiked(isLikedBy);
          }
        } catch (unlikeError: any) {
          // Handle "like not found" error
          if (unlikeError?.response?.status === 404 ||
              unlikeError?.response?.data?.message?.includes('not found')) {
            //console.log(`Like not found for comment ${comment._id} - treating as successful unlike`);
            return; // Keep the optimistic update
          }
          throw unlikeError;
        }
      }
    } catch (error: any) {
      // Revert optimistic update on unexpected errors
      console.error('Error toggling comment like:', error);
      setIsLiked(previousIsLiked);
      setLikesCount(previousLikesCount);

      // Show user-friendly message for specific errors
      if (error?.response?.status === 409) {
        //console.log('Cannot like your own comment or comment already liked');
      }
    } finally {
      setIsLikeLoading(false);
    }
  };

  const handleEdit = async () => {
    try {
      const updatedComment = await updateComment(comment._id, editContent);
      onUpdate({ ...comment, content: editContent, isEdited: true });
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating comment:', error);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this comment?')) {
      try {
        await deleteComment(comment._id);
        onDelete(comment._id);
      } catch (error) {
        console.error('Error deleting comment:', error);
      }
    }
  };

  const handleReplyAdded = (reply: Comment) => {
    // Add reply to local state for immediate display
    setReplies(prev => [reply, ...prev]);
    setActualReplyCount(prev => (prev !== null ? prev + 1 : 1));
    setShowReplyBox(false);
    setShowReplies(true);
    setRepliesFetched(true); // Mark as fetched since we now have data
    setHasLocalReplies(true); // Mark that we have locally added replies

    // Also notify parent component if callback is provided
    onReplyAdded?.(reply);

    // If this is a nested reply, also notify the root comment to update its count
    if (onUpdate && comment.replyCount !== undefined) {
      onUpdate({
        ...comment,
        replyCount: (comment.replyCount || 0) + 1
      });
    }
  };

  const handleReplyUpdate = (updatedReply: Comment) => {
    setReplies(prev => 
      prev.map(reply => 
        reply._id === updatedReply._id ? updatedReply : reply
      )
    );
  };

  const handleReplyDelete = (replyId: string) => {
    setReplies(prev => prev.filter(reply => reply._id !== replyId));
    setActualReplyCount(prev => (prev !== null && prev > 0 ? prev - 1 : 0));
  };

  // Fetch replies from backend
  const fetchReplies = async () => {
    // Don't fetch if already loading or already fetched
    if (isLoadingReplies || repliesFetched) {
      return;
    }

    // If we have locally added replies, don't fetch - just show them
    if (hasLocalReplies && replies.length > 0) {
      setShowReplies(true);
      return;
    }

    setIsLoadingReplies(true);

    try {
      const response = await getCommentById(comment._id);

      // The backend returns: { comment: {...}, replies: { comments: [...], totalReplies: N } }
      if (response && response.replies) {
        if (Array.isArray(response.replies)) {
          // replies is directly an array (fallback format)
          const fetchedReplies = response.replies;
          // Merge with existing local replies (avoid duplicates)
          const mergedReplies = mergeLists(replies, fetchedReplies);
          setReplies(mergedReplies);
          setActualReplyCount(mergedReplies.length);
          setRepliesFetched(true);
          setShowReplies(mergedReplies.length > 0);
        } else if (response.replies.comments && Array.isArray(response.replies.comments)) {
          // replies is an object with comments array (primary format)
          const fetchedReplies = response.replies.comments;
          const totalReplies = response.replies.totalReplies || fetchedReplies.length;

          // Merge with existing local replies (avoid duplicates)
          const mergedReplies = mergeLists(replies, fetchedReplies);

          // IMPORTANT: Never clear replies if we have local ones, even if backend returns 0
          if (hasLocalReplies && mergedReplies.length === 0 && replies.length > 0) {
            // Backend hasn't synced yet, keep local replies
            console.warn('[CommentItem] Backend returned 0 replies but we have local ones. Keeping local.');
            setActualReplyCount(replies.length);
            setRepliesFetched(true);
            setShowReplies(true);
          } else {
            setReplies(mergedReplies);
            setActualReplyCount(Math.max(totalReplies, mergedReplies.length));
            setRepliesFetched(true);
            setShowReplies(mergedReplies.length > 0);
          }
        } else {
          // Unexpected format - keep existing local replies if any
          if (hasLocalReplies && replies.length > 0) {
            console.warn('[CommentItem] Unexpected response format. Keeping local replies.');
            setShowReplies(true);
          } else if (replies.length > 0) {
            setShowReplies(true);
          } else {
            setActualReplyCount(0);
            setRepliesFetched(true);
            setShowReplies(false);
          }
        }
      } else {
        // No replies found from backend - keep existing local replies if any
        if (hasLocalReplies && replies.length > 0) {
          console.warn('[CommentItem] Backend returned no replies but we have local ones. Keeping local.');
          setActualReplyCount(replies.length);
          setRepliesFetched(true);
          setShowReplies(true);
        } else if (replies.length > 0) {
          setActualReplyCount(replies.length);
          setRepliesFetched(true);
          setShowReplies(true);
        } else {
          setActualReplyCount(0);
          setRepliesFetched(true);
          setShowReplies(false);
        }
      }
    } catch (error: any) {
      console.error('[CommentItem] Error fetching replies:', error);
      // On error, still allow toggling with existing local replies
      if (replies.length > 0) {
        setShowReplies(!showReplies);
      }
    } finally {
      setIsLoadingReplies(false);
    }
  };

  // Helper function to merge reply lists and remove duplicates
  const mergeLists = (localReplies: Comment[], fetchedReplies: Comment[]): Comment[] => {
    const merged = [...localReplies];
    const localIds = new Set(localReplies.map(r => r._id));

    // Add fetched replies that aren't already in local
    fetchedReplies.forEach(fetchedReply => {
      if (!localIds.has(fetchedReply._id)) {
        merged.push(fetchedReply);
      }
    });

    // Sort by creation date (newest first)
    return merged.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  };

  const handleToggleReplies = () => {
    if (showReplies) {
      // If already showing, just hide them
      setShowReplies(false);
    } else {
      // If not showing, check if we need to fetch or just show
      if (repliesFetched || (hasLocalReplies && replies.length > 0)) {
        // Already have replies, just show them
        setShowReplies(true);
      } else {
        // Need to fetch from backend
        fetchReplies();
      }
    }
  };

  // Calculate indentation based on depth (max 3 levels for UI)
  const maxDepth = 3;
  const effectiveDepth = comment.depth ? Math.min(comment.depth, maxDepth) : (isReply ? 1 : 0);
  const indentationClass = effectiveDepth > 0 ? `ml-${Math.min(effectiveDepth * 8, 24)}` : '';

  return (
    <div
      id={`comment-${comment._id}`}
      className={`flex gap-3 ${indentationClass} ${isReply || effectiveDepth > 0 ? 'pt-3' : ''}`}
      data-depth={effectiveDepth}
    >
      {/* Profile Image */}
      <div className="flex-shrink-0">
        <button
          onClick={handleProfileClick}
          className="focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-1 rounded-full"
        >
          {commentUser?.profileImageUrl ? (
            <Image
              src={commentUser.profileImageUrl}
              alt={commentUser.username || 'User'}
              width={32}
              height={32}
              className="rounded-full object-cover hover:ring-2 hover:ring-yellow-400 transition-all cursor-pointer"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-button-gradient flex items-center justify-center hover:ring-2 hover:ring-yellow-400 transition-all cursor-pointer">
              <span className="text-white text-shadow text-xs font-bold">
                {getInitials(commentUser?.fullName || commentUser?.username || 'U')}
              </span>
            </div>
          )}
        </button>
      </div>

      {/* Comment Content */}
      <div className="flex-1">
        <div className="bg-gray-50 rounded-lg px-3 py-2">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleProfileClick}
                className="font-semibold text-sm text-gray-900 hover:text-yellow-600 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-1 rounded"
              >
                {commentUser?.fullName || commentUser?.username || 'Unknown User'}
              </button>
              <SubscriptionBadge badge={commentUser?.subscriptionBadge} size="sm" />
              {comment.isEdited && (
                <span className="text-xs text-gray-500">(edited)</span>
              )}
            </div>

            {/* Options Menu */}
            <div className="relative">
              <button
                onClick={() => setShowOptions(!showOptions)}
                className="p-1 hover:bg-gray-200 rounded"
              >
                <MoreHorizontal className="w-4 h-4 text-gray-500" />
              </button>

              {showOptions && (
                <div className="absolute right-0 top-full mt-1 bg-white border rounded-lg shadow-lg z-10 min-w-[120px]">
                  {isOwnComment ? (
                    <>
                      <button
                        onClick={() => {
                          setIsEditing(true);
                          setShowOptions(false);
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Edit className="w-3 h-3" />
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          handleDelete();
                          setShowOptions(false);
                        }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 text-red-600 flex items-center gap-2"
                      >
                        <Trash2 className="w-3 h-3" />
                        Delete
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => {
                        setShowReportModal(true);
                        setShowOptions(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Flag className="w-3 h-3" />
                      Report
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Comment Text */}
          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full text-sm text-gray-900 bg-white border rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                rows={2}
              />
              <div className="flex gap-2">
                <Button
                  onClick={handleEdit}
                  size="sm"
                  className="bg-yellow-600 hover:bg-yellow-700 text-white text-xs px-3 py-1"
                >
                  Save
                </Button>
                <Button
                  onClick={() => {
                    setIsEditing(false);
                    setEditContent(comment.content);
                  }}
                  variant="outline"
                  size="sm"
                  className="text-xs px-3 py-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-800">
              {replyToUsername && (
                <span className="text-xs text-gray-500 block mb-1">
                  Replying to <button
                    onClick={(e) => {
                      e.preventDefault();
                      router.push(`/userprofile/${replyToUsername}`);
                    }}
                    className="font-semibold text-blue-600 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded"
                  >
                    @{replyToUsername}
                  </button>
                </span>
              )}
              <span>{comment.content}</span>
            </div>
          )}
        </div>

        {/* Comment Actions */}
        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
          <button
            onClick={handleLikeToggle}
            disabled={isLikeLoading || !canLikeComment}
            className={`flex items-center gap-1 transition-all ${
              canLikeComment ? 'hover:text-red-600 cursor-pointer' : 'cursor-not-allowed opacity-50'
            }`}
            title={!canLikeComment ? "You cannot like your own comment" : ""}
          >
            <Heart
              className={`w-4 h-4 transition-all ${
                isLiked ? 'fill-red-600 text-red-600' : 'text-gray-500'
              }`}
              fill={isLiked ? 'currentColor' : 'none'}
            />
            <span className={`${isLiked ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
              {likesCount}
            </span>
          </button>

          {canReply && (
            <button
              onClick={() => setShowReplyBox(!showReplyBox)}
              className="flex items-center gap-1 hover:text-blue-600"
              title={currentDepth >= MAX_REPLY_DEPTH ? `Maximum reply depth (${MAX_REPLY_DEPTH}) reached` : ''}
            >
              <MessageCircle className="w-3 h-3" />
              Reply
            </button>
          )}

          {shouldShowViewButton && (replies.length > 0 || hasLocalReplies || (actualReplyCount !== null ? actualReplyCount > 0 : (comment.replyCount && comment.replyCount > 0))) && (
            <button
              onClick={handleToggleReplies}
              disabled={isLoadingReplies || (repliesFetched && replies.length === 0)}
              className="flex items-center gap-1 hover:text-blue-600 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoadingReplies ? (
                <>
                  <div className="w-3 h-3 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                  Loading...
                </>
              ) : repliesFetched && replies.length === 0 ? (
                <span className="text-gray-400 text-xs">No replies</span>
              ) : (
                <>
                  {showReplies ? 'Hide' : 'View'} {actualReplyCount !== null ? actualReplyCount : (comment.replyCount || replies.length)} {((actualReplyCount !== null ? actualReplyCount : (comment.replyCount || replies.length)) === 1) ? 'reply' : 'replies'}
                </>
              )}
            </button>
          )}

          <span>{formatRelativeTime(comment.createdAt)}</span>
        </div>

        {/* Reply Box */}
        {showReplyBox && canReply && (
          <div className="mt-3">
            <AddComment
              postId={comment.postId}
              parentCommentId={comment._id}
              originalCommenterUserId={commentUserId}
              originalCommenterUsername={commentUser?.username}
              onCommentAdded={handleReplyAdded}
              placeholder={`Reply to ${commentUser?.fullName || commentUser?.username || 'this comment'}...`}
              shouldFocus={true}
            />
          </div>
        )}

        {/* Replies */}
        {/* For depth 3+, always show replies (no toggle). For depth 0-2, respect showReplies state */}
        {(currentDepth > MAX_COLLAPSIBLE_DEPTH || showReplies) && replies.length > 0 && (
          <div className="mt-3 space-y-3">
            {replies.map((reply) => (
              <CommentItem
                key={reply._id}
                comment={reply}
                onUpdate={handleReplyUpdate}
                onDelete={handleReplyDelete}
                isReply={true}
                parentCommentUsername={commentUser?.username}
              />
            ))}
          </div>
        )}
      </div>

      {/* Report Modal */}
      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        contentType="comment"
        contentId={comment._id}
      />
    </div>
  );
}, (prevProps, nextProps) => {
  // Only re-render if comment data has actually changed
  return prevProps.comment._id === nextProps.comment._id &&
         prevProps.comment.content === nextProps.comment.content &&
         prevProps.comment.likesCount === nextProps.comment.likesCount &&
         prevProps.comment.isLikedBy === nextProps.comment.isLikedBy &&
         prevProps.comment.replies?.length === nextProps.comment.replies?.length &&
         prevProps.isReply === nextProps.isReply;
});

CommentItem.displayName = 'CommentItem';

export default CommentItem;
'use client';

import { useState, useEffect, useRef, memo, useCallback } from 'react';
import AddComment from './AddComment';
import { MessageCircle } from 'lucide-react';
import CommentItem from './CommentItem';
import { Comment } from '@/api/comment';
import { useOptimizedComments } from '@/hooks/useOptimizedComments';
import { commentCacheManager } from '@/utils/commentCache';

interface ReelCommentsSectionProps {
  postId: string;
  initialCommentCount?: number;
  onCommentCountChange?: (count: number) => void;
  maxVisible?: number;
}

const ReelCommentsSection = memo(({ postId, initialCommentCount = 0, onCommentCountChange, maxVisible = 4 }: ReelCommentsSectionProps) => {
  // Use optimized comments hook
  const {
    comments: optimizedComments,
    totalCount: optimizedTotalCount,
    isLoading: optimizedLoading,
    fetchComments
  } = useOptimizedComments({ maxVisible, enablePreloading: false });

  const [localComments, setLocalComments] = useState<Comment[]>([]);
  const [totalCommentCount, setTotalCommentCount] = useState(initialCommentCount);
  const [loading, setLoading] = useState(true);
  const lastPostIdRef = useRef<string>('');

  const handleNewComment = useCallback((newComment: Comment) => {
    // Ensure user info is present for new comment
    let commentWithUser = newComment;
    if (!newComment.user && typeof newComment.userId === 'object' && newComment.userId !== null) {
      commentWithUser = { ...newComment, user: newComment.userId };
    }

    // Update local state
    setLocalComments((prev) => [commentWithUser, ...prev].slice(0, maxVisible));
    setTotalCommentCount((prev) => prev + 1);

    // Update cache with new comment
    const cached = commentCacheManager.getCachedComments(postId);
    if (cached) {
      const updatedComments = [commentWithUser, ...cached.comments].slice(0, maxVisible);
      commentCacheManager.setCachedComments(postId, updatedComments, cached.totalCount + 1);
    }
  }, [postId, maxVisible]);

  const handleReplyAdded = useCallback((reply: Comment) => {
    // Ensure user info is present for reply
    let replyWithUser = reply;
    if (!reply.user && typeof reply.userId === 'object' && reply.userId !== null) {
      replyWithUser = { ...reply, user: reply.userId };
    }

    // Add reply to the parent comment's replies array
    setLocalComments((prev) =>
      prev.map((comment) => {
        if (comment._id === reply.parentCommentId) {
          return {
            ...comment,
            replies: [...(comment.replies || []), replyWithUser]
          };
        }
        return comment;
      })
    );
    setTotalCommentCount((prev) => prev + 1);

    // Update cache with new reply
    const cached = commentCacheManager.getCachedComments(postId);
    if (cached) {
      const updatedComments = cached.comments.map((comment) => {
        if (comment._id === reply.parentCommentId) {
          return {
            ...comment,
            replies: [...(comment.replies || []), replyWithUser]
          };
        }
        return comment;
      });
      commentCacheManager.setCachedComments(postId, updatedComments, cached.totalCount + 1);
    }
  }, [postId]);

  // Fetch comments when postId changes using optimized hook
  useEffect(() => {
    if (postId && postId !== lastPostIdRef.current) {
      setLoading(true);
      lastPostIdRef.current = postId;

      // Check cache first for instant display
      const cached = commentCacheManager.getCachedComments(postId);
      if (cached) {
        setLocalComments(cached.comments);
        setTotalCommentCount(cached.totalCount);
        setLoading(false);
      } else {
        // Fetch with optimized hook
        fetchComments(postId).then(() => {
          setLoading(false);
        });
      }
    }
  }, [postId, fetchComments]);

  // Sync optimized comments with local state
  useEffect(() => {
    if (optimizedComments.length > 0) {
      setLocalComments(optimizedComments);
    }
    if (optimizedTotalCount > 0) {
      setTotalCommentCount(optimizedTotalCount);
    }
    if (!optimizedLoading) {
      setLoading(false);
    }
  }, [optimizedComments, optimizedTotalCount, optimizedLoading]);

  useEffect(() => {
    if (typeof onCommentCountChange === 'function') {
      onCommentCountChange(totalCommentCount);
    }
  }, [totalCommentCount]);

  return (
    <div className="space-y-4 p-3">
      <div className="flex items-center gap-2 mb-2">
        <MessageCircle className="w-5 h-5 text-gray-600" />
        <h3 className="text-base font-semibold text-gray-900">Comments ({totalCommentCount})</h3>
      </div>
      {/* Comment input box (matches AddComment style) */}
      <div className="mb-3">
        <AddComment postId={postId} onCommentAdded={handleNewComment} />
      </div>
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-yellow-500 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading comments...</p>
        </div>
      ) : (localComments.length === 0) ? (
        <div className="text-center py-8">
          <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-500 mb-2">No comments yet</h4>
          <p className="text-gray-400">Be the first to comment on this post!</p>
        </div>
      ) : (
        <>
          {localComments.slice(0, maxVisible).map((comment) => (
            <CommentItem
              key={comment._id}
              comment={comment}
              onUpdate={() => {}}
              onDelete={() => {}}
              onReplyAdded={handleReplyAdded}
            />
          ))}
        </>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Only re-render if postId or maxVisible changes
  return prevProps.postId === nextProps.postId &&
         prevProps.maxVisible === nextProps.maxVisible;
});

ReelCommentsSection.displayName = 'ReelCommentsSection';

export default ReelCommentsSection;
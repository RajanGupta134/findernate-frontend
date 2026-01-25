'use client';

import React, { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { useAuthGuard } from '@/hooks/useAuthGuard';

interface CommentProps {
  postId: string;
  commentsCount: number;
  onCommentSubmit?: (comment: string) => Promise<void>;
  onCommentCountChange?: (newCount: number) => void;
  placeholder?: string;
  showCount?: boolean;
  className?: string;
}

const Comment: React.FC<CommentProps> = ({
  postId,
  commentsCount,
  onCommentSubmit,
  onCommentCountChange,
  placeholder = "Add a comment...",
  showCount = true,
  className = ""
}) => {
  const { requireAuth } = useAuthGuard();
  const [comment, setComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    requireAuth(async () => {
      if (!comment.trim() || isSubmittingComment) return;
      
      setIsSubmittingComment(true);
      try {
        if (onCommentSubmit) {
          await onCommentSubmit(comment.trim());
          setComment('');
          
          // Update comment count
          if (onCommentCountChange) {
            onCommentCountChange(commentsCount + 1);
          }
        }
      } catch (error) {
        console.error('Error submitting comment:', error);
      } finally {
        setIsSubmittingComment(false);
      }
    });
  };

  const handleCommentClick = () => {
    requireAuth(() => {
      window.open(`/post/${postId}?focus=comment`, '_blank');
    });
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Comment Count Button */}
      {showCount && (
        <button 
          onClick={handleCommentClick}
          className="flex items-center space-x-2 p-2 rounded-lg text-gray-600 hover:text-blue-500 hover:bg-gray-100 transition-colors w-fit"
        >
          <MessageCircle className="w-5 h-5" />
          <span className="text-sm font-medium">{commentsCount || 0}</span>
        </button>
      )}

      {/* Comment Input Form */}
      <form onSubmit={handleCommentSubmit} className="flex items-center gap-3 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-full border border-yellow-200 px-4 py-2 shadow-sm hover:shadow-md transition-all duration-200">
        <div className="flex-1 relative">
          <input
            type="text"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={placeholder}
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
  );
};

export default Comment;
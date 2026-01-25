'use client';

import { useState, useEffect } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import CommentsSection from './CommentsSection';
import { FeedPost } from '@/types';

interface CommentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  post: FeedPost;
}

export default function CommentDrawer({ isOpen, onClose, post }: CommentDrawerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [animationClass, setAnimationClass] = useState('');

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      setAnimationClass('animate-slideDown');
    } else if (isVisible) {
      setAnimationClass('animate-slideUp');
      const timer = setTimeout(() => {
        setIsVisible(false);
        setAnimationClass('');
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, isVisible]);

  if (!isVisible) return null;

  return (
    <div 
      className={`bg-white border border-gray-200 border-t-0 rounded-b-3xl shadow-lg overflow-hidden transition-all duration-300 ease-out ${
        isOpen 
          ? 'max-h-96 opacity-100 transform translate-y-0' 
          : 'max-h-0 opacity-0 transform -translate-y-2'
      }`}
    >
      
      {/* Header */}
      <div className="flex items-center justify-end px-4 py-2 border-b border-gray-100 bg-gray-50">
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-200 rounded-full transition-colors"
        >
          <ChevronUp className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Content */}
      <div 
        className="max-h-96 overflow-y-auto pb-4 comment-drawer-scroll"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: '#cbd5e0 #f7fafc'
        }}
      >
        <div className="pb-4">
          <CommentsSection 
            postId={post._id}
            postOwnerId={typeof post.userId === 'object' ? post.userId?._id : post.userId}
            initialCommentCount={post.engagement.comments}
            shouldFocusComment={true}
          />
        </div>
      </div>
      
      <style jsx>{`
        .comment-drawer-scroll::-webkit-scrollbar {
          width: 6px;
        }
        .comment-drawer-scroll::-webkit-scrollbar-track {
          background: #f7fafc;
          border-radius: 3px;
        }
        .comment-drawer-scroll::-webkit-scrollbar-thumb {
          background: #cbd5e0;
          border-radius: 3px;
        }
        .comment-drawer-scroll::-webkit-scrollbar-thumb:hover {
          background: #a0aec0;
        }
      `}</style>
    </div>
  );
}
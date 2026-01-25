"use client";

import React, { useState } from 'react';
import { Share2 } from 'lucide-react';
import PostShareModal from './PostShareModal';

interface PostShareButtonProps {
  postId: string;
  postType: 'photo' | 'reel' | 'video' | 'story';
  authorName?: string;
  caption?: string;
  className?: string;
  showText?: boolean;
  shareCount?: number;
}

const PostShareButton: React.FC<PostShareButtonProps> = ({
  postId,
  postType,
  authorName,
  caption,
  className = '',
  showText = false,
  shareCount,
}) => {
  const [showShareModal, setShowShareModal] = useState(false);

  return (
    <>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setShowShareModal(true);
        }}
        className={`flex items-center gap-2 hover:text-green-500 transition-colors ${className}`}
        title="Share"
      >
        <Share2 className="w-6 h-6" />
        {(showText || shareCount !== undefined) && (
          <span className="text-sm font-medium">
            {showText ? 'Share' : shareCount || ''}
          </span>
        )}
      </button>

      <PostShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        postId={postId}
        postType={postType}
        authorName={authorName}
        caption={caption}
      />
    </>
  );
};

export default PostShareButton;

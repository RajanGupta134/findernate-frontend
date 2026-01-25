"use client";

import React, { useState, useEffect } from 'react';
import { X, Share2, Copy, MessageCircle, Send } from 'lucide-react';
import { toast } from 'react-toastify';
import {
  generatePostShareLink,
  generateReelShareLink,
  trackShare,
  copyToClipboard,
  nativeShare,
  getWhatsAppShareUrl,
  getTwitterShareUrl,
  getFacebookShareUrl,
  getTelegramShareUrl,
} from '@/api/share';

interface PostShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
  postType: 'photo' | 'reel' | 'video' | 'story';
  authorName?: string;
  caption?: string;
}

const PostShareModal: React.FC<PostShareModalProps> = ({
  isOpen,
  onClose,
  postId,
  postType,
  authorName = 'this creator',
  caption,
}) => {
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isGuest, setIsGuest] = useState(false);

  // Generate share link when modal opens
  useEffect(() => {
    if (isOpen && !shareLink) {
      generateLink();
    }
  }, [isOpen, postId]);

  // Handle ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      setCopied(false);
    }

    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const generateLink = async () => {
    setLoading(true);
    try {
      // Check if user is authenticated
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const isUserGuest = !token;
      setIsGuest(isUserGuest);

      const isReel = postType === 'reel' || postType === 'video';

      // For guests, just construct the share link directly without calling backend
      if (isUserGuest) {
        const baseUrl = window.location.origin;
        const path = isReel ? 'r' : 'p';
        const link = `${baseUrl}/${path}/${postId}`;
        setShareLink(link);
        setLoading(false);
        return;
      }

      // For authenticated users, call backend to generate link and validate
      const response = isReel
        ? await generateReelShareLink(postId)
        : await generatePostShareLink(postId);

      setShareLink(response.data.shareLink);
    } catch (error: any) {
      console.error('Failed to generate share link:', error);

      // If backend fails, fall back to constructing link directly
      const isReel = postType === 'reel' || postType === 'video';
      const baseUrl = window.location.origin;
      const path = isReel ? 'r' : 'p';
      const link = `${baseUrl}/${path}/${postId}`;
      setShareLink(link);

      // Only show error for non-403 errors (403 means post is private, which is expected)
      if (error.response?.status !== 403) {
        console.warn('Using fallback share link generation');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (!shareLink) return;

    const success = await copyToClipboard(shareLink);
    if (success) {
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);

      // Track share event (only for authenticated users)
      if (!isGuest) {
        try {
          await trackShare(postId, 'copy');
        } catch (error) {
          console.error('Failed to track share:', error);
        }
      }
    } else {
      toast.error('Failed to copy link');
    }
  };

  const handleNativeShare = async () => {
    if (!shareLink) return;

    const title = `Check out this ${postType === 'reel' || postType === 'video' ? 'reel' : 'post'} on FinderNate`;
    const text = caption
      ? `${authorName}: ${caption.substring(0, 100)}${caption.length > 100 ? '...' : ''}`
      : `Check out ${authorName}'s post on FinderNate`;

    const success = await nativeShare(title, text, shareLink);
    if (success) {
      // Track share event (only for authenticated users)
      if (!isGuest) {
        try {
          await trackShare(postId, 'native');
        } catch (error) {
          console.error('Failed to track share:', error);
        }
      }
      onClose();
    }
  };

  const handleSocialShare = async (platform: string, url: string) => {
    window.open(url, '_blank', 'width=600,height=400');

    // Track share event (only for authenticated users)
    if (!isGuest) {
      try {
        await trackShare(postId, platform);
      } catch (error) {
        console.error('Failed to track share:', error);
      }
    }
  };

  const shareText = caption
    ? `Check out this post: ${caption.substring(0, 50)}${caption.length > 50 ? '...' : ''}`
    : `Check out ${authorName}'s post on FinderNate`;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg w-full max-w-md mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
              <Share2 className="w-5 h-5 text-yellow-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Share Post</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-8 h-8 animate-spin rounded-full border-4 border-yellow-600 border-t-transparent mb-3" />
            <p className="text-gray-600 text-sm">Generating share link...</p>
          </div>
        ) : (
          <>
            {/* Share Options */}
            <div className="space-y-3 mb-6">
              {/* Native Share (if available) */}
              {typeof navigator !== 'undefined' && 'share' in navigator && (
                <button
                  onClick={handleNativeShare}
                  className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Share2 className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">Share</div>
                    <div className="text-sm text-gray-500">
                      Share via apps & more
                    </div>
                  </div>
                </button>
              )}

              {/* Copy Link */}
              <button
                onClick={handleCopyLink}
                className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 rounded-lg transition-colors"
              >
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <Copy className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">
                    {copied ? 'Copied!' : 'Copy Link'}
                  </div>
                  <div className="text-sm text-gray-500 truncate">
                    {shareLink || 'Generating...'}
                  </div>
                </div>
              </button>
            </div>

            {/* Social Media Buttons */}
            {shareLink && (
              <div>
                <p className="text-sm text-gray-600 mb-3">Share to:</p>
                <div className="grid grid-cols-4 gap-3">
                  {/* WhatsApp */}
                  <button
                    onClick={() =>
                      handleSocialShare(
                        'whatsapp',
                        getWhatsAppShareUrl(shareLink, shareText)
                      )
                    }
                    className="flex flex-col items-center gap-2 p-3 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                      <MessageCircle className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-xs text-gray-600">WhatsApp</span>
                  </button>

                  {/* Twitter/X */}
                  <button
                    onClick={() =>
                      handleSocialShare(
                        'twitter',
                        getTwitterShareUrl(shareLink, shareText)
                      )
                    }
                    className="flex flex-col items-center gap-2 p-3 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center">
                      <svg
                        viewBox="0 0 24 24"
                        className="w-6 h-6 fill-white"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                      </svg>
                    </div>
                    <span className="text-xs text-gray-600">X</span>
                  </button>

                  {/* Facebook */}
                  <button
                    onClick={() =>
                      handleSocialShare(
                        'facebook',
                        getFacebookShareUrl(shareLink)
                      )
                    }
                    className="flex flex-col items-center gap-2 p-3 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                      <svg
                        viewBox="0 0 24 24"
                        className="w-6 h-6 fill-white"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                      </svg>
                    </div>
                    <span className="text-xs text-gray-600">Facebook</span>
                  </button>

                  {/* Telegram */}
                  <button
                    onClick={() =>
                      handleSocialShare(
                        'telegram',
                        getTelegramShareUrl(shareLink, shareText)
                      )
                    }
                    className="flex flex-col items-center gap-2 p-3 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                      <Send className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-xs text-gray-600">Telegram</span>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default PostShareModal;

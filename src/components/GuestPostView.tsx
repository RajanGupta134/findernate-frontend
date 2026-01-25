"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, MessageCircle, Share2, Clock, MapPin } from 'lucide-react';
import { toast } from 'react-toastify';
import PostShareModal from './PostShareModal';

interface GuestPostViewProps {
  post: {
    _id: string;
    postType: string;
    contentType: string;
    caption?: string;
    description?: string;
    media: Array<{
      type: string;
      url: string;
      thumbnailUrl?: string;
      duration?: number;
    }>;
    engagement: {
      likes: number;
      comments: number;
      shares: number;
      views: number;
    };
    createdAt: string;
    author: {
      username: string;
      fullName: string;
      profileImageUrl: string;
    };
    isLikedBy?: boolean;
    product?: {
      name: string;
      description: string;
      price: number;
      currency: string;
      link?: string;
    };
    service?: {
      name: string;
      description: string;
      price: number;
      currency: string;
      link?: string;
    };
    business?: {
      businessName: string;
      description: string;
      category: string;
      link?: string;
    };
  };
  isGuest: boolean;
}

const GuestPostView: React.FC<GuestPostViewProps> = ({ post, isGuest }) => {
  const router = useRouter();
  const [showShareModal, setShowShareModal] = useState(false);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    const weeks = Math.floor(days / 7);
    if (weeks < 4) return `${weeks}w ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo ago`;
    return `${Math.floor(days / 365)}y ago`;
  };

  const handleGuestAction = (action: string) => {
    toast.info(`Please sign in to ${action}`);
    // Optionally redirect to login
    // router.push('/login');
  };

  const handleNextMedia = () => {
    if (currentMediaIndex < post.media.length - 1) {
      setCurrentMediaIndex(currentMediaIndex + 1);
    }
  };

  const handlePrevMedia = () => {
    if (currentMediaIndex > 0) {
      setCurrentMediaIndex(currentMediaIndex - 1);
    }
  };

  const currentMedia = post.media[currentMediaIndex];
  const isVideo = currentMedia.type === 'video' || post.postType === 'reel' || post.postType === 'video';

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm max-w-2xl mx-auto">
        {/* Header */}
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {post.author.profileImageUrl ? (
              <img
                src={post.author.profileImageUrl}
                alt={post.author.fullName}
                className="w-10 h-10 rounded-full object-cover cursor-pointer"
                onClick={() =>
                  !isGuest && router.push(`/userprofile/${post.author.username}`)
                }
              />
            ) : (
              <div
                className="w-10 h-10 rounded-full bg-yellow-500 flex items-center justify-center text-black font-bold cursor-pointer"
                onClick={() =>
                  !isGuest && router.push(`/userprofile/${post.author.username}`)
                }
              >
                {post.author.fullName?.charAt(0)?.toUpperCase()}
              </div>
            )}
            <div>
              <p
                className="font-semibold text-gray-900 cursor-pointer hover:underline"
                onClick={() =>
                  !isGuest && router.push(`/userprofile/${post.author.username}`)
                }
              >
                {post.author.fullName}
              </p>
              <p className="text-sm text-gray-500">@{post.author.username}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Clock className="w-4 h-4" />
            <span>{formatTimeAgo(post.createdAt)}</span>
          </div>
        </div>

        {/* Caption */}
        {post.caption && (
          <div className="px-4 pb-3">
            <p className="text-gray-800 whitespace-pre-wrap">{post.caption}</p>
          </div>
        )}

        {/* Media */}
        <div className="relative bg-black">
          {isVideo ? (
            <video
              src={currentMedia.url}
              controls
              className="w-full max-h-[600px] object-contain"
              poster={currentMedia.thumbnailUrl}
            >
              Your browser does not support the video tag.
            </video>
          ) : (
            <img
              src={currentMedia.url}
              alt="Post media"
              className="w-full max-h-[600px] object-contain"
            />
          )}

          {/* Media Navigation */}
          {post.media.length > 1 && (
            <>
              {currentMediaIndex > 0 && (
                <button
                  onClick={handlePrevMedia}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2"
                >
                  ←
                </button>
              )}
              {currentMediaIndex < post.media.length - 1 && (
                <button
                  onClick={handleNextMedia}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2"
                >
                  →
                </button>
              )}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                {post.media.map((_, idx) => (
                  <div
                    key={idx}
                    className={`w-1.5 h-1.5 rounded-full ${
                      idx === currentMediaIndex ? 'bg-white' : 'bg-white/50'
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="p-4">
          <div className="flex items-center gap-6 mb-3">
            <button
              onClick={() =>
                isGuest ? handleGuestAction('like') : handleGuestAction('like')
              }
              disabled={isGuest}
              className="flex items-center gap-2 hover:text-red-500 transition-colors disabled:opacity-50"
            >
              <Heart
                className={`w-6 h-6 ${post.isLikedBy ? 'fill-red-500 text-red-500' : ''}`}
              />
              <span className="text-sm font-medium">{post.engagement.likes}</span>
            </button>
            <button
              onClick={() =>
                isGuest
                  ? handleGuestAction('comment')
                  : handleGuestAction('comment')
              }
              disabled={isGuest}
              className="flex items-center gap-2 hover:text-blue-500 transition-colors disabled:opacity-50"
            >
              <MessageCircle className="w-6 h-6" />
              <span className="text-sm font-medium">
                {post.engagement.comments}
              </span>
            </button>
            <button
              onClick={() => setShowShareModal(true)}
              className="flex items-center gap-2 hover:text-green-500 transition-colors"
            >
              <Share2 className="w-6 h-6" />
              <span className="text-sm font-medium">{post.engagement.shares}</span>
            </button>
          </div>

          {/* Guest Sign-in Prompt */}
          {isGuest && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
              <p className="text-sm text-gray-700 mb-2">
                <strong>Sign in to interact</strong>
              </p>
              <p className="text-xs text-gray-600 mb-3">
                Like, comment, and connect with {post.author.fullName} on FinderNate
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => router.push('/login')}
                  className="flex-1 bg-yellow-500 text-black font-medium py-2 px-4 rounded-lg hover:bg-yellow-600 transition-colors text-sm"
                >
                  Sign In
                </button>
                <button
                  onClick={() => router.push('/signup')}
                  className="flex-1 bg-white border border-gray-300 text-gray-700 font-medium py-2 px-4 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                >
                  Sign Up
                </button>
              </div>
            </div>
          )}

          {/* Product/Service/Business Details */}
          {post.product && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">{post.product.name}</h3>
              <p className="text-sm text-gray-700 mb-2">{post.product.description}</p>
              <p className="text-lg font-bold text-gray-900 mb-2">
                {post.product.currency} {post.product.price}
              </p>
              {post.product.link && (
                <a
                  href={post.product.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline text-sm"
                >
                  View Product →
                </a>
              )}
            </div>
          )}

          {post.service && (
            <div className="mt-4 p-4 bg-purple-50 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">{post.service.name}</h3>
              <p className="text-sm text-gray-700 mb-2">{post.service.description}</p>
              <p className="text-lg font-bold text-gray-900 mb-2">
                {post.service.currency} {post.service.price}
              </p>
              {post.service.link && (
                <a
                  href={post.service.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-600 hover:underline text-sm"
                >
                  View Service →
                </a>
              )}
            </div>
          )}

          {post.business && (
            <div className="mt-4 p-4 bg-green-50 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">
                {post.business.businessName}
              </h3>
              <p className="text-sm text-gray-600 mb-1">{post.business.category}</p>
              <p className="text-sm text-gray-700 mb-2">{post.business.description}</p>
              {post.business.link && (
                <a
                  href={post.business.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-600 hover:underline text-sm"
                >
                  Learn More →
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <PostShareModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          postId={post._id}
          postType={post.postType as 'photo' | 'reel' | 'video' | 'story'}
          authorName={post.author.fullName}
          caption={post.caption}
        />
      )}
    </>
  );
};

export default GuestPostView;

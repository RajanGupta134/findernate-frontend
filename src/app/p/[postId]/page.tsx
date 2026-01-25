"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { getSharedPost } from '@/api/share';
import GuestPostView from '@/components/GuestPostView';
import { Loader2, AlertCircle } from 'lucide-react';

export default function SharedPostPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params.postId as string;

  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem('token');
    setIsGuest(!token);

    // Load shared post
    loadSharedPost();
  }, [postId]);

  const loadSharedPost = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await getSharedPost(postId);
      setPost(response.data.post);
    } catch (error: any) {
      console.error('Failed to load shared post:', error);

      const errorMessage = error.response?.data?.message || 'Failed to load post';
      setError(errorMessage);

      // Show appropriate error message
      if (error.response?.status === 403) {
        toast.error('This post is private');
      } else if (error.response?.status === 404) {
        toast.error('Post not found');
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-yellow-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading post...</p>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-sm p-8 max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {error === 'Post not found' ? 'Post Not Found' : 'Unable to Load Post'}
          </h1>
          <p className="text-gray-600 mb-6">
            {error || 'This post may be private, deleted, or unavailable.'}
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => router.push('/')}
              className="flex-1 bg-yellow-500 text-black font-medium py-2 px-4 rounded-lg hover:bg-yellow-600 transition-colors"
            >
              Go to Home
            </button>
            <button
              onClick={() => window.location.reload()}
              className="flex-1 bg-white border border-gray-300 text-gray-700 font-medium py-2 px-4 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* FinderNate Logo/Header */}
        <div className="mb-6 flex items-center justify-between">
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => router.push('/')}
          >
            <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center">
              <span className="text-black font-bold text-xl">F</span>
            </div>
            <span className="text-2xl font-bold text-gray-900">FinderNate</span>
          </div>

          {isGuest && (
            <div className="flex gap-2">
              <button
                onClick={() => router.push('/login')}
                className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={() => router.push('/signup')}
                className="px-4 py-2 bg-yellow-500 text-black font-medium rounded-lg hover:bg-yellow-600 transition-colors"
              >
                Sign Up
              </button>
            </div>
          )}
        </div>

        {/* Post Content */}
        <GuestPostView post={post} isGuest={isGuest} />

        {/* Footer for Guests */}
        {isGuest && (
          <div className="mt-8 text-center">
            <p className="text-gray-600 mb-4">
              Want to see more? Join FinderNate today!
            </p>
            <button
              onClick={() => router.push('/signup')}
              className="bg-yellow-500 text-black font-medium py-3 px-8 rounded-lg hover:bg-yellow-600 transition-colors text-lg"
            >
              Create Account
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

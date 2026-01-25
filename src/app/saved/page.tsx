'use client'

import React, { useState, useEffect } from 'react'
import PostCard from '@/components/PostCard'
import { FeedPost, SavedPostsResponse } from '@/types'
import { getPrivateSavedPosts } from '@/api/post'
import { getCommentsByPost, Comment } from '@/api/comment'
import { useAuthGuard } from '@/hooks/useAuthGuard'
import { AuthDialog } from '@/components/AuthDialog'
import { Bookmark, RefreshCw, LogIn, Heart, MessageCircle } from 'lucide-react'
import Link from 'next/link'

const SavedPage = () => {
  const { requireAuth, showAuthDialog, closeAuthDialog, isAuthenticated, isLoading } = useAuthGuard()
  const [savedPosts, setSavedPosts] = useState<FeedPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSavedPosts = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Fetch all saved posts from unified endpoint
      const savedPostsResponse = await getPrivateSavedPosts(1, 100);

      // Process saved posts
      const allSavedPosts = (savedPostsResponse.data?.savedPosts || [])
        .filter(savedPost => savedPost.postId !== null)
        .map(savedPost => {
          const post = savedPost.postId as any // Raw post data from API

          // Calculate actual comment count from comments array (same logic as MainContent)
          let actualCommentCount = 0;
          if (post.comments && Array.isArray(post.comments)) {
            actualCommentCount = post.comments.reduce((total: number, comment: any) => {
              const repliesCount = comment.replies ? comment.replies.length : 0;
              return total + 1 + repliesCount;
            }, 0);
          }

          // Map to FeedPost structure that PostCard expects
          return {
            _id: post._id,
            userId: post.userId,
            username: post.userId?.username || '',
            profileImageUrl: post.userId?.profileImageUrl || '',
            description: post.description || '',
            caption: post.caption || '',
            contentType: post.contentType,
            postType: post.postType,
            createdAt: post.createdAt,
            media: post.media || [],
            isLikedBy: post.isLikedBy || false,
            likedBy: post.likedBy || [],
            engagement: {
              comments: actualCommentCount,
              impressions: post.engagement?.impressions || 0,
              likes: post.engagement?.likes || 0,
              reach: post.engagement?.reach || 0,
              saves: post.engagement?.saves || 0,
              shares: post.engagement?.shares || 0,
              views: post.engagement?.views || 0,
            },
            location: post.customization?.normal?.location || post.location || null,
            tags: post.customization?.normal?.tags || post.tags || [],
            customization: post.customization,
            // Add comments array for PostCard to use
            comments: post.comments || [],
          } as FeedPost
        })
        .sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )

      //console.log('Total saved posts:', allSavedPosts.length)

      //console.log('Initial saved posts:', allSavedPosts.slice(0, 2));
      
      // Fetch comments for all saved posts
      const postsWithComments = await Promise.all(
        allSavedPosts.map(async (post) => {
          try {
            //console.log(`Fetching comments for saved post: ${post._id}`);
            const commentsResponse = await getCommentsByPost(post._id, 1, 5); // Fetch first 5 comments
            //console.log(`Comments response for saved post ${post._id}:`, commentsResponse);
            
            // Handle different possible response structures
            let comments: Comment[] = [];
            let totalComments = 0;
            
            if (commentsResponse) {
              // Check if response has comments array directly
              if (Array.isArray(commentsResponse.comments)) {
                comments = commentsResponse.comments;
                totalComments = commentsResponse.totalComments || commentsResponse.total || comments.length;
              } else if (Array.isArray(commentsResponse)) {
                // If response is directly an array
                comments = commentsResponse;
                totalComments = comments.length;
              } else {
                //console.log('Unexpected comments response structure:', commentsResponse);
              }
            }
            
            //console.log(`Processed ${comments.length} comments for saved post ${post._id}, total: ${totalComments}`);
            
            return {
              ...post,
              comments: comments,
              // Update engagement comments count with actual comment count
              engagement: {
                ...post.engagement,
                comments: totalComments || post.engagement.comments,
              },
            };
          } catch (error) {
            console.error(`Failed to fetch comments for saved post ${post._id}:`, error);
            return post; // Return post without comments if fetch fails
          }
        })
      );
      
      setSavedPosts(postsWithComments)
    } catch (err) {
      setError('Failed to load saved posts')
      console.error('Error fetching saved posts:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Only fetch if user is authenticated
    if (isAuthenticated) {
      fetchSavedPosts()
    } else {
      setLoading(false)
    }
  }, [isAuthenticated])

  const handleRefresh = () => {
    fetchSavedPosts()
  }

  const handleLoginClick = () => {
    requireAuth(() => {
      // This will trigger a re-render once user is authenticated
      //console.log('User authenticated, saved posts will load');
    });
  };

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login prompt for unauthenticated users
  if (!isAuthenticated) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="text-center bg-white rounded-2xl shadow-lg p-12 max-w-md w-full mx-4">
            <div className="mb-6">
              <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Bookmark className="w-10 h-10 text-yellow-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Sign In to View Saved Posts</h2>
              <p className="text-gray-600 leading-relaxed">
                Save posts that inspire you and access them anytime. Sign in to view your saved collection.
              </p>
            </div>
            
            <div className="space-y-4 mb-6">
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                  <Heart className="w-4 h-4 text-red-500" />
                </div>
                <span>Save posts you love</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <Bookmark className="w-4 h-4 text-blue-600" />
                </div>
                <span>Access your collection anytime</span>
              </div>
            </div>
            
            <button
              onClick={handleLoginClick}
              className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg flex items-center justify-center gap-2"
            >
              <LogIn className="w-5 h-5" />
              Sign In to View Saved Posts
            </button>
            
            <p className="text-sm text-gray-500 mt-4">
              New here? <Link href={"/signup"}><span className="text-yellow-600">Sign up</span></Link> to start saving posts!
            </p>
          </div>
        </div>
        
        <AuthDialog isOpen={showAuthDialog} onClose={closeAuthDialog} />
      </>
    );
  }

  // Show loading state for authenticated users fetching data
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-yellow-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading your saved posts...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-yellow-500 mb-4">{error}</p>
          <button 
            onClick={handleRefresh}
            className="bg-yellow-500 text-black px-4 py-2 rounded-lg hover:bg-yellow-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bookmark className="w-7 h-7 text-yellow-500" />
              <h1 className="text-2xl font-bold text-gray-800">Saved Posts</h1>
            </div>
            <button
              onClick={handleRefresh}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
          <p className="text-gray-600 mt-2">
            {savedPosts.length} saved post{savedPosts.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Posts */}
        {savedPosts.length === 0 ? (
          <div className="text-center py-16">
            <Bookmark className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No saved posts yet</h3>
            <p className="text-gray-500">
              Posts you save will appear here. Start exploring and save posts that inspire you!
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {savedPosts.map((post) => (
              <div key={post._id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <PostCard post={post} />
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Auth Dialog */}
      <AuthDialog isOpen={showAuthDialog} onClose={closeAuthDialog} />
    </div>
  )
}

export default SavedPage

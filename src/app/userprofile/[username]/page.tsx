'use client'

import { getOtherUserProfile } from '@/api/user';
import { getUserPosts, getUserReels, getUserVideos } from '@/api/homeFeed';
import { getUserPublicSavedPosts } from '@/api/post';

import { getCommentsByPost } from '@/api/comment';
import PostCard from '@/components/PostCard';
import ProfilePostsSection from '@/components/ProfilePostsSection';
import UserProfile from '@/components/UserProfile';
import { FeedPost, UserProfile as UserProfileType } from '@/types';
import { useParams } from 'next/navigation';
import React, { useEffect, useState } from 'react'

const UserProfilePage = () => {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [reels, setReels] = useState<FeedPost[]>([]);
  const [videos, setVideos] = useState<FeedPost[]>([]);
  const [savedPosts, setSavedPosts] = useState<FeedPost[]>([]);
  const [profileData, setProfileData] = useState<UserProfileType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const params = useParams();
  const username = params.username as string; // Assuming dynamic route is [username]

  // Helper function to fetch comment counts for posts
  const fetchCommentCounts = async (posts: any[]) => {
    const postsWithComments = await Promise.all(
      posts.map(async (post) => {
        try {
          // Check localStorage first for efficiency
          const savedCommentsCount = localStorage.getItem(`post_comments_count_${post._id}`);
          if (savedCommentsCount !== null) {
            const localCount = parseInt(savedCommentsCount);
            // Use localStorage if it exists and is greater than API count
            if (localCount > (post.engagement?.comments || 0)) {
              return {
                ...post,
                engagement: {
                  ...post.engagement,
                  comments: localCount
                }
              };
            }
          }

          // Fetch actual comment count from API
          const commentsData = await getCommentsByPost(post._id, 1, 1); // Only fetch first page to get total count
          const actualCommentCount = commentsData.totalComments || 0;
          
          //console.log(`Post ${post._id}: API comments=${actualCommentCount}, localStorage=${savedCommentsCount}`);
          
          return {
            ...post,
            engagement: {
              ...post.engagement,
              comments: actualCommentCount
            }
          };
        } catch (error) {
          console.error(`Error fetching comments for post ${post._id}:`, error);
          // Fallback to localStorage or original count
          const savedCommentsCount = localStorage.getItem(`post_comments_count_${post._id}`);
          return {
            ...post,
            engagement: {
              ...post.engagement,
              comments: savedCommentsCount ? parseInt(savedCommentsCount) : (post.engagement?.comments || 0)
            }
          };
        }
      })
    );
    return postsWithComments;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        //console.log("=== DEBUG: Fetching profile for username:", username);
        
        // Fetch other user's profile with a single retry on transient/auth race
        let profileResponse: any;
        try {
          profileResponse = await getOtherUserProfile(username);
        } catch (err: any) {
          const status = err?.response?.status;
          // Retry once on 401/403/5xx or network errors
          if (!profileResponse && (status === 401 || status === 403 || (status >= 500 && status < 600) || !status)) {
            await new Promise((res) => setTimeout(res, 200));
            profileResponse = await getOtherUserProfile(username);
          } else {
            throw err;
          }
        }
        if (profileResponse?.userId) {
          // Transform the backend response to include isFollowing
          // Handle both string and boolean values for isFollowedBy
          const isFollowing = profileResponse.isFollowedBy === true ||
                             profileResponse.isFollowedBy === "True" ||
                             profileResponse.isFollowedBy === "true";

          console.log('Profile API Response - Follow Status:', {
            username: profileResponse.userId.username,
            userId: profileResponse.userId._id,
            isFollowedBy_raw: profileResponse.isFollowedBy,
            isFollowing_computed: isFollowing,
            fullResponse: profileResponse
          });

          const userProfileData = {
            ...profileResponse.userId,
            isFollowing: isFollowing
          };

          setProfileData(userProfileData);
          
          // Fetch user posts, reels, and videos on initial load
          if (profileResponse.userId._id) {
            try {
              // Initialize with empty arrays first
              setPosts([]);
              setReels([]);
              setVideos([]);
              setSavedPosts([]);
              
              // Fetch posts, reels, videos in parallel
              const [postsResponse, reelsResponse, videosResponse] = await Promise.all([
                getUserPosts(profileResponse.userId._id),
                getUserReels(profileResponse.userId._id),
                getUserVideos(profileResponse.userId._id)
              ]);
              
              // Fetch saved posts separately to handle 404 gracefully
              let savedPostsResponse = { data: { savedPosts: [] } };
              try {
                savedPostsResponse = await getUserPublicSavedPosts(profileResponse.userId._id, 1, 100);
              } catch (savedPostsError: any) {
                // Handle 404 or other errors for saved posts gracefully
                if (savedPostsError?.response?.status === 404) {
                  console.log('No public saved posts found for user');
                } else {
                  console.error('Error fetching saved posts:', savedPostsError);
                }
              }
            
            
            // Helper function to process any type of post data
            const processPostData = (response: any, type: string) => {
              return (response.data?.posts || []).map((post: any) => ({
                ...post,
                username: profileResponse.userId.username,
                profileImageUrl: profileResponse.userId.profileImageUrl,
                // Handle tags/hashtags - check customization and top-level fields
                tags: post.customization?.normal?.tags || 
                      post.customization?.business?.tags || 
                      post.customization?.service?.tags || 
                      post.customization?.product?.tags || 
                      (Array.isArray(post.tags) ? post.tags : 
                       Array.isArray(post.hashtags) ? post.hashtags :
                       (post.tags ? [post.tags] : 
                        post.hashtags ? [post.hashtags] : [])),
                // Ensure location is properly structured - check multiple possible locations
                location: post.location || 
                         post.customization?.normal?.location ||
                         (profileResponse.userId?.location ? profileResponse.userId.location : null),
                // Ensure engagement object has all required fields
                engagement: {
                  likes: post.engagement?.likes || 0,
                  comments: post.engagement?.comments || 0,
                  shares: post.engagement?.shares || 0,
                  ...post.engagement
                }
              }));
            };

            // Helper function to process saved posts data (different structure)
            const processSavedPostsData = (response: any) => {
              return (response.data?.savedPosts || [])
                .filter((savedPost: any) => savedPost.postId !== null)
                .map((savedPost: any) => {
                  const post = savedPost.postId; // The actual post data is in postId
                  return {
                    ...post,
                    username: post.userId?.username || profileResponse.userId.username,
                    profileImageUrl: post.userId?.profileImageUrl || profileResponse.userId.profileImageUrl,
                    // Handle tags/hashtags - check customization and top-level fields
                    tags: post.customization?.normal?.tags || 
                          post.customization?.business?.tags || 
                          post.customization?.service?.tags || 
                          post.customization?.product?.tags || 
                          (Array.isArray(post.tags) ? post.tags : 
                           Array.isArray(post.hashtags) ? post.hashtags :
                           (post.tags ? [post.tags] : 
                            post.hashtags ? [post.hashtags] : [])),
                    // Ensure location is properly structured
                    location: post.location || 
                             post.customization?.normal?.location ||
                             null,
                    // Ensure engagement object has all required fields
                    engagement: {
                      likes: post.engagement?.likes || 0,
                      comments: post.engagement?.comments || 0,
                      shares: post.engagement?.shares || 0,
                      ...post.engagement
                    },
                    // Add privacy field for saved posts
                    savedPostPrivacy: 'public' // These are all public since we're fetching public saved posts
                  };
                });
            };

            // Process all post types
            const postsWithUserInfo = processPostData(postsResponse, 'posts');
            const reelsWithUserInfo = processPostData(reelsResponse, 'reels');
            const videosWithUserInfo = processPostData(videosResponse, 'videos');
            const savedPostsWithUserInfo = processSavedPostsData(savedPostsResponse);

            // Fetch actual comment counts for all content types
            //console.log('Fetching comment counts for posts, reels, videos, and saved posts...');
            const [postsWithCommentCounts, reelsWithCommentCounts, videosWithCommentCounts, savedPostsWithCommentCounts] = await Promise.all([
              fetchCommentCounts(postsWithUserInfo),
              fetchCommentCounts(reelsWithUserInfo),
              fetchCommentCounts(videosWithUserInfo),
              fetchCommentCounts(savedPostsWithUserInfo)
            ]);
            
            
            setPosts(postsWithCommentCounts);
            setReels(reelsWithCommentCounts);
            setVideos(videosWithCommentCounts);
            setSavedPosts(savedPostsWithCommentCounts);
            } catch (postsError) {
              console.error('Error fetching posts data:', postsError);
              // Continue without posts data - profile can still load
              setPosts([]);
              setReels([]);
              setVideos([]);
              setSavedPosts([]);
            }
          }
        } else {
          throw new Error("Profile data not found in response");
        }
        
      } catch (error) {
        console.error('Error fetching user profile data:', error);
        setError('Unable to load user profile');
      } finally {
        setLoading(false);
      }
    };

    if (username) {
      fetchData();
    }
  }, [username]);

  const handleTabChange = async () => {
    if (!profileData?._id) return;
    
    // Since we now load all data on initial mount, we don't need to fetch anything here
    // This function now just handles the tab switching without API calls
    
    // Optional: Add refresh logic in the future if needed
    // For now, all data is already loaded on mount
  };

  if (loading) {
    return (
      <div className="bg-gray-50 max-w-6xl mx-auto p-4 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500 mx-auto mb-4"></div>
          <p>Loading user profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-50 max-w-6xl mx-auto p-4 min-h-screen flex items-center justify-center">
        <div className="text-center text-yellow-500">
          <p className="text-lg font-medium">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-yellow-500 text-black rounded-md hover:bg-yellow-600"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="bg-gray-50 max-w-6xl mx-auto p-4 min-h-screen flex items-center justify-center">
        <p>User not found</p>
      </div>
    );
  }

  //console.log("=== DEBUG: About to render UserProfile with data:", {
  //  username: profileData.username,
  //  fullName: profileData.fullName,
  //  _id: profileData._id,
  //  isCurrentUser: false
  // });

  return (
    <div className='bg-gray-50 w-full mx-auto pt-2 px-4'>
      <div className='flex flex-col gap-6 mt-2'>
        <UserProfile 
          userData={profileData}
          isCurrentUser={false} // Important to distinguish between current user and others
        />
        
        <div className='w-full'>
          <ProfilePostsSection
            PostCard={PostCard}
            posts={posts}
            reels={reels}
            videos={videos}
            savedPosts={savedPosts}
            isOtherUser={true}
            loading={false}
            onTabChange={handleTabChange}
            isFullPrivate={profileData?.isFullPrivate || false}
            isBusinessAccount={profileData?.isBusinessProfile || false}
          />
        </div>
      </div>
    </div>
  )
}

export default UserProfilePage
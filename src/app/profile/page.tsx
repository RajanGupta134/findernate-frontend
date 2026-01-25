'use client'
import { getPostsByUserid, getUserReels, getUserVideos } from '@/api/homeFeed';
import { getUserProfile } from '@/api/user';
import { getPrivateSavedPosts } from '@/api/post';
import { getCommentsByPost } from '@/api/comment';
import AccountSettings from '@/components/AccountSettings';
//import FloatingHeader from '@/components/FloatingHeader';
import PostCard from '@/components/PostCard';
import ProfilePostsSection from '@/components/ProfilePostsSection';
import UserProfile from '@/components/UserProfile'
import { useUserStore } from '@/store/useUserStore';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { usePostRefresh } from '@/hooks/usePostRefresh';
import {
  FeedPost, UserProfile as UserProfileType,
  //SavedPostsResponse
} from '@/types';
import React, { useCallback, useEffect, useState } from 'react'
import { LogIn, User } from 'lucide-react';
import { toast } from 'react-toastify';

const Page = () => {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [reels, setReels] = useState<FeedPost[]>([]);
  const [videos, setVideos] = useState<FeedPost[]>([]);
  const [savedPosts, setSavedPosts] = useState<FeedPost[]>([]);
  const [profileData, setProfileData] = useState<UserProfileType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, updateUser } = useUserStore();
  const { isAuthenticated, isLoading } = useAuthGuard();

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

  // Sync profile data to global store when loaded
  useEffect(() => {
    if (profileData && user?._id === profileData._id) {
      updateUser({
        location: profileData.location,
        isBusinessProfile: profileData.isBusinessProfile,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileData?.location, profileData?.isBusinessProfile, user?._id]);

  useEffect(() => {
    const fetchData = async () => {
      // If user is not authenticated, don't fetch data, just stop loading
      if (!isAuthenticated || !user?._id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Fetch user profile
        const profileResponse = await getUserProfile();

        // Updated to match actual API response structure
        // getUserProfile returns response.data.data which is the user profile object directly
        if (profileResponse) {
          setProfileData(profileResponse);
        } else {
          throw new Error("Profile data not found in response");
        }

        // Fetch user posts, reels, and videos (without saved posts to prevent blocking)
        const [postsResponse, reelsResponse, videosResponse] = await Promise.all([
          getPostsByUserid(user._id),
          getUserReels(user._id),
          getUserVideos(user._id)
        ]);

        // Helper function to process post data and ensure location is properly extracted
        const processPostData = (posts: any[]) => {
          return posts.map((post: any) => ({
            ...post,
            // Ensure location is properly structured - check multiple possible locations
            location: post.location ||
              post.customization?.normal?.location ||
              post.customization?.service?.location ||
              post.customization?.product?.location ||
              post.customization?.business?.location ||
              null,
            // Ensure engagement object has all required fields
            engagement: {
              likes: post.engagement?.likes || 0,
              comments: post.engagement?.comments || 0,
              shares: post.engagement?.shares || 0,
              impressions: post.engagement?.impressions || 0,
              reach: post.engagement?.reach || 0,
              saves: post.engagement?.saves || 0,
              views: post.engagement?.views || 0,
              ...post.engagement
            }
          }));
        };

        // Process posts to ensure location is extracted, then fetch comment counts
        const processedPosts = processPostData(postsResponse.data?.posts || []);
        const processedReels = processPostData(reelsResponse.data?.posts || []);
        const processedVideos = processPostData(videosResponse.data?.posts || []);

        // Fetch actual comment counts for all content types
        const [postsWithCommentCounts, reelsWithCommentCounts, videosWithCommentCounts] = await Promise.all([
          fetchCommentCounts(processedPosts),
          fetchCommentCounts(processedReels),
          fetchCommentCounts(processedVideos)
        ]);

        setPosts(postsWithCommentCounts);
        setReels(reelsWithCommentCounts);
        setVideos(videosWithCommentCounts);

        // Check if there's an upgrade message (only show once for all post types)
        const upgradeMessage = postsResponse.data?.upgradeMessage ||
                              reelsResponse.data?.upgradeMessage ||
                              videosResponse.data?.upgradeMessage;

        if (upgradeMessage) {
          toast.warning(
            <div>
              <div className="font-semibold">{upgradeMessage.title}</div>
              <div className="text-sm mt-1">{upgradeMessage.message}</div>
            </div>,
            {
              position: "top-center",
              autoClose: 7000,
              hideProgressBar: false,
              closeOnClick: true,
              pauseOnHover: true,
              draggable: true,
            }
          );
        }

        // Fetch saved posts (single endpoint) separately to prevent blocking other data
        try {
          const savedResponse = await getPrivateSavedPosts(1, 100); // unified /posts/saved
          // Helper function to process saved posts (privacy may come from API or default to 'private')
          const processSavedPosts = (savedPostsData: any[]): (FeedPost & { savedPostPrivacy: 'private' | 'public' } | null)[] => {
            return savedPostsData
              ?.filter((savedPost: any) => savedPost.postId !== null && savedPost.postId !== undefined)
              ?.map((savedPost: any) => {
                const item = savedPost.postId;
                if (!item || !item._id) return null;

                let actualCommentCount = 0;
                if (item.comments && Array.isArray(item.comments)) {
                  actualCommentCount = item.comments.reduce((total: number, comment: any) => {
                    const repliesCount = Array.isArray(comment.replies) ? comment.replies.length : 0;
                    return total + 1 + repliesCount;
                  }, 0);
                }

                const userIdObj = typeof item.userId === 'object' ? item.userId : null;
                const safeUsername = userIdObj?.username || item.username || 'Deleted User';
                const safeProfileImageUrl = userIdObj?.profileImageUrl || item.profileImageUrl || '/placeholderimg.png';

                const privacy = (savedPost.privacy === 'public' || savedPost.privacy === 'private') ? savedPost.privacy : 'private';

                return {
                  _id: item._id,
                  userId: item.userId,
                  username: safeUsername,
                  profileImageUrl: safeProfileImageUrl,
                  description: item.description,
                  caption: item.caption,
                  contentType: item.contentType,
                  postType: item.postType,
                  createdAt: item.createdAt,
                  media: item.media as any[],
                  isLikedBy: item.isLikedBy,
                  likedBy: item.likedBy,
                  customization: item.customization,
                  engagement: {
                    ...(item.engagement || {}),
                    comments: actualCommentCount,
                    impressions: item.engagement?.impressions || 0,
                    likes: item.engagement?.likes || 0,
                    reach: item.engagement?.reach || 0,
                    saves: item.engagement?.saves || 0,
                    shares: item.engagement?.shares || 0,
                    views: item.engagement?.views || 0,
                  },
                  location:
                    item.customization?.normal?.location ||
                    item.customization?.service?.location ||
                    item.customization?.product?.location ||
                    item.customization?.business?.location ||
                    null,
                  tags: item.customization?.normal?.tags || [],
                  savedPostPrivacy: privacy,
                } as FeedPost & { savedPostPrivacy: 'private' | 'public' };
              }) || [];
          };

          const allSavedPosts = processSavedPosts(savedResponse.data?.savedPosts || [])
            .filter((post): post is FeedPost & { savedPostPrivacy: 'private' | 'public' } => post !== null)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

          setSavedPosts(allSavedPosts);
        } catch (savedPostsError) {
          console.error('Error fetching saved posts:', savedPostsError);
          // Set empty array for saved posts if API fails
          setSavedPosts([]);
        }

        //console.log("Posts:", postsResponse.data?.posts);
        //console.log("Reels:", reelsResponse.data?.posts);
        //console.log("Videos:", videosResponse.data?.posts);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load profile data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?._id, isAuthenticated]);

  // Refresh profile posts when new posts are created
  const refreshProfilePosts = useCallback(async () => {
    if (!isAuthenticated || !user?._id) return;

    try {
      // Helper function to process post data and ensure location is properly extracted
      const processPostData = (posts: any[]) => {
        return posts.map((post: any) => ({
          ...post,
          // Ensure location is properly structured - check multiple possible locations
          location: post.location ||
            post.customization?.normal?.location ||
            post.customization?.service?.location ||
            post.customization?.product?.location ||
            post.customization?.business?.location ||
            null,
          // Ensure engagement object has all required fields
          engagement: {
            likes: post.engagement?.likes || 0,
            comments: post.engagement?.comments || 0,
            shares: post.engagement?.shares || 0,
            impressions: post.engagement?.impressions || 0,
            reach: post.engagement?.reach || 0,
            saves: post.engagement?.saves || 0,
            views: post.engagement?.views || 0,
            ...post.engagement
          }
        }));
      };

      // Fetch user posts, reels, and videos (without saved posts to prevent blocking)
      const [postsResponse, reelsResponse, videosResponse] = await Promise.all([
        getPostsByUserid(user._id),
        getUserReels(user._id),
        getUserVideos(user._id)
      ]);

      // Process posts to ensure location is extracted, then fetch comment counts
      const processedPosts = processPostData(postsResponse.data?.posts || []);
      const processedReels = processPostData(reelsResponse.data?.posts || []);
      const processedVideos = processPostData(videosResponse.data?.posts || []);

      // Fetch actual comment counts for all content types
      const [postsWithCommentCounts, reelsWithCommentCounts, videosWithCommentCounts] = await Promise.all([
        fetchCommentCounts(processedPosts),
        fetchCommentCounts(processedReels),
        fetchCommentCounts(processedVideos)
      ]);

      setPosts(postsWithCommentCounts);
      setReels(reelsWithCommentCounts);
      setVideos(videosWithCommentCounts);

      // Fetch saved posts separately to prevent blocking other data
      try {
        const savedResponse = await getPrivateSavedPosts(1, 100); // unified /posts/saved
        const processSavedPosts = (savedPostsData: any[]): (FeedPost & { savedPostPrivacy: 'private' | 'public' } | null)[] => {
          return savedPostsData
            ?.filter((savedPost: any) => savedPost.postId !== null && savedPost.postId !== undefined)
            ?.map((savedPost: any) => {
              const item = savedPost.postId;
              if (!item || !item._id) return null;

              let actualCommentCount = 0;
              if (item.comments && Array.isArray(item.comments)) {
                actualCommentCount = item.comments.reduce((total: number, comment: any) => {
                  const repliesCount = Array.isArray(comment.replies) ? comment.replies.length : 0;
                  return total + 1 + repliesCount;
                }, 0);
              }

              const userIdObj = typeof item.userId === 'object' ? item.userId : null;
              const safeUsername = userIdObj?.username || item.username || 'Deleted User';
              const safeProfileImageUrl = userIdObj?.profileImageUrl || item.profileImageUrl || '/placeholderimg.png';

              const privacy = (savedPost.privacy === 'public' || savedPost.privacy === 'private') ? savedPost.privacy : 'private';

              return {
                _id: item._id,
                userId: item.userId,
                username: safeUsername,
                profileImageUrl: safeProfileImageUrl,
                description: item.description,
                caption: item.caption,
                contentType: item.contentType,
                postType: item.postType,
                createdAt: item.createdAt,
                media: item.media as any[],
                isLikedBy: item.isLikedBy,
                likedBy: item.likedBy,
                customization: item.customization,
                engagement: {
                  ...(item.engagement || {}),
                  comments: actualCommentCount,
                  impressions: item.engagement?.impressions || 0,
                  likes: item.engagement?.likes || 0,
                  reach: item.engagement?.reach || 0,
                  saves: item.engagement?.saves || 0,
                  shares: item.engagement?.shares || 0,
                  views: item.engagement?.views || 0,
                },
                location:
                  item.customization?.normal?.location ||
                  item.customization?.service?.location ||
                  item.customization?.product?.location ||
                  item.customization?.business?.location ||
                  null,
                tags: item.customization?.normal?.tags || [],
                savedPostPrivacy: privacy,
              } as FeedPost & { savedPostPrivacy: 'private' | 'public' };
            }) || [];
        };

        const allSavedPosts = processSavedPosts(savedResponse.data?.savedPosts || [])
          .filter((post): post is FeedPost & { savedPostPrivacy: 'private' | 'public' } => post !== null)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        setSavedPosts(allSavedPosts);
      } catch (savedPostsError) {
        console.error('Error refreshing saved posts:', savedPostsError);
        // Keep existing saved posts if refresh fails
      }
    } catch (error) {
      console.error('Error refreshing profile posts:', error);
    }
  }, [user?._id, isAuthenticated]);

  usePostRefresh(refreshProfilePosts);

  const handleProfileUpdate = async (updatedData: Partial<UserProfileType>) => {
    try {
      if (profileData) {
        const newProfileData = { ...profileData, ...updatedData };
        setProfileData(newProfileData);

        // Update the global user store with the new business status
        if (updatedData.isBusinessProfile !== undefined) {
          updateUser({ isBusinessProfile: updatedData.isBusinessProfile });
        }
      }
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  const handleLoginClick = () => {
    // Direct redirect to signin page instead of showing popup
    window.location.href = '/signin';
  };

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="bg-gray-50 max-w-6xl mx-auto p-4 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show loading spinner while fetching profile data
  if (loading && isAuthenticated) {
    return (
      <div className="bg-gray-50 max-w-6xl mx-auto p-4 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500 mx-auto mb-4 text-black"></div>
          {/*<p>Loading profile data...</p>*/}
        </div>
      </div>
    );
  }

  // Show login prompt for unauthenticated users
  if (!isAuthenticated) {
    return (
      <>
        <div className="bg-gray-50 max-w-6xl mx-auto p-4 min-h-screen">
          {/* <FloatingHeader
            paragraph="Sign in to access your profile"
            heading="Profile"
            username="Guest"
            accountBadge={false}
          /> */}

          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center bg-white rounded-2xl shadow-lg p-12 max-w-md w-full mx-4">
              <div className="mb-6">
                <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <User className="w-10 h-10 text-yellow-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">You&apos;re Not Logged In</h2>
                <p className="text-gray-600 leading-relaxed">
                  Sign in to view your profile, manage your posts, and access account settings.
                </p>
              </div>

              <button
                onClick={handleLoginClick}
                className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg flex items-center justify-center gap-2"
              >
                <LogIn className="w-5 h-5" />
                Sign In to Continue
              </button>

              <p className="text-sm text-gray-500 mt-4">
                Don&apos;t have an account? <a href="/signup" className="text-yellow-600 hover:text-yellow-700 font-medium">Sign up to get started!</a>
              </p>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="bg-gray-50 max-w-6xl mx-auto p-4 min-h-screen flex items-center justify-center">
        <div className="text-center text-red-500 bg-white rounded-2xl shadow-lg p-8 max-w-md w-full mx-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-red-600" />
          </div>
          <p className="text-lg font-medium text-gray-900 mb-2">Oops! Something went wrong</p>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-yellow-500 text-black rounded-lg hover:bg-yellow-600 transition-colors font-medium"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Show "no profile data" state (fallback)
  if (!profileData) {
    return (
      <div className="bg-gray-50 max-w-6xl mx-auto p-4 min-h-screen flex items-center justify-center">
        <div className="text-center bg-white rounded-2xl shadow-lg p-8 max-w-md w-full mx-4">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-gray-500" />
          </div>
          <p className="text-lg font-medium text-gray-900 mb-2">No Profile Data Available</p>
          <p className="text-gray-600 mb-6">We couldn&apos;t load your profile information.</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-yellow-500 text-black rounded-lg hover:bg-yellow-600 transition-colors font-medium"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  // Show authenticated profile page
  return (
    <>
      <div className='bg-gray-50 max-w-6xl mx-auto'>
        {/* <FloatingHeader
          paragraph="Manage your account and business settings"
          heading="Profile"
          username={profileData.fullName || "User"}
          accountBadge={true}
        /> */}

        <div className='flex flex-col gap-6'>
          <UserProfile
            userData={profileData}
            isCurrentUser={true}
            onProfileUpdate={handleProfileUpdate}
          />
          <AccountSettings />
          <div className='w-full'>
            <ProfilePostsSection
              PostCard={PostCard}
              posts={posts.map((post) => {
                const userId = typeof post.userId === 'object' ? post.userId : null;
                return {
                  ...post,
                  username: userId?.username || post.username || '',
                  profileImageUrl: userId?.profileImageUrl || post.profileImageUrl || '',
                  tags: post.customization?.normal?.tags ||
                    post.customization?.business?.tags ||
                    post.customization?.service?.tags ||
                    post.customization?.product?.tags ||
                    post.tags || [],
                };
              })}
              reels={reels.map((post) => {
                const userId = typeof post.userId === 'object' ? post.userId : null;
                return {
                  ...post,
                  username: userId?.username || post.username || '',
                  profileImageUrl: userId?.profileImageUrl || post.profileImageUrl || '',
                  tags: post.customization?.normal?.tags ||
                    post.customization?.business?.tags ||
                    post.customization?.service?.tags ||
                    post.customization?.product?.tags ||
                    post.tags || [],
                };
              })}
              videos={videos.map((post) => {
                const userId = typeof post.userId === 'object' ? post.userId : null;
                return {
                  ...post,
                  username: userId?.username || post.username || '',
                  profileImageUrl: userId?.profileImageUrl || post.profileImageUrl || '',
                  tags: post.customization?.normal?.tags ||
                    post.customization?.business?.tags ||
                    post.customization?.service?.tags ||
                    post.customization?.product?.tags ||
                    post.tags || [],
                };
              })}
              savedPosts={savedPosts}
              isOtherUser={false}
              isFullPrivate={profileData?.isFullPrivate || false}
              isBusinessAccount={profileData?.isBusinessProfile || false}
            />
          </div>
        </div>
      </div>
    </>
  )
}

export default Page
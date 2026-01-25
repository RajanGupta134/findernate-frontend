'use client'

import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { FeedPost } from '@/types';
import PostCard from '@/components/PostCard';
import CommentsSection from '@/components/CommentsSection';
import ProductServiceDetails from '@/components/ProductServiceDetails';
import { getPostById } from '@/api/post';
import { getUserById } from '@/api/user';
import { toast } from 'react-toastify';

const PostPage = () => {
  const [post, setPost] = useState<FeedPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commentCount, setCommentCount] = useState(0);
  const [showProductServiceDetails, setShowProductServiceDetails] = useState(false);
  const params = useParams();
  const searchParams = useSearchParams();
  const postId = params.postId as string;
  const shouldFocusComment = searchParams.get('focus') === 'comment';
  const commentId = searchParams.get('commentId');

  const handleCommentCountChange = useCallback((newCount: number) => {
    setCommentCount(newCount);
    // Update the post object as well to keep it in sync
    setPost(prev => {
      if (prev) {
        return {
          ...prev,
          engagement: {
            ...prev.engagement,
            comments: newCount
          }
        };
      }
      return prev;
    });
  }, []);

  useEffect(() => {
    const loadPost = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch post data from API using post ID
        const postData = await getPostById(postId);
        //console.log('Post data loaded:', postData);
        //console.log('Post data fields:', Object.keys(postData));
        //console.log('Post location:', postData.location);
        //console.log('Post tags:', postData.tags);
        //console.log('Post hashtags:', postData.hashtags);
        //console.log('Post isLikedBy:', postData.isLikedBy);
        //console.log('Post engagement:', postData.engagement);
        //console.log('Post userId object:', postData.userId);
        //console.log('Post raw location field:', postData.location);
        //console.log('Post customization:', postData.customization);
        //console.log('Post customization.normal:', postData.customization?.normal);
        //console.log('Post customization.normal.location:', postData.customization?.normal?.location);
        //console.log('All location-related fields:', Object.keys(postData).filter(key => key.toLowerCase().includes('location')));
        
        // Preserve original username and profile image from post data as fallback
        const originalUsername = postData.username || postData.userId?.username || 'User';
        const originalProfileImage = postData.profileImageUrl || '';

        // Fetch user details if userId is available
        if (postData.userId) {
          try {
            //console.log('Fetching user with ID:', postData.userId);
            const userIdString = typeof postData.userId === 'object' ? postData.userId?._id : postData.userId;
            
            if (userIdString) {
              const userData = await getUserById(userIdString);
              //console.log('User data received:', userData);
              //console.log('Available user fields:', Object.keys(userData));
              //console.log('userData.userId:', userData.userId);
              //console.log('userData.userId.username:', userData.userId?.username);
              //console.log('userData.userId.fullName:', userData.userId?.fullName);
              //console.log('userData.userId.location:', userData.userId?.location);
              //console.log('userData.location:', userData.location);

              // Add username and profile image to post data, fallback to original values
              postData.username = userData.userId?.username || userData.userId?.fullName || originalUsername;
              postData.profileImageUrl = userData.userId?.profileImageUrl || originalProfileImage;

              // Check for location in multiple possible places
              const userLocation = userData.userId?.location || userData.location || null;
              //console.log('Found user location:', userLocation);

              // Ensure location data is properly structured
              if (userLocation && !postData.location) {
                postData.location = userLocation;
              }

              //console.log('Final username set to:', postData.username);
              //console.log('Final location set to:', postData.location);
            } else {
              // No valid user ID, use original values
              postData.username = originalUsername;
              postData.profileImageUrl = originalProfileImage;
            }
          } catch (userError: any) {
            console.error('Failed to fetch user data:', userError);
            // Use original username and profile image instead of generic fallback
            postData.username = originalUsername;
            postData.profileImageUrl = originalProfileImage;
          }
        } else {
          //console.log('No userId found in post data');
          // Use original username and profile image instead of generic fallback
          postData.username = originalUsername;
          postData.profileImageUrl = originalProfileImage;
        }
        
        // Check localStorage for existing like state to override server data
        const savedLikeStatus = localStorage.getItem(`post_like_${postId}`);
        const savedLikesCount = localStorage.getItem(`post_likes_count_${postId}`);
        
        // Ensure all necessary fields are properly structured for PostCard
        const structuredPostData = {
          ...postData,
          // Handle tags/hashtags - check both fields and customization and ensure they're arrays
          tags: (() => {
            // Try different possible fields for tags, including nested customization
            // Check for non-empty arrays or truthy values
            const possibleTags = (postData.tags && postData.tags.length > 0 ? postData.tags : null) || 
                                (postData.hashtags && postData.hashtags.length > 0 ? postData.hashtags : null) || 
                                (postData.tag && postData.tag.length > 0 ? postData.tag : null) || 
                                (postData.customization?.normal?.tags && postData.customization.normal.tags.length > 0 ? postData.customization.normal.tags : null) ||
                                (postData.customization?.product?.tags && postData.customization.product.tags.length > 0 ? postData.customization.product.tags : null) ||
                                (postData.customization?.service?.tags && postData.customization.service.tags.length > 0 ? postData.customization.service.tags : null) ||
                                [];
            
            //console.log('Inside tags function - possibleTags:', possibleTags);
            
            if (Array.isArray(possibleTags)) {
              return possibleTags;
            } else if (typeof possibleTags === 'string') {
              // If it's a string, split by comma or return as single item
              const result = possibleTags.includes(',') ? possibleTags.split(',').map(tag => tag.trim()) : [possibleTags];
              return result;
            }
            return [];
          })(),
          // Ensure engagement object exists with localStorage override for likes
          engagement: {
            ...(postData.engagement || { likes: 0, comments: 0, shares: 0 }),
            likes: savedLikesCount ? parseInt(savedLikesCount) : (postData.engagement?.likes || 0)
          },
          // Use localStorage like status if available, otherwise default to false
          isLikedBy: savedLikeStatus !== null ? savedLikeStatus === 'true' : Boolean(postData.isLikedBy),
          // Ensure location is properly structured - check multiple possible locations
          location: (() => {
            // Try different possible locations
            const possibleLocation = postData.location || 
                                   postData.customization?.normal?.location ||
                                   postData.customization?.product?.location ||
                                   postData.customization?.service?.location ||
                                   (postData.userId && typeof postData.userId === 'object' ? postData.userId.location : null);
            
            // Ensure location has the expected structure
            if (possibleLocation) {
              if (typeof possibleLocation === 'string') {
                return { name: possibleLocation };
              } else if (possibleLocation.name) {
                return possibleLocation;
              }
            }
            return null;
          })()
        };
        
        //console.log('Final structured post data:', structuredPostData);
        //console.log('Final tags array:', structuredPostData.tags);
        //console.log('Final location:', structuredPostData.location);
        //console.log('Final isLikedBy:', structuredPostData.isLikedBy);
        //console.log('Final likes count:', structuredPostData.engagement.likes);
        //console.log('LocalStorage like status:', savedLikeStatus);
        //console.log('LocalStorage likes count:', savedLikesCount);
        //console.log('Tags processing - original tags:', postData.tags);
        //console.log('Tags processing - original hashtags:', postData.hashtags);
        //console.log('Tags processing - original tag (singular):', postData.tag);
        //console.log('Tags processing - customization.normal.tags:', postData.customization?.normal?.tags);
        //console.log('Tags processing - customization.product.tags:', postData.customization?.product?.tags);
        //console.log('Tags processing - customization.service.tags:', postData.customization?.service?.tags);
        //console.log('Tags processing - final result:', structuredPostData.tags);
        //console.log('Location processing - postData.location:', postData.location);
        //console.log('Location processing - customization locations:', {
        //  normal: postData.customization?.normal?.location,
        //  product: postData.customization?.product?.location,
        //  service: postData.customization?.service?.location
        // });
        //console.log('Location processing - final result:', structuredPostData.location);

        // Check if post has upgrade message (for free business users viewing their own posts)
        if (postData.upgradeMessage && postData.isVisibleToOthers === false) {
          toast.warning(
            <div>
              <div className="font-semibold">{postData.upgradeMessage.title}</div>
              <div className="text-sm mt-1">{postData.upgradeMessage.message}</div>
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

        setPost(structuredPostData);
        setCommentCount(structuredPostData.engagement?.comments || 0);
        
      } catch (error) {
        console.error('Error loading post:', error);
        setError('This Post has been deleted.');
      } finally {
        setLoading(false);
      }
    };

    if (postId) {
      loadPost();
    }
  }, [postId]);

  if (loading) {
    return (
      <div className="bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#ffd65c] mx-auto mb-4"></div>
          <p>Loading post...</p>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center text-[#ffd65c]">
          <p className="text-lg font-medium">{error || 'Post not found'}</p>
          <button 
            onClick={() => window.history.back()}
            className="mt-4 px-4 py-2 bg-[#ffd65c] text-black rounded-md hover:bg-[#cc9b2e]"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Post Content */}
        <div className="mb-6">
          <PostCard post={post} timestampFormat="exact" />
          
          {/* Product/Service Details Button
          {(post.contentType === 'product' || post.contentType === 'service') && (
            <div className="mt-4 bg-white rounded-xl shadow-sm p-4">
              <button
                onClick={() => setShowProductServiceDetails(true)}
                className={`w-full py-3 px-6 rounded-lg font-semibold text-white transition-all duration-200 hover:scale-[1.02] shadow-md hover:shadow-lg ${
                  post.contentType === 'product'
                    ? 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800'
                    : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800'
                }`}
              >
                {post.contentType === 'product' ? '🛍️ View Product Details' : '🔧 View Service Details'}
              </button>
            </div>
          )} */}
        </div>

        {/* Comments Section */}
        <div className="bg-white rounded-xl shadow-sm">
          <CommentsSection 
            postId={postId} 
            postOwnerId={typeof post.userId === 'object' ? post.userId?._id : post.userId}
            onCommentCountChange={handleCommentCountChange}
            initialCommentCount={post.engagement?.comments || 0}
            shouldFocusComment={shouldFocusComment}
            commentId={commentId}
          />
        </div>
      </div>

      {/* Product/Service Details Modal */}
      {showProductServiceDetails && post && (
        <ProductServiceDetails 
          post={post}
          onClose={() => setShowProductServiceDetails(false)}
        />
      )}
    </div>
  );
};

export default PostPage;
"use client";

import React, { useState, useEffect } from 'react';
// import TrendingTopics from '@/components/TrendingTopics';
import PostCard from '@/components/PostCard';
import TrendingBusiness from '@/components/TrendingBusiness';
import { TrendingUp, Flame, Star } from 'lucide-react';
import { getExploreFeed } from '@/api/exploreFeed';
//import { transformExploreFeedToFeedPost } from '@/utils/transformExploreFeed';
import { FeedPost } from '@/types';
import { getCommentsByPost, Comment } from '@/api/comment';
import TimeTracker from '@/utils/TimeTracker';

const Page = () => {
  const [activeFilter, setActiveFilter] = useState('All Posts');
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [allPosts, setAllPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(true);
  
  const filters = [
    { name: 'All Posts', count: null },
    { name: 'Business', count: null },
    { name: 'Product', count: null },
    { name: 'Service', count: null }
  ];

  const fetchTrendingPosts = async (pageNum: number = 1, reset: boolean = false) => {
    setLoading(true);
    try {
      const response = await getExploreFeed({
        page: pageNum,
        limit: 20, // Fetch more data
        types: 'all', // Get all types of posts
        sortBy: 'engagement' // Sort by engagement for trending
      });
      //console.log("trending data", response);
      
      // Transform the new API response structure
      const transformedData = response.data.feed.map((item) => {
        // Find the user details for this post
        const userDetail = item.userId || {};
        
        // Prefer customization location if present, fallback to top-level location
        const locationName =
          item?.customization?.business?.location?.name ??
          item?.customization?.service?.location?.name ??
          item?.customization?.product?.location?.name ??
          item?.customization?.normal?.location?.name ??
          (typeof item?.location === 'string' ? item.location : item?.location?.name) ??
          null;
        const tags = item?.customization?.business?.tags ??
          item?.customization?.service?.tags ??
          item?.customization?.product?.tags ??
          item?.customization?.normal?.tags ??
          item?.tags ??
          [];
      

        return {
          _id: item._id,
          username: userDetail.username || 'Unknown User',
          profileImageUrl: item.profileImageUrl || userDetail.profileImageUrl || '/placeholderimg.png',
          userId: {
            _id: userDetail._id,
            username: userDetail.username,
            fullName: userDetail.fullName,
            profileImageUrl: item.profileImageUrl || userDetail.profileImageUrl,
          },
          description: item.description || '',
          caption: item.caption || '',
          contentType: item.contentType || 'normal',
          postType: item.postType || 'photo',
          createdAt: item.createdAt,
          media: item.media || [],
          engagement: {
            comments: item.engagement?.comments || 0,
            impressions: item.engagement?.impressions || 0,
            likes: item.engagement?.likes || 0,
            reach: item.engagement?.reach || 0,
            saves: item.engagement?.saves || 0,
            shares: item.engagement?.shares || 0,
            views: item.engagement?.views || 0,
          },
          location: locationName,
          tags: tags,
          isLikedBy: item.isLikedBy || false,
          likedBy: item.likedBy || [],
          // Add customization data for business/product/service modals
          customization: item.customization || null,
          // Initialize comments array to be populated
          comments: [] as Comment[],
        };
      });
      
      //console.log('Transformed trending data:', transformedData.slice(0, 2));
      
      // Fetch comments for all posts
      const postsWithComments = await Promise.all(
        transformedData.map(async (post) => {
          try {
            //console.log(`Fetching comments for post: ${post._id}`);
            const commentsResponse = await getCommentsByPost(post._id, 1, 5); // Fetch first 5 comments
            //console.log(`Comments response for post ${post._id}:`, commentsResponse);
            
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
            
            //console.log(`Processed ${comments.length} comments for post ${post._id}, total: ${totalComments}`);
            
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
            console.error(`Failed to fetch comments for post ${post._id}:`, error);
            return post; // Return post without comments if fetch fails
          }
        })
      );
      
      if (reset) {
        setAllPosts(postsWithComments);
        setPosts(postsWithComments);
      } else {
        const newAllPosts = [...allPosts, ...postsWithComments];
        setAllPosts(newAllPosts);
        setPosts(newAllPosts);
      }
      
      setHasNextPage(response.data.pagination.hasNextPage);
    } catch (error) {
      console.error('Failed to fetch trending posts:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch data only once on component mount
  useEffect(() => {
    fetchTrendingPosts(1, true);
    setPage(1);
  }, []);

  // Apply filters whenever activeFilter changes
  useEffect(() => {
    applyFilter();
  }, [activeFilter, allPosts]);

  const applyFilter = () => {
    let filtered = [...allPosts];

    if (activeFilter !== 'All Posts') {
      const filterLower = activeFilter.toLowerCase();
      
      filtered = filtered.filter(post => {
        // Check contentType directly for business posts
        if (filterLower === 'business') {
          return post.contentType.toLowerCase() === 'business';
        }
        
        // Check contentType directly for service posts
        if (filterLower === 'service') {
          return post.contentType.toLowerCase() === 'service';
        }
        
        // Check contentType directly for product posts
        if (filterLower === 'product') {
          return post.contentType.toLowerCase() === 'product';
        }
        
        // For other filters like Technology, Design, etc.
        return (
          post.tags.some(tag => tag.toLowerCase().includes(filterLower)) ||
          post.contentType.toLowerCase().includes(filterLower) ||
          post.caption.toLowerCase().includes(filterLower) ||
          post.description.toLowerCase().includes(filterLower)
        );
      });
    }

    // Sort by engagement for trending
    filtered.sort((a, b) => 
      (b.engagement.likes + b.engagement.comments + b.engagement.shares) - 
      (a.engagement.likes + a.engagement.comments + a.engagement.shares)
    );

    setPosts(filtered);
  };

  const handleLoadMore = () => {
    if (hasNextPage && !loading) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchTrendingPosts(nextPage, false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row w-full min-h-screen bg-[#f8f9fa]">
      {/* Left Sidebar / Main Feed */}
      <div className="flex-1 p-4 lg:pl-8 lg:pr-6">
        {/* Enhanced Trending Posts Header */}
        <div className="mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full transform translate-x-16 -translate-y-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-pink-500/10 to-orange-500/10 rounded-full transform -translate-x-12 translate-y-12"></div>
            
            <div className="relative">
              {/* Main heading with icon */}
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-gradient-to-r from-yellow-400 to-yellow-600 hover:bg-[#DBB42C]/80 text-white rounded-lg">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Trending Posts
                </h1>
              </div>
              
              {/* Subtitle */}
              <p className="text-gray-600 text-lg mb-4">
                Discover what&apos;s popular in your network right now
              </p>
              
              {/* Stats row */}
              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-red-500" />
                  <span className="text-gray-600">Hot topics</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-500" />
                  <span className="text-gray-600">Most liked</span>
                </div>
                <TimeTracker/>
                {/* <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-500" />
                  <span className="text-gray-600">Updated 2 min ago</span>
                </div> */}
              </div>
              
              {/* Filter tabs */}
              <div className="flex flex-wrap gap-2 mt-4">
                {filters.map((filter) => (
                  <button
                    key={filter.name}
                    onClick={() => setActiveFilter(filter.name)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                      activeFilter === filter.name
                        ? 'bg-button-gradient text-black shadow-lg transform scale-105'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-105'
                    }`}
                  >
                    {filter.name}
                    {filter.count && (
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        activeFilter === filter.name
                          ? 'bg-white text-black'
                          : 'bg-gray-300 text-gray-600'
                      }`}>
                        {filter.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Filter indicator */}
        {activeFilter !== 'All Posts' && (
          <div className="mb-4 p-3 bg-blue-10 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-blue-800 font-medium">
                Showing {activeFilter} posts
              </span>
              <button
                onClick={() => setActiveFilter('All Posts')}
                className="text-blue-600 hover:text-blue-800 text-sm underline"
              >
                Clear filter
              </button>
            </div>
          </div>
        )}

        {/* Posts Content */}
        {loading && posts.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔥</div>
            <p className="text-gray-600">Loading trending posts...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔥</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              No Trending Posts Found
            </h2>
            <p className="text-gray-600">
              Check back later for trending content.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-6 mb-8">
              {posts.map((post) => (
                <div key={post._id} className="w-full">
                  <PostCard post={post} showComments={true} />
                </div>
              ))}
            </div>

            {/* Load More Button */}
            {hasNextPage && (
              <div className="text-center">
                <button
                  onClick={handleLoadMore}
                  disabled={loading}
                  className="px-8 py-3 bg-gradient-to-r from-yellow-400 to-yellow-600 text-white rounded-lg hover:from-yellow-500 hover:to-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium shadow-lg"
                >
                  {loading ? "Loading..." : "Load More Trending Posts"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
       
      {/* Right Sidebar / Trending Topics with Independent Scroll - Hidden on medium screens */}
      <div className="w-full lg:w-[320px] lg:p-6 xl:p-0 hidden lg:block">
        <aside className="w-full lg:w-[20rem] max-w-full bg-white shadow-md rounded-lg lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)] overflow-y-auto">
          <div className="p-4 space-y-6">
            {/* <TrendingTopics /> */}
            <TrendingBusiness />
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Page;
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, ChevronDown, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';
import CommentItem from './CommentItem';
import AddComment from './AddComment';
import { Comment, getCommentsByPost, getCommentById } from '@/api/comment';
import { postEvents } from '@/utils/postEvents';

interface CommentsSectionProps {
  postId: string;
  postOwnerId?: string;
  onCommentCountChange?: (count: number) => void;
  initialCommentCount?: number;
  shouldFocusComment?: boolean;
  commentId?: string | null;
}

type SortOption = 'latest' | 'likes';

const CommentsSection = ({ postId, postOwnerId, onCommentCountChange, initialCommentCount = 0, shouldFocusComment = false, commentId }: CommentsSectionProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>('latest');
  const [showSortOptions, setShowSortOptions] = useState(false);
  const [totalCommentCount, setTotalCommentCount] = useState(initialCommentCount);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [commentsPerPage] = useState(10);
  const [paginationLoading, setPaginationLoading] = useState(false);
  
  // Store user-created comments that should persist across refreshes
  const userCommentsRef = useRef<{ [commentId: string]: Comment }>({});

  // Handle scrolling to specific comment
  const scrollToComment = useCallback((targetCommentId: string) => {
    setTimeout(() => {
      const commentElement = document.getElementById(`comment-${targetCommentId}`);
      if (commentElement) {
        commentElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
        
        // Add pulse animation class temporarily
        commentElement.classList.add('comment-pulse');
        
        // Remove animation class after animation completes
        setTimeout(() => {
          commentElement.classList.remove('comment-pulse');
        }, 1500); // 1.5 seconds for a complete pulse animation
      }
    }, 500); // Small delay to ensure comments are rendered
  }, []);

  // Auto-scroll to comment when commentId is provided
  useEffect(() => {
    if (commentId && !loading && comments.length > 0) {
      scrollToComment(commentId);
    }
  }, [commentId, loading, comments.length, scrollToComment]);

  // Close sort dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.relative')) {
        setShowSortOptions(false);
      }
    };

    if (showSortOptions) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSortOptions]);

  // Update comment count whenever total changes (not just current page)
  useEffect(() => {
    if (totalCommentCount !== initialCommentCount) {
      onCommentCountChange?.(totalCommentCount);
      // Emit event for cross-tab/component communication
      postEvents.emit(postId, 'commentCountChange', totalCommentCount);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalCommentCount, postId]); // Removed onCommentCountChange and initialCommentCount from deps to prevent infinite loop

  const fetchComments = useCallback(async (page: number = currentPage) => {
    try {
      // Validate postId before making request
      if (!postId || typeof postId !== 'string' || postId.trim() === '') {
        console.error('Invalid postId provided to CommentsSection:', postId);
        // Silently fail - show "No comments yet" instead of error UI
        setComments([]);
        setTotalCommentCount(0);
        setTotalPages(1);
        return;
      }

      if (page === 1) {
        setLoading(true);
      } else {
        setPaginationLoading(true);
      }
      
      console.log(`[CommentsSection] Fetching comments for post: ${postId}, page: ${page}`);
      const commentsData = await getCommentsByPost(postId, page, commentsPerPage);
      console.log(`[CommentsSection] Comments data received for post ${postId}:`, commentsData);
      
      // Log individual comment structure to debug user data
      if (commentsData?.comments && commentsData.comments.length > 0) {
        console.log(`[CommentsSection] First comment structure for post ${postId}:`, commentsData.comments[0]);
        console.log(`[CommentsSection] First comment userId type:`, typeof commentsData.comments[0].userId);
        console.log(`[CommentsSection] First comment userId value:`, commentsData.comments[0].userId);
        console.log(`[CommentsSection] Total comments received:`, commentsData.comments.length);
      } else {
        console.log(`[CommentsSection] No comments in response for post ${postId}`);
      }
      
      // Handle pagination response
      if (commentsData) {
        // Update pagination info
        setTotalCommentCount(commentsData.totalComments || 0);
        setCurrentPage(commentsData.page || 1);
        setTotalPages(commentsData.totalPages || 1);
        
        // Get comments array
        let rawComments: Comment[] = [];
        if (Array.isArray(commentsData.comments)) {
          rawComments = commentsData.comments;
        } else if (Array.isArray(commentsData)) {
          rawComments = commentsData;
        }
      
      // Process comments using simpler approach (like ReelCommentsSection)
      const topLevelComments = rawComments.filter(comment => {
        const isTopLevel = !comment.parentCommentId;
        if (!isTopLevel) {
          console.log(`[CommentsSection] Filtering out reply comment:`, comment._id);
        }
        return isTopLevel;
      });

      // Process each top-level comment and fetch its replies
      const processedCommentsPromises = topLevelComments.map(async (comment, index) => {
        console.log(`[CommentsSection] Processing comment ${index + 1}/${topLevelComments.length}:`, {
          commentId: comment._id,
          hasUser: !!comment.user,
          userIdType: typeof comment.userId,
          userId: comment.userId
        });

        // Check if we already have user data for this comment in cache
        const cachedComment = userCommentsRef.current[comment._id];
        if (cachedComment && cachedComment.user) {
          console.log(`[CommentsSection] Using cached user data for comment ${comment._id}`);
          return { ...comment, user: cachedComment.user, replies: cachedComment.replies || [] };
        }

        // Process user data
        let processedComment: Comment;
        if (comment.user) {
          console.log(`[CommentsSection] Comment ${comment._id} already has user data:`, comment.user);
          processedComment = {
            ...comment,
            user: {
              ...comment.user,
              profileImageUrl: comment.user.profileImageUrl || ''
            }
          };
        } else if (typeof comment.userId === 'object' && comment.userId !== null) {
          const userObj = comment.userId as { _id?: string; username?: string; fullName?: string; profileImageUrl?: string; subscriptionBadge?: any };
          console.log(`[CommentsSection] Comment ${comment._id} has populated userId object:`, userObj);
          processedComment = {
            ...comment,
            user: {
              _id: userObj._id || '',
              username: userObj.username || 'User',
              fullName: userObj.fullName || userObj.username || 'User',
              profileImageUrl: userObj.profileImageUrl || '',
              subscriptionBadge: userObj.subscriptionBadge || null
            }
          };
        } else {
          console.warn(`[CommentsSection] Comment ${comment._id} has string userId (no user data populated):`, comment);
          processedComment = {
            ...comment,
            user: {
              _id: typeof comment.userId === 'string' ? comment.userId : '',
              username: 'User',
              fullName: 'User',
              profileImageUrl: ''
            }
          };
        }

        // Fetch replies using getCommentById API
        try {
          const commentData = await getCommentById(comment._id);
          if (commentData?.replies?.comments && Array.isArray(commentData.replies.comments)) {
            const replies = commentData.replies.comments.map((reply: any) => {
              // Process reply user data
              if (reply.user) {
                return reply;
              } else if (typeof reply.userId === 'object' && reply.userId !== null) {
                const replyUserObj = reply.userId as { _id?: string; username?: string; fullName?: string; profileImageUrl?: string; subscriptionBadge?: any };
                return {
                  ...reply,
                  user: {
                    _id: replyUserObj._id || '',
                    username: replyUserObj.username || 'User',
                    fullName: replyUserObj.fullName || replyUserObj.username || 'User',
                    profileImageUrl: replyUserObj.profileImageUrl || '',
                    subscriptionBadge: replyUserObj.subscriptionBadge || null
                  }
                };
              }
              return {
                ...reply,
                user: {
                  _id: typeof reply.userId === 'string' ? reply.userId : '',
                  username: 'User',
                  fullName: 'User',
                  profileImageUrl: ''
                }
              };
            });
            console.log(`[CommentsSection] Comment ${comment._id} fetched with ${replies.length} replies`);
            return { ...processedComment, replies };
          }
        } catch (error) {
          console.error(`[CommentsSection] Error fetching replies for comment ${comment._id}:`, error);
        }

        return { ...processedComment, replies: [] };
      });

      const processedComments = await Promise.all(processedCommentsPromises);
        
        // Ensure newest comments render on top regardless of API order
        const sortedByLatest = [...processedComments].sort((a, b) => {
          const aTime = new Date(a.createdAt).getTime();
          const bTime = new Date(b.createdAt).getTime();
          return bTime - aTime;
        });

        console.log(`[CommentsSection] Processed ${processedComments.length} top-level comments for post ${postId}`);
        console.log(`[CommentsSection] Final comments to display:`, sortedByLatest);
        setComments(sortedByLatest);
      } else {
        console.log(`[CommentsSection] No commentsData received for post ${postId}, setting empty state`);
        setComments([]);
        setTotalCommentCount(0);
        setTotalPages(1);
      }
    } catch (error: unknown) {
      console.error(`[CommentsSection] Error fetching comments for post ${postId}:`, error);
      
      // Type guard for axios error
      const axiosError = error as { response?: { status?: number; statusText?: string; data?: unknown } };
      
      // Log detailed error information for debugging (silent to user)
      if (axiosError?.response) {
        console.error('Error response details:', {
          status: axiosError.response.status,
          statusText: axiosError.response.statusText,
          data: axiosError.response.data,
          postId: postId,
          page: page,
          limit: commentsPerPage
        });
        
        // Log specific error messages for debugging
        if (axiosError.response.status === 500) {
          console.error('Server error while loading comments. This might be a temporary issue with the post data.');
        } else if (axiosError.response.status === 404) {
          console.error('Post not found. Comments may have been removed.');
        } else if (axiosError.response.status === 403) {
          console.error('You do not have permission to view these comments.');
        }
      }
      
      // Silently fail - show "No comments yet" instead of error UI
      setComments([]);
      setTotalCommentCount(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
      setPaginationLoading(false);
    }
  }, [postId, currentPage, commentsPerPage]);

  // Fetch comments on mount and when dependencies change
  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleNewComment = (newComment: Comment) => {
    // Store this comment with full user data in our ref
    userCommentsRef.current[newComment._id] = newComment;
    
    // Add to current page if we're on page 1, otherwise refetch
    if (currentPage === 1) {
      setComments(prev => [newComment, ...prev]);
      setTotalCommentCount(prev => prev + 1);
    } else {
      // Go to first page to see the new comment
      setCurrentPage(1);
      fetchComments(1);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleReplyAdded = (reply: Comment) => {
    // For replies, we don't need to update the main comments list
    // The CommentItem component handles its own replies
    // But we should update the total comment count
    setTotalCommentCount(prev => prev + 1);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages && newPage !== currentPage) {
      setCurrentPage(newPage);
      fetchComments(newPage);
    }
  };

  const handleCommentUpdate = (updatedComment: Comment) => {
    setComments(prev => 
      prev.map(comment => 
        comment._id === updatedComment._id ? updatedComment : comment
      )
    );
  };

  const handleCommentDelete = (commentId: string) => {
    setComments(prev => prev.filter(comment => comment._id !== commentId));
    setTotalCommentCount(prev => Math.max(0, prev - 1));
  };

  const sortedComments = Array.isArray(comments) ? [...comments].sort((a, b) => {
    // Priority: If commentId is specified, push the target comment to the top
    if (commentId) {
      if (a._id === commentId) return -1; // Target comment goes first
      if (b._id === commentId) return 1;  // Target comment goes first
    }
    
    // Normal sorting logic
    if (sortBy === 'likes') {
      const aLikes = a.likesCount || a.likes?.length || 0;
      const bLikes = b.likesCount || b.likes?.length || 0;
      //console.log(`Sorting by likes: Comment ${a._id} has ${aLikes} likes, Comment ${b._id} has ${bLikes} likes`);
      return bLikes - aLikes;
    } else {
      const aTime = new Date(a.createdAt).getTime();
      const bTime = new Date(b.createdAt).getTime();
      //console.log(`Sorting by latest: Comment ${a._id} created at ${a.createdAt}, Comment ${b._id} created at ${b.createdAt}`);
      return bTime - aTime;
    }
  }) : [];

  //console.log(`CommentsSection: Sorting ${comments.length} comments by ${sortBy}, result: ${sortedComments.length} sorted comments`);

  return (
    <div className="p-6" data-comments-section>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Comments ({totalCommentCount})
          </h3>
        </div>

        {/* Sort Options */}
        <div className="relative">
          <Button
            variant="outline"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              //console.log('Toggle sort options, current:', showSortOptions);
              setShowSortOptions(!showSortOptions);
            }}
            className="flex items-center gap-2 text-sm"
          >
            <Filter className="w-4 h-4" />
            Sort by {sortBy === 'latest' ? 'Latest' : 'Most Liked'}
            <ChevronDown className={`w-4 h-4 transition-transform ${showSortOptions ? 'rotate-180' : ''}`} />
          </Button>

          {showSortOptions && (
            <div className="absolute right-0 top-full mt-2 bg-white border rounded-lg shadow-lg z-50 min-w-[150px]">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  //console.log('Sorting by latest');
                  setSortBy('latest');
                  setShowSortOptions(false);
                }}
                className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition-colors ${
                  sortBy === 'latest' ? 'bg-yellow-50 text-yellow-700 font-medium' : 'text-gray-700'
                }`}
              >
                Latest
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  //console.log('Sorting by likes');
                  setSortBy('likes');
                  setShowSortOptions(false);
                }}
                className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition-colors ${
                  sortBy === 'likes' ? 'bg-yellow-50 text-yellow-700 font-medium' : 'text-gray-700'
                }`}
              >
                Most Liked
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Add Comment */}
      <div className="mb-6">
        <AddComment 
          postId={postId} 
          postOwnerId={postOwnerId}
          onCommentAdded={handleNewComment}
          shouldFocus={shouldFocusComment}
        />
      </div>

      {/* Comments List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-yellow-500 mx-auto mb-4"></div>
            <p className="text-gray-500">Loading comments...</p>
          </div>
        ) : (sortedComments?.length || 0) === 0 ? (
          <div className="text-center py-8">
            <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-500 mb-2">No comments yet</h4>
            <p className="text-gray-400">Be the first to comment on this post!</p>
          </div>
        ) : (
          <>
            {sortedComments?.map((comment) => (
              <CommentItem
                key={comment._id}
                comment={comment}
                onUpdate={handleCommentUpdate}
                onDelete={handleCommentDelete}
                onReplyAdded={handleReplyAdded}
              />
            ))}
            
            {paginationLoading && (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-yellow-500 mx-auto mb-2"></div>
                <p className="text-gray-500 text-sm">Loading more comments...</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && !loading && (
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
          <div className="text-sm text-gray-500">
            Page {currentPage} of {totalPages} • {totalCommentCount} total comments
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1 || paginationLoading}
              className="flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>
            
            <div className="flex items-center space-x-1">
              {/* Show page numbers */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePageChange(pageNum)}
                    disabled={paginationLoading}
                    className={`w-8 h-8 p-0 ${
                      currentPage === pageNum 
                        ? 'bg-yellow-500 hover:bg-yellow-600 text-white' 
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages || paginationLoading}
              className="flex items-center gap-1"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommentsSection;
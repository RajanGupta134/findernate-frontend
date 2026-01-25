import { useState, useCallback, useRef, useEffect } from 'react';
import { Comment, getCommentsByPost } from '@/api/comment';
import { commentCacheManager, debounce } from '@/utils/commentCache';
import { performanceMonitor } from '@/utils/performanceMonitor';

interface UseOptimizedCommentsOptions {
  maxVisible?: number;
  enablePreloading?: boolean;
  debounceMs?: number;
}

interface UseOptimizedCommentsReturn {
  comments: Comment[];
  totalCount: number;
  isLoading: boolean;
  error: string | null;
  fetchComments: (reelId: string) => Promise<void>;
  preloadComments: (reelId: string) => void;
  getCacheStats: () => any;
}

export const useOptimizedComments = (
  options: UseOptimizedCommentsOptions = {}
): UseOptimizedCommentsReturn => {
  const {
    maxVisible = 4,
    enablePreloading = true,
    debounceMs = 300
  } = options;

  const [comments, setComments] = useState<Comment[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lastFetchedReelRef = useRef<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);

  // Optimized fetch function with caching and deduplication
  const fetchCommentsOptimized = useCallback(async (reelId: string): Promise<void> => {
    if (!reelId || reelId === lastFetchedReelRef.current) return;

    // Start performance tracking
    performanceMonitor.startRequest();

    // Check cache first
    const cached = commentCacheManager.getCachedComments(reelId);
    if (cached) {
      setComments(cached.comments);
      setTotalCount(cached.totalCount);
      setError(null);
      lastFetchedReelRef.current = reelId;
      performanceMonitor.recordCacheHit();
      return;
    }

    // Check if request is already pending
    const pendingRequest = commentCacheManager.getCachedRequest(reelId);
    if (pendingRequest) {
      try {
        const data = await pendingRequest;
        setComments(data.comments || []);
        setTotalCount(data.totalComments || 0);
        setError(null);
        lastFetchedReelRef.current = reelId;
        performanceMonitor.recordCacheHit(); // Deduplication counts as cache hit
      } catch (err) {
        setError('Failed to load comments');
        performanceMonitor.recordCacheMiss();
      }
      return;
    }

    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setError(null);

    try {
      // Create and cache the request promise
      const requestPromise = getCommentsByPost(reelId, 1, maxVisible);
      commentCacheManager.setCachedRequest(reelId, requestPromise);

      const data = await requestPromise;

      // Process comments to ensure user data is present
      const processedComments = Array.isArray(data.comments)
        ? data.comments.map((c: Comment) => {
            if (c.user) return c;
            if (typeof c.userId === 'object' && c.userId !== null) {
              return { ...c, user: c.userId };
            }
            return c;
          })
        : [];

      const totalComments = data.totalComments || 0;

      // Cache the results
      commentCacheManager.setCachedComments(reelId, processedComments, totalComments);

      // Update state
      setComments(processedComments);
      setTotalCount(totalComments);
      lastFetchedReelRef.current = reelId;
      performanceMonitor.recordCacheMiss(); // API call counts as cache miss

    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Error fetching comments for reel:', reelId, err);
        setError('Failed to load comments');
        setComments([]);
        setTotalCount(0);
        performanceMonitor.recordCacheMiss();
      }
    } finally {
      setIsLoading(false);
    }
  }, [maxVisible]);

  // Debounced version for scroll-triggered fetches
  const debouncedFetch = useCallback(
    debounce((reelId: string) => {
      fetchCommentsOptimized(reelId);
    }, debounceMs),
    [fetchCommentsOptimized, debounceMs]
  );

  // Preload function for background loading
  const preloadComments = useCallback((reelId: string) => {
    if (!enablePreloading || !reelId) return;

    // Only preload if not already cached or pending
    if (!commentCacheManager.hasCachedComments(reelId) &&
        !commentCacheManager.hasPendingRequest(reelId)) {

      // Use requestIdleCallback for background processing
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => {
          fetchCommentsOptimized(reelId);
        });
      } else {
        // Fallback for browsers without requestIdleCallback
        setTimeout(() => {
          fetchCommentsOptimized(reelId);
        }, 100);
      }
    }
  }, [enablePreloading, fetchCommentsOptimized]);

  // Main fetch function (uses debounced version)
  const fetchComments = useCallback((reelId: string) => {
    return new Promise<void>((resolve) => {
      debouncedFetch(reelId);
      resolve();
    });
  }, [debouncedFetch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Get cache statistics for debugging
  const getCacheStats = useCallback(() => {
    return commentCacheManager.getStats();
  }, []);

  return {
    comments,
    totalCount,
    isLoading,
    error,
    fetchComments,
    preloadComments,
    getCacheStats
  };
};
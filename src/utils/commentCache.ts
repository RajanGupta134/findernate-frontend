// In-memory caching system for comments (no localStorage)
import { Comment } from '@/api/comment';

interface CachedCommentData {
  comments: Comment[];
  totalCount: number;
  timestamp: number;
  ttl: number;
}

interface RequestPromiseCache {
  promise: Promise<any>;
  timestamp: number;
}

class CommentCacheManager {
  private commentCache = new Map<string, CachedCommentData>();
  private requestCache = new Map<string, RequestPromiseCache>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly REQUEST_CACHE_TTL = 30 * 1000; // 30 seconds for request deduplication

  // Cache comment data
  setCachedComments(reelId: string, comments: Comment[], totalCount: number, ttl?: number): void {
    const cacheData: CachedCommentData = {
      comments,
      totalCount,
      timestamp: Date.now(),
      ttl: ttl || this.DEFAULT_TTL
    };

    this.commentCache.set(reelId, cacheData);
  }

  // Get cached comment data
  getCachedComments(reelId: string): CachedCommentData | null {
    const cached = this.commentCache.get(reelId);

    if (!cached) return null;

    // Check if cache has expired
    if (Date.now() - cached.timestamp > cached.ttl) {
      this.commentCache.delete(reelId);
      return null;
    }

    return cached;
  }

  // Check if comments are cached and valid
  hasCachedComments(reelId: string): boolean {
    return this.getCachedComments(reelId) !== null;
  }

  // Cache a request promise to prevent duplicate requests
  setCachedRequest(reelId: string, promise: Promise<any>): void {
    this.requestCache.set(reelId, {
      promise,
      timestamp: Date.now()
    });

    // Clean up promise after completion
    promise.finally(() => {
      this.requestCache.delete(reelId);
    });
  }

  // Get cached request promise
  getCachedRequest(reelId: string): Promise<any> | null {
    const cached = this.requestCache.get(reelId);

    if (!cached) return null;

    // Check if request cache has expired
    if (Date.now() - cached.timestamp > this.REQUEST_CACHE_TTL) {
      this.requestCache.delete(reelId);
      return null;
    }

    return cached.promise;
  }

  // Check if request is currently pending
  hasPendingRequest(reelId: string): boolean {
    return this.getCachedRequest(reelId) !== null;
  }

  // Clear expired cache entries
  cleanup(): void {
    const now = Date.now();

    // Clean comment cache
    for (const [reelId, data] of this.commentCache.entries()) {
      if (now - data.timestamp > data.ttl) {
        this.commentCache.delete(reelId);
      }
    }

    // Clean request cache
    for (const [reelId, data] of this.requestCache.entries()) {
      if (now - data.timestamp > this.REQUEST_CACHE_TTL) {
        this.requestCache.delete(reelId);
      }
    }
  }

  // Clear all cache
  clearAll(): void {
    this.commentCache.clear();
    this.requestCache.clear();
  }

  // Get cache stats for debugging
  getStats() {
    return {
      commentCacheSize: this.commentCache.size,
      requestCacheSize: this.requestCache.size,
      cachedReels: Array.from(this.commentCache.keys())
    };
  }
}

// Global cache instance
export const commentCacheManager = new CommentCacheManager();

// Auto cleanup every 2 minutes
setInterval(() => {
  commentCacheManager.cleanup();
}, 2 * 60 * 1000);

// Utility functions for debouncing
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Utility for throttling
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};
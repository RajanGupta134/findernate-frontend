// Shared localStorage utility for reels state management
// Used by both /reels page and /reels/watch/[reelId] full-screen viewer

// Local storage keys for persisting states
export const LIKES_STORAGE_KEY = 'findernate-reel-likes';
export const LIKE_COUNTS_STORAGE_KEY = 'findernate-reel-like-counts';
export const FOLLOW_STORAGE_KEY = 'findernate-reel-follows';
export const SAVES_STORAGE_KEY = 'findernate-reel-saves';
export const COMMENT_COUNTS_STORAGE_KEY = 'findernate-reel-comment-counts';

// ============================================================
// LIKE STATE MANAGEMENT
// ============================================================

/**
 * Get liked reels from localStorage
 * @returns Set of reel IDs that have been liked
 */
export const getLikedReelsFromStorage = (): Set<string> => {
  try {
    const stored = localStorage.getItem(LIKES_STORAGE_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
};

/**
 * Get like counts from localStorage
 * @returns Map of reel ID to like count
 */
export const getLikeCountsFromStorage = (): Map<string, number> => {
  try {
    const stored = localStorage.getItem(LIKE_COUNTS_STORAGE_KEY);
    return stored ? new Map(Object.entries(JSON.parse(stored)).map(([k, v]) => [k, Number(v)])) : new Map();
  } catch {
    return new Map();
  }
};

/**
 * Save like state to localStorage
 * @param reelId - The reel ID
 * @param isLiked - Whether the reel is liked
 * @param likeCount - Optional like count to save
 */
export const saveLikedReelToStorage = (reelId: string, isLiked: boolean, likeCount?: number) => {
  try {
    const likedReels = getLikedReelsFromStorage();
    const likeCounts = getLikeCountsFromStorage();

    if (isLiked) {
      likedReels.add(reelId);
    } else {
      likedReels.delete(reelId);
    }

    if (likeCount !== undefined) {
      likeCounts.set(reelId, likeCount);
    }

    localStorage.setItem(LIKES_STORAGE_KEY, JSON.stringify([...likedReels]));
    localStorage.setItem(LIKE_COUNTS_STORAGE_KEY, JSON.stringify(Object.fromEntries(likeCounts)));
  } catch (error) {
    console.warn('Failed to save like state to localStorage:', error);
  }
};

// ============================================================
// FOLLOW STATE MANAGEMENT
// ============================================================

/**
 * Get followed users from localStorage
 * @returns Set of user IDs that have been followed
 */
export const getFollowedUsersFromStorage = (): Set<string> => {
  try {
    const stored = localStorage.getItem(FOLLOW_STORAGE_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
};

/**
 * Save follow state to localStorage
 * @param userId - The user ID
 * @param isFollowed - Whether the user is followed
 */
export const saveFollowStateToStorage = (userId: string, isFollowed: boolean) => {
  try {
    const followedUsers = getFollowedUsersFromStorage();

    if (isFollowed) {
      followedUsers.add(userId);
    } else {
      followedUsers.delete(userId);
    }

    localStorage.setItem(FOLLOW_STORAGE_KEY, JSON.stringify([...followedUsers]));
  } catch (error) {
    console.warn('Failed to save follow state to localStorage:', error);
  }
};

// ============================================================
// SAVE STATE MANAGEMENT
// ============================================================

/**
 * Get saved reels from localStorage
 * @returns Set of reel IDs that have been saved
 */
export const getSavedReelsFromStorage = (): Set<string> => {
  try {
    const stored = localStorage.getItem(SAVES_STORAGE_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
};

/**
 * Save save state to localStorage
 * @param reelId - The reel ID
 * @param isSaved - Whether the reel is saved
 */
export const saveSaveStateToStorage = (reelId: string, isSaved: boolean) => {
  try {
    const savedReels = getSavedReelsFromStorage();

    if (isSaved) {
      savedReels.add(reelId);
    } else {
      savedReels.delete(reelId);
    }

    localStorage.setItem(SAVES_STORAGE_KEY, JSON.stringify([...savedReels]));
  } catch (error) {
    console.warn('Failed to save save state to localStorage:', error);
  }
};

// ============================================================
// COMMENT COUNT MANAGEMENT
// ============================================================

/**
 * Get comment counts from localStorage
 * @returns Map of reel ID to comment count
 */
export const getCommentCountsFromStorage = (): Map<string, number> => {
  try {
    const stored = localStorage.getItem(COMMENT_COUNTS_STORAGE_KEY);
    return stored ? new Map(Object.entries(JSON.parse(stored)).map(([k, v]) => [k, Number(v)])) : new Map();
  } catch {
    return new Map();
  }
};

/**
 * Save comment count to localStorage
 * @param reelId - The reel ID
 * @param count - The comment count
 */
export const saveCommentCountToStorage = (reelId: string, count: number) => {
  try {
    const commentCounts = getCommentCountsFromStorage();
    commentCounts.set(reelId, count);
    localStorage.setItem(COMMENT_COUNTS_STORAGE_KEY, JSON.stringify(Object.fromEntries(commentCounts)));
  } catch (error) {
    console.warn('Failed to save comment count to localStorage:', error);
  }
};

// ============================================================
// SESSION STORAGE FOR REELS FEED CACHE
// ============================================================

export const REELS_FEED_CACHE_KEY = 'findernate-reels-feed-cache';
export const REELS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export interface ReelsFeedCache {
  data: any[];
  timestamp: number;
  currentIndex: number;
}

/**
 * Save reels feed to sessionStorage for instant navigation
 * @param data - Array of reels data
 * @param currentIndex - Current reel index
 */
export const saveReelsFeedToSession = (data: any[], currentIndex: number) => {
  try {
    const cache: ReelsFeedCache = {
      data,
      timestamp: Date.now(),
      currentIndex
    };
    sessionStorage.setItem(REELS_FEED_CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.warn('Failed to save reels feed to sessionStorage:', error);
  }
};

/**
 * Get reels feed from sessionStorage
 * @returns Cached reels data or null if not found/expired
 */
export const getReelsFeedFromSession = (): ReelsFeedCache | null => {
  try {
    const cached = sessionStorage.getItem(REELS_FEED_CACHE_KEY);
    if (!cached) return null;

    const cache: ReelsFeedCache = JSON.parse(cached);

    // Check if cache is still valid (< 5 minutes old)
    if (Date.now() - cache.timestamp > REELS_CACHE_TTL) {
      sessionStorage.removeItem(REELS_FEED_CACHE_KEY);
      return null;
    }

    return cache;
  } catch {
    return null;
  }
};

/**
 * Clear reels feed cache from sessionStorage
 */
export const clearReelsFeedCache = () => {
  try {
    sessionStorage.removeItem(REELS_FEED_CACHE_KEY);
  } catch (error) {
    console.warn('Failed to clear reels feed cache:', error);
  }
};

// In-memory state management for reels (replaces localStorage)

interface ReelState {
  isLiked: boolean;
  likesCount: number;
  isSaved: boolean;
  isFollowed: boolean;
  lastUpdated: number;
}

class InMemoryStateManager {
  private reelStates = new Map<string, ReelState>();
  private userStates = new Map<string, { isFollowed: boolean; lastUpdated: number }>();
  private readonly TTL = 30 * 60 * 1000; // 30 minutes

  // Reel state management
  setReelState(reelId: string, state: Partial<ReelState>): void {
    const existing = this.reelStates.get(reelId) || {
      isLiked: false,
      likesCount: 0,
      isSaved: false,
      isFollowed: false,
      lastUpdated: Date.now()
    };

    this.reelStates.set(reelId, {
      ...existing,
      ...state,
      lastUpdated: Date.now()
    });
  }

  getReelState(reelId: string): ReelState | null {
    const state = this.reelStates.get(reelId);
    if (!state) return null;

    // Check if state has expired
    if (Date.now() - state.lastUpdated > this.TTL) {
      this.reelStates.delete(reelId);
      return null;
    }

    return state;
  }

  // Update like state
  updateLikeState(reelId: string, isLiked: boolean, likesCount: number): void {
    this.setReelState(reelId, { isLiked, likesCount });
  }

  // Update save state
  updateSaveState(reelId: string, isSaved: boolean): void {
    this.setReelState(reelId, { isSaved });
  }

  // User follow state management
  setUserFollowState(userId: string, isFollowed: boolean): void {
    this.userStates.set(userId, {
      isFollowed,
      lastUpdated: Date.now()
    });

    // Also update all reels by this user
    for (const [reelId, reelState] of this.reelStates.entries()) {
      // Note: We'd need to track userId per reel for this to work perfectly
      // For now, we'll update when we have the information
      this.setReelState(reelId, { isFollowed });
    }
  }

  getUserFollowState(userId: string): boolean | null {
    const state = this.userStates.get(userId);
    if (!state) return null;

    // Check if state has expired
    if (Date.now() - state.lastUpdated > this.TTL) {
      this.userStates.delete(userId);
      return null;
    }

    return state.isFollowed;
  }

  // Cleanup expired entries
  cleanup(): void {
    const now = Date.now();

    // Clean reel states
    for (const [reelId, state] of this.reelStates.entries()) {
      if (now - state.lastUpdated > this.TTL) {
        this.reelStates.delete(reelId);
      }
    }

    // Clean user states
    for (const [userId, state] of this.userStates.entries()) {
      if (now - state.lastUpdated > this.TTL) {
        this.userStates.delete(userId);
      }
    }
  }

  // Clear all states
  clearAll(): void {
    this.reelStates.clear();
    this.userStates.clear();
  }

  // Get stats for debugging
  getStats() {
    return {
      reelStatesCount: this.reelStates.size,
      userStatesCount: this.userStates.size,
      totalMemoryUsage: `${JSON.stringify(Object.fromEntries(this.reelStates)).length}B`
    };
  }

  // Initialize state from API data
  initializeFromApiData(reelsData: any[]): void {
    reelsData.forEach(reel => {
      if (reel._id) {
        this.setReelState(reel._id, {
          isLiked: Boolean(reel.isLikedBy),
          likesCount: reel.engagement?.likes || 0,
          isSaved: false, // This would need to come from API
          isFollowed: Boolean(reel.isFollowed)
        });

        // Set user follow state if available
        if (reel.userId?._id) {
          this.setUserFollowState(reel.userId._id, Boolean(reel.isFollowed));
        }
      }
    });
  }
}

// Global in-memory state manager
export const inMemoryStateManager = new InMemoryStateManager();

// Auto cleanup every 10 minutes
setInterval(() => {
  inMemoryStateManager.cleanup();
}, 10 * 60 * 1000);
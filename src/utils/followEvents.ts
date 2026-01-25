// Event system for handling user follow/unfollow updates across components

type FollowEventHandler = (userId: string, isFollowing: boolean) => void;

class FollowEvents {
  private handlers: FollowEventHandler[] = [];

  // Subscribe to follow events
  subscribe(handler: FollowEventHandler): () => void {
    this.handlers.push(handler);
    
    // Return unsubscribe function
    return () => {
      this.handlers = this.handlers.filter(h => h !== handler);
    };
  }

  // Emit follow event
  emit(userId: string, isFollowing: boolean) {
    this.handlers.forEach(handler => {
      try {
        handler(userId, isFollowing);
      } catch (error) {
        console.error('Error in follow event handler:', error);
      }
    });
  }
}

export const followEvents = new FollowEvents();

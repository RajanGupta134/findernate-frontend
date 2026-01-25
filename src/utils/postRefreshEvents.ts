/**
 * Global post refresh event system
 * Allows components to refresh their post data when new posts are created
 */

type PostRefreshCallback = (newPost: any) => void;

class PostRefreshEventManager {
  private listeners: PostRefreshCallback[] = [];

  // Subscribe to post refresh events
  subscribe(callback: PostRefreshCallback): () => void {
    this.listeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // Emit post creation event to all listeners
  emitPostCreated(newPost: any) {
    this.listeners.forEach(callback => {
      try {
        callback(newPost);
      } catch (error) {
        console.error('Error in post refresh callback:', error);
      }
    });
  }

  // Emit general refresh event (when new post details aren't available)
  emitRefresh() {
    this.emitPostCreated(null);
  }
}

export const postRefreshEvents = new PostRefreshEventManager();
// Simple event system for cross-tab post updates
type PostEventType = 'commentCountChange' | 'likeCountChange';

interface PostEvent {
  type: PostEventType;
  postId: string;
  data: any;
}

class PostEventEmitter {
  private listeners: { [key: string]: Array<(data: any) => void> } = {};

  emit(postId: string, type: PostEventType, data: any) {
    const key = `${postId}:${type}`;
    const eventListeners = this.listeners[key] || [];
    eventListeners.forEach(listener => listener(data));
    
    // Also emit to localStorage for cross-tab communication
    localStorage.setItem('postEvent', JSON.stringify({
      type,
      postId,
      data,
      timestamp: Date.now()
    }));
  }

  on(postId: string, type: PostEventType, listener: (data: any) => void) {
    const key = `${postId}:${type}`;
    if (!this.listeners[key]) {
      this.listeners[key] = [];
    }
    this.listeners[key].push(listener);

    // Return cleanup function
    return () => {
      this.listeners[key] = this.listeners[key].filter(l => l !== listener);
    };
  }

  // Listen for localStorage events (cross-tab)
  listenForStorageEvents() {
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === 'postEvent' && e.newValue) {
          try {
            const event: PostEvent & { timestamp: number } = JSON.parse(e.newValue);
            // Only process recent events (within 5 seconds)
            if (Date.now() - event.timestamp < 5000) {
              const key = `${event.postId}:${event.type}`;
              const eventListeners = this.listeners[key] || [];
              eventListeners.forEach(listener => listener(event.data));
            }
          } catch (error) {
            console.error('Error parsing post event:', error);
          }
        }
      });
    }
  }
}

export const postEvents = new PostEventEmitter();

// Initialize storage event listening
if (typeof window !== 'undefined') {
  postEvents.listenForStorageEvents();
}
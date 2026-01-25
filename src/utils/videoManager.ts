// Video Manager - Singleton pattern for managing video playback across the app
// Ensures only one video plays audio at a time

interface VideoInstance {
  id: string; // Unique identifier (e.g., reel._id, story._id, post._id)
  videoElement: HTMLVideoElement;
  location: 'reel' | 'story' | 'post' | 'explore' | 'modal'; // Where the video is displayed
  pauseCallback?: () => void; // Optional callback when video is paused
}

class VideoManager {
  private currentlyPlaying: VideoInstance | null = null;
  private registeredVideos: Map<string, VideoInstance> = new Map();
  private visibilityListener: (() => void) | null = null;
  private intersectionObserver: IntersectionObserver | null = null;

  /**
   * Register a video with the manager
   * @param video Video instance to register
   */
  register(video: VideoInstance): void {
    this.registeredVideos.set(video.id, video);

    // Add event listeners to track when this video starts playing
    const playHandler = () => this.handlePlay(video);
    video.videoElement.addEventListener('play', playHandler);
    video.videoElement.addEventListener('playing', playHandler);

    // Store handlers for cleanup
    (video.videoElement as any).__videoManagerHandlers = { playHandler };

    // Setup PiP listeners
    this.setupPiPListeners(video);

    // Observe this video element for visibility
    if (this.intersectionObserver) {
      video.videoElement.setAttribute('data-video-id', video.id);
      this.intersectionObserver.observe(video.videoElement);
    }
  }

  /**
   * Unregister a video from the manager
   * @param videoId ID of the video to unregister
   */
  unregister(videoId: string): void {
    const video = this.registeredVideos.get(videoId);
    if (video) {
      // Remove event listeners
      const handlers = (video.videoElement as any).__videoManagerHandlers;
      if (handlers) {
        video.videoElement.removeEventListener('play', handlers.playHandler);
        video.videoElement.removeEventListener('playing', handlers.playHandler);
      }

      // Unobserve from intersection observer
      if (this.intersectionObserver) {
        this.intersectionObserver.unobserve(video.videoElement);
      }

      // If this was the currently playing video, clear it
      if (this.currentlyPlaying?.id === videoId) {
        this.currentlyPlaying = null;
      }

      this.registeredVideos.delete(videoId);
    }
  }

  /**
   * Handle when a video starts playing
   * Pause all other videos
   */
  private handlePlay(video: VideoInstance): void {
    // If there's already a playing video and it's different from this one
    if (this.currentlyPlaying && this.currentlyPlaying.id !== video.id) {
      // Don't pause if the currently playing video is in Picture-in-Picture mode
      const isPiP = (this.currentlyPlaying.videoElement as any).__isPiP;
      if (!isPiP) {
        // Pause the previously playing video
        this.pauseVideo(this.currentlyPlaying);
      }
    }

    // Set this video as currently playing
    this.currentlyPlaying = video;
  }

  /**
   * Manually pause a specific video
   */
  private pauseVideo(video: VideoInstance): void {
    if (!video.videoElement.paused) {
      video.videoElement.pause();

      // Call the component's pause callback if provided
      if (video.pauseCallback) {
        video.pauseCallback();
      }
    }
  }

  /**
   * Pause all videos (useful for background tab, modals opening, etc.)
   */
  pauseAll(): void {
    this.registeredVideos.forEach(video => {
      this.pauseVideo(video);
    });
    this.currentlyPlaying = null;
  }

  /**
   * Get currently playing video info (for debugging)
   */
  getCurrentlyPlaying(): VideoInstance | null {
    return this.currentlyPlaying;
  }

  /**
   * Setup Picture-in-Picture listeners for a video
   */
  private setupPiPListeners(video: VideoInstance): void {
    video.videoElement.addEventListener('enterpictureinpicture', () => {
      // Mark this video as PiP
      (video.videoElement as any).__isPiP = true;
    });

    video.videoElement.addEventListener('leavepictureinpicture', () => {
      // Unmark PiP status
      (video.videoElement as any).__isPiP = false;
    });
  }

  /**
   * Setup page visibility listener to pause videos when tab is hidden
   */
  setupVisibilityListener(): void {
    if (this.visibilityListener) return; // Already setup

    this.visibilityListener = () => {
      if (document.hidden) {
        this.pauseAll();
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.visibilityListener);
    }
  }

  /**
   * Setup Intersection Observer to pause videos scrolled out of view
   */
  setupIntersectionObserver(): void {
    if (typeof window === 'undefined') return;

    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          const videoId = entry.target.getAttribute('data-video-id');
          if (!videoId) return;

          const video = this.registeredVideos.get(videoId);
          if (!video) return;

          // If video scrolls out of view (less than 50% visible), pause it
          if (!entry.isIntersecting && !video.videoElement.paused) {
            // Don't pause if it's in PiP mode
            const isPiP = (video.videoElement as any).__isPiP;
            if (!isPiP) {
              this.pauseVideo(video);
            }
          }
        });
      },
      { threshold: 0.5 } // 50% of video must be visible
    );
  }

  /**
   * Cleanup all listeners and observers
   */
  cleanup(): void {
    // Remove visibility listener
    if (this.visibilityListener) {
      document.removeEventListener('visibilitychange', this.visibilityListener);
      this.visibilityListener = null;
    }

    // Disconnect intersection observer
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
      this.intersectionObserver = null;
    }

    // Clear all registered videos
    this.registeredVideos.clear();
    this.currentlyPlaying = null;
  }
}

// Export singleton instance
export const videoManager = new VideoManager();

// Setup visibility listener and intersection observer on initialization
if (typeof window !== 'undefined') {
  videoManager.setupVisibilityListener();
  videoManager.setupIntersectionObserver();
}

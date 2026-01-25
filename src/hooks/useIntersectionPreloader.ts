import { useRef, useEffect, useCallback } from 'react';

interface UseIntersectionPreloaderOptions {
  rootMargin?: string;
  threshold?: number;
  preloadDistance?: number; // Number of reels ahead to preload
  onReelVisible?: (reelId: string, index: number) => void;
  onReelPreload?: (reelId: string, index: number) => void;
}

interface UseIntersectionPreloaderReturn {
  registerReel: (element: HTMLElement | null, reelId: string, index: number) => void;
  unregisterReel: (element: HTMLElement | null) => void;
  disconnect: () => void;
  preloadComments: (reelId: string) => void;
}

export const useIntersectionPreloader = (
  reelsData: any[],
  options: UseIntersectionPreloaderOptions = {}
): UseIntersectionPreloaderReturn => {
  const {
    rootMargin = '50px',
    threshold = 0.1,
    preloadDistance = 2,
    onReelVisible,
    onReelPreload
  } = options;

  const observerRef = useRef<IntersectionObserver | null>(null);
  const observedElementsRef = useRef<Map<HTMLElement, { reelId: string; index: number }>>(new Map());
  const visibleReelsRef = useRef<Set<string>>(new Set());
  const preloadedReelsRef = useRef<Set<string>>(new Set());

  // Initialize intersection observer
  useEffect(() => {
    if (!observerRef.current) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            const elementData = observedElementsRef.current.get(entry.target as HTMLElement);
            if (!elementData) return;

            const { reelId, index } = elementData;

            if (entry.isIntersecting) {
              // Reel is visible
              if (!visibleReelsRef.current.has(reelId)) {
                visibleReelsRef.current.add(reelId);
                onReelVisible?.(reelId, index);

                // Preload upcoming reels
                preloadUpcomingReels(index);
              }
            } else {
              // Reel is no longer visible
              visibleReelsRef.current.delete(reelId);
            }
          });
        },
        {
          rootMargin,
          threshold
        }
      );
    }

    return () => {
      observerRef.current?.disconnect();
    };
  }, [rootMargin, threshold, onReelVisible]);

  // Preload upcoming reels based on current index
  const preloadUpcomingReels = useCallback((currentIndex: number) => {
    if (!reelsData || reelsData.length === 0) return;

    const endIndex = Math.min(currentIndex + preloadDistance, reelsData.length - 1);

    for (let i = currentIndex + 1; i <= endIndex; i++) {
      const upcomingReel = reelsData[i];
      if (upcomingReel && upcomingReel._id && !preloadedReelsRef.current.has(upcomingReel._id)) {
        preloadedReelsRef.current.add(upcomingReel._id);

        // Delay preloading to avoid overwhelming the network
        const delay = (i - currentIndex) * 500; // 500ms delay between each preload

        setTimeout(() => {
          onReelPreload?.(upcomingReel._id, i);
        }, delay);
      }
    }
  }, [reelsData, preloadDistance, onReelPreload]);

  // Register a reel element for observation
  const registerReel = useCallback((element: HTMLElement | null, reelId: string, index: number) => {
    if (!element || !observerRef.current) return;

    // Store element data
    observedElementsRef.current.set(element, { reelId, index });

    // Start observing
    observerRef.current.observe(element);
  }, []);

  // Unregister a reel element
  const unregisterReel = useCallback((element: HTMLElement | null) => {
    if (!element || !observerRef.current) return;

    // Remove from tracking
    const elementData = observedElementsRef.current.get(element);
    if (elementData) {
      visibleReelsRef.current.delete(elementData.reelId);
      observedElementsRef.current.delete(element);
    }

    // Stop observing
    observerRef.current.unobserve(element);
  }, []);

  // Disconnect observer
  const disconnect = useCallback(() => {
    observerRef.current?.disconnect();
    observedElementsRef.current.clear();
    visibleReelsRef.current.clear();
    preloadedReelsRef.current.clear();
  }, []);

  // Allow manual preloading of comments for a given reelId
  const preloadComments = useCallback((reelId: string) => {
    if (!reelId) return;

    // If already preloaded, skip
    if (preloadedReelsRef.current.has(reelId)) return;

    // Try to find the index for the reelId from observed elements map
    let foundIndex: number | null = null;
    observedElementsRef.current.forEach(({ reelId: id, index }) => {
      if (id === reelId) {
        foundIndex = index;
      }
    });

    // Mark as preloaded and trigger onReelPreload if available
    preloadedReelsRef.current.add(reelId);

    // If we have an index, call onReelPreload with it, otherwise call with -1
    const idx = foundIndex !== null ? foundIndex : -1;
    onReelPreload?.(reelId, idx);
  }, [onReelPreload]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    registerReel,
    unregisterReel,
    disconnect
    , preloadComments
  };
};
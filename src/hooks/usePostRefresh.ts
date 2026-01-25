import { useEffect } from 'react';
import { postRefreshEvents } from '@/utils/postRefreshEvents';

/**
 * Hook to listen for new post creation events and trigger a refresh callback
 * @param refreshCallback Function to call when posts should be refreshed
 */
export function usePostRefresh(refreshCallback: () => void) {
  useEffect(() => {
    const unsubscribe = postRefreshEvents.subscribe((newPost) => {
      refreshCallback();
    });

    return unsubscribe;
  }, [refreshCallback]);
}
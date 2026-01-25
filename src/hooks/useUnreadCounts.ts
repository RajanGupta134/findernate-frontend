import { useState, useEffect } from 'react';
import { getUnreadCounts, getNotifications } from '@/api/notification';
import { useUserStore } from '@/store/useUserStore';

interface UnreadCounts {
  unreadNotifications: number;
  unreadMessages: number;
}

export const useUnreadCounts = () => {
  const user = useUserStore((state) => state.user);
  const [counts, setCounts] = useState<UnreadCounts>({
    unreadNotifications: 0,
    unreadMessages: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCounts = async () => {
      if (!user) {
        setCounts({
          unreadNotifications: 0,
          unreadMessages: 0
        });
        setLoading(false);
        return;
      }

      try {
        // Fetch both unread counts and notifications in parallel
        const [countsResponse, notificationsResponse] = await Promise.all([
          getUnreadCounts(),
          getNotifications().catch(error => {
            console.warn('Failed to fetch notifications (non-critical):', error);
            return null; // Don't fail the whole operation if notifications fail
          })
        ]);

        if (countsResponse?.data) {
          setCounts({
            unreadNotifications: countsResponse.data.unreadNotifications || 0,
            unreadMessages: countsResponse.data.unreadMessages || 0
          });
        }

        // If notifications were fetched successfully, emit event to update notifications list
        if (notificationsResponse) {
          window.dispatchEvent(new CustomEvent('notifications-updated', { 
            detail: notificationsResponse 
          }));
        }
      } catch (error: any) {
        console.error('Error fetching unread counts:', error);

        // If it's a rate limiting error (429), don't reset counts to 0
        if (error?.response?.status !== 429) {
          setCounts({
            unreadNotifications: 0,
            unreadMessages: 0
          });
        }
      } finally {
        setLoading(false);
      }
    };

    fetchCounts();

    // Set up an interval to refresh counts every 5 minutes (reduced from 30s to prevent resource exhaustion)
    // Socket.IO events handle real-time updates, polling is just a backup
    const interval = setInterval(fetchCounts, 300000); // 5 minutes

    // Listen for custom events to refresh counts
    const handleRefreshCounts = () => {
      fetchCounts();
    };

    window.addEventListener('refresh-unread-counts', handleRefreshCounts);

    return () => {
      clearInterval(interval);
      window.removeEventListener('refresh-unread-counts', handleRefreshCounts);
    };
  }, [user]);

  // Function to manually refresh counts
  const refreshCounts = () => {
    window.dispatchEvent(new Event('refresh-unread-counts'));
  };

  return { ...counts, loading, refreshCounts };
};

// Utility function to refresh unread counts from anywhere in the app
export const refreshUnreadCounts = () => {
  window.dispatchEvent(new Event('refresh-unread-counts'));
};
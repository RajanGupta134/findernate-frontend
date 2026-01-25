import { useState, useEffect } from 'react';
import { messageAPI } from '@/api/message';
import { useUserStore } from '@/store/useUserStore';
import { calculateUnreadCounts } from '@/utils/message/chatUtils';

export const useMessageCounts = () => {
  const user = useUserStore((state) => state.user);
  const [counts, setCounts] = useState({
    directUnreadCount: 0,
    groupUnreadCount: 0,
    requestCount: 0,
    totalCount: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCounts = async () => {
      if (!user) {
        setCounts({
          directUnreadCount: 0,
          groupUnreadCount: 0,
          requestCount: 0,
          totalCount: 0
        });
        setLoading(false);
        return;
      }

      try {
        // Fetch chats and message requests in parallel
        const [chatsResponse, requestsResponse] = await Promise.all([
          messageAPI.getUserChats(),
          messageAPI.getMessageRequests()
        ]);
        
        const chats = chatsResponse.chats || [];
        const requests = requestsResponse.chats || [];

        // Calculate unread counts
        const { directUnreadCount, groupUnreadCount } = calculateUnreadCounts(chats);
        const requestCount = requests.length;
        const totalCount = directUnreadCount + groupUnreadCount + requestCount;

        setCounts({
          directUnreadCount,
          groupUnreadCount,
          requestCount,
          totalCount
        });
      } catch (error) {
        console.error('Error fetching message counts:', error);
        setCounts({
          directUnreadCount: 0,
          groupUnreadCount: 0,
          requestCount: 0,
          totalCount: 0
        });
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

    window.addEventListener('refresh-message-counts', handleRefreshCounts);

    return () => {
      clearInterval(interval);
      window.removeEventListener('refresh-message-counts', handleRefreshCounts);
    };
  }, [user]);

  return { ...counts, loading };
};

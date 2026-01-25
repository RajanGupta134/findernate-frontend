'use client'
import Image from 'next/image';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '@/api/notification';
import { refreshUnreadCounts } from '@/hooks/useUnreadCounts';
import { Bell, User, Heart, MessageCircle, FileText, Loader2, AlertCircle, RefreshCw, LogIn, CheckCheck } from 'lucide-react';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { useUserStore } from '@/store/useUserStore';
import NotificationSettings from '@/components/notifications/NotificationSettings';

interface Notification {
  _id: string;
  receiverId: string;
  senderId: {
    _id: string;
    username: string;
    profileImageUrl: string;
  } | null;
  type: string;
  message: string;
  postId: string | null;
  commentId: string | null;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

// Fallback data in case API fails
const fallbackNotifications: Notification[] = [
  {
    _id: '1',
    receiverId: 'user1',
    senderId: {
      _id: 'sender1',
      username: 'UFC',
      profileImageUrl: '/placeholderimg.png',
    },
    type: 'follow',
    message: ' started following you',
    postId: null,
    commentId: null,
    isRead: false,
    createdAt: '2025-07-28T05:54:03.435Z',
    updatedAt: '2025-07-28T05:54:03.435Z',
  },
  {
    _id: '2',
    receiverId: 'user1',
    senderId: {
      _id: 'sender2',
      username: 'Chai aur Code',
      profileImageUrl: '/placeholderimg.png',
    },
    type: 'like',
    message: ' liked your post',
    postId: 'post1',
    commentId: null,
    isRead: false,
    createdAt: '2025-07-28T04:30:00.000Z',
    updatedAt: '2025-07-28T04:30:00.000Z',
  },
  {
    _id: '3',
    receiverId: 'user1',
    senderId: {
      _id: 'sender3',
      username: 'GFXMentor',
      profileImageUrl: '/placeholderimg.png',
    },
    type: 'comment',
    message: ' commented on your post',
    postId: 'post2',
    commentId: 'comment1',
    isRead: false,
    createdAt: '2025-07-28T03:15:00.000Z',
    updatedAt: '2025-07-28T03:15:00.000Z',
  },
];

const Notifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [markingAllAsRead, setMarkingAllAsRead] = useState(false);

  // Function to refresh notifications list
  const refreshNotifications = async () => {
    try {
      const response = await getNotifications();
      const rawNotifications = response.data?.notifications || response.data || [];
      const validNotifications = rawNotifications.filter((notification: Notification) => 
        notification && notification.senderId && notification.senderId._id
      );
      const seen = loadSeenNotifications();
      const merged = validNotifications.map(n => ({ ...n, isRead: n.isRead || seen.has(n._id) }));
      setNotifications(merged);
    } catch (err) {
      console.error('Failed to refresh notifications:', err);
    }
  };
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthGuard();
  const { user } = useUserStore();

  // Track last time user visited notifications to compute "new since last visit"
  const getLastSeenKey = React.useCallback(() => `notifications_last_seen_at_${user?._id || 'anon'}`,[user?._id]);
  const loadLastSeenAt = React.useCallback((): number => {
    if (typeof window === 'undefined') return Date.now();
    try {
      const raw = localStorage.getItem(getLastSeenKey());
      const ts = raw ? parseInt(raw, 10) : Date.now();
      return Number.isFinite(ts) ? ts : Date.now();
    } catch {
      return Date.now();
    }
  }, [getLastSeenKey]);
  const persistLastSeenAt = React.useCallback((ts: number) => {
    if (typeof window === 'undefined') return;
    try { localStorage.setItem(getLastSeenKey(), String(ts)); } catch {}
  }, [getLastSeenKey]);

  const [lastSeenAt, setLastSeenAt] = useState<number>(Date.now());
  useEffect(() => { setLastSeenAt(loadLastSeenAt()); }, [loadLastSeenAt]);
  // Update last seen timestamp when leaving the page
  useEffect(() => {
    return () => { persistLastSeenAt(Date.now()); };
  }, [persistLastSeenAt]);

  const newSinceLastVisitCount = React.useMemo(
    () => notifications.filter(n => new Date(n.createdAt).getTime() > lastSeenAt).length,
    [notifications, lastSeenAt]
  );

  const getStorageKey = React.useCallback(() => `seen_notifications_${user?._id || 'anon'}`,[user?._id]);

  const loadSeenNotifications = React.useCallback((): Set<string> => {
    if (typeof window === 'undefined') return new Set();
    try {
      const raw = localStorage.getItem(getStorageKey());
      if (!raw) return new Set();
      const arr = JSON.parse(raw) as string[];
      return new Set(Array.isArray(arr) ? arr : []);
    } catch {
      return new Set();
    }
  }, [getStorageKey]);

  const persistSeenNotifications = React.useCallback((ids: Set<string>) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(getStorageKey(), JSON.stringify(Array.from(ids)));
    } catch {}
  }, [getStorageKey]);

  const handleNotificationClick = async (notification: Notification) => {
    try {
      // Optimistically mark as read and persist locally
      setNotifications(prev => prev.map(n => n._id === notification._id ? { ...n, isRead: true } : n));
      const seen = loadSeenNotifications();
      seen.add(notification._id);
      persistSeenNotifications(seen);

      // Mark notification as read via API (don't wait for response)
      markNotificationAsRead(notification._id).catch(error => {
        console.error('Failed to mark notification as read:', error);
        // Revert optimistic update if API call fails
        setNotifications(prev => prev.map(n => n._id === notification._id ? { ...n, isRead: false } : n));
        const seenReverted = loadSeenNotifications();
        seenReverted.delete(notification._id);
        persistSeenNotifications(seenReverted);
      });

      // Refresh unread counts and notifications list immediately
      refreshUnreadCounts();
      
      // Refresh the notifications list after a short delay to ensure backend is updated
      setTimeout(() => {
        refreshNotifications();
      }, 500);

      // Navigate based on notification type
      if (notification.type === 'follow' && notification.senderId) {
        // Navigate to the user's profile
        router.push(`/userprofile/${notification.senderId.username}`);
      } else if (notification.type === 'comment' && notification.postId) {
        // Navigate to the specific post for comments with commentId for auto-focus
        const url = notification.commentId 
          ? `/post/${notification.postId}?commentId=${notification.commentId}`
          : `/post/${notification.postId}`;
        router.push(url);
      } else if (notification.type === 'like' && notification.postId) {
        // Navigate to the specific post for likes
        router.push(`/post/${notification.postId}`);
      } else if (notification.type === 'post' && notification.postId) {
        // Navigate to the post for general post notifications
        router.push(`/post/${notification.postId}`);
      } else if (notification.postId) {
        // Fallback: if there's a postId but type doesn't match above, still navigate to post
        router.push(`/post/${notification.postId}`);
      } else if (notification.senderId) {
        // Fallback: if no postId but there's a sender, navigate to their profile
        router.push(`/userprofile/${notification.senderId.username}`);
      }
    } catch (error) {
      console.error('Error handling notification click:', error);
      // Still navigate even if marking as read fails
      if (notification.postId) {
        router.push(`/post/${notification.postId}`);
      } else if (notification.senderId) {
        router.push(`/userprofile/${notification.senderId.username}`);
      }
    }
  };

  const handleMarkAllAsRead = async () => {
    if (markingAllAsRead) return; // Prevent multiple clicks
    
    try {
      setMarkingAllAsRead(true);
      
      // Optimistically mark all notifications as read
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      
      // Mark all notifications locally
      const allIds = notifications.map(n => n._id);
      const seen = loadSeenNotifications();
      allIds.forEach(id => seen.add(id));
      persistSeenNotifications(seen);

      // Call API to mark all as read
      await markAllNotificationsAsRead();

      // Refresh unread counts and notifications list
      refreshUnreadCounts();
      setTimeout(() => {
        refreshNotifications();
      }, 500);

    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      // Revert optimistic update if API call fails
      refreshNotifications();
    } finally {
      setMarkingAllAsRead(false);
    }
  };

  const handleLoginClick = () => {
    router.push('/signin');
  };

  const getNotificationIcon = (type: string) => {
    const iconClass = "w-4 h-4";
    switch (type) {
      case 'follow':
        return <User className={`${iconClass} text-blue-500`} />;
      case 'like':
        return <Heart className={`${iconClass} text-red-500 fill-current`} />;
      case 'comment':
        return <MessageCircle className={`${iconClass} text-green-500`} />;
      case 'post':
        return <FileText className={`${iconClass} text-purple-500`} />;
      default:
        return <Bell className={`${iconClass} text-gray-500`} />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'follow':
        return 'bg-blue-50 border-blue-200';
      case 'like':
        return 'bg-red-50 border-red-200';
      case 'comment':
        return 'bg-green-50 border-green-200';
      case 'post':
        return 'bg-purple-50 border-purple-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const notificationDate = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - notificationDate.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    
    return notificationDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: notificationDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  useEffect(() => {
    const fetchNotifications = async () => {
      // Only fetch if user is authenticated
      if (!isAuthenticated) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        const response = await getNotifications();
        
        // Transform API response to match our interface
        // Filter out notifications with null senderId to prevent errors
        const rawNotifications = response.data?.notifications || response.data || [];
        const validNotifications = rawNotifications.filter((notification: Notification) => 
          notification && notification.senderId && notification.senderId._id
        );
        // Merge with locally seen set to avoid showing New for previously visited ones
        const seen = loadSeenNotifications();
        const merged = validNotifications.map(n => ({ ...n, isRead: n.isRead || seen.has(n._id) }));
        setNotifications(merged);
      } catch (err) {
        console.error('Failed to fetch notifications:', err);
        setError('Failed to load notifications');
        // Use fallback data if API fails
        const seen = loadSeenNotifications();
        const mergedFallback = fallbackNotifications.map(n => ({ ...n, isRead: n.isRead || seen.has(n._id) }));
        setNotifications(mergedFallback);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, [isAuthenticated, user?._id, loadSeenNotifications]);

  // Listen for notifications updates from unread counts hook
  useEffect(() => {
    const handleNotificationsUpdated = (event: CustomEvent) => {
      try {
        const response = event.detail;
        const rawNotifications = response.data?.notifications || response.data || [];
        const validNotifications = rawNotifications.filter((notification: Notification) => 
          notification && notification.senderId && notification.senderId._id
        );
        const seen = loadSeenNotifications();
        const merged = validNotifications.map(n => ({ ...n, isRead: n.isRead || seen.has(n._id) }));
        setNotifications(merged);
        //console.log('Notifications updated from unread counts API');
      } catch (error) {
        console.error('Error handling notifications update event:', error);
      }
    };

    window.addEventListener('notifications-updated', handleNotificationsUpdated as EventListener);

    return () => {
      window.removeEventListener('notifications-updated', handleNotificationsUpdated as EventListener);
    };
  }, [loadSeenNotifications]);

  // Auto-refresh notifications when on notifications page
  // NOTE: Reduced polling frequency to prevent browser resource exhaustion
  // The useUnreadCounts hook already fetches notifications every 5 minutes
  // This is just a backup for when user is actively viewing notifications page
  useEffect(() => {
    if (!isAuthenticated || !user?._id) return;

    const autoRefreshNotifications = async () => {
      try {
        const response = await getNotifications();
        const rawNotifications = response.data?.notifications || response.data || [];
        const validNotifications = rawNotifications.filter((notification: Notification) =>
          notification && notification.senderId && notification.senderId._id
        );
        const seen = loadSeenNotifications();
        const merged = validNotifications.map(n => ({ ...n, isRead: n.isRead || seen.has(n._id) }));
        setNotifications(merged);
      } catch (error) {
        console.error('Error in auto-refresh notifications:', error);
        // Don't update error state for background refresh failures
      }
    };

    // Set up interval to refresh every 5 minutes (reduced from 30s to prevent resource exhaustion)
    const interval = setInterval(autoRefreshNotifications, 300000); // 5 minutes

    return () => {
      clearInterval(interval);
    };
  }, [isAuthenticated, user?._id, loadSeenNotifications]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="w-full sm:w-[50rem] min-h-screen mx-auto pt-2 bg-white border border-gray-200 rounded-none sm:rounded-xl shadow-sm overflow-hidden flex items-center justify-center px-3 sm:px-0">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login prompt for unauthenticated users
  if (!isAuthenticated) {
    return (
      <>
        <div className="flex min-h-screen bg-gray-50">
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-center bg-white rounded-2xl shadow-lg p-12 max-w-md w-full mx-4">
              <div className="mb-6">
                <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Bell className="w-10 h-10 text-yellow-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Stay in the Loop</h2>
                <p className="text-gray-600 leading-relaxed">
                  Sign in to see who liked your posts, commented on your content, and started following you.
                </p>
              </div>
              
              <div className="space-y-4 mb-6">
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                    <Heart className="w-4 h-4 text-red-500 fill-current" />
                  </div>
                  <span>See who liked your posts</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <MessageCircle className="w-4 h-4 text-green-600" />
                  </div>
                  <span>Get notified of new comments</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-blue-600" />
                  </div>
                  <span>Know when people follow you</span>
                </div>
              </div>
              
              <button
                onClick={handleLoginClick}
                className="w-full bg-button-gradient text-black font-semibold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg flex items-center justify-center gap-2"
              >
                <LogIn className="w-5 h-5" />
                Sign In to See Notifications
              </button>
              
              <p className="text-sm text-gray-500 mt-4">
                New to our platform? Sign up to get started!
              </p>
            </div>
          </div>
        </div>

      </>
    );
  }

  // Show authenticated notifications page
  return (
    <>
      <div className="w-full sm:w-[50rem] min-h-screen mx-auto pt-2 bg-white border border-gray-200 rounded-none sm:rounded-xl shadow-sm overflow-hidden px-3 sm:px-0">
        {/* Header */}
        <div className="bg-button-gradient px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <Bell className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Notifications</h1>
                <p className="text-white/80 text-sm">Stay updated with your activity</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {!loading && newSinceLastVisitCount > 0 && (
                <div className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
                  <span className="text-white text-sm font-medium">{newSinceLastVisitCount}</span>
                </div>
              )}
              {!loading && notifications.some(n => !n.isRead) && (
                <button
                  onClick={handleMarkAllAsRead}
                  disabled={markingAllAsRead}
                  className="bg-white/20 backdrop-blur-sm px-3 py-2 rounded-lg text-black text-sm font-bold hover:bg-white/30 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {markingAllAsRead ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCheck className="w-4 h-4" />
                  )}
                  {markingAllAsRead ? 'Marking...' : 'Mark All as Read'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Push Notification Settings */}
        <div className="px-6 py-4 border-b border-gray-200">
          <NotificationSettings />
        </div>

        <div className="overflow-y-auto max-h-[calc(100vh-120px)]">
          {/* Loading State */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 px-3 sm:px-6">
              <Loader2 className="w-8 h-8 text-yellow-500 animate-spin mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Loading notifications</h3>
              <p className="text-gray-500">Please wait while we fetch your updates...</p>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="flex flex-col items-center justify-center py-16 px-3 sm:px-6">
              <div className="bg-red-100 p-4 rounded-full mb-4">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Something went wrong</h3>
              <p className="text-gray-500 text-center mb-6">{error}</p>
              <button 
                onClick={() => window.location.reload()}
                className="flex items-center gap-2 px-6 py-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors font-medium"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
            </div>
          )}

          {/* Empty State for no notifications at all */}
          {!loading && !error && notifications.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 px-3 sm:px-6">
              <div className="bg-gray-100 p-6 rounded-full mb-6">
                <Bell className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">All caught up!</h3>
              <p className="text-gray-500 text-center">You have no notifications right now. Check back later for updates.</p>
            </div>
          )}

          {/* Notifications List */}
          {!loading && !error && notifications.length > 0 && (
            <div className="divide-y divide-gray-100">
              {notifications.map((notification, index) => {
                // Skip notifications with null senderId (extra safety check)
                if (!notification.senderId) {
                  return null;
                }

                return (
                  <div
                    key={notification._id || `notification-${index}`}
                    onClick={() => handleNotificationClick(notification)}
                    className={`relative flex items-start p-4 transition-all duration-200 cursor-pointer group flex-row ${
                      !notification.isRead
                        ? 'bg-yellow-100/80 hover:bg-yellow-100'
                        : new Date(notification.createdAt).getTime() > lastSeenAt
                          ? 'bg-blue-50/50 hover:bg-gray-50'
                          : 'hover:bg-gray-50'
                    }`}
                  >
                    {/* Profile Image with Status Ring */}
                    <div className="flex-shrink-0 relative">
                      <div className={`p-0.5 rounded-full ${!notification.isRead ? 'bg-gradient-to-r from-yellow-400 to-orange-500' : 'bg-gray-200'}`}>
                        <Image
                          className="h-12 w-12 rounded-full object-cover bg-white p-0.5"
                          src={notification.senderId?.profileImageUrl || '/placeholderimg.png'}
                          alt={`${notification.senderId?.username || 'Unknown user'} profile`}
                          width={48}
                          height={48}
                        />
                      </div>
                      
                      {/* Notification type badge */}
                      <div className={`absolute -bottom-1 -right-1 p-1.5 rounded-full border-2 border-white ${getNotificationColor(notification.type)}`}>
                        {getNotificationIcon(notification.type)}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 ml-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-gray-900 text-sm leading-relaxed">
                            <span
                              className="font-semibold text-gray-900 hover:text-yellow-600 transition-colors cursor-pointer"
                              role="button"
                              tabIndex={0}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (notification.senderId?.username) {
                                  router.push(`/userprofile/${notification.senderId.username}`);
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (notification.senderId?.username) {
                                    router.push(`/userprofile/${notification.senderId.username}`);
                                  }
                                }
                              }}
                            >
                              {notification.senderId?.username || 'Unknown user'}
                            </span>
                            <span className="text-gray-600">{" "+notification.message}</span>
                          </p>
                          <div className="flex items-center mt-1 space-x-2 flex-wrap gap-2">
                            <span className="text-xs text-gray-500">
                              {formatTimeAgo(notification.createdAt)}
                            </span>
                            {new Date(notification.createdAt).getTime() > lastSeenAt && (
                              <div className="flex items-center space-x-1">
                                <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                                <span className="text-xs text-yellow-800 font-medium">New</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Hover arrow */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 ml-2 hidden sm:block">
                      <div className="w-6 h-6 flex items-center justify-center">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

    </>
  );
};

export default Notifications;
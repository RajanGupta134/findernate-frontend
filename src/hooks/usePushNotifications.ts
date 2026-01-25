import { useState, useEffect, useCallback } from 'react';
import { 
  pushNotificationManager, 
  initializePushNotifications,
  NotificationPermissionState,
  MessageNotificationData,
  GeneralNotificationData
} from '../utils/pushNotifications';

export interface UsePushNotificationsReturn {
  // State
  permission: NotificationPermission;
  subscription: PushSubscription | null;
  supported: boolean;
  loading: boolean;
  error: string | null;

  // Actions
  requestPermission: () => Promise<boolean>;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
  showLocalNotification: (data: MessageNotificationData) => void;
  showGeneralNotification: (data: GeneralNotificationData) => void;
  clearError: () => void;
}

export function usePushNotifications(): UsePushNotificationsReturn {
  const [state, setState] = useState<NotificationPermissionState>({
    permission: 'default',
    subscription: null,
    supported: false
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize push notifications
  useEffect(() => {
    let mounted = true;

    async function initialize() {
      try {
        setLoading(true);
        setError(null);
        
        const initialState = await initializePushNotifications();
        
        if (mounted) {
          setState(initialState);
        }
      } catch (err) {
        console.error('Error initializing push notifications:', err);
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to initialize push notifications');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    initialize();

    return () => {
      mounted = false;
    };
  }, []);

  // Request permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const permission = await pushNotificationManager.requestPermission();
      
      setState(prev => ({
        ...prev,
        permission
      }));

      return permission === 'granted';
    } catch (err) {
      console.error('Error requesting notification permission:', err);
      setError(err instanceof Error ? err.message : 'Failed to request notification permission');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Subscribe to push notifications
  const subscribe = useCallback(async (): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const subscription = await pushNotificationManager.subscribe();
      
      if (subscription) {
        setState(prev => ({
          ...prev,
          subscription,
          permission: 'granted'
        }));
        return true;
      }

      return false;
    } catch (err) {
      console.error('Error subscribing to push notifications:', err);
      setError(err instanceof Error ? err.message : 'Failed to subscribe to push notifications');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const success = await pushNotificationManager.unsubscribe();
      
      if (success) {
        setState(prev => ({
          ...prev,
          subscription: null
        }));
      }

      return success;
    } catch (err) {
      console.error('Error unsubscribing from push notifications:', err);
      setError(err instanceof Error ? err.message : 'Failed to unsubscribe from push notifications');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Show local notification
  const showLocalNotification = useCallback((data: MessageNotificationData) => {
    try {
      pushNotificationManager.showLocalNotification(data);
    } catch (err) {
      console.error('Error showing local notification:', err);
      setError(err instanceof Error ? err.message : 'Failed to show notification');
    }
  }, []);

  // Show general notification
  const showGeneralNotification = useCallback((data: GeneralNotificationData) => {
    try {
      pushNotificationManager.showGeneralNotification(data);
    } catch (err) {
      console.error('Error showing general notification:', err);
      setError(err instanceof Error ? err.message : 'Failed to show notification');
    }
  }, []);


  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    permission: state.permission,
    subscription: state.subscription,
    supported: state.supported,
    loading,
    error,
    requestPermission,
    subscribe,
    unsubscribe,
    showLocalNotification,
    showGeneralNotification,
    clearError
  };
}
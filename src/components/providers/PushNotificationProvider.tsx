'use client';

import React, { useEffect } from 'react';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import { setupMessageNotifications } from '../../api/message';
import { streamAPI } from '../../api/stream';

interface PushNotificationProviderProps {
  children: React.ReactNode;
  userId?: string;
}

export default function PushNotificationProvider({
  children,
  userId
}: PushNotificationProviderProps) {
  const { supported, permission } = usePushNotifications();

  // Initialize message notifications when user is available
  useEffect(() => {
    if (userId && supported && permission === 'granted') {
      setupMessageNotifications(userId);
    }
  }, [userId, supported, permission]);

  // Pre-fetch Stream.io token for faster call initiation
  useEffect(() => {
    if (userId) {
      // Wait a bit for auth to stabilize, then prefetch token
      const timeoutId = setTimeout(() => {
        streamAPI.prefetchStreamToken();
      }, 2000); // 2 second delay

      return () => clearTimeout(timeoutId);
    }
  }, [userId]);

  // Listen for visibility changes to handle focus notifications
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        //console.log('App went to background - notifications will be shown');
      } else {
        //console.log('App came to foreground - notifications will be suppressed');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return <>{children}</>;
}
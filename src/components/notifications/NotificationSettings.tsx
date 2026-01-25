'use client';

import React from 'react';
import { usePushNotifications } from '../../hooks/usePushNotifications';

interface NotificationSettingsProps {
  className?: string;
}

export default function NotificationSettings({ className = '' }: NotificationSettingsProps) {
  const {
    permission,
    subscription,
    supported,
    loading,
    error,
    requestPermission,
    subscribe,
    unsubscribe,
    clearError
  } = usePushNotifications();

  const handleToggleNotifications = async () => {
    if (subscription) {
      // Currently subscribed, unsubscribe
      await unsubscribe();
    } else {
      // Not subscribed, subscribe
      if (permission === 'granted') {
        await subscribe();
      } else {
        const granted = await requestPermission();
        if (granted) {
          await subscribe();
        }
      }
    }
  };


  const getStatusText = () => {
    if (!supported) {
      return 'Push notifications are not supported in this browser';
    }

    if (error && error.includes('not configured')) {
      return 'Push notifications are not configured on this server';
    }

    if (error && error.includes('Invalid VAPID key')) {
      return 'Push notification configuration error - please contact support';
    }

    if (permission === 'denied') {
      return 'Push notifications are blocked. Please enable them in your browser settings.';
    }

    if (permission === 'default') {
      return 'Click to enable push notifications for new messages';
    }

    if (subscription) {
      return 'Push notifications are enabled. You\'ll receive notifications for new messages.';
    }

    return 'Push notifications are available but not enabled';
  };

  const isToggleDisabled = (): boolean => {
    return loading || !supported || permission === 'denied' || 
           (!!error && (error.includes('not configured') || error.includes('Invalid VAPID key')));
  };

  if (!supported) {
    return (
      <div className={`bg-gray-100 border border-gray-300 rounded-lg p-4 ${className}`}>
        <div className="flex items-center space-x-3">
          <div className="w-6 h-6 bg-gray-400 rounded-full flex items-center justify-center">
            <span className="text-white text-sm">!</span>
          </div>
          <div>
            <h3 className="font-medium text-gray-900">Push Notifications</h3>
            <p className="text-sm text-gray-600">
              Push notifications are not supported in this browser
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 shadow-sm ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
            subscription 
              ? 'bg-green-500' 
              : permission === 'denied' 
                ? 'bg-red-500' 
                : 'bg-gray-400'
          }`}>
            {subscription ? (
              <span className="text-white text-sm">✓</span>
            ) : permission === 'denied' ? (
              <span className="text-white text-sm">✗</span>
            ) : (
              <span className="text-white text-sm">🔔</span>
            )}
          </div>
          <div>
            <h3 className="font-medium text-gray-900">Push Notifications</h3>
            <p className="text-sm text-gray-600">{getStatusText()}</p>
          </div>
        </div>
        
        <div className="flex items-center">
          <button
            onClick={handleToggleNotifications}
            disabled={isToggleDisabled()}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
              subscription && !isToggleDisabled()
                ? 'bg-green-500' 
                : 'bg-gray-300'
            }`}
            role="switch"
            aria-checked={!!subscription}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                subscription && !isToggleDisabled() ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          {loading && (
            <div className="ml-3">
              <div className="w-4 h-4 border-2 border-gray-300 border-t-yellow-500 rounded-full animate-spin"></div>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm text-red-700">{error}</p>
              {error.includes('not configured') && (
                <p className="text-xs text-red-600 mt-1">
                  The server needs to be configured with VAPID keys to enable push notifications.
                </p>
              )}
            </div>
            <button
              onClick={clearError}
              className="text-red-700 hover:text-red-900 text-sm font-medium ml-2"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {permission === 'denied' && (
        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-700">
            To enable notifications, you'll need to:
          </p>
          <ol className="text-sm text-yellow-700 mt-1 ml-4 list-decimal">
            <li>Click the lock icon in your browser's address bar</li>
            <li>Set notifications to "Allow"</li>
            <li>Refresh this page</li>
          </ol>
        </div>
      )}

    </div>
  );
}
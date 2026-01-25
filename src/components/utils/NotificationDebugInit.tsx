'use client';

import { useEffect } from 'react';
import * as notificationDebug from '@/utils/notificationDebug';

/**
 * Component to initialize notification debug utilities
 * This makes debug functions available in the browser console
 */
export default function NotificationDebugInit() {
  useEffect(() => {
    // Expose debug functions to window object
    if (typeof window !== 'undefined') {
      (window as any).checkNotificationStatus = notificationDebug.checkNotificationStatus;
      (window as any).testFCMNotification = notificationDebug.testFCMNotification;
      (window as any).requestNotificationPermission = notificationDebug.requestNotificationPermission;
      (window as any).getServiceWorkerInfo = notificationDebug.getServiceWorkerInfo;
      (window as any).unregisterAllServiceWorkers = notificationDebug.unregisterAllServiceWorkers;

      console.log('💡 Notification Debug Utils loaded! Available commands:');
      console.log('   • window.checkNotificationStatus()');
      console.log('   • window.testFCMNotification()');
      console.log('   • window.requestNotificationPermission()');
      console.log('   • window.getServiceWorkerInfo()');
      console.log('   • window.unregisterAllServiceWorkers()');
    }
  }, []);

  return null; // This component doesn't render anything
}

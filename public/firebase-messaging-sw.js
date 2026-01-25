// Firebase Messaging Service Worker
// This file handles background FCM notifications

importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// Initialize Firebase in the service worker
// Note: You need to replace these with your actual Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBS2VB9h0FHBhs93ucROiy9nzAcgdiA7Bo",
  authDomain: "findernate-900de.firebaseapp.com",
  projectId: "findernate-900de",
  storageBucket: "findernate-900de.firebasestorage.app",
  messagingSenderId: "902240921355",
  appId: "1:902240921355:web:b11f85d182914bb20ce40e"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('📬 [FCM Background] Message received:', payload);
  console.log('📬 [FCM Background] Payload data:', payload.data);
  console.log('📬 [FCM Background] Payload notification:', payload.notification);

  // Handle both formats - data in payload.data or payload.notification
  const data = payload.data || {};
  const notification = payload.notification || {};

  const notificationTitle = notification.title || data.title || 'New Notification';
  const notificationBody = notification.body || data.body || '';
  const notificationType = data.type || notification.type || 'general';

  console.log('📬 [FCM Background] Notification type:', notificationType);

  const notificationOptions = {
    body: notificationBody,
    icon: data.callerImage || notification.icon || '/Findernate.ico',
    badge: '/Findernate.ico',
    data: {
      // Preserve all data fields
      ...data,
      // Ensure these fields are available
      type: notificationType,
      callId: data.callId,
      chatId: data.chatId,
      callerId: data.callerId,
      callerName: data.callerName,
      callerImage: data.callerImage,
      callType: data.callType
    },
    tag: data.callId || data.tag || 'notification',
    requireInteraction: notificationType === 'incoming_call',
    vibrate: notificationType === 'incoming_call' ? [200, 100, 200, 100, 200] : [100, 50, 100],
    silent: false
  };

  // Add actions based on notification type
  if (notificationType === 'incoming_call') {
    console.log('📬 [FCM Background] Adding call action buttons');
    notificationOptions.actions = [
      { action: 'accept_call', title: '✅ Accept' },
      { action: 'decline_call', title: '❌ Decline' }
    ];
  }

  console.log('📬 [FCM Background] Showing notification with options:', notificationOptions);

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('🔔 [FCM] Notification clicked:', event.action);
  console.log('🔔 [FCM] Notification data:', event.notification.data);

  event.notification.close();

  const action = event.action;
  const data = event.notification.data;

  if (action === 'accept_call') {
    console.log('📞 [FCM] Accept call clicked for callId:', data.callId);
    // Open app and send message to accept call
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        console.log('📞 [FCM] Found', clientList.length, 'client windows');

        // Send message to app to accept call
        for (const client of clientList) {
          if (client.url.includes(self.location.origin)) {
            console.log('📞 [FCM] Sending ACCEPT_CALL message to existing window');
            client.postMessage({
              type: 'ACCEPT_CALL',
              data: {
                callId: data.callId,
                callerId: data.callerId,
                callerName: data.callerName,
                callerImage: data.callerImage,
                chatId: data.chatId,
                callType: data.callType
              }
            });
            return client.focus();
          }
        }

        // If no window open, open new one
        if (clients.openWindow) {
          console.log('📞 [FCM] No existing window, opening new one');
          return clients.openWindow(`/?action=accept_call&callId=${data.callId}`);
        }
      })
    );
  } else if (action === 'decline_call') {
    console.log('📞 [FCM] Decline call clicked for callId:', data.callId);
    // Send message to decline call
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        console.log('📞 [FCM] Found', clientList.length, 'client windows');

        for (const client of clientList) {
          if (client.url.includes(self.location.origin)) {
            console.log('📞 [FCM] Sending DECLINE_CALL message to existing window');
            client.postMessage({
              type: 'DECLINE_CALL',
              data: {
                callId: data.callId,
                callerId: data.callerId
              }
            });
            return;
          }
        }

        // If no window open, make API call to decline (would need backend URL and token)
        console.log('📞 [FCM] No existing window, call will be auto-declined by timeout');
      })
    );
  } else {
    console.log('🔔 [FCM] Default notification click action');
    // Default action - open the app
    const urlToOpen = data.url || data.chatId ? `/chats?chatId=${data.chatId}` : '/';
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin)) {
            console.log('🔔 [FCM] Focusing existing window and sending notification click message');
            client.postMessage({
              type: 'NOTIFICATION_CLICKED',
              data: data
            });
            return client.focus();
          }
        }

        if (clients.openWindow) {
          console.log('🔔 [FCM] Opening new window to:', urlToOpen);
          return clients.openWindow(urlToOpen);
        }
      })
    );
  }
});

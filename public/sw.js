// Service Worker for Push Notifications
const CACHE_NAME = 'findernate-v1';

// Install event
self.addEventListener('install', (event) => {
  //console.log('Service Worker: Installed');
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  //console.log('Service Worker: Activated');
  event.waitUntil(self.clients.claim());
});

// Push event - handle incoming push notifications
self.addEventListener('push', (event) => {
  //console.log('Service Worker: Push event received', event);
  
  let notificationData = {
    title: 'New Message',
    body: 'You have a new message',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    tag: 'message-notification',
    requireInteraction: true,
    data: {
      url: '/chats',
      timestamp: Date.now()
    }
  };

  // Parse push data if available
  if (event.data) {
    try {
      const pushData = event.data.json();
      notificationData = {
        title: pushData.title || notificationData.title,
        body: pushData.body || notificationData.body,
        icon: pushData.icon || notificationData.icon,
        badge: pushData.badge || notificationData.badge,
        tag: pushData.tag || notificationData.tag,
        requireInteraction: pushData.requireInteraction !== undefined ? pushData.requireInteraction : true,
        data: {
          url: pushData.url || notificationData.data.url,
          chatId: pushData.chatId,
          messageId: pushData.messageId,
          senderId: pushData.senderId,
          timestamp: pushData.timestamp || Date.now(),
          ...pushData.data
        }
      };
    } catch (error) {
      //console.error('Error parsing push data:', error);
    }
  }

  const promiseChain = self.registration.showNotification(
    notificationData.title,
    {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      requireInteraction: notificationData.requireInteraction,
      data: notificationData.data,
      actions: [
        {
          action: 'open',
          title: 'Open Message'
        },
        {
          action: 'dismiss',
          title: 'Dismiss'
        }
      ]
    }
  );

  event.waitUntil(promiseChain);
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  //console.log('Service Worker: Notification clicked', event);

  event.notification.close();

  const action = event.action;
  const data = event.notification.data;

  // Handle call-specific actions
  if (action === 'accept_call') {
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          // Send message to app to accept call
          for (const client of clientList) {
            if (client.url.includes(self.location.origin)) {
              client.postMessage({
                type: 'ACCEPT_CALL',
                data: {
                  callId: data.callId,
                  callerId: data.callerId || data.senderId,
                  callerName: data.callerName,
                  callerImage: data.callerImage,
                  chatId: data.chatId,
                  callType: data.callType
                }
              });
              return client.focus();
            }
          }

          // If no window open, open new one with action parameter
          if (self.clients.openWindow) {
            return self.clients.openWindow(`/?action=accept_call&callId=${data.callId}`);
          }
        })
    );
    return;
  }

  if (action === 'decline_call') {
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          // Send message to app to decline call
          for (const client of clientList) {
            if (client.url.includes(self.location.origin)) {
              client.postMessage({
                type: 'DECLINE_CALL',
                data: {
                  callId: data.callId,
                  callerId: data.callerId || data.senderId
                }
              });
              return;
            }
          }
        })
    );
    return;
  }

  if (action === 'dismiss') {
    return;
  }

  // Default action or 'open' action
  const urlToOpen = data.url || '/chats';

  // Add chat ID to URL if available
  const finalUrl = data.chatId ? `${urlToOpen}?chatId=${data.chatId}` : urlToOpen;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window open with our app
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            // Navigate to the message and focus the window
            client.postMessage({
              type: 'NOTIFICATION_CLICKED',
              data: data
            });
            return client.focus();
          }
        }

        // If no window is open, open a new one
        if (self.clients.openWindow) {
          return self.clients.openWindow(finalUrl);
        }
      })
  );
});

// Background sync (for offline message sending)
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-message-sync') {
    event.waitUntil(
      // Handle background sync for messages
      //console.log('Service Worker: Background sync for messages')
    );
  }
});

// Message event (for communication with main thread)
self.addEventListener('message', (event) => {
  //console.log('Service Worker: Message received', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
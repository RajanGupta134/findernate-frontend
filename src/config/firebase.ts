// Firebase Configuration for FCM
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, Messaging, isSupported } from 'firebase/messaging';

// Firebase configuration - these should be in your .env file
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

let app: FirebaseApp;
let messaging: Messaging | null = null;

// Initialize Firebase
export const initializeFirebase = (): FirebaseApp => {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }
  return app;
};

// Get Firebase Messaging instance
export const getFirebaseMessaging = async (): Promise<Messaging | null> => {
  try {
    // Check if messaging is supported in this browser
    const messagingSupported = await isSupported();

    if (!messagingSupported) {
      console.warn('Firebase Messaging is not supported in this browser');
      return null;
    }

    if (!messaging) {
      const app = initializeFirebase();
      messaging = getMessaging(app);
    }

    return messaging;
  } catch (error) {
    console.error('Error initializing Firebase Messaging:', error);
    return null;
  }
};

// Request FCM token
export const requestFCMToken = async (): Promise<string | null> => {
  try {
    // Check if service worker is supported
    if (!('serviceWorker' in navigator)) {
      console.warn('Service Worker not supported in this browser');
      return null;
    }

    const messaging = await getFirebaseMessaging();

    if (!messaging) {
      console.warn('Firebase Messaging not available');
      return null;
    }

    // Check if VAPID key is configured
    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    if (!vapidKey) {
      console.error('NEXT_PUBLIC_FIREBASE_VAPID_KEY is not configured');
      return null;
    }

    // Request permission first
    const permission = await Notification.requestPermission();

    if (permission !== 'granted') {
      console.warn('Notification permission not granted');
      return null;
    }

    // Register service worker first
    let registration: ServiceWorkerRegistration;
    try {
      registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      console.log('Service Worker registered:', registration);

      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;
      console.log('Service Worker is ready');
    } catch (swError) {
      console.error('Service Worker registration failed:', swError);
      return null;
    }

    // Get FCM token with the service worker registration
    const token = await getToken(messaging, {
      vapidKey: vapidKey,
      serviceWorkerRegistration: registration
    });

    console.log('FCM Token obtained:', token);
    return token;
  } catch (error) {
    console.error('Error getting FCM token:', error);
    return null;
  }
};

// Listen for foreground messages
export const onForegroundMessage = (callback: (payload: any) => void) => {
  getFirebaseMessaging().then((messaging) => {
    if (messaging) {
      onMessage(messaging, (payload) => {
        console.log('Foreground message received:', payload);
        callback(payload);
      });
    }
  });
};

// Regenerate FCM token - deletes old token and generates a new one
export const regenerateFCMToken = async (): Promise<string | null> => {
  try {
    console.log('🔄 Starting FCM token regeneration...');

    // Check if browser supports notifications
    if (!('Notification' in window)) {
      console.error('❌ This browser does not support notifications');
      return null;
    }

    // Check if service worker is supported
    if (!('serviceWorker' in navigator)) {
      console.warn('Service Worker not supported in this browser');
      return null;
    }

    // Request notification permission if not granted
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.error('❌ Notification permission denied');
      return null;
    }

    const messaging = await getFirebaseMessaging();
    if (!messaging) {
      console.warn('Firebase Messaging not available');
      return null;
    }

    // Delete old token
    try {
      const { deleteToken } = await import('firebase/messaging');
      await deleteToken(messaging);
      console.log('🗑️ Old FCM token deleted successfully');
    } catch (deleteError: any) {
      console.warn('⚠️ Could not delete old token (may not exist):', deleteError.message);
    }

    // Check if VAPID key is configured
    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    if (!vapidKey) {
      console.error('NEXT_PUBLIC_FIREBASE_VAPID_KEY is not configured');
      return null;
    }

    // Register service worker
    let registration: ServiceWorkerRegistration;
    try {
      registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      console.log('Service Worker registered for token regeneration');
      await navigator.serviceWorker.ready;
    } catch (swError) {
      console.error('Service Worker registration failed:', swError);
      return null;
    }

    // Generate new token
    console.log('🔐 Generating new FCM token...');
    const newToken = await getToken(messaging, {
      vapidKey: vapidKey,
      serviceWorkerRegistration: registration
    });

    console.log('✅ New FCM token generated:', newToken.substring(0, 20) + '...');

    // Save new token to backend
    const authToken = localStorage.getItem('token'); // Your auth token key
    if (!authToken) {
      console.warn('⚠️ User not authenticated, token generated but not saved to backend');
      return newToken;
    }

    console.log('📤 Saving new token to backend...');
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://thedashman.org';
    const response = await fetch(`${baseUrl}/api/v1/users/fcm-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ fcmToken: newToken })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ New FCM token saved to backend successfully!', data);
    } else {
      const errorText = await response.text();
      console.error('❌ Failed to save token to backend:', errorText);
    }

    return newToken;
  } catch (error) {
    console.error('❌ FCM token regeneration failed:', error);
    return null;
  }
};

// Make regenerateFCMToken available globally for easy debugging
if (typeof window !== 'undefined') {
  (window as any).regenerateFCMToken = regenerateFCMToken;
  console.log('💡 Tip: Run window.regenerateFCMToken() in console to regenerate your FCM token');
}

export { app, messaging };

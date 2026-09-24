import { initializeApp, getApps, getApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';

// Clean modular Firebase configuration using Vite environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;

// Prevent duplicate initialization
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

let messagingInstance = null;

export async function getFirebaseMessaging() {
  try {
    const supported = await isSupported();
    if (!supported) {
      console.warn('[Firebase] Firebase Messaging is not supported in this browser environment.');
      return null;
    }
    if (!messagingInstance) {
      messagingInstance = getMessaging(app);
    }
    return messagingInstance;
  } catch (err) {
    console.error('[Firebase] Failed to get Messaging instance:', err);
    return null;
  }
}

/**
 * Request notification permission, register service worker, and obtain FCM Token
 */
export async function requestNotificationPermissionAndToken() {
  // 1. Check Browser Support
  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    return {
      success: false,
      error: 'UNSUPPORTED_BROWSER',
      message: 'Push Notifications & Service Workers are not supported in this browser.',
    };
  }

  // 2. Check Existing Permission State
  if (Notification.permission === 'denied') {
    return {
      success: false,
      error: 'PERMISSION_DENIED',
      message: 'Notification permission is blocked by your browser settings. Please allow notifications in site settings.',
    };
  }

  try {
    // 3. Request Permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return {
        success: false,
        error: 'PERMISSION_NOT_GRANTED',
        message: 'Notification permission was not granted by the user.',
      };
    }

    // 4. Initialize Messaging
    const messaging = await getFirebaseMessaging();
    if (!messaging) {
      return {
        success: false,
        error: 'FIREBASE_INIT_FAILED',
        message: 'Firebase Messaging service initialization failed or is unsupported.',
      };
    }

    // 5. Register Service Worker explicitly
    let swRegistration;
    try {
      swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      await navigator.serviceWorker.ready;
    } catch (swErr) {
      return {
        success: false,
        error: 'SERVICE_WORKER_REGISTRATION_FAILED',
        message: `Service worker registration failed: ${swErr.message}`,
      };
    }

    // 6. Obtain FCM Registration Token
    const currentToken = await getToken(messaging, {
      vapidKey: vapidKey,
      serviceWorkerRegistration: swRegistration,
    });

    if (!currentToken) {
      return {
        success: false,
        error: 'INVALID_OR_EXPIRED_REGISTRATION',
        message: 'Failed to retrieve FCM registration token from Firebase Console.',
      };
    }

    return {
      success: true,
      token: currentToken,
      permission: 'granted',
    };
  } catch (err) {
    console.error('[Firebase] Notification registration error:', err);
    return {
      success: false,
      error: 'REGISTRATION_ERROR',
      message: err.message || 'An unexpected error occurred during Firebase notification setup.',
    };
  }
}

/**
 * Listen for foreground push notifications when app tab is open
 */
export async function listenToForegroundMessages(callback) {
  const messaging = await getFirebaseMessaging();
  if (!messaging) return () => {};

  return onMessage(messaging, (payload) => {
    console.log('[Firebase] Foreground notification received:', payload);
    callback(payload);
  });
}

export { app };

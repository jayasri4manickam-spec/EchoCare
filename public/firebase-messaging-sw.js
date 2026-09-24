// Firebase Cloud Messaging Service Worker for EchoCare
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// Initialize Firebase App in Service Worker
const firebaseConfig = {
  apiKey: "AIzaSyBIrFupQt2xR91VH_DU9R90-NNxS0KLAcg",
  authDomain: "echocare-8c29e.firebaseapp.com",
  projectId: "echocare-8c29e",
  storageBucket: "echocare-8c29e.firebasestorage.app",
  messagingSenderId: "928327785836",
  appId: "1:928327785836:web:0b788e7d59531783e32749"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const messaging = firebase.messaging();

// Handle background push notifications when app tab is closed or inactive
messaging.onBackgroundMessage((payload) => {
  console.log('[EchoCare SW] Background push notification received:', payload);

  const notificationTitle = payload.notification?.title || payload.data?.title || 'EchoCare Caregiver Alert';
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || 'New notification from EchoCare',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: payload.data?.tag || 'echocare-notification',
    data: payload.data || {},
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

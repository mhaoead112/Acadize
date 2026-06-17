// Service Worker for PWA - Acadize
// Handles offline support, caching, and push notifications

const CACHE_NAME = 'acadize-v1';
const RUNTIME_CACHE = 'acadize-runtime-v1';
const ASSET_CACHE = 'acadize-assets-v1';

// Assets to cache on install
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/acadize-logo-icon.png',
  '/acadize-logo-icon-dark.png',
  '/acadize-logo-full.png',
  '/acadize-logo-full-dark.png',
  '/acadize-logo-wordmark.png'
];

// Install event - cache essential assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching core assets');
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn('[Service Worker] Failed to cache some assets:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => 
            cacheName !== CACHE_NAME && 
            cacheName !== RUNTIME_CACHE && 
            cacheName !== ASSET_CACHE
          )
          .map((cacheName) => {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          })
      );
    })
  );
  event.waitUntil(clients.claim());
});

// Push notification event
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push received:', event);

  let data = {
    title: 'EduVerse Notification',
    body: 'You have a new notification',
    icon: '/logo.png',
    badge: '/badge.png',
    tag: 'eduverse-notification',
    data: {}
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      data = {
        title: payload.title || data.title,
        body: payload.body || data.body,
        icon: payload.icon || data.icon,
        badge: payload.badge || data.badge,
        tag: payload.tag || data.tag,
        data: payload.data || {}
      };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    tag: data.tag,
    vibrate: [100, 50, 100],
    data: data.data,
    actions: getActionsForType(data.data.type),
    requireInteraction: shouldRequireInteraction(data.data.type)
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked:', event);
  event.notification.close();

  const data = event.notification.data || {};
  let url = '/';

  // Determine URL based on notification type
  switch (data.type) {
    case 'message':
      url = data.conversationId ? `/messages/${data.conversationId}` : '/messages';
      break;
    case 'assignment':
      url = data.assignmentId ? `/assignments/${data.assignmentId}` : '/student/assignments';
      break;
    case 'grade':
      url = data.courseId ? `/student/grades` : '/student/grades';
      break;
    case 'announcement':
      url = data.courseId ? `/courses/${data.courseId}` : '/student/courses';
      break;
    case 'enrollment':
      url = '/student/courses';
      break;
    case 'event':
      url = '/student/calendar';
      break;
    case 'study_group':
      url = data.groupId ? `/study-groups/${data.groupId}` : '/study-groups';
      break;
    default:
      url = '/student';
  }

  // Handle action clicks
  if (event.action) {
    switch (event.action) {
      case 'view':
        // Use the default URL
        break;
      case 'dismiss':
        return; // Just close the notification
      case 'reply':
        url = data.conversationId ? `/messages/${data.conversationId}?reply=true` : '/messages';
        break;
    }
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already an open window
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      // Open a new window if none exists
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// Notification close event
self.addEventListener('notificationclose', (event) => {
  console.log('[Service Worker] Notification closed:', event);
});

// Helper function to get actions based on notification type
function getActionsForType(type) {
  switch (type) {
    case 'message':
      return [
        { action: 'reply', title: '💬 Reply', icon: '/icons/reply.png' },
        { action: 'view', title: '👁️ View', icon: '/icons/view.png' }
      ];
    case 'assignment':
      return [
        { action: 'view', title: '📝 View Assignment', icon: '/icons/view.png' },
        { action: 'dismiss', title: '❌ Dismiss', icon: '/icons/dismiss.png' }
      ];
    case 'grade':
      return [
        { action: 'view', title: '📊 View Grade', icon: '/icons/view.png' }
      ];
    default:
      return [
        { action: 'view', title: '👁️ View', icon: '/icons/view.png' },
        { action: 'dismiss', title: '❌ Dismiss', icon: '/icons/dismiss.png' }
      ];
  }
}

// Helper function to determine if notification should require interaction
function shouldRequireInteraction(type) {
  return ['assignment', 'grade', 'message'].includes(type);
}

// Background sync for offline notifications
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-notifications') {
    console.log('[Service Worker] Syncing notifications...');
  }
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== self.location.origin) {
    return;
  }

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Strategy for HTML pages: network first, fallback to cache
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cachedResponse) => {
            return cachedResponse || caches.match('/index.html');
          });
        })
    );
    return;
  }

  // Strategy for assets (JS, CSS, images): cache first, network fallback
  if (
    request.url.includes('.js') ||
    request.url.includes('.css') ||
    request.url.includes('/images/') ||
    request.url.match(/\.(png|jpg|jpeg|gif|svg|webp)$/)
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((response) => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(ASSET_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        });
      })
    );
    return;
  }

  // Default strategy: network first, fallback to cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(request).catch(() => {
          // Return a generic offline page or response if needed
          return new Response('Offline', { status: 503 });
        });
      })
  );
});

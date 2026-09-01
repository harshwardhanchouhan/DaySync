/**
 * DaySync Notification Service Worker
 *
 * Handles PWA push/persistent notifications for "next class" updates.
 * This worker is registered by the app and receives messages via postMessage.
 *
 * Architecture:
 *   App (main thread) → postMessage({ type: 'NEXT_CLASS', payload }) → SW
 *   SW → self.registration.showNotification(...)
 *
 * The notification is updated every minute by the main app thread.
 * When the browser/PWA is in the background, the SW keeps the notification alive.
 */

const NOTIF_TAG = 'daysync-next-class';

self.addEventListener('install', (event) => {
  // Take control immediately without waiting for old SW to go away
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

/**
 * Handle messages from the main app thread.
 *
 * Expected message shapes:
 *   { type: 'SHOW_NEXT_CLASS', subject: string, room: string, minutesUntil: number }
 *   { type: 'CLEAR_NOTIFICATION' }
 */
self.addEventListener('message', async (event) => {
  const { data } = event;

  if (data?.type === 'SHOW_NEXT_CLASS') {
    const { subject, room, minutesUntil } = data;
    const timeLabel =
      minutesUntil <= 0
        ? 'Starting now'
        : minutesUntil === 1
        ? 'Starts in 1 min'
        : `Starts in ${Math.round(minutesUntil)} min`;

    await self.registration.showNotification('DaySync', {
      tag: NOTIF_TAG,          // replace previous notification, not stack
      renotify: false,
      body: `Next: ${subject} · ${room} · ${timeLabel}`,
      icon: '/icon-192.png',
      badge: '/badge-72.png',
      silent: true,            // no sound — purely informational
      requireInteraction: false,
      data: { subject, room, minutesUntil },
    });
  }

  if (data?.type === 'CLEAR_NOTIFICATION') {
    const notifications = await self.registration.getNotifications({ tag: NOTIF_TAG });
    notifications.forEach((n) => n.close());
  }
});

/**
 * Handle notification click — bring the app into focus.
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Focus existing window if one is open
        for (const client of clientList) {
          if (client.url && 'focus' in client) {
            return client.focus();
          }
        }
        // Otherwise open a new window
        if (self.clients.openWindow) {
          return self.clients.openWindow('/');
        }
      })
  );
});

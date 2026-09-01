/**
 * DaySync Notification Manager
 *
 * Handles the full lifecycle of the PWA persistent notification:
 *  1. Registers the service worker
 *  2. Requests Notification permission from the user
 *  3. Sends update messages to the SW every minute
 *  4. Falls back gracefully when SW or Notifications are unavailable
 *
 * This module is intentionally isolated so it can be swapped out for
 * a native push notification backend (e.g., Web Push / Supabase) later.
 */

export type NotificationStatus =
  | 'unsupported'    // Browser doesn't support Notifications or SW
  | 'denied'         // User explicitly denied permission
  | 'pending'        // Waiting for user permission
  | 'granted'        // SW registered and permission granted
  | 'error';         // Registration failed

let swRegistration: ServiceWorkerRegistration | null = null;

/** Initialize the service worker and request notification permission */
export async function initNotifications(): Promise<NotificationStatus> {
  if (!('serviceWorker' in navigator) || !('Notification' in window)) {
    return 'unsupported';
  }

  const permission = await Notification.requestPermission();
  if (permission === 'denied') return 'denied';
  if (permission === 'default') return 'pending';

  try {
    swRegistration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      updateViaCache: 'none',
    });
    return 'granted';
  } catch (err) {
    console.error('[DaySync SW] Registration failed:', err);
    return 'error';
  }
}

/** Send next-class info to the service worker to show/update the notification */
export function showNextClassNotification(
  subject: string,
  room: string,
  minutesUntil: number,
): void {
  if (!swRegistration?.active) {
    // Fallback: show a native Notification directly if SW isn't ready
    if (Notification.permission === 'granted') {
      const timeLabel =
        minutesUntil <= 0
          ? 'Starting now'
          : minutesUntil === 1
          ? 'Starts in 1 min'
          : `Starts in ${Math.round(minutesUntil)} min`;
      new Notification('DaySync', {
        tag: 'daysync-next-class',
        body: `Next: ${subject} · ${room} · ${timeLabel}`,
        icon: '/icon-192.png',
        silent: true,
      });
    }
    return;
  }

  swRegistration.active.postMessage({
    type: 'SHOW_NEXT_CLASS',
    subject,
    room,
    minutesUntil,
  });
}

/** Clear the persistent notification (e.g., when no next class exists) */
export function clearNextClassNotification(): void {
  if (swRegistration?.active) {
    swRegistration.active.postMessage({ type: 'CLEAR_NOTIFICATION' });
  }
}

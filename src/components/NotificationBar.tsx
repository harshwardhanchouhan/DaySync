import React from 'react';
import type { ScheduledEntry } from '../types';
import { formatCountdown } from './TimeUtils';

interface NotificationBarProps {
  nextEntry: ScheduledEntry | null;
  /** True when in-app bar should be visible (fallback when OS notif not available) */
  visible: boolean;
  /** Whether OS/PWA notifications are active */
  hasOsNotification: boolean;
  /** Request notification permission */
  onRequestPermission: () => void;
}

export const NotificationBar: React.FC<NotificationBarProps> = ({
  nextEntry,
  visible,
  hasOsNotification,
  onRequestPermission,
}) => {
  const show = visible && nextEntry !== null && nextEntry.subject != null;

  if (!show) {
    return null;
  }

  return (
    <>
      {/* ── In-app notification pill (visual fallback / always-present in-app aid) */}
      <div
        className="notif-bar"
        aria-live="polite"
        aria-label="Next class notification"
      >
        <div className={`notif-pill ${show ? '' : 'notif-hidden'}`}>
          {/* Pulsing dot indicator */}
          <div className="notif-dot" aria-hidden="true" />

          {/* Content */}
          {nextEntry && nextEntry.subject && (
            <div className="flex-1 min-w-0 pr-2">
              <div className="flex items-center gap-1.5">
                <span
                  className="font-pixel text-[0.48rem] uppercase tracking-wider"
                  style={{ color: 'var(--color-brown-300)' }}
                >
                  NEXT
                </span>
              </div>
              <p className="font-medium text-xs text-stone-100 truncate mt-0.5">
                {nextEntry.subject}
                {nextEntry.room && (
                  <span className="text-stone-400 font-normal"> · {nextEntry.room}</span>
                )}
              </p>
            </div>
          )}

          {nextEntry?.minutesUntilStart != null && (
            <div className="text-right flex-shrink-0">
              <span
                className="font-pixel inline-block text-[0.52rem] tracking-wide"
                style={{ color: 'var(--color-brown-300)' }}
              >
                {formatCountdown(nextEntry.minutesUntilStart)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── OS Notification permission prompt ─────────────────────────────────
          Shown subtly when OS notifications aren't yet granted.
          Only shown when there IS a next class to notify about.
      ───────────────────────────────────────────────────────────────────────── */}
      {!hasOsNotification && show && (
        <div
          className="fixed top-4 left-1/2 -translate-x-1/2 z-40"
          style={{ maxWidth: '320px', width: 'calc(100% - 2rem)' }}
        >
          <button
            onClick={onRequestPermission}
            className="w-full text-left px-4 py-3 rounded-2xl text-sm flex items-center gap-3"
            style={{
              background: 'var(--color-cream-dark)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-brown-700)',
              boxShadow: '0 2px 12px rgba(44,33,26,0.1)',
            }}
            aria-label="Enable persistent notifications for class reminders"
          >
            <span style={{ fontSize: '1rem' }}>🔔</span>
            <div className="flex-1">
              <p className="font-medium text-xs" style={{ color: 'var(--color-brown-900)' }}>
                Stay notified
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-brown-500)' }}>
                Get next-class alerts even when the app is closed
              </p>
            </div>
            <span style={{ color: 'var(--color-brown-300)', fontSize: '0.75rem' }}>→</span>
          </button>
        </div>
      )}
    </>
  );
};

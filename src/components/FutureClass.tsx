import React from 'react';
import type { ScheduledEntry } from '../types';
import { TimeRange } from './TimeUtils';

interface FutureClassProps {
  entry: ScheduledEntry;
  /** True if this is a past class (show even more subdued) */
  isPast?: boolean;
}

export const FutureClass: React.FC<FutureClassProps> = ({ entry, isPast = false }) => {
  return (
    <div className={`card ${isPast ? 'card-past' : ''}`}>
      {isPast && (
        <div className="mb-2">
          <span className="label-chip chip-past">DONE</span>
        </div>
      )}

      <h2
        className="font-bold leading-snug mb-1.5"
        style={{
          fontSize: 'clamp(1.1rem, 4vw, 1.38rem)',
          color: isPast ? 'var(--color-brown-600)' : 'var(--color-brown-950)',
          letterSpacing: '-0.01em',
        }}
      >
        {entry.subject}
      </h2>

      <div className="mb-3">
        <TimeRange startTime={entry.startTime} endTime={entry.endTime} />
      </div>

      <div className="flex items-center gap-3.5 flex-wrap pt-1 border-t border-stone-800/5">
        {entry.room && (
          <span
            className="text-sm font-semibold flex items-center gap-1.5"
            style={{
              color: isPast ? 'var(--color-brown-500)' : 'var(--color-brown-800)',
            }}
          >
            <span style={{ fontSize: '0.85rem', opacity: isPast ? 0.6 : 1 }}>📍</span>
            {entry.room}
          </span>
        )}
        {entry.teacher && (
          <span
            className="text-sm font-medium flex items-center gap-1.5"
            style={{ color: isPast ? 'var(--color-brown-400)' : 'var(--color-brown-600)' }}
          >
            <span style={{ fontSize: '0.85rem', opacity: isPast ? 0.6 : 1 }}>👨‍🏫</span>
            {entry.teacher}
          </span>
        )}
      </div>
    </div>
  );
};

import React from 'react';
import type { ScheduledEntry } from '../types';
import { TimeRange } from './TimeUtils';

interface CurrentClassProps {
  entry: ScheduledEntry;
}

export const CurrentClass: React.FC<CurrentClassProps> = ({ entry }) => {
  const progressPercent = entry.durationMinutes > 0
    ? Math.min(100, Math.max(0, ((entry.elapsedMinutes ?? 0) / entry.durationMinutes) * 100))
    : 0;

  const minutesLeft = Math.max(0, entry.durationMinutes - (entry.elapsedMinutes ?? 0));
  const minutesLeftDisplay = Math.ceil(minutesLeft);

  return (
    <div className="card card-current">
      {/* Header: NOW Chip + Remaining Time */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <span className="label-chip chip-now">NOW</span>
        <span
          className="font-pixel text-[0.6rem] tracking-wider"
          style={{ color: 'var(--color-active)', fontWeight: 600 }}
        >
          {minutesLeftDisplay > 0
            ? `${minutesLeftDisplay} min left`
            : 'Ending now'}
        </span>
      </div>

      {/* Subject */}
      <h2
        className="font-bold leading-snug mb-2"
        style={{
          fontSize: 'clamp(1.25rem, 5vw, 1.6rem)',
          color: 'var(--color-brown-950)',
          letterSpacing: '-0.02em',
        }}
      >
        {entry.subject}
      </h2>

      {/* Time Range */}
      <div className="mb-4">
        <TimeRange startTime={entry.startTime} endTime={entry.endTime} />
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="progress-track" aria-label={`Class progress: ${Math.round(progressPercent)}%`}>
          <div
            className="progress-fill"
            style={{ width: `${progressPercent}%` }}
            role="progressbar"
            aria-valuenow={Math.round(progressPercent)}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
        <div className="flex justify-between items-center mt-1.5 font-pixel text-[0.5rem]" style={{ color: 'var(--color-brown-500)' }}>
          <span>{entry.startTime}</span>
          <span>{entry.endTime}</span>
        </div>
      </div>

      {/* Meta Row: Room & Faculty */}
      <div className="flex items-center gap-3.5 flex-wrap pt-1 border-t border-emerald-900/10">
        {entry.room && (
          <span
            className="text-sm font-semibold flex items-center gap-1.5"
            style={{ color: 'var(--color-active)' }}
          >
            <span style={{ fontSize: '0.85rem' }}>📍</span>
            {entry.room}
          </span>
        )}
        {entry.teacher && (
          <span
            className="text-sm font-medium flex items-center gap-1.5"
            style={{ color: 'var(--color-brown-700)' }}
          >
            <span style={{ fontSize: '0.85rem' }}>👨‍🏫</span>
            {entry.teacher}
          </span>
        )}
      </div>
    </div>
  );
};

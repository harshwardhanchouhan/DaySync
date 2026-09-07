import React from 'react';
import type { ScheduledEntry, StudentAuthUser } from '../types';
import { TimeRange, formatCountdown } from './TimeUtils';
import { ClassComments } from './ClassComments';
import { getOccurrenceId, getClassOccurrenceExpiration } from '../utils/classOccurrence';

interface NextClassProps {
  entry: ScheduledEntry;
  occurrenceId?: string;
  expiresAt?: Date;
  currentUser?: StudentAuthUser | null;
  currentUserId?: string;
}

export const NextClass: React.FC<NextClassProps> = ({
  entry,
  occurrenceId,
  expiresAt,
  currentUser,
  currentUserId,
}) => {
  const minutesUntil = entry.minutesUntilStart ?? 0;

  const resolvedOccurrenceId =
    occurrenceId || getOccurrenceId(new Date(), 'B', entry);
  const resolvedExpiresAt =
    expiresAt || getClassOccurrenceExpiration(new Date(), entry.endTime);

  return (
    <div className="card card-next">
      {/* Header: Label + Highlighted Countdown */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <span className="label-chip chip-next">UP NEXT</span>
        <span
          className="font-pixel text-[0.62rem] countdown-tick"
          style={{
            color: 'var(--color-next)',
            fontWeight: 600,
          }}
        >
          Starts in {formatCountdown(minutesUntil)}
        </span>
      </div>

      {/* Subject */}
      <h2
        className="font-bold leading-snug mb-2"
        style={{
          fontSize: 'clamp(1.2rem, 4.8vw, 1.55rem)',
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

      {/* Meta Row: Room & Faculty */}
      <div className="flex items-center gap-3.5 flex-wrap pt-1 border-t border-stone-900/10">
        {entry.room && (
          <span
            className="text-sm font-semibold flex items-center gap-1.5"
            style={{ color: 'var(--color-next)' }}
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

      {/* Temporary Class Updates & Comments */}
      <ClassComments
        occurrenceId={resolvedOccurrenceId}
        expiresAt={resolvedExpiresAt}
        isPast={false}
        currentUser={currentUser}
        currentUserId={currentUserId}
      />
    </div>
  );
};

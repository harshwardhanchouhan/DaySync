import React from 'react';
import type { ScheduledEntry } from '../types';
import { TimeRange } from './TimeUtils';

interface LunchBlockProps {
  entry: ScheduledEntry;
}

export const LunchBlock: React.FC<LunchBlockProps> = ({ entry }) => {
  return (
    <div className="card card-lunch">
      {/* Header Chip */}
      <div className="flex items-center justify-between mb-2.5">
        <span className="label-chip chip-lunch">LUNCH</span>
        <span className="text-xs font-medium" style={{ color: 'var(--color-lunch)' }}>
          Break
        </span>
      </div>

      {/* Title */}
      <h2
        className="font-bold leading-snug mb-2"
        style={{
          fontSize: 'clamp(1.15rem, 4vw, 1.4rem)',
          color: 'var(--color-brown-950)',
          letterSpacing: '-0.01em',
        }}
      >
        Lunch Break
      </h2>

      <TimeRange startTime={entry.startTime} endTime={entry.endTime} />
    </div>
  );
};

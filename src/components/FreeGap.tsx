import React from 'react';
import type { ScheduledEntry } from '../types';
import { formatDuration } from './TimeUtils';

interface FreeGapProps {
  entry: ScheduledEntry;
}

export const FreeGap: React.FC<FreeGapProps> = ({ entry }) => {
  const duration = formatDuration(entry.durationMinutes);
  const minutes = entry.durationMinutes;

  // Cap dynamic padding so long gaps feel spacious without endless scrolling
  const gapPadding = minutes <= 30 ? 'py-4' : minutes <= 60 ? 'py-6' : 'py-8';

  return (
    <div className={`free-gap ${gapPadding}`}>
      {/* Top spine dots */}
      <div className="free-gap-dots" aria-hidden="true">
        <div className="free-gap-dot" />
        <div className="free-gap-dot" />
      </div>

      {/* Free Breathing Space Indicator */}
      <div
        className="px-3.5 py-1.5 rounded-full border border-dashed text-center inline-flex items-center gap-2"
        style={{
          borderColor: 'var(--color-brown-100, #C9C8C3)',
          background: 'rgba(102, 102, 98, 0.04)',
        }}
      >
        <span className="font-pixel text-[0.58rem] tracking-wider" style={{ color: 'var(--color-free)', fontWeight: 600 }}>
          {duration.toUpperCase()} FREE
        </span>
      </div>

      {/* Bottom spine dots */}
      <div className="free-gap-dots" aria-hidden="true">
        <div className="free-gap-dot" />
        <div className="free-gap-dot" />
      </div>
    </div>
  );
};

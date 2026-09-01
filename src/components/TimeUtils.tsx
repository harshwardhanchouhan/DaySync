import React from 'react';

/** Format "HH:MM" 24-hour → "H:MM AM/PM" */
export function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

/** Format a duration in minutes as "X hr Y min" or "X min" */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}

/** Format countdown minutes */
export function formatCountdown(minutes: number): string {
  if (minutes <= 0) return 'Starting now';
  if (minutes < 1)  return 'Less than a minute';
  const rounded = Math.ceil(minutes);
  return rounded === 1 ? '1 min' : `${rounded} min`;
}

interface TimeRangeProps {
  startTime: string;
  endTime: string;
  className?: string;
}

export const TimeRange: React.FC<TimeRangeProps> = ({ startTime, endTime, className = '' }) => (
  <p
    className={`font-pixel ${className}`}
    style={{
      fontSize: '0.62rem',
      letterSpacing: '0.08em',
      color: 'var(--color-brown-700)',
      fontWeight: 500,
    }}
  >
    {formatTime(startTime)} — {formatTime(endTime)}
  </p>
);

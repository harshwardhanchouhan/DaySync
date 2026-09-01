import React from 'react';

interface DayEndStateProps {
  variant: 'no-classes' | 'day-over' | 'free-gap-end';
  nextSubject?: string;
  minutesUntil?: number;
}

export const DayEndState: React.FC<DayEndStateProps> = ({
  variant,
  nextSubject,
  minutesUntil,
}) => {
  if (variant === 'no-classes') {
    return (
      <div className="empty-state">
        <p
          className="font-pixel mb-4"
          style={{ fontSize: '0.65rem', letterSpacing: '0.1em', color: 'var(--color-brown-300)' }}
        >
          ・ ・ ・
        </p>
        <p
          className="font-pixel mb-3"
          style={{ fontSize: '0.65rem', color: 'var(--color-brown-500)' }}
        >
          No classes today.
        </p>
        <p className="text-sm" style={{ color: 'var(--color-brown-300)' }}>
          Enjoy your day off.
        </p>
      </div>
    );
  }

  if (variant === 'day-over') {
    return (
      <div className="empty-state">
        <p
          className="font-pixel mb-2"
          style={{ fontSize: '0.65rem', letterSpacing: '0.1em', color: 'var(--color-brown-300)' }}
        >
          ·  ·  ·
        </p>
        <p
          className="font-pixel mb-1.5"
          style={{ fontSize: '0.65rem', color: 'var(--color-brown-500)' }}
        >
          That's a wrap.
        </p>
        <p className="text-sm" style={{ color: 'var(--color-brown-300)' }}>
          No more classes today.
        </p>
      </div>
    );
  }

  if (variant === 'free-gap-end' && nextSubject) {
    const rounded = minutesUntil != null ? Math.ceil(minutesUntil) : 0;
    return (
      <div className="empty-state">
        <p
          className="font-pixel mb-3"
          style={{ fontSize: '0.65rem', color: 'var(--color-free)' }}
        >
          You're free.
        </p>
        <p className="text-sm" style={{ color: 'var(--color-brown-500)' }}>
          {rounded > 0
            ? `${rounded} min until ${nextSubject}`
            : `${nextSubject} is starting now`}
        </p>
      </div>
    );
  }

  return null;
};

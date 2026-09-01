import React from 'react';

interface DayHeaderProps {
  now: Date;
  studentName?: string;
}

const GREETINGS = {
  morning:   'Good morning',
  afternoon: 'Good afternoon',
  evening:   'Good evening',
};

const DAYS = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday',
  'Thursday', 'Friday', 'Saturday',
];

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function getGreeting(hour: number): string {
  if (hour < 12) return GREETINGS.morning;
  if (hour < 17) return GREETINGS.afternoon;
  return GREETINGS.evening;
}

export const DayHeader: React.FC<DayHeaderProps> = ({
  now,
  studentName = 'Student',
}) => {
  const hour     = now.getHours();
  const day      = DAYS[now.getDay()];
  const month    = MONTHS[now.getMonth()];
  const date     = now.getDate();
  const greeting = getGreeting(hour);

  return (
    <header className="px-6 pt-12 pb-8 max-w-lg mx-auto header-entrance">
      {/* Personalized Greeting */}
      <p
        className="font-pixel text-[0.68rem] tracking-wide mb-4 animate-fade-in-1"
        style={{ color: 'var(--color-brown-700)', fontWeight: 600 }}
      >
        {greeting}, {studentName} 👋
      </p>

      {/* Large Day + Date */}
      <div className="mb-4">
        <h1
          className="font-pixel leading-none tracking-tight animate-fade-in-2"
          style={{
            fontSize: 'clamp(1.75rem, 8vw, 2.5rem)',
            color: 'var(--color-brown-950)',
            letterSpacing: '-0.02em',
          }}
        >
          {day}
        </h1>
        <p
          className="font-pixel mt-3 animate-fade-in-3"
          style={{
            fontSize: 'clamp(0.65rem, 3vw, 0.85rem)',
            color: 'var(--color-brown-600)',
            letterSpacing: '0.12em',
          }}
        >
          {month} {date}
        </p>
      </div>

      {/* Supporting Text */}
      <p
        className="mt-5 text-sm animate-fade-in-4"
        style={{ color: 'var(--color-brown-500)', fontWeight: 500 }}
      >
        Here's your day.
      </p>

      {/* Editorial Marker / Divider */}
      <div
        className="mt-6 h-0.5 w-12 rounded-full animate-fade-in-4"
        style={{ background: 'var(--color-brown-100)' }}
      />
    </header>
  );
};

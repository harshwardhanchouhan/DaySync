import React from 'react';
import { ScrollHighlight } from './originkit/ui/scroll-text-highlight';

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
      <ScrollHighlight
        as="p"
        className="font-pixel text-[0.68rem] tracking-wide mb-4 animate-fade-in-1"
        style={{ fontWeight: 600 }}
        text={`${greeting}, ${studentName} 👋`}
        initialColor="#353534"
        targetColor="#A4A49F"
        splitBy="words"
        scrollStart="top top+=45"
        scrollEnd="+=120"
        scrub={true}
      />

      {/* Large Day + Date */}
      <div className="mb-4">
        <ScrollHighlight
          as="h1"
          className="font-pixel leading-none tracking-tight animate-fade-in-2"
          style={{
            fontSize: 'clamp(1.75rem, 8vw, 2.5rem)',
            letterSpacing: '-0.02em',
          }}
          text={day}
          initialColor="#111111"
          targetColor="#A4A49F"
          splitBy="characters"
          scrollStart="top top+=75"
          scrollEnd="+=140"
          scrub={true}
        />
        <ScrollHighlight
          as="p"
          className="font-pixel mt-3 animate-fade-in-3"
          style={{
            fontSize: 'clamp(0.65rem, 3vw, 0.85rem)',
            letterSpacing: '0.12em',
          }}
          text={`${month} ${date}`}
          initialColor="#353534"
          targetColor="#A4A49F"
          splitBy="characters"
          scrollStart="top top+=115"
          scrollEnd="+=130"
          scrub={true}
        />
      </div>

      {/* Supporting Text */}
      <ScrollHighlight
        as="p"
        className="mt-5 text-sm animate-fade-in-4"
        style={{ fontWeight: 500 }}
        text="Here's your day."
        initialColor="#353534"
        targetColor="#A4A49F"
        splitBy="words"
        scrollStart="top top+=155"
        scrollEnd="+=130"
        scrub={true}
      />

      {/* Editorial Marker / Divider */}
      <div
        className="mt-6 h-0.5 w-12 rounded-full animate-fade-in-4"
        style={{ background: 'var(--color-brown-100)' }}
      />
    </header>
  );
};

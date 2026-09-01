import { useState, useEffect } from 'react';

/**
 * Returns a live Date object updated every second.
 * The component re-renders once per second — efficient for countdown timers
 * and real-time class progress tracking.
 */
export function useCurrentTime(): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return now;
}

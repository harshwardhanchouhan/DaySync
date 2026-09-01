import { useState, useEffect, useMemo } from 'react';
import type { StudentProfile, TimetableEntry, ScheduledEntry, DayState } from '../types';
import { getStudentDaySchedule } from '../backend/timetable/supabase';
import { getTodaySchedule } from '../data/timetable';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Parse "HH:MM" into minutes since midnight */
function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/** Minutes since midnight for a given Date */
function nowMinutes(date: Date): number {
  return date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Derives the complete day state from the student profile and current time,
 * using live real SST timetable data from the Google Sheet / backend pipeline.
 */
export function useTimetable(profile: StudentProfile, now: Date): DayState {
  const dayOfWeek = now.getDay(); // 0=Sun … 6=Sat
  const [rawEntries, setRawEntries] = useState<TimetableEntry[]>(() =>
    getTodaySchedule(profile, dayOfWeek)
  );

  // Fetch / update live entries when profile or day changes
  useEffect(() => {
    let active = true;
    getStudentDaySchedule(profile, dayOfWeek)
      .then((entries) => {
        if (active) {
          setRawEntries(entries);
        }
      })
      .catch((err) => {
        console.error('[DaySync Hook] Failed to load schedule:', err);
      });
    return () => {
      active = false;
    };
  }, [profile.group, profile.program, profile.year, dayOfWeek]);

  return useMemo(() => {
    const currentMinutes = nowMinutes(now);

    // ── Classify each entry ──────────────────────────────────────────────────
    const entries: ScheduledEntry[] = rawEntries.map((entry) => {
      const start = toMinutes(entry.startTime);
      const end = toMinutes(entry.endTime);
      const duration = end - start;
      const minutesUntilStart = start - currentMinutes;

      let status: ScheduledEntry['status'];
      let elapsedMinutes: number | undefined;

      if (currentMinutes >= end) {
        status = 'past';
      } else if (currentMinutes >= start && currentMinutes < end) {
        status = 'current';
        elapsedMinutes = currentMinutes - start;
      } else {
        status = 'future';
      }

      return {
        ...entry,
        status,
        durationMinutes: duration,
        elapsedMinutes,
        minutesUntilStart: minutesUntilStart > 0 ? minutesUntilStart : undefined,
      };
    });

    // ── Mark the first future entry as 'next' ────────────────────────────────
    const firstFutureIndex = entries.findIndex((e) => e.status === 'future');
    if (firstFutureIndex !== -1) {
      entries[firstFutureIndex] = { ...entries[firstFutureIndex], status: 'next' };
    }

    // ── Derived values ───────────────────────────────────────────────────────
    const currentEntry = entries.find((e) => e.status === 'current') ?? null;
    const nextEntry    = entries.find((e) => e.status === 'next') ?? null;

    // Only count non-free/lunch entries for "has classes"
    const classEntries = rawEntries.filter((e) => e.type === 'class');
    const hasNoClasses = classEntries.length === 0;

    const allClassesDone =
      !hasNoClasses && classEntries.every((e) => toMinutes(e.endTime) <= currentMinutes);

    const isDayOver = allClassesDone || (hasNoClasses && dayOfWeek !== 0 && dayOfWeek !== 6);

    const isInFreeGap =
      currentEntry !== null && (currentEntry.type === 'free' || currentEntry.type === 'lunch');

    return { entries, currentEntry, nextEntry, isDayOver, hasNoClasses, isInFreeGap };
  }, [rawEntries, now, dayOfWeek]);
}

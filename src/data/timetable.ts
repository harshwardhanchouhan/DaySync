import type { StudentProfile, TimetableEntry } from '../types';
import { parseSheetHtmlToRecords, buildTimelineEntriesWithGaps } from '../backend/timetable/parser';
import { fetchNormalizedTimetable } from '../backend/timetable/supabase';

// Seed initial cache from pre-parsed live sheet to guarantee instant synchronous first render
let syncCache: Map<string, TimetableEntry[]> = new Map();

/**
 * Key format: "group|dayOfWeek"
 */
function getCacheKey(group: string, dayOfWeek: number): string {
  return `${group.toUpperCase()}|${dayOfWeek}`;
}

export function populateSyncCache(records: ReturnType<typeof parseSheetHtmlToRecords>) {
  const map = new Map<string, TimetableEntry[]>();
  const groups = ['A', 'B', 'C', 'D'];

  for (const grp of groups) {
    for (let day = 1; day <= 5; day++) {
      const filtered = records.filter((r) => r.group === grp && r.dayOfWeek === day);
      map.set(getCacheKey(grp, day), buildTimelineEntriesWithGaps(filtered));
    }
  }
  syncCache = map;
}

/**
 * Returns today's timetable entries for the given student profile from real SST data.
 */
export function getTodaySchedule(
  profile: StudentProfile,
  dayOfWeek: number,
): TimetableEntry[] {
  if (dayOfWeek === 0 || dayOfWeek === 6) return [];

  const key = getCacheKey(profile.group, dayOfWeek);
  const existing = syncCache.get(key);
  if (existing) return existing;

  return [];
}

// Background initial fetch of live data
fetchNormalizedTimetable()
  .then((records) => {
    populateSyncCache(records);
  })
  .catch((err) => {
    console.error('Error fetching live timetable in background:', err);
  });

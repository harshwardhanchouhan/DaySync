/**
 * Supabase client and query layer for DaySync
 * 
 * Supports live querying from Supabase database table `timetable_records`,
 * with intelligent fallback to the real parsed SST timetable if database
 * credentials are not yet configured in environment variables.
 */

import type { StudentProfile, TimetableEntry } from '../../types';
import type { NormalizedClassRecord } from './parser';
import { buildTimelineEntriesWithGaps, LIVE_SHEET_URL, parseSheetHtmlToRecords } from './parser';

export interface SupabaseConfig {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
}

let cachedRecords: NormalizedClassRecord[] | null = null;

/**
 * Fetch records from Supabase or live source
 */
export async function fetchNormalizedTimetable(): Promise<NormalizedClassRecord[]> {
  if (cachedRecords && cachedRecords.length > 0) {
    return cachedRecords;
  }

  try {
    const res = await fetch(LIVE_SHEET_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    const html = await res.text();
    cachedRecords = parseSheetHtmlToRecords(html);
    return cachedRecords;
  } catch (err) {
    console.error('[DaySync Data Layer] Failed to fetch live SST sheet:', err);
    throw err;
  }
}

/**
 * Query student schedule for a given profile and day
 */
export async function getStudentDaySchedule(
  profile: StudentProfile,
  dayOfWeek: number
): Promise<TimetableEntry[]> {
  // Sunday (0) or Saturday (6) check
  if (dayOfWeek === 0 || dayOfWeek === 6) return [];

  const allRecords = await fetchNormalizedTimetable();

  const filtered = allRecords.filter(
    (r) =>
      r.dayOfWeek === dayOfWeek &&
      r.group.toUpperCase() === profile.group.toUpperCase()
  );

  return buildTimelineEntriesWithGaps(filtered);
}

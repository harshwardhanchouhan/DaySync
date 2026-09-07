import type { ScheduledEntry } from '../types';

/**
 * Returns a standardized local date string in YYYY-MM-DD format.
 */
export function getLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Generates a deterministic, scoped class occurrence identity.
 * 
 * Guarantee:
 * - Scoped to the EXACT calendar day (e.g. 2026-09-03 vs 2026-09-04)
 * - Scoped to the student batch/group (e.g. Group A vs Group B)
 * - Scoped to the specific scheduled timetable slot
 * 
 * Format: `YYYY-MM-DD:GROUP:ENTRY_ID` (e.g. `2026-09-03:B:sst-b-3-09:30`)
 */
export function getOccurrenceId(date: Date, group: string, entry: ScheduledEntry): string {
  const dateStr = getLocalDateString(date);
  const normalizedGroup = (group || 'B').toUpperCase().trim();
  const stableEntryId = entry.id || `${entry.startTime}-${entry.endTime}-${entry.subject || 'class'}`;
  return `${dateStr}:${normalizedGroup}:${stableEntryId}`;
}

/**
 * Computes the exact expiration timestamp for a scheduled class occurrence.
 * Comments expire at the exact minute the class ends.
 */
export function getClassOccurrenceExpiration(date: Date, endTimeStr: string): Date {
  const [hours, minutes] = (endTimeStr || '12:00').split(':').map(Number);
  const exp = new Date(date);
  exp.setHours(hours, minutes, 0, 0);
  return exp;
}

/**
 * Formats a timestamp into a concise, editorial relative string (e.g. "2m ago", "just now").
 */
export function formatRelativeTime(timestamp: string | Date): string {
  const now = Date.now();
  const past = typeof timestamp === 'string' ? new Date(timestamp).getTime() : timestamp.getTime();
  const diffMs = now - past;
  const diffSec = Math.max(0, Math.floor(diffMs / 1000));

  if (diffSec < 45) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return 'today';
}

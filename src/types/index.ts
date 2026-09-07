// ─── Student Academic Profile ─────────────────────────────────────────────────

export type Year = '1st' | '2nd' | '3rd' | '4th';
export type Program = 'CS AI' | 'CS BS';
export type Group = 'A' | 'B' | 'C' | 'D';

export interface StudentProfile {
  year: Year;
  program: Program;
  group: Group;
}

export interface StudentAuthUser extends StudentProfile {
  id?: string;
  name: string;
  email: string;
}

// ─── Class Comments & Updates Types ───────────────────────────────────────────

export type VoteType = 'up' | 'down';

export interface ClassComment {
  id: string;
  occurrence_id: string;
  user_id: string;
  author_name: string;
  content: string;
  upvotes_count: number;
  downvotes_count: number;
  deletion_eligible_at: string | null;
  expires_at: string;
  created_at: string;
  user_vote?: VoteType | null;
}

export interface ClassCommentVote {
  id: string;
  comment_id: string;
  user_id: string;
  vote_type: VoteType;
  created_at: string;
  updated_at: string;
}

// ─── Timetable Entry Types ────────────────────────────────────────────────────

export type EntryType = 'class' | 'lunch' | 'free';

export interface TimetableEntry {
  id: string;
  type: EntryType;
  subject?: string;
  teacher?: string;
  room?: string;
  startTime: string; // "HH:MM" 24-hour
  endTime: string;   // "HH:MM" 24-hour
}

// ─── Derived Schedule State ───────────────────────────────────────────────────

export type EntryStatus = 'past' | 'current' | 'next' | 'future';

export interface ScheduledEntry extends TimetableEntry {
  status: EntryStatus;
  /** Minutes elapsed into this entry (0–duration), only valid for 'current' */
  elapsedMinutes?: number;
  /** Total duration in minutes */
  durationMinutes: number;
  /** Minutes until this entry starts, only meaningful for 'next' / 'future' */
  minutesUntilStart?: number;
}

export interface DayState {
  entries: ScheduledEntry[];
  currentEntry: ScheduledEntry | null;
  nextEntry: ScheduledEntry | null;
  isDayOver: boolean;
  hasNoClasses: boolean;
  isInFreeGap: boolean;
}

// ─── Notification Payload ─────────────────────────────────────────────────────

export interface NotificationPayload {
  subject: string;
  room: string;
  minutesUntil: number;
}

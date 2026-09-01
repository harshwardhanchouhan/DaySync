/**
 * DaySync Authentication & Identity Service
 * 
 * Enforces @sst.scaler.com domain restriction via Supabase Auth + Google OAuth
 * and automatically extracts student names from verified SST email addresses.
 */

import type { User } from '@supabase/supabase-js';
import type { Group, Program, StudentAuthUser, Year } from '../types';
import { isSupabaseConfigured, supabase } from './supabase';

export const SST_DOMAIN = '@sst.scaler.com';
export const INVALID_DOMAIN_MESSAGE = 'Please sign in using your SST Scaler Google account.';
export const AUTH_STORAGE_KEY = 'daysync_user_session';

export interface AuthenticatedStudent {
  id?: string;
  email: string;
  name: string;
  group?: Group;
  program?: Program;
  year?: Year;
  hasCompletedOnboarding?: boolean;
}

/**
 * Extracts student name from SST email format (e.g., rahul.26bcs10042@sst.scaler.com -> Rahul)
 * Takes everything before the first '.' in the email address.
 */
export function extractStudentNameFromEmail(email: string): string {
  if (!email) return 'Student';
  const trimmed = email.trim().toLowerCase();
  const localPart = trimmed.split('@')[0] || '';
  const namePart = localPart.split('.')[0] || localPart;

  if (!namePart) return 'Student';

  // Capitalize name (handles single names, hyphenated or underscore names)
  return namePart
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

/**
 * Checks whether an email belongs strictly to the official @sst.scaler.com domain
 */
export function isSstEmail(email: string): boolean {
  if (!email) return false;
  const trimmed = email.trim().toLowerCase();
  const parts = trimmed.split('@');
  if (parts.length !== 2) return false;
  return parts[1] === 'sst.scaler.com';
}

export async function signInWithGoogleOAuth(): Promise<{
  error: Error | null;
  student?: { email: string; name: string };
}> {
  if (!isSupabaseConfigured) {
    console.warn(
      '[DaySync Auth] Supabase is not yet configured in environment variables (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY). Using interactive simulated OAuth for development.'
    );

    const input = window.prompt(
      'Google Sign-In (Simulated OAuth for Development):\nEnter your SST Google account email (must end with @sst.scaler.com, e.g. rahul.26bcs10042@sst.scaler.com):',
      'rahul.26bcs10042@sst.scaler.com'
    );

    if (input === null) {
      return { error: new Error('Google Sign-In was cancelled.') };
    }

    const email = input.trim().toLowerCase();
    if (!isSstEmail(email)) {
      return { error: new Error(INVALID_DOMAIN_MESSAGE) };
    }

    const name = extractStudentNameFromEmail(email);
    return {
      error: null,
      student: { email, name },
    };
  }

  try {
    sessionStorage.setItem('daysync_oauth_in_progress', 'true');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        queryParams: {
          hd: 'sst.scaler.com',
          prompt: 'select_account',
        },
        redirectTo: window.location.origin,
      },
    });

    if (error) {
      sessionStorage.removeItem('daysync_oauth_in_progress');
      return { error };
    }

    return { error: null };
  } catch (err) {
    sessionStorage.removeItem('daysync_oauth_in_progress');
    return {
      error: err instanceof Error ? err : new Error('Unable to sign you in. Please try again.'),
    };
  }
}

/**
 * Signs out the current user and clears local session
 */
export async function signOut(): Promise<void> {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  if (isSupabaseConfigured) {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('[DaySync Auth] Error signing out from Supabase:', err);
    }
  }
}

/**
 * Verifies Supabase session email domain and extracts student identity
 */
export async function processSupabaseUser(user: User): Promise<{
  student: AuthenticatedStudent | null;
  error: string | null;
}> {
  const email = user.email?.trim().toLowerCase() || '';

  // Strict domain validation on authenticated user
  if (!email || !isSstEmail(email)) {
    // Invalidate invalid session immediately
    await signOut();
    return {
      student: null,
      error: INVALID_DOMAIN_MESSAGE,
    };
  }

  // SST Email is the source of truth for the student's name
  const name = extractStudentNameFromEmail(email);

  let preferredGroup: Group | undefined = undefined;

  // Attempt to check if student had a preferred group previously for default selection hint
  if (isSupabaseConfigured) {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('group')
        .eq('id', user.id)
        .maybeSingle();

      if (data?.group) {
        preferredGroup = data.group as Group;
      }
    } catch (err) {
      console.warn('[DaySync Auth] Note: profiles lookup:', err);
    }
  }

  return {
    student: {
      id: user.id,
      email,
      name,
      group: preferredGroup,
      program: 'CS AI',
      year: '1st',
      hasCompletedOnboarding: false,
    },
    error: null,
  };
}

/**
 * Upserts student profile in Supabase database and local session
 */
export async function saveStudentProfile(
  student: StudentAuthUser,
  userId?: string
): Promise<void> {
  // Always update local session
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(student));

  if (isSupabaseConfigured && userId) {
    try {
      await supabase.from('profiles').upsert(
        {
          id: userId,
          email: student.email,
          name: student.name,
          group: student.group,
          program: student.program,
          year: student.year,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );
    } catch (err) {
      console.error('[DaySync Auth] Error saving profile to Supabase:', err);
    }
  }
}

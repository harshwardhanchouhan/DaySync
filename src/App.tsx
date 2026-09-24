import { useEffect, useRef, useState } from 'react';
import type { Group, Program, StudentAuthUser, StudentProfile, Year } from './types';
import { useCurrentTime } from './hooks/useCurrentTime';
import { useTimetable } from './hooks/useTimetable';
import { DayHeader } from './components/DayHeader';
import { Timeline } from './components/Timeline';
import { NotificationBar } from './components/NotificationBar';
import { LoginModal } from './components/LoginModal';
import { ScrollBackground } from './components/ScrollBackground';
import {
  initNotifications,
  showNextClassNotification,
  clearNextClassNotification,
  type NotificationStatus,
} from './services/notifications';
import {
  AUTH_STORAGE_KEY,
  clearStaleAuthSession,
  getStoredStudentProfile,
  processSupabaseUser,
  saveStudentProfile,
  signOut,
} from './services/auth';
import { isSupabaseConfigured, supabase } from './services/supabase';
import { AuthLoadingScreen } from './components/AuthLoadingScreen';
import { useTheme } from './hooks/useTheme';

function App() {
  const { isDark, toggleTheme } = useTheme();
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [user, setUser] = useState<StudentAuthUser | null>(() => getStoredStudentProfile());

  const [pendingStudent, setPendingStudent] = useState<{
    name: string;
    email: string;
    group?: Group;
    program?: Program;
    year?: Year;
  } | null>(null);

  const [showGroupModal, setShowGroupModal] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(() => getStoredStudentProfile()?.id);

  // ── Supabase Auth Lifecycle Listener ───────────────────────────────────────
  useEffect(() => {
    let isMounted = true;

    // 1. Cross-tab synchronization via browser storage event
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === AUTH_STORAGE_KEY) {
        if (!e.newValue) {
          // User logged out in another tab
          setUser(null);
          setPendingStudent(null);
          setShowGroupModal(false);
          setCurrentUserId(undefined);
        } else {
          // User logged in or updated group in another tab
          try {
            const updated = JSON.parse(e.newValue) as StudentAuthUser;
            if (updated && updated.email) {
              setUser(updated);
              if (updated.id) setCurrentUserId(updated.id);
              setPendingStudent(null);
              setShowGroupModal(false);
            }
          } catch {
            // Ignore parse errors
          }
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // 2. Initial Session Check on App Startup / Page Load
    async function initAuth() {
      // Check if returning from Google OAuth redirect in URL
      const hasOAuthHash =
        window.location.hash.includes('access_token=') ||
        window.location.search.includes('code=');
      const hasOAuthFlag = sessionStorage.getItem('daysync_oauth_in_progress') === 'true';
      const isOAuthRedirect = hasOAuthHash || hasOAuthFlag;

      // Clean up the URL hash/query immediately so future refreshes do not re-trigger isOAuthRedirect
      if (hasOAuthHash) {
        window.history.replaceState(null, document.title, window.location.pathname);
      }
      if (hasOAuthFlag) {
        sessionStorage.removeItem('daysync_oauth_in_progress');
      }

      if (!isSupabaseConfigured) {
        // Dev / Simulated OAuth fallback
        const stored = getStoredStudentProfile();
        if (stored && isMounted) {
          setUser(stored);
          setCurrentUserId(stored.id);
        }
        if (isMounted) setIsAuthLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.warn('[DaySync Auth] Supabase session retrieval notice:', error.message);
          // Only clear session if token is genuinely invalid/revoked
          if (
            error.message?.includes('Refresh Token Not Found') ||
            error.message?.includes('invalid_grant')
          ) {
            await clearStaleAuthSession();
            if (isMounted) {
              setUser(null);
              setPendingStudent(null);
              setShowGroupModal(false);
            }
          } else {
            // Network hiccup or offline: retain cached user session
            const stored = getStoredStudentProfile();
            if (stored && isMounted) {
              setUser(stored);
              setCurrentUserId(stored.id);
            }
          }
          if (isMounted) setIsAuthLoading(false);
          return;
        }

        const session = data?.session;
        if (session?.user) {
          const effectiveId = session.user.id;
          if (isMounted) setCurrentUserId(effectiveId);

          const { student, error: procErr } = await processSupabaseUser(session.user);
          if (procErr) {
            if (isMounted) {
              setLoginError(procErr);
              setUser(null);
              setPendingStudent(null);
              setShowGroupModal(false);
              setIsAuthLoading(false);
            }
            return;
          }

          if (student && isMounted) {
            // Check if student already has a configured group (from local cache or Supabase profiles)
            const stored = getStoredStudentProfile();
            const existingGroup = stored?.group || student.group;

            if (existingGroup) {
              // User is already fully onboarded! Keep them logged in smoothly across refreshes
              const completeUser: StudentAuthUser = {
                id: effectiveId,
                email: student.email,
                name: student.name,
                group: existingGroup,
                program: student.program || 'CS AI',
                year: student.year || '1st',
              };
              setUser(completeUser);
              saveStudentProfile(completeUser, effectiveId);
              setPendingStudent(null);
              setShowGroupModal(false);
            } else if (isOAuthRedirect || !stored) {
              // Brand new login without a group selected yet: prompt group selection
              setPendingStudent({
                name: student.name,
                email: student.email,
                group: 'B',
                program: student.program || 'CS AI',
                year: student.year || '1st',
              });
              setShowGroupModal(true);
            }
          }
        } else {
          // No active session in Supabase: check if offline dev profile exists
          const stored = getStoredStudentProfile();
          if (stored && !isSupabaseConfigured && isMounted) {
            setUser(stored);
          } else if (isMounted) {
            setUser(null);
            setPendingStudent(null);
            setShowGroupModal(false);
          }
        }
      } catch (err) {
        console.warn('[DaySync Auth] Error during auth init:', err);
        const stored = getStoredStudentProfile();
        if (stored && isMounted) {
          setUser(stored);
        }
      } finally {
        if (isMounted) {
          setIsAuthLoading(false);
        }
      }
    }

    initAuth();

    // 3. Supabase Auth State Change Listener (Cross-tab and token refresh events)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
        if (!session?.user) return;

        const effectiveId = session.user.id;
        setCurrentUserId(effectiveId);

        // If the user already has a complete profile with group, keep it without prompting
        const stored = getStoredStudentProfile();
        if (stored && stored.email.toLowerCase() === session.user.email?.toLowerCase() && stored.group) {
          setUser((curr) => curr || stored);
          return;
        }

        const { student, error: procErr } = await processSupabaseUser(session.user);
        if (procErr) {
          setLoginError(procErr);
          setUser(null);
          setPendingStudent(null);
          return;
        }

        if (student) {
          setLoginError('');
          const existingGroup = student.group || stored?.group;

          if (existingGroup) {
            const completeUser: StudentAuthUser = {
              id: effectiveId,
              email: student.email,
              name: student.name,
              group: existingGroup,
              program: student.program || 'CS AI',
              year: student.year || '1st',
            };
            setUser(completeUser);
            saveStudentProfile(completeUser, effectiveId);
            setPendingStudent(null);
            setShowGroupModal(false);
          } else if (event === 'SIGNED_IN') {
            // Only prompt group modal on initial sign in if no group was ever chosen
            setPendingStudent({
              name: student.name,
              email: student.email,
              group: 'B',
              program: student.program || 'CS AI',
              year: student.year || '1st',
            });
            setShowGroupModal(true);
          }
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setPendingStudent(null);
        setShowGroupModal(false);
        setCurrentUserId(undefined);
      }
    });

    return () => {
      isMounted = false;
      window.removeEventListener('storage', handleStorageChange);
      subscription.unsubscribe();
    };
  }, []);

  const profile: StudentProfile = {
    year: user?.year || '1st',
    program: user?.program || 'CS AI',
    group: user?.group || 'B',
  };

  const now = useCurrentTime();
  const dayState = useTimetable(profile, now);

  const [notifStatus, setNotifStatus] = useState<NotificationStatus>('pending');
  const hasOsNotif = notifStatus === 'granted';

  // ── Notification update ref ───────────────────────────────────────────────
  const nextEntryRef = useRef(dayState.nextEntry);
  useEffect(() => {
    nextEntryRef.current = dayState.nextEntry;
  }, [dayState.nextEntry]);

  // ── Initialize SW on mount ───────────────────────────────────────────────
  useEffect(() => {
    initNotifications().then((status) => {
      setNotifStatus(status);
    });
  }, []);

  // ── Send notification updates every 60 seconds ───────────────────────────
  useEffect(() => {
    if (notifStatus !== 'granted') return;

    function sendUpdate() {
      const next = nextEntryRef.current;
      if (next && next.subject && next.room && next.minutesUntilStart != null) {
        showNextClassNotification(next.subject, next.room, next.minutesUntilStart);
      } else {
        clearNextClassNotification();
      }
    }

    sendUpdate();
    const id = setInterval(sendUpdate, 60_000);
    return () => clearInterval(id);
  }, [notifStatus]);

  // ── Login & Logout handlers ───────────────────────────────────────────────
  const handleLogin = async (newUser: StudentAuthUser) => {
    const effectiveId =
      currentUserId ||
      newUser.id ||
      (newUser.email ? 'usr-' + btoa(newUser.email).replace(/=/g, '') : undefined);
    if (effectiveId) setCurrentUserId(effectiveId);
    const updatedUser = { ...newUser, id: effectiveId };
    setUser(updatedUser);
    setPendingStudent(null);
    setShowGroupModal(false);
    await saveStudentProfile(updatedUser, effectiveId);
  };

  const handleLogout = async () => {
    await signOut();
    setUser(null);
    setPendingStudent(null);
    setShowGroupModal(false);
    setCurrentUserId(undefined);
  };

  // ── Request permission handler ────────────────────────────────────────────
  async function handleRequestPermission() {
    const status = await initNotifications();
    setNotifStatus(status);
  }

  // Show the bar if there's a next class (of type 'class', not lunch/free)
  const nextClassEntry =
    dayState.nextEntry?.type === 'class' ? dayState.nextEntry : null;

  // Render authentic loading screen during initial session verification
  if (isAuthLoading) {
    return <AuthLoadingScreen />;
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        fontFamily: 'var(--font-body)',
        position: 'relative',
      }}
    >
      {/* ── Minimal Reversible Ambient Scroll Background ── */}
      <ScrollBackground />

      {/* ── Login / Group Change Modal */}
      {(!user || showGroupModal || pendingStudent) && (
        <LoginModal
          key={
            user
              ? `auth-${user.email}-${showGroupModal}`
              : pendingStudent
              ? `pending-${pendingStudent.email}`
              : 'anon-login'
          }
          onLogin={handleLogin}
          initialUser={
            user ||
            (pendingStudent
              ? {
                  name: pendingStudent.name,
                  email: pendingStudent.email,
                  group: pendingStudent.group || 'B',
                  program: pendingStudent.program || 'CS AI',
                  year: pendingStudent.year || '1st',
                }
              : null)
          }
          initialStep={user || pendingStudent ? 'group' : 'credentials'}
          isFirstTimeOnboarding={!user}
          initialError={loginError}
          onClose={user && !pendingStudent ? () => setShowGroupModal(false) : undefined}
        />
      )}

      {/* ── Main content (max width centered, mobile-first) */}
      <main
        className="mx-auto relative"
        style={{ maxWidth: '520px', zIndex: 1 }}
        aria-label="DaySync — Your daily timetable"
      >
        {/* Day header */}
        <DayHeader
          now={now}
          studentName={user?.name || 'Student'}
          isDark={isDark}
          onToggleTheme={toggleTheme}
        />

        {/* Timeline walkthrough with bottom controls */}
        <Timeline
          entries={dayState.entries}
          isDayOver={dayState.isDayOver}
          hasNoClasses={dayState.hasNoClasses}
          now={now}
          currentUser={user}
          currentUserId={currentUserId || user?.id}
          currentGroup={user?.group}
          onSwitchGroup={() => setShowGroupModal(true)}
          onLogout={handleLogout}
        />
      </main>

      {/* ── Fixed notification bar (only displayed when user is logged in & viewing timeline) */}
      <NotificationBar
        nextEntry={nextClassEntry}
        visible={Boolean(user) && !showGroupModal && !pendingStudent && !dayState.isDayOver && !dayState.hasNoClasses}
        hasOsNotification={hasOsNotif}
        onRequestPermission={handleRequestPermission}
      />
    </div>
  );
}

export default App;

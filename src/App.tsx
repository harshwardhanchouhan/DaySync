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
  processSupabaseUser,
  saveStudentProfile,
  signOut,
} from './services/auth';
import { isSupabaseConfigured, supabase } from './services/supabase';

function App() {
  const [user, setUser] = useState<StudentAuthUser | null>(null);

  const [pendingStudent, setPendingStudent] = useState<{
    name: string;
    email: string;
    group?: Group;
    program?: Program;
    year?: Year;
  } | null>(null);

  const [showGroupModal, setShowGroupModal] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined);

  // ── Supabase Auth Lifecycle Listener ───────────────────────────────────────
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    // Check if returning from Google OAuth redirect in URL
    const isOAuthRedirect =
      window.location.hash.includes('access_token=') ||
      window.location.search.includes('code=') ||
      sessionStorage.getItem('daysync_oauth_in_progress') === 'true';

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user && isOAuthRedirect) {
        sessionStorage.removeItem('daysync_oauth_in_progress');
        setCurrentUserId(session.user.id);
        const { student, error } = await processSupabaseUser(session.user);
        if (error) {
          setLoginError(error);
          setUser(null);
          setPendingStudent(null);
          return;
        }

        if (student) {
          // Immediately show Group Selection screen after Google authentication
          setPendingStudent({
            name: student.name,
            email: student.email,
            group: student.group || 'B',
            program: student.program || 'CS AI',
            year: student.year || '1st',
          });
          setShowGroupModal(true);
        }
      }
    });

    // Subscribe to auth changes (Google OAuth callback and tab focus token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setCurrentUserId(session.user.id);
        const { student, error } = await processSupabaseUser(session.user);
        if (error) {
          setLoginError(error);
          setUser(null);
          setPendingStudent(null);
          return;
        }

        if (student) {
          setLoginError('');
          // Only prompt group selection if user is not already logged in in this session
          setUser((currentUser) => {
            if (!currentUser) {
              setPendingStudent({
                name: student.name,
                email: student.email,
                group: student.group || 'B',
                program: student.program || 'CS AI',
                year: student.year || '1st',
              });
              setShowGroupModal(true);
            }
            return currentUser;
          });
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setPendingStudent(null);
        setCurrentUserId(undefined);
      }
    });

    return () => {
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
    setUser(newUser);
    setPendingStudent(null);
    setShowGroupModal(false);
    await saveStudentProfile(newUser, currentUserId);
  };

  const handleLogout = async () => {
    await signOut();
    setUser(null);
    setPendingStudent(null);
    setShowGroupModal(false);
  };

  // ── Request permission handler ────────────────────────────────────────────
  async function handleRequestPermission() {
    const status = await initNotifications();
    setNotifStatus(status);
  }

  // Show the bar if there's a next class (of type 'class', not lunch/free)
  const nextClassEntry =
    dayState.nextEntry?.type === 'class' ? dayState.nextEntry : null;

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
        <DayHeader now={now} studentName={user?.name || 'Student'} />

        {/* Timeline walkthrough with bottom controls */}
        <Timeline
          entries={dayState.entries}
          isDayOver={dayState.isDayOver}
          hasNoClasses={dayState.hasNoClasses}
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

import React, { useState } from 'react';
import type { Group, StudentAuthUser } from '../types';
import { signInWithGoogleOAuth } from '../services/auth';

interface LoginModalProps {
  onLogin: (user: StudentAuthUser) => void;
  initialUser?: StudentAuthUser | null;
  initialStep?: 'credentials' | 'group';
  initialError?: string;
  isFirstTimeOnboarding?: boolean;
  onClose?: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  onLogin,
  initialUser,
  initialStep = 'credentials',
  initialError = '',
  isFirstTimeOnboarding = false,
  onClose,
}) => {
  const [tempStudent, setTempStudent] = useState<{ email: string; name: string } | null>(null);
  const [isExiting, setIsExiting] = useState(false);
  const isAuthed = Boolean(initialUser?.email || tempStudent?.email);
  const [step, setStep] = useState<'auth' | 'group'>(
    initialStep === 'group' || isAuthed ? 'group' : 'auth'
  );

  const effectiveEmail = (tempStudent?.email || initialUser?.email || '').trim().toLowerCase();
  const effectiveName = (tempStudent?.name || initialUser?.name || 'Student').trim();

  const [selectedGroup, setSelectedGroup] = useState<Group>(initialUser?.group || 'B');
  const [error, setError] = useState(initialError);
  const [isLoading, setIsLoading] = useState(false);

  React.useEffect(() => {
    if (initialStep === 'group' || initialUser?.email) {
      setStep('group');
    } else if (!tempStudent?.email) {
      setStep('auth');
    }
  }, [initialStep, initialUser?.email, tempStudent?.email]);

  React.useEffect(() => {
    if (initialUser?.group) {
      setSelectedGroup(initialUser.group);
    }
  }, [initialUser?.group]);

  React.useEffect(() => {
    if (initialError) {
      setError(initialError);
    }
  }, [initialError]);

  const [droplets, setDroplets] = useState<Array<{ id: number; x: number; y: number; size: number }>>([]);

  const handleGoogleButtonClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const size = Math.max(rect.width, rect.height) * 1.5;

    const newDroplet = {
      id: Date.now() + Math.random(),
      x,
      y,
      size,
    };

    setDroplets((prev) => [...prev.slice(-3), newDroplet]);
    handleGoogleSignIn();
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setIsLoading(true);

    try {
      const result = await signInWithGoogleOAuth();
      if (result.error) {
        setError(result.error.message || 'Please sign in using your SST Scaler Google account.');
      } else if (result.student) {
        // Dev / Simulated OAuth: smoothly move to group selection!
        setTempStudent(result.student);
        setStep('group');
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Please sign in using your SST Scaler Google account.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const triggerExitAndClose = () => {
    if (!onClose || isExiting) return;
    setIsExiting(true);
    setTimeout(() => {
      onClose();
    }, 580);
  };

  const handleFinalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveEmail) {
      setError('Please sign in using your SST Scaler Google account.');
      setStep('auth');
      return;
    }

    if (isExiting) return;
    setIsExiting(true);

    const userPayload: StudentAuthUser = {
      name: effectiveName || 'Student',
      email: effectiveEmail,
      group: selectedGroup,
      program: initialUser?.program || 'CS AI',
      year: initialUser?.year || '1st',
    };

    // Smooth cinematic depletion delay before notifying parent state
    setTimeout(() => {
      onLogin(userPayload);
    }, 580);
  };

  const isNewUser = isFirstTimeOnboarding || Boolean(tempStudent) || !initialUser;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${
        isExiting ? 'modal-backdrop-exit' : 'modal-backdrop-enter'
      }`}
      style={{
        background: 'rgba(30, 22, 17, 0.65)',
      }}
    >
      <div
        className={`w-full max-w-md p-6 sm:p-8 rounded-[2rem] relative border ${
          isExiting ? 'modal-card-exit' : 'modal-card-enter'
        }`}
        style={{
          background: 'var(--color-cream-card-focused, #FFFFFF)',
          borderColor: 'var(--color-border)',
          boxShadow:
            '0 24px 50px -12px rgba(44, 33, 26, 0.22), 0 4px 18px rgba(44, 33, 26, 0.08)',
        }}
      >
        {/* Top Logo / Pixel Badge */}
        <div className="flex items-center justify-between mb-6 stagger-1">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center font-pixel text-xs font-bold text-white shadow-sm transition-transform duration-300 hover:scale-105 active:scale-95"
              style={{ background: 'var(--color-brown-900)' }}
            >
              DS
            </div>
            <span
              className="font-pixel text-sm tracking-tight"
              style={{ color: 'var(--color-brown-950)' }}
            >
              DaySync
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="font-pixel text-[0.62rem] px-2.5 py-1 rounded-full uppercase transition-all duration-300"
              style={{
                background: 'var(--color-next-bg)',
                color: 'var(--color-next)',
                border: '1px solid rgba(201, 148, 58, 0.25)',
              }}
            >
              SST Portal
            </span>
            {onClose && !isNewUser && (
              <button
                type="button"
                onClick={triggerExitAndClose}
                className="w-7 h-7 rounded-full flex items-center justify-center text-stone-400 hover:text-stone-800 hover:bg-stone-100 text-xs font-bold transition-all duration-200 cursor-pointer active:scale-90"
                aria-label="Close"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {step === 'auth' ? (
          <div key="auth-step" className="modal-step-enter">
            <h2
              className="font-pixel text-base mb-1.5 stagger-2"
              style={{ color: 'var(--color-brown-950)' }}
            >
              Sign In
            </h2>
            <p className="text-xs mb-6 stagger-3" style={{ color: 'var(--color-brown-500)' }}>
              Sign in with your official SST Scaler Google account to access your personalized timetable.
            </p>

            {error && (
              <div
                className="mb-5 p-3.5 rounded-xl text-xs font-medium border flex items-start gap-2 stagger-3 animate-fade-in-1"
                style={{
                  background: '#FDF2F2',
                  borderColor: '#F8B4B4',
                  color: '#9B1C1C',
                }}
              >
                <span className="text-sm font-bold leading-none">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {/* Google Authentication Button */}
            <div className="space-y-4 stagger-4">
              <button
                type="button"
                onClick={handleGoogleButtonClick}
                disabled={isLoading || isExiting}
                className="glass-btn-silver w-full py-3.5 px-4 rounded-2xl font-semibold text-sm flex items-center justify-center gap-3 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden relative"
                style={{
                  color: 'var(--color-brown-950)',
                }}
              >
                {/* Minimal brown droplet ripple overlay */}
                <span className="droplet-container" aria-hidden="true">
                  {droplets.map((d) => (
                    <span
                      key={d.id}
                      className="brown-droplet"
                      style={{
                        left: `${d.x}px`,
                        top: `${d.y}px`,
                        width: `${d.size}px`,
                        height: `${d.size}px`,
                      }}
                      onAnimationEnd={() => {
                        setDroplets((prev) => prev.filter((item) => item.id !== d.id));
                      }}
                    />
                  ))}
                </span>

                {isLoading ? (
                  <div className="flex items-center gap-2 relative z-10">
                    <span className="w-4 h-4 border-2 border-stone-400 border-t-stone-800 rounded-full animate-spin" />
                    <span>Connecting to Google...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-3 relative z-10 pointer-events-none">
                    {/* Official Google G Logo SVG */}
                    <svg className="w-5 h-5 flex-shrink-0 drop-shadow-xs" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span className="tracking-tight">Continue with Google</span>
                  </div>
                )}
              </button>

              <div className="pt-2 text-center stagger-5">
                <p className="text-[0.72rem]" style={{ color: 'var(--color-brown-500)' }}>
                  Only authorized <span className="font-semibold text-amber-800">@sst.scaler.com</span> accounts are permitted.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div key="group-step" className="modal-step-enter">
            <div className="mb-2 flex items-center justify-between stagger-1">
              {tempStudent ? (
                <button
                  type="button"
                  onClick={() => {
                    setTempStudent(null);
                    setStep('auth');
                  }}
                  className="text-xs font-semibold hover:underline cursor-pointer flex items-center gap-1 transition-colors"
                  style={{ color: 'var(--color-brown-500)' }}
                >
                  ← Change Account
                </button>
              ) : !initialUser ? (
                <button
                  type="button"
                  onClick={() => setStep('auth')}
                  className="text-xs font-semibold hover:underline cursor-pointer flex items-center gap-1 transition-colors"
                  style={{ color: 'var(--color-brown-500)' }}
                >
                  ← Back
                </button>
              ) : <div />}
            </div>
            <h2
              className="font-pixel text-base mb-1.5 stagger-2"
              style={{ color: 'var(--color-brown-950)' }}
            >
              {isNewUser ? 'Select Your Group' : 'Change Batch Group'}
            </h2>
            <p className="text-xs mb-6 stagger-3" style={{ color: 'var(--color-brown-500)' }}>
              Hi <span className="font-semibold text-stone-900">{effectiveName || 'Student'}</span>! Which batch group's dayline do you want to view?
            </p>

            <form onSubmit={handleFinalSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-3 stagger-4">
                {(['A', 'B', 'C', 'D'] as Group[]).map((grp) => {
                  const isSelected = selectedGroup === grp;
                  return (
                    <button
                      key={grp}
                      type="button"
                      onClick={() => setSelectedGroup(grp)}
                      className={`p-4 rounded-2xl border text-left transition-all duration-300 relative overflow-hidden cursor-pointer transform active:scale-[0.96] hover:-translate-y-0.5 ${
                        isSelected ? 'ring-2 ring-emerald-600/30 shadow-md' : 'hover:border-stone-400 hover:shadow-xs'
                      }`}
                      style={{
                        background: isSelected ? 'var(--color-active-bg)' : 'var(--color-cream)',
                        borderColor: isSelected ? 'var(--color-active)' : 'var(--color-border)',
                        boxShadow: isSelected ? '0 4px 18px rgba(74, 124, 89, 0.18)' : 'none',
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className="font-pixel text-lg font-bold"
                          style={{
                            color: isSelected ? 'var(--color-active)' : 'var(--color-brown-900)',
                          }}
                        >
                          Group {grp}
                        </span>
                        {isSelected && (
                          <span
                            className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-white font-bold animate-fade-in-1 shadow-xs"
                            style={{ background: 'var(--color-active)' }}
                          >
                            ✓
                          </span>
                        )}
                      </div>
                      <p
                        className="text-[0.72rem] mt-1.5 font-medium transition-colors"
                        style={{
                          color: isSelected ? 'var(--color-brown-700)' : 'var(--color-brown-500)',
                        }}
                      >
                        SST Batch Schedule
                      </p>
                    </button>
                  );
                })}
              </div>

              <button
                type="submit"
                disabled={isExiting}
                className="btn-shimmer w-full mt-6 py-3.5 px-4 rounded-xl font-pixel text-xs text-white transition-all duration-300 transform active:scale-[0.98] hover:scale-[1.01] shadow-md hover:shadow-lg hover:brightness-105 cursor-pointer stagger-5 disabled:opacity-80"
                style={{
                  background: 'var(--color-active)',
                }}
              >
                {isNewUser ? 'View My Dayline 🚀' : 'Save & View Timetable 🚀'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

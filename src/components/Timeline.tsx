import { useRef, useEffect, useCallback, type FC, type ReactNode } from 'react';
import type { ScheduledEntry } from '../types';
import { CurrentClass } from './CurrentClass';
import { NextClass } from './NextClass';
import { FreeGap } from './FreeGap';
import { LunchBlock } from './LunchBlock';
import { FutureClass } from './FutureClass';
import { DayEndState } from './DayEndState';

// ─── TimelineItem Wrapper ─────────────────────────────────────────────────────
// Controls the per-entry focus state via IntersectionObserver.
// The CSS handles the actual transition; this just toggles classes.

interface TimelineItemProps {
  entry: ScheduledEntry;
  children: ReactNode;
  skipFocusEffect?: boolean; // Free gaps don't need the scale/opacity effect
}

const TimelineItem: FC<TimelineItemProps> = ({
  entry,
  children,
  skipFocusEffect = false,
}) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (skipFocusEffect) return;

    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const obs of entries) {
          // Center focus zone: active when element is intersecting the middle of screen
          if (obs.isIntersecting) {
            obs.target.classList.add('is-focused');
          } else {
            obs.target.classList.remove('is-focused');
          }
        }
      },
      {
        // Invisible focus window in the vertical center of the viewport
        rootMargin: '-20% 0px -25% 0px',
        threshold: [0.15, 0.4, 0.7],
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [entry.status, skipFocusEffect]);

  const classNames = [
    'timeline-item',
    entry.status === 'current' ? 'is-current' : '',
    entry.status === 'past'    ? 'is-past'    : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      ref={ref}
      className={skipFocusEffect ? '' : classNames}
      data-entry-id={entry.id}
      data-entry-status={entry.status}
    >
      {children}
    </div>
  );
};

// ─── Main Timeline ────────────────────────────────────────────────────────────

interface TimelineProps {
  entries: ScheduledEntry[];
  isDayOver: boolean;
  hasNoClasses: boolean;
  currentGroup?: string;
  onSwitchGroup?: () => void;
  onLogout?: () => void;
}

export const Timeline: React.FC<TimelineProps> = ({
  entries,
  isDayOver,
  hasNoClasses,
  currentGroup,
  onSwitchGroup,
  onLogout,
}) => {
  // Auto-scroll to the current/next entry on first render
  const currentRef = useRef<HTMLDivElement>(null);

  const scrollToCurrent = useCallback(() => {
    if (currentRef.current) {
      currentRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
        inline: 'nearest',
      });
    }
  }, []);

  useEffect(() => {
    // Small delay to let layout settle before scrolling
    const id = setTimeout(scrollToCurrent, 600);
    return () => clearTimeout(id);
  }, []); // Only on mount

  return (
    <div className="pb-32">
      {hasNoClasses ? (
        <DayEndState variant="no-classes" />
      ) : (
        <>
          {entries.map((entry, index) => {
            const isLast = index === entries.length - 1;
            const isCurrent = entry.status === 'current';
            const isNext = entry.status === 'next';

            return (
              <div
                key={entry.id}
                ref={isCurrent || isNext ? currentRef : undefined}
              >
                {/* Dot + connector above each item */}
                <div className="px-6 max-w-lg mx-auto">
                  <div className="flex items-start gap-4">
                    {/* Left: dot + spine column */}
                    <div className="flex flex-col items-center flex-shrink-0 mt-1">
                      <div
                        className={[
                          'timeline-dot',
                          isCurrent        ? 'dot-active' : '',
                          isNext           ? 'dot-next'   : '',
                          entry.status === 'past' ? 'dot-past'  : '',
                        ].join(' ')}
                        aria-hidden="true"
                      />
                      {!isLast && (
                        <div
                          className="timeline-spine mt-2"
                          style={{
                            height: entry.type === 'free' ? '3.5rem' : '2rem',
                            opacity: entry.status === 'past' ? 0.4 : 1,
                          }}
                          aria-hidden="true"
                        />
                      )}
                    </div>

                    {/* Right: entry content */}
                    <div className="flex-1 pb-4 min-w-0">
                      {entry.type === 'free' ? (
                        <TimelineItem entry={entry} skipFocusEffect>
                          <FreeGap entry={entry} />
                        </TimelineItem>
                      ) : entry.type === 'lunch' ? (
                        <TimelineItem entry={entry}>
                          <LunchBlock entry={entry} />
                        </TimelineItem>
                      ) : isCurrent ? (
                        <TimelineItem entry={entry}>
                          <CurrentClass entry={entry} />
                        </TimelineItem>
                      ) : isNext ? (
                        <TimelineItem entry={entry}>
                          <NextClass entry={entry} />
                        </TimelineItem>
                      ) : entry.status === 'past' ? (
                        <TimelineItem entry={entry}>
                          <FutureClass entry={entry} isPast />
                        </TimelineItem>
                      ) : (
                        <TimelineItem entry={entry}>
                          <FutureClass entry={entry} />
                        </TimelineItem>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Day end state */}
          {isDayOver && (
            <DayEndState variant="day-over" />
          )}

          {/* "You're free" state when current is a free gap */}
          {!isDayOver && entries.every((e) => e.status !== 'current' || e.type === 'free') && (
            (() => {
              const nextClassEntry = entries.find((e) => e.status === 'next' && e.type === 'class');
              return nextClassEntry ? (
                <DayEndState
                  variant="free-gap-end"
                  nextSubject={nextClassEntry.subject}
                  minutesUntil={nextClassEntry.minutesUntilStart}
                />
              ) : null;
            })()
          )}
        </>
      )}

      {/* ─── End of Page Controls (Group Selector & Sign Out) ─────────────── */}
      {(onSwitchGroup || onLogout) && (
        <div className="px-6 max-w-lg mx-auto mt-4 pt-4 border-t border-dashed border-stone-300/80">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-white/50 border border-stone-200/80 shadow-xs">
            <div className="flex items-center gap-2.5">
              <span className="font-pixel text-[0.65rem] text-stone-600">Active Batch:</span>
              <span className="font-pixel text-xs px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">
                Group {currentGroup || 'B'}
              </span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {onSwitchGroup && (
                <button
                  type="button"
                  onClick={onSwitchGroup}
                  className="flex-1 sm:flex-none font-pixel text-[0.62rem] px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-stone-800 hover:bg-stone-50 active:scale-95 transition-all shadow-xs"
                >
                  Change Group ▾
                </button>
              )}
              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="flex-1 sm:flex-none text-xs font-semibold px-3 py-2 rounded-xl text-stone-500 hover:text-red-700 hover:bg-red-50 active:scale-95 transition-all"
                >
                  Sign out
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

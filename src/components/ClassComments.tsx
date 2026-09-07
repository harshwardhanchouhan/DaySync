import React, { useState, useEffect, useCallback } from 'react';
import type { ClassComment, StudentAuthUser, VoteType } from '../types';
import {
  fetchClassComments,
  createClassComment,
  voteClassComment,
  deleteClassComment,
  subscribeToClassComments,
} from '../services/comments';
import { formatRelativeTime } from '../utils/classOccurrence';

interface ClassCommentsProps {
  occurrenceId: string;
  expiresAt: Date;
  isPast?: boolean;
  currentUser?: StudentAuthUser | null;
  currentUserId?: string;
}

export const ClassComments: React.FC<ClassCommentsProps> = ({
  occurrenceId,
  expiresAt,
  isPast = false,
  currentUser,
  currentUserId,
}) => {
  const [comments, setComments] = useState<ClassComment[]>(() => {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('daysync_mock_class_comments') : null;
      if (!raw) return [];
      const all: ClassComment[] = JSON.parse(raw);
      return all.filter((c) => c.occurrence_id === occurrenceId);
    } catch {
      return [];
    }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  const isClassEnded = Boolean(isPast);

  // ─── 1. Load Comments & Realtime Subscription ──────────────────────────────
  const loadComments = useCallback(async () => {
    if (isPast) {
      setComments([]);
      setIsLoading(false);
      return;
    }

    try {
      const data = await fetchClassComments(occurrenceId, currentUserId);
      setComments(data);
    } catch (err) {
      console.warn('[ClassComments] Could not load comments:', err);
    } finally {
      setIsLoading(false);
    }
  }, [occurrenceId, currentUserId, isPast]);

  useEffect(() => {
    loadComments();

    if (isClassEnded) return;

    // Realtime changes listener
    const unsubscribe = subscribeToClassComments(occurrenceId, () => {
      loadComments();
    });

    return () => {
      unsubscribe();
    };
  }, [occurrenceId, loadComments, isClassEnded]);

  // ─── 2. Timer Heartbeat for Grace Period Countdowns ────────────────────────
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // ─── 3. Submit New Comment ──────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const trimmed = newCommentText.trim();
    if (!trimmed) return;

    if (trimmed.length > 280) {
      setErrorMessage('Comment exceeds 280 characters limit.');
      return;
    }

    if (!currentUser || !currentUserId) {
      setErrorMessage('Please sign in to post class updates.');
      return;
    }

    if (isClassEnded) {
      setErrorMessage('This class has already ended.');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await createClassComment(
        occurrenceId,
        trimmed,
        expiresAt,
        currentUser,
        currentUserId
      );

      setComments((prev) => [...prev, created]);
      setNewCommentText('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to post update. Please try again.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── 4. Voting with Optimistic UI ──────────────────────────────────────────
  const handleVote = async (commentId: string, voteType: VoteType) => {
    if (!currentUserId) {
      setErrorMessage('Please sign in to vote on class updates.');
      return;
    }

    // Preserve previous comments snapshot for rollback
    const previousComments = [...comments];

    // Optimistic UI calculation
    setComments((prev) =>
      prev.map((c) => {
        if (c.id !== commentId) return c;

        const hadSameVote = c.user_vote === voteType;
        const hadOppositeVote = c.user_vote && c.user_vote !== voteType;

        let newUp = c.upvotes_count;
        let newDown = c.downvotes_count;
        let newVote: VoteType | null = voteType;

        if (hadSameVote) {
          // Toggle off
          newVote = null;
          if (voteType === 'up') newUp = Math.max(0, newUp - 1);
          if (voteType === 'down') newDown = Math.max(0, newDown - 1);
        } else if (hadOppositeVote) {
          // Switch vote
          if (voteType === 'up') {
            newUp += 1;
            newDown = Math.max(0, newDown - 1);
          } else {
            newDown += 1;
            newUp = Math.max(0, newUp - 1);
          }
        } else {
          // New vote
          if (voteType === 'up') newUp += 1;
          if (voteType === 'down') newDown += 1;
        }

        // Optimistic 5-minute countdown estimation
        let deletion_eligible_at = c.deletion_eligible_at;
        if (newDown > newUp) {
          if (!deletion_eligible_at) {
            deletion_eligible_at = new Date(Date.now() + 5 * 60 * 1000).toISOString();
          }
        } else {
          deletion_eligible_at = null;
        }

        return {
          ...c,
          user_vote: newVote,
          upvotes_count: newUp,
          downvotes_count: newDown,
          deletion_eligible_at,
        };
      })
    );

    try {
      const result = await voteClassComment(commentId, voteType, currentUserId);

      // Reconcile with authoritative database response
      setComments((prev) =>
        prev.map((c) => {
          if (c.id !== commentId) return c;
          return {
            ...c,
            user_vote: result.user_vote,
            upvotes_count: result.upvotes_count,
            downvotes_count: result.downvotes_count,
            deletion_eligible_at: result.deletion_eligible_at,
          };
        })
      );
    } catch (err) {
      console.error('[ClassComments] Vote failed, rolling back:', err);
      setComments(previousComments);
      setErrorMessage('Could not update vote. Please check your connection.');
    }
  };

  // ─── 5. Author Delete ───────────────────────────────────────────────────────
  const handleDelete = async (commentId: string) => {
    const previous = [...comments];
    setComments((prev) => prev.filter((c) => c.id !== commentId));

    try {
      await deleteClassComment(commentId);
    } catch (err) {
      console.error('[ClassComments] Delete failed:', err);
      setComments(previous);
      setErrorMessage('Could not delete comment.');
    }
  };

  // Do not render anything interactive if class has already finished
  if (isPast) {
    return null;
  }

  // Filter out comments whose grace period has completely elapsed in the client
  const activeComments = comments.filter((c) => {
    if (c.deletion_eligible_at) {
      const remainingMs = new Date(c.deletion_eligible_at).getTime() - currentTime;
      if (remainingMs <= 0) return false;
    }
    return true;
  });

  return (
    <div className="mt-4 pt-3 border-t border-stone-900/10">
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-1.5">
          <span className="text-xs" role="img" aria-label="Updates">💬</span>
          <span
            className="font-pixel text-[0.62rem] tracking-wider uppercase font-semibold"
            style={{ color: 'var(--color-brown-800)' }}
          >
            Class Updates
          </span>
          {activeComments.length > 0 && (
            <span
              className="font-pixel text-[0.52rem] px-1.5 py-0.5 rounded-md font-bold"
              style={{
                background: 'var(--color-brown-100)',
                color: 'var(--color-brown-950)',
              }}
            >
              {activeComments.length}
            </span>
          )}
        </div>
      </div>

      {/* ── Error Notification ── */}
      {errorMessage && (
        <div
          className="mb-2 p-2 rounded-lg text-xs font-medium flex items-center justify-between gap-2"
          style={{
            background: 'rgba(180, 50, 40, 0.08)',
            color: '#8A2520',
            border: '1px solid rgba(180, 50, 40, 0.15)',
          }}
        >
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage('')}
            className="text-stone-400 hover:text-stone-700 font-bold px-1"
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}

      {/* ── Comments List ── */}
      {isLoading ? (
        <div className="py-2.5 px-3 mb-2.5 rounded-xl bg-stone-900/[0.02] border border-dashed border-stone-300/60 text-center">
          <span className="font-pixel text-[0.55rem] text-stone-400 tracking-wider">
            Loading updates...
          </span>
        </div>
      ) : activeComments.length === 0 ? (
        <div className="py-2.5 px-3 mb-2.5 rounded-xl bg-stone-900/[0.02] border border-dashed border-stone-300/60 text-center">
          <p className="font-pixel text-[0.55rem] text-stone-500 tracking-wide">
            No updates yet.
          </p>
        </div>
      ) : (
        <div className="space-y-2 mb-3">
          {activeComments.map((comment) => {
            const isAuthor = currentUserId && comment.user_id === currentUserId;
            const hasDeletionGrace = Boolean(comment.deletion_eligible_at);

            let graceSecondsRemaining = 0;
            if (hasDeletionGrace && comment.deletion_eligible_at) {
              graceSecondsRemaining = Math.max(
                0,
                Math.ceil((new Date(comment.deletion_eligible_at).getTime() - currentTime) / 1000)
              );
            }

            const graceMinutes = Math.floor(graceSecondsRemaining / 60);
            const graceSeconds = graceSecondsRemaining % 60;
            const graceCountdownStr = `${graceMinutes}:${String(graceSeconds).padStart(2, '0')}`;

            return (
              <div
                key={comment.id}
                className="p-2.5 rounded-xl transition-all"
                style={{
                  background: hasDeletionGrace
                    ? 'rgba(230, 220, 215, 0.45)'
                    : 'rgba(255, 255, 255, 0.65)',
                  border: hasDeletionGrace
                    ? '1px dashed rgba(160, 140, 130, 0.6)'
                    : '1px solid rgba(210, 207, 200, 0.7)',
                }}
              >
                {/* Author & Timestamp */}
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-semibold text-xs text-stone-800 truncate">
                      {comment.author_name}
                    </span>
                    <span className="text-[0.68rem] text-stone-600 flex-shrink-0">
                      • {formatRelativeTime(comment.created_at)}
                    </span>
                  </div>

                  {isAuthor && (
                    <button
                      type="button"
                      onClick={() => handleDelete(comment.id)}
                      className="text-[0.65rem] text-stone-600 hover:text-red-700 px-1 py-0.5 rounded transition-colors"
                      title="Delete your comment"
                      aria-label="Delete your comment"
                    >
                      Delete
                    </button>
                  )}
                </div>

                {/* Comment Text */}
                <p
                  className="text-xs leading-relaxed text-stone-900 break-words mb-2"
                  style={{ whiteSpace: 'pre-wrap' }}
                >
                  {comment.content}
                </p>

                {/* 5-minute grace period alert banner */}
                {hasDeletionGrace && (
                  <div className="mb-2 px-2 py-1 rounded-lg bg-stone-200/70 text-[0.62rem] text-stone-700 flex items-center justify-between">
                    <span className="font-medium">Flagged by votes:</span>
                    <span className="font-pixel text-[0.52rem] font-bold text-stone-800">
                      deleting in {graceCountdownStr}
                    </span>
                  </div>
                )}

                {/* Vote Controls Row */}
                <div className="flex items-center gap-2">
                  {/* Upvote Button */}
                  <button
                    type="button"
                    onClick={() => handleVote(comment.id, 'up')}
                    aria-label={`Upvote. Current count: ${comment.upvotes_count}`}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold transition-all active:scale-95 cursor-pointer"
                    style={{
                      background:
                        comment.user_vote === 'up'
                          ? 'var(--color-brown-900)'
                          : 'rgba(0, 0, 0, 0.04)',
                      color:
                        comment.user_vote === 'up'
                          ? '#FFFFFF'
                          : 'var(--color-brown-700)',
                      border:
                        comment.user_vote === 'up'
                          ? '1px solid var(--color-brown-950)'
                          : '1px solid rgba(0, 0, 0, 0.08)',
                    }}
                  >
                    <span>▲</span>
                    <span>{comment.upvotes_count}</span>
                  </button>

                  {/* Downvote Button */}
                  <button
                    type="button"
                    onClick={() => handleVote(comment.id, 'down')}
                    aria-label={`Downvote. Current count: ${comment.downvotes_count}`}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold transition-all active:scale-95 cursor-pointer"
                    style={{
                      background:
                        comment.user_vote === 'down'
                          ? 'var(--color-brown-900)'
                          : 'rgba(0, 0, 0, 0.04)',
                      color:
                        comment.user_vote === 'down'
                          ? '#FFFFFF'
                          : 'var(--color-brown-700)',
                      border:
                        comment.user_vote === 'down'
                          ? '1px solid var(--color-brown-950)'
                          : '1px solid rgba(0, 0, 0, 0.08)',
                    }}
                  >
                    <span>▼</span>
                    <span>{comment.downvotes_count}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Input Box for Adding an Update ── */}
      <form onSubmit={handleSubmit} className="relative">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newCommentText}
            onChange={(e) => {
              if (e.target.value.length <= 280) {
                setNewCommentText(e.target.value);
              }
            }}
            placeholder="Write an update..."
            maxLength={280}
            disabled={isSubmitting}
            className="flex-1 text-xs px-3 py-2 rounded-xl bg-white/80 border border-stone-300 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-600 transition-all"
            aria-label="Write a class update"
          />
          <button
            type="submit"
            disabled={isSubmitting || !newCommentText.trim()}
            className="font-pixel text-[0.58rem] px-3.5 py-2 rounded-xl border border-stone-900 bg-stone-900 text-white font-semibold hover:bg-stone-800 active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center justify-center min-w-[3.8rem] cursor-pointer"
          >
            {isSubmitting ? '...' : 'Post'}
          </button>
        </div>

        {/* Character counter */}
        {newCommentText.length > 200 && (
          <div className="flex justify-end mt-1">
            <span
              className="font-pixel text-[0.48rem]"
              style={{
                color:
                  newCommentText.length >= 270
                    ? '#A02010'
                    : 'var(--color-brown-500)',
              }}
            >
              {280 - newCommentText.length} chars left
            </span>
          </div>
        )}
      </form>
    </div>
  );
};

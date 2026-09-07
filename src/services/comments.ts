import type { ClassComment, StudentAuthUser, VoteType } from '../types';
import { isSupabaseConfigured, supabase } from './supabase';

// ─── Local Mock Store for Offline / Dev Without Supabase Setup ───────────────
const LOCAL_COMMENTS_STORAGE_KEY = 'daysync_mock_class_comments';
const LOCAL_VOTES_STORAGE_KEY = 'daysync_mock_class_votes';

function getLocalComments(): ClassComment[] {
  try {
    const raw = localStorage.getItem(LOCAL_COMMENTS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalComments(comments: ClassComment[]) {
  try {
    localStorage.setItem(LOCAL_COMMENTS_STORAGE_KEY, JSON.stringify(comments));
  } catch (err) {
    console.error('[DaySync Comments] Failed to save mock comments to localStorage:', err);
  }
}

function getLocalVotes(): Record<string, Record<string, VoteType>> {
  try {
    const raw = localStorage.getItem(LOCAL_VOTES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveLocalVotes(votes: Record<string, Record<string, VoteType>>) {
  try {
    localStorage.setItem(LOCAL_VOTES_STORAGE_KEY, JSON.stringify(votes));
  } catch (err) {
    console.error('[DaySync Comments] Failed to save mock votes to localStorage:', err);
  }
}

// ─── Service Methods ──────────────────────────────────────────────────────────

/**
 * Fetches all active comments for a specific class occurrence.
 * Filters out expired comments and those whose 5-minute downvote grace period has expired.
 */
export async function fetchClassComments(
  occurrenceId: string,
  currentUserId?: string
): Promise<ClassComment[]> {
  const nowIso = new Date().toISOString();

  if (!isSupabaseConfigured) {
    // Local development fallback
    const all = getLocalComments();
    const votes = getLocalVotes();
    const active = all.filter((c) => {
      if (c.occurrence_id !== occurrenceId) return false;
      if (c.expires_at <= nowIso) return false;
      if (c.deletion_eligible_at && c.deletion_eligible_at <= nowIso) return false;
      return true;
    });

    return active.map((c) => ({
      ...c,
      user_vote: currentUserId ? votes[c.id]?.[currentUserId] || null : null,
    }));
  }

  try {
    // 1. Fetch comments within scope
    const { data: comments, error } = await supabase
      .from('class_comments')
      .select('*')
      .eq('occurrence_id', occurrenceId)
      .gt('expires_at', nowIso)
      .order('created_at', { ascending: true });

    if (error) {
      console.warn('[DaySync Comments] Supabase table or query error, using local fallback:', error.message);
      const all = getLocalComments();
      const votes = getLocalVotes();
      const active = all.filter((c) => {
        if (c.occurrence_id !== occurrenceId) return false;
        if (c.expires_at <= nowIso) return false;
        if (c.deletion_eligible_at && c.deletion_eligible_at <= nowIso) return false;
        return true;
      });

      return active.map((c) => ({
        ...c,
        user_vote: currentUserId ? votes[c.id]?.[currentUserId] || null : null,
      }));
    }

    if (!comments || comments.length === 0) return [];

    // Filter out items where deletion_eligible_at has passed (database RLS also handles this)
    const validComments = (comments as ClassComment[]).filter((c) => {
      if (c.deletion_eligible_at && c.deletion_eligible_at <= nowIso) return false;
      return true;
    });

    if (!currentUserId || validComments.length === 0) {
      return validComments;
    }

    // 2. Fetch current user's votes for these comments
    const commentIds = validComments.map((c) => c.id);
    const { data: userVotes, error: votesError } = await supabase
      .from('class_comment_votes')
      .select('comment_id, vote_type')
      .eq('user_id', currentUserId)
      .in('comment_id', commentIds);

    if (votesError) {
      console.warn('[DaySync Comments] Warning fetching user votes:', votesError);
      return validComments;
    }

    const voteMap = new Map<string, VoteType>();
    (userVotes || []).forEach((v) => {
      voteMap.set(v.comment_id, v.vote_type as VoteType);
    });

    return validComments.map((c) => ({
      ...c,
      user_vote: voteMap.get(c.id) || null,
    }));
  } catch (err) {
    console.warn('[DaySync Comments] Supabase fetch error, fallback to local:', err);
    const all = getLocalComments();
    const votes = getLocalVotes();
    const active = all.filter((c) => {
      if (c.occurrence_id !== occurrenceId) return false;
      if (c.expires_at <= nowIso) return false;
      if (c.deletion_eligible_at && c.deletion_eligible_at <= nowIso) return false;
      return true;
    });

    return active.map((c) => ({
      ...c,
      user_vote: currentUserId ? votes[c.id]?.[currentUserId] || null : null,
    }));
  }
}

/**
 * Creates a new comment on a specific class occurrence.
 * Enforces 1-280 characters length and trimmed whitespace.
 */
export async function createClassComment(
  occurrenceId: string,
  rawContent: string,
  expiresAt: Date,
  user: StudentAuthUser,
  userId: string
): Promise<ClassComment> {
  const content = rawContent.trim();
  if (!content) {
    throw new Error('Comment cannot be blank.');
  }
  if (content.length > 280) {
    throw new Error('Comment exceeds the maximum length of 280 characters.');
  }

  if (expiresAt.getTime() <= Date.now()) {
    throw new Error('This class occurrence has already ended.');
  }

  const authorName = user.name || 'Student';
  const expiresAtIso = expiresAt.toISOString();

  if (!isSupabaseConfigured) {
    // Local dev mock
    const newComment: ClassComment = {
      id: 'mock-' + Math.random().toString(36).substring(2, 9),
      occurrence_id: occurrenceId,
      user_id: userId || 'mock-user',
      author_name: authorName,
      content,
      upvotes_count: 0,
      downvotes_count: 0,
      deletion_eligible_at: null,
      expires_at: expiresAtIso,
      created_at: new Date().toISOString(),
      user_vote: null,
    };

    const all = getLocalComments();
    all.push(newComment);
    saveLocalComments(all);
    return newComment;
  }

  try {
    const { data, error } = await supabase
      .from('class_comments')
      .insert({
        occurrence_id: occurrenceId,
        user_id: userId,
        author_name: authorName,
        content,
        expires_at: expiresAtIso,
      })
      .select('*')
      .single();

    if (error) {
      console.warn('[DaySync Comments] Supabase insert error, saving to local fallback:', error.message);
      const newComment: ClassComment = {
        id: 'local-' + Math.random().toString(36).substring(2, 9),
        occurrence_id: occurrenceId,
        user_id: userId || 'local-user',
        author_name: authorName,
        content,
        upvotes_count: 0,
        downvotes_count: 0,
        deletion_eligible_at: null,
        expires_at: expiresAtIso,
        created_at: new Date().toISOString(),
        user_vote: null,
      };
      const all = getLocalComments();
      all.push(newComment);
      saveLocalComments(all);
      return newComment;
    }

    return {
      ...(data as ClassComment),
      user_vote: null,
    };
  } catch (err) {
    console.warn('[DaySync Comments] Supabase insert threw error, using local fallback:', err);
    const newComment: ClassComment = {
      id: 'local-' + Math.random().toString(36).substring(2, 9),
      occurrence_id: occurrenceId,
      user_id: userId || 'local-user',
      author_name: authorName,
      content,
      upvotes_count: 0,
      downvotes_count: 0,
      deletion_eligible_at: null,
      expires_at: expiresAtIso,
      created_at: new Date().toISOString(),
      user_vote: null,
    };
    const all = getLocalComments();
    all.push(newComment);
    saveLocalComments(all);
    return newComment;
  }
}

/**
 * Casts, switches, or toggles an upvote or downvote using the atomic database RPC.
 */
export async function voteClassComment(
  commentId: string,
  voteType: VoteType,
  userId?: string
): Promise<{
  action: string;
  user_vote: VoteType | null;
  upvotes_count: number;
  downvotes_count: number;
  deletion_eligible_at: string | null;
}> {
  if (!isSupabaseConfigured) {
    return localVoteSimulation(commentId, voteType, userId);
  }

  try {
    // Authoritative server-side atomic vote call
    const { data, error } = await supabase.rpc('cast_comment_vote', {
      p_comment_id: commentId,
      p_vote_type: voteType,
    });

    if (error) {
      console.warn('[DaySync Comments] Supabase RPC error, using local vote simulation:', error.message);
      return localVoteSimulation(commentId, voteType, userId);
    }

    return data;
  } catch (err) {
    console.warn('[DaySync Comments] RPC call threw, fallback to local vote simulation:', err);
    return localVoteSimulation(commentId, voteType, userId);
  }
}

function localVoteSimulation(
  commentId: string,
  voteType: VoteType,
  userId?: string
) {
  const all = getLocalComments();
  const commentIndex = all.findIndex((c) => c.id === commentId);
  if (commentIndex === -1) {
    return {
      action: 'created',
      user_vote: voteType,
      upvotes_count: 1,
      downvotes_count: 0,
      deletion_eligible_at: null,
    };
  }

  const comment = all[commentIndex];
  const votes = getLocalVotes();
  if (!votes[commentId]) votes[commentId] = {};

  const effectiveUserId = userId || 'local-user';
  const currentVote = votes[commentId][effectiveUserId];

  let action = 'created';
  let newVote: VoteType | null = voteType;

  if (currentVote === voteType) {
    delete votes[commentId][effectiveUserId];
    action = 'removed';
    newVote = null;
  } else {
    votes[commentId][effectiveUserId] = voteType;
    action = currentVote ? 'switched' : 'created';
  }

  saveLocalVotes(votes);

  let up = 0;
  let down = 0;
  for (const v of Object.values(votes[commentId])) {
    if (v === 'up') up++;
    if (v === 'down') down++;
  }

  let deletion_eligible_at = comment.deletion_eligible_at;
  if (down > up) {
    if (!deletion_eligible_at) {
      deletion_eligible_at = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    }
  } else {
    deletion_eligible_at = null;
  }

  comment.upvotes_count = up;
  comment.downvotes_count = down;
  comment.deletion_eligible_at = deletion_eligible_at;
  all[commentIndex] = comment;
  saveLocalComments(all);

  return {
    action,
    user_vote: newVote,
    upvotes_count: up,
    downvotes_count: down,
    deletion_eligible_at,
  };
}

/**
 * Allows the author of a comment to delete it.
 */
export async function deleteClassComment(commentId: string): Promise<void> {
  const all = getLocalComments().filter((c) => c.id !== commentId);
  saveLocalComments(all);

  if (!isSupabaseConfigured) return;

  try {
    await supabase.from('class_comments').delete().eq('id', commentId);
  } catch (err) {
    console.warn('[DaySync Comments] Supabase delete warning:', err);
  }
}

/**
 * Subscribes to realtime updates for a specific class occurrence.
 * Fires `onUpdate` whenever a comment is inserted, updated (votes/grace period changed), or deleted.
 */
export function subscribeToClassComments(
  occurrenceId: string,
  onUpdate: () => void
): () => void {
  if (!isSupabaseConfigured) {
    return () => {};
  }

  // Create a clean scoped channel
  const channelName = `comments:${occurrenceId}`;
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'class_comments',
        filter: `occurrence_id=eq.${occurrenceId}`,
      },
      () => {
        onUpdate();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

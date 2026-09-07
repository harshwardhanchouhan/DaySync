-- ============================================================================
-- DaySync: Temporary Public Class Comment & Update System
-- ============================================================================
-- Attached to EACH SPECIFIC CLASS OCCURRENCE.
-- Auto-expires when the class ends.
-- 5-minute downvote grace period deletion enforced server-side.
-- ============================================================================

-- ─── 1. Class Comments Table ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS class_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  occurrence_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  author_name TEXT NOT NULL,
  content TEXT NOT NULL CHECK (char_length(trim(content)) > 0 AND char_length(content) <= 280),
  upvotes_count INT NOT NULL DEFAULT 0,
  downvotes_count INT NOT NULL DEFAULT 0,
  deletion_eligible_at TIMESTAMPTZ DEFAULT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for high-performance scoped querying and scheduled cleanups
CREATE INDEX IF NOT EXISTS idx_class_comments_occurrence ON class_comments (occurrence_id);
CREATE INDEX IF NOT EXISTS idx_class_comments_user ON class_comments (user_id);
CREATE INDEX IF NOT EXISTS idx_class_comments_deletion_eligible ON class_comments (deletion_eligible_at) WHERE deletion_eligible_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_class_comments_expires ON class_comments (expires_at);

-- ─── 2. Class Comment Votes Table (Normalized & Atomic) ──────────────────────
CREATE TABLE IF NOT EXISTS class_comment_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID REFERENCES class_comments(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('up', 'down')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_class_comment_user_vote UNIQUE (comment_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_class_comment_votes_comment ON class_comment_votes (comment_id);
CREATE INDEX IF NOT EXISTS idx_class_comment_votes_user ON class_comment_votes (user_id);

-- ─── 3. Vote Synchronization & 5-Minute Deletion Grace Trigger ───────────────
-- Rules:
-- 1. If downvotes > upvotes:
--    - If deletion timer is not already running (deletion_eligible_at IS NULL):
--      Start 5-minute countdown (NOW() + INTERVAL '5 minutes')
--    - If already running: Keep existing timestamp (do not reset on subsequent downvotes)
-- 2. If downvotes <= upvotes:
--    - Cancel countdown (deletion_eligible_at = NULL)
-- 3. If later downvotes > upvotes again: A fresh 5-minute timer starts.

CREATE OR REPLACE FUNCTION handle_class_comment_vote_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_comment_id UUID;
  v_upvotes INT;
  v_downvotes INT;
  v_current_deletion_eligible TIMESTAMPTZ;
  v_new_deletion_eligible TIMESTAMPTZ;
BEGIN
  IF (TG_OP = 'DELETE') THEN
    v_comment_id := OLD.comment_id;
  ELSE
    v_comment_id := NEW.comment_id;
  END IF;

  -- Compute accurate vote totals atomically
  SELECT
    COALESCE(COUNT(*) FILTER (WHERE vote_type = 'up'), 0),
    COALESCE(COUNT(*) FILTER (WHERE vote_type = 'down'), 0)
  INTO v_upvotes, v_downvotes
  FROM class_comment_votes
  WHERE comment_id = v_comment_id;

  -- Inspect existing grace-period state
  SELECT deletion_eligible_at INTO v_current_deletion_eligible
  FROM class_comments
  WHERE id = v_comment_id;

  -- Apply 5-minute downvote grace-period rule
  IF v_downvotes > v_upvotes THEN
    IF v_current_deletion_eligible IS NULL THEN
      v_new_deletion_eligible := NOW() + INTERVAL '5 minutes';
    ELSE
      v_new_deletion_eligible := v_current_deletion_eligible;
    END IF;
  ELSE
    v_new_deletion_eligible := NULL;
  END IF;

  UPDATE class_comments
  SET
    upvotes_count = v_upvotes,
    downvotes_count = v_downvotes,
    deletion_eligible_at = v_new_deletion_eligible
  WHERE id = v_comment_id;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_class_comment_vote_change ON class_comment_votes;
CREATE TRIGGER trg_class_comment_vote_change
AFTER INSERT OR UPDATE OR DELETE ON class_comment_votes
FOR EACH ROW
EXECUTE FUNCTION handle_class_comment_vote_change();

-- ─── 4. Server-Side Cleanup Function ─────────────────────────────────────────
-- Purges comments whose 5-minute grace period has elapsed OR whose class has ended.
-- Can be called via pg_cron, background workers, or client RPC.
CREATE OR REPLACE FUNCTION clean_expired_class_comments()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_count INT;
BEGIN
  WITH deleted AS (
    DELETE FROM class_comments
    WHERE (deletion_eligible_at IS NOT NULL AND deletion_eligible_at <= NOW())
       OR (expires_at <= NOW())
    RETURNING id
  )
  SELECT COUNT(*) INTO v_deleted_count FROM deleted;

  RETURN v_deleted_count;
END;
$$;

-- Optional pg_cron registration if pg_cron extension is available on Supabase instance
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule('clean-expired-class-comments', '* * * * *', 'SELECT clean_expired_class_comments()');
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- ─── 5. Atomic Voting RPC (Race-Condition Free & Client-Safe) ─────────────────
CREATE OR REPLACE FUNCTION cast_comment_vote(
  p_comment_id UUID,
  p_vote_type TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_existing_vote TEXT;
  v_action TEXT;
  v_comment RECORD;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to vote';
  END IF;

  IF p_vote_type NOT IN ('up', 'down') THEN
    RAISE EXCEPTION 'Invalid vote type. Must be up or down';
  END IF;

  -- Ensure comment exists and is actively eligible for interaction
  SELECT * INTO v_comment
  FROM class_comments
  WHERE id = p_comment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Comment not found';
  END IF;

  IF v_comment.expires_at <= NOW() OR (v_comment.deletion_eligible_at IS NOT NULL AND v_comment.deletion_eligible_at <= NOW()) THEN
    RAISE EXCEPTION 'Cannot vote on expired or deleted comment';
  END IF;

  -- Check user's current vote
  SELECT vote_type INTO v_existing_vote
  FROM class_comment_votes
  WHERE comment_id = p_comment_id AND user_id = v_user_id;

  IF v_existing_vote IS NULL THEN
    INSERT INTO class_comment_votes (comment_id, user_id, vote_type)
    VALUES (p_comment_id, v_user_id, p_vote_type);
    v_action := 'created';
  ELSIF v_existing_vote = p_vote_type THEN
    -- Clicking active vote removes it (toggle)
    DELETE FROM class_comment_votes
    WHERE comment_id = p_comment_id AND user_id = v_user_id;
    v_action := 'removed';
  ELSE
    -- Switching vote (up -> down or down -> up)
    UPDATE class_comment_votes
    SET vote_type = p_vote_type, updated_at = NOW()
    WHERE comment_id = p_comment_id AND user_id = v_user_id;
    v_action := 'switched';
  END IF;

  -- Re-read authoritative updated comment state
  SELECT * INTO v_comment
  FROM class_comments
  WHERE id = p_comment_id;

  RETURN jsonb_build_object(
    'action', v_action,
    'comment_id', p_comment_id,
    'upvotes_count', v_comment.upvotes_count,
    'downvotes_count', v_comment.downvotes_count,
    'deletion_eligible_at', v_comment.deletion_eligible_at,
    'user_vote', CASE WHEN v_action = 'removed' THEN NULL ELSE p_vote_type END
  );
END;
$$;

-- ─── 6. Row Level Security (RLS) ─────────────────────────────────────────────
ALTER TABLE class_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_comment_votes ENABLE ROW LEVEL SECURITY;

-- Class Comments: Public / authenticated read for active, unexpired comments only
DROP POLICY IF EXISTS "Allow read active class comments" ON class_comments;
CREATE POLICY "Allow read active class comments"
ON class_comments FOR SELECT
TO authenticated, anon
USING (
  expires_at > NOW() AND
  (deletion_eligible_at IS NULL OR deletion_eligible_at > NOW())
);

-- Class Comments: Insert own comment for upcoming/active class
DROP POLICY IF EXISTS "Allow insert own class comments" ON class_comments;
CREATE POLICY "Allow insert own class comments"
ON class_comments FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id AND
  expires_at > NOW() AND
  char_length(trim(content)) > 0 AND
  char_length(content) <= 280
);

-- Class Comments: Author can delete their own comment
DROP POLICY IF EXISTS "Allow author delete own comments" ON class_comments;
CREATE POLICY "Allow author delete own comments"
ON class_comments FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Class Comment Votes: Users can only read their own votes
DROP POLICY IF EXISTS "Allow read own votes" ON class_comment_votes;
CREATE POLICY "Allow read own votes"
ON class_comment_votes FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Class Comment Votes: Insert/Update/Delete strictly own votes
DROP POLICY IF EXISTS "Allow insert own votes" ON class_comment_votes;
CREATE POLICY "Allow insert own votes"
ON class_comment_votes FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow update own votes" ON class_comment_votes;
CREATE POLICY "Allow update own votes"
ON class_comment_votes FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow delete own votes" ON class_comment_votes;
CREATE POLICY "Allow delete own votes"
ON class_comment_votes FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- ─── 7. Enable Supabase Realtime ─────────────────────────────────────────────
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE class_comments;
EXCEPTION WHEN OTHERS THEN
  NULL; -- Publication already contains table or realtime not configured
END $$;

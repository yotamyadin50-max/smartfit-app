-- ============================================================
-- SmartFit: Friends system tables
-- Run this in Supabase SQL Editor
-- ============================================================

-- Friend invite links
CREATE TABLE IF NOT EXISTS friend_invites (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Bidirectional friendships
CREATE TABLE IF NOT EXISTS friendships (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_b_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_a_id, user_b_id)
);

-- Friend notifications (share, added, removed)
CREATE TABLE IF NOT EXISTS friend_notifications (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_name      TEXT DEFAULT '',
  to_user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type           TEXT NOT NULL,
  data           JSONB DEFAULT '{}',
  read           BOOLEAN DEFAULT false,
  created_at     TIMESTAMPTZ DEFAULT now()
);

-- Row Level Security
ALTER TABLE friend_invites        ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships           ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_notifications  ENABLE ROW LEVEL SECURITY;

-- Policies: friend_invites
-- SELECT: any authenticated user can read an invite by ID (the UUID is the secret token — unguessable)
CREATE POLICY "Authenticated users can read invites" ON friend_invites FOR SELECT USING (auth.uid() IS NOT NULL);
-- INSERT: only the creator can create their own invite
CREATE POLICY "Owner creates invite"      ON friend_invites FOR INSERT WITH CHECK (auth.uid() = creator_id);
-- DELETE: only the creator can delete their own invite
CREATE POLICY "Owner deletes invite"      ON friend_invites FOR DELETE USING (auth.uid() = creator_id);

-- Policies: friendships
CREATE POLICY "See own friendships"       ON friendships FOR SELECT USING (auth.uid() = user_a_id OR auth.uid() = user_b_id);
CREATE POLICY "Create friendship"         ON friendships FOR INSERT WITH CHECK (auth.uid() = user_a_id);
CREATE POLICY "Delete own friendship"     ON friendships FOR DELETE USING (auth.uid() = user_a_id OR auth.uid() = user_b_id);

-- Policies: friend_notifications
CREATE POLICY "See own notifications"     ON friend_notifications FOR SELECT USING (auth.uid() = to_user_id);
CREATE POLICY "Send notifications"        ON friend_notifications FOR INSERT WITH CHECK (auth.uid() = from_user_id);
CREATE POLICY "Mark own as read"          ON friend_notifications FOR UPDATE USING (auth.uid() = to_user_id);

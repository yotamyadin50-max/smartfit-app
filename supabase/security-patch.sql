-- ============================================================
-- SmartFit Security Patch — run once in Supabase SQL Editor
-- https://supabase.com/dashboard → SQL Editor
-- ============================================================

-- 1. Fix friend_invites: replace open SELECT with auth-required + add DELETE
DROP POLICY IF EXISTS "Anyone can read invites" ON friend_invites;

CREATE POLICY IF NOT EXISTS "Authenticated users can read invites"
  ON friend_invites FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY IF NOT EXISTS "Owner deletes invite"
  ON friend_invites FOR DELETE
  USING (auth.uid() = creator_id);

-- 2. Verify RLS is ON for all tables (safety check)
ALTER TABLE friend_invites       ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships          ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Done ✓

-- ============================================================
-- SmartFit: Social workout feed + same-phone joint workouts
-- Run this after supabase-friends-migration.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS workout_posts (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  creator_name       TEXT DEFAULT '',
  workout_id         TEXT,
  title              TEXT NOT NULL,
  status             TEXT NOT NULL CHECK (status IN ('planned', 'live', 'completed')),
  type               TEXT NOT NULL CHECK (type IN ('home', 'gym', 'cardio', 'strength', 'mobility', 'custom')),
  duration_min       INTEGER NOT NULL CHECK (duration_min > 0 AND duration_min <= 240),
  calories_estimate  INTEGER DEFAULT 0 CHECK (calories_estimate >= 0),
  cover_url          TEXT,
  xp                 INTEGER DEFAULT 0 CHECK (xp >= 0),
  stats              JSONB DEFAULT '{}',
  visibility         TEXT DEFAULT 'friends' CHECK (visibility IN ('friends', 'selected')),
  scheduled_at       TIMESTAMPTZ,
  created_at         TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workout_post_participants (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id       UUID NOT NULL REFERENCES workout_posts(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT DEFAULT '',
  role          TEXT NOT NULL CHECK (role IN ('host', 'participant')),
  state         TEXT NOT NULL CHECK (state IN ('invited', 'joined', 'present', 'completed')),
  joined_at     TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ,
  UNIQUE (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS workout_post_reactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     UUID NOT NULL REFERENCES workout_posts(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('like', 'fire', 'strong')),
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (post_id, user_id, type)
);

CREATE TABLE IF NOT EXISTS workout_post_comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     UUID NOT NULL REFERENCES workout_posts(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name   TEXT DEFAULT '',
  body        TEXT NOT NULL CHECK (char_length(body) <= 240),
  created_at  TIMESTAMPTZ DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS joint_workout_sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  host_name     TEXT DEFAULT '',
  workout_id    TEXT,
  title         TEXT NOT NULL,
  type          TEXT NOT NULL CHECK (type IN ('home', 'gym', 'cardio', 'strength', 'mobility', 'custom')),
  duration_min  INTEGER NOT NULL CHECK (duration_min > 0 AND duration_min <= 240),
  status        TEXT NOT NULL CHECK (status IN ('lobby', 'live', 'completed', 'cancelled', 'paused')),
  device_id     TEXT,
  started_at    TIMESTAMPTZ,
  ended_at      TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS joint_workout_session_participants (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    UUID NOT NULL REFERENCES joint_workout_sessions(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT DEFAULT '',
  role          TEXT NOT NULL CHECK (role IN ('host', 'participant')),
  state         TEXT NOT NULL CHECK (state IN ('invited', 'joined', 'present', 'completed')),
  completed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE (session_id, user_id)
);

CREATE TABLE IF NOT EXISTS joint_workout_rewards (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID NOT NULL REFERENCES joint_workout_sessions(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  xp_awarded      INTEGER NOT NULL CHECK (xp_awarded >= 0),
  streak_awarded  BOOLEAN DEFAULT false,
  achievements    JSONB DEFAULT '[]',
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE (session_id, user_id)
);

ALTER TABLE workout_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_post_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_post_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE joint_workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE joint_workout_session_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE joint_workout_rewards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read visible workout posts" ON workout_posts;
CREATE POLICY "Read visible workout posts" ON workout_posts FOR SELECT USING (
  auth.uid() = creator_id OR EXISTS (
    SELECT 1 FROM workout_post_participants p
    WHERE p.post_id = id AND p.user_id = auth.uid()
  ) OR (
    visibility = 'friends' AND EXISTS (
    SELECT 1 FROM friendships f
    WHERE (f.user_a_id = auth.uid() AND f.user_b_id = creator_id)
       OR (f.user_b_id = auth.uid() AND f.user_a_id = creator_id)
    )
  )
);

DROP POLICY IF EXISTS "Create own workout posts" ON workout_posts;
CREATE POLICY "Create own workout posts" ON workout_posts FOR INSERT WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Update own workout posts" ON workout_posts;
CREATE POLICY "Update own workout posts" ON workout_posts FOR UPDATE USING (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Read workout post participants" ON workout_post_participants;
CREATE POLICY "Read workout post participants" ON workout_post_participants FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM workout_posts p
    WHERE p.id = post_id AND (
      p.creator_id = auth.uid() OR user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM friendships f
        WHERE (f.user_a_id = auth.uid() AND f.user_b_id = p.creator_id)
           OR (f.user_b_id = auth.uid() AND f.user_a_id = p.creator_id)
      )
    )
  )
);

DROP POLICY IF EXISTS "Create workout post participants" ON workout_post_participants;
CREATE POLICY "Create workout post participants" ON workout_post_participants FOR INSERT WITH CHECK (
  user_id = auth.uid() OR EXISTS (SELECT 1 FROM workout_posts p WHERE p.id = post_id AND p.creator_id = auth.uid())
);

DROP POLICY IF EXISTS "Update workout post participants" ON workout_post_participants;
CREATE POLICY "Update workout post participants" ON workout_post_participants FOR UPDATE USING (
  user_id = auth.uid() OR EXISTS (SELECT 1 FROM workout_posts p WHERE p.id = post_id AND p.creator_id = auth.uid())
);

DROP POLICY IF EXISTS "Read workout reactions" ON workout_post_reactions;
CREATE POLICY "Read workout reactions" ON workout_post_reactions FOR SELECT USING (
  EXISTS (SELECT 1 FROM workout_posts p WHERE p.id = post_id)
);

DROP POLICY IF EXISTS "Create own workout reactions" ON workout_post_reactions;
CREATE POLICY "Create own workout reactions" ON workout_post_reactions FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Delete own workout reactions" ON workout_post_reactions;
CREATE POLICY "Delete own workout reactions" ON workout_post_reactions FOR DELETE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Read workout comments" ON workout_post_comments;
CREATE POLICY "Read workout comments" ON workout_post_comments FOR SELECT USING (
  deleted_at IS NULL AND EXISTS (SELECT 1 FROM workout_posts p WHERE p.id = post_id)
);

DROP POLICY IF EXISTS "Create own workout comments" ON workout_post_comments;
CREATE POLICY "Create own workout comments" ON workout_post_comments FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Soft delete own workout comments" ON workout_post_comments;
CREATE POLICY "Soft delete own workout comments" ON workout_post_comments FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Read joint sessions" ON joint_workout_sessions;
CREATE POLICY "Read joint sessions" ON joint_workout_sessions FOR SELECT USING (
  host_id = auth.uid() OR EXISTS (
    SELECT 1 FROM joint_workout_session_participants p
    WHERE p.session_id = id AND p.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Create own joint sessions" ON joint_workout_sessions;
CREATE POLICY "Create own joint sessions" ON joint_workout_sessions FOR INSERT WITH CHECK (host_id = auth.uid());

DROP POLICY IF EXISTS "Update own joint sessions" ON joint_workout_sessions;
CREATE POLICY "Update own joint sessions" ON joint_workout_sessions FOR UPDATE USING (host_id = auth.uid());

DROP POLICY IF EXISTS "Read joint participants" ON joint_workout_session_participants;
CREATE POLICY "Read joint participants" ON joint_workout_session_participants FOR SELECT USING (
  user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM joint_workout_sessions s
    WHERE s.id = session_id AND s.host_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Create joint participants as host" ON joint_workout_session_participants;
CREATE POLICY "Create joint participants as host" ON joint_workout_session_participants FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM joint_workout_sessions s WHERE s.id = session_id AND s.host_id = auth.uid())
);

DROP POLICY IF EXISTS "Update joint participants as host or self" ON joint_workout_session_participants;
CREATE POLICY "Update joint participants as host or self" ON joint_workout_session_participants FOR UPDATE USING (
  user_id = auth.uid() OR EXISTS (SELECT 1 FROM joint_workout_sessions s WHERE s.id = session_id AND s.host_id = auth.uid())
);

DROP POLICY IF EXISTS "Read own or hosted rewards" ON joint_workout_rewards;
CREATE POLICY "Read own or hosted rewards" ON joint_workout_rewards FOR SELECT USING (
  user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM joint_workout_sessions s
    WHERE s.id = session_id AND s.host_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Create rewards as host" ON joint_workout_rewards;
CREATE POLICY "Create rewards as host" ON joint_workout_rewards FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM joint_workout_sessions s WHERE s.id = session_id AND s.host_id = auth.uid())
);

-- Server-side reward distribution. The host can complete a same-phone session
-- once, and every present participant receives a reward row, progress row, XP,
-- streak, and workout count. This keeps reward updates idempotent.
CREATE OR REPLACE FUNCTION public.complete_joint_workout_rewards(
  p_session_id UUID,
  p_rewards JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session joint_workout_sessions%ROWTYPE;
  v_reward RECORD;
  v_existing_xp INTEGER;
  v_new_xp INTEGER;
BEGIN
  SELECT * INTO v_session
  FROM joint_workout_sessions
  WHERE id = p_session_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'joint session not found';
  END IF;

  IF v_session.host_id <> auth.uid() THEN
    RAISE EXCEPTION 'only the host can complete this session';
  END IF;

  UPDATE joint_workout_sessions
  SET status = 'completed',
      ended_at = COALESCE(ended_at, now())
  WHERE id = p_session_id;

  FOR v_reward IN
    SELECT *
    FROM jsonb_to_recordset(p_rewards)
      AS r(user_id UUID, xp_awarded INTEGER, streak_awarded BOOLEAN, achievements JSONB)
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM joint_workout_session_participants p
      WHERE p.session_id = p_session_id
        AND p.user_id = v_reward.user_id
        AND p.state IN ('present', 'completed')
    ) THEN
      CONTINUE;
    END IF;

    INSERT INTO joint_workout_rewards (
      session_id,
      user_id,
      xp_awarded,
      streak_awarded,
      achievements
    ) VALUES (
      p_session_id,
      v_reward.user_id,
      GREATEST(0, v_reward.xp_awarded),
      COALESCE(v_reward.streak_awarded, true),
      COALESCE(v_reward.achievements, '[]'::jsonb)
    )
    ON CONFLICT (session_id, user_id) DO NOTHING;

    UPDATE joint_workout_session_participants
    SET state = 'completed',
        completed_at = COALESCE(completed_at, now())
    WHERE session_id = p_session_id
      AND user_id = v_reward.user_id;

    INSERT INTO progress (
      user_id,
      date,
      type,
      duration
    ) VALUES (
      v_reward.user_id,
      now(),
      'joint_workout',
      v_session.duration_min
    );

    SELECT COALESCE((stats->>'xp')::INTEGER, 0)
    INTO v_existing_xp
    FROM profiles
    WHERE id = v_reward.user_id;

    v_new_xp := COALESCE(v_existing_xp, 0) + GREATEST(0, v_reward.xp_awarded);

    INSERT INTO profiles (id, stats, updated_at)
    VALUES (
      v_reward.user_id,
      jsonb_build_object(
        'xp', v_new_xp,
        'level', 1,
        'streak', CASE WHEN COALESCE(v_reward.streak_awarded, true) THEN 1 ELSE 0 END,
        'totalWorkouts', 1
      ),
      now()
    )
    ON CONFLICT (id) DO UPDATE
    SET stats = jsonb_build_object(
      'xp', COALESCE((profiles.stats->>'xp')::INTEGER, 0) + GREATEST(0, v_reward.xp_awarded),
      'level', COALESCE((profiles.stats->>'level')::INTEGER, 1),
      'streak', COALESCE((profiles.stats->>'streak')::INTEGER, 0) + CASE WHEN COALESCE(v_reward.streak_awarded, true) THEN 1 ELSE 0 END,
      'totalWorkouts', COALESCE((profiles.stats->>'totalWorkouts')::INTEGER, 0) + 1
    ),
    updated_at = now();
  END LOOP;
END;
$$;

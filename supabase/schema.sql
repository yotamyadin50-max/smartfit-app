-- SmartFit — Supabase schema
-- Run this once in the Supabase SQL Editor: https://supabase.com/dashboard → SQL Editor

-- ── Enable Row Level Security everywhere ────────────────────────────────────

-- ── profiles ─────────────────────────────────────────────────────────────────
-- Stores the full user profile (onboarding answers) and gamification stats.
-- One row per user, identified by auth.uid().

create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  profile     jsonb,           -- full UserProfile object
  stats       jsonb,           -- UserStats (XP, level, streak, etc.)
  updated_at  timestamptz default now()
);

alter table public.profiles enable row level security;

-- Users can only read and write their own row
create policy "profiles: own row only"
  on public.profiles
  for all
  using  (auth.uid() = id)
  with check (auth.uid() = id);


-- ── progress ──────────────────────────────────────────────────────────────────
-- One row per completed workout or cardio session.

create table if not exists public.progress (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  date         timestamptz not null default now(),
  type         text not null,          -- 'workout' | 'cardio' | 'meal_plan'
  duration     integer not null,       -- minutes
  difficulty   text,                   -- 'easy' | 'medium' | 'hard'
  feeling      text,                   -- user feedback
  goal         text,
  cardio_type  text,                   -- 'run' | 'walk' | 'bike' | 'stairs'
  distance_km  numeric(6,2),
  calories     integer
);

alter table public.progress enable row level security;

create policy "progress: own rows only"
  on public.progress
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists progress_user_date on public.progress (user_id, date desc);


-- ── chat_messages ─────────────────────────────────────────────────────────────
-- Stores the AI chat history per user.

create table if not exists public.chat_messages (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  role             text not null check (role in ('user', 'assistant')),
  text             text not null,
  timestamp        timestamptz not null default now(),
  is_local_mode    boolean default false,
  local_mode_label text
);

alter table public.chat_messages enable row level security;

create policy "chat_messages: own rows only"
  on public.chat_messages
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists chat_user_ts on public.chat_messages (user_id, timestamp desc);


-- ── Friend system ──────────────────────────────────────────────────────────────

create table if not exists public.friend_invites (
  id uuid primary key default gen_random_uuid(),
  inviter_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);
alter table public.friend_invites enable row level security;
create policy "friend_invites: owner read/delete"
  on public.friend_invites for all using (auth.uid() = inviter_id);

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  user_a uuid references auth.users(id) on delete cascade,
  user_b uuid references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  unique(user_a, user_b)
);
alter table public.friendships enable row level security;
create policy "friendships: own rows"
  on public.friendships for all using (auth.uid() = user_a or auth.uid() = user_b);

create table if not exists public.friend_notifications (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid references auth.users(id) on delete cascade,
  to_user_id uuid references auth.users(id) on delete cascade,
  from_name text,
  type text,
  data jsonb default '{}'::jsonb,
  read boolean default false,
  created_at timestamptz default now()
);
alter table public.friend_notifications enable row level security;
create policy "friend_notifications: recipient only"
  on public.friend_notifications for all using (auth.uid() = to_user_id);


-- ── Social workout feed ────────────────────────────────────────────────────────
-- NOTE: these policies were rewritten from a blanket "any authenticated user
-- can read/write any row" rule to per-row ownership/participant checks, to
-- match the scoping already used in supabase-social-workouts-migration.sql.
-- IMPORTANT: this file is a one-time "create if not exists" script. If your
-- live Supabase project was created from an older version of this file, the
-- permissive policies below may already be active — open Supabase Studio →
-- Authentication → Policies and confirm, then drop the old policy by name
-- before re-running the create policy statements here.

create table if not exists public.workout_posts (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid references auth.users(id) on delete cascade,
  creator_name text,
  title text,
  type text,
  status text default 'planned',
  visibility text default 'friends',
  duration_min int default 0,
  calories_estimate int default 0,
  xp int default 0,
  cover_url text,
  workout_id text,
  scheduled_at timestamptz,
  stats jsonb default '{}'::jsonb,
  saved_by text[] default '{}',
  created_at timestamptz default now()
);
alter table public.workout_posts enable row level security;
create policy "workout_posts: read visible"
  on public.workout_posts for select using (
    auth.uid() = creator_id
    or exists (
      select 1 from public.workout_post_participants p
      where p.post_id = id and p.user_id = auth.uid()
    )
    or (
      visibility = 'friends' and exists (
        select 1 from public.friendships f
        where (f.user_a = auth.uid() and f.user_b = creator_id)
           or (f.user_b = auth.uid() and f.user_a = creator_id)
      )
    )
  );
create policy "workout_posts: insert own"
  on public.workout_posts for insert with check (auth.uid() = creator_id);
create policy "workout_posts: update own"
  on public.workout_posts for update using (auth.uid() = creator_id);
create policy "workout_posts: delete own"
  on public.workout_posts for delete using (auth.uid() = creator_id);

create table if not exists public.workout_post_participants (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.workout_posts(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  name text,
  role text default 'participant',
  state text default 'invited',
  joined_at timestamptz,
  completed_at timestamptz
);
alter table public.workout_post_participants enable row level security;
create policy "workout_post_participants: read related"
  on public.workout_post_participants for select using (
    exists (
      select 1 from public.workout_posts p
      where p.id = post_id and (
        p.creator_id = auth.uid() or user_id = auth.uid() or exists (
          select 1 from public.friendships f
          where (f.user_a = auth.uid() and f.user_b = p.creator_id)
             or (f.user_b = auth.uid() and f.user_a = p.creator_id)
        )
      )
    )
  );
create policy "workout_post_participants: insert self or as host"
  on public.workout_post_participants for insert with check (
    user_id = auth.uid()
    or exists (select 1 from public.workout_posts p where p.id = post_id and p.creator_id = auth.uid())
  );
create policy "workout_post_participants: update self or as host"
  on public.workout_post_participants for update using (
    user_id = auth.uid()
    or exists (select 1 from public.workout_posts p where p.id = post_id and p.creator_id = auth.uid())
  );

create table if not exists public.workout_post_reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.workout_posts(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  type text,
  created_at timestamptz default now(),
  unique(post_id, user_id)
);
alter table public.workout_post_reactions enable row level security;
create policy "workout_post_reactions: read on visible post"
  on public.workout_post_reactions for select using (
    exists (select 1 from public.workout_posts p where p.id = post_id)
  );
create policy "workout_post_reactions: insert own"
  on public.workout_post_reactions for insert with check (user_id = auth.uid());
create policy "workout_post_reactions: delete own"
  on public.workout_post_reactions for delete using (user_id = auth.uid());

create table if not exists public.workout_post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.workout_posts(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  user_name text,
  body text,
  deleted_at timestamptz,
  created_at timestamptz default now()
);
alter table public.workout_post_comments enable row level security;
create policy "workout_post_comments: read visible"
  on public.workout_post_comments for select using (
    deleted_at is null and exists (select 1 from public.workout_posts p where p.id = post_id)
  );
create policy "workout_post_comments: insert own"
  on public.workout_post_comments for insert with check (user_id = auth.uid());
create policy "workout_post_comments: soft-delete own"
  on public.workout_post_comments for update using (user_id = auth.uid());


-- ── Joint workout sessions ─────────────────────────────────────────────────────

create table if not exists public.joint_workout_sessions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.workout_posts(id) on delete cascade,
  host_id uuid references auth.users(id) on delete cascade,
  status text default 'lobby',
  plan jsonb default '{}'::jsonb,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz default now()
);
alter table public.joint_workout_sessions enable row level security;
create policy "joint_workout_sessions: read own or joined"
  on public.joint_workout_sessions for select using (
    host_id = auth.uid() or exists (
      select 1 from public.joint_workout_session_participants p
      where p.session_id = id and p.user_id = auth.uid()
    )
  );
create policy "joint_workout_sessions: insert own"
  on public.joint_workout_sessions for insert with check (host_id = auth.uid());
create policy "joint_workout_sessions: update own"
  on public.joint_workout_sessions for update using (host_id = auth.uid());

create table if not exists public.joint_workout_session_participants (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.joint_workout_sessions(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  name text,
  role text default 'participant',
  state text default 'invited',
  is_present boolean default false,
  completed_at timestamptz,
  joined_at timestamptz
);
alter table public.joint_workout_session_participants enable row level security;
create policy "joint_workout_session_participants: read own or as host"
  on public.joint_workout_session_participants for select using (
    user_id = auth.uid() or exists (
      select 1 from public.joint_workout_sessions s
      where s.id = session_id and s.host_id = auth.uid()
    )
  );
create policy "joint_workout_session_participants: insert as host"
  on public.joint_workout_session_participants for insert with check (
    exists (select 1 from public.joint_workout_sessions s where s.id = session_id and s.host_id = auth.uid())
  );
create policy "joint_workout_session_participants: update self or as host"
  on public.joint_workout_session_participants for update using (
    user_id = auth.uid()
    or exists (select 1 from public.joint_workout_sessions s where s.id = session_id and s.host_id = auth.uid())
  );

create table if not exists public.joint_workout_rewards (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.joint_workout_sessions(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  xp int default 0,
  badges text[] default '{}',
  unique(session_id, user_id)
);
alter table public.joint_workout_rewards enable row level security;
create policy "joint_workout_rewards: read own or as host"
  on public.joint_workout_rewards for select using (
    user_id = auth.uid() or exists (
      select 1 from public.joint_workout_sessions s
      where s.id = session_id and s.host_id = auth.uid()
    )
  );
create policy "joint_workout_rewards: insert as host"
  on public.joint_workout_rewards for insert with check (
    exists (select 1 from public.joint_workout_sessions s where s.id = session_id and s.host_id = auth.uid())
  );

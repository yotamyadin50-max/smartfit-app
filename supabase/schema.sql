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

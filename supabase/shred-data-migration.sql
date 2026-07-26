-- SmartFit — add shred_data column to profiles
-- Run once in Supabase SQL Editor

alter table public.profiles
  add column if not exists shred_data jsonb;

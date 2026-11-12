-- Run this once in the Supabase SQL editor.
-- One row per user. `data` is an AES-GCM encrypted blob made in the browser,
-- so the database never sees your entries in plain text.
create table if not exists public.journal_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  salt text not null,
  data text not null,
  rev integer not null default 1,
  updated_at timestamptz not null default now()
);

alter table public.journal_state enable row level security;

create policy "read own row" on public.journal_state
  for select using (auth.uid() = user_id);
create policy "insert own row" on public.journal_state
  for insert with check (auth.uid() = user_id);
create policy "update own row" on public.journal_state
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete own row" on public.journal_state
  for delete using (auth.uid() = user_id);

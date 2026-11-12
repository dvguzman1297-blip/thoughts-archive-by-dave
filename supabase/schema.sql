-- Run this once in the Supabase SQL editor.
-- One row per user. `data` is an AES-GCM encrypted blob made in the browser,
-- so the database never sees your entries in plain text.
create schema if not exists "thoughts-by-dave";

create table if not exists "thoughts-by-dave".journal_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  salt text not null,
  data text not null,
  rev integer not null default 1,
  updated_at timestamptz not null default now()
);

alter table "thoughts-by-dave".journal_state enable row level security;

create policy "read own row" on "thoughts-by-dave".journal_state
  for select using (auth.uid() = user_id);
create policy "insert own row" on "thoughts-by-dave".journal_state
  for insert with check (auth.uid() = user_id);
create policy "update own row" on "thoughts-by-dave".journal_state
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete own row" on "thoughts-by-dave".journal_state
  for delete using (auth.uid() = user_id);

-- Let the Supabase API reach the custom schema (signed-in users only; RLS still applies).
grant usage on schema "thoughts-by-dave" to authenticated;
grant select, insert, update, delete on "thoughts-by-dave".journal_state to authenticated;

-- AFTER running this: Project Settings -> API -> "Exposed schemas" -> add  thoughts-by-dave

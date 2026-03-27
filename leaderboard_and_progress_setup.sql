create table if not exists public.leaderboard (
  team_id text primary key,
  team_name text not null,
  found integer not null default 0,
  finished boolean not null default false,
  last_updated_at bigint not null
);

create table if not exists public.team_progress (
  team_id text primary key,
  team_name text not null,
  progress_index integer not null default 0,
  completed jsonb not null default '[]'::jsonb,
  scanned_tokens jsonb not null default '[]'::jsonb,
  used_hints integer not null default 0,
  next_hint_at bigint,
  finished boolean not null default false,
  started_at bigint not null,
  last_updated_at bigint not null
);

alter table public.leaderboard enable row level security;
alter table public.team_progress enable row level security;

drop policy if exists "leaderboard read" on public.leaderboard;
create policy "leaderboard read"
on public.leaderboard for select to anon using (true);

drop policy if exists "leaderboard insert" on public.leaderboard;
create policy "leaderboard insert"
on public.leaderboard for insert to anon with check (true);

drop policy if exists "leaderboard update" on public.leaderboard;
create policy "leaderboard update"
on public.leaderboard for update to anon using (true) with check (true);

drop policy if exists "progress read" on public.team_progress;
create policy "progress read"
on public.team_progress for select to anon using (true);

drop policy if exists "progress insert" on public.team_progress;
create policy "progress insert"
on public.team_progress for insert to anon with check (true);

drop policy if exists "progress update" on public.team_progress;
create policy "progress update"
on public.team_progress for update to anon using (true) with check (true);

alter publication supabase_realtime add table public.leaderboard;
alter publication supabase_realtime add table public.team_progress;

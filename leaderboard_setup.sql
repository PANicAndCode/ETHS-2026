create table if not exists public.leaderboard (
  team_id text primary key,
  team_name text not null,
  found integer not null default 0,
  finished boolean not null default false,
  last_updated_at bigint not null
);

alter table public.leaderboard enable row level security;

drop policy if exists "leaderboard read" on public.leaderboard;
create policy "leaderboard read"
on public.leaderboard
for select
to anon
using (true);

drop policy if exists "leaderboard write" on public.leaderboard;
create policy "leaderboard write"
on public.leaderboard
for insert
to anon
with check (true);

drop policy if exists "leaderboard update" on public.leaderboard;
create policy "leaderboard update"
on public.leaderboard
for update
to anon
using (true)
with check (true);

alter publication supabase_realtime add table public.leaderboard;

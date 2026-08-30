create table if not exists public.opportunities (
  id text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.opportunities enable row level security;
revoke all on table public.opportunities from anon;
grant select on table public.opportunities to authenticated;

drop policy if exists "authorized emails can read opportunities" on public.opportunities;
create policy "authorized emails can read opportunities"
on public.opportunities
for select
to authenticated
using (
  lower(coalesce(auth.jwt() ->> 'email', '')) in (
    '1731028510@qq.com',
    '3282695806@qq.com'
  )
);

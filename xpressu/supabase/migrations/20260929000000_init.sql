-- XpressU initial schema.
-- Conversation text is NEVER stored server-side. Only usage counters and the
-- premium flag live here.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  is_premium boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.generation_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null default (now() at time zone 'utc')::date,
  count integer not null default 0,
  primary key (user_id, day)
);

alter table public.profiles enable row level security;
alter table public.generation_usage enable row level security;

-- Users can read their own rows; writes happen only through the RPC below
-- (security definer) or the service role (RevenueCat webhook).
create policy "read own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "read own usage" on public.generation_usage
  for select using (auth.uid() = user_id);

-- Atomically consume one generation. Premium users are never blocked.
create or replace function public.consume_generation(p_free_limit integer default 5)
returns table (allowed boolean, used integer, is_premium boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_premium boolean;
  v_count integer;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select coalesce(p.is_premium, false) into v_premium from public.profiles p where p.id = v_uid;
  v_premium := coalesce(v_premium, false);

  insert into public.generation_usage as u (user_id, day, count)
  values (v_uid, (now() at time zone 'utc')::date, 0)
  on conflict (user_id, day) do nothing;

  select u.count into v_count
  from public.generation_usage u
  where u.user_id = v_uid and u.day = (now() at time zone 'utc')::date
  for update;

  if not v_premium and v_count >= p_free_limit then
    return query select false, v_count, v_premium;
    return;
  end if;

  update public.generation_usage u
  set count = u.count + 1
  where u.user_id = v_uid and u.day = (now() at time zone 'utc')::date
  returning u.count into v_count;

  return query select true, v_count, v_premium;
end;
$$;

revoke all on function public.consume_generation(integer) from public;
grant execute on function public.consume_generation(integer) to authenticated;

-- Give back a generation when the AI call fails after quota was consumed.
create or replace function public.refund_generation()
returns void
language sql
security definer
set search_path = public
as $$
  update public.generation_usage
  set count = greatest(count - 1, 0)
  where user_id = auth.uid() and day = (now() at time zone 'utc')::date;
$$;

revoke all on function public.refund_generation() from public;
grant execute on function public.refund_generation() to authenticated;

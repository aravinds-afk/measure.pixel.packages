-- ConnectSphere — Chapter Compatibility & Referral Intelligence
-- Core schema, helper functions, triggers and Row Level Security.

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
create type public.app_role as enum ('admin', 'leadership', 'member');
create type public.provenance as enum ('verified', 'member_submitted', 'ai_suggested');
create type public.member_status as enum ('active', 'inactive');
create type public.connection_status as enum (
  'recommended', 'one_to_one_scheduled', 'one_to_one_completed', 'referral_opportunity_identified',
  'introduction_made', 'referral_accepted', 'business_meeting_completed', 'business_closed', 'not_suitable'
);
create type public.relationship_kind as enum ('referral_partner', 'customer', 'vendor');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table public.chapters (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  region text,
  is_demo boolean not null default false,
  settings jsonb not null default jsonb_build_object(
    'weights', jsonb_build_object(
      'icp_overlap', 20, 'complementary_services', 20, 'referral_potential', 20, 'contact_sphere', 15,
      'industry_overlap', 10, 'geographic_alignment', 5, 'shared_problems', 5, 'relationship_potential', 5),
    'bands', jsonb_build_array(
      jsonb_build_object('min', 90, 'label', 'Exceptional Strategic Match'),
      jsonb_build_object('min', 75, 'label', 'Strong Referral Partnership'),
      jsonb_build_object('min', 60, 'label', 'Promising Business Connection'),
      jsonb_build_object('min', 40, 'label', 'Potential Relationship to Explore'),
      jsonb_build_object('min', 0, 'label', 'Limited Identified Synergy'))),
  retention_days integer check (retention_days is null or retention_days >= 30),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.chapter_roles (
  user_id uuid not null references auth.users (id) on delete cascade,
  chapter_id uuid not null references public.chapters (id) on delete cascade,
  role public.app_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (user_id, chapter_id)
);
create index chapter_roles_chapter_idx on public.chapter_roles (chapter_id);

create table public.professional_categories (
  id text primary key check (id ~ '^[a-z0-9_]+$'),
  name text not null,
  icon text,
  summary text,
  is_custom boolean not null default false,
  chapter_id uuid references public.chapters (id) on delete cascade,
  created_at timestamptz not null default now(),
  check (is_custom = (chapter_id is not null))
);

create table public.contact_spheres (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid references public.chapters (id) on delete cascade, -- null = global template
  template_key text,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  unique (chapter_id, template_key)
);
create unique index contact_spheres_template_key on public.contact_spheres (template_key) where chapter_id is null;

create table public.contact_sphere_categories (
  sphere_id uuid not null references public.contact_spheres (id) on delete cascade,
  category_id text not null references public.professional_categories (id) on delete cascade,
  role_description text,
  primary key (sphere_id, category_id)
);

create table public.import_jobs (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters (id) on delete cascade,
  filename text,
  status text not null default 'completed' check (status in ('previewed', 'completed', 'failed')),
  totals jsonb not null default '{}'::jsonb,
  issues jsonb not null default '[]'::jsonb,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index import_jobs_chapter_idx on public.import_jobs (chapter_id, created_at desc);

create table public.members (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  external_id text,
  full_name text not null check (length(trim(full_name)) > 0),
  photo_url text check (photo_url is null or photo_url ~* '^https://'),
  company text,
  category_id text references public.professional_categories (id) on delete set null,
  category_label text,
  business_description text,
  website text check (website is null or website ~* '^https?://'),
  company_sizes text[] not null default '{}',
  service_areas text[] not null default '{}',
  problems_solved text[] not null default '{}',
  keywords text[] not null default '{}',
  icp_description text,
  ideal_referral text,
  field_provenance jsonb not null default '{}'::jsonb,
  status public.member_status not null default 'active',
  deactivated_at timestamptz,
  deactivated_reason text,
  is_demo boolean not null default false,
  source text not null default 'manual' check (source in ('manual', 'csv_import', 'excel_import', 'api_sync', 'demo_seed', 'self_service')),
  import_job_id uuid references public.import_jobs (id) on delete set null,
  imported_at timestamptz,
  profile_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name_key text generated always as (
    lower(regexp_replace(trim(full_name), '\s+', ' ', 'g')) || '|' || lower(coalesce(trim(company), ''))
  ) stored
);
create unique index members_external_id_uq on public.members (chapter_id, lower(external_id)) where external_id is not null;
create unique index members_user_uq on public.members (chapter_id, user_id) where user_id is not null;
create index members_chapter_idx on public.members (chapter_id, status);
create index members_name_key_idx on public.members (chapter_id, name_key);
create index members_category_idx on public.members (category_id);
create index members_name_trgm on public.members using gin (full_name gin_trgm_ops);

-- Contact details are separated so they can be protected independently of the profile.
create table public.member_contacts (
  member_id uuid primary key references public.members (id) on delete cascade,
  email text check (email is null or email ~* '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$'),
  phone text,
  visibility text not null default 'chapter' check (visibility in ('chapter', 'private')),
  updated_at timestamptz not null default now()
);
create unique index member_contacts_email_uq on public.member_contacts (lower(email)) where email is not null;

-- Voluntary confidential figures: visible to the member and chapter admins only (leadership if shared).
create table public.member_private (
  member_id uuid primary key references public.members (id) on delete cascade,
  avg_transaction_value numeric(14, 2) check (avg_transaction_value is null or avg_transaction_value >= 0),
  share_with_leadership boolean not null default false,
  updated_at timestamptz not null default now()
);

create table public.member_services (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  provenance public.provenance not null default 'member_submitted',
  created_at timestamptz not null default now(),
  unique (member_id, name)
);

create table public.member_icps (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members (id) on delete cascade,
  segment text not null check (length(trim(segment)) > 0),
  provenance public.provenance not null default 'member_submitted',
  created_at timestamptz not null default now(),
  unique (member_id, segment)
);

create table public.industries (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  created_at timestamptz not null default now()
);
create unique index industries_name_uq on public.industries (lower(name));

create table public.member_industries (
  member_id uuid not null references public.members (id) on delete cascade,
  industry_id uuid not null references public.industries (id) on delete cascade,
  provenance public.provenance not null default 'member_submitted',
  primary key (member_id, industry_id)
);

create table public.member_relationships (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters (id) on delete cascade,
  member_id uuid not null references public.members (id) on delete cascade,
  related_member_id uuid not null references public.members (id) on delete cascade,
  kind public.relationship_kind not null,
  provenance public.provenance not null default 'member_submitted',
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  check (member_id <> related_member_id),
  unique (member_id, related_member_id, kind)
);

create table public.contact_sphere_memberships (
  sphere_id uuid not null references public.contact_spheres (id) on delete cascade,
  member_id uuid not null references public.members (id) on delete cascade,
  chapter_id uuid not null references public.chapters (id) on delete cascade,
  role text not null default 'member' check (role in ('member', 'coordinator')),
  created_at timestamptz not null default now(),
  primary key (sphere_id, member_id)
);

create table public.compatibility_assessments (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters (id) on delete cascade,
  member_a uuid not null references public.members (id) on delete cascade,
  member_b uuid not null references public.members (id) on delete cascade,
  score smallint not null check (score between 0 and 100),
  confidence numeric(3, 2) not null check (confidence between 0 and 1),
  confidence_level text not null check (confidence_level in ('High', 'Medium', 'Low')),
  label text not null,
  result jsonb not null,
  engine_version text not null,
  weights jsonb not null,
  computed_by uuid references auth.users (id) on delete set null,
  computed_at timestamptz not null default now(),
  check (member_a <> member_b)
);
create index compatibility_pair_idx on public.compatibility_assessments (chapter_id, member_a, member_b, computed_at desc);

create table public.referral_recommendations (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters (id) on delete cascade,
  assessment_id uuid references public.compatibility_assessments (id) on delete cascade,
  recommendation_key text not null,
  giver_member_id uuid not null references public.members (id) on delete cascade,
  receiver_member_id uuid not null references public.members (id) on delete cascade,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  unique (assessment_id, recommendation_key)
);
create index referral_recommendations_key_idx on public.referral_recommendations (chapter_id, recommendation_key);

create table public.recommendation_feedback (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters (id) on delete cascade,
  recommendation_key text not null,
  giver_member_id uuid references public.members (id) on delete cascade,
  receiver_member_id uuid references public.members (id) on delete cascade,
  verdict text not null check (verdict in ('useful', 'inaccurate')),
  note text,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  admin_resolution text,
  resolved_by uuid references auth.users (id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, recommendation_key)
);

-- Recommendations an admin has reviewed and withdrawn for the whole chapter.
create table public.suppressed_recommendations (
  chapter_id uuid not null references public.chapters (id) on delete cascade,
  recommendation_key text not null,
  reason text not null,
  suppressed_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (chapter_id, recommendation_key)
);

create table public.saved_connections (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters (id) on delete cascade,
  owner_member_id uuid not null references public.members (id) on delete cascade,
  target_member_id uuid not null references public.members (id) on delete cascade,
  status public.connection_status not null default 'recommended',
  score smallint check (score between 0 and 100),
  notes text,
  scripts jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (owner_member_id <> target_member_id),
  unique (owner_member_id, target_member_id)
);

create table public.connection_events (
  id bigint generated always as identity primary key,
  connection_id uuid not null references public.saved_connections (id) on delete cascade,
  chapter_id uuid not null references public.chapters (id) on delete cascade,
  from_status public.connection_status,
  to_status public.connection_status not null,
  actor uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index connection_events_conn_idx on public.connection_events (connection_id, created_at desc);

create table public.one_to_one_meetings (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters (id) on delete cascade,
  member_a uuid not null references public.members (id) on delete cascade,
  member_b uuid not null references public.members (id) on delete cascade,
  scheduled_for timestamptz,
  status text not null default 'planned' check (status in ('planned', 'scheduled', 'completed', 'cancelled')),
  brief jsonb,
  agreed_next_action text,
  follow_up_date date,
  outcome_notes text,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (member_a <> member_b)
);
create index meetings_members_idx on public.one_to_one_meetings (chapter_id, member_a, member_b);

create table public.referral_records (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters (id) on delete cascade,
  giver_member_id uuid not null references public.members (id) on delete cascade,
  receiver_member_id uuid not null references public.members (id) on delete cascade,
  connection_id uuid references public.saved_connections (id) on delete set null,
  status text not null default 'introduction_made' check (status in (
    'referral_opportunity_identified', 'introduction_made', 'referral_accepted', 'business_meeting_completed', 'business_closed', 'not_suitable')),
  description text,
  business_value numeric(14, 2) check (business_value is null or business_value >= 0),
  -- The person recording a referral confirms both members agreed to it being recorded.
  consent_confirmed boolean not null check (consent_confirmed),
  recorded_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (giver_member_id <> receiver_member_id)
);
create index referral_records_pair_idx on public.referral_records (chapter_id, giver_member_id, receiver_member_id);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters (id) on delete cascade,
  email text not null check (email ~* '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$'),
  role public.app_role not null default 'member',
  member_id uuid references public.members (id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  invited_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);
create unique index invitations_pending_uq on public.invitations (chapter_id, lower(email)) where status = 'pending';

create table public.member_change_history (
  id bigint generated always as identity primary key,
  member_id uuid not null,
  chapter_id uuid not null,
  changed_by uuid,
  operation text not null,
  changes jsonb not null,
  changed_at timestamptz not null default now()
);
create index member_change_history_idx on public.member_change_history (member_id, changed_at desc);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  chapter_id uuid,
  actor uuid,
  action text not null,
  entity text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_chapter_idx on public.audit_logs (chapter_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Helper functions (security definer so they can be used inside policies without recursion)
-- ---------------------------------------------------------------------------
create or replace function public.is_service() returns boolean
language sql stable as $$
  -- service_role JWT (Edge Functions) or a direct superuser session (migrations, seeds).
  -- session_user is used rather than current_user because current_user is the owner inside security definer functions.
  select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', '') = 'service_role'
      or session_user in ('postgres', 'supabase_admin');
$$;

create or replace function public.has_role(p_chapter uuid, p_roles public.app_role[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from chapter_roles r where r.user_id = auth.uid() and r.chapter_id = p_chapter and r.role = any (p_roles));
$$;

create or replace function public.is_chapter_member(p_chapter uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from chapter_roles r where r.user_id = auth.uid() and r.chapter_id = p_chapter);
$$;

create or replace function public.is_admin(p_chapter uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.has_role(p_chapter, array['admin']::public.app_role[]);
$$;

create or replace function public.is_leader(p_chapter uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.has_role(p_chapter, array['admin', 'leadership']::public.app_role[]);
$$;

create or replace function public.member_chapter(p_member uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select chapter_id from members where id = p_member;
$$;

create or replace function public.is_my_member(p_member uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from members m join chapter_roles r on r.chapter_id = m.chapter_id and r.user_id = auth.uid()
    where m.id = p_member and m.user_id = auth.uid() and m.status = 'active');
$$;

create or replace function public.can_view_member(p_member uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from members m where m.id = p_member and public.is_chapter_member(m.chapter_id)
      and (m.status = 'active' or public.is_leader(m.chapter_id) or m.user_id = auth.uid()));
$$;

create or replace function public.can_edit_member(p_member uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from members m where m.id = p_member and (public.is_admin(m.chapter_id) or (m.user_id = auth.uid() and public.is_chapter_member(m.chapter_id))));
$$;

create or replace function public.write_audit(p_chapter uuid, p_action text, p_entity text, p_entity_id text, p_details jsonb)
returns void language sql security definer set search_path = public as $$
  insert into audit_logs (chapter_id, actor, action, entity, entity_id, details) values (p_chapter, auth.uid(), p_action, p_entity, p_entity_id, coalesce(p_details, '{}'::jsonb));
$$;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger chapters_touch before update on public.chapters for each row execute function public.touch_updated_at();
create trigger saved_connections_touch before update on public.saved_connections for each row execute function public.touch_updated_at();
create trigger meetings_touch before update on public.one_to_one_meetings for each row execute function public.touch_updated_at();
create trigger referral_records_touch before update on public.referral_records for each row execute function public.touch_updated_at();

-- Validate scoring weights (must total 100) and bands whenever settings change.
create or replace function public.chapters_validate() returns trigger language plpgsql as $$
declare
  w jsonb := new.settings -> 'weights';
  total numeric := 0;
  k text;
begin
  if w is null then raise exception 'settings.weights is required'; end if;
  foreach k in array array['icp_overlap','complementary_services','referral_potential','contact_sphere','industry_overlap','geographic_alignment','shared_problems','relationship_potential'] loop
    if jsonb_typeof(w -> k) <> 'number' or (w ->> k)::numeric < 0 or (w ->> k)::numeric > 100 then
      raise exception 'weight % must be a number between 0 and 100', k;
    end if;
    total := total + (w ->> k)::numeric;
  end loop;
  if abs(total - 100) > 0.001 then raise exception 'weights must total 100 (got %)', total; end if;
  if jsonb_typeof(new.settings -> 'bands') <> 'array' or jsonb_array_length(new.settings -> 'bands') = 0 then
    raise exception 'settings.bands must be a non-empty array';
  end if;
  if tg_op = 'UPDATE' and new.is_demo <> old.is_demo then
    raise exception 'is_demo cannot be changed after a chapter is created';
  end if;
  return new;
end $$;
create trigger chapters_validate before insert or update on public.chapters for each row execute function public.chapters_validate();

-- Members: keep demo flag in sync with the chapter, protect admin-only columns and record provenance.
create or replace function public.members_guard() returns trigger language plpgsql set search_path = public as $$
declare
  chap_demo boolean;
  -- current_user is the function owner when the change comes from a trusted security definer RPC
  -- (e.g. accept_invitation, deactivate_member) or from the service role / migrations.
  privileged boolean := current_user not in ('authenticated', 'anon') or public.is_admin(coalesce(new.chapter_id, old.chapter_id));
  k text;
  prov jsonb;
begin
  select is_demo into chap_demo from chapters where id = new.chapter_id;
  new.is_demo := chap_demo;
  if tg_op = 'UPDATE' then
    if not privileged then
      if new.chapter_id is distinct from old.chapter_id or new.status is distinct from old.status
         or new.user_id is distinct from old.user_id or new.external_id is distinct from old.external_id
         or new.source is distinct from old.source or new.import_job_id is distinct from old.import_job_id
         or new.deactivated_at is distinct from old.deactivated_at then
        raise exception 'Only chapter admins can change membership, status or import fields' using errcode = '42501';
      end if;
      -- Anything a member edits on their own profile is member-submitted, not verified.
      prov := coalesce(old.field_provenance, '{}'::jsonb);
      foreach k in array array['company','category_id','business_description','website','company_sizes','service_areas','problems_solved','keywords','icp_description','ideal_referral','photo_url','full_name'] loop
        if to_jsonb(new) -> k is distinct from to_jsonb(old) -> k then
          prov := prov || jsonb_build_object(k, 'member_submitted');
        end if;
      end loop;
      new.field_provenance := prov;
    end if;
    if new.chapter_id is distinct from old.chapter_id then
      raise exception 'Members cannot be moved between chapters; deactivate and re-import instead';
    end if;
    new.updated_at := now();
    new.profile_updated_at := now();
  end if;
  return new;
end $$;
create trigger members_guard before insert or update on public.members for each row execute function public.members_guard();

-- Change history and audit for member records.
create or replace function public.members_history() returns trigger language plpgsql security definer set search_path = public as $$
declare
  diff jsonb := '{}'::jsonb;
  k text;
  o jsonb;
  n jsonb;
begin
  if tg_op = 'INSERT' then
    insert into member_change_history (member_id, chapter_id, changed_by, operation, changes) values (new.id, new.chapter_id, auth.uid(), 'insert', to_jsonb(new) - 'name_key');
    perform public.write_audit(new.chapter_id, 'member.created', 'member', new.id::text, jsonb_build_object('source', new.source));
    return new;
  elsif tg_op = 'DELETE' then
    insert into member_change_history (member_id, chapter_id, changed_by, operation, changes) values (old.id, old.chapter_id, auth.uid(), 'delete', jsonb_build_object('full_name', old.full_name));
    perform public.write_audit(old.chapter_id, 'member.deleted', 'member', old.id::text, jsonb_build_object('full_name', old.full_name));
    return old;
  end if;
  o := to_jsonb(old);
  n := to_jsonb(new);
  for k in select jsonb_object_keys(n) loop
    if k not in ('updated_at', 'profile_updated_at', 'name_key', 'field_provenance') and (o -> k) is distinct from (n -> k) then
      diff := diff || jsonb_build_object(k, jsonb_build_object('from', o -> k, 'to', n -> k));
    end if;
  end loop;
  if diff <> '{}'::jsonb then
    insert into member_change_history (member_id, chapter_id, changed_by, operation, changes) values (new.id, new.chapter_id, auth.uid(), 'update', diff);
    if diff ? 'status' then
      perform public.write_audit(new.chapter_id, 'member.status_changed', 'member', new.id::text, diff -> 'status');
    end if;
  end if;
  return new;
end $$;
create trigger members_history after insert or update or delete on public.members for each row execute function public.members_history();

-- Members cannot mark their own list entries as verified.
create or replace function public.child_provenance_guard() returns trigger language plpgsql set search_path = public as $$
begin
  if current_user in ('authenticated', 'anon') and not public.is_admin(public.member_chapter(new.member_id)) then
    new.provenance := 'member_submitted';
  end if;
  return new;
end $$;
create trigger member_services_provenance before insert or update on public.member_services for each row execute function public.child_provenance_guard();
create trigger member_icps_provenance before insert or update on public.member_icps for each row execute function public.child_provenance_guard();
create trigger member_industries_provenance before insert or update on public.member_industries for each row execute function public.child_provenance_guard();
create trigger member_relationships_provenance before insert or update on public.member_relationships for each row execute function public.child_provenance_guard();

-- Every row that pairs two members must keep both inside its own chapter.
create or replace function public.check_same_chapter() returns trigger language plpgsql security definer set search_path = public as $$
declare
  a uuid;
  b uuid;
  ca uuid;
  cb uuid;
begin
  case tg_table_name
    when 'member_relationships' then a := new.member_id; b := new.related_member_id;
    when 'saved_connections' then a := new.owner_member_id; b := new.target_member_id;
    when 'one_to_one_meetings' then a := new.member_a; b := new.member_b;
    when 'referral_records' then a := new.giver_member_id; b := new.receiver_member_id;
    when 'compatibility_assessments' then a := new.member_a; b := new.member_b;
    when 'contact_sphere_memberships' then a := new.member_id; b := new.member_id;
    else raise exception 'check_same_chapter: unsupported table %', tg_table_name;
  end case;
  select chapter_id into ca from members where id = a;
  select chapter_id into cb from members where id = b;
  if ca is distinct from new.chapter_id or cb is distinct from new.chapter_id then
    raise exception 'Both members must belong to chapter %', new.chapter_id using errcode = '23514';
  end if;
  return new;
end $$;
create trigger member_relationships_chapter before insert or update on public.member_relationships for each row execute function public.check_same_chapter();
create trigger saved_connections_chapter before insert or update on public.saved_connections for each row execute function public.check_same_chapter();
create trigger meetings_chapter before insert or update on public.one_to_one_meetings for each row execute function public.check_same_chapter();
create trigger referral_records_chapter before insert or update on public.referral_records for each row execute function public.check_same_chapter();
create trigger assessments_chapter before insert or update on public.compatibility_assessments for each row execute function public.check_same_chapter();
create trigger sphere_memberships_chapter before insert or update on public.contact_sphere_memberships for each row execute function public.check_same_chapter();

-- Pipeline history for saved connections.
create or replace function public.saved_connections_event() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into connection_events (connection_id, chapter_id, from_status, to_status, actor)
    values (new.id, new.chapter_id, case when tg_op = 'UPDATE' then old.status end, new.status, auth.uid());
  end if;
  return new;
end $$;
create trigger saved_connections_event after insert or update on public.saved_connections for each row execute function public.saved_connections_event();

-- Generic audit for sensitive administrative tables.
create or replace function public.audit_row() returns trigger language plpgsql security definer set search_path = public as $$
declare
  rec jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
begin
  perform public.write_audit(
    coalesce((rec ->> 'chapter_id')::uuid,
             case when tg_table_name = 'chapters' then (rec ->> 'id')::uuid end,
             case when rec ? 'member_id' then public.member_chapter((rec ->> 'member_id')::uuid) end),
    tg_table_name || '.' || lower(tg_op), tg_table_name,
    coalesce(rec ->> 'id', rec ->> 'member_id', rec ->> 'user_id', rec ->> 'recommendation_key'),
    case tg_table_name
      when 'chapters' then jsonb_build_object('settings', rec -> 'settings')
      -- never copy contact details into the audit trail
      when 'member_contacts' then jsonb_build_object('visibility', rec -> 'visibility', 'note', 'contact details changed')
      else rec end);
  return null;
end $$;
create trigger audit_chapters after update on public.chapters for each row execute function public.audit_row();
create trigger audit_roles after insert or update or delete on public.chapter_roles for each row execute function public.audit_row();
create trigger audit_invitations after insert or update or delete on public.invitations for each row execute function public.audit_row();
create trigger audit_import_jobs after insert on public.import_jobs for each row execute function public.audit_row();
create trigger audit_suppressed after insert or delete on public.suppressed_recommendations for each row execute function public.audit_row();
create trigger audit_contacts after update on public.member_contacts for each row execute function public.audit_row();

-- ---------------------------------------------------------------------------
-- Profile view (security_invoker: base-table RLS applies to the caller)
-- ---------------------------------------------------------------------------
create view public.member_profiles with (security_invoker = true) as
select
  m.id, m.chapter_id, m.user_id, m.external_id, m.full_name, m.photo_url, m.company, m.category_id,
  coalesce(c.name, m.category_label) as category_name, m.category_label, m.business_description, m.website,
  m.company_sizes, m.service_areas, m.problems_solved, m.keywords, m.icp_description, m.ideal_referral,
  m.field_provenance || jsonb_strip_nulls(jsonb_build_object(
    'services', (select 'member_submitted' from public.member_services s where s.member_id = m.id and s.provenance = 'member_submitted' limit 1),
    'customer_segments', (select 'member_submitted' from public.member_icps i where i.member_id = m.id and i.provenance = 'member_submitted' limit 1),
    'industries', (select 'member_submitted' from public.member_industries mi where mi.member_id = m.id and mi.provenance = 'member_submitted' limit 1)
  )) as field_provenance, m.status, m.is_demo, m.source, m.imported_at, m.profile_updated_at, m.created_at,
  coalesce((select array_agg(s.name order by s.created_at) from public.member_services s where s.member_id = m.id), '{}') as services,
  coalesce((select array_agg(i.segment order by i.created_at) from public.member_icps i where i.member_id = m.id), '{}') as customer_segments,
  coalesce((select array_agg(ind.name order by ind.name) from public.member_industries mi join public.industries ind on ind.id = mi.industry_id where mi.member_id = m.id), '{}') as industries,
  coalesce((select jsonb_agg(jsonb_build_object('memberId', r.related_member_id, 'kind', r.kind, 'provenance', r.provenance)) from public.member_relationships r where r.member_id = m.id), '[]'::jsonb) as relationships,
  coalesce((select array_agg(cs.template_key) from public.contact_sphere_memberships sm join public.contact_spheres cs on cs.id = sm.sphere_id where sm.member_id = m.id), '{}') as sphere_ids
from public.members m
left join public.professional_categories c on c.id = m.category_id;

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------

-- Accept a pending invitation for the signed-in user's email address.
create or replace function public.accept_invitation() returns uuid
language plpgsql security definer set search_path = public as $$
declare
  inv record;
  em text := lower(coalesce(auth.jwt() ->> 'email', ''));
  chap uuid;
begin
  if auth.uid() is null or em = '' then raise exception 'Not signed in' using errcode = '42501'; end if;
  for inv in select * from invitations where lower(email) = em and status = 'pending' order by created_at loop
    insert into chapter_roles (user_id, chapter_id, role) values (auth.uid(), inv.chapter_id, inv.role)
      on conflict (user_id, chapter_id) do update set role = excluded.role;
    if inv.member_id is not null then
      update members set user_id = auth.uid() where id = inv.member_id and user_id is null;
    else
      update members m set user_id = auth.uid()
      from member_contacts c
      where c.member_id = m.id and lower(c.email) = em and m.chapter_id = inv.chapter_id and m.user_id is null;
    end if;
    update invitations set status = 'accepted', accepted_at = now() where id = inv.id;
    chap := inv.chapter_id;
  end loop;
  return chap;
end $$;

-- Deactivate a departed member: hides them from the directory and removes their access.
create or replace function public.deactivate_member(p_member uuid, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare
  m record;
begin
  select * into m from members where id = p_member;
  if not found then raise exception 'Member not found'; end if;
  if not public.is_admin(m.chapter_id) then raise exception 'Only chapter admins can deactivate members' using errcode = '42501'; end if;
  update members set status = 'inactive', deactivated_at = now(), deactivated_reason = p_reason where id = p_member;
  if m.user_id is not null then
    delete from chapter_roles where user_id = m.user_id and chapter_id = m.chapter_id;
  end if;
  update invitations set status = 'revoked' where member_id = p_member and status = 'pending';
end $$;

create or replace function public.reactivate_member(p_member uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  m record;
begin
  select * into m from members where id = p_member;
  if not found or not public.is_admin(m.chapter_id) then raise exception 'Only chapter admins can reactivate members' using errcode = '42501'; end if;
  update members set status = 'active', deactivated_at = null, deactivated_reason = null where id = p_member;
end $$;

-- Permanently erase a member and everything linked to them (retention / right-to-erasure).
create or replace function public.erase_member(p_member uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  m record;
begin
  select * into m from members where id = p_member;
  if not found or not public.is_admin(m.chapter_id) then raise exception 'Only chapter admins can erase members' using errcode = '42501'; end if;
  delete from compatibility_assessments where member_a = p_member or member_b = p_member;
  delete from members where id = p_member;
  delete from member_change_history where member_id = p_member and operation <> 'delete';
end $$;

-- Erase inactive members past the chapter's retention period. Schedule with pg_cron.
create or replace function public.apply_retention_policy() returns integer
language plpgsql security definer set search_path = public as $$
declare
  n integer;
begin
  with doomed as (
    select m.id from members m join chapters c on c.id = m.chapter_id
    where m.status = 'inactive' and c.retention_days is not null and m.deactivated_at < now() - make_interval(days => c.retention_days)
  ), del as (delete from members where id in (select id from doomed) returning id)
  select count(*) into n from del;
  insert into audit_logs (action, entity, details) values ('retention.applied', 'members', jsonb_build_object('erased', n));
  return n;
end $$;
revoke execute on function public.apply_retention_policy() from public, anon, authenticated;

-- Aggregated referral counts per pair (no descriptions or values) for scoring.
create or replace function public.chapter_referral_stats(p_chapter uuid)
returns table (giver_member_id uuid, receiver_member_id uuid, referrals bigint, closed bigint)
language sql stable security definer set search_path = public as $$
  select r.giver_member_id, r.receiver_member_id, count(*) filter (where r.status <> 'referral_opportunity_identified'),
         count(*) filter (where r.status = 'business_closed')
  from referral_records r
  where r.chapter_id = p_chapter and (public.is_chapter_member(p_chapter) or public.is_service())
  group by 1, 2;
$$;

-- Chapter-wide analytics for admins and leadership.
create or replace function public.chapter_analytics(p_chapter uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  out jsonb;
begin
  if not (public.is_leader(p_chapter) or public.is_service()) then raise exception 'Leadership access required' using errcode = '42501'; end if;
  select jsonb_build_object(
    'activeMembers', (select count(*) from members where chapter_id = p_chapter and status = 'active'),
    'introductions', (select count(*) from referral_records where chapter_id = p_chapter and status <> 'referral_opportunity_identified'),
    'accepted', (select count(*) from referral_records where chapter_id = p_chapter and status in ('referral_accepted', 'business_meeting_completed', 'business_closed')),
    'closed', (select count(*) from referral_records where chapter_id = p_chapter and status = 'business_closed'),
    'businessGenerated', (select coalesce(sum(business_value), 0) from referral_records where chapter_id = p_chapter and status = 'business_closed'),
    'meetingsCompleted', (select count(*) from one_to_one_meetings where chapter_id = p_chapter and status = 'completed'),
    'meetingsPlanned', (select count(*) from one_to_one_meetings where chapter_id = p_chapter and status in ('planned', 'scheduled')),
    'savedConnections', (select count(*) from saved_connections where chapter_id = p_chapter),
    'feedbackUseful', (select count(*) from recommendation_feedback where chapter_id = p_chapter and verdict = 'useful'),
    'feedbackInaccurate', (select count(*) from recommendation_feedback where chapter_id = p_chapter and verdict = 'inaccurate'),
    'topPartnerships', coalesce((
      select jsonb_agg(t) from (
        select least(giver_member_id, receiver_member_id) as a, greatest(giver_member_id, receiver_member_id) as b, count(*) as referrals
        from referral_records where chapter_id = p_chapter and status <> 'referral_opportunity_identified'
        group by 1, 2 order by 3 desc limit 5) t), '[]'::jsonb),
    'participation', coalesce((
      select jsonb_agg(t) from (
        select m.id as member_id,
          (select count(*) from referral_records r where r.giver_member_id = m.id and r.status <> 'referral_opportunity_identified') as given,
          (select count(*) from referral_records r where r.receiver_member_id = m.id and r.status <> 'referral_opportunity_identified') as received,
          (select count(*) from one_to_one_meetings o where (o.member_a = m.id or o.member_b = m.id) and o.status = 'completed') as meetings
        from members m where m.chapter_id = p_chapter and m.status = 'active') t), '[]'::jsonb)
  ) into out;
  return out;
end $$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.chapters enable row level security;
alter table public.chapter_roles enable row level security;
alter table public.professional_categories enable row level security;
alter table public.contact_spheres enable row level security;
alter table public.contact_sphere_categories enable row level security;
alter table public.import_jobs enable row level security;
alter table public.members enable row level security;
alter table public.member_contacts enable row level security;
alter table public.member_private enable row level security;
alter table public.member_services enable row level security;
alter table public.member_icps enable row level security;
alter table public.industries enable row level security;
alter table public.member_industries enable row level security;
alter table public.member_relationships enable row level security;
alter table public.contact_sphere_memberships enable row level security;
alter table public.compatibility_assessments enable row level security;
alter table public.referral_recommendations enable row level security;
alter table public.recommendation_feedback enable row level security;
alter table public.suppressed_recommendations enable row level security;
alter table public.saved_connections enable row level security;
alter table public.connection_events enable row level security;
alter table public.one_to_one_meetings enable row level security;
alter table public.referral_records enable row level security;
alter table public.invitations enable row level security;
alter table public.member_change_history enable row level security;
alter table public.audit_logs enable row level security;

-- chapters
create policy chapters_select on public.chapters for select to authenticated using (public.is_chapter_member(id));
create policy chapters_update on public.chapters for update to authenticated using (public.is_admin(id)) with check (public.is_admin(id));

-- roles
create policy roles_select on public.chapter_roles for select to authenticated using (user_id = auth.uid() or public.is_admin(chapter_id));
create policy roles_admin_insert on public.chapter_roles for insert to authenticated with check (public.is_admin(chapter_id));
create policy roles_admin_update on public.chapter_roles for update to authenticated using (public.is_admin(chapter_id)) with check (public.is_admin(chapter_id));
create policy roles_admin_delete on public.chapter_roles for delete to authenticated using (public.is_admin(chapter_id) and user_id <> auth.uid());

-- reference data
create policy categories_select on public.professional_categories for select to authenticated using (chapter_id is null or public.is_chapter_member(chapter_id));
create policy categories_custom_write on public.professional_categories for all to authenticated using (is_custom and public.is_admin(chapter_id)) with check (is_custom and public.is_admin(chapter_id));
create policy spheres_select on public.contact_spheres for select to authenticated using (chapter_id is null or public.is_chapter_member(chapter_id));
create policy spheres_write on public.contact_spheres for all to authenticated using (chapter_id is not null and public.is_admin(chapter_id)) with check (chapter_id is not null and public.is_admin(chapter_id));
create policy sphere_categories_select on public.contact_sphere_categories for select to authenticated using (true);
create policy sphere_categories_write on public.contact_sphere_categories for all to authenticated
  using (exists (select 1 from contact_spheres s where s.id = sphere_id and s.chapter_id is not null and public.is_admin(s.chapter_id)))
  with check (exists (select 1 from contact_spheres s where s.id = sphere_id and s.chapter_id is not null and public.is_admin(s.chapter_id)));
create policy industries_select on public.industries for select to authenticated using (true);
create policy industries_insert on public.industries for insert to authenticated with check (true);

-- members
create policy members_select on public.members for select to authenticated
  using (public.is_chapter_member(chapter_id) and (status = 'active' or public.is_leader(chapter_id) or user_id = auth.uid()));
create policy members_insert on public.members for insert to authenticated with check (public.is_admin(chapter_id));
create policy members_update on public.members for update to authenticated
  using (public.is_admin(chapter_id) or (user_id = auth.uid() and public.is_chapter_member(chapter_id)))
  with check (public.is_admin(chapter_id) or (user_id = auth.uid() and public.is_chapter_member(chapter_id)));
create policy members_delete on public.members for delete to authenticated using (public.is_admin(chapter_id));

create policy contacts_select on public.member_contacts for select to authenticated
  using (public.can_edit_member(member_id) or (visibility = 'chapter' and public.can_view_member(member_id)));
create policy contacts_write on public.member_contacts for all to authenticated using (public.can_edit_member(member_id)) with check (public.can_edit_member(member_id));

create policy private_select on public.member_private for select to authenticated
  using (public.can_edit_member(member_id) or (share_with_leadership and public.is_leader(public.member_chapter(member_id))));
create policy private_write on public.member_private for all to authenticated using (public.can_edit_member(member_id)) with check (public.can_edit_member(member_id));

create policy services_select on public.member_services for select to authenticated using (public.can_view_member(member_id));
create policy services_write on public.member_services for all to authenticated using (public.can_edit_member(member_id)) with check (public.can_edit_member(member_id));
create policy icps_select on public.member_icps for select to authenticated using (public.can_view_member(member_id));
create policy icps_write on public.member_icps for all to authenticated using (public.can_edit_member(member_id)) with check (public.can_edit_member(member_id));
create policy member_industries_select on public.member_industries for select to authenticated using (public.can_view_member(member_id));
create policy member_industries_write on public.member_industries for all to authenticated using (public.can_edit_member(member_id)) with check (public.can_edit_member(member_id));
create policy relationships_select on public.member_relationships for select to authenticated using (public.can_view_member(member_id));
create policy relationships_write on public.member_relationships for all to authenticated using (public.can_edit_member(member_id)) with check (public.can_edit_member(member_id));

create policy sphere_memberships_select on public.contact_sphere_memberships for select to authenticated using (public.is_chapter_member(chapter_id));
create policy sphere_memberships_write on public.contact_sphere_memberships for all to authenticated using (public.is_admin(chapter_id)) with check (public.is_admin(chapter_id));

-- scoring outputs are written only by the backend scoring service (service role)
create policy assessments_select on public.compatibility_assessments for select to authenticated using (public.is_chapter_member(chapter_id));
create policy recommendations_select on public.referral_recommendations for select to authenticated using (public.is_chapter_member(chapter_id));

create policy feedback_select on public.recommendation_feedback for select to authenticated using (user_id = auth.uid() or public.is_leader(chapter_id));
create policy feedback_insert on public.recommendation_feedback for insert to authenticated
  with check (user_id = auth.uid() and public.is_chapter_member(chapter_id) and admin_resolution is null and resolved_by is null);
create policy feedback_update_own on public.recommendation_feedback for update to authenticated
  using (user_id = auth.uid() and admin_resolution is null) with check (user_id = auth.uid() and admin_resolution is null and resolved_by is null);
create policy feedback_admin_update on public.recommendation_feedback for update to authenticated using (public.is_admin(chapter_id)) with check (public.is_admin(chapter_id));

create policy suppressed_select on public.suppressed_recommendations for select to authenticated using (public.is_chapter_member(chapter_id));
create policy suppressed_write on public.suppressed_recommendations for all to authenticated using (public.is_admin(chapter_id)) with check (public.is_admin(chapter_id));

-- relationship management
create policy saved_select on public.saved_connections for select to authenticated using (public.is_my_member(owner_member_id) or public.is_leader(chapter_id));
create policy saved_insert on public.saved_connections for insert to authenticated with check (public.is_my_member(owner_member_id));
create policy saved_update on public.saved_connections for update to authenticated using (public.is_my_member(owner_member_id)) with check (public.is_my_member(owner_member_id));
create policy saved_delete on public.saved_connections for delete to authenticated using (public.is_my_member(owner_member_id));
create policy events_select on public.connection_events for select to authenticated
  using (exists (select 1 from saved_connections s where s.id = connection_id and (public.is_my_member(s.owner_member_id) or public.is_leader(s.chapter_id))));

create policy meetings_select on public.one_to_one_meetings for select to authenticated
  using (public.is_my_member(member_a) or public.is_my_member(member_b) or public.is_leader(chapter_id));
create policy meetings_insert on public.one_to_one_meetings for insert to authenticated
  with check (public.is_chapter_member(chapter_id) and (public.is_my_member(member_a) or public.is_my_member(member_b)) and created_by = auth.uid());
create policy meetings_update on public.one_to_one_meetings for update to authenticated
  using (public.is_my_member(member_a) or public.is_my_member(member_b)) with check (public.is_my_member(member_a) or public.is_my_member(member_b));
create policy meetings_delete on public.one_to_one_meetings for delete to authenticated using (created_by = auth.uid());

create policy referrals_select on public.referral_records for select to authenticated
  using (public.is_my_member(giver_member_id) or public.is_my_member(receiver_member_id) or public.is_leader(chapter_id));
create policy referrals_insert on public.referral_records for insert to authenticated
  with check (public.is_chapter_member(chapter_id) and (public.is_my_member(giver_member_id) or public.is_my_member(receiver_member_id)) and recorded_by = auth.uid());
create policy referrals_update on public.referral_records for update to authenticated
  using (public.is_my_member(giver_member_id) or public.is_my_member(receiver_member_id))
  with check (public.is_my_member(giver_member_id) or public.is_my_member(receiver_member_id));

-- administration
create policy imports_select on public.import_jobs for select to authenticated using (public.is_admin(chapter_id));
create policy invitations_admin on public.invitations for all to authenticated using (public.is_admin(chapter_id)) with check (public.is_admin(chapter_id));
create policy history_select on public.member_change_history for select to authenticated using (public.is_admin(chapter_id) or public.is_my_member(member_id));
create policy audit_select on public.audit_logs for select to authenticated using (chapter_id is not null and public.is_admin(chapter_id));

-- ---------------------------------------------------------------------------
-- Grants (anon gets nothing; RLS governs authenticated)
-- ---------------------------------------------------------------------------
revoke all on all tables in schema public from anon;
revoke all on all functions in schema public from anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage on type public.app_role, public.provenance, public.member_status, public.connection_status, public.relationship_kind to authenticated;
grant select on public.member_profiles to authenticated;
revoke insert, update, delete on public.audit_logs, public.member_change_history, public.connection_events,
  public.compatibility_assessments, public.referral_recommendations from authenticated;
revoke insert, update, delete on public.import_jobs from authenticated;
grant execute on function public.accept_invitation(), public.deactivate_member(uuid, text), public.reactivate_member(uuid),
  public.erase_member(uuid), public.chapter_referral_stats(uuid), public.chapter_analytics(uuid) to authenticated;
revoke execute on function public.write_audit(uuid, text, text, text, jsonb) from public, anon, authenticated;

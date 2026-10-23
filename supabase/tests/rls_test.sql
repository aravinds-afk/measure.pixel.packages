-- Row Level Security and integrity tests. Runs as the "authenticator" login role.
\set ON_ERROR_STOP 1
\set demo '00000000-0000-4000-8000-00000000d001'
\set real '20000000-0000-4000-8000-000000000001'
\set priya_m '00000000-0000-4000-8000-000000000001'
\set arjun_m '00000000-0000-4000-8000-000000000002'
\set sneha_m '00000000-0000-4000-8000-000000000006'
\set tara_m '00000000-0000-4000-8000-000000000016'
\set as_admin 'set role authenticated; select set_config(''request.jwt.claims'', ''{"sub":"10000000-0000-4000-8000-000000000001","email":"admin@demo.invalid","role":"authenticated"}'', false) \\g /dev/null'
\set as_priya 'set role authenticated; select set_config(''request.jwt.claims'', ''{"sub":"10000000-0000-4000-8000-000000000002","email":"priya@demo.invalid","role":"authenticated"}'', false) \\g /dev/null'
\set as_leader 'set role authenticated; select set_config(''request.jwt.claims'', ''{"sub":"10000000-0000-4000-8000-000000000003","email":"leader@demo.invalid","role":"authenticated"}'', false) \\g /dev/null'
\set as_outsider 'set role authenticated; select set_config(''request.jwt.claims'', ''{"sub":"10000000-0000-4000-8000-000000000004","email":"outsider@real.invalid","role":"authenticated"}'', false) \\g /dev/null'
\set as_invitee 'set role authenticated; select set_config(''request.jwt.claims'', ''{"sub":"10000000-0000-4000-8000-000000000005","email":"invitee@demo.invalid","role":"authenticated"}'', false) \\g /dev/null'
\set as_anon 'set role anon; select set_config(''request.jwt.claims'', '''', false) \\g /dev/null'
\set as_service 'set role service_role; select set_config(''request.jwt.claims'', ''{"role":"service_role"}'', false) \\g /dev/null'

-- 1. anonymous users get nothing
:as_anon
do $$ begin
  begin perform 1 from public.members limit 1; raise exception 'FAIL anon read members';
  exception when insufficient_privilege then raise notice 'PASS 01 anon cannot read members'; end;
end $$;

-- 2. other chapters are invisible
:as_outsider
do $$ declare n int; begin
  select count(*) into n from public.members where chapter_id = '00000000-0000-4000-8000-00000000d001';
  if n <> 0 then raise exception 'FAIL outsider sees % demo members', n; end if;
  select count(*) into n from public.members; if n <> 1 then raise exception 'FAIL outsider sees % members', n; end if;
  select count(*) into n from public.member_profiles; if n <> 1 then raise exception 'FAIL outsider view rows %', n; end if;
  raise notice 'PASS 02 chapter isolation (tables and security_invoker view)';
end $$;

-- 3. a member sees active chapter members and their profiles
:as_priya
do $$ declare n int; s text[]; begin
  select count(*) into n from public.members; if n <> 17 then raise exception 'FAIL priya sees % members', n; end if;
  select services into s from public.member_profiles where full_name = 'Arjun Mehta';
  if array_length(s, 1) <> 5 then raise exception 'FAIL services in view: %', s; end if;
  raise notice 'PASS 03 member reads directory and joined profile view';
end $$;

-- 4. cannot edit someone else's profile
do $$ declare n int; begin
  update public.members set company = 'hacked' where id = '00000000-0000-4000-8000-000000000002';
  get diagnostics n = row_count; if n <> 0 then raise exception 'FAIL priya edited arjun'; end if;
  delete from public.member_services where member_id = '00000000-0000-4000-8000-000000000002';
  get diagnostics n = row_count; if n <> 0 then raise exception 'FAIL priya deleted arjun services'; end if;
  raise notice 'PASS 04 members cannot edit other profiles';
end $$;

-- 5. can edit own profile; provenance and history recorded
do $$ declare p jsonb; begin
  update public.members set business_description = 'Updated by Priya' where id = '00000000-0000-4000-8000-000000000001';
  select field_provenance into p from public.members where id = '00000000-0000-4000-8000-000000000001';
  if p ->> 'business_description' <> 'member_submitted' then raise exception 'FAIL provenance %', p; end if;
  if not exists (select 1 from public.member_change_history where member_id = '00000000-0000-4000-8000-000000000001' and changes ? 'business_description') then
    raise exception 'FAIL history not visible to owner'; end if;
  insert into public.member_services (member_id, name, provenance) values ('00000000-0000-4000-8000-000000000001', 'Self-added service', 'verified');
  if (select provenance from public.member_services where name = 'Self-added service') <> 'member_submitted' then raise exception 'FAIL member self-verified a service'; end if;
  if (select field_provenance ->> 'services' from public.member_profiles where id = '00000000-0000-4000-8000-000000000001') <> 'member_submitted' then raise exception 'FAIL view provenance'; end if;
  raise notice 'PASS 05 self-edit marks member_submitted provenance (incl. list entries) and records history';
end $$;

-- 6. cannot change protected columns on own record
do $$ begin
  begin update public.members set status = 'inactive' where id = '00000000-0000-4000-8000-000000000001'; raise exception 'FAIL status change allowed';
  exception when insufficient_privilege then raise notice 'PASS 06 member cannot change own status'; end;
end $$;

-- 7. members cannot create members
do $$ begin
  begin insert into public.members (chapter_id, full_name) values ('00000000-0000-4000-8000-00000000d001', 'Sneaky'); raise exception 'FAIL insert allowed';
  exception when insufficient_privilege then raise notice 'PASS 07 member cannot insert members'; end;
end $$;

-- 8. contact visibility
do $$ declare n int; begin
  select count(*) into n from public.member_contacts where member_id = '00000000-0000-4000-8000-000000000006';
  if n <> 0 then raise exception 'FAIL private contact visible'; end if;
  select count(*) into n from public.member_contacts where member_id = '00000000-0000-4000-8000-000000000002';
  if n <> 1 then raise exception 'FAIL chapter-visible contact hidden'; end if;
  raise notice 'PASS 08 private contact details hidden, chapter-visible shown';
end $$;

-- 9. confidential values
do $$ declare n int; begin
  select count(*) into n from public.member_private; if n <> 1 then raise exception 'FAIL priya sees % private rows', n; end if;
  raise notice 'PASS 09 confidential transaction values limited to owner';
end $$;

-- 10. scores can only be written by the backend
do $$ begin
  begin
    insert into public.compatibility_assessments (chapter_id, member_a, member_b, score, confidence, confidence_level, label, result, engine_version, weights)
    values ('00000000-0000-4000-8000-00000000d001', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002', 100, 1, 'High', 'x', '{}', 'x', '{}');
    raise exception 'FAIL client wrote a score';
  exception when insufficient_privilege then raise notice 'PASS 10 clients cannot forge compatibility scores'; end;
end $$;

-- 11. saved connections are private to the owner (leadership can view activity)
do $$ begin
  insert into public.saved_connections (chapter_id, owner_member_id, target_member_id, status) values
    ('00000000-0000-4000-8000-00000000d001', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002', 'recommended');
  update public.saved_connections set status = 'one_to_one_scheduled' where owner_member_id = '00000000-0000-4000-8000-000000000001';
  begin
    insert into public.saved_connections (chapter_id, owner_member_id, target_member_id) values
      ('00000000-0000-4000-8000-00000000d001', '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001');
    raise exception 'FAIL saved as someone else';
  exception when insufficient_privilege then null; end;
  if (select count(*) from public.connection_events) <> 2 then raise exception 'FAIL pipeline events'; end if;
  raise notice 'PASS 11a saved connections owner-only, pipeline history recorded';
end $$;
:as_outsider
do $$ begin
  if exists (select 1 from public.saved_connections) then raise exception 'FAIL outsider sees shortlist'; end if;
end $$;
:as_leader
do $$ begin
  if not exists (select 1 from public.saved_connections) then raise exception 'FAIL leadership cannot see activity'; end if;
  raise notice 'PASS 11b shortlist hidden from others, visible to leadership/admin';
end $$;

-- 12. referral records require consent and same-chapter members
:as_priya
do $$ begin
  begin
    insert into public.referral_records (chapter_id, giver_member_id, receiver_member_id, consent_confirmed, recorded_by)
    values ('00000000-0000-4000-8000-00000000d001', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002', false, auth.uid());
    raise exception 'FAIL no-consent referral';
  exception when check_violation then null; end;
  insert into public.referral_records (chapter_id, giver_member_id, receiver_member_id, consent_confirmed, recorded_by, description)
  values ('00000000-0000-4000-8000-00000000d001', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002', true, auth.uid(), 'test');
  begin
    insert into public.referral_records (chapter_id, giver_member_id, receiver_member_id, consent_confirmed, recorded_by)
    values ('00000000-0000-4000-8000-00000000d001', '00000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-0000000000a1', true, auth.uid());
    raise exception 'FAIL cross-chapter referral';
  exception when check_violation or insufficient_privilege then null; end;
  begin
    insert into public.referral_records (chapter_id, giver_member_id, receiver_member_id, consent_confirmed, recorded_by)
    values ('00000000-0000-4000-8000-00000000d001', '00000000-0000-4000-8000-000000000006', '00000000-0000-4000-8000-000000000007', true, auth.uid());
    raise exception 'FAIL recorded referral between other members';
  exception when insufficient_privilege then null; end;
  -- Priya sees her own referral but not Sneha/Vikram's seeded history.
  if (select count(*) from public.referral_records) <> 1 then raise exception 'FAIL referral visibility'; end if;
  -- Aggregated counts for scoring are available to members.
  if (select sum(referrals) from public.chapter_referral_stats('00000000-0000-4000-8000-00000000d001')) <> 7 then raise exception 'FAIL stats'; end if;
  raise notice 'PASS 12 referral consent, chapter scoping and participant-only visibility';
end $$;

-- 13. analytics restricted to leadership
do $$ begin
  begin perform public.chapter_analytics('00000000-0000-4000-8000-00000000d001'); raise exception 'FAIL member saw analytics';
  exception when insufficient_privilege then raise notice 'PASS 13a members cannot read chapter analytics'; end;
end $$;
:as_leader
do $$ declare a jsonb; begin
  a := public.chapter_analytics('00000000-0000-4000-8000-00000000d001');
  if (a ->> 'introductions')::int <> 7 then raise exception 'FAIL analytics %', a; end if;
  raise notice 'PASS 13b leadership analytics';
end $$;

-- 14. members cannot read audit logs or change roles
:as_priya
do $$ declare n int; begin
  if exists (select 1 from public.audit_logs) then raise exception 'FAIL audit visible'; end if;
  delete from public.chapter_roles where user_id = '10000000-0000-4000-8000-000000000001';
  get diagnostics n = row_count; if n <> 0 then raise exception 'FAIL removed admin role'; end if;
  begin insert into public.chapter_roles (user_id, chapter_id, role) values (auth.uid(), '00000000-0000-4000-8000-00000000d001', 'admin'); raise exception 'FAIL self-promotion';
  exception when insufficient_privilege or unique_violation then null; end;
  update public.chapter_roles set role = 'admin' where user_id = auth.uid();
  if public.is_admin('00000000-0000-4000-8000-00000000d001') then raise exception 'FAIL self-promotion via update'; end if;
  raise notice 'PASS 14 no audit access, no role escalation';
end $$;

-- 15. admin: weights validation and audit
:as_admin
do $$ begin
  begin
    update public.chapters set settings = jsonb_set(settings, '{weights,icp_overlap}', '50') where id = '00000000-0000-4000-8000-00000000d001';
    raise exception 'FAIL invalid weights accepted';
  exception when raise_exception then null; end;
  update public.chapters set settings = jsonb_set(jsonb_set(settings, '{weights,icp_overlap}', '25'), '{weights,relationship_potential}', '0') where id = '00000000-0000-4000-8000-00000000d001';
  if not exists (select 1 from public.audit_logs where action = 'chapters.update') then raise exception 'FAIL audit missing'; end if;
  raise notice 'PASS 15 weights validated (must total 100) and changes audited';
end $$;

-- 16. admin deactivation hides member from directory but not from leadership
do $$ begin
  perform public.deactivate_member('00000000-0000-4000-8000-000000000016', 'Left the chapter');
  if not exists (select 1 from public.audit_logs where action = 'member.status_changed') then raise exception 'FAIL deactivate audit'; end if;
  raise notice 'PASS 16a admin deactivated member (audited)';
end $$;
:as_priya
do $$ begin
  if exists (select 1 from public.members where id = '00000000-0000-4000-8000-000000000016') then raise exception 'FAIL inactive visible to member'; end if;
  begin perform public.deactivate_member('00000000-0000-4000-8000-000000000002', 'x'); raise exception 'FAIL member deactivated';
  exception when insufficient_privilege then null; end;
  raise notice 'PASS 16b inactive members hidden from members; only admins deactivate';
end $$;
:as_leader
do $$ begin
  if not exists (select 1 from public.members where id = '00000000-0000-4000-8000-000000000016') then raise exception 'FAIL leader cannot see inactive'; end if;
  raise notice 'PASS 16c leadership still sees inactive members';
end $$;

-- 17. integrity: no cross-chapter moves, demo flag enforced, external ids unique
:as_admin
do $$ begin
  begin update public.members set chapter_id = '20000000-0000-4000-8000-000000000001' where id = '00000000-0000-4000-8000-000000000003'; raise exception 'FAIL moved chapter';
  exception when raise_exception or insufficient_privilege then null; end;
  insert into public.members (chapter_id, full_name, external_id) values ('00000000-0000-4000-8000-00000000d001', 'New Demo Person', 'NEW-1');
  if not (select is_demo from public.members where external_id = 'NEW-1') then raise exception 'FAIL demo flag not forced'; end if;
  begin insert into public.members (chapter_id, full_name, external_id) values ('00000000-0000-4000-8000-00000000d001', 'Dup', 'new-1'); raise exception 'FAIL duplicate external id';
  exception when unique_violation then null; end;
  begin insert into public.members (chapter_id, full_name) values ('20000000-0000-4000-8000-000000000001', 'Into other chapter'); raise exception 'FAIL admin wrote into another chapter';
  exception when insufficient_privilege then null; end;
  raise notice 'PASS 17 chapter integrity, demo separation and duplicate prevention';
end $$;

-- 18. invitation acceptance links the account to the member record
:as_invitee
do $$ declare c uuid; begin
  c := public.accept_invitation();
  if c is distinct from '00000000-0000-4000-8000-00000000d001'::uuid then raise exception 'FAIL accept returned %', c; end if;
  if not public.is_my_member('00000000-0000-4000-8000-000000000017') then raise exception 'FAIL member not linked'; end if;
  raise notice 'PASS 18 invitation acceptance grants role and links member record';
end $$;

-- 19. backend (service role) can write scores
:as_service
do $$ begin
  insert into public.compatibility_assessments (chapter_id, member_a, member_b, score, confidence, confidence_level, label, result, engine_version, weights)
  values ('00000000-0000-4000-8000-00000000d001', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002', 93, 1, 'High', 'Exceptional', '{}', '1.0.0', '{}');
  raise notice 'PASS 19 service role stores assessments';
end $$;
:as_priya
do $$ begin
  if not exists (select 1 from public.compatibility_assessments) then raise exception 'FAIL member cannot read assessments'; end if;
  raise notice 'PASS 20 members read chapter assessments';
end $$;

-- 21. erasure
:as_admin
do $$ begin
  perform public.erase_member('00000000-0000-4000-8000-000000000016');
  if exists (select 1 from public.members where id = '00000000-0000-4000-8000-000000000016') then raise exception 'FAIL not erased'; end if;
  raise notice 'PASS 21 admin erasure removes member data';
end $$;
\echo 'ALL RLS TESTS PASSED'

-- Test fixtures (run as superuser after the seed).
insert into auth.users (id, email) values
  ('10000000-0000-4000-8000-000000000001', 'admin@demo.invalid'),
  ('10000000-0000-4000-8000-000000000002', 'priya@demo.invalid'),
  ('10000000-0000-4000-8000-000000000003', 'leader@demo.invalid'),
  ('10000000-0000-4000-8000-000000000004', 'outsider@real.invalid'),
  ('10000000-0000-4000-8000-000000000005', 'invitee@demo.invalid');
insert into public.chapter_roles (user_id, chapter_id, role) values
  ('10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-00000000d001', 'admin'),
  ('10000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-00000000d001', 'member'),
  ('10000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-00000000d001', 'leadership');
update public.members set user_id = '10000000-0000-4000-8000-000000000001' where id = '00000000-0000-4000-8000-000000000002';
update public.members set user_id = '10000000-0000-4000-8000-000000000002' where id = '00000000-0000-4000-8000-000000000001';
update public.members set user_id = '10000000-0000-4000-8000-000000000003' where id = '00000000-0000-4000-8000-000000000012';
update public.member_contacts set visibility = 'private' where member_id = '00000000-0000-4000-8000-000000000006';
insert into public.member_private (member_id, avg_transaction_value) values
  ('00000000-0000-4000-8000-000000000001', 50000), ('00000000-0000-4000-8000-000000000002', 90000);
insert into public.chapters (id, name, is_demo) values ('20000000-0000-4000-8000-000000000001', 'Real Chapter', false);
insert into public.chapter_roles (user_id, chapter_id, role) values ('10000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000001', 'admin');
insert into public.members (id, chapter_id, full_name, category_id, user_id, source) values
  ('20000000-0000-4000-8000-0000000000a1', '20000000-0000-4000-8000-000000000001', 'Real Person', 'business_lawyer', '10000000-0000-4000-8000-000000000004', 'csv_import');
insert into public.invitations (chapter_id, email, role, member_id) values
  ('00000000-0000-4000-8000-00000000d001', 'invitee@demo.invalid', 'member', '00000000-0000-4000-8000-000000000017');

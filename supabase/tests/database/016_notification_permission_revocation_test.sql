begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select * from no_plan();
insert into auth.users (id, email)
values
  ('c5000000-0000-4000-8000-000000000001', 'draft-dm@example.test'),
  ('c5000000-0000-4000-8000-000000000002', 'draft-sa-one@example.test'),
  ('c5000000-0000-4000-8000-000000000003', 'draft-sa-two@example.test'),
  ('c5000000-0000-4000-8000-000000000004', 'draft-outsider@example.test'),
  ('c5000000-0000-4000-8000-000000000005', 'draft-other-dm@example.test');

insert into public.tai_khoan (
  id, ho_ten, email, so_dien_thoai, ma_dai_ly, manager_id, trang_thai
)
values
  ('c5000000-0000-4000-8000-000000000001', 'Draft DM', 'draft-dm@example.test', '0985000001', 'DRAFT-DM', null, 'DANG_HOAT_DONG'),
  ('c5000000-0000-4000-8000-000000000002', 'Draft SA One', 'draft-sa-one@example.test', '0985000002', 'DRAFT-SA-1', 'c5000000-0000-4000-8000-000000000001', 'DANG_HOAT_DONG'),
  ('c5000000-0000-4000-8000-000000000003', 'Draft SA Two', 'draft-sa-two@example.test', '0985000003', 'DRAFT-SA-2', 'c5000000-0000-4000-8000-000000000001', 'DANG_HOAT_DONG'),
  ('c5000000-0000-4000-8000-000000000004', 'Draft Outsider', 'draft-outsider@example.test', '0985000004', 'DRAFT-OUT', null, 'DANG_HOAT_DONG'),
  ('c5000000-0000-4000-8000-000000000005', 'Draft Other DM', 'draft-other-dm@example.test', '0985000005', 'DRAFT-DM-2', null, 'DANG_HOAT_DONG');

insert into public.phan_cong_vai_tro (tai_khoan_id, vai_tro_id)
select 'c5000000-0000-4000-8000-000000000001', id from public.vai_tro where ma_vai_tro = 'DM';
insert into public.phan_cong_vai_tro (tai_khoan_id, vai_tro_id)
select 'c5000000-0000-4000-8000-000000000002', id from public.vai_tro where ma_vai_tro = 'SA';
insert into public.phan_cong_vai_tro (tai_khoan_id, vai_tro_id)
select 'c5000000-0000-4000-8000-000000000003', id from public.vai_tro where ma_vai_tro = 'SA';
insert into public.phan_cong_vai_tro (tai_khoan_id, vai_tro_id)
select 'c5000000-0000-4000-8000-000000000004', id from public.vai_tro where ma_vai_tro = 'SA';
insert into public.phan_cong_vai_tro (tai_khoan_id, vai_tro_id)
select 'c5000000-0000-4000-8000-000000000005', id from public.vai_tro where ma_vai_tro = 'DM';

-- Test fixture models the explicit ADMIN grant configured in Vai trò & quyền.
insert into public.phan_quyen_vai_tro (vai_tro_id, quyen_id, nguoi_gan_id)
select vt.id, q.id, 'c5000000-0000-4000-8000-000000000001'::uuid
from public.vai_tro vt
cross join public.quyen q
where vt.ma_vai_tro = 'DM'
  and q.ma_quyen = 'NOTIFICATION_MANAGE'
on conflict (vai_tro_id, quyen_id) do nothing;

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', 'c5000000-0000-4000-8000-000000000001', true);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'role', 'authenticated',
    'sub', 'c5000000-0000-4000-8000-000000000001',
    'amr', jsonb_build_array(jsonb_build_object('method', 'password', 'timestamp', 0))
  )::text,
  true
);


select lives_ok($$ select public.dm_create_notification('Revocation draft','Before','TIN_TỨC',array['c5000000-0000-4000-8000-000000000002'::uuid]) $$, 'DM with permission creates draft');
select set_config('test.revocation_draft',(select id::text from public.thong_bao where tieu_de='Revocation draft'),true);
select lives_ok($$ select public.dm_update_notification_draft(current_setting('test.revocation_draft')::uuid,'Revocation draft','Allowed','TIN_TỨC',array['c5000000-0000-4000-8000-000000000002'::uuid]) $$, 'DM with permission updates own draft');
reset role;
delete from public.phan_quyen_vai_tro where vai_tro_id=(select id from public.vai_tro where ma_vai_tro='DM') and quyen_id=(select id from public.quyen where ma_quyen='NOTIFICATION_MANAGE');
set local role authenticated;
select is(public.has_permission('NOTIFICATION_MANAGE'), false, 'permission has actually been revoked in existing session');
select throws_ok($$ select public.dm_create_notification('Denied','Denied','TIN_TỨC',array['c5000000-0000-4000-8000-000000000002'::uuid]) $$,'42501',null,'revoked DM cannot create');
select throws_ok($$ select public.dm_update_notification_draft(current_setting('test.revocation_draft')::uuid,'Bypassed','Denied','TIN_TỨC',array['c5000000-0000-4000-8000-000000000002'::uuid]) $$,'42501',null,'revoked DM cannot update via direct RPC');
select throws_ok($$ select public.dm_delete_notification_draft(current_setting('test.revocation_draft')::uuid) $$,'42501',null,'revoked DM cannot delete via direct RPC');
select throws_ok($$ select public.dm_send_notification(current_setting('test.revocation_draft')::uuid) $$,'42501',null,'revoked DM cannot send');
select is((select noi_dung from public.thong_bao where id=current_setting('test.revocation_draft')::uuid),'Allowed','denied requests preserve the draft');
reset role;
update public.tai_khoan set trang_thai='KHOA' where id='c5000000-0000-4000-8000-000000000001';
set local role authenticated;
select throws_ok($$ select public.dm_delete_notification_draft(current_setting('test.revocation_draft')::uuid) $$,'42501',null,'locked DM cannot mutate draft');
select * from finish();
rollback;

begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select * from no_plan();

select ok(
  not has_function_privilege('anon', 'public.dm_update_notification_draft(uuid,text,text,text,uuid[])', 'EXECUTE'),
  'anon cannot call the draft-update RPC'
);
select ok(
  not has_function_privilege('anon', 'public.dm_delete_notification_draft(uuid)', 'EXECUTE'),
  'anon cannot call the draft-delete RPC'
);
select ok(
  has_function_privilege('authenticated', 'public.dm_update_notification_draft(uuid,text,text,text,uuid[])', 'EXECUTE'),
  'authenticated may call the guarded draft-update RPC'
);
select ok(
  has_function_privilege('authenticated', 'public.dm_delete_notification_draft(uuid)', 'EXECUTE'),
  'authenticated may call the guarded draft-delete RPC'
);

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

select lives_ok(
  $$
    select public.dm_create_notification(
      'Editable draft',
      'Before editing',
      'TIN_TỨC',
      array['c5000000-0000-4000-8000-000000000002'::uuid]
    )
  $$,
  'DM can create a draft for an in-scope recipient'
);
select set_config(
  'test.edited_notification_id',
  (select id::text from public.thong_bao where tieu_de = 'Editable draft'),
  true
);

select throws_ok(
  $
    select public.dm_update_notification_draft(
      current_setting('test.edited_notification_id')::uuid,
      '   ',
      'Invalid title should be rejected',
      'TIN_TỨC',
      array['c5000000-0000-4000-8000-000000000002'::uuid]
    )
  $,
  '22023',
  null,
  'DM cannot replace a draft with an empty title'
);

select throws_ok(
  $$
    select public.dm_update_notification_draft(
      (select id from public.thong_bao where tieu_de = 'Editable draft'),
      'Must remain unchanged',
      'Invalid recipient must not mutate the draft',
      'TIN_TỨC',
      array['c5000000-0000-4000-8000-000000000004'::uuid]
    )
  $$,
  '42501',
  null,
  'DM cannot update a draft with a recipient outside its subtree'
);

select is(
  (select tieu_de from public.thong_bao where tieu_de = 'Editable draft'),
  'Editable draft'::text,
  'failed recipient validation leaves the existing draft unchanged'
);

select lives_ok(
  $$
    select public.dm_update_notification_draft(
      (select id from public.thong_bao where tieu_de = 'Editable draft'),
      'Edited draft',
      'Updated body',
      'TỰ_ĐỘNG_HỆ_THỐNG',
      array[
        'c5000000-0000-4000-8000-000000000003'::uuid,
        'c5000000-0000-4000-8000-000000000003'::uuid
      ]
    )
  $$,
  'DM can update an owned draft and replace the recipient list'
);

select results_eq(
  $$
    select tieu_de, noi_dung, loai, trang_thai
    from public.thong_bao
    where tieu_de = 'Edited draft'
  $$,
  $$
    values ('Edited draft'::text, 'Updated body'::text, 'TỰ_ĐỘNG_HỆ_THỐNG'::text, 'CHƯA_GỬI'::text)
  $$,
  'draft content and type are updated while state remains draft'
);

select is(
  (
    select count(*)::bigint
    from public.thong_bao_nguoi_nhan tbn
    join public.thong_bao tb on tb.id = tbn.thong_bao_id
    where tb.tieu_de = 'Edited draft'
  ),
  1::bigint,
  'duplicate recipient IDs are stored only once'
);
select is(
  (
    select tbn.tai_khoan_id
    from public.thong_bao_nguoi_nhan tbn
    join public.thong_bao tb on tb.id = tbn.thong_bao_id
    where tb.tieu_de = 'Edited draft'
  ),
  'c5000000-0000-4000-8000-000000000003'::uuid,
  'draft update replaces the old recipient with the selected in-scope recipient'
);

-- Another DM cannot operate on a draft owned by the first DM, even if it knows the UUID.
select set_config('request.jwt.claim.sub', 'c5000000-0000-4000-8000-000000000005', true);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'role', 'authenticated',
    'sub', 'c5000000-0000-4000-8000-000000000005',
    'amr', jsonb_build_array(jsonb_build_object('method', 'password', 'timestamp', 0))
  )::text,
  true
);
select throws_ok(
  $
    select public.dm_update_notification_draft(
      current_setting('test.edited_notification_id')::uuid,
      'Cross-owner edit',
      'Not permitted',
      'TIN_TỨC',
      array['c5000000-0000-4000-8000-000000000002'::uuid]
    )
  $,
  '22023',
  null,
  'another DM cannot update a draft it did not create'
);
select throws_ok(
  $ select public.dm_delete_notification_draft(current_setting('test.edited_notification_id')::uuid) $,
  '22023',
  null,
  'another DM cannot delete a draft it did not create'
);

-- Return to the creator before testing delete and send.
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

select lives_ok(
  $$
    select public.dm_create_notification(
      'Delete draft',
      'Discard me',
      'TIN_TỨC',
      array['c5000000-0000-4000-8000-000000000002'::uuid]
    )
  $$,
  'DM can create a second draft for deletion coverage'
);

select lives_ok(
  $$
    select public.dm_delete_notification_draft(
      (select id from public.thong_bao where tieu_de = 'Delete draft')
    )
  $$,
  'DM can delete an owned draft'
);
select is(
  (select count(*)::bigint from public.thong_bao where tieu_de = 'Delete draft'),
  0::bigint,
  'deleted draft is removed'
);
select is(
  (select count(*)::bigint from public.thong_bao_nguoi_nhan tbn
   where tbn.tai_khoan_id = 'c5000000-0000-4000-8000-000000000002'::uuid),
  0::bigint,
  'deleting a draft cascades to its recipient rows'
);

select lives_ok(
  $$
    select public.dm_send_notification(
      (select id from public.thong_bao where tieu_de = 'Edited draft')
    )
  $$,
  'DM can send the updated draft'
);

select throws_ok(
  $$
    select public.dm_update_notification_draft(
      (select id from public.thong_bao where tieu_de = 'Edited draft'),
      'Tampered sent message',
      'A sent notification must be immutable',
      'TIN_TỨC',
      array['c5000000-0000-4000-8000-000000000003'::uuid]
    )
  $$,
  '22023',
  null,
  'DM cannot update a sent notification'
);
select throws_ok(
  $$
    select public.dm_delete_notification_draft(
      (select id from public.thong_bao where tieu_de = 'Edited draft')
    )
  $$,
  '22023',
  null,
  'DM cannot delete a sent notification'
);
select is(
  (select trang_thai from public.thong_bao where tieu_de = 'Edited draft'),
  'ĐÃ_GỬI'::text,
  'a sent notification remains sent after rejected update and delete attempts'
);

-- A non-DM recipient cannot invoke either draft-management RPC directly.
select set_config('request.jwt.claim.sub', 'c5000000-0000-4000-8000-000000000003', true);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'role', 'authenticated',
    'sub', 'c5000000-0000-4000-8000-000000000003',
    'amr', jsonb_build_array(jsonb_build_object('method', 'password', 'timestamp', 0))
  )::text,
  true
);

select throws_ok(
  $$
    select public.dm_update_notification_draft(
      (select id from public.thong_bao where tieu_de = 'Edited draft'),
      'SA tamper',
      'Not permitted',
      'TIN_TỨC',
      array['c5000000-0000-4000-8000-000000000003'::uuid]
    )
  $$,
  '42501',
  null,
  'SA cannot invoke draft update even when it can read the sent notification'
);
select throws_ok(
  $$
    select public.dm_delete_notification_draft(
      (select id from public.thong_bao where tieu_de = 'Edited draft')
    )
  $$,
  '42501',
  null,
  'SA cannot invoke draft delete'
);

reset role;
select * from finish();
rollback;

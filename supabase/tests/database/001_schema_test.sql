begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select * from no_plan();

-- Phase 1 must expose exactly the nine canonical physical business tables.
select is(
  (
    select count(*)::bigint
    from pg_catalog.pg_tables
    where schemaname = 'public'
      and tablename in (
        'tai_khoan', 'vai_tro', 'quyen', 'phan_cong_vai_tro',
        'phan_quyen_vai_tro', 'khach_hang', 'hoat_dong',
        'thong_bao', 'thong_bao_nguoi_nhan'
      )
  ),
  9::bigint,
  'all nine Phase 1 business tables exist'
);

select hasnt_table('public', 'nhom', 'Phase 1 does not invent a group table');
select hasnt_table('public', 'bao_cao', 'Phase 1 does not persist report output');
select hasnt_table('public', 'thong_ke', 'Phase 1 does not persist statistics output');
select hasnt_table('public', 'ky_thong_ke', 'statistics period remains a query parameter');
select hasnt_table('public', 'customer_activity', 'Phase 1 does not invent a customer/activity junction');
select hasnt_table('public', 'audit_log', 'Phase 1 does not invent a business audit-log table');

select has_pk('public', 'tai_khoan', 'tai_khoan has a primary key');
select has_pk('public', 'vai_tro', 'vai_tro has a primary key');
select has_pk('public', 'quyen', 'quyen has a primary key');
select has_pk('public', 'phan_cong_vai_tro', 'phan_cong_vai_tro has a primary key');
select has_pk('public', 'phan_quyen_vai_tro', 'phan_quyen_vai_tro has a primary key');
select has_pk('public', 'khach_hang', 'khach_hang has a primary key');
select has_pk('public', 'hoat_dong', 'hoat_dong has a primary key');
select has_pk('public', 'thong_bao', 'thong_bao has a primary key');
select has_pk('public', 'thong_bao_nguoi_nhan', 'thong_bao_nguoi_nhan has a primary key');

select col_type_is('public', 'tai_khoan', 'id', 'uuid', 'tai_khoan.id uses UUID');
select col_type_is('public', 'khach_hang', 'ngay_sinh', 'date', 'customer birth date uses date');
select col_type_is('public', 'hoat_dong', 'thoi_gian', 'timestamp with time zone', 'activity time uses timestamptz');

select ok(
  exists (
    select 1
    from pg_catalog.pg_constraint c
    join pg_catalog.pg_class t on t.oid = c.conrelid
    join pg_catalog.pg_namespace n on n.oid = t.relnamespace
    join pg_catalog.pg_class rt on rt.oid = c.confrelid
    join pg_catalog.pg_namespace rn on rn.oid = rt.relnamespace
    where n.nspname = 'public'
      and t.relname = 'tai_khoan'
      and c.conname = 'tai_khoan_auth_user_fk'
      and rn.nspname = 'auth'
      and rt.relname = 'users'
      and c.confdeltype = 'r'
  ),
  'tai_khoan.id references auth.users(id) with RESTRICT delete behavior'
);

select ok(
  exists (
    select 1
    from pg_catalog.pg_constraint c
    join pg_catalog.pg_class t on t.oid = c.conrelid
    join pg_catalog.pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'tai_khoan'
      and c.conname = 'tai_khoan_manager_fk'
      and c.confdeltype = 'n'
  ),
  'manager_id uses ON DELETE SET NULL'
);

select ok(
  exists (
    select 1
    from pg_catalog.pg_constraint c
    join pg_catalog.pg_class t on t.oid = c.conrelid
    join pg_catalog.pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'phan_cong_vai_tro'
      and c.conname = 'phan_cong_vai_tro_tai_khoan_fk'
      and c.confdeltype = 'c'
  )
  and exists (
    select 1
    from pg_catalog.pg_constraint c
    join pg_catalog.pg_class t on t.oid = c.conrelid
    join pg_catalog.pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'phan_cong_vai_tro'
      and c.conname = 'phan_cong_vai_tro_vai_tro_fk'
      and c.confdeltype = 'c'
  ),
  'role assignments cascade when either parent is deleted'
);

select ok(
  exists (
    select 1
    from pg_catalog.pg_constraint c
    join pg_catalog.pg_class t on t.oid = c.conrelid
    join pg_catalog.pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'phan_quyen_vai_tro'
      and c.conname = 'phan_quyen_vai_tro_vai_tro_fk'
      and c.confdeltype = 'c'
  )
  and exists (
    select 1
    from pg_catalog.pg_constraint c
    join pg_catalog.pg_class t on t.oid = c.conrelid
    join pg_catalog.pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'phan_quyen_vai_tro'
      and c.conname = 'phan_quyen_vai_tro_quyen_fk'
      and c.confdeltype = 'c'
  ),
  'role permissions cascade when either parent is deleted'
);

select ok(
  exists (
    select 1
    from pg_catalog.pg_constraint c
    join pg_catalog.pg_class t on t.oid = c.conrelid
    join pg_catalog.pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'khach_hang'
      and c.conname = 'khach_hang_chu_so_huu_fk'
      and c.confdeltype = 'r'
  ),
  'customer ownership uses ON DELETE RESTRICT'
);

select ok(
  exists (
    select 1
    from pg_catalog.pg_constraint c
    join pg_catalog.pg_class t on t.oid = c.conrelid
    join pg_catalog.pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'hoat_dong'
      and c.conname = 'hoat_dong_tai_khoan_fk'
      and c.confdeltype = 'r'
  ),
  'activity account FK uses ON DELETE RESTRICT'
);

select ok(
  exists (
    select 1
    from pg_catalog.pg_constraint c
    join pg_catalog.pg_class t on t.oid = c.conrelid
    join pg_catalog.pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'thong_bao'
      and c.conname = 'thong_bao_nguoi_tao_fk'
      and c.confdeltype = 'r'
  ),
  'notification creator FK uses ON DELETE RESTRICT'
);

select ok(
  exists (
    select 1
    from pg_catalog.pg_constraint c
    join pg_catalog.pg_class t on t.oid = c.conrelid
    join pg_catalog.pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'thong_bao_nguoi_nhan'
      and c.conname = 'thong_bao_nguoi_nhan_thong_bao_fk'
      and c.confdeltype = 'c'
  )
  and exists (
    select 1
    from pg_catalog.pg_constraint c
    join pg_catalog.pg_class t on t.oid = c.conrelid
    join pg_catalog.pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'thong_bao_nguoi_nhan'
      and c.conname = 'thong_bao_nguoi_nhan_tai_khoan_fk'
      and c.confdeltype = 'r'
  ),
  'notification recipient FKs use CASCADE for notification and RESTRICT for account'
);

select col_is_unique('public', 'tai_khoan', 'email', 'tai_khoan email is unique');
select col_is_unique('public', 'tai_khoan', 'so_dien_thoai', 'tai_khoan phone is unique');
select col_is_unique('public', 'tai_khoan', 'ma_dai_ly', 'tai_khoan agent code is unique');
select col_is_unique('public', 'vai_tro', 'ma_vai_tro', 'role code is unique');
select col_is_unique('public', 'vai_tro', 'ten_vai_tro', 'role name is unique');
select col_is_unique('public', 'quyen', 'ma_quyen', 'permission code is unique');
select col_is_unique('public', 'phan_cong_vai_tro', array['tai_khoan_id', 'vai_tro_id'], 'role assignment pair is unique');
select col_is_unique('public', 'phan_quyen_vai_tro', array['vai_tro_id', 'quyen_id'], 'role permission pair is unique');
select col_is_unique('public', 'khach_hang', 'ma_khach_hang', 'customer code is unique');
select col_is_unique('public', 'khach_hang', 'so_dien_thoai', 'customer phone is unique');
select col_is_unique('public', 'thong_bao_nguoi_nhan', array['thong_bao_id', 'tai_khoan_id'], 'notification recipient pair is unique');

select col_has_check('public', 'tai_khoan', 'trang_thai', 'account status is constrained');
select col_has_check('public', 'khach_hang', 'loai_khach_hang', 'customer type is constrained');
select col_has_check('public', 'khach_hang', 'tinh_trang', 'customer status is constrained');
select col_has_check('public', 'khach_hang', 'nhom_tinh_cach', 'customer personality group is constrained');
select col_has_check('public', 'hoat_dong', 'loai_hoat_dong', 'activity type is constrained');
select col_has_check('public', 'hoat_dong', 'so_khach_hang_ket_noi', 'activity connection count is constrained');
select col_has_check('public', 'thong_bao', 'loai', 'notification type is constrained');
select col_has_check('public', 'thong_bao', 'trang_thai', 'notification status is constrained');

select ok(to_regclass('public.idx_tai_khoan_manager_id') is not null, 'manager index exists');
select ok(to_regclass('public.idx_phan_cong_vai_tro_vai_tro_id') is not null, 'role assignment role index exists');
select ok(to_regclass('public.idx_phan_quyen_vai_tro_quyen_id') is not null, 'role permission permission index exists');
select ok(to_regclass('public.idx_khach_hang_chu_so_huu_id') is not null, 'customer owner index exists');
select ok(to_regclass('public.idx_hoat_dong_tai_khoan_thoi_gian') is not null, 'activity account/time index exists');
select ok(to_regclass('public.idx_thong_bao_nguoi_tao_created_at') is not null, 'notification creator/time index exists');
select ok(to_regclass('public.idx_thong_bao_trang_thai') is not null, 'notification status index exists');
select ok(to_regclass('public.idx_thong_bao_nguoi_nhan_tai_khoan_da_doc') is not null, 'recipient unread index exists');

select is(
  (
    select count(*)::bigint
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in (
        'tai_khoan', 'vai_tro', 'quyen', 'phan_cong_vai_tro',
        'phan_quyen_vai_tro', 'khach_hang', 'hoat_dong',
        'thong_bao', 'thong_bao_nguoi_nhan'
      )
      and c.relrowsecurity
  ),
  9::bigint,
  'RLS is enabled on all nine Phase 1 tables'
);

select hasnt_column('public', 'tai_khoan', 'mat_khau_hash', 'business account table does not duplicate auth password hashes');
select hasnt_column('public', 'tai_khoan', 'auth_user_id', 'shared auth UUID does not add a duplicate auth_user_id');
select hasnt_column('public', 'hoat_dong', 'customer_id', 'activity does not invent a customer relationship');

select * from finish();
rollback;

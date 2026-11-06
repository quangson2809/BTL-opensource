begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select * from no_plan();
insert into auth.users (id, email)
values
  ('b4000000-0000-4000-8000-000000000001', 'batch-dm@example.test'),
  ('b4000000-0000-4000-8000-000000000002', 'batch-sa@example.test'),
  ('b4000000-0000-4000-8000-000000000003', 'batch-outsider@example.test'),
  ('b4000000-0000-4000-8000-000000000004', 'batch-pending@example.test'),
  ('b4000000-0000-4000-8000-000000000005', 'batch-admin@example.test');

insert into public.tai_khoan (
  id, ho_ten, email, so_dien_thoai, ma_dai_ly, manager_id, trang_thai
)
values
  ('b4000000-0000-4000-8000-000000000001', 'Batch DM', 'batch-dm@example.test', '0940000001', 'BATCH-DM', null, 'DANG_HOAT_DONG'),
  ('b4000000-0000-4000-8000-000000000002', 'Batch SA', 'batch-sa@example.test', '0940000002', 'BATCH-SA', 'b4000000-0000-4000-8000-000000000001', 'DANG_HOAT_DONG'),
  ('b4000000-0000-4000-8000-000000000003', 'Batch Outsider', 'batch-outsider@example.test', '0940000003', 'BATCH-OUT', null, 'DANG_HOAT_DONG'),
  ('b4000000-0000-4000-8000-000000000004', 'Batch Pending', 'batch-pending@example.test', '0940000004', 'BATCH-PENDING', null, 'CHO_PHE_DUYET'),
  ('b4000000-0000-4000-8000-000000000005', 'Batch Admin', 'batch-admin@example.test', '0940000005', 'BATCH-ADMIN', null, 'DANG_HOAT_DONG');

insert into public.phan_cong_vai_tro (tai_khoan_id, vai_tro_id)
select 'b4000000-0000-4000-8000-000000000001', id from public.vai_tro where ma_vai_tro = 'DM';
insert into public.phan_cong_vai_tro (tai_khoan_id, vai_tro_id)
select 'b4000000-0000-4000-8000-000000000002', id from public.vai_tro where ma_vai_tro = 'SA';
insert into public.phan_cong_vai_tro (tai_khoan_id, vai_tro_id)
select 'b4000000-0000-4000-8000-000000000003', id from public.vai_tro where ma_vai_tro = 'SA';
insert into public.phan_cong_vai_tro (tai_khoan_id, vai_tro_id)
select 'b4000000-0000-4000-8000-000000000004', id from public.vai_tro where ma_vai_tro = 'SA';
insert into public.phan_cong_vai_tro (tai_khoan_id, vai_tro_id)
select 'b4000000-0000-4000-8000-000000000005', id from public.vai_tro where ma_vai_tro = 'ADMIN';

-- Simulate ADMIN explicitly granting the notification-management capability to DM.
insert into public.phan_quyen_vai_tro (vai_tro_id, quyen_id, nguoi_gan_id)
select vt.id, q.id, 'b4000000-0000-4000-8000-000000000005'::uuid
from public.vai_tro vt
join public.quyen q on q.ma_quyen = 'NOTIFICATION_MANAGE'
where vt.ma_vai_tro = 'DM'
on conflict (vai_tro_id, quyen_id) do nothing;

insert into public.khach_hang (
  id, chu_so_huu_id, ma_khach_hang, ho_ten, so_dien_thoai, gioi_tinh,
  ngay_sinh, dia_chi, so_thich, ghi_chu, loai_khach_hang, tinh_trang, nhom_tinh_cach
)
values
  ('b4100000-0000-4000-8000-000000000001', 'b4000000-0000-4000-8000-000000000002', 'BATCH-KH-1', 'Khách batch', '0950000001', 'Nam', '1990-01-01', 'Hà Nội', 'Đọc sách', 'Batch', 'MUC_TIEU', 'BẠN', 'D');

insert into public.hoat_dong (
  id, tai_khoan_id, loai_hoat_dong, dia_diem, thoi_gian, so_khach_hang_ket_noi
)
values
  ('b4200000-0000-4000-8000-000000000001', 'b4000000-0000-4000-8000-000000000002', 'TƯ_VẤN', 'Hà Nội', now(), 3);

insert into auth.users(id,email) values ('e9000000-0000-4000-8000-000000000001','group-1@example.test');
insert into public.tai_khoan(id,ho_ten,email,so_dien_thoai,ma_dai_ly,manager_id,trang_thai) values ('e9000000-0000-4000-8000-000000000001','Group 1','group-1@example.test','0919000001','GROUP-1','b4000000-0000-4000-8000-000000000001','DANG_HOAT_DONG');
insert into public.phan_cong_vai_tro(tai_khoan_id,vai_tro_id) select 'e9000000-0000-4000-8000-000000000001',id from public.vai_tro where ma_vai_tro='UM';
insert into auth.users(id,email) values ('e9000000-0000-4000-8000-000000000002','group-2@example.test');
insert into public.tai_khoan(id,ho_ten,email,so_dien_thoai,ma_dai_ly,manager_id,trang_thai) values ('e9000000-0000-4000-8000-000000000002','Group 2','group-2@example.test','0919000002','GROUP-2','b4000000-0000-4000-8000-000000000001','DANG_HOAT_DONG');
insert into public.phan_cong_vai_tro(tai_khoan_id,vai_tro_id) select 'e9000000-0000-4000-8000-000000000002',id from public.vai_tro where ma_vai_tro='UM';
insert into auth.users(id,email) values ('e9000000-0000-4000-8000-000000000003','group-3@example.test');
insert into public.tai_khoan(id,ho_ten,email,so_dien_thoai,ma_dai_ly,manager_id,trang_thai) values ('e9000000-0000-4000-8000-000000000003','Group 3','group-3@example.test','0919000003','GROUP-3','e9000000-0000-4000-8000-000000000001','DANG_HOAT_DONG');
insert into public.phan_cong_vai_tro(tai_khoan_id,vai_tro_id) select 'e9000000-0000-4000-8000-000000000003',id from public.vai_tro where ma_vai_tro='UM';
insert into auth.users(id,email) values ('e9000000-0000-4000-8000-000000000004','group-4@example.test');
insert into public.tai_khoan(id,ho_ten,email,so_dien_thoai,ma_dai_ly,manager_id,trang_thai) values ('e9000000-0000-4000-8000-000000000004','Group 4','group-4@example.test','0919000004','GROUP-4','e9000000-0000-4000-8000-000000000003','DANG_HOAT_DONG');
insert into public.phan_cong_vai_tro(tai_khoan_id,vai_tro_id) select 'e9000000-0000-4000-8000-000000000004',id from public.vai_tro where ma_vai_tro='SA';
insert into auth.users(id,email) values ('e9000000-0000-4000-8000-000000000005','group-5@example.test');
insert into public.tai_khoan(id,ho_ten,email,so_dien_thoai,ma_dai_ly,manager_id,trang_thai) values ('e9000000-0000-4000-8000-000000000005','Group 5','group-5@example.test','0919000005','GROUP-5','e9000000-0000-4000-8000-000000000002','DANG_HOAT_DONG');
insert into public.phan_cong_vai_tro(tai_khoan_id,vai_tro_id) select 'e9000000-0000-4000-8000-000000000005',id from public.vai_tro where ma_vai_tro='SA';
insert into auth.users(id,email) values ('e9000000-0000-4000-8000-000000000006','group-6@example.test');
insert into public.tai_khoan(id,ho_ten,email,so_dien_thoai,ma_dai_ly,manager_id,trang_thai) values ('e9000000-0000-4000-8000-000000000006','Group 6','group-6@example.test','0919000006','GROUP-6',null,'DANG_HOAT_DONG');
insert into public.phan_cong_vai_tro(tai_khoan_id,vai_tro_id) select 'e9000000-0000-4000-8000-000000000006',id from public.vai_tro where ma_vai_tro='UM';
insert into public.hoat_dong(tai_khoan_id,loai_hoat_dong,dia_diem,thoi_gian,so_khach_hang_ket_noi) values ('e9000000-0000-4000-8000-000000000001','TƯ_VẤN','Group test','2026-11-06 00:00+07',1);
insert into public.hoat_dong(tai_khoan_id,loai_hoat_dong,dia_diem,thoi_gian,so_khach_hang_ket_noi) values ('e9000000-0000-4000-8000-000000000004','TƯ_VẤN','Group test','2026-11-06 00:00+07',1);
insert into public.hoat_dong(tai_khoan_id,loai_hoat_dong,dia_diem,thoi_gian,so_khach_hang_ket_noi) values ('e9000000-0000-4000-8000-000000000005','TƯ_VẤN','Group test','2026-11-06 00:00+07',1);
insert into public.hoat_dong(tai_khoan_id,loai_hoat_dong,dia_diem,thoi_gian,so_khach_hang_ket_noi) values ('e9000000-0000-4000-8000-000000000006','TƯ_VẤN','Group test','2026-11-06 00:00+07',1);

select ok(not has_function_privilege('anon','public.report_team_scope(timestamptz,timestamptz)','EXECUTE'),'anonymous cannot execute team reporting');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"b4000000-0000-4000-8000-000000000001","role":"authenticated","amr":[{"method":"password","timestamp":0}]}',true);

select is((select count(*) from public.report_team_scope('2026-11-06 00:00+07','2026-11-07 00:00+07')),2::bigint,'DM sees two disjoint UM groups');
select is((select member_count from public.report_team_scope('2026-11-06 00:00+07','2026-11-07 00:00+07') where team_id='e9000000-0000-4000-8000-000000000001'),3::bigint,'outer UM includes its nested UM and SA once');
select is((select activity_count from public.report_team_scope('2026-11-06 00:00+07','2026-11-07 00:00+07') where team_id='e9000000-0000-4000-8000-000000000001'),2::bigint,'group activity counts use the same reporting period');
select is((select sum(member_count)::bigint from public.report_team_scope('2026-11-06 00:00+07','2026-11-07 00:00+07')),5::bigint,'no overlapping groups or unrelated/direct DM staff counted');
select is((select count(*) from public.report_team_scope('2020-01-01','2020-01-02') where activity_count=0),2::bigint,'empty period retains groups with zero metrics');
select throws_ok($$select * from public.report_team_scope(now(),now())$$,'22023',null,'invalid range rejected');
select set_config('request.jwt.claims','{"sub":"e9000000-0000-4000-8000-000000000001","role":"authenticated","amr":[{"method":"password","timestamp":0}]}',true);

select is((select count(*) from public.report_team_scope('2026-11-06 00:00+07','2026-11-07 00:00+07')),1::bigint,'UM sees only own group');
select is((select team_id from public.report_team_scope('2026-11-06 00:00+07','2026-11-07 00:00+07')),'e9000000-0000-4000-8000-000000000001'::uuid,'UM does not see sibling UM group');
select set_config('request.jwt.claims','{"sub":"e9000000-0000-4000-8000-000000000004","role":"authenticated","amr":[{"method":"password","timestamp":0}]}',true);

select throws_ok($$select * from public.report_team_scope('2026-11-06 00:00+07','2026-11-07 00:00+07')$$,'42501',null,'SA cannot call manager team report');
select * from finish();
rollback;

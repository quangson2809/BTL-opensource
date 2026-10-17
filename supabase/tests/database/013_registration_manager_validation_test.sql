begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select * from no_plan();
insert into auth.users (id,email) values
 ('93000000-0000-4000-8000-000000000001','dm-manager-p13@example.test'),
 ('93000000-0000-4000-8000-000000000002','um-manager-p13@example.test'),
 ('93000000-0000-4000-8000-000000000003','inactive-dm-p13@example.test'),
 ('93000000-0000-4000-8000-000000000004','sa-manager-p13@example.test');
insert into public.tai_khoan (id,ho_ten,email,so_dien_thoai,ma_dai_ly,manager_id,trang_thai) values
 ('93000000-0000-4000-8000-000000000001','DM fixture','dm-manager-p13@example.test','0930000001','DM-P13-001',null,'DANG_HOAT_DONG'),
 ('93000000-0000-4000-8000-000000000002','UM fixture','um-manager-p13@example.test','0930000002','UM-P13-001','93000000-0000-4000-8000-000000000001','DANG_HOAT_DONG'),
 ('93000000-0000-4000-8000-000000000003','Inactive DM fixture','inactive-dm-p13@example.test','0930000003','DM-P13-INACTIVE',null,'KHOA'),
 ('93000000-0000-4000-8000-000000000004','SA fixture','sa-manager-p13@example.test','0930000004','SA-P13-001','93000000-0000-4000-8000-000000000002','DANG_HOAT_DONG');
insert into public.phan_cong_vai_tro (tai_khoan_id,vai_tro_id)
select f.account_id,vt.id from (values
 ('93000000-0000-4000-8000-000000000001'::uuid,'DM'::text),
 ('93000000-0000-4000-8000-000000000002'::uuid,'UM'::text),
 ('93000000-0000-4000-8000-000000000003'::uuid,'DM'::text),
 ('93000000-0000-4000-8000-000000000004'::uuid,'SA'::text)
) f(account_id,role_code) join public.vai_tro vt on vt.ma_vai_tro=f.role_code;
insert into auth.users (id,email,raw_user_meta_data) values
 ('93000000-0000-4000-8000-000000000011','registered-under-dm-p13@example.test',jsonb_build_object('registration_type','SA_SELF_REGISTRATION','ho_ten','SA under DM','so_dien_thoai','0930000011','ma_dai_ly','SA-P13-011','manager_code','DM-P13-001'));
select is((select manager_id from public.tai_khoan where id='93000000-0000-4000-8000-000000000011'),'93000000-0000-4000-8000-000000000001'::uuid,'active DM code becomes manager_id');
insert into auth.users (id,email,raw_user_meta_data) values
 ('93000000-0000-4000-8000-000000000012','registered-under-um-p13@example.test',jsonb_build_object('registration_type','SA_SELF_REGISTRATION','ho_ten','SA under UM','so_dien_thoai','0930000012','ma_dai_ly','SA-P13-012','manager_code','UM-P13-001'));
select is((select manager_id from public.tai_khoan where id='93000000-0000-4000-8000-000000000012'),'93000000-0000-4000-8000-000000000002'::uuid,'active UM code becomes manager_id');
select throws_ok($$insert into auth.users (id,email,raw_user_meta_data) values ('93000000-0000-4000-8000-000000000021','unknown-manager-p13@example.test',jsonb_build_object('registration_type','SA_SELF_REGISTRATION','ho_ten','Unknown manager','so_dien_thoai','0930000021','ma_dai_ly','SA-P13-021','manager_code','NO-SUCH-MANAGER'))$$,'22023','Invalid direct manager for SA self-registration','unknown manager rejected');
select throws_ok($$insert into auth.users (id,email,raw_user_meta_data) values ('93000000-0000-4000-8000-000000000022','inactive-manager-p13@example.test',jsonb_build_object('registration_type','SA_SELF_REGISTRATION','ho_ten','Inactive manager','so_dien_thoai','0930000022','ma_dai_ly','SA-P13-022','manager_code','DM-P13-INACTIVE'))$$,'22023','Invalid direct manager for SA self-registration','inactive manager rejected');
select throws_ok($$insert into auth.users (id,email,raw_user_meta_data) values ('93000000-0000-4000-8000-000000000023','sa-manager-invalid-p13@example.test',jsonb_build_object('registration_type','SA_SELF_REGISTRATION','ho_ten','SA manager','so_dien_thoai','0930000023','ma_dai_ly','SA-P13-023','manager_code','SA-P13-001'))$$,'22023','Invalid direct manager for SA self-registration','SA role rejected as manager');
select throws_ok($$insert into auth.users (id,email,raw_user_meta_data) values ('93000000-0000-4000-8000-000000000024','missing-manager-p13@example.test',jsonb_build_object('registration_type','SA_SELF_REGISTRATION','ho_ten','Missing manager','so_dien_thoai','0930000024','ma_dai_ly','SA-P13-024'))$$,'22023','Missing required SA self-registration metadata','missing manager code rejected');
select is((select count(*)::bigint from auth.users where id in ('93000000-0000-4000-8000-000000000021','93000000-0000-4000-8000-000000000022','93000000-0000-4000-8000-000000000023','93000000-0000-4000-8000-000000000024')),0::bigint,'rejected manager cases leave no partial Auth identities');
select * from finish();
rollback;

-- Enable the existing notification feature for the standard DM role.
-- The application exposes draft creation/edit/delete/send to DM, so the baseline
-- role must have NOTIFICATION_MANAGE after a clean install or an upgrade.
-- ADMIN can still change this mapping later through admin_update_role.
insert into public.phan_quyen_vai_tro (vai_tro_id, quyen_id, nguoi_gan_id)
select vt.id, q.id, null
from public.vai_tro vt
join public.quyen q on q.ma_quyen = 'NOTIFICATION_MANAGE'
where vt.ma_vai_tro = 'DM'
on conflict (vai_tro_id, quyen_id) do nothing;

#!/usr/bin/env bash
set -euo pipefail
umask 077
cd "$(dirname "${BASH_SOURCE[0]}")/.."
restore_artifact_root="${1:-/tmp/idaily-restore}"
mkdir -p "$restore_artifact_root"
restore_run_dir=$(mktemp -d "$restore_artifact_root/run.XXXXXX")
restore_db="idaily_restore_${restore_run_dir##*.}"
restore_created=0
docker_cmd=(env -u DOCKER_HOST -u DOCKER_CONTEXT -u DOCKER_TLS -u DOCKER_TLS_VERIFY -u DOCKER_CERT_PATH docker --host=unix:///var/run/docker.sock)
cleanup() {
  restore_exit=$?
  if [ "$restore_created" = 1 ]; then
    if ! "${docker_cmd[@]}" exec supabase_db_idaily dropdb -U postgres "$restore_db"; then
      echo "Scratch database cleanup failed: $restore_db" >&2
      restore_exit=1
    fi
  fi
  exit "$restore_exit"
}
trap cleanup EXIT
"${docker_cmd[@]}" info >/dev/null
cat > "$restore_run_dir/snapshot.sql" <<'SQL'
select jsonb_build_object(
  'business_rows',(select jsonb_object_agg(name,n) from (values
    ('tai_khoan',(select count(*) from public.tai_khoan)),
    ('vai_tro',(select count(*) from public.vai_tro)),
    ('quyen',(select count(*) from public.quyen)),
    ('phan_cong_vai_tro',(select count(*) from public.phan_cong_vai_tro)),
    ('phan_quyen_vai_tro',(select count(*) from public.phan_quyen_vai_tro)),
    ('khach_hang',(select count(*) from public.khach_hang)),
    ('hoat_dong',(select count(*) from public.hoat_dong)),
    ('thong_bao',(select count(*) from public.thong_bao)),
    ('thong_bao_nguoi_nhan',(select count(*) from public.thong_bao_nguoi_nhan))) t(name,n)),
  'auth_users',(select count(*) from auth.users),
  'migrations',(select count(*) from supabase_migrations.schema_migrations),
  'sequence',(select jsonb_build_array(last_value,is_called) from app_private.khach_hang_code_seq),
  'rls',(select jsonb_object_agg(c.relname,c.relrowsecurity) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r'),
  'owners',(select jsonb_object_agg(n.nspname||'.'||c.relname,pg_get_userbyid(c.relowner)) from pg_class c join pg_namespace n on n.oid=c.relnamespace where (n.nspname='public' and c.relkind='r') or (n.nspname='auth' and c.relname='users')),
  'rpc_anon_denied',not has_function_privilege('anon','public.dm_delete_notification_draft(uuid)','EXECUTE') and not has_function_privilege('anon','public.report_team_scope(timestamptz,timestamptz)','EXECUTE') and not has_function_privilege('anon','public.admin_create_business_account(uuid,text,text,text,text,uuid,uuid[])','EXECUTE')
);
SQL
"${docker_cmd[@]}" exec -i supabase_db_idaily psql -X -U postgres -d postgres -v ON_ERROR_STOP=1 -qAt < "$restore_run_dir/snapshot.sql" > "$restore_run_dir/source.json"
"${docker_cmd[@]}" exec supabase_db_idaily pg_dump -U postgres -Fc -n public -n auth -n app_private -n supabase_migrations postgres > "$restore_run_dir/backup.dump"
sha256sum "$restore_run_dir/backup.dump" > "$restore_run_dir/backup.sha256"
sha256sum --check "$restore_run_dir/backup.sha256" > "$restore_run_dir/checksum.log"
"${docker_cmd[@]}" exec supabase_db_idaily createdb -U postgres -T template0 "$restore_db"
restore_created=1
"${docker_cmd[@]}" exec supabase_db_idaily psql -X -U postgres -d "$restore_db" -v ON_ERROR_STOP=1 -c 'drop schema public; create schema extensions; grant usage on schema extensions to anon,authenticated,service_role; grant usage,create on schema extensions to dashboard_user; create extension pgcrypto with schema extensions; create extension "uuid-ossp" with schema extensions; create extension pgtap with schema extensions;' > "$restore_run_dir/extensions.log" 2>&1
# Supabase's postgres role cannot SET ROLE supabase_admin while restoring ACLs.
# Use the existing local operator role so ownership/privilege verification stays on.
if ! "${docker_cmd[@]}" exec -i supabase_db_idaily pg_restore -U supabase_admin --exit-on-error -d "$restore_db" < "$restore_run_dir/backup.dump" > "$restore_run_dir/restore.log" 2>&1; then
  echo "Restore failed; private diagnostic log: $restore_run_dir/restore.log" >&2
  exit 1
fi
"${docker_cmd[@]}" exec -i supabase_db_idaily psql -X -U postgres -d "$restore_db" -v ON_ERROR_STOP=1 -qAt < "$restore_run_dir/snapshot.sql" > "$restore_run_dir/restored.json"
node --input-type=module - "$restore_run_dir" <<'JS'
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const dir=process.argv[2];
const source=JSON.parse(readFileSync(dir+'/source.json','utf8'));
const restored=JSON.parse(readFileSync(dir+'/restored.json','utf8'));
assert.deepEqual(restored,source);
assert.equal(Object.keys(restored.business_rows).length,9);
assert.equal(Object.values(restored.rls).every(Boolean),true);
assert.equal(restored.rpc_anon_denied,true);
console.log('Restore metadata/data PASS: nine tables, Auth count, migration history, sequence, owners, RLS and RPC ACL.');
JS
for test_file in 016_notification_permission_revocation_test.sql 017_team_report_comparison_test.sql; do
  "${docker_cmd[@]}" exec -i supabase_db_idaily psql -X -U postgres -d "$restore_db" -v ON_ERROR_STOP=1 -qAt < "supabase/tests/database/$test_file" > "$restore_run_dir/$test_file.tap" 2>&1
done
python - "$restore_run_dir" <<'PY'
from pathlib import Path
import sys
root=Path(sys.argv[1])
for name,count in [('016_notification_permission_revocation_test.sql',9),('017_team_report_comparison_test.sql',10)]:
    lines=(root/(name+'.tap')).read_text().splitlines()
    assert not any(line.startswith('not ok ') for line in lines),name+' has a failed assertion'
    assert sum(line.startswith('ok ') for line in lines)==count,name+' assertion count mismatch'
    assert '1..'+str(count) in lines,name+' did not finish'
print('Restored database behavior PASS: 19/19 permission and team-scope assertions.')
PY
echo "Local restore rehearsal PASS. Private artifacts: $restore_run_dir"

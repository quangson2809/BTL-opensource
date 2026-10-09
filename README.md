# IDAILY

Hệ thống quản lý đại lý tại công ty bảo hiểm.

## Canonical specification

Nguồn nghiệp vụ gốc của dự án:

- `docs/source/Bao-cao-mon-opensource.pdf`
- `docs/source/README.md`

PDF là source of truth. `PROJECT_PLAN.md`, GitHub Issues, migrations, tests và code là tài liệu dẫn xuất. Khi có mâu thuẫn, phải đối chiếu PDF trước khi thay đổi implementation.

Master implementation scope được theo dõi trong `PROJECT_PLAN.md`.

## Tech stack

- Next.js 16 + React 19
- TypeScript
- Supabase JavaScript SDK + `@supabase/ssr`
- Supabase CLI cho local database workflow
- PostgreSQL + Row Level Security (RLS)
- ESLint
- GitHub Actions
- npm

## Prerequisites

- Node.js 20.19+ (Node.js 24 được dùng trong CI)
- npm
- Git
- Docker Desktop hoặc Docker-compatible runtime đang chạy
- Supabase CLI

Không cần global npm package để chạy ứng dụng. Supabase CLI dùng cho database workflow và Auth integration workflow local của Phase 1/2.

## Getting started

```bash
git clone https://github.com/quangson2809/BTL-opensource.git
cd BTL-opensource
npm ci
cp .env.example .env.local
npm run dev
```

PowerShell:

```powershell
git clone https://github.com/quangson2809/BTL-opensource.git
cd BTL-opensource
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Sau khi copy environment file, điền Supabase development values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key
SUPABASE_SECRET_KEY=sb_secret_your_server_only_key
```

Không commit `.env.local`, secret key, service-role key hoặc database password.

## Scripts

| Script | Mục đích |
|---|---|
| `npm run dev` | Chạy Next.js development server |
| `npm run build` | Build production |
| `npm run start` | Chạy production build |
| `npm run lint` | Chạy ESLint |
| `npm run type-check` | Chạy TypeScript checker với `--noEmit` |
| `npm run security-check` | Kiểm tra client bundle không tham chiếu server secret boundary |

## Environment variables

- `NEXT_PUBLIC_SUPABASE_URL`: URL của Supabase development project; public client configuration.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: Supabase publishable key dùng cho browser/server client foundation.
- `SUPABASE_SECRET_KEY`: Supabase secret key chỉ dùng server-side cho account-state orchestration sau khi credential đã được Supabase Auth xác minh; key này bypass RLS và tuyệt đối không được đưa vào client bundle.

Local/CI vẫn giữ Password Verification Hook để regression-test state machine 6 lần sai/30 phút, nhưng production MVP dùng hosted Supabase Free nên **không claim exact 6/30 enforcement**. Production dựa vào Supabase Auth password policy + provider abuse/rate-limit controls; business authorization vẫn dựa vào user JWT + RLS. Đây là MVP deployment exception được ghi trong `PROJECT_PLAN.md`.

## Project structure

```text
src/
  app/
    login/
    register/
    dashboard/
    access-denied/
    auth/actions.ts
  lib/
    supabase/
      admin.ts
      client.ts
      config.ts
      proxy.ts
      server.ts
  proxy.ts
supabase/
  config.toml
  migrations/
    20260926070000_core_schema.sql
    20260926070100_rls_foundation.sql
    20261002090000_auth_session_foundation.sql
    20261002093000_recovery_session_gate.sql
    20261002100000_unconditional_password_reauth.sql
  tests/
    database/
      001_schema_test.sql
      002_rls_test.sql
      003_auth_session_test.sql
    auth/
      001_phase2_auth.mjs
      002_password_otp.mjs
  templates/
    recovery.html
    reauthentication.html
  seed.sql
.github/
  workflows/
    ci.yml
    database-tests.yml
```

## Phase 1 — Database + RLS Foundation

Phase 1 tạo đúng 9 bảng nghiệp vụ vật lý:

`tai_khoan`, `vai_tro`, `quyen`, `phan_cong_vai_tro`, `phan_quyen_vai_tro`, `khach_hang`, `hoat_dong`, `thong_bao`, `thong_bao_nguoi_nhan`.

Không tạo bảng `nhom`, bảng báo cáo/thống kê, `customer_activity` junction hoặc audit-log business table trong Phase 1.

### Architecture decisions

**D1 — Auth identity mapping**

- Supabase Auth quản lý credential.
- `tai_khoan.id` dùng cùng UUID với `auth.users.id` và reference trực tiếp `auth.users(id)`.
- Không có `auth_user_id` riêng.
- Không lưu `password` hoặc `mat_khau_hash` trùng lặp trong business schema.

**D2 — Finite values**

- Dùng `text` + `CHECK` constraints.
- Không dùng PostgreSQL enum types.
- Database values giữ đúng các giá trị miền được canonical source xác định.

**D3 — FK deletion semantics**

- `tai_khoan.manager_id`: `ON DELETE SET NULL`.
- Role/account và role/permission parent FKs: `ON DELETE CASCADE`.
- Customer owner, activity owner, notification creator và notification recipient account FKs: `ON DELETE RESTRICT`.
- Notification -> recipient rows: `ON DELETE CASCADE`.
- `tai_khoan.id -> auth.users.id`: `ON DELETE RESTRICT`; account deletion cần use-case phối hợp ở phase sau thay vì cascade âm thầm.

`nguoi_gan_id` trong các junction assignment dùng `ON DELETE SET NULL` để giữ bản ghi gán khi người thực hiện không còn tồn tại. Đây là implementation choice cho trường người gán mà PDF yêu cầu lưu, không thay đổi D3 trên hai parent FK chính.

### RLS foundation

- `khach_hang`: authenticated user chỉ đọc/tạo/sửa/xóa customer do chính `auth.uid()` sở hữu. `ADMIN` không có policy bypass ownership.
- `hoat_dong`: tài khoản đọc và mutate hoạt động của chính mình. `DM`/`UM` chỉ được đọc activity trong cây cấp dưới khi có capability `ACTIVITY_VIEW_SUBTREE`; subtree được tính bằng recursive CTE từ `tai_khoan.manager_id`.
- `thong_bao_nguoi_nhan`: recipient chỉ đọc row của mình và chỉ được update cột `da_doc`; không được đổi `tai_khoan_id` hoặc `thong_bao_id`.
- `vai_tro`, `quyen` và các junction RBAC: authenticated user có read cần thiết; write chỉ qua policy `ADMIN` trong Phase 1 để chặn self-escalation.
- `tai_khoan`: own profile; `ADMIN` có scope quản trị account; `DM`/`UM` có hierarchy lookup trong subtree. Mutation account được defer sang Auth/Admin phase.
- `thong_bao`: Phase 1 chỉ thiết lập safe read cho creator/recipient; create/update/delete notification được defer sang Phase 6.
- Không dùng service-role như cơ chế authorization thông thường.

### Required RBAC catalog

The application-required catalog is migration-owned so fresh self-hosted production databases receive the same required authorization foundation as local/CI:

- roles: `ADMIN`, `DM`, `UM`, `SA`;
- permission: `ACTIVITY_VIEW_SUBTREE`;
- permission mapping for `DM` and `UM`.

`supabase/seed.sql` is intentionally a no-op. It does not contain production users, passwords, service-role keys, credentials, or application-required catalog rows.

## Local database workflow

Khởi động local Supabase:

```bash
supabase start
```

Rebuild database từ trạng thái sạch, replay migrations và seed:

```bash
supabase db reset
```

Chạy schema/RLS tests:

```bash
supabase test db
```

Dừng local stack:

```bash
supabase stop --no-backup
```

`supabase db reset` là verification bắt buộc khi thay đổi migration; migration files are the source of truth for schema **and the required RBAC catalog**. Production does not depend on seed execution.

## Database tests

`supabase/tests/database/001_schema_test.sql` xác minh:

- đúng 9 bảng Phase 1;
- UUID/date/timestamptz strategy;
- FK delete semantics;
- unique/check constraints;
- required indexes;
- RLS enabled;
- không có `auth_user_id`, `mat_khau_hash` hoặc `hoat_dong.customer_id` ngoài source.

`supabase/tests/database/002_rls_test.sql` có cả allow và deny cases cho:

- customer ownership và Admin non-bypass;
- own activity + recursive DM/UM subtree read;
- manager không được update activity cấp dưới;
- recipient isolation + read-state update;
- normal user không self-grant role hoặc sửa permission catalog;
- authorized Admin write cho RBAC foundation.

GitHub Actions chạy database/RLS tests và local Supabase Auth integration tests trong `.github/workflows/database-tests.yml`; workflow lấy local keys từ `supabase status -o env` và không yêu cầu production secrets.

## Phase 2 — Authentication & Session foundation

Foundation hiện tại triển khai:

- SA self-registration bằng Supabase email/password;
- database trigger tạo `tai_khoan` cùng UUID với `auth.users.id`, gán role `SA`, trạng thái `CHO_PHE_DUYET`;
- SSR session refresh qua Next.js 16 `proxy.ts`;
- login/logout server action; logout dùng current/local session scope;
- `DANG_HOAT_DONG` là trạng thái business duy nhất được dùng protected data;
- `CHO_PHE_DUYET`, `KHOA` và temporary lock (nếu được thiết lập bởi môi trường có hook) đều bị chặn bằng restrictive RLS gate;
- local/CI regression-test state machine 6 lần sai liên tiếp -> khóa tạm 30 phút bằng Password Verification Hook;
- production hosted Supabase Free không hỗ trợ Password Verification Attempt Hook, nên exact 6/30 được defer khỏi MVP acceptance thay vì triển khai một application-side counter có thể bị bypass qua public Auth endpoint;
- Phase 1 authorization RPC helpers trả false cho pending/KHOA/active temporary-lock state thay vì lộ role/hierarchy state;
- pgTAP regression tests cho provisioning, account-state gate, hook state machine và exposed authorization helpers;
- Auth integration test đi qua Supabase signup/password verification/session thật trong local CI;
- password policy, reauthentication OTP và recovery OTP được test qua Auth API thật + Mailpit;
- chỉ password-authenticated session được dùng business data; OTP/recovery session bị RLS chặn cho tới khi reset xong và đăng nhập lại bằng password.

### Password verification hook deployment decision

Local/CI tiếp tục bật hook trong `supabase/config.toml` để regression-test cơ chế mạnh hơn:

```toml
[auth.hook.password_verification_attempt]
enabled = true
uri = "pg-functions://postgres/public/hook_password_verification_attempt"
```

**MVP production exception (2026-10-09):** production dùng hosted Supabase Free. Theo Supabase Auth Hooks documentation hiện hành, Password Verification Attempt Hook chỉ có trên Teams/Enterprise. Vì vậy MVP production **không claim** rule per-account "6 lần sai liên tiếp -> khóa 30 phút".

Không chuyển counter sang Next.js/server action vì public Supabase Auth endpoint vẫn có thể được gọi trực tiếp và sẽ làm cơ chế đó không phải security boundary. Production MVP thay thế bằng password policy của Supabase Auth + provider-managed rate limiting/abuse protection. Exact 6/30 remains deferred; nếu sau này chuyển sang plan hỗ trợ hook hoặc self-hosted Auth, có thể bật lại mà không đổi business schema.

Nếu canonical PDF bắt buộc exact 6/30, đây là known MVP deviation và phải được nêu khi demo/acceptance; không được trình bày như đã đáp ứng đầy đủ.

### Password + OTP decisions

Phase 2 chốt P2-D5/P2-D6 như sau:

- mật khẩu tối thiểu 8 ký tự;
- bắt buộc có chữ thường + chữ hoa + chữ số;
- không bắt buộc ký tự đặc biệt;
- Supabase Auth là nơi enforce password policy; server actions mirror rule để trả lỗi UX sớm;
- mật khẩu mới phải khác mật khẩu cũ; Supabase Auth trả `same_password` khi vi phạm;
- authenticated password change dùng email reauthentication OTP và OTP này là bắt buộc kể cả với fresh password session;
- forgotten-password recovery dùng recovery OTP, sau đó mới cho đặt mật khẩu mới;
- OTP email dài 8 số và hết hạn sau 600 giây (10 phút);
- local/CI dùng Mailpit đi kèm Supabase CLI;
- production hosted Free có thể dùng Supabase default SMTP **chỉ cho demo với địa chỉ email đã được pre-authorized trong project team**; public/unrestricted email delivery cần custom SMTP và không được claim nếu chưa cấu hình.

Recovery OTP tạo một Supabase authenticated session tạm thời, nhưng runtime không được giả định sẽ luôn gắn AMR tên `recovery`. Vì Phase 2 chỉ định email/password là application sign-in method, common RLS access gate chỉ cho business data khi JWT có `amr.method = password`. OTP/recovery sessions có thể hoàn tất credential reset nhưng không thể trở thành business session. Recovery UI xác minh OTP và cập nhật mật khẩu trong cùng server action rồi logout.

Supabase Auth/GoTrue hiện chỉ bắt reauthentication nonce khi password session đã cũ hơn 24 giờ. Migration compatibility shim hiện vẫn được cài trong local/CI và production database: khi Auth ghi AMR `password`, `auth.sessions.created_at` của session đó được backdate 25 giờ. Production hosted service phải được acceptance-test end-to-end cho password-change OTP; vì GoTrue runtime do Supabase quản lý, MVP không claim một immutable self-hosted Auth image pin. Recovery/OTP sessions không bị backdate.

**Deployment constraint:** trong khi shim này còn tồn tại, không bật time-boxed session lifetime dựa trên `auth.sessions.created_at`. Nếu self-hosted GoTrue sau này hỗ trợ configurable unconditional reauthentication threshold, bỏ shim và dùng provider option chính thức trước khi chốt Session duration.

Không tạo custom OTP table. Supabase Auth quản lý token, expiry, single-use verification và audit events.

## Explicitly deferred

- Admin/RBAC screens và service use cases;
- customer UI/API workflow;
- activity UI/API workflow;
- notification create/publish UI/API workflow;
- statistics/reporting/Excel;
- production Supabase/Vercel deployment.

## Git workflow

- `main`: branch ổn định.
- `feature/*`: feature branches.
- Thay đổi đi qua Pull Request.
- Không merge khi lint/type-check/build hoặc database tests liên quan chưa pass.

## Current status

- Phase 0 — Repository Bootstrap: merged.
- Phase 1 — Database + RLS Foundation: independent review PASS, merged via PR #4.
- Phase 2 — Authentication & Session: independent review PASS, merged via PR #7.
- Phase 3 — Admin/RBAC MVP: independent review PASS, merged via PR #10.
- Phase 4-6 — Customer/Personnel, Activity, Notification MVP: independent review PASS, merged via PR #11.
- Phase 7-9 release batch và production ACL hardening đã merge; production deployment/acceptance tiếp tục được theo dõi ở Issue #13.
- Hosted Supabase Free production candidate đã được provision/migrated. Exact 6/30 password lock là documented MVP exception do plan không hỗ trợ Password Verification Attempt Hook.
- Production deployment is not considered complete until the evidence checklist in `docs/mvp-deployment.md` is satisfied.


## MVP business modules

Current MVP implementation includes:

- Phase 3 Admin/RBAC: account list/detail, approve/lock/unlock, assign/revoke roles, role/permission views.
- Phase 4 Customer/Personnel: owner-scoped customer CRUD/search/filter, hierarchy view and aggregate subordinate summary.
- Phase 5 Activity: own activity create/update/delete plus DM/UM subtree read.
- Phase 6 Notification: DM draft/create/send with subtree recipients and per-recipient read state.
- Phase 7 Reports: day/week/month scoped aggregates, personal/team/overview comparison, and UTF-8 CSV export that opens directly in Excel.

Notification update/delete remains intentionally deferred until its canonical business rule is locked.

## Security and verification

GitHub CI runs:

- lint;
- TypeScript type-check;
- client secret-boundary check;
- production build.

Database workflow runs from a clean local Supabase stack:

- migration + deterministic seed replay;
- pgTAP schema/RLS/regression tests;
- Auth integration tests using real local Supabase Auth;
- MVP route smoke against a running Next.js development server.

Reporting and export use the caller JWT and the same scoped aggregate RPC. Raw subordinate customer rows remain protected by the existing customer ownership RLS boundary.

## Production deployment

See `docs/mvp-deployment.md`.

MVP production acceptance targets hosted Supabase Free + Vercel. It explicitly does **not** claim exact 6-failure/30-minute account lock, leaked-password protection, unrestricted SMTP delivery, or an immutable GoTrue image pin on this free managed plan. Password/OTP behavior actually used by the demo must still be smoke-tested, and a Vercel project must be linked to this repository.

The repository intentionally does not contain production credentials.

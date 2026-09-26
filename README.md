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

Không cần global npm package để chạy ứng dụng. Supabase CLI chỉ cần cho database workflow local của Phase 1.

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

## Environment variables

- `NEXT_PUBLIC_SUPABASE_URL`: URL của Supabase development project; public client configuration.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: Supabase publishable key dùng cho browser/server client foundation.

Phase 1 không yêu cầu và không định nghĩa service-role/secret key trong application environment.

## Project structure

```text
src/
  app/
  lib/
    supabase/
      client.ts
      config.ts
      server.ts
supabase/
  config.toml
  migrations/
    20260926070000_core_schema.sql
    20260926070100_rls_foundation.sql
  tests/
    database/
      001_schema_test.sql
      002_rls_test.sql
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

### Seed foundation

`supabase/seed.sql` seed deterministic:

- roles: `ADMIN`, `DM`, `UM`, `SA`;
- permission: `ACTIVITY_VIEW_SUBTREE`, mapping trực tiếp tới use case DM/UM xem hoạt động cấp dưới;
- gán permission trên cho `DM` và `UM`.

Seed không tạo production user, password, email/password thật, service-role key hoặc credential.

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

`supabase db reset` là verification bắt buộc khi thay đổi migration; migration files là source of truth của schema.

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

GitHub Actions chạy database tests riêng trong `.github/workflows/database-tests.yml` và không yêu cầu production secrets.

## Explicitly deferred

Phase 1 chỉ là database/RLS foundation. Chưa triển khai:

- login/register/logout/OTP/password reset/session application flow;
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

- Phase 0 — Repository Bootstrap: merged vào `main`.
- Phase 1 — Database + RLS Foundation: implemented trên `feature/phase-1-database-rls`, chờ independent review và **không tự merge**.

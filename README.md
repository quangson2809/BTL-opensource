# IDAILY

Hệ thống quản lý đại lý tại công ty bảo hiểm.

## Canonical specification

Nguồn nghiệp vụ gốc của dự án được quy định tại:

- `docs/source/Bao-cao-mon-opensource.pdf`
- `docs/source/README.md`

**Trạng thái hiện tại:** canonical PDF chưa được upload vào repository tại thời điểm triển khai Phase 0. Không có PDF giả hoặc nội dung nghiệp vụ tái dựng được thêm vào Phase 0.

Master implementation scope được theo dõi trong `PROJECT_PLAN.md`.

## Tech stack

Phase 0 hiện thiết lập:

- Next.js 16 + React 19
- TypeScript
- App Router
- ESLint
- Supabase JavaScript SDK + `@supabase/ssr`
- GitHub Actions
- npm

## Prerequisites

- Node.js 20.19+ (Node.js 24 được dùng trong CI)
- npm
- Git
- Một Supabase development project để chạy các phần cần kết nối Supabase

Supabase CLI chưa bắt buộc trong Phase 0 vì repository mới chỉ có database scaffold, chưa có migration nghiệp vụ.

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

Phase 0 không yêu cầu và không định nghĩa service-role/secret key.

## Project structure

```text
src/
  app/
    globals.css
    layout.tsx
    page.tsx
  lib/
    supabase/
      client.ts
      config.ts
      server.ts
supabase/
  migrations/
  seed.sql
.github/
  workflows/
    ci.yml
```

## Supabase / database workflow

- `src/lib/supabase/client.ts`: browser client factory.
- `src/lib/supabase/server.ts`: server client factory cho App Router.
- `supabase/migrations/`: scaffold để Phase 1 thêm migrations.
- `supabase/seed.sql`: placeholder scaffold; chưa có seed nghiệp vụ.

Phase 0 **không** tạo business schema, RLS policy, auth flow hoặc seed Admin/DM/UM/SA.

## Git workflow

- `main`: branch ổn định.
- `feature/*`: feature branches.
- Thay đổi đi qua Pull Request.
- CI phải chạy lint, type-check và build trước khi merge.

## Current status

Phase 0 — Repository Bootstrap được hoàn thành trong PR của branch `feature/phase-0-bootstrap`.

Phase 1 — Database + RLS Foundation chưa được triển khai.

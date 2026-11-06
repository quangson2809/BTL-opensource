# R11 — Nghiệm thu triển khai

Ngày: 06/11/2026 (Asia/Saigon). Business impact: NO — runbook, recovery rehearsal và ghi đúng trạng thái nghiệm thu. Không merge main hoặc áp dụng migrations lên hosted trong đợt này.

## Đích Vercel đã được cung cấp

- Dashboard project: https://vercel.com/quangson2809s-projects/btl-opensource, do người dùng cung cấp khi tiếp tục R11.
- Team slug: `quangson2809s-projects`; project slug: `btl-opensource`. Đây không phải numeric project/team IDs hoặc URL deployment; chưa tạo file `.vercel/project.json` giả từ các slug.
- Đã thử đọc dashboard và `GET https://api.vercel.com/v9/projects/btl-opensource?slug=quangson2809s-projects`: proxy từ chối CONNECT bằng HTTP 403. Không có response từ Vercel để đánh giá quyền tài khoản hoặc deployment.
- Runtime tại lúc kiểm tra: restricted/enforced, custom hosts chưa áp dụng; không có credential binding, VERCEL_TOKEN/SUPABASE_ACCESS_TOKEN hoặc CLI auth profile Vercel đã biết. Không đọc nội dung credential files và không yêu cầu token qua chat.
- Draft giữ api.github.com đã đề xuất, thêm vercel.com/api.vercel.com/api.supabase.com và requirements VERCEL_TOKEN/SUPABASE_ACCESS_TOKEN tới đúng API tương ứng. Draft save không áp dụng runtime hoặc tạo secret values.
- Sau khi cấu hình được áp dụng: đọc project/deployment metadata, xác định deployment URL và Supabase liên quan từ cấu hình công khai được phép đọc; chỉ bổ sung hostname runtime thực tế sau khi xác định. Chưa cho phép wildcard vercel.app/supabase.co hoặc suy đoán production alias.

## Trạng thái

| Phần | Gate | Bằng chứng / prerequisite |
| --- | --- | --- |
| Release candidate local | PASS | R10: 348 assertions/18 database files, 7 Auth scripts, 137 contracts, static/build và 7 browser suites |
| Local backup/restore | PASS | scripts/verify-local-restore.sh: dump 4 schema vào file private, checksum, restore scratch, đối chiếu 9 bảng/Auth count/history/sequence/owners/RLS/ACL và 19/19 assertions trên database đã restore |
| Hosted Supabase project/config | BLOCKED | Chưa xác nhận target thực tế hoặc binding hosted trong môi trường; local keys không chứng minh hosted access |
| Vercel preview/production | BLOCKED | Đã có dashboard project ở trên; chưa đọc được deployment URL/ID do proxy 403 và thiếu binding truy cập |
| Hosted OTP/SMTP | BLOCKED | Cần readback 8 chữ số/600 giây và reauthentication/recovery với mailbox hợp lệ; không gửi email hay đổi settings trong đợt này |
| Hosted migrations | NOT_RUN | Ba migration mới chỉ áp dụng local; chưa xác minh migration history hosted |
| Hosted backup/restore | BLOCKED | Local rehearsal không chứng minh managed backup/PITR hoặc khả năng khôi phục sang cluster mới |
| PR / exact-head GitHub CI | BLOCKED / NOT_RUN | Git push hoạt động; gh api repository GET trả Forbidden. Cấu hình nháp đã thêm api.github.com, chưa coi là runtime đã áp dụng |
| Manual screen reader / Excel GUI | NOT_RUN | Browser keyboard/semantics và XLSX round-trip đã kiểm chứng; không thay thế kiểm tra các công cụ này |

## Cách chạy recovery rehearsal local

```bash
bash scripts/verify-local-restore.sh
```

Script cố định daemon socket local và container `supabase_db_idaily`; không nhận URL database hosted. Tạo scratch database với tên ngẫu nhiên từ template0 và chỉ xóa database do chính lần chạy tạo. Backup/log có mode private theo umask 077, không in Auth rows/keys/passwords.

Phạm vi dump: public, auth, app_private và supabase_migrations. Bootstrap extensions/ACL tương ứng với Supabase local; dùng operator role có sẵn bên trong container để giữ ownership và ACL khi restore, không bỏ qua chúng. So sánh row counts, migration count, sequence, owners và RLS; chạy 9 ca notification revocation và 10 ca team report trong scratch. Không thay database nguồn hoặc kết nối các dịch vụ ứng dụng sang scratch.

Rehearsal không bao gồm Storage objects, managed cluster roles/settings, secrets, filesystem runtime, SMTP hoặc Vercel. Không dùng nó như chứng nhận full disaster recovery production. Khi triển khai thật, dùng cơ chế backup được hỗ trợ của hosted provider và xác minh restore vào project/cluster test riêng theo runbook vận hành.

## Trình tự tiếp tục khi có đích triển khai

1. Xác nhận Vercel project/deployment URL và Supabase project thực tế. Kiểm tra credential/binding đã có bằng metadata và thao tác read-only; không yêu cầu token/secret trong chat. Nhập cấu hình bảo mật trong Environment settings hoặc project settings được hỗ trợ.
2. Xem/lưu và Publish bản cấu hình môi trường nháp để áp dụng host api.github.com khi cần GitHub API. Saving draft không tự áp dụng runtime hoặc tạo PR. Sau state change, thử lại API cụ thể trước khi kết luận thiếu credential; không xin GitHub token chỉ vì gh auth status không thành công.
3. Mở các PR theo bảng nhánh bên dưới; kiểm tra đúng diff và required CI trên SHA cuối. Người dùng quyết định review/merge; agent không tự merge main.
4. Ghi release SHA/artifact dự kiến. Trước migration, có backup hosted và bằng chứng restore trên đích test phù hợp. Chỉ chạy lệnh hosted khi target/quyền và phạm vi được xác định; không chạy db reset trên hosted.
5. Đối chiếu migration history. Ba migration mới là `20261106010000_notification_permission_revocation.sql`, `20261106020000_admin_account_creation.sql`, `20261106030000_team_report_comparison.sql`; dùng forward migrations, không chỉnh history để ép pass.
6. Cấu hình NEXT_PUBLIC_SITE_URL, NEXT_PUBLIC_SUPABASE_URL và NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY trước build, SUPABASE_SECRET_KEY chỉ server. Kiểm tra scope production/preview, Site URL và callback URL theo docs/mvp-deployment.md. Không thay public key bằng server secret.
7. Deploy preview của đúng SHA, kiểm tra public/protected routes và workflow ADMIN/DM/UM/SA, revoke permission, Admin create/retry/failure recovery, customer isolation, notifications, groups và XLSX. Không dùng production users/data cho fixture tự động.
8. Read back hosted OTP length/expiry, thực hiện reauthentication/recovery trên mailbox đã được phép và lưu bằng chứng đã che OTP/password/JWT. Giữ rõ ngoại lệ Free về exact 6/30 và SMTP giới hạn; không âm thầm giảm acceptance.
9. Chỉ promote artifact đã kiểm chứng khi các gate cần thiết đạt. Xác minh runtime logs/monitoring và production smoke; ghi deployment ID, SHA, migration evidence, ngày và người kiểm tra.

Rollback application không đồng nghĩa rollback schema an toàn. Nếu phải khôi phục dữ liệu, dùng backup đã kiểm chứng và quyết định vận hành rõ ràng; không tự drop bảng, xóa tài khoản hoặc sửa migration cũ để cứu deploy.

## Thứ tự review các nhánh remote

| Head | Base review |
| --- | --- |
| docs/implementation-plan-20261106 | main |
| docs/requirements-acceptance-baseline | docs/implementation-plan-20261106 |
| fix/notification-permission-revocation | docs/requirements-acceptance-baseline |
| fix/search-literal-handling | fix/notification-permission-revocation |
| feature/customer-search-filters | fix/search-literal-handling |
| fix/checkbox-picker-accessibility | feature/customer-search-filters |
| chore/dependency-security-updates | fix/checkbox-picker-accessibility |
| fix/role-editor-contract | chore/dependency-security-updates |
| feature/admin-account-creation | fix/role-editor-contract |
| feature/report-xlsx-export | feature/admin-account-creation |
| feature/team-report-comparison | feature/report-xlsx-export |
| test/role-workflow-e2e | feature/team-report-comparison |
| chore/production-acceptance | test/role-workflow-e2e |

Các nhánh xếp chồng để thực hiện tuần tự mà không merge main. Sau khi người dùng merge một PR, kiểm tra/rebase nhánh kế tiếp và đổi base phù hợp; không force-push hoặc tự đổi lịch sử remote trong đợt này. Nhánh cuối chứa toàn bộ candidate nhưng không đồng nghĩa mọi phần đã được review độc lập hoặc production accepted.

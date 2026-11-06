# R10 — Release candidate local

Ngày: 06/11/2026 (Asia/Saigon). Business impact: NO — thêm regression và CI wiring, không đổi quyền/nghiệp vụ.

## Evidence

| Gate | Trạng thái | Kết quả local |
| --- | --- | --- |
| Migrations | PASS | Clean local reset, gồm 3 migration forward R1/R7/R9 |
| Database/RLS | PASS | 18 files, 348 assertions |
| Auth/integration | PASS | 7 scripts, gồm literal search và Admin account creation |
| App checks | PASS | Lint không warning; type-check; 137 contracts; secret boundary; production build |
| Browser | PASS | 7/7 suites qua scripts/run-browser-checks.mjs |
| Role/responsive | PASS | ADMIN/DM/UM/SA, allow/deny routes, 375/768/1024/1440; 16 dashboard screenshots |
| Visual sample | PASS trong phạm vi | Đã xem ảnh DM 375px và ADMIN 1440px: nội dung đọc được, không thấy clipping/overflow. Không suy rộng thành review toàn bộ màn hình |
| GitHub CI trên SHA cuối | NOT_RUN | Nhánh đã push nhưng GitHub API hiện trả Forbidden, chưa tạo PR để kích hoạt required checks |
| Screen reader thật | NOT_RUN | Kiểm tra keyboard/semantics không thay thế NVDA/VoiceOver/Orca |
| Microsoft Excel GUI | NOT_RUN | File XLSX đã tải bằng browser và round-trip bằng thư viện; chưa mở Excel GUI |
| Hosted production | BLOCKED | Chưa có target/project và cấu hình hosted được xác minh |

Browser suites: public form resilience (bao gồm lỗi mạng cố ý), checkbox picker, role editor, Admin account creation, report export, team report, role workflow matrix. Matrix xác minh account header tải được danh tính thật trước khi kiểm tra lỗi; không dùng số lượng mọi ARIA alert vì Next.js có live announcer hợp lệ.

Matrix còn kiểm tra tạo/tìm/xóa khách hàng (hủy và xác nhận), chặn DM mở hồ sơ SA, tìm tài khoản bằng full email, tạo draft thông báo, thu hồi quyền khi đang đăng nhập, direct-RPC deny, khôi phục quyền, gửi/đọc thông báo, live account lock và pending/locked login.

## Điều kiện tái lập

- Node 24, Supabase CLI 2.119.0, local stack đã áp dụng migrations, npm ci.
- Cấu hình NEXT_PUBLIC_SUPABASE_URL và NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY **trước npm run build**, không chỉ lúc next start. Next.js inline public variables vào browser bundle; build thiếu config có thể compile thành công nhưng header client báo lỗi.
- Lấy local keys qua `supabase status -o env` trong command substitution; không in/log hoặc bật shell tracing. Build và server dùng cùng local project. Server có SUPABASE_SECRET_KEY; giá trị này không được public hóa.
- Next có thể tự cập nhật next-env.d.ts/tsconfig.json khi build; backup/restore nội dung hiện có, giữ nguyên thay đổi người dùng.
- Chạy server production local rồi browser runner. CI pin Playwright 1.58.2. Cloud hiện dùng Chromium có sẵn qua PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium; CI dùng browser do Playwright cài.
- Có thể dùng runner qua npm exec với package Playwright và NODE_PATH như workflow database-tests.yml. Fixtures bắt buộc API_URL loopback; không dùng production users/data.

Ảnh local nằm tại E2E_ARTIFACT_DIR hoặc mặc định /tmp/idaily-role-e2e, không commit fixture data/screenshot vào mã nguồn. Chạy lại các gate bị ảnh hưởng khi code đổi; kết quả local không thay thế exact-head CI/review trước merge. Không có merge vào main trong đợt này.

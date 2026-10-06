# MASTER PROJECT PLAN — IDAILY

> **Canonical source:** `docs/source/Bao-cao-mon-opensource.pdf`  
> Nếu kế hoạch này mâu thuẫn với PDF gốc, phải đối chiếu PDF và cập nhật kế hoạch trước khi sửa code.

## 1. Mục tiêu

Xây dựng hệ thống web **Quản lý đại lý tại công ty bảo hiểm**, tập trung hóa dữ liệu khách hàng và hoạt động kinh doanh, hỗ trợ cơ cấu quản lý:

`DM -> UM -> SA`

Các nhóm người dùng:
- **Admin:** quản trị tài khoản, vai trò/chức danh và quyền.
- **DM:** trưởng phòng kinh doanh.
- **UM:** trưởng nhóm kinh doanh.
- **SA:** đại lý/nhân viên kinh doanh.

### Mục tiêu delivery hiện tại — MVP only

Yêu cầu của project coordinator: **chỉ cần MVP**, ưu tiên bản chạy được, đúng các use case cốt lõi và đủ để demo/deploy; không dành thời gian cho polish hoặc hardening không chặn MVP.

- Mốc mục tiêu: **10/10/2026** nếu không phát sinh blocker mới.
- UI ưu tiên đơn giản, rõ chức năng; không yêu cầu design system hoàn thiện.
- Chỉ triển khai requirement source-derived cần cho luồng nghiệp vụ chính.
- Test bắt buộc tập trung vào auth/RLS/ownership/permission và các happy-path + deny-path quan trọng.
- Edge case hiếm, tối ưu hiệu năng sâu, audit/observability nâng cao và production hardening không chặn chức năng được đưa vào backlog sau MVP.
- Không hạ các security invariant đã khóa: Auth/RLS, ownership, scope theo hierarchy, secret handling và các review gate hiện có vẫn bắt buộc.

## 2. Stack theo tài liệu

- Next.js + React + TypeScript
- Supabase
- PostgreSQL
- Row Level Security (RLS)
- Git/GitHub
- GitHub Actions
- Vercel
- Excel export

## 3. Phạm vi chức năng

1. Xác thực và quản lý phiên.
2. Quản lý tài khoản.
3. Quản lý chức danh/vai trò.
4. Quản lý quyền.
5. Quản lý khách hàng.
6. Tra cứu nhân sự theo cây quản lý.
7. Quản lý hoạt động kinh doanh.
8. Quản lý thông báo.
9. Báo cáo và thống kê.
10. Xuất dữ liệu Excel.

Ngoài phạm vi phiên bản đầu:
- hợp đồng bảo hiểm;
- bồi thường;
- đóng phí;
- nghiệp vụ vận hành hợp đồng;
- AI gợi ý tư vấn/sản phẩm;
- tích hợp CRM ngoài hệ thống.

## 4. Nguyên tắc kiến trúc

- Authorization phải được kiểm tra phía server/database, không chỉ ẩn UI.
- RLS là lớp bảo vệ dữ liệu cuối cùng.
- Dữ liệu khách hàng thuộc ownership của tài khoản; Admin không mặc nhiên được xem hồ sơ khách hàng của tài khoản khác.
- Migration là nguồn sự thật của schema.
- Không để secret/server key vào client bundle.
- Không dựng UI nghiệp vụ lớn trước khi data contract và authorization ổn định.
- Không tự phát sinh requirement ngoài PDF nếu chưa có Decision Log.

## 5. Roadmap

### Phase 0 — Repository Bootstrap

Mục tiêu: repository có thể clone, cài dependency, chạy local và CI.

- [ ] Next.js + TypeScript + App Router.
- [ ] ESLint.
- [ ] Script `type-check`.
- [ ] `.gitignore`.
- [ ] `.env.example`.
- [ ] Supabase client/server infrastructure.
- [ ] Migration/seed scaffold.
- [ ] GitHub Actions: install -> lint -> type-check -> build.
- [ ] README local setup.
- [ ] Không triển khai nghiệp vụ Phase 1+.

**DoD:** `npm ci`, lint, type-check và build đều pass.

### Phase 1 — Database + RLS Foundation

Mô hình nền:
- `tai_khoan`
- `vai_tro`
- `quyen`
- `phan_cong_vai_tro`
- `phan_quyen_vai_tro`
- `khach_hang`
- `hoat_dong`
- `thong_bao`
- `thong_bao_nguoi_nhan`

Công việc:
- [ ] Migration.
- [ ] UUID, timestamp, FK, unique constraints, indexes.
- [ ] `manager_id -> tai_khoan.id`.
- [ ] Seed dữ liệu nền.
- [ ] RLS khách hàng, hoạt động, thông báo.
- [ ] Policy theo cây quản lý.
- [ ] Test policy bằng Admin/DM/UM/SA.

### Phase 2 — Authentication & Session

- [x] Đăng ký SA.
- [x] Trạng thái chờ phê duyệt.
- [x] Đăng nhập.
- [x] Đăng xuất.
- [x] Đổi/đặt lại mật khẩu.
- [x] OTP email.
- [x] Xử lý trạng thái tài khoản.
- [x] Khóa tạm sau nhiều lần đăng nhập sai theo đặc tả.

Password/OTP contract:
- minimum 8;
- bắt buộc lowercase + uppercase + digit;
- email OTP dài 8 số, expiry 600 giây;
- change password dùng reauthentication OTP bắt buộc cho mọi password session, kể cả fresh session;
- recovery/reset dùng recovery OTP;
- business data chỉ chấp nhận JWT có password AMR; OTP/recovery JWT bị deny;
- local/CI dùng Mailpit, production self-host dùng SMTP cấu hình ngoài repo.

### Phase 3 — Admin / RBAC — MVP

Ưu tiên luồng tối thiểu để vận hành hệ thống:

- [x] Danh sách tài khoản.
- [x] Phê duyệt tài khoản SA.
- [x] Khóa/mở khóa tài khoản.
- [x] Gán/thu hồi vai trò.
- [x] Xem danh sách vai trò/quyền và mapping cần thiết.
- [x] Không gán quyền trực tiếp cho tài khoản.
- [ ] CRUD nâng cao cho role/permission catalog chỉ làm nếu source-derived use case bắt buộc cho MVP.

### Phase 4 — Customer + Personnel — MVP

Khách hàng:
- [x] Thêm, danh sách, chi tiết, cập nhật, xóa.
- [x] Tìm kiếm.
- [x] Lọc.
- [x] Enforce ownership.

Nhân sự:
- [x] Cây nhân sự.
- [x] Chi tiết nhân sự trong scope.
- [x] Thống kê tóm tắt khách hàng/hoạt động.
- [x] Không cho quản lý mở/sửa/xóa hồ sơ khách hàng cấp dưới trái đặc tả.

### Phase 5 — Business Activity — MVP

- [x] Tạo hoạt động.
- [x] Lịch sử hoạt động.
- [x] Cập nhật/xóa hoạt động của chính mình.
- [x] DM/UM xem hoạt động cấp dưới.
- [x] Hỗ trợ loại hoạt động khảo sát, gặp gỡ, tư vấn.

### Phase 6 — Notification — MVP

- [x] DM tạo thông báo.
- [x] Chưa gửi/đã gửi.
- [x] Chọn người nhận trong scope.
- [ ] Cập nhật/xóa theo business rule — **defer** cho đến khi notification delete/update rule được canonical source/Decision Log khóa; không tự suy diễn.
- [x] Đã đọc/chưa đọc theo người nhận.

### Phase 7 — Reports & Statistics — MVP

- [ ] Cá nhân.
- [ ] Nhóm.
- [ ] Tổng quan.
- [ ] Ngày/tuần/tháng.
- [ ] So sánh cá nhân/nhóm.
- [ ] Xuất Excel.
- [ ] Mọi query/export phải tuân thủ scope.

### Phase 8 — MVP Hardening

Chỉ các gate bắt buộc trước demo/deploy:

- [ ] Integration test các luồng nghiệp vụ chính.
- [ ] RLS/permission/ownership regression.
- [ ] Auth/session regression.
- [ ] Secret leakage check.
- [ ] CI validation.
- [ ] Smoke test toàn bộ MVP.

Sau MVP mới mở rộng unit-test coverage, fuzz/edge-case coverage, performance/observability và security hardening không chặn release.

### Phase 9 — MVP Deployment & Acceptance

- [ ] Supabase production.
- [ ] Apply migration/RLS.
- [ ] Vercel environments.
- [ ] Preview + production deployment.
- [ ] Smoke test.
- [ ] Đối chiếu use case trong PDF.
- [ ] Hoàn thiện README vận hành.

## 6. Thứ tự triển khai

```text
Phase 0 Bootstrap
  -> Phase 1 Database/RLS
  -> Phase 2 Auth
  -> Phase 3 Admin/RBAC
  -> Phase 4 Customer/Personnel
  -> Phase 5 Activity
  -> Phase 6 Notification
  -> Phase 7 Statistics
  -> Phase 8 Test/Security
  -> Phase 9 Deploy
```

Mỗi feature:

`Requirement -> Data model -> Authorization -> Service/API -> UI -> Test -> Review`

## 7. Git workflow

Branches:
- `main`
- `feature/*`
- `fix/*`
- `docs/*`
- `test/*`
- `chore/*`

Commit convention:
- `feat:`
- `fix:`
- `docs:`
- `refactor:`
- `test:`
- `chore:`
- `ci:`

Không merge PR khi lint/type-check/build/test liên quan chưa pass.

## 8. Decision Log cần khóa trước khi code phụ thuộc

- [x] Auth: Supabase Auth.
- [x] OTP/email: Supabase Auth email OTP; Mailpit local/CI; production SMTP.
- [x] Audit log: Supabase Auth audit logging; không thêm business audit table.
- [ ] Enum strategy.
- [ ] Delete/cascade/restrict strategy.
- [ ] Chuẩn hóa thuật ngữ “vai trò” và “chức danh” trong code.
- [x] Password policy: minimum 8, lowercase + uppercase + digit, symbol optional.
- [ ] Session duration — **defer sau MVP**. Không bật time-boxed lifetime khi unconditional-reauth compatibility shim còn backdate `auth.sessions.created_at`; đồng thời không bật MFA/low-AAL lifetime dựa trên cùng timestamp. Production phải pin/review GoTrue version trước khi dùng shim.
- [ ] Notification delete rule.
- [ ] Statistics: query trực tiếp, view hay RPC.

Không tự suy diễn các quyết định trên nếu ảnh hưởng kiến trúc hoặc business behavior.

## 9. Trạng thái

- [x] Repository mới đã được xác định.
- [x] Repository đã được khởi tạo.
- [x] Canonical-source policy đã được tạo.
- [x] Master plan đã được chuyển sang repository mới.
- [x] PDF gốc đã có tại `docs/source/Bao-cao-mon-opensource.pdf`.
- [x] Phase 0 đã merge vào `main`.
- [x] Phase 1 đã independent review PASS và merge vào `main`.
- [x] Phase 2 đã independent review PASS và merge vào `main` qua PR #7.
- [x] Roadmap chuyển sang **MVP-only**, target 10/10/2026 nếu không có blocker mới.
- [ ] Reviewer LOW F-3 của PR #7 được defer sang production hardening: document/pin GoTrue compatibility và tránh Timebox/AllowLowAAL conflict khi shim còn dùng `auth.sessions.created_at`.

- [x] Phase 3 đã independent review PASS và merge vào \`main\` qua PR #10.
- [ ] Phase 4-6 source-confirmed MVP đang ở PR #11, chờ CI + independent review trước merge.

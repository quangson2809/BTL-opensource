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
- Không hạ Auth/RLS, ownership, hierarchy scope, secret handling hoặc review gates. Mọi deployment exception do giới hạn hạ tầng phải được ghi rõ trong Decision Log và không được claim như đã đáp ứng canonical requirement.

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
- [x] Local/CI: khóa tạm sau nhiều lần đăng nhập sai được regression-test bằng Password Verification Hook.
- [ ] Production exact 6-failure/30-minute lock — **deferred khỏi MVP acceptance** trên hosted Supabase Free; không triển khai counter application-side có thể bypass.

Password/OTP contract:
- minimum 8;
- bắt buộc lowercase + uppercase + digit;
- email OTP dài 8 số, expiry 600 giây;
- change password dùng reauthentication OTP bắt buộc cho mọi password session, kể cả fresh session;
- recovery/reset dùng recovery OTP;
- business data chỉ chấp nhận JWT có password AMR; OTP/recovery JWT bị deny;
- local/CI dùng Mailpit; hosted Supabase Free **chỉ dùng default SMTP cho demo với địa chỉ email thuộc project team được pre-authorize**. Muốn gửi email đến người dùng bất kỳ / triển khai public phải cấu hình custom SMTP và kiểm thử lại.

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

- [x] Cá nhân.
- [x] Nhóm.
- [x] Tổng quan.
- [x] Ngày/tuần/tháng.
- [x] So sánh cá nhân/nhóm.
- [x] Xuất Excel-compatible UTF-8 CSV cho MVP.
- [x] Mọi query/export dùng cùng scoped aggregate RPC và tuân thủ scope.

### Phase 8 — MVP Hardening

Chỉ các gate bắt buộc trước demo/deploy:

- [x] Integration test các luồng nghiệp vụ chính.
- [x] RLS/permission/ownership regression.
- [x] Auth/session regression.
- [x] Secret leakage check.
- [x] CI validation gate (release PR phải xanh trên exact head trước review-ready).
- [x] MVP route smoke + business-flow integration gate.

Sau MVP mới mở rộng unit-test coverage, fuzz/edge-case coverage, performance/observability và security hardening không chặn release.

### Phase 9 — MVP Deployment & Acceptance

- [ ] Supabase production.
- [ ] Apply migration/RLS.
- [ ] Vercel environments.
- [ ] Preview + production deployment.
- [ ] Production smoke test.
- [ ] Đối chiếu use case trong PDF.
- [x] Hoàn thiện README + production deployment runbook.

**Production gate:** chưa mark complete khi chưa có production Supabase hosted project, usable demo email/OTP path, Vercel project/env và acceptance evidence thật. Free-plan exceptions (exact 6/30 lock, leaked-password protection, unrestricted SMTP) phải được ghi rõ và không được claim là implemented.

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

**Báo cáo tác động nghiệp vụ bắt buộc cho mọi PR:** ghi rõ `Business impact: YES/NO`, mô tả hành vi/yêu cầu trước và sau, phân biệt `thay đổi nghiệp vụ` với `đổi tiêu chí triển khai/demo`, nêu phạm vi bị ảnh hưởng và dẫn `docs/business-change-log.md` + vị trí tương ứng trong PDF (nếu đã xác minh). Nếu chưa đọc được PDF, ghi `PDF reference: UNVERIFIED`; không được tự sửa hay claim thay đổi đã được phản ánh vào PDF. Các khác biệt phải có Decision Log/Issue và quyết định của chủ dự án trước khi acceptance.

## 8. Decision Log cần khóa trước khi code phụ thuộc

- [x] Auth: Supabase Auth.
- [x] OTP/email: Supabase Auth email OTP; Mailpit local/CI; **hosted Free classroom/demo** có thể dùng default SMTP **chỉ với email pre-authorized trong project team**; gửi email công khai/không giới hạn địa chỉ cần custom SMTP. Hosted production acceptance vẫn phải xác minh OTP 8 chữ số / hết hạn 600 giây.
- [x] Audit log: Supabase Auth audit logging; không thêm business audit table.
- [ ] Enum strategy.
- [ ] Delete/cascade/restrict strategy.
- [ ] Chuẩn hóa thuật ngữ “vai trò” và “chức danh” trong code.
- [x] Password policy: minimum 8, lowercase + uppercase + digit, symbol optional.
- [x] MVP production Auth exception (2026-10-09, **BC-001** ở `docs/business-change-log.md`): dùng hosted Supabase Free. Password Verification Attempt Hook chỉ có Teams/Enterprise, nên exact per-account 6 failures -> 30-minute lock được defer khỏi production MVP acceptance. Không thay bằng Next.js-only counter vì public Auth endpoint có thể bypass. Production dùng provider rate limits/abuse protection + existing password policy; local/CI vẫn test hook state machine. Nếu canonical PDF bắt buộc exact 6/30, ghi nhận đây là known MVP deviation.
- [ ] Session duration — **defer sau MVP**. Không bật time-boxed lifetime khi unconditional-reauth compatibility shim còn backdate `auth.sessions.created_at`; đồng thời không bật MFA/low-AAL lifetime dựa trên cùng timestamp. Trên hosted Supabase, acceptance phải verify reauthentication end-to-end trên project thật thay vì claim immutable GoTrue pin.
- [ ] Notification delete rule.
- [x] Statistics: dùng narrow `SECURITY DEFINER` RPC dưới caller JWT để trả aggregate theo scope; không mở raw customer rows. Export dùng cùng RPC để giữ authorization contract thống nhất.

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
- [x] Reviewer LOW F-3 của PR #7 được xử lý theo hosted-managed exception: giữ Timebox/AllowLowAAL disabled khi shim còn dùng `auth.sessions.created_at`; production acceptance dùng end-to-end OTP verification thay vì claim immutable self-hosted GoTrue pin.

- [x] Phase 3 đã independent review PASS và merge vào \`main\` qua PR #10.
- [x] Phase 4-6 source-confirmed MVP đã independent review PASS và merge vào `main` qua PR #11.

- [x] Phase 7 + Phase 8 và Phase 9 deployment preparation đã independent review PASS và merge qua PR #12.
- [x] Production function ACL hardening đã independent review PASS và merge qua PR #14.
- [ ] Phase 9 production acceptance tiếp tục ở Issue #13 với hosted Supabase Free; exact 6/30 lock là documented MVP exception.
- [ ] Hosted OTP acceptance (BC-003): xác minh và ghi bằng chứng từ **project thực tế** cho OTP **length=8** và **expiry=600 seconds**, đồng thời test reauthentication/recovery. Nếu khác: ghi observed settings, lấy quyết định thay đổi nghiệp vụ và re-review trước khi đánh dấu PASS; không coi local/CI là production evidence.

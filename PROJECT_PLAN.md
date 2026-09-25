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

- [ ] Đăng ký SA.
- [ ] Trạng thái chờ phê duyệt.
- [ ] Đăng nhập.
- [ ] Đăng xuất.
- [ ] Đổi/đặt lại mật khẩu.
- [ ] OTP email.
- [ ] Xử lý trạng thái tài khoản.
- [ ] Khóa tạm sau nhiều lần đăng nhập sai theo đặc tả.

### Phase 3 — Admin / RBAC

- [ ] CRUD/vòng đời tài khoản.
- [ ] Phê duyệt, khóa, xóa tài khoản.
- [ ] CRUD chức danh/vai trò.
- [ ] Gán/thu hồi chức danh.
- [ ] CRUD quyền.
- [ ] Gán/thu hồi quyền cho chức danh.
- [ ] Không gán quyền trực tiếp cho tài khoản.

### Phase 4 — Customer + Personnel

Khách hàng:
- [ ] Thêm, danh sách, chi tiết, cập nhật, xóa.
- [ ] Tìm kiếm.
- [ ] Lọc.
- [ ] Enforce ownership.

Nhân sự:
- [ ] Cây nhân sự.
- [ ] Chi tiết nhân sự trong scope.
- [ ] Thống kê tóm tắt khách hàng/hoạt động.
- [ ] Không cho quản lý mở/sửa/xóa hồ sơ khách hàng cấp dưới trái đặc tả.

### Phase 5 — Business Activity

- [ ] Tạo hoạt động.
- [ ] Lịch sử hoạt động.
- [ ] Cập nhật/xóa hoạt động của chính mình.
- [ ] DM/UM xem hoạt động cấp dưới.
- [ ] Hỗ trợ loại hoạt động khảo sát, gặp gỡ, tư vấn.

### Phase 6 — Notification

- [ ] DM tạo thông báo.
- [ ] Chưa gửi/đã gửi.
- [ ] Chọn người nhận trong scope.
- [ ] Cập nhật/xóa theo business rule.
- [ ] Đã đọc/chưa đọc theo người nhận.

### Phase 7 — Reports & Statistics

- [ ] Cá nhân.
- [ ] Nhóm.
- [ ] Tổng quan.
- [ ] Ngày/tuần/tháng.
- [ ] So sánh cá nhân/nhóm.
- [ ] Xuất Excel.
- [ ] Mọi query/export phải tuân thủ scope.

### Phase 8 — Testing + Security Hardening

- [ ] Unit test.
- [ ] Integration test.
- [ ] RLS test.
- [ ] Permission matrix.
- [ ] Ownership test.
- [ ] Auth/session test.
- [ ] Secret leakage check.
- [ ] CI validation.

### Phase 9 — Deployment & Acceptance

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

- [ ] Auth dùng Supabase Auth hay cơ chế tự quản lý.
- [ ] OTP/email provider.
- [ ] Audit log strategy.
- [ ] Enum strategy.
- [ ] Delete/cascade/restrict strategy.
- [ ] Chuẩn hóa thuật ngữ “vai trò” và “chức danh” trong code.
- [ ] Password policy cụ thể.
- [ ] Session duration.
- [ ] Notification delete rule.
- [ ] Statistics: query trực tiếp, view hay RPC.

Không tự suy diễn các quyết định trên nếu ảnh hưởng kiến trúc hoặc business behavior.

## 9. Trạng thái

- [x] Repository mới đã được xác định.
- [x] Repository đã được khởi tạo.
- [x] Canonical-source policy đã được tạo.
- [x] Master plan đã được chuyển sang repository mới.
- [ ] PDF gốc cần xuất hiện tại `docs/source/Bao-cao-mon-opensource.pdf`.
- [ ] Phase 0 chưa triển khai.

# Sổ triển khai tuần tự

Không merge/push lên main. Các nhánh xếp chồng; base của mỗi phần là nhánh liền trước. Kết quả dưới đây là local, không phải CI/production.

| Phần | Nhánh | Base | Kết quả |
| --- | --- | --- | --- |
| Kế hoạch | docs/implementation-plan-20261106 | main @ 2b9f19f | Đã lưu kế hoạch |
| R0 | docs/requirements-acceptance-baseline | docs/implementation-plan-20261106 | Contract và phạm vi đã ghi |
| R1 | fix/notification-permission-revocation | docs/requirements-acceptance-baseline | PASS: 338 pgTAP assertions sau reset; 5 Auth suites; 123 contracts; lint/type/security/build. Cảnh báo ARIA cũ dành cho R4. Browser đa vai trò sẽ xác minh thêm tại R10 |

R1 — Business impact: NO, khôi phục enforcement đã có trong contract. Regression mới thất bại 3 ca trên baseline trước sửa và đạt 9/9 sau migration. Các thay đổi nằm trong migration forward `20261106010000_notification_permission_revocation.sql`; không sửa migration cũ. Hosted chưa áp dụng.

R2 — `fix/search-literal-handling`, base R1. Business impact: NO, sửa tìm kiếm theo literal. PASS: 125 contracts, type/lint/security/build và integration PostgREST thật cho email, mã, dấu nháy/ngoặc/backslash/wildcard, count và anonymous denial. Chuyển query OR sang regex imatch đã escape literal, quote giá trị PostgREST độc lập; caller không đưa tên cột từ input.

R3 — `feature/customer-search-filters`, base R2. Business impact: NO, hoàn thiện PDF 3.6/3.7. PASS: truy vấn thật địa chỉ + giới tính + DISC, count trước phân trang; 125 contracts, lint/type/security/build. Giới tính được kiểm tra allow-list, count/list và filter chips giữ cùng tham số.

R4 — `fix/checkbox-picker-accessibility`, base R3. Business impact: NO. PASS: lint không còn cảnh báo ARIA; 125 contracts/type/security/build; Chromium thật ở 375/768/1024/1440px cho required error/focus, Space toggle, giữ lựa chọn khi lọc, bỏ chọn và picker permission. Chưa thực hiện smoke bằng phần mềm screen reader, không coi accessibility toàn hệ thống là PASS chỉ từ các kiểm tra này.

R5 — `chore/dependency-security-updates`, base R4. Business impact: NO. PASS: frozen install, 0 vulnerabilities full audit, projectService allow/deny trên minimatch 11.0.1; lint/type/contracts/security/build. Xem dependency-security-20261106.md để biết phạm vi override parser.

R6 — `fix/role-editor-contract`, base R5. Business impact: NO, khớp giao diện với RPC sẵn có. PASS: 126 contracts/lint/type/security/build; browser lưu metadata custom role, metadata DM read-only, ADMIN không có editor và SA bị từ chối. Bảng contract hiện hành nằm trong role-editor-contract.md; không viết lại lịch sử quyết định BC-005.

R7 — `feature/admin-account-creation`, base R6. Business impact: NO, hoàn thiện PDF 2.1.1. PASS: clean migration reset + 338 pgTAP assertions + 7 Auth/integration suites; 131 contracts/lint/type/security/build. Integration tạo DM/UM/SA, retry idempotent, duplicate compensation, invalid manager, marker/cross-actor/non-Admin denial. Browser tạo DM active và xác minh mật khẩu không vào draft/trang kết quả. Hosted chưa áp dụng migration hoặc xác minh server key; xem admin-account-creation.md.

R8 — `feature/report-xlsx-export`, base R7. Business impact: NO, hoàn thiện PDF 7.6. PASS: 135 contracts/lint/type/security/build, XLSX round-trip tiếng Việt/số/text công thức/empty; browser chọn kỳ/phạm vi/cột độc lập, required-selection error, tải XLSX thật, anonymous denial; full audit 0 vulnerabilities. Không tuyên bố đã mở Microsoft Excel GUI. Xem report-export-contract.md.

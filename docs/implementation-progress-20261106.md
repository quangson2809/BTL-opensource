# Sổ triển khai tuần tự

Không merge/push lên main. Các nhánh xếp chồng; base của mỗi phần là nhánh liền trước. Kết quả dưới đây là local, không phải CI/production.

| Phần | Nhánh | Base | Kết quả |
| --- | --- | --- | --- |
| Kế hoạch | docs/implementation-plan-20261106 | main @ 2b9f19f | Đã lưu kế hoạch |
| R0 | docs/requirements-acceptance-baseline | docs/implementation-plan-20261106 | Contract và phạm vi đã ghi |
| R1 | fix/notification-permission-revocation | docs/requirements-acceptance-baseline | PASS: 338 pgTAP assertions sau reset; 5 Auth suites; 123 contracts; lint/type/security/build. Cảnh báo ARIA cũ dành cho R4. Browser đa vai trò sẽ xác minh thêm tại R10 |

R1 — Business impact: NO, khôi phục enforcement đã có trong contract. Regression mới thất bại 3 ca trên baseline trước sửa và đạt 9/9 sau migration. Các thay đổi nằm trong migration forward `20261106010000_notification_permission_revocation.sql`; không sửa migration cũ. Hosted chưa áp dụng.

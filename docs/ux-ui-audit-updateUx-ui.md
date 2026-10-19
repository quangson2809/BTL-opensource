# Báo cáo rà soát UX/UI — nhánh updateUx/ui

- **Nhánh gốc được rà soát:** `updateUx/ui`
- **Commit gốc:** `70d5845c696e428a48a78db6ce000df23b0c0ba4`
- **Nhánh chứa các sửa đổi ban đầu:** `fix/ux-ui-resilience`
- **Phương pháp:** rà soát tĩnh route/component/CSS và các luồng biểu mẫu trên mã nguồn; chưa phải kiểm thử trình duyệt thực tế.

## Các vấn đề phát hiện

### P1 — Khả năng phục hồi sau lỗi không đồng nhất
- `src/app/register/page.tsx`, `src/app/login/page.tsx`: form gửi server action rồi chuyển hướng khi lỗi, nhưng không lưu lại các trường không nhạy cảm; người dùng phải nhập lại.
- `src/app/notifications/[id]/edit/page.tsx`: biểu mẫu sửa bản nháp không dùng cơ chế lưu nháp, trong khi trang tạo thông báo đã dùng.
- `src/app/admin/roles/new/page.tsx` và `src/app/admin/roles/[id]/edit/page.tsx`: tên/mô tả và lựa chọn permission có thể mất khi server trả lỗi.
- Các luồng đặt lại/đổi mật khẩu cần giữ email hoặc thông tin không nhạy cảm khi phù hợp, nhưng tuyệt đối không lưu OTP hay mật khẩu.
- **Đã xử lý trong nhánh này:** thêm lưu nháp có chọn lọc cho đăng nhập, đăng ký và sửa bản nháp thông báo; loại trừ password, OTP/token/secret, hidden và các input không thể khôi phục. Các trang vai trò và password vẫn là phần cần xử lý tiếp.

### P1 — Thiếu trạng thái tải ở cấp điều hướng
- Không có `loading.tsx` trong cây route tại commit gốc, dù nhiều trang chờ truy vấn Supabase phía server. Khi chuyển trang hoặc tải trang chậm, người dùng không có phản hồi tiến trình nhất quán.
- **Đã xử lý ban đầu:** thêm `src/app/loading.tsx` dùng component `LoadingState` hiện có.

### P1 — Gửi form có hành vi không đồng nhất
- Đăng nhập và đăng ký dùng nút submit thường, trong khi phần lớn form nghiệp vụ dùng `PendingSubmitButton`. Khi mạng chậm, hai luồng auth không biểu thị trạng thái xử lý và không khóa submit theo cùng quy ước.
- **Đã xử lý ban đầu:** dùng `PendingSubmitButton` cho đăng nhập và đăng ký.

### P1 — Lỗi tải ngữ cảnh tài khoản ở application shell
- `src/components/app-frame.tsx`: `loadAccountContext()` gọi `getUser`, truy vấn tài khoản và nhiều RPC mà không có `try/catch`. Nếu promise bị reject do mạng/runtime, trạng thái `accountLoaded` có thể không bao giờ chuyển; email vẫn hiện “Đang tải tài khoản…” và menu vai trò có thể vắng mặt mà không giải thích.
- **Cần xử lý tiếp:** thêm trạng thái lỗi có thể nhìn thấy và hành động thử lại; không tự cấp quyền/menu khi chưa xác minh vai trò.

### P1 — Tạo thông báo không có hướng dẫn khi không có người nhận
- `src/app/notifications/new/page.tsx` luôn render select nhiều lựa chọn bắt buộc. Nếu danh sách `recipients` rỗng, form không thể gửi nhưng không có thông báo giải thích hoặc hướng xử lý rõ ràng.
- **Cần xử lý tiếp:** empty state rõ ràng, nêu điều kiện cần có người nhận và vô hiệu hóa thao tác tạo bản nháp khi không đáp ứng điều kiện.

### P2 — Chọn nhiều người nhận khó dùng trên thiết bị cảm ứng
- `src/app/notifications/new/page.tsx` và `src/app/notifications/[id]/edit/page.tsx` dùng native `select multiple` và hướng dẫn Ctrl/Cmd. Đây là hướng dẫn phù hợp với bàn phím máy tính nhưng không thân thiện với người dùng mobile.
- **Đề xuất:** component chọn nhiều người nhận bằng checkbox, tìm kiếm và số lượng đã chọn; giữ nguyên danh sách/giới hạn quyền từ backend.

### P2 — Trường giới tính không được chuẩn hóa thành lựa chọn
- `src/app/customers/new/page.tsx` và `src/app/customers/[id]/edit/page.tsx` nhập `gioi_tinh` bằng text tự do. Điều này làm tăng khả năng nhập không nhất quán.
- **Cần xác nhận hợp đồng dữ liệu trước khi đổi:** thống nhất danh mục giá trị hợp lệ với backend/schema, sau đó dùng select/radio có nhãn rõ ràng.

### P2 — Phản hồi lỗi không nhất quán về khả năng truy cập
- Một số nơi dùng `ActionFeedback` với `role=alert`/aria-live, nhưng `src/app/admin/accounts/page.tsx` hiển thị lỗi bằng paragraph thường, không có live region.
- Nhiều form chỉ có lỗi tổng quát phía trên, không liên kết lỗi cụ thể với trường nhập; người dùng phải tự dò trường cần sửa.
- **Cần xử lý tiếp:** thống nhất component phản hồi và bổ sung liên kết lỗi-trường ở các lỗi xác thực có thể xác định cụ thể.

### P2 — Breadcrumb chưa nhất quán giữa các phân hệ
- `src/components/app-frame.tsx`: `breadcrumbHref()` chỉ hỗ trợ một số đường dẫn chi tiết. Các đường dẫn chi tiết của thông báo và vai trò quản trị không có cùng khả năng quay lại theo breadcrumb.
- **Cần xử lý tiếp:** khai báo rõ các route pattern có thể điều hướng, không tự biến mọi segment thành liên kết.

### P2 — Phân cấp bề mặt có nguy cơ lồng card
- `src/app/reports/page.tsx` đặt các card thống kê bên trong vùng `section.card`. Cần kiểm tra bằng ảnh chụp ở desktop/mobile để xác định phần nào là nhóm nội dung thật sự cần bề mặt riêng, phần nào tạo viền/đệm lặp.
- **Cần kiểm chứng trực quan:** không nên đổi chỉ dựa trên markup nếu chưa xem trạng thái render.

## Phạm vi xác minh và giới hạn

- Đã kiểm tra cấu trúc route, các component dùng chung và nhiều luồng chính: auth, khách hàng, hoạt động, thông báo, vai trò, tài khoản, dashboard và báo cáo.
- Các thay đổi ở nhánh này tập trung vào bảo toàn dữ liệu form không nhạy cảm, tránh lưu password/OTP và phản hồi submit/loading nhất quán.
- Chưa chạy `npm run lint`, `npm run type-check`, `npm run test:contracts`, `npm run build` hoặc kiểm thử trình duyệt trong môi trường thực thi. Không coi các thay đổi là đã nghiệm thu cho tới khi CI/build và kiểm thử tương tác được xác nhận.

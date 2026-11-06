# R8 — Xuất báo cáo

Business impact: NO — hoàn thiện PDF 7.6, trang vật lý 29; giữ nguyên scope dữ liệu hiện có.

- `/reports/export-options` cho chọn kỳ/ngày tham chiếu độc lập, phạm vi cá nhân/cấp dưới/toàn bộ được phép và các cột xuất.
- `/reports/export` giữ mặc định CSV cho đường dẫn cũ. `format=xlsx` trả XLSX thực; không đổi đuôi CSV thành XLSX. Cột không có trong allow-list hoặc lựa chọn rỗng của form bị từ chối.
- Dữ liệu dùng cùng `report_scope` dưới caller JWT. Tùy chọn scope chỉ thu hẹp các row RPC đã cho phép; không dùng service-role đọc thêm dữ liệu.
- XLSX dùng String/Number cell rõ ràng; text bắt đầu bằng công thức vẫn là text. CSV UTF-8 có BOM, quote đúng và escape tiền tố công thức kể cả sau khoảng trắng.
- Kết quả có `Cache-Control: private, no-store`. Không lưu file xuất hoặc dữ liệu khách hàng vào repository.
- Test ghi rồi đọc XLSX kiểm tra tiếng Việt, kiểu số, dữ liệu trống, chuỗi công thức; browser tải file thật và đọc lại, kiểm tra lựa chọn kỳ/cột và anonymous denial. Không tuyên bố đã mở bằng Microsoft Excel GUI nếu chỉ đọc round-trip bằng thư viện.

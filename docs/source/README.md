# Tài liệu cơ sở gốc

## Canonical source

Tài liệu gốc của dự án là PDF:

`docs/source/Bao-cao-mon-opensource.pdf`

Thông tin nhận dạng của bản PDF do nhóm cung cấp:

- Tên gốc: `Báo cáo môn opensource.pdf`
- Tiêu đề PDF: `Báo cáo môn opensource`
- Số trang: **135**
- Kích thước: **3,136,689 bytes**
- SHA-256: `9c8ae4801a78f7ba4db60a3d6f5ff37b68555dc08027423b06413c07de7c4332`
- Đề tài: **Quản lý đại lý tại công ty bảo hiểm**

## Quy tắc sử dụng

1. PDF trên là **nguồn yêu cầu nghiệp vụ gốc (source of truth)** của dự án.
2. `PROJECT_PLAN.md`, Issues, code, schema, test và các tài liệu triển khai là tài liệu dẫn xuất.
3. Khi tài liệu dẫn xuất mâu thuẫn với PDF, phải dừng và đối chiếu PDF trước khi sửa code.
4. Không tự bổ sung business rule, field, role, API hoặc acceptance criterion nếu PDF không hỗ trợ và chưa có quyết định mới được ghi nhận.
5. Nếu nhóm thống nhất thay đổi yêu cầu so với PDF, thay đổi phải được ghi vào Issue/Decision Log trước khi triển khai.
6. Không sửa nội dung PDF để khớp với implementation.

## Trạng thái upload

Repository đã được khởi tạo để nhận tài liệu gốc tại đường dẫn trên.

> Lưu ý kỹ thuật: GitHub connector đang dùng trong phiên này chỉ hỗ trợ ghi file UTF-8 qua Contents API, không hỗ trợ truyền trực tiếp file PDF nhị phân từ file đính kèm của ChatGPT. Vì vậy file PDF cần được thêm vào đúng đường dẫn `docs/source/Bao-cao-mon-opensource.pdf` bằng Git/GitHub upload. Sau khi có file, kiểm tra SHA-256 phải trùng giá trị ở trên.

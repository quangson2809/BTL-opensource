# R9 — So sánh nhóm UM

Business impact: YES — cụ thể hóa đơn vị tổng hợp của PDF 7.5 (trang vật lý 29) để triển khai và review. Không thay đổi quyền người dùng.

- Phương án mặc định đã đề xuất trong phiên: UM và toàn bộ cây nhân sự phía dưới, tính cả UM. Câu hỏi tùy chọn chưa có phản hồi khác tại thời điểm triển khai; đây là lựa chọn triển khai công khai, không tuyên bố là trích nguyên văn định nghĩa từ PDF.
- DM xem các nhóm UM ngoài cùng trong cây được phép. UM xem nhóm của mình. Người có đồng thời DM/UM được xử lý theo scope DM, không tự cộng chính mình vào nhóm để nuốt toàn bộ nhóm cấp dưới.
- UM lồng nhau thuộc nhóm ngoài cùng, mỗi tài khoản chỉ được cộng một lần. Nhân sự trực tiếp của DM chưa thuộc UM vẫn ở báo cáo cá nhân/tổng quan, không được tự gán vào một nhóm giả.
- Số nhân sự là quy mô nhóm hiện tại (tính cả UM); khách hàng mới tính theo created_at, hoạt động theo thoi_gian trong cùng khoảng ngày/tuần/tháng Việt Nam của báo cáo hiện có. Không phải snapshot cơ cấu lịch sử.
- `report_team_scope` tái sử dụng scoped aggregates `report_scope`, không trả raw khách hàng và không mở thêm dữ liệu cho SA/Admin đơn thuần. Role UM/DM không đồng nghĩa được sửa khách hàng cấp dưới.
- Xuất so sánh nhóm XLSX dùng cùng RPC, allow-list cột riêng; route CSV cũ và màn xuất theo nhân sự vẫn tương thích.
- Kiểm tra các nhóm rỗng, kỳ không có dữ liệu, nhóm lồng nhau, UM không thấy nhóm ngang cấp, SA/anonymous bị từ chối. Không thêm KPI hợp đồng/doanh thu.

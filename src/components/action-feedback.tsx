type ActionFeedbackProps = {
  error?: string;
  status?: string;
};

const errorMessages: Record<string, string> = {
  invalid: "Vui lòng kiểm tra lại các trường đã nhập.",
  missing: "Vui lòng điền đầy đủ thông tin bắt buộc.",
  create: "Không thể tạo bản ghi. Vui lòng kiểm tra dữ liệu và thử lại.",
  update: "Không thể cập nhật bản ghi. Dữ liệu có thể đã thay đổi hoặc bạn không có quyền.",
  delete: "Không thể xóa bản ghi. Dữ liệu có thể đã thay đổi hoặc bạn không có quyền.",
  send: "Không thể gửi thông báo. Vui lòng kiểm tra trạng thái và quyền truy cập.",
  read: "Không thể cập nhật trạng thái đã đọc.",
  "weak-password": "Mật khẩu chưa đáp ứng chính sách bảo mật.",
  mismatch: "Mật khẩu xác nhận không khớp.",
  "same-password": "Mật khẩu mới phải khác mật khẩu hiện tại.",
  otp: "Mã xác minh không hợp lệ hoặc đã hết hạn.",
  "otp-request": "Không thể gửi mã xác minh. Vui lòng thử lại sau.",
  registration: "Không thể hoàn tất đăng ký với thông tin đã cung cấp.",
  access: "Tài khoản hiện không thể truy cập hệ thống.",
  pending: "Tài khoản đang chờ phê duyệt.",
  locked: "Tài khoản hiện đang bị khóa.",
};

const successMessages: Record<string, string> = {
  created: "Đã tạo thành công.",
  updated: "Đã lưu thay đổi.",
  deleted: "Đã xóa thành công.",
  sent: "Đã gửi thông báo.",
  read: "Đã đánh dấu thông báo là đã đọc.",
  "otp-sent": "Đã gửi yêu cầu mã xác minh. Hãy kiểm tra email.",
  registered: "Đăng ký đã được tiếp nhận.",
  "password-changed": "Mật khẩu đã được cập nhật. Vui lòng đăng nhập lại.",
  "password-reset": "Đã cập nhật mật khẩu. Vui lòng đăng nhập lại.",
};

export function ActionFeedback({ error, status }: ActionFeedbackProps) {
  if (error) {
    return (
      <p aria-live="assertive" className="message error" role="alert">
        {errorMessages[error] ?? "Không thể xử lý yêu cầu. Vui lòng thử lại."}
      </p>
    );
  }

  if (status && successMessages[status]) {
    return (
      <p aria-live="polite" className="message success" role="status">
        {successMessages[status]}
      </p>
    );
  }

  return null;
}

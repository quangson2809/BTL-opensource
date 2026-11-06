/**
 * Chính sách mật khẩu dùng chung: tối thiểu 8 ký tự, có chữ thường, chữ hoa và chữ số.
 */

export function meetsPasswordPolicy(password) {
  return (
    typeof password === "string" &&
    password.length >= 8 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /[0-9]/.test(password)
  );
}

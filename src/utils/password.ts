/**
 * Kiểm tra mật khẩu theo policy backend: ≥8 ký tự (≤100), ≥1 chữ HOA, ≥1 chữ số.
 * Khớp regex backend `^(?=.*[A-Z])(?=.*\d).+$` + ràng buộc @Size(8,100).
 * @returns thông báo lỗi tiếng Việt, hoặc null nếu hợp lệ.
 */
export function validatePasswordPolicy(pw: string): string | null {
  if (pw.length < 8 || pw.length > 100) return "Mật khẩu phải từ 8–100 ký tự";
  if (!/[A-Z]/.test(pw)) return "Mật khẩu phải có ít nhất 1 chữ HOA";
  if (!/\d/.test(pw)) return "Mật khẩu phải có ít nhất 1 chữ số";
  return null;
}

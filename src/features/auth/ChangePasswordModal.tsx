import { useState } from "react";
import { authAPI } from "@/api/endpoints";
import { validatePasswordPolicy } from "@/utils/password";

/** Modal đổi mật khẩu cá nhân — dùng cho mọi role đang đăng nhập. */
export function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const submit = async () => {
    if (!currentPassword.trim()) { setErr("Nhập mật khẩu hiện tại"); return; }
    const pwErr = validatePasswordPolicy(newPassword);
    if (pwErr) { setErr(pwErr); return; }
    if (newPassword !== confirm) { setErr("Xác nhận mật khẩu không khớp"); return; }
    setLoading(true); setErr(null);
    try {
      await authAPI.changePassword({ currentPassword, newPassword });
      setOk(true);
    } catch (e: any) {
      setErr(e.response?.data?.message || "Lỗi đổi mật khẩu");
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Đổi mật khẩu</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        {ok ? (
          <>
            <div className="form-ok" style={{ color: "#4ade80", margin: "8px 0 16px" }}>
              ✓ Đổi mật khẩu thành công
            </div>
            <div className="form-actions">
              <button className="btn-primary" onClick={onClose}>Đóng</button>
            </div>
          </>
        ) : (
          <>
            {err && <div className="form-err">{err}</div>}
            <div className="form-group">
              <label>Mật khẩu hiện tại *</label>
              <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Mật khẩu mới *</label>
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="≥8 ký tự, 1 chữ HOA, 1 số" />
            </div>
            <div className="form-group">
              <label>Xác nhận mật khẩu mới *</label>
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} />
            </div>
            <div className="form-actions">
              <button className="btn-secondary" onClick={onClose}>Huỷ</button>
              <button className="btn-primary" onClick={() => void submit()} disabled={loading}>
                {loading ? "Đang lưu..." : "Đổi mật khẩu"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

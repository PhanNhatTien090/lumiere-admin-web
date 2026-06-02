import { useState, useEffect } from "react";
import { staffAPI } from "@/api/endpoints";
import { Staff, StaffRole, StaffStatus, CreateStaffRequest, UpdateStaffRequest } from "@/types";
import { validatePasswordPolicy } from "@/utils/password";

const ROLE_LABELS: Record<StaffRole, string> = {
  MANAGER: "Quản lý",
  CASHIER: "Thu ngân",
  KITCHEN: "Bếp",
  WAITER: "Phục vụ",
};

const ROLE_COLORS: Record<StaffRole, string> = {
  MANAGER: "#d4ad34",
  CASHIER: "#60a5fa",
  KITCHEN: "#f87171",
  WAITER: "#4ade80",
};

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function StaffForm({ initial, onSave, onClose }: {
  initial?: Staff;
  onSave: () => void;
  onClose: () => void;
}) {
  const [username, setUsername] = useState(initial?.username ?? "");
  const [staffName, setStaffName] = useState(initial?.name || initial?.fullName || "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<StaffRole>(initial?.role ?? "WAITER");
  const [status, setStatus] = useState<StaffStatus>(
    initial?.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
  );
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    if (!staffName.trim()) { setErr("Tên không được trống"); return; }
    if (!username.trim()) { setErr("Tên đăng nhập không được trống"); return; }
    if (!initial) {
      const pwErr = validatePasswordPolicy(password);
      if (pwErr) { setErr(pwErr); return; }
    }
    setLoading(true); setErr(null);
    try {
      if (initial) {
        const data: UpdateStaffRequest = {
          name: staffName.trim(),
          username: username.trim(),
          role,
          status,
        };
        await staffAPI.update(initial.id, data);
      } else {
        const data: CreateStaffRequest = { username: username.trim(), password, name: staffName.trim(), role };
        await staffAPI.create(data);
      }
      onSave();
    } catch (e: any) {
      setErr(e.response?.data?.message || "Lỗi lưu nhân viên");
    } finally { setLoading(false); }
  };

  return (
    <>
      {err && <div className="form-err">{err}</div>}
      {initial?.employeeCode && (
        <div className="form-group">
          <label>Mã nhân viên</label>
          <input value={initial.employeeCode} readOnly disabled />
        </div>
      )}
      <div className="form-group">
        <label>Tên đăng nhập *</label>
        <input value={username} onChange={e => setUsername(e.target.value)} placeholder="VD: cashier03" />
      </div>
      <div className="form-group">
        <label>Họ và tên *</label>
        <input value={staffName} onChange={e => setStaffName(e.target.value)} placeholder="VD: Nguyễn Văn A" />
      </div>
      {!initial && (
        <div className="form-group">
          <label>Mật khẩu *</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="≥8 ký tự, 1 chữ HOA, 1 số" />
        </div>
      )}
      <div className="form-group">
        <label>Vai trò</label>
        <select value={role} onChange={e => setRole(e.target.value as StaffRole)}>
          {(Object.keys(ROLE_LABELS) as StaffRole[]).map(r => (
            <option key={r} value={r}>{ROLE_LABELS[r]}</option>
          ))}
        </select>
      </div>
      {initial && (
        <div className="form-group">
          <label>Trạng thái</label>
          <select value={status} onChange={e => setStatus(e.target.value as StaffStatus)}>
            <option value="ACTIVE">Hoạt động</option>
            <option value="INACTIVE">Ngừng hoạt động</option>
          </select>
        </div>
      )}
      <div className="form-actions">
        <button className="btn-secondary" onClick={onClose}>Huỷ</button>
        <button className="btn-primary" onClick={() => void submit()} disabled={loading}>
          {loading ? "Đang lưu..." : initial ? "Cập nhật" : "Tạo nhân viên"}
        </button>
      </div>
    </>
  );
}

/** Modal đặt lại mật khẩu cho 1 nhân viên (MANAGER). */
function ResetPasswordForm({ staff, onDone, onClose }: {
  staff: Staff;
  onDone: () => void;
  onClose: () => void;
}) {
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    const pwErr = validatePasswordPolicy(newPassword);
    if (pwErr) { setErr(pwErr); return; }
    setLoading(true); setErr(null);
    try {
      await staffAPI.resetPassword(staff.id, newPassword);
      onDone();
    } catch (e: any) {
      setErr(e.response?.data?.message || "Lỗi đặt lại mật khẩu");
    } finally { setLoading(false); }
  };

  return (
    <>
      {err && <div className="form-err">{err}</div>}
      <p style={{ margin: "0 0 12px", color: "#9ca3af" }}>
        Đặt mật khẩu mới cho <b>{staff.name || staff.fullName || staff.username}</b> ({staff.username})
      </p>
      <div className="form-group">
        <label>Mật khẩu mới *</label>
        <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="≥8 ký tự, 1 chữ HOA, 1 số" />
      </div>
      <div className="form-actions">
        <button className="btn-secondary" onClick={onClose}>Huỷ</button>
        <button className="btn-primary" onClick={() => void submit()} disabled={loading}>
          {loading ? "Đang lưu..." : "Đặt lại mật khẩu"}
        </button>
      </div>
    </>
  );
}

export function StaffScreen() {
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<"create" | "edit" | "reset" | null>(null);
  const [editStaff, setEditStaff] = useState<Staff | undefined>();
  const [filterRole, setFilterRole] = useState<StaffRole | "ALL">("ALL");
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const res = await staffAPI.list();
      setStaffList(res.data.data);
    } catch (e: any) {
      if (!e.response) {
        setError("Không thể kết nối đến máy chủ. Kiểm tra backend localhost:8080.");
      } else if (e.response?.status === 500) {
        setError(`Lỗi máy chủ (500): ${e.response?.data?.message || "Backend đang gặp sự cố nội bộ"}`);
      } else {
        setError(e.response?.data?.message || "Lỗi tải danh sách nhân viên");
      }
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const deleteStaff = async (s: Staff) => {
    if (!confirm(`Xoá nhân viên "${s.name || s.fullName || s.username}" (${s.username})?`)) return;
    try {
      await staffAPI.remove(s.id);
      load();
    } catch (e: any) {
      alert(e.response?.data?.message || "Lỗi xoá nhân viên");
    }
  };

  const filtered = staffList.filter(s => {
    const matchRole = filterRole === "ALL" || s.role === filterRole;
    const matchSearch = (s.name || s.fullName || s.username || "").toLowerCase().includes(search.toLowerCase()) ||
      s.username.toLowerCase().includes(search.toLowerCase());
    return matchRole && matchSearch;
  });

  const roleCounts = staffList.reduce((acc, s) => {
    acc[s.role] = (acc[s.role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="screen">
      <header className="screen-header">
        <div>
          <h2>Quản lý <span>Nhân viên</span></h2>
          <p>{staffList.length} nhân viên</p>
        </div>
        <button className="btn-primary" onClick={() => { setModal("create"); setEditStaff(undefined); }}>
          + Thêm nhân viên
        </button>
      </header>

      {error && <div className="alert-error">{error}</div>}

      {/* Role summary */}
      <div className="role-summary">
        {(Object.keys(ROLE_LABELS) as StaffRole[]).map(r => (
          <div key={r} className="role-chip" style={{ borderColor: ROLE_COLORS[r] }}>
            <span style={{ color: ROLE_COLORS[r] }}>{ROLE_LABELS[r]}</span>
            <b>{roleCounts[r] || 0}</b>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <input
          className="search-input"
          placeholder="🔍 Tìm theo tên hoặc username..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select value={filterRole} onChange={e => setFilterRole(e.target.value as StaffRole | "ALL")}>
          <option value="ALL">Tất cả vai trò</option>
          {(Object.keys(ROLE_LABELS) as StaffRole[]).map(r => (
            <option key={r} value={r}>{ROLE_LABELS[r]}</option>
          ))}
        </select>
      </div>

      {loading && <div className="loading-state">Đang tải...</div>}

      <div className="staff-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Mã NV</th>
              <th>Họ và tên</th>
              <th>Username</th>
              <th>Vai trò</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s, idx) => (
              <tr key={s.id}>
                <td>{idx + 1}</td>
                <td><code>{s.employeeCode || "—"}</code></td>
                <td><strong>{s.name || s.fullName || s.username}</strong></td>
                <td><code>{s.username}</code></td>
                <td>
                  <span className="role-badge" style={{ background: ROLE_COLORS[s.role] + "22", color: ROLE_COLORS[s.role], border: `1px solid ${ROLE_COLORS[s.role]}44` }}>
                    {ROLE_LABELS[s.role]}
                  </span>
                </td>
                <td>
                  <span className={`status-badge ${s.status === "INACTIVE" ? "inactive" : "active"}`}>
                    {s.status === "INACTIVE" ? "Ngừng hoạt động" : "Hoạt động"}
                  </span>
                </td>
                <td>
                  <div className="row-actions">
                    <button className="btn-small" onClick={() => { setEditStaff(s); setModal("edit"); }}>✏️ Sửa</button>
                    <button className="btn-small" onClick={() => { setEditStaff(s); setModal("reset"); }}>🔑 Đặt lại MK</button>
                    <button className="btn-small danger" onClick={() => void deleteStaff(s)}>🗑️ Xoá</button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && !loading && (
              <tr>
                <td colSpan={7} className="empty-cell">Không tìm thấy nhân viên</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modal === "reset" && editStaff ? (
        <Modal title="Đặt lại mật khẩu" onClose={() => setModal(null)}>
          <ResetPasswordForm
            staff={editStaff}
            onDone={() => { setModal(null); alert("Đã đặt lại mật khẩu"); }}
            onClose={() => setModal(null)}
          />
        </Modal>
      ) : modal ? (
        <Modal title={modal === "create" ? "Thêm nhân viên" : "Sửa nhân viên"} onClose={() => setModal(null)}>
          <StaffForm initial={editStaff} onSave={() => { setModal(null); load(); }} onClose={() => setModal(null)} />
        </Modal>
      ) : null}
    </div>
  );
}

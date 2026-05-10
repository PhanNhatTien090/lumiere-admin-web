import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { staffAPI } from "@/api/endpoints";
const ROLE_LABELS = {
    MANAGER: "Quản lý",
    CASHIER: "Thu ngân",
    KITCHEN: "Bếp",
    WAITER: "Phục vụ",
};
const ROLE_COLORS = {
    MANAGER: "#d4ad34",
    CASHIER: "#60a5fa",
    KITCHEN: "#f87171",
    WAITER: "#4ade80",
};
function Modal({ title, onClose, children }) {
    return (_jsx("div", { className: "modal-overlay", onClick: onClose, children: _jsxs("div", { className: "modal-box", onClick: e => e.stopPropagation(), children: [_jsxs("div", { className: "modal-header", children: [_jsx("h3", { children: title }), _jsx("button", { className: "modal-close", onClick: onClose, children: "\u2715" })] }), children] }) }));
}
function StaffForm({ initial, onSave, onClose }) {
    const [username, setUsername] = useState(initial?.username ?? "");
    const [staffName, setStaffName] = useState(initial?.name || initial?.fullName || "");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState(initial?.role ?? "WAITER");
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState(null);
    const submit = async () => {
        if (!staffName.trim()) {
            setErr("Tên không được trống");
            return;
        }
        if (!initial && !username.trim()) {
            setErr("Tên đăng nhập không được trống");
            return;
        }
        if (!initial && !password.trim()) {
            setErr("Mật khẩu không được trống");
            return;
        }
        setLoading(true);
        setErr(null);
        try {
            if (initial) {
                const data = { name: staffName.trim(), role };
                await staffAPI.update(initial.id, data);
            }
            else {
                const data = { username: username.trim(), password, name: staffName.trim(), role };
                await staffAPI.create(data);
            }
            onSave();
        }
        catch (e) {
            setErr(e.response?.data?.message || "Lỗi lưu nhân viên");
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsxs(_Fragment, { children: [err && _jsx("div", { className: "form-err", children: err }), !initial && (_jsxs("div", { className: "form-group", children: [_jsx("label", { children: "T\u00EAn \u0111\u0103ng nh\u1EADp *" }), _jsx("input", { value: username, onChange: e => setUsername(e.target.value), placeholder: "VD: cashier03" })] })), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "H\u1ECD v\u00E0 t\u00EAn *" }), _jsx("input", { value: staffName, onChange: e => setStaffName(e.target.value), placeholder: "VD: Nguy\u1EC5n V\u0103n A" })] }), !initial && (_jsxs("div", { className: "form-group", children: [_jsx("label", { children: "M\u1EADt kh\u1EA9u *" }), _jsx("input", { type: "password", value: password, onChange: e => setPassword(e.target.value), placeholder: "M\u1EADt kh\u1EA9u..." })] })), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Vai tr\u00F2" }), _jsx("select", { value: role, onChange: e => setRole(e.target.value), children: Object.keys(ROLE_LABELS).map(r => (_jsx("option", { value: r, children: ROLE_LABELS[r] }, r))) })] }), _jsxs("div", { className: "form-actions", children: [_jsx("button", { className: "btn-secondary", onClick: onClose, children: "Hu\u1EF7" }), _jsx("button", { className: "btn-primary", onClick: () => void submit(), disabled: loading, children: loading ? "Đang lưu..." : initial ? "Cập nhật" : "Tạo nhân viên" })] })] }));
}
export function StaffScreen() {
    const [staffList, setStaffList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [modal, setModal] = useState(null);
    const [editStaff, setEditStaff] = useState();
    const [filterRole, setFilterRole] = useState("ALL");
    const [search, setSearch] = useState("");
    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await staffAPI.list();
            setStaffList(res.data.data);
        }
        catch (e) {
            if (!e.response) {
                setError("Không thể kết nối đến máy chủ. Kiểm tra backend localhost:8080.");
            }
            else if (e.response?.status === 500) {
                setError(`Lỗi máy chủ (500): ${e.response?.data?.message || "Backend đang gặp sự cố nội bộ"}`);
            }
            else {
                setError(e.response?.data?.message || "Lỗi tải danh sách nhân viên");
            }
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => { load(); }, []);
    const deleteStaff = async (s) => {
        if (!confirm(`Xoá nhân viên "${s.name || s.fullName || s.username}" (${s.username})?`))
            return;
        try {
            await staffAPI.remove(s.id);
            load();
        }
        catch (e) {
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
    }, {});
    return (_jsxs("div", { className: "screen", children: [_jsxs("header", { className: "screen-header", children: [_jsxs("div", { children: [_jsxs("h2", { children: ["Qu\u1EA3n l\u00FD ", _jsx("span", { children: "Nh\u00E2n vi\u00EAn" })] }), _jsxs("p", { children: [staffList.length, " nh\u00E2n vi\u00EAn"] })] }), _jsx("button", { className: "btn-primary", onClick: () => { setModal("create"); setEditStaff(undefined); }, children: "+ Th\u00EAm nh\u00E2n vi\u00EAn" })] }), error && _jsx("div", { className: "alert-error", children: error }), _jsx("div", { className: "role-summary", children: Object.keys(ROLE_LABELS).map(r => (_jsxs("div", { className: "role-chip", style: { borderColor: ROLE_COLORS[r] }, children: [_jsx("span", { style: { color: ROLE_COLORS[r] }, children: ROLE_LABELS[r] }), _jsx("b", { children: roleCounts[r] || 0 })] }, r))) }), _jsxs("div", { className: "filter-bar", children: [_jsx("input", { className: "search-input", placeholder: "\uD83D\uDD0D T\u00ECm theo t\u00EAn ho\u1EB7c username...", value: search, onChange: e => setSearch(e.target.value) }), _jsxs("select", { value: filterRole, onChange: e => setFilterRole(e.target.value), children: [_jsx("option", { value: "ALL", children: "T\u1EA5t c\u1EA3 vai tr\u00F2" }), Object.keys(ROLE_LABELS).map(r => (_jsx("option", { value: r, children: ROLE_LABELS[r] }, r)))] })] }), loading && _jsx("div", { className: "loading-state", children: "\u0110ang t\u1EA3i..." }), _jsx("div", { className: "staff-table-wrap", children: _jsxs("table", { className: "data-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "#" }), _jsx("th", { children: "H\u1ECD v\u00E0 t\u00EAn" }), _jsx("th", { children: "Username" }), _jsx("th", { children: "Vai tr\u00F2" }), _jsx("th", { children: "Tr\u1EA1ng th\u00E1i" }), _jsx("th", { children: "Thao t\u00E1c" })] }) }), _jsxs("tbody", { children: [filtered.map((s, idx) => (_jsxs("tr", { children: [_jsx("td", { children: idx + 1 }), _jsx("td", { children: _jsx("strong", { children: s.name || s.fullName || s.username }) }), _jsx("td", { children: _jsx("code", { children: s.username }) }), _jsx("td", { children: _jsx("span", { className: "role-badge", style: { background: ROLE_COLORS[s.role] + "22", color: ROLE_COLORS[s.role], border: `1px solid ${ROLE_COLORS[s.role]}44` }, children: ROLE_LABELS[s.role] }) }), _jsx("td", { children: _jsx("span", { className: `status-badge ${s.status === "INACTIVE" ? "inactive" : "active"}`, children: s.status === "INACTIVE" ? "Ngừng hoạt động" : "Hoạt động" }) }), _jsx("td", { children: _jsxs("div", { className: "row-actions", children: [_jsx("button", { className: "btn-small", onClick: () => { setEditStaff(s); setModal("edit"); }, children: "\u270F\uFE0F S\u1EEDa" }), _jsx("button", { className: "btn-small danger", onClick: () => void deleteStaff(s), children: "\uD83D\uDDD1\uFE0F Xo\u00E1" })] }) })] }, s.id))), filtered.length === 0 && !loading && (_jsx("tr", { children: _jsx("td", { colSpan: 6, className: "empty-cell", children: "Kh\u00F4ng t\u00ECm th\u1EA5y nh\u00E2n vi\u00EAn" }) }))] })] }) }), modal && (_jsx(Modal, { title: modal === "create" ? "Thêm nhân viên" : "Sửa nhân viên", onClose: () => setModal(null), children: _jsx(StaffForm, { initial: editStaff, onSave: () => { setModal(null); load(); }, onClose: () => setModal(null) }) }))] }));
}

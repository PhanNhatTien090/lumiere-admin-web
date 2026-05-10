import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { tableAPI } from "@/api/endpoints";
const STATUS_LABELS = {
    AVAILABLE: "Trống",
    OCCUPIED: "Đang dùng",
    RESERVED: "Đặt trước",
    CLEANING: "Chờ dọn · thanh toán",
};
/** LUMIÈRE table status palette — aligned with POS / UX spec */
const STATUS_COLORS = {
    AVAILABLE: "#16A34A",
    RESERVED: "#CA8A04",
    OCCUPIED: "#2563EB",
    CLEANING: "#EA580C",
};
function Modal({ title, onClose, children }) {
    return (_jsx("div", { className: "modal-overlay", onClick: onClose, children: _jsxs("div", { className: "modal-box", onClick: e => e.stopPropagation(), children: [_jsxs("div", { className: "modal-header", children: [_jsx("h3", { children: title }), _jsx("button", { className: "modal-close", onClick: onClose, children: "\u2715" })] }), children] }) }));
}
function TableForm({ initial, onSave, onClose }) {
    const [tableCode, setTableCode] = useState(initial?.tableCode ?? "");
    const [floor, setFloor] = useState(initial?.floor ?? 1);
    const [tableNo, setTableNo] = useState(initial?.tableNo ?? 1);
    const [capacity, setCapacity] = useState(initial?.capacity ?? 4);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState(null);
    const submit = async () => {
        if (!tableCode.trim()) {
            setErr("Mã bàn không được trống");
            return;
        }
        setLoading(true);
        setErr(null);
        try {
            const data = { tableCode: tableCode.trim(), floor, tableNo, capacity };
            if (initial)
                await tableAPI.update(initial.tableCode, data);
            else
                await tableAPI.create(data);
            onSave();
        }
        catch (e) {
            setErr(e.response?.data?.message || "Lỗi lưu bàn");
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsxs(_Fragment, { children: [err && _jsx("div", { className: "form-err", children: err }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "M\u00E3 b\u00E0n *" }), _jsx("input", { value: tableCode, onChange: e => setTableCode(e.target.value), placeholder: "VD: T01", disabled: !!initial })] }), _jsxs("div", { className: "form-row", children: [_jsxs("div", { className: "form-group", children: [_jsx("label", { children: "T\u1EA7ng" }), _jsx("input", { type: "number", value: floor, onChange: e => setFloor(+e.target.value), min: 1 })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "S\u1ED1 b\u00E0n" }), _jsx("input", { type: "number", value: tableNo, onChange: e => setTableNo(+e.target.value), min: 1 })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "S\u1EE9c ch\u1EE9a" }), _jsx("input", { type: "number", value: capacity, onChange: e => setCapacity(+e.target.value), min: 1 })] })] }), _jsxs("div", { className: "form-actions", children: [_jsx("button", { className: "btn-secondary", onClick: onClose, children: "Hu\u1EF7" }), _jsx("button", { className: "btn-primary", onClick: submit, disabled: loading, children: loading ? "Đang lưu..." : initial ? "Cập nhật" : "Tạo bàn" })] })] }));
}
function QrPanel({ table, onClose }) {
    const [qr, setQr] = useState(null);
    const [loading, setLoading] = useState(false);
    const [rotating, setRotating] = useState(false);
    const [err, setErr] = useState(null);
    const loadQr = async () => {
        setLoading(true);
        setErr(null);
        try {
            const res = await tableAPI.getQr(table.tableCode);
            setQr(res.data.data);
        }
        catch (e) {
            setErr(e.response?.data?.message || "Lỗi tải QR Code");
        }
        finally {
            setLoading(false);
        }
    };
    const rotateQr = async () => {
        if (!confirm(`Xác nhận tạo QR mới cho bàn ${table.tableCode}? QR cũ sẽ bị vô hiệu hoá.`))
            return;
        setRotating(true);
        try {
            const res = await tableAPI.rotateQr(table.tableCode);
            setQr(res.data.data);
        }
        catch (e) {
            alert(e.response?.data?.message || "Lỗi rotate QR");
        }
        finally {
            setRotating(false);
        }
    };
    useEffect(() => { loadQr(); }, []);
    return (_jsxs(Modal, { title: `QR Code — Bàn ${table.tableCode}`, onClose: onClose, children: [loading && _jsx("div", { className: "loading-state", children: "\u0110ang t\u1EA3i QR..." }), err && _jsx("div", { className: "form-err", children: err }), qr && (_jsxs("div", { className: "qr-panel", children: [qr.qrImageUrl ? (_jsx("img", { src: qr.qrImageUrl, alt: "QR Code", className: "qr-img" })) : (_jsxs("div", { className: "qr-placeholder", children: [_jsx("p", { children: "QR Content:" }), _jsx("code", { children: qr.qrContent })] })), qr.expiresAt && (_jsxs("p", { className: "qr-expire", children: ["H\u1EBFt h\u1EA1n: ", new Date(qr.expiresAt).toLocaleString("vi-VN")] })), _jsxs("div", { className: "form-actions", style: { marginTop: 16 }, children: [_jsx("button", { className: "btn-danger", onClick: rotateQr, disabled: rotating, children: rotating ? "Đang xử lý..." : "🔄 Xoay QR mới" }), _jsx("button", { className: "btn-secondary", onClick: onClose, children: "\u0110\u00F3ng" })] })] }))] }));
}
export function TablesScreen() {
    const [tables, setTables] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [tableModal, setTableModal] = useState(null);
    const [editTable, setEditTable] = useState();
    const [qrTable, setQrTable] = useState(null);
    const [filterFloor, setFilterFloor] = useState(null);
    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await tableAPI.list();
            setTables(res.data.data);
        }
        catch (e) {
            if (!e.response) {
                setError("Không thể kết nối đến máy chủ. Kiểm tra backend localhost:8080.");
            }
            else if (e.response?.status === 500) {
                setError(`Lỗi máy chủ (500): ${e.response?.data?.message || "Backend đang gặp sự cố nội bộ"}`);
            }
            else {
                setError(e.response?.data?.message || "Lỗi tải danh sách bàn");
            }
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => { load(); }, []);
    const deleteTable = async (t) => {
        if (!confirm(`Xoá bàn ${t.tableCode}?`))
            return;
        try {
            await tableAPI.remove(t.tableCode);
            load();
        }
        catch (e) {
            alert(e.response?.data?.message || "Lỗi xoá bàn");
        }
    };
    const floors = [...new Set(tables.map(t => t.floor))].sort();
    const displayTables = filterFloor !== null ? tables.filter(t => t.floor === filterFloor) : tables;
    return (_jsxs("div", { className: "screen", children: [_jsxs("header", { className: "screen-header", children: [_jsxs("div", { children: [_jsxs("h2", { children: ["B\u00E0n & ", _jsx("span", { children: "QR Code" })] }), _jsxs("p", { children: [tables.length, " b\u00E0n \u00B7 ", floors.length, " t\u1EA7ng"] })] }), _jsx("button", { className: "btn-primary", onClick: () => { setTableModal("create"); setEditTable(undefined); }, children: "+ Th\u00EAm b\u00E0n" })] }), error && _jsx("div", { className: "alert-error", children: error }), _jsxs("div", { className: "floor-tabs", children: [_jsx("button", { className: `floor-tab ${filterFloor === null ? "active" : ""}`, onClick: () => setFilterFloor(null), children: "T\u1EA5t c\u1EA3" }), floors.map(f => (_jsxs("button", { className: `floor-tab ${filterFloor === f ? "active" : ""}`, onClick: () => setFilterFloor(f), children: ["T\u1EA7ng ", f] }, f)))] }), loading && _jsx("div", { className: "loading-state", children: "\u0110ang t\u1EA3i..." }), _jsxs("div", { className: "table-grid", children: [displayTables.map(table => (_jsxs("div", { className: "table-card", children: [_jsxs("div", { className: "table-card-header", children: [_jsx("div", { className: "table-code", children: table.tableCode }), _jsx("span", { className: "table-status-badge", style: { background: STATUS_COLORS[table.status] }, children: STATUS_LABELS[table.status] })] }), _jsxs("div", { className: "table-details", children: [_jsxs("span", { children: ["T\u1EA7ng ", table.floor, " \u00B7 B\u00E0n ", table.tableNo] }), _jsxs("span", { children: ["\uD83D\uDC65 ", table.capacity, " ng\u01B0\u1EDDi"] })] }), _jsxs("div", { className: "table-card-actions", children: [_jsx("button", { type: "button", className: "btn-small", title: "Xem v\u00E0 t\u1EA3i m\u00E3 QR", "aria-label": "M\u00E3 QR b\u00E0n", onClick: () => setQrTable(table), children: "\uD83D\uDD32 QR" }), _jsx("button", { type: "button", className: "btn-small", title: "S\u1EEDa th\u00F4ng tin b\u00E0n", "aria-label": "S\u1EEDa b\u00E0n", onClick: () => { setEditTable(table); setTableModal("edit"); }, children: "\u270F\uFE0F S\u1EEDa" }), _jsx("button", { type: "button", className: "btn-small danger", title: "X\u00F3a b\u00E0n kh\u1ECFi h\u1EC7 th\u1ED1ng", "aria-label": "X\u00F3a b\u00E0n", onClick: () => deleteTable(table), children: "\uD83D\uDDD1\uFE0F" })] })] }, table.id))), displayTables.length === 0 && !loading && (_jsx("div", { className: "empty-state", children: "Kh\u00F4ng c\u00F3 b\u00E0n n\u00E0o" }))] }), tableModal && (_jsx(Modal, { title: tableModal === "create" ? "Thêm bàn mới" : "Sửa bàn", onClose: () => setTableModal(null), children: _jsx(TableForm, { initial: editTable, onSave: () => { setTableModal(null); load(); }, onClose: () => setTableModal(null) }) })), qrTable && _jsx(QrPanel, { table: qrTable, onClose: () => setQrTable(null) })] }));
}

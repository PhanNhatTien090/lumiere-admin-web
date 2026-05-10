import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect, useCallback, useRef } from "react";
import { Modal } from "antd";
import { ClockCircleOutlined, FileTextOutlined, HistoryOutlined } from "@ant-design/icons";
import { QRCodeSVG } from "qrcode.react";
import { PortalLayout } from "@/components/layout/PortalLayout";
import { orderAPI, paymentAPI, shiftAPI } from "@/api/endpoints";
import { useAdminStore } from "@/store/adminStore";
function fmtVnd(n) {
    return new Intl.NumberFormat("vi-VN").format(n) + "đ";
}
function fmtTime(s) {
    return new Date(s).toLocaleString("vi-VN");
}
function parseMoneyInput(raw) {
    const n = Number(raw.replace(/\s/g, "").replace(/\./g, "").replace(",", "."));
    return Number.isFinite(n) ? n : NaN;
}
// ─── Xuất invoice JSON ─────────────────────────────────────────────────────────
function InvoiceJsonExport({ orderId, compact }) {
    const [busy, setBusy] = useState(false);
    const run = async () => {
        setBusy(true);
        try {
            const res = await orderAPI.getInvoiceJson(orderId);
            const body = JSON.stringify(res.data.data, null, 2);
            const blob = new Blob([body], { type: "application/json;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `invoice-order-${orderId}.json`;
            a.click();
            URL.revokeObjectURL(url);
        }
        catch (e) {
            alert(e.response?.data?.message || "Không tải được hóa đơn JSON");
        }
        finally {
            setBusy(false);
        }
    };
    return (_jsx("button", { type: "button", className: compact ? "btn-small" : "btn-secondary", disabled: busy, onClick: () => void run(), children: busy ? "…" : compact ? "📄 JSON" : "📄 Xuất hóa đơn JSON" }));
}
// ─── Order Item list ───────────────────────────────────────────────────────────
function OrderItems({ items }) {
    const billable = items.filter(i => i.billable);
    return (_jsx("div", { className: "order-items", children: billable.map(item => (_jsxs("div", { className: "order-line", children: [_jsxs("span", { className: "item-qty", children: [item.quantity, "x"] }), _jsx("span", { className: "item-name", children: item.menuItemName || `Món #${item.menuItemId}` }), item.note && _jsxs("span", { className: "item-note", children: ["(", item.note, ")"] }), _jsx("span", { className: "item-subtotal", children: fmtVnd(item.subtotal) })] }, item.id))) }));
}
// ─── Payment Form ──────────────────────────────────────────────────────────────
function PaymentForm({ order, shiftId, onPaid }) {
    const { staff } = useAdminStore();
    const [method, setMethod] = useState("CASH");
    const [loading, setLoading] = useState(false);
    const [payment, setPayment] = useState(null);
    const [err, setErr] = useState(null);
    const [pollStatus, setPollStatus] = useState(null);
    const pollRef = useRef(null);
    const stopPolling = () => {
        if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
        }
    };
    const pollPaymentStatus = (orderId) => {
        pollRef.current = setInterval(async () => {
            try {
                const res = await paymentAPI.getStatus(orderId);
                const s = res.data.data.status;
                setPollStatus(s);
                if (s === "PAID" || s === "SUCCESS") {
                    stopPolling();
                    onPaid();
                }
                else if (s === "FAILED") {
                    stopPolling();
                    setErr("Thanh toán thất bại. Vui lòng thử lại.");
                    setPayment(null);
                }
            }
            catch { /* ignore */ }
        }, 3000);
    };
    useEffect(() => () => stopPolling(), []);
    // Reset when method changes
    useEffect(() => {
        stopPolling();
        setPayment(null);
        setErr(null);
        setPollStatus(null);
    }, [method]);
    const createPayment = async () => {
        if (!shiftId) {
            setErr("Chưa mở ca. Vui lòng mở ca trước khi thanh toán.");
            return;
        }
        setLoading(true);
        setErr(null);
        try {
            const provider = method === "CASH" ? "CASH" : "VNPAY";
            const res = await paymentAPI.createPayment({
                orderId: order.id,
                shiftId,
                paymentMethod: method,
                provider,
                locale: "vn",
                clientIp: null,
                bankCode: null,
            });
            const p = res.data.data;
            setPayment(p);
            if (method === "QR_CODE") {
                pollPaymentStatus(order.id);
            }
            else if (method === "VNPAY_ATM") {
                const url = p.payUrl || p.qrContent;
                if (url) {
                    sessionStorage.setItem("vnpay_order_id", String(order.id));
                    window.location.href = url;
                }
                else {
                    setErr("Không nhận được link thanh toán từ server.");
                }
            }
        }
        catch (e) {
            if (e.response?.status === 409) {
                try {
                    const s = await paymentAPI.getStatus(order.id);
                    setPollStatus(s.data.data.status);
                    if (s.data.data.status === "PAID")
                        onPaid();
                }
                catch { }
            }
            else {
                setErr(e.response?.data?.message || "Lỗi tạo thanh toán");
            }
        }
        finally {
            setLoading(false);
        }
    };
    const refund = async () => {
        if (!payment)
            return;
        const reason = prompt("Nhập lý do hoàn tiền:");
        if (!reason)
            return;
        try {
            await paymentAPI.refundPayment(payment.paymentId, { amount: payment.amount, reason });
            alert("Hoàn tiền thành công!");
            onPaid();
        }
        catch (e) {
            alert(e.response?.data?.message || "Lỗi hoàn tiền");
        }
    };
    return (_jsxs("div", { className: "payment-form", children: [_jsxs("div", { className: "pay-section", children: [_jsx("h4", { children: "Ph\u01B0\u01A1ng th\u1EE9c thanh to\u00E1n" }), _jsxs("div", { className: "pay-methods", children: [_jsx("button", { className: `pay-method-btn ${method === "CASH" ? "active" : ""}`, onClick: () => setMethod("CASH"), children: "\uD83D\uDCB5 Ti\u1EC1n m\u1EB7t" }), _jsx("button", { className: `pay-method-btn ${method === "QR_CODE" ? "active" : ""}`, onClick: () => setMethod("QR_CODE"), children: "\uD83D\uDCF1 VNPay QR" }), _jsx("button", { className: `pay-method-btn ${method === "VNPAY_ATM" ? "active" : ""}`, onClick: () => setMethod("VNPAY_ATM"), children: "\uD83C\uDFE7 VNPay ATM" })] })] }), _jsxs("div", { className: "total-row", children: [_jsx("span", { children: "T\u1ED5ng c\u1ED9ng" }), _jsx("b", { children: fmtVnd(order.totalAmount) })] }), err && _jsx("div", { className: "form-err", children: err }), !payment ? (_jsx("button", { className: "btn-pay", onClick: createPayment, disabled: loading, children: loading
                    ? "Đang xử lý..."
                    : method === "VNPAY_ATM"
                        ? "🏧 Chuyển sang VNPay"
                        : "💳 Tạo thanh toán" })) : (_jsxs("div", { className: "payment-result", children: [method === "QR_CODE" && (_jsxs("div", { className: "qr-display", children: [_jsx("p", { className: "qr-label", children: "Qu\u00E9t m\u00E3 QR \u0111\u1EC3 thanh to\u00E1n VNPay" }), payment.qrContent || payment.payUrl ? (_jsx("div", { style: { display: "flex", justifyContent: "center", margin: "12px 0" }, children: _jsx(QRCodeSVG, { value: payment.qrContent || payment.payUrl || "", size: 200, level: "M", includeMargin: true }) })) : (_jsx("div", { className: "qr-placeholder", children: "Kh\u00F4ng c\u00F3 m\u00E3 QR" })), pollStatus && (_jsxs("div", { className: "poll-status", children: ["Tr\u1EA1ng th\u00E1i: ", _jsx("b", { children: pollStatus }), " \u2014 \u0110ang ki\u1EC3m tra m\u1ED7i 3 gi\u00E2y..."] })), payment.qrExpiresAt && (_jsxs("p", { className: "qr-expire", children: ["H\u1EBFt h\u1EA1n: ", fmtTime(payment.qrExpiresAt)] }))] })), method === "CASH" && (_jsxs("div", { className: "cash-confirm", children: [_jsxs("div", { className: "cash-amount", children: [_jsx("span", { children: "S\u1ED1 ti\u1EC1n thu" }), _jsx("b", { children: fmtVnd(payment.amount) })] }), _jsx("button", { className: "btn-pay success", onClick: onPaid, children: "\u2705 X\u00E1c nh\u1EADn \u0111\u00E3 thu ti\u1EC1n" })] })), staff?.role === "MANAGER" && (_jsx("button", { className: "btn-refund", onClick: refund, children: "\uD83D\uDD04 Ho\u00E0n ti\u1EC1n" }))] }))] }));
}
function ShiftScreen({ current, onShiftChange }) {
    const { staff } = useAdminStore();
    const [openingTotal, setOpeningTotal] = useState("");
    const [closingTotal, setClosingTotal] = useState("");
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState(null);
    const [closeResult, setCloseResult] = useState(null);
    const [resumed, setResumed] = useState(false);
    const openShift = async () => {
        if (!staff?.id)
            return;
        const amt = parseMoneyInput(openingTotal);
        if (!Number.isFinite(amt) || amt < 0) {
            setErr("Nhập số tiền quỹ đầu ca hợp lệ (VD: 500000 hoặc 500.000).");
            return;
        }
        setLoading(true);
        setErr(null);
        try {
            const res = await shiftAPI.open({ cashierId: staff.id, openingTotal: amt });
            setOpeningTotal("");
            onShiftChange(res.data);
        }
        catch (e) {
            // If backend says there's already an open shift (system crash/reload recovery),
            // silently fetch and resume that shift instead of showing an error.
            if (e.response?.status === 400) {
                try {
                    const cur = await shiftAPI.current();
                    const existing = cur.data;
                    if (existing && typeof existing === "object" && !existing.closedAt) {
                        setOpeningTotal("");
                        setResumed(true);
                        onShiftChange(existing);
                        return;
                    }
                }
                catch { /* fall through */ }
            }
            const msg = e.response?.data?.message || "Mở ca thất bại.";
            const fieldErrs = e.response?.data?.data;
            const detail = fieldErrs && typeof fieldErrs === "object"
                ? " (" + Object.entries(fieldErrs).map(([k, v]) => `${k}: ${v}`).join(", ") + ")"
                : "";
            setErr(msg + detail);
        }
        finally {
            setLoading(false);
        }
    };
    const closeShiftNow = async () => {
        if (!current?.id)
            return;
        const amt = parseMoneyInput(closingTotal);
        if (!Number.isFinite(amt) || amt < 0) {
            setErr("Nhập số tiền cuối ca hợp lệ.");
            return;
        }
        setLoading(true);
        setErr(null);
        try {
            const res = await shiftAPI.close(current.id, { actualCash: amt });
            setCloseResult(res.data);
            setClosingTotal("");
            onShiftChange(null);
        }
        catch (e) {
            const msg = e.response?.data?.message || "Đóng ca thất bại.";
            const fieldErrs = e.response?.data?.data;
            const detail = fieldErrs && typeof fieldErrs === "object"
                ? " (" + Object.entries(fieldErrs).map(([k, v]) => `${k}: ${v}`).join(", ") + ")"
                : "";
            setErr(msg + detail);
        }
        finally {
            setLoading(false);
        }
    };
    if (!staff?.id) {
        return (_jsx("div", { className: "screen", children: _jsx("div", { className: "alert-error", children: "Kh\u00F4ng x\u00E1c \u0111\u1ECBnh \u0111\u01B0\u1EE3c nh\u00E2n vi\u00EAn \u0111\u0103ng nh\u1EADp." }) }));
    }
    if (current === undefined) {
        return (_jsx("div", { className: "screen", children: _jsx("p", { className: "loading-state", children: "\u0110ang t\u1EA3i th\u00F4ng tin ca\u2026" }) }));
    }
    return (_jsxs("div", { className: "screen", children: [_jsx("header", { className: "screen-header", children: _jsxs("div", { children: [_jsxs("h2", { children: ["Ca l\u00E0m vi\u1EC7c ", _jsx("span", { children: "Thu ng\u00E2n" })] }), _jsxs("p", { children: ["Nh\u00E2n vi\u00EAn: ", _jsx("strong", { children: staff.name }), " \u00B7 ID #", staff.id] })] }) }), err && _jsx("div", { className: "alert-error", style: { margin: "0 0 12px" }, children: err }), !current ? (_jsxs("div", { className: "stat-panel", children: [closeResult && (_jsxs("div", { className: "alert-success", children: ["\u2705 \u0110\u00E3 \u0111\u00F3ng ca th\u00E0nh c\u00F4ng. Ti\u1EC1n m\u1EB7t: ", _jsx("strong", { children: fmtVnd(closeResult.cashRevenue) }), " \u00B7 Chuy\u1EC3n kho\u1EA3n: ", _jsx("strong", { children: fmtVnd(closeResult.transferRevenue) }), " \u00B7 Ch\u00EAnh l\u1EC7ch: ", _jsx("strong", { children: fmtVnd(closeResult.discrepancy) })] })), _jsx("h4", { children: "\uD83D\uDCD2 M\u1EDF ca m\u1EDBi" }), _jsx("p", { style: { marginBottom: 12, color: "#6b7280", fontSize: 14 }, children: "Qu\u1EF9 \u0111\u1EA7u ca l\u00E0 s\u1ED1 ti\u1EC1n m\u1EB7t c\u00F3 t\u1EA1i qu\u1EA7y khi b\u1EAFt \u0111\u1EA7u ca l\u00E0m vi\u1EC7c." }), _jsxs("div", { className: "form-group", children: [_jsx("label", { htmlFor: "opening-total", children: "S\u1ED1 ti\u1EC1n \u0111\u1EA7u ca (VND)" }), _jsx("input", { id: "opening-total", placeholder: "VD: 2.000.000", value: openingTotal, onChange: (ev) => setOpeningTotal(ev.target.value) })] }), _jsx("button", { type: "button", className: "btn-primary", disabled: loading, onClick: () => void openShift(), children: loading ? "Đang xử lý…" : "📒 Mở ca" })] })) : (_jsxs("div", { className: "stat-panel", children: [resumed && (_jsxs("div", { className: "alert-warning", style: { marginBottom: 16 }, children: ["\u26A0\uFE0F Phi\u00EAn tr\u01B0\u1EDBc ch\u01B0a k\u1EBFt ca \u2014 \u0111\u00E3 t\u1EF1 \u0111\u1ED9ng ti\u1EBFp t\u1EE5c ca #", current.id, "."] })), _jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }, children: [_jsx("span", { style: { fontSize: 28 }, children: "\uD83D\uDFE2" }), _jsxs("div", { children: [_jsxs("h4", { style: { margin: 0 }, children: ["Ca #", current.id, " \u0111ang ho\u1EA1t \u0111\u1ED9ng"] }), _jsx("p", { style: { margin: 0, color: "#6b7280", fontSize: 13 }, children: "Thanh to\u00E1n \u0111\u00E3 \u0111\u01B0\u1EE3c b\u1EADt cho ca n\u00E0y." })] })] }), _jsxs("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }, children: [_jsxs("div", { className: "stat-card-mini", children: [_jsx("span", { className: "stat-label", children: "M\u1EDF l\u00FAc" }), _jsx("span", { className: "stat-value", children: fmtTime(current.openedAt) })] }), _jsxs("div", { className: "stat-card-mini", children: [_jsx("span", { className: "stat-label", children: "Qu\u1EF9 \u0111\u1EA7u ca" }), _jsx("span", { className: "stat-value", children: fmtVnd(current.openingTotal) })] })] }), _jsx("hr", { style: { margin: "0 0 18px", borderColor: "#e5e7eb" } }), _jsx("h4", { style: { marginBottom: 12 }, children: "K\u1EBFt ca" }), _jsx("p", { style: { marginBottom: 12, color: "#6b7280", fontSize: 14 }, children: "Nh\u1EADp s\u1ED1 ti\u1EC1n m\u1EB7t th\u1EF1c t\u1EBF trong k\u00E9t \u0111\u1EC3 h\u1EC7 th\u1ED1ng t\u00EDnh ch\u00EAnh l\u1EC7ch." }), _jsxs("div", { className: "form-group", children: [_jsx("label", { htmlFor: "closing-total", children: "S\u1ED1 ti\u1EC1n m\u1EB7t th\u1EF1c t\u1EBF cu\u1ED1i ca (VND)" }), _jsx("input", { id: "closing-total", placeholder: "VD: 5.000.000", value: closingTotal, onChange: (ev) => setClosingTotal(ev.target.value) })] }), _jsx("button", { type: "button", className: "btn-danger", disabled: loading, onClick: () => void closeShiftNow(), children: loading ? "Đang xử lý…" : "🔒 Kết ca" })] }))] }));
}
function InvoiceScreen({ currentShift }) {
    const [orders, setOrders] = useState([]);
    const [selected, setSelected] = useState(null);
    const [loading, setLoading] = useState(false);
    const fetchOrders = useCallback(async () => {
        try {
            setLoading(true);
            const res = await orderAPI.listOrders("SERVED");
            const data = res.data.data;
            setOrders(data);
            // Update selected order if still in list
            if (selected) {
                const updated = data.find(o => o.id === selected.id);
                if (updated)
                    setSelected(updated);
            }
        }
        catch (err) {
            console.error("Lỗi lấy orders", err);
        }
        finally {
            setLoading(false);
        }
    }, [selected?.id]);
    useEffect(() => {
        fetchOrders();
        const interval = setInterval(fetchOrders, 5000);
        return () => clearInterval(interval);
    }, [fetchOrders]);
    const handlePaid = () => {
        setSelected(null);
        fetchOrders();
    };
    return (_jsxs("div", { className: "screen", children: [_jsxs("header", { className: "screen-header", children: [_jsxs("div", { children: [_jsxs("h2", { children: ["H\u00F3a \u0111\u01A1n ", _jsx("span", { children: "Ch\u1EDD thanh to\u00E1n" })] }), _jsxs("p", { children: ["T\u1EF1 \u0111\u1ED9ng l\u00E0m m\u1EDBi m\u1ED7i 5 gi\u00E2y \u00B7 ", orders.length, " \u0111\u01A1n \u0111ang ch\u1EDD"] })] }), _jsx("button", { className: "btn-secondary", onClick: fetchOrders, disabled: loading, children: loading ? "Đang tải..." : "🔄 Làm mới" })] }), _jsxs("div", { className: "invoice-layout", children: [_jsxs("div", { className: "order-list-panel", children: [_jsx("h4", { className: "panel-title", children: "\u0110\u01A0N CH\u1EDC THANH TO\u00C1N" }), orders.length === 0 && !loading && (_jsx("div", { className: "empty-state-small", children: "Kh\u00F4ng c\u00F3 \u0111\u01A1n n\u00E0o ch\u1EDD thanh to\u00E1n" })), orders.map(order => (_jsxs("div", { className: `order-card ${selected?.id === order.id ? "selected" : ""}`, onClick: () => setSelected(order), children: [_jsxs("div", { className: "order-card-top", children: [_jsxs("strong", { children: ["B\u00E0n ", order.tableCode || order.tableId] }), _jsx("span", { className: "served-badge", children: "SERVED" })] }), _jsxs("div", { className: "order-card-bottom", children: [_jsxs("span", { children: [order.items?.length || 0, " m\u00F3n"] }), _jsx("b", { className: "order-total", children: fmtVnd(order.totalAmount) })] }), order.servedAt && _jsx("small", { children: fmtTime(order.servedAt) })] }, order.id)))] }), _jsx("div", { className: "detail-panel", children: !selected ? (_jsxs("div", { className: "no-selection", children: [_jsx("div", { className: "no-selection-icon", children: "\uD83E\uDDFE" }), _jsx("p", { children: "Ch\u1ECDn m\u1ED9t \u0111\u01A1n h\u00E0ng \u0111\u1EC3 x\u1EED l\u00FD thanh to\u00E1n" })] })) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: "detail-header", children: [_jsxs("h3", { children: ["B\u00E0n ", selected.tableCode || selected.tableId] }), _jsxs("small", { children: ["\u0110\u01A1n #", selected.id] })] }), _jsx(OrderItems, { items: selected.items || [] }), _jsx("div", { className: "detail-divider" }), _jsx("div", { className: "header-actions", style: { marginBottom: 12 }, children: _jsx(InvoiceJsonExport, { orderId: selected.id }) }), !currentShift && (_jsx("div", { className: "alert-error", style: { marginBottom: 8 }, children: "\u26A0\uFE0F Ch\u01B0a m\u1EDF ca \u2014 h\u00E3y m\u1EDF ca tr\u01B0\u1EDBc khi thu ti\u1EC1n." })), _jsx(PaymentForm, { order: selected, shiftId: currentShift?.id ?? null, onPaid: handlePaid })] })) })] })] }));
}
// ─── History Screen ─────────────────────────────────────────────────────────────
const HISTORY_PAGE_SIZES = [10, 20, 50];
function HistoryScreen() {
    const { staff } = useAdminStore();
    const [orders, setOrders] = useState([]);
    const [page, setPage] = useState(0);
    const [size, setSize] = useState(20);
    const [totalElements, setTotalElements] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const load = useCallback(async (nextPage, nextSize) => {
        setLoading(true);
        setError(null);
        try {
            const res = await orderAPI.listOrdersPaged({ status: "PAID", page: nextPage, size: nextSize });
            const data = res.data.data;
            setOrders(data.content);
            setPage(data.page);
            setSize(data.size);
            setTotalElements(data.totalElements);
            setTotalPages(data.totalPages);
        }
        catch (e) {
            setError(e.response?.data?.message || "Lỗi tải lịch sử");
        }
        finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => { void load(0, size); }, [load, size]);
    const goToPage = (target) => {
        if (target < 0 || target >= totalPages || target === page)
            return;
        void load(target, size);
    };
    const showingFrom = totalElements === 0 ? 0 : page * size + 1;
    const showingTo = Math.min((page + 1) * size, totalElements);
    return (_jsxs("div", { className: "screen", children: [_jsxs("header", { className: "screen-header", children: [_jsxs("div", { children: [_jsxs("h2", { children: ["L\u1ECBch s\u1EED ", _jsx("span", { children: "Giao d\u1ECBch" })] }), _jsx("p", { children: totalElements > 0
                                    ? `Hiển thị ${showingFrom}–${showingTo} / ${totalElements} đơn đã thanh toán`
                                    : "Chưa có giao dịch" })] }), _jsx("button", { className: "btn-secondary", onClick: () => void load(page, size), children: "\uD83D\uDD04 L\u00E0m m\u1EDBi" })] }), error && _jsx("div", { className: "alert-error", children: error }), loading && _jsx("div", { className: "loading-state", children: "\u0110ang t\u1EA3i..." }), _jsx("div", { className: "staff-table-wrap", children: _jsxs("table", { className: "data-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "\u0110\u01A1n #" }), _jsx("th", { children: "B\u00E0n" }), _jsx("th", { children: "S\u1ED1 m\u00F3n" }), _jsx("th", { children: "T\u1ED5ng ti\u1EC1n" }), _jsx("th", { children: "Thanh to\u00E1n l\u00FAc" }), _jsx("th", { children: "H\u00F3a \u0111\u01A1n JSON" }), staff?.role === "MANAGER" && _jsx("th", { children: "Ho\u00E0n ti\u1EC1n" })] }) }), _jsxs("tbody", { children: [orders.map(order => (_jsxs("tr", { children: [_jsxs("td", { children: ["#", order.id] }), _jsx("td", { children: order.tableCode || `Bàn ${order.tableId}` }), _jsx("td", { children: order.items?.length || 0 }), _jsx("td", { className: "gold", children: fmtVnd(order.totalAmount) }), _jsx("td", { children: order.paidAt ? fmtTime(order.paidAt) : "—" }), _jsx("td", { children: _jsx(InvoiceJsonExport, { orderId: order.id, compact: true }) }), staff?.role === "MANAGER" && (_jsx("td", { children: _jsx("button", { className: "btn-small danger", onClick: () => {
                                                    Modal.confirm({
                                                        title: 'Xác nhận hoàn tiền',
                                                        content: 'Để hoàn tiền, vui lòng vào tab "Hóa đơn chờ", chọn đơn hàng và dùng chức năng hoàn tiền trong form thanh toán.',
                                                        okText: 'Đã hiểu',
                                                        cancelText: 'Đóng',
                                                    });
                                                }, children: "Ho\u00E0n ti\u1EC1n" }) }))] }, order.id))), orders.length === 0 && !loading && (_jsx("tr", { children: _jsx("td", { colSpan: staff?.role === "MANAGER" ? 7 : 6, className: "empty-cell", children: "Ch\u01B0a c\u00F3 giao d\u1ECBch" }) }))] })] }) }), totalPages > 0 && (_jsxs("div", { style: {
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginTop: 14,
                    gap: 10,
                    flexWrap: "wrap",
                }, children: [_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8, color: "#6b7280", fontSize: 13 }, children: [_jsx("span", { children: "S\u1ED1 d\u00F2ng / trang:" }), _jsx("select", { value: size, disabled: loading, onChange: (e) => { setSize(Number(e.target.value)); }, style: { padding: "4px 8px", borderRadius: 6, border: "1px solid #d1d5db" }, children: HISTORY_PAGE_SIZES.map((s) => (_jsx("option", { value: s, children: s }, s))) })] }), _jsxs("div", { style: { display: "flex", alignItems: "center", gap: 6 }, children: [_jsx("button", { className: "btn-small", disabled: loading || page === 0, onClick: () => goToPage(0), children: "\u23EE" }), _jsx("button", { className: "btn-small", disabled: loading || page === 0, onClick: () => goToPage(page - 1), children: "\u25C0" }), _jsxs("span", { style: { padding: "0 10px", fontSize: 13, color: "#374151" }, children: ["Trang ", _jsx("b", { children: page + 1 }), " / ", totalPages] }), _jsx("button", { className: "btn-small", disabled: loading || page >= totalPages - 1, onClick: () => goToPage(page + 1), children: "\u25B6" }), _jsx("button", { className: "btn-small", disabled: loading || page >= totalPages - 1, onClick: () => goToPage(totalPages - 1), children: "\u23ED" })] })] }))] }));
}
// ─── Shift guard modal ─────────────────────────────────────────────────────────
function ShiftGuardModal({ shiftId, onClose, onGoToShift }) {
    return (_jsx("div", { style: {
            position: "fixed", inset: 0, zIndex: 1000,
            background: "rgba(0,0,0,0.45)", display: "flex",
            alignItems: "center", justifyContent: "center",
        }, onClick: onClose, children: _jsxs("div", { style: {
                background: "#fff", borderRadius: 14, padding: "28px 28px 22px",
                maxWidth: 380, width: "90%", boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
            }, onClick: e => e.stopPropagation(), children: [_jsx("div", { style: { fontSize: 36, textAlign: "center", marginBottom: 12 }, children: "\uD83D\uDD12" }), _jsxs("h3", { style: { margin: "0 0 8px", fontSize: 17, fontWeight: 700, textAlign: "center" }, children: ["Ca #", shiftId, " \u0111ang ho\u1EA1t \u0111\u1ED9ng"] }), _jsxs("p", { style: { margin: "0 0 20px", color: "#6b7280", fontSize: 14, textAlign: "center", lineHeight: 1.5 }, children: ["B\u1EA1n ph\u1EA3i ", _jsx("strong", { children: "k\u1EBFt ca" }), " tr\u01B0\u1EDBc khi \u0111\u0103ng xu\u1EA5t \u0111\u1EC3 \u0111\u1EA3m b\u1EA3o doanh thu \u0111\u01B0\u1EE3c ghi nh\u1EADn \u0111\u1EA7y \u0111\u1EE7."] }), _jsxs("div", { style: { display: "flex", gap: 10 }, children: [_jsx("button", { className: "btn-secondary", style: { flex: 1 }, onClick: onClose, children: "H\u1EE7y" }), _jsx("button", { className: "btn-danger", style: { flex: 1 }, onClick: onGoToShift, children: "\uD83D\uDD12 \u0110\u1EBFn k\u1EBFt ca" })] })] }) }));
}
// ─── Cashier Portal (wrapper) ───────────────────────────────────────────────────
export function CashierPortal() {
    const [tab, setTab] = useState("shift");
    const [currentShift, setCurrentShift] = useState(null);
    const [shiftLoaded, setShiftLoaded] = useState(false);
    const [showGuard, setShowGuard] = useState(false);
    // Load current shift on mount
    useEffect(() => {
        shiftAPI.current()
            .then(res => {
            // Backend returns empty body (HTTP 200) when no shift is open
            const s = res.data;
            const open = s && typeof s === "object" && !s.closedAt ? s : null;
            setCurrentShift(open);
        })
            .catch(e => {
            if (e?.response?.status !== 404)
                console.error("[shift] current:", e);
            setCurrentShift(null);
        })
            .finally(() => setShiftLoaded(true));
    }, []);
    // Block browser close / tab refresh when shift is open
    useEffect(() => {
        if (!currentShift)
            return;
        const handler = (e) => {
            e.preventDefault();
            e.returnValue = "Ca làm việc đang mở. Bạn cần kết ca trước khi thoát.";
        };
        window.addEventListener("beforeunload", handler);
        return () => window.removeEventListener("beforeunload", handler);
    }, [currentShift]);
    // Called by PortalLayout before executing logout
    const handleBeforeLogout = useCallback(() => {
        if (currentShift) {
            setShowGuard(true);
            return false; // block logout
        }
        return true;
    }, [currentShift]);
    const navItems = [
        {
            id: "shift",
            label: currentShift ? `Ca #${currentShift.id} 🟢` : "Ca làm việc",
            icon: _jsx(ClockCircleOutlined, {}),
        },
        { id: "invoice", label: "Hóa đơn chờ", icon: _jsx(FileTextOutlined, {}) },
        { id: "history", label: "Lịch sử", icon: _jsx(HistoryOutlined, {}) },
    ];
    return (_jsxs(_Fragment, { children: [showGuard && currentShift && (_jsx(ShiftGuardModal, { shiftId: currentShift.id, onClose: () => setShowGuard(false), onGoToShift: () => { setShowGuard(false); setTab("shift"); } })), _jsxs(PortalLayout, { title: "PORTAL THU NG\u00C2N", subtitle: "CASHIER", navItems: navItems, activeTab: tab, onTabChange: setTab, onBeforeLogout: handleBeforeLogout, children: [tab === "shift" && (_jsx(ShiftScreen, { current: shiftLoaded ? currentShift : undefined, onShiftChange: setCurrentShift })), tab === "invoice" && _jsx(InvoiceScreen, { currentShift: currentShift }), tab === "history" && _jsx(HistoryScreen, {})] })] }));
}

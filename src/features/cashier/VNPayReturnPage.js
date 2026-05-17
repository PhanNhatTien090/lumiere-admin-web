import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import { paymentAPI } from "@/api/endpoints";
import { fmtDateTime as fmtTime } from "@/utils/format";
function fmtVnd(n) {
    return new Intl.NumberFormat("vi-VN").format(n) + "đ";
}
export function VNPayReturnPage() {
    const [state, setState] = useState("checking");
    const [amount, setAmount] = useState(null);
    const [paidAt, setPaidAt] = useState(null);
    const pollCount = useRef(0);
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const vnpResponseCode = params.get("vnp_ResponseCode");
        const orderIdStr = sessionStorage.getItem("vnpay_order_id");
        const orderId = orderIdStr ? parseInt(orderIdStr, 10) : NaN;
        // VNPay signals failure directly
        if (vnpResponseCode && vnpResponseCode !== "00") {
            setState("failed");
            return;
        }
        if (!orderId || isNaN(orderId)) {
            setState("pending");
            return;
        }
        const poll = async () => {
            try {
                const res = await paymentAPI.getStatus(orderId);
                const s = res.data.data;
                if (s.status === "PAID" || s.status === "SUCCESS") {
                    setAmount(s.amount ?? null);
                    setPaidAt(s.paidAt ?? null);
                    setState("success");
                    sessionStorage.removeItem("vnpay_order_id");
                    return true;
                }
                else if (s.status === "FAILED") {
                    setState("failed");
                    return true;
                }
            }
            catch { /* continue */ }
            return false;
        };
        const run = async () => {
            const done = await poll();
            if (done)
                return;
            const timer = setInterval(async () => {
                pollCount.current++;
                const done = await poll();
                if (done || pollCount.current >= 9) {
                    clearInterval(timer);
                    if (!done)
                        setState("pending");
                }
            }, 3000);
        };
        void run();
    }, []);
    return (_jsx("div", { style: {
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#f9fafb",
            fontFamily: "inherit",
        }, children: _jsxs("div", { style: {
                background: "#fff",
                borderRadius: 16,
                padding: "40px 32px",
                maxWidth: 440,
                width: "90%",
                textAlign: "center",
                boxShadow: "0 4px 24px rgba(0,0,0,0.1)",
            }, children: [state === "checking" && (_jsxs(_Fragment, { children: [_jsx("div", { style: { fontSize: 48, marginBottom: 16 }, children: "\u23F3" }), _jsx("h2", { style: { margin: "0 0 8px", fontSize: 20 }, children: "\u0110ang x\u00E1c nh\u1EADn giao d\u1ECBch" }), _jsx("p", { style: { color: "#6b7280", marginBottom: 24 }, children: "Vui l\u00F2ng ch\u1EDD trong gi\u00E2y l\u00E1t..." })] })), state === "success" && (_jsxs(_Fragment, { children: [_jsx("div", { style: { fontSize: 48, marginBottom: 16 }, children: "\u2705" }), _jsx("h2", { style: { margin: "0 0 8px", fontSize: 20, color: "#16a34a" }, children: "Thanh to\u00E1n th\u00E0nh c\u00F4ng!" }), amount != null && (_jsx("p", { style: { fontSize: 22, fontWeight: 700, color: "#111827", margin: "8px 0" }, children: fmtVnd(amount) })), paidAt && (_jsxs("p", { style: { color: "#6b7280", fontSize: 13, marginBottom: 24 }, children: ["L\u00FAc ", fmtTime(paidAt)] })), !paidAt && _jsx("div", { style: { marginBottom: 24 } })] })), state === "pending" && (_jsxs(_Fragment, { children: [_jsx("div", { style: { fontSize: 48, marginBottom: 16 }, children: "\uD83D\uDD50" }), _jsx("h2", { style: { margin: "0 0 8px", fontSize: 20 }, children: "\u0110ang x\u1EED l\u00FD" }), _jsx("p", { style: { color: "#6b7280", marginBottom: 24 }, children: "Giao d\u1ECBch \u0111ang \u0111\u01B0\u1EE3c x\u00E1c nh\u1EADn. Vui l\u00F2ng ki\u1EC3m tra l\u1EA1i sau v\u00E0i ph\u00FAt." })] })), state === "failed" && (_jsxs(_Fragment, { children: [_jsx("div", { style: { fontSize: 48, marginBottom: 16 }, children: "\u274C" }), _jsx("h2", { style: { margin: "0 0 8px", fontSize: 20, color: "#dc2626" }, children: "Thanh to\u00E1n th\u1EA5t b\u1EA1i" }), _jsx("p", { style: { color: "#6b7280", marginBottom: 24 }, children: "Giao d\u1ECBch kh\u00F4ng th\u00E0nh c\u00F4ng. Vui l\u00F2ng th\u1EED l\u1EA1i." })] })), _jsx("button", { onClick: () => { window.location.href = "/"; }, style: {
                        background: "#1a1a1a",
                        color: "#fff",
                        border: "none",
                        borderRadius: 8,
                        padding: "10px 24px",
                        cursor: "pointer",
                        fontSize: 14,
                        fontWeight: 600,
                    }, children: "\u2190 V\u1EC1 trang qu\u1EA3n l\u00FD" })] }) }));
}

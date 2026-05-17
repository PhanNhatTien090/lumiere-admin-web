import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { forwardRef } from "react";
import { fmtDateTime, fmtVnd } from "@/utils/format";
const PAYMENT_METHOD_LABEL = {
    CASH: "Tiền mặt",
    QR_CODE: "VNPay QR",
    VNPAY_ATM: "VNPay ATM",
    VIETQR: "VietQR",
};
/**
 * Hóa đơn khổ 80mm (máy in nhiệt POS).
 * Render off-screen rồi html2canvas/jsPDF chụp.
 * Width cố định 302px ≈ 80mm @ 96dpi để khớp giấy in.
 */
export const InvoiceReceipt = forwardRef(({ invoice, tableLabel }, ref) => {
    const methodLabel = PAYMENT_METHOD_LABEL[invoice.paymentMethod] || invoice.paymentMethod || "—";
    return (_jsxs("div", { ref: ref, style: {
            width: 302,
            padding: "16px 14px",
            background: "#ffffff",
            color: "#000000",
            fontFamily: '"Courier New", "Consolas", monospace',
            fontSize: 12,
            lineHeight: 1.4,
            boxSizing: "border-box",
        }, children: [_jsxs("div", { style: { textAlign: "center", marginBottom: 10 }, children: [_jsx("div", { style: { fontSize: 16, fontWeight: 700, letterSpacing: 1 }, children: "LUMI\u00C8RE" }), _jsx("div", { style: { fontSize: 11 }, children: "NH\u00C0 H\u00C0NG LUMI\u00C8RE" }), _jsx("div", { style: { fontSize: 10, color: "#333" }, children: "H\u00F3a \u0111\u01A1n thanh to\u00E1n" })] }), _jsx(Divider, {}), _jsx(Row, { label: "H\u00F3a \u0111\u01A1n:", value: invoice.invoiceNumber, mono: true }), _jsx(Row, { label: "\u0110\u01A1n #:", value: String(invoice.orderId) }), tableLabel && _jsx(Row, { label: "B\u00E0n:", value: tableLabel }), _jsx(Row, { label: "Th\u1EDDi gian:", value: fmtDateTime(invoice.paymentTime) }), invoice.cashierId != null && _jsx(Row, { label: "Thu ng\u00E2n:", value: `#${invoice.cashierId}` }), _jsx(Divider, {}), _jsx("div", { style: { fontWeight: 700, marginBottom: 4 }, children: "CHI TI\u1EBET" }), invoice.items.length === 0 && (_jsx("div", { style: { fontStyle: "italic", textAlign: "center" }, children: "(Kh\u00F4ng c\u00F3 m\u00F3n)" })), invoice.items.map((it, idx) => (_jsxs("div", { style: { marginBottom: 4 }, children: [_jsx("div", { style: { fontWeight: 600 }, children: it.name || `Món #${idx + 1}` }), _jsxs("div", { style: { display: "flex", justifyContent: "space-between" }, children: [_jsxs("span", { children: [it.quantity, " \u00D7 ", fmtVnd(it.unitPrice)] }), _jsx("span", { children: fmtVnd(it.subtotal) })] })] }, idx))), _jsx(Divider, {}), _jsx(Row, { label: "T\u1EA1m t\u00EDnh:", value: fmtVnd(invoice.subtotal) }), invoice.discount > 0 && _jsx(Row, { label: "Gi\u1EA3m gi\u00E1:", value: `- ${fmtVnd(invoice.discount)}` }), invoice.tax > 0 && _jsx(Row, { label: "Thu\u1EBF:", value: fmtVnd(invoice.tax) }), _jsxs("div", { style: {
                    display: "flex",
                    justifyContent: "space-between",
                    marginTop: 6,
                    paddingTop: 6,
                    borderTop: "1px dashed #000",
                    fontWeight: 700,
                    fontSize: 14,
                }, children: [_jsx("span", { children: "T\u1ED4NG C\u1ED8NG" }), _jsx("span", { children: fmtVnd(invoice.total) })] }), _jsx(Row, { label: "H\u00ECnh th\u1EE9c:", value: methodLabel }), _jsx(Divider, {}), _jsxs("div", { style: { textAlign: "center", fontSize: 11, marginTop: 6 }, children: [_jsx("div", { children: "C\u1EA3m \u01A1n qu\u00FD kh\u00E1ch!" }), _jsx("div", { style: { color: "#333" }, children: "H\u1EB9n g\u1EB7p l\u1EA1i" })] })] }));
});
InvoiceReceipt.displayName = "InvoiceReceipt";
function Row({ label, value, mono }) {
    return (_jsxs("div", { style: { display: "flex", justifyContent: "space-between", gap: 8 }, children: [_jsx("span", { children: label }), _jsx("span", { style: { fontFamily: mono ? '"Courier New", monospace' : undefined, textAlign: "right" }, children: value })] }));
}
function Divider() {
    return (_jsx("div", { style: {
            borderTop: "1px dashed #000",
            margin: "8px 0",
        } }));
}

import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { orderAPI } from "@/api/endpoints";
import { InvoiceReceipt } from "./InvoiceReceipt";
/**
 * Render receipt off-screen rồi chụp bằng html2canvas.
 * Phải mount vào DOM thật (ngoài viewport) để html2canvas đo layout chính xác.
 */
async function renderReceiptToCanvas(invoice, tableLabel) {
    const host = document.createElement("div");
    host.style.position = "fixed";
    host.style.left = "-10000px";
    host.style.top = "0";
    host.style.zIndex = "-1";
    host.style.pointerEvents = "none";
    document.body.appendChild(host);
    const root = createRoot(host);
    root.render(_jsx(InvoiceReceipt, { invoice: invoice, tableLabel: tableLabel }));
    // Wait for React to flush + fonts to settle
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    if (document.fonts?.ready) {
        try {
            await document.fonts.ready;
        }
        catch { /* ignore */ }
    }
    const target = host.firstElementChild;
    if (!target) {
        root.unmount();
        host.remove();
        throw new Error("Không render được nội dung hoá đơn.");
    }
    try {
        return await html2canvas(target, {
            backgroundColor: "#ffffff",
            scale: 2, // 2x cho rõ nét khi in
            useCORS: true,
            logging: false,
        });
    }
    finally {
        root.unmount();
        host.remove();
    }
}
function downloadDataUrl(dataUrl, filename) {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
}
async function exportPng(invoice, tableLabel) {
    const canvas = await renderReceiptToCanvas(invoice, tableLabel);
    downloadDataUrl(canvas.toDataURL("image/png"), `hoa-don-${invoice.orderId}.png`);
}
async function exportPdf(invoice, tableLabel) {
    const canvas = await renderReceiptToCanvas(invoice, tableLabel);
    // Giấy nhiệt 80mm — chiều cao tự co theo nội dung
    const widthMm = 80;
    const heightMm = (canvas.height / canvas.width) * widthMm;
    const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: [widthMm, heightMm],
        compress: true,
    });
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, widthMm, heightMm, undefined, "FAST");
    pdf.save(`hoa-don-${invoice.orderId}.pdf`);
}
export function InvoiceExport({ orderId, tableLabel, compact }) {
    const [busy, setBusy] = useState(null);
    const cacheRef = useRef(null);
    const fetchInvoice = async () => {
        if (cacheRef.current)
            return cacheRef.current;
        const res = await orderAPI.getInvoiceJson(orderId);
        cacheRef.current = res.data.data;
        return cacheRef.current;
    };
    const run = async (format) => {
        setBusy(format);
        try {
            const invoice = await fetchInvoice();
            if (format === "pdf")
                await exportPdf(invoice, tableLabel);
            else
                await exportPng(invoice, tableLabel);
        }
        catch (e) {
            const msg = e
                ?.response?.data?.message
                || e?.message
                || `Không xuất được hoá đơn ${format.toUpperCase()}`;
            alert(msg);
        }
        finally {
            setBusy(null);
        }
    };
    const btnClass = compact ? "btn-small" : "btn-secondary";
    return (_jsxs("div", { style: { display: "inline-flex", gap: 6 }, children: [_jsx("button", { type: "button", className: btnClass, disabled: busy !== null, onClick: () => void run("pdf"), title: "T\u1EA3i ho\u00E1 \u0111\u01A1n PDF (kh\u1ED5 80mm)", children: busy === "pdf" ? "…" : compact ? "📄 PDF" : "📄 Tải PDF" }), _jsx("button", { type: "button", className: btnClass, disabled: busy !== null, onClick: () => void run("png"), title: "T\u1EA3i ho\u00E1 \u0111\u01A1n d\u1EA1ng \u1EA3nh PNG", children: busy === "png" ? "…" : compact ? "🖼️ PNG" : "🖼️ Tải PNG" })] }));
}

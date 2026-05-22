import { useState } from "react";
import { createRoot } from "react-dom/client";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { orderAPI } from "@/api/endpoints";
import type { OrderInvoiceJson } from "@/types";
import { InvoiceReceipt } from "./InvoiceReceipt";

type ExportFormat = "pdf" | "png";

interface InvoiceExportProps {
  orderId: number;
  /** "Bàn A05" — hiển thị trên hoá đơn khi có */
  tableLabel?: string;
  /** UI nhỏ gọn cho bảng lịch sử */
  compact?: boolean;
}

/**
 * Render receipt off-screen rồi chụp bằng html2canvas.
 * Phải mount vào DOM thật (ngoài viewport) để html2canvas đo layout chính xác.
 */
async function renderReceiptToCanvas(invoice: OrderInvoiceJson, tableLabel?: string): Promise<HTMLCanvasElement> {
  const host = document.createElement("div");
  host.style.position = "fixed";
  host.style.left = "-10000px";
  host.style.top = "0";
  host.style.zIndex = "-1";
  host.style.pointerEvents = "none";
  document.body.appendChild(host);

  const root = createRoot(host);
  root.render(<InvoiceReceipt invoice={invoice} tableLabel={tableLabel} />);

  // Wait for React to flush + fonts to settle
  await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  if (document.fonts?.ready) {
    try { await document.fonts.ready; } catch { /* ignore */ }
  }

  const target = host.firstElementChild as HTMLElement | null;
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
  } finally {
    root.unmount();
    host.remove();
  }
}

function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

async function exportPng(invoice: OrderInvoiceJson, tableLabel?: string) {
  const canvas = await renderReceiptToCanvas(invoice, tableLabel);
  downloadDataUrl(canvas.toDataURL("image/png"), `hoa-don-${invoice.orderId}.png`);
}

async function exportPdf(invoice: OrderInvoiceJson, tableLabel?: string) {
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

export function InvoiceExport({ orderId, tableLabel, compact }: InvoiceExportProps) {
  const [busy, setBusy] = useState<ExportFormat | null>(null);

  // Always fetch fresh — invoice content can change between reprints (payment
  // method finalised, cashier filled in, etc.). The previous useRef cache made
  // post-payment reprints show stale "—" placeholders.
  const fetchInvoice = async (): Promise<OrderInvoiceJson> => {
    const res = await orderAPI.getInvoiceJson(orderId);
    return res.data.data;
  };

  const run = async (format: ExportFormat) => {
    setBusy(format);
    try {
      const invoice = await fetchInvoice();
      if (format === "pdf") await exportPdf(invoice, tableLabel);
      else await exportPng(invoice, tableLabel);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } }; message?: string })
        ?.response?.data?.message
        || (e as Error)?.message
        || `Không xuất được hoá đơn ${format.toUpperCase()}`;
      alert(msg);
    } finally {
      setBusy(null);
    }
  };

  const btnClass = compact ? "btn-small" : "btn-secondary";

  return (
    <div style={{ display: "inline-flex", gap: 6 }}>
      <button
        type="button"
        className={btnClass}
        disabled={busy !== null}
        onClick={() => void run("pdf")}
        title="Tải hoá đơn PDF (khổ 80mm)"
      >
        {busy === "pdf" ? "…" : compact ? "📄 PDF" : "📄 Tải PDF"}
      </button>
      <button
        type="button"
        className={btnClass}
        disabled={busy !== null}
        onClick={() => void run("png")}
        title="Tải hoá đơn dạng ảnh PNG"
      >
        {busy === "png" ? "…" : compact ? "🖼️ PNG" : "🖼️ Tải PNG"}
      </button>
    </div>
  );
}

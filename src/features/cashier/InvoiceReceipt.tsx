import { forwardRef } from "react";
import type { OrderInvoiceJson } from "@/types";
import { fmtDateTime, fmtVnd } from "@/utils/format";

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  CASH: "Tiền mặt",
  QR_CODE: "VNPay QR",
  VNPAY_ATM: "VNPay ATM",
  VIETQR: "VietQR",
};

interface InvoiceReceiptProps {
  invoice: OrderInvoiceJson;
  tableLabel?: string;
}

/**
 * Hóa đơn khổ 80mm (máy in nhiệt POS).
 * Render off-screen rồi html2canvas/jsPDF chụp.
 * Width cố định 302px ≈ 80mm @ 96dpi để khớp giấy in.
 */
export const InvoiceReceipt = forwardRef<HTMLDivElement, InvoiceReceiptProps>(
  ({ invoice, tableLabel }, ref) => {
    const methodLabel = PAYMENT_METHOD_LABEL[invoice.paymentMethod] || invoice.paymentMethod || "—";
    const brand = invoice.restaurantName?.trim() || "LUMIÈRE";
    return (
      <div
        ref={ref}
        style={{
          width: 302,
          padding: "16px 14px",
          background: "#ffffff",
          color: "#000000",
          fontFamily: '"Courier New", "Consolas", monospace',
          fontSize: 12,
          lineHeight: 1.4,
          boxSizing: "border-box",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 10 }}>
          <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: 1 }}>{brand.toUpperCase()}</div>
          {invoice.restaurantAddress && (
            <div style={{ fontSize: 10, color: "#222", marginTop: 2 }}>{invoice.restaurantAddress}</div>
          )}
          {invoice.restaurantHotline && (
            <div style={{ fontSize: 10, color: "#222" }}>Hotline: {invoice.restaurantHotline}</div>
          )}
          <div style={{ fontSize: 10, color: "#333", marginTop: 4 }}>Hóa đơn thanh toán</div>
        </div>

        <Divider />

        <Row label="Hóa đơn:" value={invoice.invoiceNumber} mono />
        <Row label="Đơn #:" value={String(invoice.orderId)} />
        {tableLabel && <Row label="Bàn:" value={tableLabel} />}
        <Row label="Thời gian:" value={fmtDateTime(invoice.paymentTime)} />
        {(invoice.cashierName || invoice.cashierId != null) && (
          <Row
            label="Thu ngân:"
            value={invoice.cashierName || `#${invoice.cashierId}`}
          />
        )}

        <Divider />

        <div style={{ fontWeight: 700, marginBottom: 4 }}>CHI TIẾT</div>
        {invoice.items.length === 0 && (
          <div style={{ fontStyle: "italic", textAlign: "center" }}>(Không có món)</div>
        )}
        {invoice.items.map((it, idx) => (
          <div key={idx} style={{ marginBottom: 4 }}>
            <div style={{ fontWeight: 600 }}>{it.name || `Món #${idx + 1}`}</div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>
                {it.quantity} × {fmtVnd(it.unitPrice)}
              </span>
              <span>{fmtVnd(it.subtotal)}</span>
            </div>
          </div>
        ))}

        <Divider />

        <Row label="Tạm tính:" value={fmtVnd(invoice.subtotal)} />
        {invoice.discount > 0 && <Row label="Giảm giá:" value={`- ${fmtVnd(invoice.discount)}`} />}
        {invoice.tax > 0 && <Row label="Thuế:" value={fmtVnd(invoice.tax)} />}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 6,
            paddingTop: 6,
            borderTop: "1px dashed #000",
            fontWeight: 700,
            fontSize: 14,
          }}
        >
          <span>TỔNG CỘNG</span>
          <span>{fmtVnd(invoice.total)}</span>
        </div>

        <Row label="Hình thức:" value={methodLabel} />

        <Divider />

        <div style={{ textAlign: "center", fontSize: 11, marginTop: 6 }}>
          <div>Cảm ơn quý khách!</div>
          <div style={{ color: "#333" }}>Hẹn gặp lại</div>
        </div>
      </div>
    );
  }
);

InvoiceReceipt.displayName = "InvoiceReceipt";

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
      <span>{label}</span>
      <span style={{ fontFamily: mono ? '"Courier New", monospace' : undefined, textAlign: "right" }}>
        {value}
      </span>
    </div>
  );
}

function Divider() {
  return (
    <div
      style={{
        borderTop: "1px dashed #000",
        margin: "8px 0",
      }}
    />
  );
}

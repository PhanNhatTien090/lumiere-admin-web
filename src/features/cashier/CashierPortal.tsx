import { useState, useEffect, useCallback, useRef } from "react";
import { ClockCircleOutlined, FileTextOutlined, HistoryOutlined } from "@ant-design/icons";
import { QRCodeSVG } from "qrcode.react";
import { PortalLayout } from "@/components/layout/PortalLayout";
import { orderAPI, paymentAPI, paymentRequestAPI, publicMenuAPI, shiftAPI } from "@/api/endpoints";
import { OrderItemResponse, OrderResponse, PaymentMethod, PaymentProvider, PaymentResponse, ShiftResponse, ShiftSummaryResponse } from "@/types";
import { useAdminStore } from "@/store/adminStore";
import { usePaymentRequestStore } from "@/store/paymentRequestStore";
import { fmtDateTime as fmtTime } from "@/utils/format";
import { InvoiceExport } from "./InvoiceExport";
import { RefundModal } from "./RefundModal";

function fmtVnd(n: number) {
  return new Intl.NumberFormat("vi-VN").format(n) + "đ";
}

function parseMoneyInput(raw: string): number {
  const n = Number(raw.replace(/\s/g, "").replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}

// ─── Order Item list ───────────────────────────────────────────────────────────
function OrderItems({ items, menuItemNames }: { items: OrderItemResponse[]; menuItemNames: Map<number, string> }) {
  const billable = items.filter(i => i.billable && i.status !== "CANCELLED");
  return (
    <div className="order-items">
      {billable.map(item => (
        <div key={item.id} className="order-line">
          <span className="item-qty">{item.quantity}x</span>
          <span className="item-name">
            {item.menuItemName || menuItemNames.get(item.menuItemId) || `Món #${item.menuItemId}`}
          </span>
          {item.note && <span className="item-note">({item.note})</span>}
          <span className="item-subtotal">{fmtVnd(item.subtotal)}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Payment Form ──────────────────────────────────────────────────────────────
type PayMode = "CASH" | "VNPAY_QR" | "VIETQR" | "VNPAY_ATM";

const PAY_MODE_REQUEST: Record<PayMode, { paymentMethod: PaymentMethod; provider: PaymentProvider }> = {
  CASH:      { paymentMethod: "CASH",      provider: "CASH" },
  VNPAY_QR:  { paymentMethod: "QR_CODE",   provider: "VNPAY" },
  VIETQR:    { paymentMethod: "QR_CODE",   provider: "VIETQR" },
  VNPAY_ATM: { paymentMethod: "VNPAY_ATM", provider: "VNPAY" },
};

function PaymentForm({ order, shiftId, onPaid }: { order: OrderResponse; shiftId: number | null; onPaid: () => void }) {
  const [mode, setMode] = useState<PayMode>("CASH");
  const [loading, setLoading] = useState(false);
  const [payment, setPayment] = useState<PaymentResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pollStatus, setPollStatus] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  };

  const pollPaymentStatus = (orderId: number) => {
    pollRef.current = setInterval(async () => {
      try {
        const res = await paymentAPI.getStatus(orderId);
        const s = res.data.data.status;
        setPollStatus(s);
        if (s === "PAID" || s === "SUCCESS") {
          stopPolling();
          onPaid();
        } else if (s === "FAILED") {
          stopPolling();
          setErr("Thanh toán thất bại. Vui lòng thử lại.");
          setPayment(null);
        }
      } catch { /* ignore */ }
    }, 3000);
  };

  // Cancel any in-flight PENDING payment on the backend so we don't leave stale
  // records when the cashier switches methods or closes the screen.
  const cancelInFlightPayment = async (reason: string) => {
    if (!payment?.paymentId) return;
    try {
      await paymentAPI.cancelPendingPayment(payment.paymentId, reason);
    } catch {
      // Already SUCCESS/FAILED on the server → ignore; backend rejects gracefully.
    }
  };

  useEffect(() => () => {
    stopPolling();
    // Best-effort cleanup if the modal/component unmounts mid-flow.
    void cancelInFlightPayment("CASHIER_LEFT_SCREEN");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reset when mode changes — cancel server-side PENDING first.
  useEffect(() => {
    stopPolling();
    void cancelInFlightPayment("METHOD_SWITCHED");
    setPayment(null);
    setErr(null);
    setPollStatus(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const createPayment = async () => {
    if (!shiftId) { setErr("Chưa mở ca. Vui lòng mở ca trước khi thanh toán."); return; }
    setLoading(true); setErr(null);
    try {
      const { paymentMethod, provider } = PAY_MODE_REQUEST[mode];
      const res = await paymentAPI.createPayment({
        orderId: order.id,
        shiftId,
        paymentMethod,
        provider,
        locale: "vn",
        clientIp: null,
        bankCode: null,
      });
      const p = res.data.data;
      setPayment(p);

      if (mode === "VNPAY_QR") {
        pollPaymentStatus(order.id);
      } else if (mode === "VNPAY_ATM") {
        const url = p.payUrl || p.qrContent;
        if (url) {
          sessionStorage.setItem("vnpay_order_id", String(order.id));
          window.location.href = url;
        } else {
          setErr("Không nhận được link thanh toán từ server.");
        }
      }
      // VIETQR & CASH: no polling, no redirect — cashier confirms manually below.
    } catch (e: any) {
      if (e.response?.status === 409) {
        try {
          const s = await paymentAPI.getStatus(order.id);
          setPollStatus(s.data.data.status);
          if (s.data.data.status === "PAID") onPaid();
        } catch {}
      } else {
        setErr(e.response?.data?.message || "Lỗi tạo thanh toán");
      }
    } finally { setLoading(false); }
  };

  const confirmManualPayment = async () => {
    if (!payment) return;
    setLoading(true); setErr(null);
    try {
      await paymentAPI.confirmManualPayment(payment.paymentId);
      onPaid();
    } catch (e: any) {
      setErr(e.response?.data?.message || "Lỗi xác nhận thanh toán");
    } finally { setLoading(false); }
  };

  return (
    <div className="payment-form">
      <div className="pay-section">
        <h4>Phương thức thanh toán</h4>
        <div className="pay-methods">
          <button
            className={`pay-method-btn ${mode === "CASH" ? "active" : ""}`}
            onClick={() => setMode("CASH")}
          >
            💵 Tiền mặt
          </button>
          <button
            className={`pay-method-btn ${mode === "VNPAY_QR" ? "active" : ""}`}
            onClick={() => setMode("VNPAY_QR")}
          >
            📱 VNPay QR
          </button>
          <button
            className={`pay-method-btn ${mode === "VIETQR" ? "active" : ""}`}
            onClick={() => setMode("VIETQR")}
          >
            🏦 Chuyển khoản VietQR
          </button>
          <button
            className={`pay-method-btn ${mode === "VNPAY_ATM" ? "active" : ""}`}
            onClick={() => setMode("VNPAY_ATM")}
          >
            🏧 VNPay ATM
          </button>
        </div>
      </div>

      <div className="order-totals">
        {order.taxMode !== "NO_TAX" && order.taxAmount > 0 && (
          <>
            <div className="total-row subtotal-row">
              <span>Tạm tính (trước thuế)</span>
              <span>{fmtVnd(order.subtotalAmount)}</span>
            </div>
            <div className="total-row tax-row">
              <span>Thuế ({(order.taxRateBps / 100).toFixed(0)}%)</span>
              <span>{fmtVnd(order.taxAmount)}</span>
            </div>
          </>
        )}
        <div className="total-row grand-total-row">
          <span>Tổng thanh toán</span>
          <b>{fmtVnd(order.totalAmount)}</b>
        </div>
      </div>

      {err && <div className="form-err">{err}</div>}

      {!payment ? (
        <button className="btn-pay" onClick={createPayment} disabled={loading}>
          {loading
            ? "Đang xử lý..."
            : mode === "VNPAY_ATM"
            ? "🏧 Chuyển sang VNPay"
            : "💳 Tạo thanh toán"}
        </button>
      ) : (
        <div className="payment-result">
          <div
            style={{
              background: "#ecfdf5",
              border: "1px solid #6ee7b7",
              color: "#065f46",
              padding: "10px 14px",
              borderRadius: 8,
              fontSize: 13,
              margin: "0 0 12px",
            }}
          >
            ✅ Đã sẵn sàng mã QR. Nhân viên phục vụ có thể mở app trên điện thoại
            và hiển thị mã này tại bàn cho khách quét.
          </div>
          {mode === "VNPAY_QR" && (
            <div className="qr-display">
              <p className="qr-label">Quét mã QR để thanh toán VNPay</p>
              {payment.qrContent || payment.payUrl ? (
                <div style={{ display: "flex", justifyContent: "center", margin: "12px 0" }}>
                  <QRCodeSVG
                    value={payment.qrContent || payment.payUrl || ""}
                    size={200}
                    level="M"
                    includeMargin
                  />
                </div>
              ) : (
                <div className="qr-placeholder">Không có mã QR</div>
              )}
              {pollStatus && (
                <div className="poll-status">
                  Trạng thái: <b>{pollStatus}</b> — Đang kiểm tra mỗi 3 giây...
                </div>
              )}
              {payment.qrExpiresAt && (
                <p className="qr-expire">Hết hạn: {fmtTime(payment.qrExpiresAt)}</p>
              )}
            </div>
          )}

          {mode === "VIETQR" && (
            <div className="qr-display">
              <p className="qr-label">Khách quét mã bằng app banking để chuyển khoản</p>
              {payment.qrContent ? (
                <div style={{ display: "flex", justifyContent: "center", margin: "12px 0" }}>
                  <QRCodeSVG
                    value={payment.qrContent}
                    size={220}
                    level="M"
                    includeMargin
                  />
                </div>
              ) : (
                <div className="qr-placeholder">Không có mã QR</div>
              )}
              <div className="cash-amount">
                <span>Số tiền chuyển khoản</span>
                <b>{fmtVnd(payment.amount)}</b>
              </div>
              <p className="qr-expire" style={{ textAlign: "center", color: "#888" }}>
                Sau khi tiền về tài khoản, bấm nút bên dưới để xác nhận.
              </p>
              <button
                className="btn-pay success"
                onClick={confirmManualPayment}
                disabled={loading}
              >
                {loading ? "Đang xác nhận..." : "✅ Đã nhận được tiền"}
              </button>
              {payment.qrExpiresAt && (
                <p className="qr-expire">Hết hạn: {fmtTime(payment.qrExpiresAt)}</p>
              )}
            </div>
          )}

          {mode === "CASH" && (
            <div className="cash-confirm">
              {payment.taxMode !== "NO_TAX" && payment.taxAmount > 0 && (
                <div className="cash-breakdown">
                  <div className="cash-amount-row">
                    <span>Trước thuế</span>
                    <span>{fmtVnd(payment.subtotalAmount)}</span>
                  </div>
                  <div className="cash-amount-row">
                    <span>Thuế ({(payment.taxRateBps / 100).toFixed(0)}%)</span>
                    <span>{fmtVnd(payment.taxAmount)}</span>
                  </div>
                </div>
              )}
              <div className="cash-amount">
                <span>Số tiền thu</span>
                <b>{fmtVnd(payment.amount)}</b>
              </div>
              <button
                className="btn-pay success"
                onClick={confirmManualPayment}
                disabled={loading}
              >
                {loading ? "Đang xác nhận..." : "✅ Xác nhận đã thu tiền"}
              </button>
            </div>
          )}

        </div>
      )}
    </div>
  );
}

// ─── Ca thu ngân (mở / đóng) ───────────────────────────────────────────────────
interface ShiftScreenProps {
  /** undefined = still loading from server */
  current: ShiftResponse | null | undefined;
  onShiftChange: (shift: ShiftResponse | null) => void;
}

function ShiftScreen({ current, onShiftChange }: ShiftScreenProps) {
  const { staff } = useAdminStore();
  const [openingTotal, setOpeningTotal] = useState("");
  const [closingTotal, setClosingTotal] = useState("");
  const [closingNotes, setClosingNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [closeResult, setCloseResult] = useState<import("@/types").CloseShiftResponse | null>(null);
  const [resumed, setResumed] = useState(false);
  const [summary, setSummary] = useState<ShiftSummaryResponse | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const loadSummary = async () => {
    if (!current?.id) return;
    setSummaryLoading(true);
    try {
      const res = await shiftAPI.getSummary(current.id);
      setSummary(res.data);
    } catch { /* ignore */ }
    finally { setSummaryLoading(false); }
  };

  const openShift = async () => {
    if (!staff?.id) return;
    const amt = parseMoneyInput(openingTotal);
    if (!Number.isFinite(amt) || amt < 0) {
      setErr("Nhập số tiền quỹ đầu ca hợp lệ (VD: 500000 hoặc 500.000).");
      return;
    }
    setLoading(true); setErr(null);
    try {
      const res = await shiftAPI.open({ cashierId: staff.id, openingTotal: amt });
      setOpeningTotal("");
      onShiftChange(res.data);
    } catch (e: any) {
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
        } catch { /* fall through */ }
      }
      const msg = e.response?.data?.message || "Mở ca thất bại.";
      const fieldErrs = e.response?.data?.data;
      const detail = fieldErrs && typeof fieldErrs === "object"
        ? " (" + Object.entries(fieldErrs).map(([k, v]) => `${k}: ${v}`).join(", ") + ")"
        : "";
      setErr(msg + detail);
    } finally {
      setLoading(false);
    }
  };

  const closeShiftNow = async () => {
    if (!current?.id) return;
    const amt = parseMoneyInput(closingTotal);
    if (!Number.isFinite(amt) || amt < 0) {
      setErr("Nhập số tiền mặt thực tế cuối ca hợp lệ.");
      return;
    }
    setLoading(true); setErr(null);
    try {
      const res = await shiftAPI.close(current.id, { actualCash: amt, notes: closingNotes.trim() || undefined });
      setCloseResult(res.data);
      setClosingTotal("");
      setClosingNotes("");
      setSummary(null);
      onShiftChange(null);
    } catch (e: any) {
      const msg = e.response?.data?.message || "Đóng ca thất bại.";
      const fieldErrs = e.response?.data?.data;
      const detail = fieldErrs && typeof fieldErrs === "object"
        ? " (" + Object.entries(fieldErrs).map(([k, v]) => `${k}: ${v}`).join(", ") + ")"
        : "";
      setErr(msg + detail);
    } finally {
      setLoading(false);
    }
  };

  /* Estimated discrepancy preview (needs summary loaded) */
  const actualAmt = parseMoneyInput(closingTotal);
  const estimatedDiscrepancy =
    summary && Number.isFinite(actualAmt)
      ? actualAmt - summary.expectedCash
      : null;

  if (!staff?.id) {
    return (
      <div className="screen">
        <div className="alert-error">Không xác định được nhân viên đăng nhập.</div>
      </div>
    );
  }

  if (current === undefined) {
    return (
      <div className="screen">
        <p className="loading-state">Đang tải thông tin ca…</p>
      </div>
    );
  }

  return (
    <div className="screen">
      <header className="screen-header">
        <div>
          <h2>Ca làm việc <span>Thu ngân</span></h2>
          <p>Nhân viên: <strong>{staff.name}</strong> · ID #{staff.id}</p>
        </div>
      </header>

      {err && <div className="alert-error" style={{ margin: "0 0 12px" }}>{err}</div>}

      {!current ? (
        <div className="stat-panel">
          {closeResult && (
            <div className="alert-success" style={{ marginBottom: 16 }}>
              <div>✅ <strong>Đã đóng ca #{closeResult.shiftId}</strong></div>
              <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                <div className="stat-card-mini">
                  <span className="stat-label">Tiền mặt thu</span>
                  <span className="stat-value">{fmtVnd(closeResult.cashRevenue)}</span>
                </div>
                <div className="stat-card-mini">
                  <span className="stat-label">Chuyển khoản</span>
                  <span className="stat-value">{fmtVnd(closeResult.transferRevenue)}</span>
                </div>
                <div className={`stat-card-mini ${closeResult.discrepancy !== 0 ? "stat-card-warning" : ""}`}>
                  <span className="stat-label">Chênh lệch</span>
                  <span className="stat-value">{fmtVnd(closeResult.discrepancy)}</span>
                </div>
              </div>
              {closeResult.notes && (
                <p style={{ marginTop: 6, fontSize: 12, color: "#6b7280" }}>Ghi chú: {closeResult.notes}</p>
              )}
            </div>
          )}
          <h4>📒 Mở ca mới</h4>
          <p style={{ marginBottom: 12, color: "#6b7280", fontSize: 14 }}>
            Quỹ đầu ca là số tiền mặt có tại quầy khi bắt đầu ca làm việc.
          </p>
          <div className="form-group">
            <label htmlFor="opening-total">Số tiền đầu ca (VND)</label>
            <input
              id="opening-total"
              placeholder="VD: 2.000.000"
              value={openingTotal}
              onChange={(ev) => setOpeningTotal(ev.target.value)}
            />
          </div>
          <button type="button" className="btn-primary" disabled={loading} onClick={() => void openShift()}>
            {loading ? "Đang xử lý…" : "📒 Mở ca"}
          </button>
        </div>
      ) : (
        <div className="stat-panel">
          {resumed && (
            <div className="alert-warning" style={{ marginBottom: 16 }}>
              ⚠️ Phiên trước chưa kết ca — đã tự động tiếp tục ca #{current.id}.
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <span style={{ fontSize: 28 }}>🟢</span>
            <div>
              <h4 style={{ margin: 0 }}>Ca #{current.id} đang hoạt động</h4>
              <p style={{ margin: 0, color: "#6b7280", fontSize: 13 }}>Thanh toán đã được bật cho ca này.</p>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
            <div className="stat-card-mini">
              <span className="stat-label">Mở lúc</span>
              <span className="stat-value">{fmtTime(current.openedAt)}</span>
            </div>
            <div className="stat-card-mini">
              <span className="stat-label">Quỹ đầu ca</span>
              <span className="stat-value">{fmtVnd(current.openingTotal)}</span>
            </div>
          </div>

          {/* ── Revenue preview ── */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>📊 Doanh thu ca hiện tại</span>
              <button
                type="button"
                className="btn-small"
                onClick={() => void loadSummary()}
                disabled={summaryLoading}
              >
                {summaryLoading ? "Đang tải…" : summary ? "🔄 Cập nhật" : "Xem trước"}
              </button>
            </div>
            {summary ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                <div className="stat-card-mini">
                  <span className="stat-label">Tiền mặt thu</span>
                  <span className="stat-value">{fmtVnd(summary.cashRevenue)}</span>
                </div>
                <div className="stat-card-mini">
                  <span className="stat-label">Chuyển khoản</span>
                  <span className="stat-value">{fmtVnd(summary.transferRevenue)}</span>
                </div>
                <div className="stat-card-mini">
                  <span className="stat-label">Dự kiến trong két</span>
                  <span className="stat-value gold">{fmtVnd(summary.expectedCash)}</span>
                </div>
              </div>
            ) : (
              <p style={{ fontSize: 12, color: "#9ca3af" }}>Nhấn "Xem trước" để kiểm tra doanh thu trước khi kết ca.</p>
            )}
          </div>

          <hr style={{ margin: "0 0 18px", borderColor: "#e5e7eb" }} />
          <h4 style={{ marginBottom: 12 }}>Kết ca</h4>
          <p style={{ marginBottom: 12, color: "#6b7280", fontSize: 14 }}>
            Nhập số tiền mặt thực tế trong két. Nếu có chênh lệch, bắt buộc phải ghi lý do.
          </p>
          <div className="form-group">
            <label htmlFor="closing-total">Số tiền mặt thực tế cuối ca (VND) *</label>
            <input
              id="closing-total"
              placeholder="VD: 5.000.000"
              value={closingTotal}
              onChange={(ev) => setClosingTotal(ev.target.value)}
            />
          </div>

          {/* Live discrepancy indicator */}
          {summary && estimatedDiscrepancy !== null && (
            <div style={{
              padding: "8px 12px",
              borderRadius: 8,
              marginBottom: 12,
              background: estimatedDiscrepancy === 0 ? "rgba(74,222,128,0.08)" : "rgba(251,191,36,0.08)",
              border: `1px solid ${estimatedDiscrepancy === 0 ? "rgba(74,222,128,0.25)" : "rgba(251,191,36,0.25)"}`,
              fontSize: 13,
              color: estimatedDiscrepancy === 0 ? "#4ade80" : "#fbbf24",
            }}>
              {estimatedDiscrepancy === 0
                ? "✅ Không có chênh lệch — có thể kết ca không cần ghi chú."
                : `⚠️ Chênh lệch dự kiến: ${fmtVnd(estimatedDiscrepancy)} — bắt buộc nhập lý do bên dưới.`}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="closing-notes">
              Lý do sai số / Ghi chú kết ca
              {estimatedDiscrepancy !== null && estimatedDiscrepancy !== 0 && (
                <span style={{ color: "#ef4444", marginLeft: 4 }}>*</span>
              )}
            </label>
            <textarea
              id="closing-notes"
              rows={3}
              placeholder="VD: Khách trả dư 50.000đ và không lấy lại; hoặc không có sai số..."
              value={closingNotes}
              onChange={(ev) => setClosingNotes(ev.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid #d1d5db",
                fontSize: 14,
                resize: "vertical",
                fontFamily: "inherit",
              }}
            />
          </div>
          <button type="button" className="btn-danger" disabled={loading} onClick={() => void closeShiftNow()}>
            {loading ? "Đang xử lý…" : "🔒 Kết ca"}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Invoice Screen ─────────────────────────────────────────────────────────────
interface InvoiceScreenProps {
  currentShift: ShiftResponse | null;
}

function InvoiceScreen({ currentShift }: InvoiceScreenProps) {
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [selected, setSelected] = useState<OrderResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [menuItemNames, setMenuItemNames] = useState<Map<number, string>>(new Map());
  const paymentRequests = usePaymentRequestStore((s) => s.byOrderId);
  const [ackBusyId, setAckBusyId] = useState<number | null>(null);

  useEffect(() => {
    publicMenuAPI.listItems()
      .then(res => {
        const map = new Map<number, string>();
        res.data.data.forEach(item => map.set(item.id, item.name));
        setMenuItemNames(map);
      })
      .catch(() => { /* silently fall back to Món #ID */ });
  }, []);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const res = await orderAPI.listOrders("SERVED");
      const data = res.data.data;
      setOrders(data);
      // Update selected order if still in list
      if (selected) {
        const updated = data.find(o => o.id === selected.id);
        if (updated) setSelected(updated);
      }
    } catch (err) {
      console.error("Lỗi lấy orders", err);
    } finally { setLoading(false); }
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

  return (
    <div className="screen">
      <header className="screen-header">
        <div>
          <h2>Hóa đơn <span>Chờ thanh toán</span></h2>
          <p>Tự động làm mới mỗi 5 giây · {orders.length} đơn đang chờ</p>
        </div>
        <button className="btn-secondary" onClick={fetchOrders} disabled={loading}>
          {loading ? "Đang tải..." : "🔄 Làm mới"}
        </button>
      </header>

      <div className="invoice-layout">
        {/* Order list — orders with an active customer payment-request bubble to the top. */}
        <div className="order-list-panel">
          <h4 className="panel-title">ĐƠN CHỜ THANH TOÁN</h4>
          {orders.length === 0 && !loading && (
            <div className="empty-state-small">Không có đơn nào chờ thanh toán</div>
          )}
          {[...orders]
            .sort((a, b) => {
              const aReq = paymentRequests[a.id];
              const bReq = paymentRequests[b.id];
              if (!!aReq === !!bReq) return 0;
              return aReq ? -1 : 1;
            })
            .map((order) => {
              const req = paymentRequests[order.id];
              return (
                <div
                  key={order.id}
                  className={`order-card ${selected?.id === order.id ? "selected" : ""}`}
                  style={req ? { borderLeft: "4px solid #f59e0b", background: "#fffbeb" } : undefined}
                  onClick={() => setSelected(order)}
                >
                  <div className="order-card-top">
                    <strong>Bàn {order.tableCode || order.tableId}</strong>
                    <span className="served-badge">SERVED</span>
                  </div>
                  {req && (
                    <div
                      style={{
                        background: req.status === "ACKNOWLEDGED" ? "#dbeafe" : "#fef3c7",
                        color: req.status === "ACKNOWLEDGED" ? "#1d4ed8" : "#92400e",
                        padding: "3px 8px",
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 600,
                        margin: "4px 0",
                        display: "inline-block",
                      }}
                    >
                      🛎️ {req.status === "ACKNOWLEDGED" ? "Đang xử lý" : "Khách yêu cầu"} ·
                      {" "}{req.preferredMethod === "CASH" ? "Tiền mặt" : "Chuyển khoản"}
                    </div>
                  )}
                  <div className="order-card-bottom">
                    <span>{order.items?.length || 0} món</span>
                    <b className="order-total">{fmtVnd(order.totalAmount)}</b>
                  </div>
                  {order.servedAt && <small>{fmtTime(order.servedAt)}</small>}
                </div>
              );
            })}
        </div>

        {/* Detail panel */}
        <div className="detail-panel">
          {!selected ? (
            <div className="no-selection">
              <div className="no-selection-icon">🧾</div>
              <p>Chọn một đơn hàng để xử lý thanh toán</p>
            </div>
          ) : (
            <>
              <div className="detail-header">
                <h3>Bàn {selected.tableCode || selected.tableId}</h3>
                <small>Đơn #{selected.id}</small>
              </div>
              {paymentRequests[selected.id] && (
                <div
                  style={{
                    background: "#fffbeb",
                    border: "1px solid #fde68a",
                    borderRadius: 8,
                    padding: 12,
                    marginBottom: 12,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#92400e" }}>
                      🛎️ Khách yêu cầu thanh toán ·{" "}
                      {paymentRequests[selected.id].preferredMethod === "CASH" ? "Tiền mặt" : "Chuyển khoản"}
                    </div>
                    <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
                      {paymentRequests[selected.id].status === "ACKNOWLEDGED"
                        ? `Đã ghi nhận ${paymentRequests[selected.id].acknowledgedByName ?? ""}`
                        : "Trạng thái: chờ cashier xác nhận"}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {paymentRequests[selected.id].status === "REQUESTED" && (
                      <button
                        className="btn-small"
                        disabled={ackBusyId === paymentRequests[selected.id].id}
                        onClick={async () => {
                          const req = paymentRequests[selected.id];
                          setAckBusyId(req.id);
                          try {
                            await paymentRequestAPI.acknowledge(req.id);
                          } catch (e: any) {
                            alert(e.response?.data?.message || "Lỗi xác nhận");
                          } finally {
                            setAckBusyId(null);
                          }
                        }}
                      >
                        ✅ Đã thấy
                      </button>
                    )}
                    <button
                      className="btn-small danger"
                      disabled={ackBusyId === paymentRequests[selected.id].id}
                      onClick={async () => {
                        const req = paymentRequests[selected.id];
                        const r = prompt("Lý do huỷ yêu cầu thanh toán này:", "");
                        if (r === null) return;
                        setAckBusyId(req.id);
                        try {
                          await paymentRequestAPI.cancel(req.id, r.trim() || "CANCELLED_BY_CASHIER");
                        } catch (e: any) {
                          alert(e.response?.data?.message || "Lỗi huỷ yêu cầu");
                        } finally {
                          setAckBusyId(null);
                        }
                      }}
                    >
                      ❌ Huỷ
                    </button>
                  </div>
                </div>
              )}
              <OrderItems items={selected.items || []} menuItemNames={menuItemNames} />
              <div className="detail-divider" />
              {/* Invoice export hidden here: order is still SERVED (not PAID) so the
                  printed receipt would have no payment method / time / cashier.
                  Use the "Lịch sử" tab to reprint after payment is finalised. */}
              {!currentShift && (
                <div className="alert-error" style={{ marginBottom: 8 }}>
                  ⚠️ Chưa mở ca — hãy mở ca trước khi thu tiền.
                </div>
              )}
              <PaymentForm order={selected} shiftId={currentShift?.id ?? null} onPaid={handlePaid} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── History Screen ─────────────────────────────────────────────────────────────
const HISTORY_PAGE_SIZES = [10, 20, 50];

function HistoryScreen() {
  const { staff } = useAdminStore();
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refundTarget, setRefundTarget] = useState<OrderResponse | null>(null);

  const load = useCallback(async (nextPage: number, nextSize: number) => {
    setLoading(true); setError(null);
    try {
      const res = await orderAPI.listOrdersPaged({ status: "PAID", page: nextPage, size: nextSize });
      const data = res.data.data;
      setOrders(data.content);
      setPage(data.page);
      setSize(data.size);
      setTotalElements(data.totalElements);
      setTotalPages(data.totalPages);
    } catch (e: any) {
      setError(e.response?.data?.message || "Lỗi tải lịch sử");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(0, size); }, [load, size]);

  const goToPage = (target: number) => {
    if (target < 0 || target >= totalPages || target === page) return;
    void load(target, size);
  };

  const showingFrom = totalElements === 0 ? 0 : page * size + 1;
  const showingTo = Math.min((page + 1) * size, totalElements);

  return (
    <div className="screen">
      <header className="screen-header">
        <div>
          <h2>Lịch sử <span>Giao dịch</span></h2>
          <p>
            {totalElements > 0
              ? `Hiển thị ${showingFrom}–${showingTo} / ${totalElements} đơn đã thanh toán`
              : "Chưa có giao dịch"}
          </p>
        </div>
        <button className="btn-secondary" onClick={() => void load(page, size)}>🔄 Làm mới</button>
      </header>

      {error && <div className="alert-error">{error}</div>}
      {loading && <div className="loading-state">Đang tải...</div>}

      <div className="staff-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Đơn #</th>
              <th>Bàn</th>
              <th>Số món</th>
              <th>Tổng tiền</th>
              <th>Thanh toán lúc</th>
              <th>Hóa đơn</th>
              {staff?.role === "MANAGER" && <th>Hoàn tiền</th>}
            </tr>
          </thead>
          <tbody>
            {orders.map(order => (
              <tr key={order.id}>
                <td>#{order.id}</td>
                <td>{order.tableCode || `Bàn ${order.tableId}`}</td>
                <td>{order.items?.length || 0}</td>
                <td className="gold">{fmtVnd(order.totalAmount)}</td>
                <td>{order.paidAt ? fmtTime(order.paidAt) : "—"}</td>
                <td>
                  <InvoiceExport
                    orderId={order.id}
                    tableLabel={order.tableCode || `Bàn ${order.tableId}`}
                    compact
                  />
                </td>
                {staff?.role === "MANAGER" && (
                  <td>
                    <button
                      className="btn-small danger"
                      onClick={() => setRefundTarget(order)}
                    >
                      🔄 Hoàn tiền
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {orders.length === 0 && !loading && (
              <tr>
                <td colSpan={staff?.role === "MANAGER" ? 7 : 6} className="empty-cell">
                  Chưa có giao dịch
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 14,
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#6b7280", fontSize: 13 }}>
            <span>Số dòng / trang:</span>
            <select
              value={size}
              disabled={loading}
              onChange={(e) => { setSize(Number(e.target.value)); }}
              style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #d1d5db" }}
            >
              {HISTORY_PAGE_SIZES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button className="btn-small" disabled={loading || page === 0} onClick={() => goToPage(0)}>
              ⏮
            </button>
            <button className="btn-small" disabled={loading || page === 0} onClick={() => goToPage(page - 1)}>
              ◀
            </button>
            <span style={{ padding: "0 10px", fontSize: 13, color: "#374151" }}>
              Trang <b>{page + 1}</b> / {totalPages}
            </span>
            <button className="btn-small" disabled={loading || page >= totalPages - 1} onClick={() => goToPage(page + 1)}>
              ▶
            </button>
            <button className="btn-small" disabled={loading || page >= totalPages - 1} onClick={() => goToPage(totalPages - 1)}>
              ⏭
            </button>
          </div>
        </div>
      )}

      {refundTarget && (
        <RefundModal
          order={refundTarget}
          onClose={() => setRefundTarget(null)}
          onChanged={() => void load(page, size)}
        />
      )}
    </div>
  );
}

// ─── Shift guard modal ─────────────────────────────────────────────────────────
function ShiftGuardModal({ shiftId, onClose, onGoToShift }: {
  shiftId: number;
  onClose: () => void;
  onGoToShift: () => void;
}) {
  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.45)", display: "flex",
        alignItems: "center", justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#fff", borderRadius: 14, padding: "28px 28px 22px",
          maxWidth: 380, width: "90%", boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ fontSize: 36, textAlign: "center", marginBottom: 12 }}>🔒</div>
        <h3 style={{ margin: "0 0 8px", fontSize: 17, fontWeight: 700, textAlign: "center" }}>
          Ca #{shiftId} đang hoạt động
        </h3>
        <p style={{ margin: "0 0 20px", color: "#6b7280", fontSize: 14, textAlign: "center", lineHeight: 1.5 }}>
          Bạn phải <strong>kết ca</strong> trước khi đăng xuất để đảm bảo doanh thu được ghi nhận đầy đủ.
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn-secondary" style={{ flex: 1 }} onClick={onClose}>
            Hủy
          </button>
          <button className="btn-danger" style={{ flex: 1 }} onClick={onGoToShift}>
            🔒 Đến kết ca
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Cashier Portal (wrapper) ───────────────────────────────────────────────────
export function CashierPortal() {
  const [tab, setTab] = useState("shift");
  const [currentShift, setCurrentShift] = useState<ShiftResponse | null>(null);
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
        if (e?.response?.status !== 404) console.error("[shift] current:", e);
        setCurrentShift(null);
      })
      .finally(() => setShiftLoaded(true));
  }, []);

  // Block browser close / tab refresh when shift is open
  useEffect(() => {
    if (!currentShift) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "Ca làm việc đang mở. Bạn cần kết ca trước khi thoát.";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [currentShift]);

  // Called by PortalLayout before executing logout
  const handleBeforeLogout = useCallback((): boolean => {
    if (currentShift) {
      setShowGuard(true);
      return false; // block logout
    }
    return true;
  }, [currentShift]);

  const paymentRequestUnread = usePaymentRequestStore((s) => s.unreadCount);
  const markPaymentRequestsRead = usePaymentRequestStore((s) => s.markAllRead);

  const navItems = [
    {
      id: "shift",
      label: currentShift ? `Ca #${currentShift.id} 🟢` : "Ca làm việc",
      icon: <ClockCircleOutlined />,
    },
    { id: "invoice", label: "Hóa đơn chờ", icon: <FileTextOutlined />, badge: paymentRequestUnread },
    { id: "history", label: "Lịch sử",     icon: <HistoryOutlined /> },
  ];

  const handleTabChange = (next: string) => {
    setTab(next);
    if (next === "invoice") markPaymentRequestsRead();
  };

  return (
    <>
      {showGuard && currentShift && (
        <ShiftGuardModal
          shiftId={currentShift.id}
          onClose={() => setShowGuard(false)}
          onGoToShift={() => { setShowGuard(false); setTab("shift"); }}
        />
      )}
      <PortalLayout
        title="PORTAL THU NGÂN"
        subtitle="CASHIER"
        navItems={navItems}
        activeTab={tab}
        onTabChange={handleTabChange}
        onBeforeLogout={handleBeforeLogout}
      >
        {tab === "shift" && (
          <ShiftScreen
            current={shiftLoaded ? currentShift : undefined}
            onShiftChange={setCurrentShift}
          />
        )}
        {tab === "invoice" && <InvoiceScreen currentShift={currentShift} />}
        {tab === "history" && <HistoryScreen />}
      </PortalLayout>
    </>
  );
}

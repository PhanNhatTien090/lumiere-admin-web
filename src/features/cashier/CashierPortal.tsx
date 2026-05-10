import { useState, useEffect, useCallback, useRef } from "react";
import { Modal } from "antd";
import { ClockCircleOutlined, FileTextOutlined, HistoryOutlined } from "@ant-design/icons";
import { QRCodeSVG } from "qrcode.react";
import { PortalLayout } from "@/components/layout/PortalLayout";
import { orderAPI, paymentAPI, shiftAPI } from "@/api/endpoints";
import { OrderItemResponse, OrderResponse, PaymentMethod, PaymentProvider, PaymentResponse, ShiftResponse } from "@/types";
import { useAdminStore } from "@/store/adminStore";

function fmtVnd(n: number) {
  return new Intl.NumberFormat("vi-VN").format(n) + "đ";
}

function fmtTime(s: string) {
  return new Date(s).toLocaleString("vi-VN");
}

function parseMoneyInput(raw: string): number {
  const n = Number(raw.replace(/\s/g, "").replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}

// ─── Xuất invoice JSON ─────────────────────────────────────────────────────────
function InvoiceJsonExport({ orderId, compact }: { orderId: number; compact?: boolean }) {
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
    } catch (e: any) {
      alert(e.response?.data?.message || "Không tải được hóa đơn JSON");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      className={compact ? "btn-small" : "btn-secondary"}
      disabled={busy}
      onClick={() => void run()}
    >
      {busy ? "…" : compact ? "📄 JSON" : "📄 Xuất hóa đơn JSON"}
    </button>
  );
}

// ─── Order Item list ───────────────────────────────────────────────────────────
function OrderItems({ items }: { items: OrderItemResponse[] }) {
  const billable = items.filter(i => i.billable);
  return (
    <div className="order-items">
      {billable.map(item => (
        <div key={item.id} className="order-line">
          <span className="item-qty">{item.quantity}x</span>
          <span className="item-name">{item.menuItemName || `Món #${item.menuItemId}`}</span>
          {item.note && <span className="item-note">({item.note})</span>}
          <span className="item-subtotal">{fmtVnd(item.subtotal)}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Payment Form ──────────────────────────────────────────────────────────────
function PaymentForm({ order, shiftId, onPaid }: { order: OrderResponse; shiftId: number | null; onPaid: () => void }) {
  const { staff } = useAdminStore();
  const [method, setMethod] = useState<PaymentMethod>("CASH");
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

  useEffect(() => () => stopPolling(), []);

  // Reset when method changes
  useEffect(() => {
    stopPolling();
    setPayment(null);
    setErr(null);
    setPollStatus(null);
  }, [method]);

  const createPayment = async () => {
    if (!shiftId) { setErr("Chưa mở ca. Vui lòng mở ca trước khi thanh toán."); return; }
    setLoading(true); setErr(null);
    try {
      const provider: PaymentProvider = method === "CASH" ? "CASH" : "VNPAY";
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
      } else if (method === "VNPAY_ATM") {
        const url = p.payUrl || p.qrContent;
        if (url) {
          sessionStorage.setItem("vnpay_order_id", String(order.id));
          window.location.href = url;
        } else {
          setErr("Không nhận được link thanh toán từ server.");
        }
      }
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

  const refund = async () => {
    if (!payment) return;
    const reason = prompt("Nhập lý do hoàn tiền:");
    if (!reason) return;
    try {
      await paymentAPI.refundPayment(payment.paymentId, { amount: payment.amount, reason });
      alert("Hoàn tiền thành công!");
      onPaid();
    } catch (e: any) {
      alert(e.response?.data?.message || "Lỗi hoàn tiền");
    }
  };

  return (
    <div className="payment-form">
      <div className="pay-section">
        <h4>Phương thức thanh toán</h4>
        <div className="pay-methods">
          <button
            className={`pay-method-btn ${method === "CASH" ? "active" : ""}`}
            onClick={() => setMethod("CASH")}
          >
            💵 Tiền mặt
          </button>
          <button
            className={`pay-method-btn ${method === "QR_CODE" ? "active" : ""}`}
            onClick={() => setMethod("QR_CODE")}
          >
            📱 VNPay QR
          </button>
          <button
            className={`pay-method-btn ${method === "VNPAY_ATM" ? "active" : ""}`}
            onClick={() => setMethod("VNPAY_ATM")}
          >
            🏧 VNPay ATM
          </button>
        </div>
      </div>

      <div className="total-row">
        <span>Tổng cộng</span>
        <b>{fmtVnd(order.totalAmount)}</b>
      </div>

      {err && <div className="form-err">{err}</div>}

      {!payment ? (
        <button className="btn-pay" onClick={createPayment} disabled={loading}>
          {loading
            ? "Đang xử lý..."
            : method === "VNPAY_ATM"
            ? "🏧 Chuyển sang VNPay"
            : "💳 Tạo thanh toán"}
        </button>
      ) : (
        <div className="payment-result">
          {method === "QR_CODE" && (
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

          {method === "CASH" && (
            <div className="cash-confirm">
              <div className="cash-amount">
                <span>Số tiền thu</span>
                <b>{fmtVnd(payment.amount)}</b>
              </div>
              <button className="btn-pay success" onClick={onPaid}>
                ✅ Xác nhận đã thu tiền
              </button>
            </div>
          )}

          {staff?.role === "MANAGER" && (
            <button className="btn-refund" onClick={refund}>🔄 Hoàn tiền</button>
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
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [closeResult, setCloseResult] = useState<import("@/types").CloseShiftResponse | null>(null);
  const [resumed, setResumed] = useState(false);

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
      setErr("Nhập số tiền cuối ca hợp lệ.");
      return;
    }
    setLoading(true); setErr(null);
    try {
      const res = await shiftAPI.close(current.id, { actualCash: amt });
      setCloseResult(res.data);
      setClosingTotal("");
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
            <div className="alert-success">
              ✅ Đã đóng ca thành công. Tiền mặt: <strong>{fmtVnd(closeResult.cashRevenue)}</strong> · Chuyển khoản: <strong>{fmtVnd(closeResult.transferRevenue)}</strong> · Chênh lệch: <strong>{fmtVnd(closeResult.discrepancy)}</strong>
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
          <hr style={{ margin: "0 0 18px", borderColor: "#e5e7eb" }} />
          <h4 style={{ marginBottom: 12 }}>Kết ca</h4>
          <p style={{ marginBottom: 12, color: "#6b7280", fontSize: 14 }}>
            Nhập số tiền mặt thực tế trong két để hệ thống tính chênh lệch.
          </p>
          <div className="form-group">
            <label htmlFor="closing-total">Số tiền mặt thực tế cuối ca (VND)</label>
            <input
              id="closing-total"
              placeholder="VD: 5.000.000"
              value={closingTotal}
              onChange={(ev) => setClosingTotal(ev.target.value)}
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
        {/* Order list */}
        <div className="order-list-panel">
          <h4 className="panel-title">ĐƠN CHỜ THANH TOÁN</h4>
          {orders.length === 0 && !loading && (
            <div className="empty-state-small">Không có đơn nào chờ thanh toán</div>
          )}
          {orders.map(order => (
            <div
              key={order.id}
              className={`order-card ${selected?.id === order.id ? "selected" : ""}`}
              onClick={() => setSelected(order)}
            >
              <div className="order-card-top">
                <strong>Bàn {order.tableCode || order.tableId}</strong>
                <span className="served-badge">SERVED</span>
              </div>
              <div className="order-card-bottom">
                <span>{order.items?.length || 0} món</span>
                <b className="order-total">{fmtVnd(order.totalAmount)}</b>
              </div>
              {order.servedAt && <small>{fmtTime(order.servedAt)}</small>}
            </div>
          ))}
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
              <OrderItems items={selected.items || []} />
              <div className="detail-divider" />
              <div className="header-actions" style={{ marginBottom: 12 }}>
                <InvoiceJsonExport orderId={selected.id} />
              </div>
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
              <th>Hóa đơn JSON</th>
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
                  <InvoiceJsonExport orderId={order.id} compact />
                </td>
                {staff?.role === "MANAGER" && (
                  <td>
                    <button className="btn-small danger" onClick={() => {
                      Modal.confirm({
                        title: 'Xác nhận hoàn tiền',
                        content: 'Để hoàn tiền, vui lòng vào tab "Hóa đơn chờ", chọn đơn hàng và dùng chức năng hoàn tiền trong form thanh toán.',
                        okText: 'Đã hiểu',
                        cancelText: 'Đóng',
                      });
                    }}>
                      Hoàn tiền
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

  const navItems = [
    {
      id: "shift",
      label: currentShift ? `Ca #${currentShift.id} 🟢` : "Ca làm việc",
      icon: <ClockCircleOutlined />,
    },
    { id: "invoice", label: "Hóa đơn chờ", icon: <FileTextOutlined /> },
    { id: "history", label: "Lịch sử",     icon: <HistoryOutlined /> },
  ];

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
        onTabChange={setTab}
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

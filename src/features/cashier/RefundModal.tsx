import { useEffect, useMemo, useState } from "react";
import { paymentAPI } from "@/api/endpoints";
import type { OrderResponse, RefundResponse, RefundStatus } from "@/types";
import { fmtDateTime } from "@/utils/format";

function fmtVnd(n: number) {
  return new Intl.NumberFormat("vi-VN").format(Math.round(n || 0)) + "đ";
}

const STATUS_LABEL: Record<RefundStatus, { label: string; color: string; bg: string }> = {
  INITIATED: { label: "Khởi tạo", color: "#6b7280", bg: "#f3f4f6" },
  PENDING:   { label: "⏳ Chờ xác nhận", color: "#92400e", bg: "#fef3c7" },
  SUCCESS:   { label: "✅ Hoàn tất", color: "#15803d", bg: "#dcfce7" },
  FAILED:    { label: "❌ Thất bại / Đã huỷ", color: "#dc2626", bg: "#fee2e2" },
};

interface RefundModalProps {
  order: OrderResponse;
  /** Optional preloaded payment id; otherwise we resolve via /payments/orders/{orderId}/status. */
  paymentId?: number;
  onClose: () => void;
  /** Called after any state-changing action so parent can refresh the order list. */
  onChanged?: () => void;
}

export function RefundModal({ order, paymentId: initialPaymentId, onClose, onChanged }: RefundModalProps) {
  const [paymentId, setPaymentId] = useState<number | undefined>(initialPaymentId);
  const [paymentAmount, setPaymentAmount] = useState<number>(order.totalAmount ?? 0);
  const [refunds, setRefunds] = useState<RefundResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [amount, setAmount] = useState<number>(0);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [busyRefundId, setBusyRefundId] = useState<number | null>(null);

  const successAmount = useMemo(
    () => refunds.filter((r) => r.status === "SUCCESS").reduce((sum, r) => sum + (r.amount || 0), 0),
    [refunds],
  );
  const pendingAmount = useMemo(
    () => refunds.filter((r) => r.status === "PENDING").reduce((sum, r) => sum + (r.amount || 0), 0),
    [refunds],
  );
  const refundable = Math.max(0, paymentAmount - successAmount - pendingAmount);

  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      const [statusRes, refundsRes] = await Promise.all([
        paymentAPI.getStatus(order.id),
        paymentAPI.listOrderRefunds(order.id),
      ]);
      const pid = statusRes.data.data.paymentId ?? initialPaymentId;
      const amt = statusRes.data.data.amount ?? order.totalAmount ?? 0;
      setPaymentId(pid);
      setPaymentAmount(amt);
      setRefunds(refundsRes.data.data || []);
    } catch (e: any) {
      setErr(e.response?.data?.message || "Không tải được dữ liệu hoàn tiền");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.id]);

  const setQuickAmount = (pct: number) => {
    setAmount(Math.round(refundable * pct));
  };

  const submitRefund = async () => {
    if (!paymentId) { setErr("Đơn này chưa có payment để hoàn"); return; }
    if (!Number.isFinite(amount) || amount <= 0) { setErr("Số tiền hoàn phải > 0"); return; }
    if (amount > refundable) { setErr(`Tối đa có thể hoàn: ${fmtVnd(refundable)}`); return; }
    if (reason.trim().length < 5) { setErr("Lý do tối thiểu 5 ký tự"); return; }

    setSubmitting(true);
    setErr(null);
    try {
      await paymentAPI.refundPayment(paymentId, { amount, reason: reason.trim() });
      // Refresh — refund may be SUCCESS (VNPAY) or PENDING (CASH/VIETQR)
      setAmount(0);
      setReason("");
      await load();
      onChanged?.();
    } catch (e: any) {
      setErr(e.response?.data?.message || "Không tạo được yêu cầu hoàn tiền");
    } finally {
      setSubmitting(false);
    }
  };

  const confirmPendingRefund = async (refundId: number) => {
    if (!confirm("Xác nhận đã trao tiền/chuyển khoản cho khách?")) return;
    setBusyRefundId(refundId);
    try {
      await paymentAPI.confirmRefund(refundId);
      await load();
      onChanged?.();
    } catch (e: any) {
      alert(e.response?.data?.message || "Lỗi xác nhận hoàn tiền");
    } finally {
      setBusyRefundId(null);
    }
  };

  const cancelPendingRefund = async (refundId: number) => {
    const r = prompt("Lý do huỷ refund này:");
    if (r === null) return;
    setBusyRefundId(refundId);
    try {
      await paymentAPI.cancelRefund(refundId, r.trim() || "CANCELLED_BY_CASHIER");
      await load();
      onChanged?.();
    } catch (e: any) {
      alert(e.response?.data?.message || "Lỗi huỷ refund");
    } finally {
      setBusyRefundId(null);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-box"
        style={{ maxWidth: 720 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3>Hoàn tiền — Đơn #{order.id}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {loading ? (
          <div className="loading-state">Đang tải dữ liệu hoàn tiền...</div>
        ) : (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 10,
                marginBottom: 16,
                padding: 12,
                background: "#f9fafb",
                borderRadius: 8,
                border: "1px solid #e5e7eb",
              }}
            >
              <div>
                <div style={{ fontSize: 11, color: "#6b7280" }}>Đã thanh toán</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#1f2937" }}>{fmtVnd(paymentAmount)}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#6b7280" }}>Đã hoàn (SUCCESS)</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#dc2626" }}>
                  {fmtVnd(successAmount)}
                  {pendingAmount > 0 && (
                    <span style={{ fontSize: 11, fontWeight: 400, color: "#92400e", marginLeft: 6 }}>
                      (+{fmtVnd(pendingAmount)} chờ)
                    </span>
                  )}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#6b7280" }}>Còn có thể hoàn</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#15803d" }}>{fmtVnd(refundable)}</div>
              </div>
            </div>

            {err && <div className="form-err">{err}</div>}

            {refundable > 0 && (
              <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12, marginBottom: 16 }}>
                <h4 style={{ marginTop: 0, marginBottom: 10 }}>Tạo yêu cầu hoàn tiền</h4>
                <div className="form-group">
                  <label>Số tiền hoàn (VND)</label>
                  <input
                    type="number"
                    min={0}
                    max={refundable}
                    value={amount || ""}
                    onChange={(e) => setAmount(Math.max(0, Math.min(refundable, +e.target.value || 0)))}
                    placeholder={`Tối đa ${fmtVnd(refundable)}`}
                  />
                  <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                    {[0.25, 0.5, 0.75, 1].map((p) => (
                      <button
                        key={p}
                        type="button"
                        className="btn-small"
                        onClick={() => setQuickAmount(p)}
                      >
                        {Math.round(p * 100)}%
                      </button>
                    ))}
                    <span style={{ marginLeft: "auto", alignSelf: "center", fontSize: 12, color: "#6b7280" }}>
                      {amount > 0 ? fmtVnd(amount) : ""}
                    </span>
                  </div>
                </div>
                <div className="form-group">
                  <label>Lý do hoàn tiền (≥ 5 ký tự, bắt buộc)</label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={2}
                    placeholder="VD: Khách trả lại 1 phần đồ uống vì sai vị"
                    style={{ width: "100%", padding: 8, border: "1px solid #d1d5db", borderRadius: 6, resize: "vertical" }}
                  />
                </div>
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 10 }}>
                  💡 CASH / VietQR sẽ tạo refund <b>chờ xác nhận</b> — cashier phải bấm "Xác nhận đã hoàn" sau khi trao tiền/chuyển khoản.
                  VNPay sẽ gọi cổng và hoàn ngay nếu thành công.
                </div>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={submitRefund}
                  disabled={submitting || !paymentId || amount <= 0}
                >
                  {submitting ? "Đang xử lý..." : "🔄 Tạo yêu cầu hoàn tiền"}
                </button>
              </div>
            )}

            <h4 style={{ marginTop: 0, marginBottom: 8 }}>Lịch sử hoàn tiền ({refunds.length})</h4>
            {refunds.length === 0 ? (
              <div className="empty-state" style={{ padding: 16 }}>Chưa có refund nào cho đơn này.</div>
            ) : (
              <div className="staff-table-wrap" style={{ marginBottom: 8 }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Thời điểm</th>
                      <th>Số tiền</th>
                      <th>Trạng thái</th>
                      <th>Lý do</th>
                      <th>Người tạo</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {refunds.map((r) => {
                      const meta = STATUS_LABEL[r.status];
                      const busy = busyRefundId === r.id;
                      return (
                        <tr key={r.id}>
                          <td>{r.id}</td>
                          <td style={{ fontSize: 12 }}>{fmtDateTime(r.createdAt)}</td>
                          <td className="gold">{fmtVnd(r.amount)}</td>
                          <td>
                            <span
                              style={{
                                padding: "3px 8px",
                                borderRadius: 10,
                                fontSize: 11,
                                fontWeight: 600,
                                background: meta.bg,
                                color: meta.color,
                              }}
                            >
                              {meta.label}
                            </span>
                          </td>
                          <td style={{ fontSize: 12, maxWidth: 200 }}>{r.reason || "—"}</td>
                          <td style={{ fontSize: 12 }}>{r.requestedByName || (r.requestedBy ? `#${r.requestedBy}` : "—")}</td>
                          <td>
                            {r.status === "PENDING" && (
                              <div style={{ display: "flex", gap: 4 }}>
                                <button
                                  className="btn-small"
                                  onClick={() => confirmPendingRefund(r.id)}
                                  disabled={busy}
                                  title="Xác nhận đã trao tiền"
                                >
                                  {busy ? "⏳" : "✅"}
                                </button>
                                <button
                                  className="btn-small danger"
                                  onClick={() => cancelPendingRefund(r.id)}
                                  disabled={busy}
                                  title="Huỷ refund này"
                                >
                                  {busy ? "⏳" : "❌"}
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={onClose}>Đóng</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}


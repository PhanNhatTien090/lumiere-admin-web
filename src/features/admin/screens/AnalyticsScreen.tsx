import { useState } from "react";
import { analyticsAPI } from "@/api/endpoints";
import { AnalyticsSummary } from "@/types";

function fmt(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(0) + "K";
  return n.toString();
}

function fmtVnd(n: number) {
  return new Intl.NumberFormat("vi-VN").format(n) + "đ";
}

export function AnalyticsScreen() {
  const today = new Date().toISOString().slice(0, 10);
  const oneMonthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

  const [from, setFrom] = useState(oneMonthAgo);
  const [to, setTo] = useState(today);
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await analyticsAPI.getSummary(from, to);
      if (res.data.success) setData(res.data.data);
      else setError(res.data.message || "Lỗi tải dữ liệu");
    } catch (e: any) {
      if (!e.response) {
        setError("Không thể kết nối tới máy chủ. Vui lòng thử lại sau.");
      } else if (e.response?.status === 500) {
        setError(`Lỗi máy chủ (500): ${e.response?.data?.message || "Internal Server Error"}`);
      } else {
        setError(e.response?.data?.message || "Không thể tải thống kê");
      }
    } finally {
      setLoading(false);
    }
  };

  // Do NOT auto-load on mount — user explicitly clicks "Xem báo cáo"
  // useEffect(() => { load(); }, []);

  const successRate = data
    ? ((data.successfulPayments / (data.totalOrders || 1)) * 100).toFixed(1)
    : "0";
  const cancelRate = data
    ? ((data.cancelledOrders / (data.totalOrders || 1)) * 100).toFixed(1)
    : "0";

  return (
    <div className="screen">
      <header className="screen-header">
        <div>
          <h2>Thống kê &amp; <span>Analytics</span></h2>
          <p>Báo cáo doanh thu và vận hành nhà hàng</p>
        </div>
        <div className="date-filter">
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} />
          <span>→</span>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} />
          <button className="btn-primary" onClick={load} disabled={loading}>
            {loading ? "Đang tải..." : "Xem báo cáo"}
          </button>
        </div>
      </header>

      {error && <div className="alert-error">{error}</div>}

      {data && (
        <>
          <div className="metrics-grid">
            <div className="metric-card accent">
              <div className="metric-icon">💰</div>
              <div>
                <p>Tổng doanh thu</p>
                <b className="metric-value">{fmtVnd(data.totalRevenue)}</b>
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-icon">📋</div>
              <div>
                <p>Tổng đơn hàng</p>
                <b className="metric-value">{fmt(data.totalOrders)}</b>
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-icon">✅</div>
              <div>
                <p>Đơn xác nhận</p>
                <b className="metric-value">{fmt(data.confirmedOrders)}</b>
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-icon">❌</div>
              <div>
                <p>Đơn hủy</p>
                <b className="metric-value">{fmt(data.cancelledOrders)}</b>
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-icon">💳</div>
              <div>
                <p>Thanh toán thành công</p>
                <b className="metric-value">{fmt(data.successfulPayments)}</b>
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-icon">⚠️</div>
              <div>
                <p>Thanh toán thất bại</p>
                <b className="metric-value">{fmt(data.failedPayments)}</b>
              </div>
            </div>
          </div>

          <div className="stats-panels">
            <div className="stat-panel">
              <h4>Tỷ lệ thành công</h4>
              <div className="rate-bar-wrap">
                <div className="rate-bar" style={{ width: `${successRate}%`, background: "#4ade80" }} />
              </div>
              <span className="rate-label">{successRate}% thanh toán thành công</span>
            </div>
            <div className="stat-panel">
              <h4>Tỷ lệ hủy đơn</h4>
              <div className="rate-bar-wrap">
                <div className="rate-bar" style={{ width: `${cancelRate}%`, background: "#f87171" }} />
              </div>
              <span className="rate-label">{cancelRate}% đơn bị hủy</span>
            </div>
            <div className="stat-panel">
              <h4>Doanh thu trung bình / đơn</h4>
              <p className="avg-value">
                {data.confirmedOrders > 0
                  ? fmtVnd(Math.round(data.totalRevenue / data.confirmedOrders))
                  : "—"}
              </p>
            </div>
            <div className="stat-panel info-panel">
              <h4>Thông tin báo cáo</h4>
              <table className="info-table">
                <tbody>
                  <tr><td>Từ ngày</td><td>{data.fromDate}</td></tr>
                  <tr><td>Đến ngày</td><td>{data.toDate}</td></tr>
                  <tr><td>Tạo lúc</td><td>{new Date(data.generatedAt).toLocaleString("vi-VN")}</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {!data && !loading && !error && (
        <div className="empty-state">
          <p>📊 Chọn khoảng ngày và nhấn <strong>"Xem báo cáo"</strong> để tải thống kê.</p>
          <p style={{ fontSize: "0.8rem", opacity: 0.6, marginTop: 8 }}>Yêu cầu backend chạy tại <code>localhost:8080</code></p>
        </div>
      )}
    </div>
  );
}

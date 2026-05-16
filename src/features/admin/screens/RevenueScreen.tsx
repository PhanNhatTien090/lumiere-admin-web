import { useEffect, useState } from "react";
import { analyticsAPI } from "@/api/endpoints";
import type {
  RevenueDetailResponse,
  RevenueGroupBy,
  RevenuePeriod,
  RevenueTopItem,
} from "@/types";
import { fmtVnd, fmtVndCompact } from "@/utils/format";

// "1,2 tỷ" / "120 tr" / "12K" — dùng cho trục Y biểu đồ (rất hẹp)
function fmtAxis(n: number): string {
  if (!Number.isFinite(n) || n === 0) return "0";
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1).replace(".", ",") + "B";
  if (abs >= 1_000_000) return (n / 1_000_000).toFixed(0) + "M";
  if (abs >= 1_000) return (n / 1_000).toFixed(0) + "K";
  return Math.round(n).toString();
}

// viewMode là phạm vi user chọn trên UI; apiGroupBy nhỏ hơn 1 cấp để chia bucket:
//   DAY   → chỉ hôm nay, group theo DAY
//   WEEK  → 7 ngày gần nhất, group theo DAY
//   MONTH → 30 ngày gần nhất, group theo WEEK
//   YEAR  → 12 tháng gần nhất, group theo MONTH
function deriveQuery(viewMode: RevenueGroupBy): {
  from: string;
  to: string;
  apiGroupBy: RevenueGroupBy;
} {
  const today = new Date();
  const toIso = today.toISOString().slice(0, 10);
  const config: Record<RevenueGroupBy, { daysBack: number; apiGroupBy: RevenueGroupBy }> = {
    DAY:   { daysBack: 0,   apiGroupBy: "DAY" },
    WEEK:  { daysBack: 6,   apiGroupBy: "DAY" },
    MONTH: { daysBack: 29,  apiGroupBy: "WEEK" },
    YEAR:  { daysBack: 364, apiGroupBy: "MONTH" },
  };
  const { daysBack, apiGroupBy } = config[viewMode];
  const fromDate = new Date(today.getTime() - daysBack * 86400000);
  const fromIso = fromDate.toISOString().slice(0, 10);
  return { from: fromIso, to: toIso, apiGroupBy };
}

interface PeriodChartProps {
  periods: RevenuePeriod[];
}
function PeriodChart({ periods }: PeriodChartProps) {
  if (!periods.length) return null;

  const W = 720;
  const H = 240;
  const PAD = { top: 16, right: 16, bottom: 48, left: 70 };

  const grossValues = periods.map((p) => p.revenue);
  const maxV = Math.max(...grossValues) * 1.1 || 1;
  const minV = 0;

  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const barGap = 6;
  const barW = Math.max(2, innerW / periods.length - barGap);

  const xScale = (i: number) => PAD.left + i * (innerW / periods.length) + barGap / 2;
  const yScale = (v: number) => PAD.top + ((maxV - v) / (maxV - minV)) * innerH;

  const ticks = 5;
  const yTicks = Array.from({ length: ticks }, (_, i) => minV + ((maxV - minV) * i) / (ticks - 1));

  const stepLabel = Math.max(1, Math.ceil(periods.length / 12));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ fontFamily: "inherit" }}>
      {yTicks.map((v) => {
        const y = yScale(v);
        return (
          <g key={v}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y} y2={y} stroke="rgba(255,255,255,0.06)" />
            <text x={PAD.left - 6} y={y + 4} textAnchor="end" fontSize={10} fill="#6b7280">
              {fmtAxis(v)}
            </text>
          </g>
        );
      })}

      {periods.map((p, i) => {
        const x = xScale(i);
        const yNet = yScale(p.netRevenue);
        const yGross = yScale(p.revenue);
        const hNet = Math.max(0, H - PAD.bottom - yNet);
        const hTax = Math.max(0, yNet - yGross);
        return (
          <g key={p.periodLabel}>
            <title>
              {p.periodLabel}
              {"\n"}NET: {fmtVnd(p.netRevenue)}
              {"\n"}Tax: {fmtVnd(p.taxAmount)}
              {"\n"}Gross: {fmtVnd(p.revenue)}
              {"\n"}Orders: {p.orderCount}
            </title>
            <rect x={x} y={yNet} width={barW} height={hNet} fill="#4ade80" />
            <rect x={x} y={yGross} width={barW} height={hTax} fill="#c49a2b" />
            {i % stepLabel === 0 && (
              <text
                x={x + barW / 2}
                y={H - PAD.bottom + 14}
                textAnchor="middle"
                fontSize={10}
                fill="#9ca3af"
              >
                {p.periodLabel}
              </text>
            )}
          </g>
        );
      })}

      <g transform={`translate(${PAD.left}, ${H - 16})`}>
        <rect x={0} y={-9} width={10} height={10} fill="#4ade80" />
        <text x={14} y={0} fontSize={11} fill="#9ca3af">NET</text>
        <rect x={50} y={-9} width={10} height={10} fill="#c49a2b" />
        <text x={64} y={0} fontSize={11} fill="#9ca3af">Thuế</text>
      </g>
    </svg>
  );
}

interface TopItemsTableProps {
  items: RevenueTopItem[];
}
function TopItemsTable({ items }: TopItemsTableProps) {
  if (!items.length) {
    return <p className="empty-state-mini">Chưa có dữ liệu món bán chạy trong khoảng thời gian này.</p>;
  }
  const maxQty = Math.max(...items.map((i) => i.totalQuantity));

  return (
    <table className="data-table">
      <thead>
        <tr>
          <th style={{ width: 40 }}>#</th>
          <th>Tên món</th>
          <th style={{ textAlign: "right" }}>SL bán</th>
          <th style={{ textAlign: "right" }}>Số đơn</th>
          <th style={{ textAlign: "right" }}>Doanh thu (gross)</th>
        </tr>
      </thead>
      <tbody>
        {items.map((it, idx) => {
          const pct = maxQty > 0 ? (it.totalQuantity / maxQty) * 100 : 0;
          return (
            <tr key={it.menuItemId}>
              <td>{idx + 1}</td>
              <td>
                <div style={{ fontWeight: 500 }}>{it.menuItemName || `#${it.menuItemId}`}</div>
                <div className="rate-bar-wrap" style={{ marginTop: 4, height: 4 }}>
                  <div className="rate-bar" style={{ width: `${pct}%`, background: "#c49a2b" }} />
                </div>
              </td>
              <td style={{ textAlign: "right" }}>{it.totalQuantity}</td>
              <td style={{ textAlign: "right" }}>{it.orderCount}</td>
              <td style={{ textAlign: "right" }} title={fmtVnd(it.totalRevenue)}>
                {fmtVndCompact(it.totalRevenue)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export function RevenueScreen() {
  const initial = deriveQuery("DAY");

  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  // viewMode là phạm vi user chọn (ngày/tuần/tháng/năm) — không phải groupBy gửi cho API
  const [viewMode, setViewMode] = useState<RevenueGroupBy>("DAY");
  // Khi user tự sửa from/to thủ công thì không auto-set lại nữa
  const [manualDate, setManualDate] = useState(false);
  const [data, setData] = useState<RevenueDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onViewModeChange = (next: RevenueGroupBy) => {
    setViewMode(next);
    if (!manualDate) {
      const q = deriveQuery(next);
      setFrom(q.from);
      setTo(q.to);
    }
  };

  const onFromChange = (value: string) => {
    setFrom(value);
    setManualDate(true);
  };
  const onToChange = (value: string) => {
    setTo(value);
    setManualDate(true);
  };

  const resetDates = () => {
    const q = deriveQuery(viewMode);
    setFrom(q.from);
    setTo(q.to);
    setManualDate(false);
  };

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const { apiGroupBy } = deriveQuery(viewMode);
      const res = await analyticsAPI.getRevenue({
        fromDate: from,
        toDate: to,
        groupBy: apiGroupBy,
      });
      if (res.data.success) setData(res.data.data);
      else setError(res.data.message || "Lỗi tải dữ liệu");
    } catch (e: any) {
      if (!e.response) {
        setError("Không thể kết nối tới máy chủ.");
      } else if (e.response?.status === 500) {
        setError(`Lỗi máy chủ (500): ${e.response?.data?.message || "Internal Server Error"}`);
      } else {
        setError(e.response?.data?.message || "Không thể tải báo cáo doanh thu");
      }
    } finally {
      setLoading(false);
    }
  };

  // Auto-load doanh thu hôm nay khi mở trang (default viewMode = DAY)
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="screen">
      <header className="screen-header">
        <div>
          <h2>Báo cáo Doanh thu <span>chi tiết</span></h2>
          <p>Phân tích doanh thu theo kỳ và top món bán chạy</p>
        </div>
        <div className="date-filter">
          <select
            value={viewMode}
            onChange={(e) => onViewModeChange(e.target.value as RevenueGroupBy)}
            className="select-input revenue-view-select"
            title="Đổi phạm vi sẽ tự đặt khoảng ngày phù hợp"
          >
            <option value="DAY">Theo ngày</option>
            <option value="WEEK">Theo tuần</option>
            <option value="MONTH">Theo tháng</option>
            <option value="YEAR">Theo năm</option>
          </select>
          <input type="date" value={from} onChange={(e) => onFromChange(e.target.value)} />
          <span>→</span>
          <input type="date" value={to} onChange={(e) => onToChange(e.target.value)} />
          {manualDate && (
            <button
              type="button"
              className="btn-small"
              onClick={resetDates}
              title="Đặt lại ngày theo nhóm hiện tại"
            >
              ↺ Auto
            </button>
          )}
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
                <p>Tổng doanh thu (gross)</p>
                <b className="metric-value" title={fmtVnd(data.totalRevenue)}>
                  {fmtVndCompact(data.totalRevenue)}
                </b>
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-icon">🏦</div>
              <div>
                <p>Doanh thu thuần (NET)</p>
                <b className="metric-value" title={fmtVnd(data.totalNetRevenue)}>
                  {fmtVndCompact(data.totalNetRevenue)}
                </b>
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-icon">🧾</div>
              <div>
                <p>Thuế đã thu</p>
                <b className="metric-value" title={fmtVnd(data.totalTax)}>
                  {fmtVndCompact(data.totalTax)}
                </b>
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-icon">📋</div>
              <div>
                <p>Tổng đơn thanh toán</p>
                <b className="metric-value">{data.totalOrders}</b>
              </div>
            </div>
          </div>

          <div className="stats-panels">
            <div className="stat-panel" style={{ gridColumn: "span 2" }}>
              <h4>Doanh thu theo {data.groupBy === "DAY" ? "ngày" : data.groupBy === "WEEK" ? "tuần" : data.groupBy === "MONTH" ? "tháng" : "năm"}</h4>
              {data.periods.length > 0 ? (
                <PeriodChart periods={data.periods} />
              ) : (
                <p className="empty-state-mini">Chưa có dữ liệu doanh thu trong khoảng này.</p>
              )}
            </div>
          </div>

          <div className="stats-panels">
            <div className="stat-panel" style={{ gridColumn: "span 2" }}>
              <h4>Top 10 món bán chạy</h4>
              <TopItemsTable items={data.topItems} />
            </div>
          </div>
        </>
      )}

      {!data && !loading && !error && (
        <div className="empty-state">
          <p>📊 Chọn khoảng ngày + group-by rồi nhấn <strong>"Xem báo cáo"</strong> để tải chi tiết doanh thu.</p>
        </div>
      )}
    </div>
  );
}

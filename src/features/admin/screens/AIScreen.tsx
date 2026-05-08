import { useCallback, useEffect, useRef, useState } from "react";
import { aiAPI, publicMenuAPI } from "@/api/endpoints";
import type {
  ForecastMetric,
  ForecastPrediction,
  DraftCombo,
  MenuItemResponse,
} from "@/types";

// ─── Helper ───────────────────────────────────────────────────────────────────
function fmtVnd(n: number) {
  return new Intl.NumberFormat("vi-VN").format(n) + "đ";
}

// ─── Tiny SVG line chart ──────────────────────────────────────────────────────
interface ForecastChartProps {
  predictions: ForecastPrediction[];
  metric: ForecastMetric;
}
function ForecastChart({ predictions, metric }: ForecastChartProps) {
  if (!predictions.length) return null;

  const W = 560;
  const H = 180;
  const PAD = { top: 20, right: 20, bottom: 36, left: metric === "revenue" ? 70 : 40 };

  const values = predictions.map((p) => p.value);
  const lowers = predictions.map((p) => p.lowerBound);
  const uppers = predictions.map((p) => p.upperBound);
  const allNums = [...values, ...lowers, ...uppers];
  const minV = Math.min(...allNums) * 0.95;
  const maxV = Math.max(...allNums) * 1.05;

  const xScale = (i: number) =>
    PAD.left + (i / (predictions.length - 1)) * (W - PAD.left - PAD.right);
  const yScale = (v: number) =>
    PAD.top + ((maxV - v) / (maxV - minV)) * (H - PAD.top - PAD.bottom);

  const linePath = predictions
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xScale(i).toFixed(1)} ${yScale(p.value).toFixed(1)}`)
    .join(" ");

  const bandPath =
    predictions
      .map((p, i) => `${i === 0 ? "M" : "L"} ${xScale(i).toFixed(1)} ${yScale(p.upperBound).toFixed(1)}`)
      .join(" ") +
    " " +
    predictions
      .map((p, i) => `L ${xScale(predictions.length - 1 - i).toFixed(1)} ${yScale(p.lowerBound).toFixed(1)}`)
      .join(" ") +
    " Z";

  // y-axis ticks
  const ticks = 5;
  const yTicks = Array.from({ length: ticks }, (_, i) => minV + ((maxV - minV) * i) / (ticks - 1));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ fontFamily: "inherit" }}>
      {/* Band (confidence interval) */}
      <path d={bandPath} fill="rgba(196,154,43,0.12)" />

      {/* Y-axis ticks */}
      {yTicks.map((v) => {
        const y = yScale(v);
        const label =
          metric === "revenue"
            ? v >= 1_000_000
              ? `${(v / 1_000_000).toFixed(1)}M`
              : `${(v / 1_000).toFixed(0)}K`
            : Math.round(v).toString();
        return (
          <g key={v}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
            <text x={PAD.left - 6} y={y + 4} textAnchor="end" fontSize={10} fill="#6b7280">
              {label}
            </text>
          </g>
        );
      })}

      {/* Line */}
      <path d={linePath} fill="none" stroke="#c49a2b" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />

      {/* Dots + x-labels */}
      {predictions.map((p, i) => {
        const cx = xScale(i);
        const cy = yScale(p.value);
        // Show date relative to today
        const date = new Date();
        date.setDate(date.getDate() + p.day);
        const label = date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
        return (
          <g key={p.day}>
            <circle cx={cx} cy={cy} r={4} fill="#c49a2b" />
            {/* Only show every other label when many points */}
            {(predictions.length <= 14 || i % 2 === 0) && (
              <text x={cx} y={H - PAD.bottom + 14} textAnchor="middle" fontSize={9} fill="#6b7280">
                {label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ─── Demand Forecast Panel ────────────────────────────────────────────────────
function ForecastPanel() {
  const [metric, setMetric] = useState<ForecastMetric>("orders");
  const [horizon, setHorizon] = useState(7);
  const [predictions, setPredictions] = useState<ForecastPrediction[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const res = await aiAPI.forecast({ metric, horizonDays: horizon });
      const d = res.data.data;
      if (d?.success && d.predictions?.length) {
        setPredictions(d.predictions);
      } else {
        setError("AI forecast không khả dụng lúc này. Vui lòng thử lại sau.");
        setPredictions(null);
      }
    } catch {
      setError("Không thể kết nối đến backend. Kiểm tra server đang chạy.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="ai-panel">
      <div className="ai-panel-header">
        <div>
          <h3 className="ai-panel-title">📈 Dự báo nhu cầu (Demand Forecast)</h3>
          <p className="ai-panel-subtitle">
            Mô hình LightGBM dự báo số đơn hàng hoặc doanh thu theo ngày
          </p>
        </div>
      </div>

      <div className="ai-controls">
        <label className="ai-label">
          Chỉ số
          <select
            className="ai-select"
            value={metric}
            onChange={(e) => setMetric(e.target.value as ForecastMetric)}
          >
            <option value="orders">Số đơn hàng</option>
            <option value="revenue">Doanh thu (VNĐ)</option>
          </select>
        </label>
        <label className="ai-label">
          Số ngày dự báo
          <input
            type="number"
            className="ai-input"
            min={1}
            max={90}
            value={horizon}
            onChange={(e) => setHorizon(Math.min(90, Math.max(1, Number(e.target.value))))}
          />
        </label>
        <button className="btn-primary ai-run-btn" onClick={run} disabled={loading}>
          {loading ? "Đang phân tích..." : "Chạy dự báo"}
        </button>
      </div>

      {error && <div className="alert-error">{error}</div>}

      {predictions && (
        <div className="forecast-result">
          <div className="forecast-chart-wrap">
            <ForecastChart predictions={predictions} metric={metric} />
            <p className="forecast-legend">
              <span className="legend-band" />
              Vùng màu = khoảng tin cậy (confidence interval)
            </p>
          </div>
          <div className="forecast-table-wrap">
            <table className="forecast-table">
              <thead>
                <tr>
                  <th>Ngày</th>
                  <th>Dự báo</th>
                  <th>Thấp nhất</th>
                  <th>Cao nhất</th>
                </tr>
              </thead>
              <tbody>
                {predictions.slice(0, 10).map((p) => {
                  const date = new Date();
                  date.setDate(date.getDate() + p.day);
                  const fmt = metric === "revenue"
                    ? (v: number | undefined) => v == null ? "—" : fmtVnd(v)
                    : (v: number | undefined) => v == null ? "—" : v.toLocaleString("vi-VN");
                  return (
                    <tr key={p.day}>
                      <td>
                        {date.toLocaleDateString("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit" })}
                      </td>
                      <td className="fw-bold">{fmt(p.value)}</td>
                      <td className="text-muted">{fmt(p.lowerBound)}</td>
                      <td className="text-muted">{fmt(p.upperBound)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!predictions && !loading && !error && (
        <div className="empty-state">
          <p>🤖 Nhấn <strong>"Chạy dự báo"</strong> để AI phân tích xu hướng.</p>
        </div>
      )}
    </section>
  );
}

// ─── Combo Discovery Panel ────────────────────────────────────────────────────
function ComboPanel() {
  const [analyzeDays, setAnalyzeDays] = useState(30);
  const [minSupport, setMinSupport] = useState(0.05);
  const [minConfidence, setMinConfidence] = useState(0.6);
  const [combos, setCombos] = useState<DraftCombo[] | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItemResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Preload menu items for name lookup
  useEffect(() => {
    publicMenuAPI.listItems().then((res) => {
      if (res.data.success) setMenuItems(res.data.data);
    }).catch(() => {});
  }, []);

  function getItemName(id: number) {
    return menuItems.find((m) => m.id === id)?.name ?? `Món #${id}`;
  }

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const res = await aiAPI.generateCombos({ analyzeDays, minSupport, minConfidence });
      const d = res.data.data;
      if (d?.success && d.draftCombos?.length) {
        setCombos(d.draftCombos);
      } else if (d?.success && d.draftCombos?.length === 0) {
        setCombos([]);
      } else {
        setError("AI không tìm được combo nào. Thử giảm minSupport hoặc minConfidence.");
        setCombos(null);
      }
    } catch {
      setError("Không thể kết nối backend hoặc AI service chưa sẵn sàng.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="ai-panel">
      <div className="ai-panel-header">
        <div>
          <h3 className="ai-panel-title">🔗 Khám phá Combo (FP-Growth)</h3>
          <p className="ai-panel-subtitle">
            Phân tích lịch sử đơn hàng để tìm các món thường gọi cùng nhau
          </p>
        </div>
      </div>

      <div className="ai-controls">
        <label className="ai-label">
          Số ngày phân tích
          <input
            type="number"
            className="ai-input"
            min={7}
            max={365}
            value={analyzeDays}
            onChange={(e) => setAnalyzeDays(Number(e.target.value))}
          />
        </label>
        <label className="ai-label">
          Min Support (0–1)
          <input
            type="number"
            className="ai-input"
            min={0.01}
            max={1}
            step={0.01}
            value={minSupport}
            onChange={(e) => setMinSupport(Number(e.target.value))}
          />
        </label>
        <label className="ai-label">
          Min Confidence (0–1)
          <input
            type="number"
            className="ai-input"
            min={0.1}
            max={1}
            step={0.05}
            value={minConfidence}
            onChange={(e) => setMinConfidence(Number(e.target.value))}
          />
        </label>
        <button className="btn-primary ai-run-btn" onClick={run} disabled={loading}>
          {loading ? "Đang phân tích..." : "Tìm Combo"}
        </button>
      </div>

      {error && <div className="alert-error">{error}</div>}

      {combos !== null && combos.length === 0 && (
        <div className="empty-state">
          <p>Không tìm thấy combo nào với tham số hiện tại. Thử giảm <code>minSupport</code> hoặc <code>minConfidence</code>.</p>
        </div>
      )}

      {combos && combos.length > 0 && (
        <div className="combo-grid">
          {combos.map((c, i) => (
            <div key={i} className="combo-card">
              <div className="combo-badges">
                <span className="combo-badge-conf">
                  Confidence: {(c.confidenceScore * 100).toFixed(0)}%
                </span>
                <span className={`combo-badge-lift ${c.liftScore > 1.3 ? "lift-high" : "lift-ok"}`}>
                  Lift: {c.liftScore.toFixed(2)}x
                </span>
              </div>
              <div className="combo-items">
                {c.comboItems.map((id, j) => (
                  <span key={id} className="combo-item-tag">
                    {j > 0 && <span className="combo-plus">+</span>}
                    {getItemName(id)}
                  </span>
                ))}
              </div>
              <div className="combo-lift-bar-wrap">
                <div
                  className="combo-lift-bar"
                  style={{ width: `${Math.min(100, (c.confidenceScore * 100))}%` }}
                />
              </div>
              <p className="combo-hint">
                {c.liftScore > 1.3
                  ? "⚡ Tín hiệu co-purchase mạnh — nên tạo combo ngay"
                  : "✓ Có xu hướng gọi cùng nhau"}
              </p>
            </div>
          ))}
        </div>
      )}

      {!combos && !loading && !error && (
        <div className="empty-state">
          <p>🔍 Nhấn <strong>"Tìm Combo"</strong> để AI phân tích lịch sử đơn hàng.</p>
        </div>
      )}
    </section>
  );
}

// ─── AI Retrain Panel ─────────────────────────────────────────────────────────
function RetrainPanel() {
  const [status, setStatus] = useState<"idle" | "running" | "done" | "failed">("idle");
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [progress, setProgress] = useState(0);
  const progressRef = useRef(0);

  // Restore jobId from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("lumiere_retrain_jobId");
    if (saved) {
      setJobId(saved);
      setStatus("running");
      setStatusMsg("Đang khôi phục trạng thái job trước...");
    }
  }, []);

  // Poll whenever jobId changes and status is running
  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startPolling = useCallback(
    (id: string) => {
      stopPolling();
      progressRef.current = 0;
      setProgress(0);

      intervalRef.current = setInterval(async () => {
        // Animate fake progress bar until 90%
        if (progressRef.current < 88) {
          progressRef.current += Math.random() * 3;
          setProgress(Math.min(progressRef.current, 88));
        }

        try {
          const res = await aiAPI.pollRetrainJob(id);
          const d = res.data.data;
          if (!d) return;

          if (d.status === "COMPLETED") {
            stopPolling();
            setProgress(100);
            setStatus("done");
            setStatusMsg(d.message);
            localStorage.removeItem("lumiere_retrain_jobId");
          } else if (d.status === "FAILED") {
            stopPolling();
            setStatus("failed");
            setStatusMsg(d.message);
            localStorage.removeItem("lumiere_retrain_jobId");
          }
          // PENDING / PROCESSING → keep going
        } catch {
          // Don't stop polling on transient network errors
        }
      }, 5_000);
    },
    [stopPolling]
  );

  // Resume polling if jobId is restored
  useEffect(() => {
    if (jobId && status === "running") {
      startPolling(jobId);
    }
    return stopPolling;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  async function triggerRetrain() {
    setStatus("running");
    setStatusMsg("Đang gửi yêu cầu huấn luyện lại...");
    setProgress(5);
    progressRef.current = 5;

    try {
      const res = await aiAPI.triggerRetrain();
      const d = res.data.data;

      if (!res.data.success || !d?.jobId) {
        setStatus("failed");
        setStatusMsg(res.data.message ?? "AI service không khả dụng");
        setProgress(0);
        return;
      }

      const id = d.jobId;
      setJobId(id);
      localStorage.setItem("lumiere_retrain_jobId", id);
      setStatusMsg(`Job ${id.substring(0, 8)}... đã được khởi động`);
      startPolling(id);
    } catch {
      setStatus("failed");
      setStatusMsg("Không thể kết nối backend.");
      setProgress(0);
    }
  }

  function reset() {
    stopPolling();
    setStatus("idle");
    setStatusMsg(null);
    setJobId(null);
    setProgress(0);
    progressRef.current = 0;
    localStorage.removeItem("lumiere_retrain_jobId");
  }

  return (
    <section className="ai-panel">
      <div className="ai-panel-header">
        <div>
          <h3 className="ai-panel-title">🤖 Cập nhật Mô hình AI (Retrain)</h3>
          <p className="ai-panel-subtitle">
            Huấn luyện lại toàn bộ mô hình từ lịch sử đơn hàng (LightGBM + FP-Growth). Quá trình mất 1–5 phút.
          </p>
        </div>
      </div>

      <div className="retrain-body">
        {/* Status section */}
        {status === "idle" && (
          <div className="retrain-idle">
            <div className="retrain-info-grid">
              <div className="retrain-info-item">
                <span className="retrain-info-icon">📊</span>
                <div>
                  <b>Demand Forecast</b>
                  <p>LightGBM — dự báo đơn hàng &amp; doanh thu</p>
                </div>
              </div>
              <div className="retrain-info-item">
                <span className="retrain-info-icon">🔗</span>
                <div>
                  <b>Combo Rules</b>
                  <p>FP-Growth — khám phá combo từ order history</p>
                </div>
              </div>
            </div>
            <button className="btn-primary retrain-btn" onClick={triggerRetrain}>
              🚀 Bắt đầu Retrain
            </button>
          </div>
        )}

        {status === "running" && (
          <div className="retrain-running">
            <div className="retrain-progress-wrap">
              <div className="retrain-progress-bar" style={{ width: `${progress.toFixed(0)}%` }} />
            </div>
            <div className="retrain-spinner-row">
              <span className="retrain-spinner" />
              <span className="retrain-run-label">
                {progress < 90 ? "Đang huấn luyện mô hình..." : "Hoàn thiện..."}
              </span>
            </div>
            {statusMsg && <p className="retrain-msg">{statusMsg}</p>}
            {jobId && <p className="retrain-jobid">Job ID: <code>{jobId}</code></p>}
            <p className="retrain-hint">
              Bạn có thể rời trang — hệ thống sẽ tự tiếp tục và khôi phục khi quay lại.
            </p>
          </div>
        )}

        {status === "done" && (
          <div className="retrain-done">
            <div className="retrain-done-icon">✅</div>
            <h4>Huấn luyện hoàn tất!</h4>
            <p>{statusMsg}</p>
            <button className="btn-secondary retrain-reset-btn" onClick={reset}>
              Retrain lại
            </button>
          </div>
        )}

        {status === "failed" && (
          <div className="retrain-failed">
            <div className="retrain-failed-icon">❌</div>
            <h4>Huấn luyện thất bại</h4>
            <p>{statusMsg}</p>
            <button className="btn-primary retrain-btn" onClick={reset}>
              Thử lại
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

// ─── Main AIScreen ─────────────────────────────────────────────────────────────
export function AIScreen() {
  const [tab, setTab] = useState<"forecast" | "combo" | "retrain">("forecast");

  return (
    <div className="screen">
      <header className="screen-header">
        <div>
          <h2>🤖 AI <span>Dashboard</span></h2>
          <p>Công cụ phân tích thông minh hỗ trợ vận hành nhà hàng</p>
        </div>
      </header>

      {/* Tab bar */}
      <div className="ai-tab-bar">
        {(["forecast", "combo", "retrain"] as const).map((t) => {
          const labels = {
            forecast: "📈 Dự báo nhu cầu",
            combo: "🔗 Khám phá Combo",
            retrain: "🤖 Retrain AI",
          };
          return (
            <button
              key={t}
              className={`ai-tab ${tab === t ? "ai-tab-active" : ""}`}
              onClick={() => setTab(t)}
            >
              {labels[t]}
            </button>
          );
        })}
      </div>

      {tab === "forecast" && <ForecastPanel />}
      {tab === "combo" && <ComboPanel />}
      {tab === "retrain" && <RetrainPanel />}
    </div>
  );
}

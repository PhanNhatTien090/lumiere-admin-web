import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useRef, useState } from "react";
import { aiAPI, publicMenuAPI } from "@/api/endpoints";
import { fmtDate, fmtDateShort } from "@/utils/format";
// ─── Helper ───────────────────────────────────────────────────────────────────
function fmtVnd(n) {
    return new Intl.NumberFormat("vi-VN").format(n) + "đ";
}
function ForecastChart({ predictions, metric }) {
    if (!predictions.length)
        return null;
    const W = 560;
    const H = 180;
    const PAD = { top: 20, right: 20, bottom: 36, left: metric === "revenue" ? 70 : 40 };
    const values = predictions.map((p) => p.value);
    const lowers = predictions.map((p) => p.lowerBound);
    const uppers = predictions.map((p) => p.upperBound);
    const allNums = [...values, ...lowers, ...uppers];
    const minV = Math.min(...allNums) * 0.95;
    const maxV = Math.max(...allNums) * 1.05;
    const xScale = (i) => PAD.left + (i / (predictions.length - 1)) * (W - PAD.left - PAD.right);
    const yScale = (v) => PAD.top + ((maxV - v) / (maxV - minV)) * (H - PAD.top - PAD.bottom);
    const linePath = predictions
        .map((p, i) => `${i === 0 ? "M" : "L"} ${xScale(i).toFixed(1)} ${yScale(p.value).toFixed(1)}`)
        .join(" ");
    const bandPath = predictions
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
    return (_jsxs("svg", { viewBox: `0 0 ${W} ${H}`, className: "w-full", style: { fontFamily: "inherit" }, children: [_jsx("path", { d: bandPath, fill: "rgba(196,154,43,0.12)" }), yTicks.map((v) => {
                const y = yScale(v);
                const label = metric === "revenue"
                    ? v >= 1000000
                        ? `${(v / 1000000).toFixed(1)}M`
                        : `${(v / 1000).toFixed(0)}K`
                    : Math.round(v).toString();
                return (_jsxs("g", { children: [_jsx("line", { x1: PAD.left, x2: W - PAD.right, y1: y, y2: y, stroke: "rgba(255,255,255,0.06)", strokeWidth: 1 }), _jsx("text", { x: PAD.left - 6, y: y + 4, textAnchor: "end", fontSize: 10, fill: "#6b7280", children: label })] }, v));
            }), _jsx("path", { d: linePath, fill: "none", stroke: "#c49a2b", strokeWidth: 2.5, strokeLinecap: "round", strokeLinejoin: "round" }), predictions.map((p, i) => {
                const cx = xScale(i);
                const cy = yScale(p.value);
                // Show date relative to today
                const date = new Date();
                date.setDate(date.getDate() + p.day);
                const label = fmtDateShort(date);
                return (_jsxs("g", { children: [_jsx("circle", { cx: cx, cy: cy, r: 4, fill: "#c49a2b" }), (predictions.length <= 14 || i % 2 === 0) && (_jsx("text", { x: cx, y: H - PAD.bottom + 14, textAnchor: "middle", fontSize: 9, fill: "#6b7280", children: label }))] }, p.day));
            })] }));
}
// ─── Demand Forecast Panel ────────────────────────────────────────────────────
function ForecastPanel() {
    const [metric, setMetric] = useState("orders");
    const [horizon, setHorizon] = useState(7);
    const [predictions, setPredictions] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    async function run() {
        setLoading(true);
        setError(null);
        try {
            const res = await aiAPI.forecast({ metric, horizonDays: horizon });
            const d = res.data.data;
            if (d?.success && d.predictions?.length) {
                setPredictions(d.predictions);
            }
            else {
                setError("AI forecast không khả dụng lúc này. Vui lòng thử lại sau.");
                setPredictions(null);
            }
        }
        catch {
            setError("Không thể kết nối đến backend. Kiểm tra server đang chạy.");
        }
        finally {
            setLoading(false);
        }
    }
    return (_jsxs("section", { className: "ai-panel", children: [_jsx("div", { className: "ai-panel-header", children: _jsxs("div", { children: [_jsx("h3", { className: "ai-panel-title", children: "\uD83D\uDCC8 D\u1EF1 b\u00E1o nhu c\u1EA7u (Demand Forecast)" }), _jsx("p", { className: "ai-panel-subtitle", children: "M\u00F4 h\u00ECnh LightGBM d\u1EF1 b\u00E1o s\u1ED1 \u0111\u01A1n h\u00E0ng ho\u1EB7c doanh thu theo ng\u00E0y" })] }) }), _jsxs("div", { className: "ai-controls", children: [_jsxs("label", { className: "ai-label", children: ["Ch\u1EC9 s\u1ED1", _jsxs("select", { className: "ai-select", value: metric, onChange: (e) => setMetric(e.target.value), children: [_jsx("option", { value: "orders", children: "S\u1ED1 \u0111\u01A1n h\u00E0ng" }), _jsx("option", { value: "revenue", children: "Doanh thu (VN\u0110)" })] })] }), _jsxs("label", { className: "ai-label", children: ["S\u1ED1 ng\u00E0y d\u1EF1 b\u00E1o", _jsx("input", { type: "number", className: "ai-input", min: 1, max: 30, value: horizon, onChange: (e) => setHorizon(Math.min(30, Math.max(1, Number(e.target.value)))) })] }), _jsx("button", { className: "btn-primary ai-run-btn", onClick: run, disabled: loading, children: loading ? "Đang phân tích..." : "Chạy dự báo" })] }), error && _jsx("div", { className: "alert-error", children: error }), predictions && (_jsxs("div", { className: "forecast-result", children: [_jsxs("div", { className: "forecast-chart-wrap", children: [_jsx(ForecastChart, { predictions: predictions, metric: metric }), _jsxs("p", { className: "forecast-legend", children: [_jsx("span", { className: "legend-band" }), "V\u00F9ng m\u00E0u = kho\u1EA3ng tin c\u1EADy (confidence interval)"] })] }), _jsx("div", { className: "forecast-table-wrap", children: _jsxs("table", { className: "forecast-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Ng\u00E0y" }), _jsx("th", { children: "D\u1EF1 b\u00E1o" }), _jsx("th", { children: "Th\u1EA5p nh\u1EA5t" }), _jsx("th", { children: "Cao nh\u1EA5t" })] }) }), _jsx("tbody", { children: predictions.slice(0, 10).map((p) => {
                                        const date = new Date();
                                        date.setDate(date.getDate() + p.day);
                                        const fmt = metric === "revenue"
                                            ? (v) => v == null ? "—" : fmtVnd(v)
                                            : (v) => v == null ? "—" : v.toLocaleString("vi-VN");
                                        return (_jsxs("tr", { children: [_jsx("td", { children: fmtDate(date) }), _jsx("td", { className: "fw-bold", children: fmt(p.value) }), _jsx("td", { className: "text-muted", children: fmt(p.lowerBound) }), _jsx("td", { className: "text-muted", children: fmt(p.upperBound) })] }, p.day));
                                    }) })] }) })] })), !predictions && !loading && !error && (_jsx("div", { className: "empty-state", children: _jsxs("p", { children: ["\uD83E\uDD16 Nh\u1EA5n ", _jsx("strong", { children: "\"Ch\u1EA1y d\u1EF1 b\u00E1o\"" }), " \u0111\u1EC3 AI ph\u00E2n t\u00EDch xu h\u01B0\u1EDBng."] }) }))] }));
}
// ─── Combo Discovery Panel ────────────────────────────────────────────────────
function ComboPanel() {
    const [analyzeDays, setAnalyzeDays] = useState(30);
    const [minSupport, setMinSupport] = useState(0.05);
    const [minConfidence, setMinConfidence] = useState(0.6);
    const [combos, setCombos] = useState(null);
    const [menuItems, setMenuItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    // Preload menu items for name lookup
    useEffect(() => {
        publicMenuAPI.listItems().then((res) => {
            if (res.data.success)
                setMenuItems(res.data.data);
        }).catch(() => { });
    }, []);
    function getItemName(id) {
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
            }
            else if (d?.success && d.draftCombos?.length === 0) {
                setCombos([]);
            }
            else {
                setError("AI không tìm được combo nào. Thử giảm minSupport hoặc minConfidence.");
                setCombos(null);
            }
        }
        catch {
            setError("Không thể kết nối backend hoặc AI service chưa sẵn sàng.");
        }
        finally {
            setLoading(false);
        }
    }
    return (_jsxs("section", { className: "ai-panel", children: [_jsx("div", { className: "ai-panel-header", children: _jsxs("div", { children: [_jsx("h3", { className: "ai-panel-title", children: "\uD83D\uDD17 Kh\u00E1m ph\u00E1 Combo (FP-Growth)" }), _jsx("p", { className: "ai-panel-subtitle", children: "Ph\u00E2n t\u00EDch l\u1ECBch s\u1EED \u0111\u01A1n h\u00E0ng \u0111\u1EC3 t\u00ECm c\u00E1c m\u00F3n th\u01B0\u1EDDng g\u1ECDi c\u00F9ng nhau" })] }) }), _jsxs("div", { className: "ai-controls", children: [_jsxs("label", { className: "ai-label", children: ["S\u1ED1 ng\u00E0y ph\u00E2n t\u00EDch", _jsx("input", { type: "number", className: "ai-input", min: 7, max: 365, value: analyzeDays, onChange: (e) => setAnalyzeDays(Number(e.target.value)) })] }), _jsxs("label", { className: "ai-label", children: ["Min Support (0\u20131)", _jsx("input", { type: "number", className: "ai-input", min: 0.01, max: 1, step: 0.01, value: minSupport, onChange: (e) => setMinSupport(Number(e.target.value)) })] }), _jsxs("label", { className: "ai-label", children: ["Min Confidence (0\u20131)", _jsx("input", { type: "number", className: "ai-input", min: 0.1, max: 1, step: 0.05, value: minConfidence, onChange: (e) => setMinConfidence(Number(e.target.value)) })] }), _jsx("button", { className: "btn-primary ai-run-btn", onClick: run, disabled: loading, children: loading ? "Đang phân tích..." : "Tìm Combo" })] }), error && _jsx("div", { className: "alert-error", children: error }), combos !== null && combos.length === 0 && (_jsx("div", { className: "empty-state", children: _jsxs("p", { children: ["Kh\u00F4ng t\u00ECm th\u1EA5y combo n\u00E0o v\u1EDBi tham s\u1ED1 hi\u1EC7n t\u1EA1i. Th\u1EED gi\u1EA3m ", _jsx("code", { children: "minSupport" }), " ho\u1EB7c ", _jsx("code", { children: "minConfidence" }), "."] }) })), combos && combos.length > 0 && (_jsx("div", { className: "combo-grid", children: combos.map((c, i) => (_jsxs("div", { className: "combo-card", children: [_jsxs("div", { className: "combo-badges", children: [_jsxs("span", { className: "combo-badge-conf", children: ["Confidence: ", (c.confidenceScore * 100).toFixed(0), "%"] }), _jsxs("span", { className: `combo-badge-lift ${c.liftScore > 1.3 ? "lift-high" : "lift-ok"}`, children: ["Lift: ", c.liftScore.toFixed(2), "x"] })] }), _jsx("div", { className: "combo-items", children: c.comboItems.map((id, j) => (_jsxs("span", { className: "combo-item-tag", children: [j > 0 && _jsx("span", { className: "combo-plus", children: "+" }), getItemName(id)] }, id))) }), _jsx("div", { className: "combo-lift-bar-wrap", children: _jsx("div", { className: "combo-lift-bar", style: { width: `${Math.min(100, (c.confidenceScore * 100))}%` } }) }), _jsx("p", { className: "combo-hint", children: c.liftScore > 1.3
                                ? "⚡ Tín hiệu co-purchase mạnh — nên tạo combo ngay"
                                : "✓ Có xu hướng gọi cùng nhau" })] }, i))) })), !combos && !loading && !error && (_jsx("div", { className: "empty-state", children: _jsxs("p", { children: ["\uD83D\uDD0D Nh\u1EA5n ", _jsx("strong", { children: "\"T\u00ECm Combo\"" }), " \u0111\u1EC3 AI ph\u00E2n t\u00EDch l\u1ECBch s\u1EED \u0111\u01A1n h\u00E0ng."] }) }))] }));
}
// ─── AI Retrain Panel ─────────────────────────────────────────────────────────
function RetrainPanel() {
    const [status, setStatus] = useState("idle");
    const [statusMsg, setStatusMsg] = useState(null);
    const [jobId, setJobId] = useState(null);
    const intervalRef = useRef(null);
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
    const startPolling = useCallback((id) => {
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
                if (!d)
                    return;
                if (d.status === "COMPLETED") {
                    stopPolling();
                    setProgress(100);
                    setStatus("done");
                    setStatusMsg(d.message);
                    localStorage.removeItem("lumiere_retrain_jobId");
                }
                else if (d.status === "FAILED") {
                    stopPolling();
                    setStatus("failed");
                    setStatusMsg(d.message);
                    localStorage.removeItem("lumiere_retrain_jobId");
                }
                // PENDING / PROCESSING → keep going
            }
            catch {
                // Don't stop polling on transient network errors
            }
        }, 5000);
    }, [stopPolling]);
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
        }
        catch {
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
    return (_jsxs("section", { className: "ai-panel", children: [_jsx("div", { className: "ai-panel-header", children: _jsxs("div", { children: [_jsx("h3", { className: "ai-panel-title", children: "\uD83E\uDD16 C\u1EADp nh\u1EADt M\u00F4 h\u00ECnh AI (Retrain)" }), _jsx("p", { className: "ai-panel-subtitle", children: "Hu\u1EA5n luy\u1EC7n l\u1EA1i to\u00E0n b\u1ED9 m\u00F4 h\u00ECnh t\u1EEB l\u1ECBch s\u1EED \u0111\u01A1n h\u00E0ng (LightGBM + FP-Growth). Qu\u00E1 tr\u00ECnh m\u1EA5t 1\u20135 ph\u00FAt." })] }) }), _jsxs("div", { className: "retrain-body", children: [status === "idle" && (_jsxs("div", { className: "retrain-idle", children: [_jsxs("div", { className: "retrain-info-grid", children: [_jsxs("div", { className: "retrain-info-item", children: [_jsx("span", { className: "retrain-info-icon", children: "\uD83D\uDCCA" }), _jsxs("div", { children: [_jsx("b", { children: "Demand Forecast" }), _jsx("p", { children: "LightGBM \u2014 d\u1EF1 b\u00E1o \u0111\u01A1n h\u00E0ng & doanh thu" })] })] }), _jsxs("div", { className: "retrain-info-item", children: [_jsx("span", { className: "retrain-info-icon", children: "\uD83D\uDD17" }), _jsxs("div", { children: [_jsx("b", { children: "Combo Rules" }), _jsx("p", { children: "FP-Growth \u2014 kh\u00E1m ph\u00E1 combo t\u1EEB order history" })] })] })] }), _jsx("button", { className: "btn-primary retrain-btn", onClick: triggerRetrain, children: "\uD83D\uDE80 B\u1EAFt \u0111\u1EA7u Retrain" })] })), status === "running" && (_jsxs("div", { className: "retrain-running", children: [_jsx("div", { className: "retrain-progress-wrap", children: _jsx("div", { className: "retrain-progress-bar", style: { width: `${progress.toFixed(0)}%` } }) }), _jsxs("div", { className: "retrain-spinner-row", children: [_jsx("span", { className: "retrain-spinner" }), _jsx("span", { className: "retrain-run-label", children: progress < 90 ? "Đang huấn luyện mô hình..." : "Hoàn thiện..." })] }), statusMsg && _jsx("p", { className: "retrain-msg", children: statusMsg }), jobId && _jsxs("p", { className: "retrain-jobid", children: ["Job ID: ", _jsx("code", { children: jobId })] }), _jsx("p", { className: "retrain-hint", children: "B\u1EA1n c\u00F3 th\u1EC3 r\u1EDDi trang \u2014 h\u1EC7 th\u1ED1ng s\u1EBD t\u1EF1 ti\u1EBFp t\u1EE5c v\u00E0 kh\u00F4i ph\u1EE5c khi quay l\u1EA1i." })] })), status === "done" && (_jsxs("div", { className: "retrain-done", children: [_jsx("div", { className: "retrain-done-icon", children: "\u2705" }), _jsx("h4", { children: "Hu\u1EA5n luy\u1EC7n ho\u00E0n t\u1EA5t!" }), _jsx("p", { children: statusMsg }), _jsx("button", { className: "btn-secondary retrain-reset-btn", onClick: reset, children: "Retrain l\u1EA1i" })] })), status === "failed" && (_jsxs("div", { className: "retrain-failed", children: [_jsx("div", { className: "retrain-failed-icon", children: "\u274C" }), _jsx("h4", { children: "Hu\u1EA5n luy\u1EC7n th\u1EA5t b\u1EA1i" }), _jsx("p", { children: statusMsg }), _jsx("button", { className: "btn-primary retrain-btn", onClick: reset, children: "Th\u1EED l\u1EA1i" })] }))] })] }));
}
// ─── Main AIScreen ─────────────────────────────────────────────────────────────
export function AIScreen() {
    const [tab, setTab] = useState("forecast");
    return (_jsxs("div", { className: "screen", children: [_jsx("header", { className: "screen-header", children: _jsxs("div", { children: [_jsxs("h2", { children: ["\uD83E\uDD16 AI ", _jsx("span", { children: "Dashboard" })] }), _jsx("p", { children: "C\u00F4ng c\u1EE5 ph\u00E2n t\u00EDch th\u00F4ng minh h\u1ED7 tr\u1EE3 v\u1EADn h\u00E0nh nh\u00E0 h\u00E0ng" })] }) }), _jsx("div", { className: "ai-tab-bar", children: ["forecast", "combo", "retrain"].map((t) => {
                    const labels = {
                        forecast: "📈 Dự báo nhu cầu",
                        combo: "🔗 Khám phá Combo",
                        retrain: "🤖 Retrain AI",
                    };
                    return (_jsx("button", { className: `ai-tab ${tab === t ? "ai-tab-active" : ""}`, onClick: () => setTab(t), children: labels[t] }, t));
                }) }), tab === "forecast" && _jsx(ForecastPanel, {}), tab === "combo" && _jsx(ComboPanel, {}), tab === "retrain" && _jsx(RetrainPanel, {})] }));
}

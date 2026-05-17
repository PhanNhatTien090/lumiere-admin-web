import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { analyticsAPI } from "@/api/endpoints";
import { fmtVnd, fmtVndCompact } from "@/utils/format";
// "1,2 tỷ" / "120 tr" / "12K" — dùng cho trục Y biểu đồ (rất hẹp)
function fmtAxis(n) {
    if (!Number.isFinite(n) || n === 0)
        return "0";
    const abs = Math.abs(n);
    if (abs >= 1000000000)
        return (n / 1000000000).toFixed(1).replace(".", ",") + "B";
    if (abs >= 1000000)
        return (n / 1000000).toFixed(0) + "M";
    if (abs >= 1000)
        return (n / 1000).toFixed(0) + "K";
    return Math.round(n).toString();
}
// viewMode là phạm vi user chọn trên UI; apiGroupBy nhỏ hơn 1 cấp để chia bucket:
//   DAY   → chỉ hôm nay, group theo DAY
//   WEEK  → 7 ngày gần nhất, group theo DAY
//   MONTH → 30 ngày gần nhất, group theo WEEK
//   YEAR  → 12 tháng gần nhất, group theo MONTH
function deriveQuery(viewMode) {
    const today = new Date();
    const toIso = today.toISOString().slice(0, 10);
    const config = {
        DAY: { daysBack: 0, apiGroupBy: "DAY" },
        WEEK: { daysBack: 6, apiGroupBy: "DAY" },
        MONTH: { daysBack: 29, apiGroupBy: "WEEK" },
        YEAR: { daysBack: 364, apiGroupBy: "MONTH" },
    };
    const { daysBack, apiGroupBy } = config[viewMode];
    const fromDate = new Date(today.getTime() - daysBack * 86400000);
    const fromIso = fromDate.toISOString().slice(0, 10);
    return { from: fromIso, to: toIso, apiGroupBy };
}
function PeriodChart({ periods }) {
    if (!periods.length)
        return null;
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
    const xScale = (i) => PAD.left + i * (innerW / periods.length) + barGap / 2;
    const yScale = (v) => PAD.top + ((maxV - v) / (maxV - minV)) * innerH;
    const ticks = 5;
    const yTicks = Array.from({ length: ticks }, (_, i) => minV + ((maxV - minV) * i) / (ticks - 1));
    const stepLabel = Math.max(1, Math.ceil(periods.length / 12));
    return (_jsxs("svg", { viewBox: `0 0 ${W} ${H}`, className: "w-full", style: { fontFamily: "inherit" }, children: [yTicks.map((v) => {
                const y = yScale(v);
                return (_jsxs("g", { children: [_jsx("line", { x1: PAD.left, x2: W - PAD.right, y1: y, y2: y, stroke: "rgba(255,255,255,0.06)" }), _jsx("text", { x: PAD.left - 6, y: y + 4, textAnchor: "end", fontSize: 10, fill: "#6b7280", children: fmtAxis(v) })] }, v));
            }), periods.map((p, i) => {
                const x = xScale(i);
                const yNet = yScale(p.netRevenue);
                const yGross = yScale(p.revenue);
                const hNet = Math.max(0, H - PAD.bottom - yNet);
                const hTax = Math.max(0, yNet - yGross);
                return (_jsxs("g", { children: [_jsxs("title", { children: [p.periodLabel, "\n", "NET: ", fmtVnd(p.netRevenue), "\n", "Tax: ", fmtVnd(p.taxAmount), "\n", "Gross: ", fmtVnd(p.revenue), "\n", "Orders: ", p.orderCount] }), _jsx("rect", { x: x, y: yNet, width: barW, height: hNet, fill: "#4ade80" }), _jsx("rect", { x: x, y: yGross, width: barW, height: hTax, fill: "#c49a2b" }), i % stepLabel === 0 && (_jsx("text", { x: x + barW / 2, y: H - PAD.bottom + 14, textAnchor: "middle", fontSize: 10, fill: "#9ca3af", children: p.periodLabel }))] }, p.periodLabel));
            }), _jsxs("g", { transform: `translate(${PAD.left}, ${H - 16})`, children: [_jsx("rect", { x: 0, y: -9, width: 10, height: 10, fill: "#4ade80" }), _jsx("text", { x: 14, y: 0, fontSize: 11, fill: "#9ca3af", children: "NET" }), _jsx("rect", { x: 50, y: -9, width: 10, height: 10, fill: "#c49a2b" }), _jsx("text", { x: 64, y: 0, fontSize: 11, fill: "#9ca3af", children: "Thu\u1EBF" })] })] }));
}
function TopItemsTable({ items }) {
    if (!items.length) {
        return _jsx("p", { className: "empty-state-mini", children: "Ch\u01B0a c\u00F3 d\u1EEF li\u1EC7u m\u00F3n b\u00E1n ch\u1EA1y trong kho\u1EA3ng th\u1EDDi gian n\u00E0y." });
    }
    const maxQty = Math.max(...items.map((i) => i.totalQuantity));
    return (_jsxs("table", { className: "data-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { style: { width: 40 }, children: "#" }), _jsx("th", { children: "T\u00EAn m\u00F3n" }), _jsx("th", { style: { textAlign: "right" }, children: "SL b\u00E1n" }), _jsx("th", { style: { textAlign: "right" }, children: "S\u1ED1 \u0111\u01A1n" }), _jsx("th", { style: { textAlign: "right" }, children: "Doanh thu (gross)" })] }) }), _jsx("tbody", { children: items.map((it, idx) => {
                    const pct = maxQty > 0 ? (it.totalQuantity / maxQty) * 100 : 0;
                    return (_jsxs("tr", { children: [_jsx("td", { children: idx + 1 }), _jsxs("td", { children: [_jsx("div", { style: { fontWeight: 500 }, children: it.menuItemName || `#${it.menuItemId}` }), _jsx("div", { className: "rate-bar-wrap", style: { marginTop: 4, height: 4 }, children: _jsx("div", { className: "rate-bar", style: { width: `${pct}%`, background: "#c49a2b" } }) })] }), _jsx("td", { style: { textAlign: "right" }, children: it.totalQuantity }), _jsx("td", { style: { textAlign: "right" }, children: it.orderCount }), _jsx("td", { style: { textAlign: "right" }, title: fmtVnd(it.totalRevenue), children: fmtVndCompact(it.totalRevenue) })] }, it.menuItemId));
                }) })] }));
}
export function RevenueScreen() {
    const initial = deriveQuery("DAY");
    const [from, setFrom] = useState(initial.from);
    const [to, setTo] = useState(initial.to);
    // viewMode là phạm vi user chọn (ngày/tuần/tháng/năm) — không phải groupBy gửi cho API
    const [viewMode, setViewMode] = useState("DAY");
    // Khi user tự sửa from/to thủ công thì không auto-set lại nữa
    const [manualDate, setManualDate] = useState(false);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const onViewModeChange = (next) => {
        setViewMode(next);
        if (!manualDate) {
            const q = deriveQuery(next);
            setFrom(q.from);
            setTo(q.to);
        }
    };
    const onFromChange = (value) => {
        setFrom(value);
        setManualDate(true);
    };
    const onToChange = (value) => {
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
            if (res.data.success)
                setData(res.data.data);
            else
                setError(res.data.message || "Lỗi tải dữ liệu");
        }
        catch (e) {
            if (!e.response) {
                setError("Không thể kết nối tới máy chủ.");
            }
            else if (e.response?.status === 500) {
                setError(`Lỗi máy chủ (500): ${e.response?.data?.message || "Internal Server Error"}`);
            }
            else {
                setError(e.response?.data?.message || "Không thể tải báo cáo doanh thu");
            }
        }
        finally {
            setLoading(false);
        }
    };
    // Auto-load doanh thu hôm nay khi mở trang (default viewMode = DAY)
    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return (_jsxs("div", { className: "screen", children: [_jsxs("header", { className: "screen-header", children: [_jsxs("div", { children: [_jsxs("h2", { children: ["B\u00E1o c\u00E1o Doanh thu ", _jsx("span", { children: "chi ti\u1EBFt" })] }), _jsx("p", { children: "Ph\u00E2n t\u00EDch doanh thu theo k\u1EF3 v\u00E0 top m\u00F3n b\u00E1n ch\u1EA1y" })] }), _jsxs("div", { className: "date-filter", children: [_jsxs("select", { value: viewMode, onChange: (e) => onViewModeChange(e.target.value), className: "select-input revenue-view-select", title: "\u0110\u1ED5i ph\u1EA1m vi s\u1EBD t\u1EF1 \u0111\u1EB7t kho\u1EA3ng ng\u00E0y ph\u00F9 h\u1EE3p", children: [_jsx("option", { value: "DAY", children: "Theo ng\u00E0y" }), _jsx("option", { value: "WEEK", children: "Theo tu\u1EA7n" }), _jsx("option", { value: "MONTH", children: "Theo th\u00E1ng" }), _jsx("option", { value: "YEAR", children: "Theo n\u0103m" })] }), _jsx("input", { type: "date", value: from, onChange: (e) => onFromChange(e.target.value) }), _jsx("span", { children: "\u2192" }), _jsx("input", { type: "date", value: to, onChange: (e) => onToChange(e.target.value) }), manualDate && (_jsx("button", { type: "button", className: "btn-small", onClick: resetDates, title: "\u0110\u1EB7t l\u1EA1i ng\u00E0y theo nh\u00F3m hi\u1EC7n t\u1EA1i", children: "\u21BA Auto" })), _jsx("button", { className: "btn-primary", onClick: load, disabled: loading, children: loading ? "Đang tải..." : "Xem báo cáo" })] })] }), error && _jsx("div", { className: "alert-error", children: error }), data && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "metrics-grid", children: [_jsxs("div", { className: "metric-card accent", children: [_jsx("div", { className: "metric-icon", children: "\uD83D\uDCB0" }), _jsxs("div", { children: [_jsx("p", { children: "T\u1ED5ng doanh thu (gross)" }), _jsx("b", { className: "metric-value", title: fmtVnd(data.totalRevenue), children: fmtVndCompact(data.totalRevenue) })] })] }), _jsxs("div", { className: "metric-card", children: [_jsx("div", { className: "metric-icon", children: "\uD83C\uDFE6" }), _jsxs("div", { children: [_jsx("p", { children: "Doanh thu thu\u1EA7n (NET)" }), _jsx("b", { className: "metric-value", title: fmtVnd(data.totalNetRevenue), children: fmtVndCompact(data.totalNetRevenue) })] })] }), _jsxs("div", { className: "metric-card", children: [_jsx("div", { className: "metric-icon", children: "\uD83E\uDDFE" }), _jsxs("div", { children: [_jsx("p", { children: "Thu\u1EBF \u0111\u00E3 thu" }), _jsx("b", { className: "metric-value", title: fmtVnd(data.totalTax), children: fmtVndCompact(data.totalTax) })] })] }), _jsxs("div", { className: "metric-card", children: [_jsx("div", { className: "metric-icon", children: "\uD83D\uDCCB" }), _jsxs("div", { children: [_jsx("p", { children: "T\u1ED5ng \u0111\u01A1n thanh to\u00E1n" }), _jsx("b", { className: "metric-value", children: data.totalOrders })] })] })] }), _jsx("div", { className: "stats-panels", children: _jsxs("div", { className: "stat-panel", style: { gridColumn: "span 2" }, children: [_jsxs("h4", { children: ["Doanh thu theo ", data.groupBy === "DAY" ? "ngày" : data.groupBy === "WEEK" ? "tuần" : data.groupBy === "MONTH" ? "tháng" : "năm"] }), data.periods.length > 0 ? (_jsx(PeriodChart, { periods: data.periods })) : (_jsx("p", { className: "empty-state-mini", children: "Ch\u01B0a c\u00F3 d\u1EEF li\u1EC7u doanh thu trong kho\u1EA3ng n\u00E0y." }))] }) }), _jsx("div", { className: "stats-panels", children: _jsxs("div", { className: "stat-panel", style: { gridColumn: "span 2" }, children: [_jsx("h4", { children: "Top 10 m\u00F3n b\u00E1n ch\u1EA1y" }), _jsx(TopItemsTable, { items: data.topItems })] }) })] })), !data && !loading && !error && (_jsx("div", { className: "empty-state", children: _jsxs("p", { children: ["\uD83D\uDCCA Ch\u1ECDn kho\u1EA3ng ng\u00E0y + group-by r\u1ED3i nh\u1EA5n ", _jsx("strong", { children: "\"Xem b\u00E1o c\u00E1o\"" }), " \u0111\u1EC3 t\u1EA3i chi ti\u1EBFt doanh thu."] }) }))] }));
}

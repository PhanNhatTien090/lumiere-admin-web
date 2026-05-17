import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { analyticsAPI } from "@/api/endpoints";
import { fmtVnd, fmtVndCompact, fmtCount as fmt, fmtDate, fmtDateTime } from "@/utils/format";
export function AnalyticsScreen() {
    const today = new Date().toISOString().slice(0, 10);
    const oneMonthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const [from, setFrom] = useState(oneMonthAgo);
    const [to, setTo] = useState(today);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await analyticsAPI.getSummary(from, to);
            if (res.data.success)
                setData(res.data.data);
            else
                setError(res.data.message || "Lỗi tải dữ liệu");
        }
        catch (e) {
            if (!e.response) {
                setError("Không thể kết nối tới máy chủ. Vui lòng thử lại sau.");
            }
            else if (e.response?.status === 500) {
                setError(`Lỗi máy chủ (500): ${e.response?.data?.message || "Internal Server Error"}`);
            }
            else {
                setError(e.response?.data?.message || "Không thể tải thống kê");
            }
        }
        finally {
            setLoading(false);
        }
    };
    // Auto-load với khoảng ngày mặc định (30 ngày gần nhất) khi mở trang
    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const successRate = data
        ? ((data.successfulPayments / (data.totalOrders || 1)) * 100).toFixed(1)
        : "0";
    const cancelRate = data
        ? ((data.cancelledOrders / (data.totalOrders || 1)) * 100).toFixed(1)
        : "0";
    return (_jsxs("div", { className: "screen", children: [_jsxs("header", { className: "screen-header", children: [_jsxs("div", { children: [_jsxs("h2", { children: ["Th\u1ED1ng k\u00EA & ", _jsx("span", { children: "Analytics" })] }), _jsx("p", { children: "B\u00E1o c\u00E1o doanh thu v\u00E0 v\u1EADn h\u00E0nh nh\u00E0 h\u00E0ng" })] }), _jsxs("div", { className: "date-filter", children: [_jsx("input", { type: "date", value: from, onChange: e => setFrom(e.target.value) }), _jsx("span", { children: "\u2192" }), _jsx("input", { type: "date", value: to, onChange: e => setTo(e.target.value) }), _jsx("button", { className: "btn-primary", onClick: load, disabled: loading, children: loading ? "Đang tải..." : "Xem báo cáo" })] })] }), error && _jsx("div", { className: "alert-error", children: error }), data && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "metrics-grid", children: [_jsxs("div", { className: "metric-card accent", children: [_jsx("div", { className: "metric-icon", children: "\uD83D\uDCB0" }), _jsxs("div", { children: [_jsx("p", { children: "T\u1ED5ng doanh thu (g\u1ED3m thu\u1EBF)" }), _jsx("b", { className: "metric-value", title: fmtVnd(data.totalRevenue), children: fmtVndCompact(data.totalRevenue) })] })] }), _jsxs("div", { className: "metric-card", children: [_jsx("div", { className: "metric-icon", children: "\uD83C\uDFE6" }), _jsxs("div", { children: [_jsx("p", { children: "Doanh thu thu\u1EA7n (NET)" }), _jsx("b", { className: "metric-value", title: fmtVnd(data.totalNetRevenue), children: fmtVndCompact(data.totalNetRevenue) })] })] }), _jsxs("div", { className: "metric-card", children: [_jsx("div", { className: "metric-icon", children: "\uD83E\uDDFE" }), _jsxs("div", { children: [_jsx("p", { children: "Thu\u1EBF \u0111\u00E3 thu" }), _jsx("b", { className: "metric-value", title: fmtVnd(data.totalTax), children: fmtVndCompact(data.totalTax) })] })] }), _jsxs("div", { className: "metric-card", children: [_jsx("div", { className: "metric-icon", children: "\uD83D\uDCCB" }), _jsxs("div", { children: [_jsx("p", { children: "T\u1ED5ng \u0111\u01A1n h\u00E0ng" }), _jsx("b", { className: "metric-value", children: fmt(data.totalOrders) })] })] }), _jsxs("div", { className: "metric-card", children: [_jsx("div", { className: "metric-icon", children: "\u2705" }), _jsxs("div", { children: [_jsx("p", { children: "\u0110\u01A1n x\u00E1c nh\u1EADn" }), _jsx("b", { className: "metric-value", children: fmt(data.confirmedOrders) })] })] }), _jsxs("div", { className: "metric-card", children: [_jsx("div", { className: "metric-icon", children: "\u274C" }), _jsxs("div", { children: [_jsx("p", { children: "\u0110\u01A1n h\u1EE7y" }), _jsx("b", { className: "metric-value", children: fmt(data.cancelledOrders) })] })] }), _jsxs("div", { className: "metric-card", children: [_jsx("div", { className: "metric-icon", children: "\uD83D\uDCB3" }), _jsxs("div", { children: [_jsx("p", { children: "Thanh to\u00E1n th\u00E0nh c\u00F4ng" }), _jsx("b", { className: "metric-value", children: fmt(data.successfulPayments) })] })] }), _jsxs("div", { className: "metric-card", children: [_jsx("div", { className: "metric-icon", children: "\u26A0\uFE0F" }), _jsxs("div", { children: [_jsx("p", { children: "Thanh to\u00E1n th\u1EA5t b\u1EA1i" }), _jsx("b", { className: "metric-value", children: fmt(data.failedPayments) })] })] })] }), _jsxs("div", { className: "stats-panels", children: [_jsxs("div", { className: "stat-panel", children: [_jsx("h4", { children: "T\u1EF7 l\u1EC7 th\u00E0nh c\u00F4ng" }), _jsx("div", { className: "rate-bar-wrap", children: _jsx("div", { className: "rate-bar", style: { width: `${successRate}%`, background: "#4ade80" } }) }), _jsxs("span", { className: "rate-label", children: [successRate, "% thanh to\u00E1n th\u00E0nh c\u00F4ng"] })] }), _jsxs("div", { className: "stat-panel", children: [_jsx("h4", { children: "T\u1EF7 l\u1EC7 h\u1EE7y \u0111\u01A1n" }), _jsx("div", { className: "rate-bar-wrap", children: _jsx("div", { className: "rate-bar", style: { width: `${cancelRate}%`, background: "#f87171" } }) }), _jsxs("span", { className: "rate-label", children: [cancelRate, "% \u0111\u01A1n b\u1ECB h\u1EE7y"] })] }), _jsxs("div", { className: "stat-panel", children: [_jsx("h4", { children: "Doanh thu trung b\u00ECnh / \u0111\u01A1n" }), _jsx("p", { className: "avg-value", title: data.confirmedOrders > 0
                                            ? fmtVnd(Math.round(data.totalRevenue / data.confirmedOrders))
                                            : "—", children: data.confirmedOrders > 0
                                            ? fmtVndCompact(Math.round(data.totalRevenue / data.confirmedOrders))
                                            : "—" })] }), _jsxs("div", { className: "stat-panel info-panel", children: [_jsx("h4", { children: "Th\u00F4ng tin b\u00E1o c\u00E1o" }), _jsx("table", { className: "info-table", children: _jsxs("tbody", { children: [_jsxs("tr", { children: [_jsx("td", { children: "T\u1EEB ng\u00E0y" }), _jsx("td", { children: fmtDate(data.fromDate) })] }), _jsxs("tr", { children: [_jsx("td", { children: "\u0110\u1EBFn ng\u00E0y" }), _jsx("td", { children: fmtDate(data.toDate) })] }), _jsxs("tr", { children: [_jsx("td", { children: "T\u1EA1o l\u00FAc" }), _jsx("td", { children: fmtDateTime(data.generatedAt) })] })] }) })] })] })] })), !data && !loading && !error && (_jsxs("div", { className: "empty-state", children: [_jsxs("p", { children: ["\uD83D\uDCCA Ch\u1ECDn kho\u1EA3ng ng\u00E0y v\u00E0 nh\u1EA5n ", _jsx("strong", { children: "\"Xem b\u00E1o c\u00E1o\"" }), " \u0111\u1EC3 t\u1EA3i th\u1ED1ng k\u00EA."] }), _jsxs("p", { style: { fontSize: "0.8rem", opacity: 0.6, marginTop: 8 }, children: ["Y\u00EAu c\u1EA7u backend ch\u1EA1y t\u1EA1i ", _jsx("code", { children: "localhost:8080" })] })] }))] }));
}

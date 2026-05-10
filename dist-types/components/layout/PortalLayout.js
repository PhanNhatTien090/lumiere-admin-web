import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback } from "react";
import { authAPI } from "@/api/endpoints";
import { useAdminStore } from "@/store/adminStore";
function LogoutIcon() {
    return (_jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true, style: { display: 'inline', marginRight: 7, verticalAlign: 'middle', flexShrink: 0 }, children: [_jsx("path", { d: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" }), _jsx("polyline", { points: "16 17 21 12 16 7" }), _jsx("line", { x1: "21", y1: "12", x2: "9", y2: "12" })] }));
}
export function PortalLayout({ subtitle, navItems, activeTab, onTabChange, children, onBeforeLogout }) {
    const { staff, logout } = useAdminStore();
    const handleLogout = useCallback(() => {
        if (onBeforeLogout && !onBeforeLogout())
            return;
        void (async () => {
            try {
                await authAPI.logout();
            }
            catch {
                /* still clear session locally */
            }
            logout();
        })();
    }, [logout, onBeforeLogout]);
    return (_jsxs("section", { className: "portal-layout", children: [_jsxs("aside", { className: "sidebar", children: [_jsxs("div", { children: [_jsxs("div", { className: "sidebar-brand", children: [_jsx("h1", { children: "LUMI\u00C8RE" }), _jsx("span", { className: "role-tag", children: subtitle }), _jsx("span", { className: "staff-name", children: staff?.name || staff?.fullName || staff?.username })] }), _jsx("nav", { children: navItems.map(item => (_jsxs("button", { className: activeTab === item.id ? "active" : "", onClick: () => onTabChange(item.id), children: [item.icon && (_jsx("span", { className: "nav-icon", "aria-hidden": "true", children: item.icon })), item.label] }, item.id))) })] }), _jsxs("button", { className: "logout-btn", onClick: handleLogout, children: [_jsx(LogoutIcon, {}), "\u0110\u0103ng xu\u1EA5t"] })] }), _jsx("article", { className: "portal-content", children: children })] }));
}

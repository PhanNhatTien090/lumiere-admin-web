import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { LoginScreen } from "./features/auth/LoginScreen";
import { CashierPortal } from "./features/cashier/CashierPortal";
import { AdminPortal } from "./features/admin/AdminPortal";
import { VNPayReturnPage } from "./features/cashier/VNPayReturnPage";
import { useAdminStore } from "./store/adminStore";
import { AUTH_EXPIRED_EVENT, ACCESS_DENIED_EVENT, clearAdminAuthSession } from "./api/client";
export default function App() {
    const { isAuthenticated, staff, hydrateAuth, logout } = useAdminStore();
    const [banner, setBanner] = useState(null);
    useEffect(() => {
        hydrateAuth();
    }, [hydrateAuth]);
    useEffect(() => {
        const handleAuthExpired = () => {
            clearAdminAuthSession();
            logout();
            setBanner({ message: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.", type: "warning" });
        };
        const handleAccessDenied = () => {
            setBanner({ message: "Bạn không có quyền truy cập chức năng này.", type: "error" });
            // Auto-dismiss after 5 seconds
            setTimeout(() => setBanner(null), 5000);
        };
        window.addEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
        window.addEventListener(ACCESS_DENIED_EVENT, handleAccessDenied);
        return () => {
            window.removeEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
            window.removeEventListener(ACCESS_DENIED_EVENT, handleAccessDenied);
        };
    }, [logout]);
    if (window.location.pathname === "/payment-return") {
        return _jsx(VNPayReturnPage, {});
    }
    return (_jsxs(_Fragment, { children: [banner && (_jsxs("div", { role: "alert", style: {
                    position: "fixed",
                    top: 0,
                    left: 0,
                    right: 0,
                    zIndex: 9999,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    padding: "12px 20px",
                    background: banner.type === "error" ? "#fee2e2" : "#fef3c7",
                    borderBottom: `1px solid ${banner.type === "error" ? "#fca5a5" : "#fde68a"}`,
                    color: banner.type === "error" ? "#dc2626" : "#92400e",
                    fontSize: 14,
                    fontWeight: 500,
                }, children: [_jsx("span", { children: banner.message }), _jsx("button", { onClick: () => setBanner(null), "aria-label": "\u0110\u00F3ng th\u00F4ng b\u00E1o", style: {
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                            fontSize: 18,
                            lineHeight: 1,
                            color: "inherit",
                            padding: "0 4px",
                            flexShrink: 0,
                        }, children: "\u00D7" })] })), _jsx("div", { className: "page", style: banner ? { paddingTop: 48 } : undefined, children: !isAuthenticated || !staff ? (_jsx(LoginScreen, {})) : staff.role === "CASHIER" ? (_jsx(CashierPortal, {})) : (_jsx(AdminPortal, {})) })] }));
}

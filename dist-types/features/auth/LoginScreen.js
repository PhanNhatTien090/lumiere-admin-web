import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { authAPI } from "@/api/endpoints";
import { useAdminStore } from "@/store/adminStore";
export function LoginScreen() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const setAuth = useAdminStore(state => state.setAuth);
    const handleLogin = async () => {
        if (!username || !password) {
            setError("Vui lòng nhập tài khoản và mật khẩu");
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const res = await authAPI.login({ username, password });
            const { accessToken, staff } = res.data.data;
            if (staff.role === "MANAGER" || staff.role === "CASHIER") {
                setAuth(accessToken, staff);
            }
            else {
                setError("Tài khoản không có quyền truy cập Admin/Cashier Portal");
            }
        }
        catch (err) {
            setError(err.response?.data?.message || "Đăng nhập thất bại. Kiểm tra lại thông tin.");
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsx("main", { className: "login-shell", children: _jsxs("section", { className: "login-card", children: [_jsxs("div", { className: "brand", children: [_jsx("div", { className: "brand-icon", children: "L" }), _jsx("h1", { children: "LUMI\u00C8RE" }), _jsx("p", { children: "MANAGEMENT PORTAL" }), _jsx("div", { className: "hero-image" }), _jsxs("div", { className: "brand-hint", children: [_jsx("p", { className: "hint-title", children: "Ch\u00E0o m\u1EEBng tr\u1EDF l\u1EA1i" }), _jsx("p", { className: "hint-item", children: "H\u1EC7 th\u1ED1ng qu\u1EA3n l\u00FD nh\u00E0 h\u00E0ng" }), _jsx("p", { className: "hint-item", children: "Lumi\u00E8re Restaurant" })] })] }), _jsxs("div", { className: "login-pane", children: [_jsx("h2", { children: "\u0110\u0103ng nh\u1EADp" }), _jsx("span", { children: "Vui l\u00F2ng \u0111\u0103ng nh\u1EADp \u0111\u1EC3 ti\u1EBFp t\u1EE5c" }), error && _jsx("div", { className: "login-error", children: error }), _jsx("input", { id: "login-username", placeholder: "T\u00EAn \u0111\u0103ng nh\u1EADp", value: username, onChange: (e) => setUsername(e.target.value), onKeyDown: (e) => e.key === 'Enter' && void handleLogin() }), _jsx("input", { id: "login-password", placeholder: "M\u1EADt kh\u1EA9u", type: "password", value: password, onChange: (e) => setPassword(e.target.value), onKeyDown: (e) => e.key === 'Enter' && void handleLogin() }), _jsx("button", { id: "login-submit", className: "primary-btn", onClick: () => void handleLogin(), disabled: loading, children: loading ? "Đang xử lý..." : "Đăng nhập" })] })] }) }));
}

import { useState } from "react";
import { authAPI } from "@/api/endpoints";
import { useAdminStore } from "@/store/adminStore";

export function LoginScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
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
      } else {
        setError("Tài khoản không có quyền truy cập Admin/Cashier Portal");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Đăng nhập thất bại. Kiểm tra lại thông tin.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-shell">
      <section className="login-card">
        <div className="brand">
          <div className="brand-icon">L</div>
          <h1>LUMIÈRE</h1>
          <p>MANAGEMENT PORTAL</p>
          <div className="hero-image" />
          <div className="brand-hint">
            <p className="hint-title">Tài khoản test</p>
            <p className="hint-item">👑 admin / password@</p>
            <p className="hint-item">💳 cashier01 / password@</p>
          </div>
        </div>
        <div className="login-pane">
          <h2>Đăng nhập</h2>
          <span>Vui lòng đăng nhập để tiếp tục</span>
          
          {error && <div className="login-error">{error}</div>}
          
          <input 
            id="login-username"
            placeholder="Tên đăng nhập" 
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void handleLogin()}
          />
          <input 
            id="login-password"
            placeholder="Mật khẩu" 
            type="password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void handleLogin()}
          />
          <button 
            id="login-submit"
            className="primary-btn" 
            onClick={() => void handleLogin()}
            disabled={loading}
          >
            {loading ? "Đang xử lý..." : "Đăng nhập"}
          </button>
        </div>
      </section>
    </main>
  );
}

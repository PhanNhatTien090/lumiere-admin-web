import { useEffect, useState } from "react";
import { LoginScreen } from "./features/auth/LoginScreen";
import { CashierPortal } from "./features/cashier/CashierPortal";
import { AdminPortal } from "./features/admin/AdminPortal";
import { VNPayReturnPage } from "./features/cashier/VNPayReturnPage";
import { useAdminStore } from "./store/adminStore";
import { AUTH_EXPIRED_EVENT, ACCESS_DENIED_EVENT, clearAdminAuthSession } from "./api/client";

type AppBanner = { message: string; type: "warning" | "error" } | null;

export default function App() {
  const { isAuthenticated, staff, hydrateAuth, logout } = useAdminStore();
  const [banner, setBanner] = useState<AppBanner>(null);

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
    return <VNPayReturnPage />;
  }

  return (
    <>
      {/* ── Global notification banner ───────────────────────── */}
      {banner && (
        <div
          role="alert"
          style={{
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
          }}
        >
          <span>{banner.message}</span>
          <button
            onClick={() => setBanner(null)}
            aria-label="Đóng thông báo"
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              fontSize: 18,
              lineHeight: 1,
              color: "inherit",
              padding: "0 4px",
              flexShrink: 0,
            }}
          >
            ×
          </button>
        </div>
      )}

      <div className="page" style={banner ? { paddingTop: 48 } : undefined}>
        {!isAuthenticated || !staff ? (
          <LoginScreen />
        ) : staff.role === "CASHIER" ? (
          <CashierPortal />
        ) : (
          <AdminPortal />
        )}
      </div>
    </>
  );
}

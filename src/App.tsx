import { useEffect, useState, lazy, Suspense } from "react";
import { notification } from "antd";
import { LoginScreen } from "./features/auth/LoginScreen";

const CashierPortal = lazy(() =>
  import("./features/cashier/CashierPortal").then((m) => ({
    default: m.CashierPortal,
  })),
);
const AdminPortal = lazy(() =>
  import("./features/admin/AdminPortal").then((m) => ({
    default: m.AdminPortal,
  })),
);
const VNPayReturnPage = lazy(() =>
  import("./features/cashier/VNPayReturnPage").then((m) => ({
    default: m.VNPayReturnPage,
  })),
);

function PortalFallback() {
  return (
    <div
      style={{
        minHeight: "60vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#6b7280",
        fontSize: 14,
      }}
    >
      Đang tải...
    </div>
  );
}
import { useAdminStore } from "./store/adminStore";
import { useLowStockStore } from "./store/lowStockStore";
import {
  useMenuAvailabilityStore,
  type AvailabilityTrigger,
  type MenuAvailabilityUpdate,
} from "./store/menuAvailabilityStore";
import { usePaymentRequestStore } from "./store/paymentRequestStore";
import type { PaymentRequestResponse } from "./types";
import { paymentRequestAPI } from "./api/endpoints";
import { AUTH_EXPIRED_EVENT, ACCESS_DENIED_EVENT, clearAdminAuthSession } from "./api/client";
import { createStompClient } from "./lib/websocket";

type AppBanner = { message: string; type: "warning" | "error" } | null;

interface LowStockAlertPayload {
  ingredientId: number;
  name: string;
  currentQty: number;
  threshold: number;
  unit: string;
}

interface MenuAvailabilityPayload {
  trigger: AvailabilityTrigger;
  ingredientId: number | null;
  ingredientName: string | null;
  updates: MenuAvailabilityUpdate[];
  timestamp: string;
}

const TRIGGER_LABELS: Record<AvailabilityTrigger, { icon: string; title: string }> = {
  INGREDIENT_ADJUSTED: { icon: "📉", title: "Tồn kho nguyên liệu thay đổi" },
  INGREDIENT_MANUAL_REPORT: { icon: "🛑", title: "Bếp báo hết nguyên liệu" },
  INGREDIENT_IMPORTED: { icon: "📥", title: "Nhập kho nguyên liệu" },
  MENU_ITEM_MARKED_UNAVAILABLE: { icon: "🚫", title: "Đã tắt món" },
  MENU_ITEM_MARKED_AVAILABLE: { icon: "✅", title: "Đã mở lại món" },
};

export default function App() {
  const { isAuthenticated, staff, hydrateAuth, logout } = useAdminStore();
  const pushLowStock = useLowStockStore((s) => s.push);
  const pushAvailability = useMenuAvailabilityStore((s) => s.push);
  const hydratePaymentRequests = usePaymentRequestStore((s) => s.hydrate);
  const applyPaymentRequest = usePaymentRequestStore((s) => s.apply);
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
      setTimeout(() => setBanner(null), 5000);
    };

    window.addEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
    window.addEventListener(ACCESS_DENIED_EVENT, handleAccessDenied);

    return () => {
      window.removeEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
      window.removeEventListener(ACCESS_DENIED_EVENT, handleAccessDenied);
    };
  }, [logout]);

  // Global STOMP subscription for MANAGER — low-stock toast + sidebar badge.
  useEffect(() => {
    if (!isAuthenticated || staff?.role !== "MANAGER") return;

    const client = createStompClient();
    client.onConnect = () => {
      client.subscribe("/topic/manager/low-stock", (frame) => {
        try {
          const payload = JSON.parse(frame.body) as LowStockAlertPayload;
          pushLowStock({
            ingredientId: payload.ingredientId,
            name: payload.name,
            currentQty: payload.currentQty,
            threshold: payload.threshold,
            unit: payload.unit,
            receivedAt: new Date().toISOString(),
          });
          notification.warning({
            message: "⚠️ Nguyên liệu sắp hết",
            description: `${payload.name} còn ${payload.currentQty} ${payload.unit} (ngưỡng ${payload.threshold})`,
            placement: "topRight",
            duration: 6,
          });
        } catch (err) {
          console.error("[low-stock] bad payload", err, frame.body);
        }
      });

      // Menu / inventory delta — feeds the live availability badges on the
      // Menu screen and the activity log on the Inventory screen.
      client.subscribe("/topic/menu/availability", (frame) => {
        try {
          const payload = JSON.parse(frame.body) as MenuAvailabilityPayload;
          pushAvailability({
            trigger: payload.trigger,
            ingredientId: payload.ingredientId,
            ingredientName: payload.ingredientName,
            updates: payload.updates || [],
            timestamp: payload.timestamp,
            receivedAt: new Date().toISOString(),
          });

          const meta = TRIGGER_LABELS[payload.trigger] ?? {
            icon: "🔔",
            title: "Cập nhật món/kho",
          };
          const affectedCount = payload.updates?.length ?? 0;
          const insufficientCount =
            payload.updates?.filter((u) => !u.ingredientSufficient).length ?? 0;

          let description = "";
          if (payload.ingredientName) {
            description = `Nguyên liệu: ${payload.ingredientName}`;
            if (affectedCount > 0) {
              description += ` · ${affectedCount} món liên quan`;
              if (
                payload.trigger === "INGREDIENT_ADJUSTED" ||
                payload.trigger === "INGREDIENT_MANUAL_REPORT"
              ) {
                description += ` (${insufficientCount} tạm hết)`;
              }
            }
          } else if (affectedCount > 0) {
            description = `${affectedCount} món bị ảnh hưởng`;
          }

          const isDecrease =
            payload.trigger === "INGREDIENT_ADJUSTED" ||
            payload.trigger === "INGREDIENT_MANUAL_REPORT" ||
            payload.trigger === "MENU_ITEM_MARKED_UNAVAILABLE";

          const notify = isDecrease ? notification.warning : notification.info;
          notify({
            message: `${meta.icon} ${meta.title}`,
            description: description || "Trạng thái món vừa thay đổi.",
            placement: "topRight",
            duration: 5,
          });
        } catch (err) {
          console.error("[menu-availability] bad payload", err, frame.body);
        }
      });
    };
    client.activate();
    return () => {
      void client.deactivate();
    };
  }, [isAuthenticated, staff?.role, pushLowStock, pushAvailability]);

  // CASHIER + MANAGER subscribe to /topic/cashier/payment-requests.
  // Hydrate the store with the current active queue on connect so badge + highlight
  // are correct even if the page is reloaded mid-shift.
  useEffect(() => {
    if (!isAuthenticated) return;
    if (staff?.role !== "CASHIER" && staff?.role !== "MANAGER") return;

    let cancelled = false;
    paymentRequestAPI
      .list(["REQUESTED", "ACKNOWLEDGED"])
      .then((res) => {
        if (!cancelled) hydratePaymentRequests(res.data.data || []);
      })
      .catch(() => { /* non-fatal — STOMP events will catch up */ });

    const client = createStompClient();
    client.onConnect = () => {
      client.subscribe("/topic/cashier/payment-requests", (frame) => {
        try {
          const payload = JSON.parse(frame.body) as {
            event: string;
            request: PaymentRequestResponse;
          };
          applyPaymentRequest(payload);

          if (payload.event === "CREATED") {
            notification.warning({
              message: "🛎️ Khách yêu cầu thanh toán",
              description:
                `Bàn ${payload.request.tableCode} · ` +
                (payload.request.preferredMethod === "CASH" ? "Tiền mặt" : "Chuyển khoản"),
              placement: "topRight",
              duration: 6,
            });
          }
        } catch (err) {
          console.error("[payment-request] bad payload", err, frame.body);
        }
      });
    };
    client.activate();
    return () => {
      cancelled = true;
      void client.deactivate();
    };
  }, [isAuthenticated, staff?.role, hydratePaymentRequests, applyPaymentRequest]);

  if (window.location.pathname === "/payment-return") {
    return (
      <Suspense fallback={<PortalFallback />}>
        <VNPayReturnPage />
      </Suspense>
    );
  }

  return (
    <>
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
        ) : (
          <Suspense fallback={<PortalFallback />}>
            {staff.role === "CASHIER" ? <CashierPortal /> : <AdminPortal />}
          </Suspense>
        )}
      </div>
    </>
  );
}

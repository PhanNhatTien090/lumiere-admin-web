import { useEffect, useRef, useState } from "react";
import { paymentAPI } from "@/api/endpoints";
import { fmtDateTime as fmtTime } from "@/utils/format";

type ReturnState = "checking" | "success" | "pending" | "failed";

function fmtVnd(n: number) {
  return new Intl.NumberFormat("vi-VN").format(n) + "đ";
}

export function VNPayReturnPage() {
  const [state, setState] = useState<ReturnState>("checking");
  const [amount, setAmount] = useState<number | null>(null);
  const [paidAt, setPaidAt] = useState<string | null>(null);
  const pollCount = useRef(0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const vnpResponseCode = params.get("vnp_ResponseCode");
    const orderIdStr = sessionStorage.getItem("vnpay_order_id");
    const orderId = orderIdStr ? parseInt(orderIdStr, 10) : NaN;

    // VNPay signals failure directly
    if (vnpResponseCode && vnpResponseCode !== "00") {
      setState("failed");
      return;
    }

    if (!orderId || isNaN(orderId)) {
      setState("pending");
      return;
    }

    const poll = async (): Promise<boolean> => {
      try {
        const res = await paymentAPI.getStatus(orderId);
        const s = res.data.data;
        if (s.status === "PAID" || s.status === "SUCCESS") {
          setAmount(s.amount ?? null);
          setPaidAt(s.paidAt ?? null);
          setState("success");
          sessionStorage.removeItem("vnpay_order_id");
          return true;
        } else if (s.status === "FAILED") {
          setState("failed");
          return true;
        }
      } catch { /* continue */ }
      return false;
    };

    const run = async () => {
      const done = await poll();
      if (done) return;

      const timer = setInterval(async () => {
        pollCount.current++;
        const done = await poll();
        if (done || pollCount.current >= 9) {
          clearInterval(timer);
          if (!done) setState("pending");
        }
      }, 3000);
    };

    void run();
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f9fafb",
        fontFamily: "inherit",
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          padding: "40px 32px",
          maxWidth: 440,
          width: "90%",
          textAlign: "center",
          boxShadow: "0 4px 24px rgba(0,0,0,0.1)",
        }}
      >
        {state === "checking" && (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
            <h2 style={{ margin: "0 0 8px", fontSize: 20 }}>Đang xác nhận giao dịch</h2>
            <p style={{ color: "#6b7280", marginBottom: 24 }}>Vui lòng chờ trong giây lát...</p>
          </>
        )}

        {state === "success" && (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <h2 style={{ margin: "0 0 8px", fontSize: 20, color: "#16a34a" }}>Thanh toán thành công!</h2>
            {amount != null && (
              <p style={{ fontSize: 22, fontWeight: 700, color: "#111827", margin: "8px 0" }}>
                {fmtVnd(amount)}
              </p>
            )}
            {paidAt && (
              <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 24 }}>
                Lúc {fmtTime(paidAt)}
              </p>
            )}
            {!paidAt && <div style={{ marginBottom: 24 }} />}
          </>
        )}

        {state === "pending" && (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🕐</div>
            <h2 style={{ margin: "0 0 8px", fontSize: 20 }}>Đang xử lý</h2>
            <p style={{ color: "#6b7280", marginBottom: 24 }}>
              Giao dịch đang được xác nhận. Vui lòng kiểm tra lại sau vài phút.
            </p>
          </>
        )}

        {state === "failed" && (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>❌</div>
            <h2 style={{ margin: "0 0 8px", fontSize: 20, color: "#dc2626" }}>Thanh toán thất bại</h2>
            <p style={{ color: "#6b7280", marginBottom: 24 }}>
              Giao dịch không thành công. Vui lòng thử lại.
            </p>
          </>
        )}

        <button
          onClick={() => { window.location.href = "/"; }}
          style={{
            background: "#1a1a1a",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "10px 24px",
            cursor: "pointer",
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          ← Về trang quản lý
        </button>
      </div>
    </div>
  );
}

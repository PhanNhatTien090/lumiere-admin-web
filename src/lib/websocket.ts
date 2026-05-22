/**
 * Admin Web STOMP client — shared across the app.
 *
 * Backend (WebSocketConfig.java): endpoint `/ws` (SockJS), broker `/topic`, permitAll.
 *
 * Topics consumed by admin web:
 *   /topic/manager/low-stock      — LowStockAlert when ingredient hits threshold
 *   /topic/menu/availability      — delta when stock or menu availability changes
 *   /topic/waiter/payment-success — payment success (Cashier portal can react if useful)
 */

import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";

function deriveDefaultWsUrl(): string {
  const apiBase = import.meta.env.VITE_API_BASE_URL;
  if (apiBase) {
    try {
      const origin = new URL(apiBase).origin;
      return `${origin}/api/v1/ws`;
    } catch {
      // Fall back below if env is malformed.
    }
  }
  return `${window.location.protocol}//localhost:8080/api/v1/ws`;
}

const WS_URL = import.meta.env.VITE_WS_URL ?? deriveDefaultWsUrl();

export function createStompClient(): Client {
  return new Client({
    webSocketFactory: () => new SockJS(WS_URL) as WebSocket,
    reconnectDelay: 5_000,
    heartbeatIncoming: 10_000,
    heartbeatOutgoing: 10_000,
    debug: (msg) => {
      if (import.meta.env.DEV) console.log("[STOMP]", msg);
    },
    onStompError: (frame) => {
      console.error("[STOMP] Error:", frame.headers["message"], frame.body);
    },
  });
}

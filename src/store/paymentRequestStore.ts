/**
 * Active customer payment requests (UC008).
 *
 * Populated by:
 *   1. Initial fetch on cashier portal mount (REST GET /payment-requests).
 *   2. STOMP `/topic/cashier/payment-requests` for live CREATED / status events.
 *
 * Keyed by `orderId` so the cashier UI can pick up a flag per order row.
 * unreadCount drives the tab badge; markAllRead clears when the cashier opens
 * the Hoá đơn chờ tab.
 */

import { create } from "zustand";
import type { PaymentRequestResponse } from "@/types";

interface PaymentRequestState {
  byOrderId: Record<number, PaymentRequestResponse>;
  unreadCount: number;
  /** Replace state with a fresh REST snapshot (active rows only). */
  hydrate: (rows: PaymentRequestResponse[]) => void;
  /** Apply a single event (CREATED / ACKNOWLEDGED / COMPLETED / CANCELLED). */
  apply: (event: { event: string; request: PaymentRequestResponse }) => void;
  markAllRead: () => void;
}

function isActive(r: PaymentRequestResponse): boolean {
  return r.status === "REQUESTED" || r.status === "ACKNOWLEDGED";
}

export const usePaymentRequestStore = create<PaymentRequestState>((set) => ({
  byOrderId: {},
  unreadCount: 0,

  hydrate: (rows) =>
    set(() => {
      const map: Record<number, PaymentRequestResponse> = {};
      rows.filter(isActive).forEach((r) => (map[r.orderId] = r));
      return { byOrderId: map };
    }),

  apply: ({ event, request }) =>
    set((state) => {
      const next = { ...state.byOrderId };
      if (isActive(request)) {
        const wasNew = !next[request.orderId] || next[request.orderId].status !== request.status;
        next[request.orderId] = request;
        const incrementBadge =
          event === "CREATED" || (wasNew && request.status === "REQUESTED");
        return {
          byOrderId: next,
          unreadCount: incrementBadge ? state.unreadCount + 1 : state.unreadCount,
        };
      }
      // COMPLETED / CANCELLED → drop from active map
      delete next[request.orderId];
      return { byOrderId: next, unreadCount: state.unreadCount };
    }),

  markAllRead: () => set({ unreadCount: 0 }),
}));

/**
 * Low-stock alerts feed (in-memory only).
 *
 * Populated by the global STOMP subscription in App.tsx — every event from
 * `/topic/manager/low-stock` is upserted by `ingredientId`. The sidebar reads
 * `unreadCount` for the badge; the InventoryScreen can render `alerts` directly.
 *
 * `markAllRead` is called when admin navigates to the Inventory tab.
 */

import { create } from "zustand";

export interface LowStockAlertItem {
  ingredientId: number;
  name: string;
  currentQty: number;
  threshold: number;
  unit: string;
  receivedAt: string;
}

interface LowStockState {
  alerts: Record<number, LowStockAlertItem>;
  unreadCount: number;
  push: (alert: LowStockAlertItem) => void;
  markAllRead: () => void;
  clearOne: (ingredientId: number) => void;
}

export const useLowStockStore = create<LowStockState>((set) => ({
  alerts: {},
  unreadCount: 0,
  push: (alert) =>
    set((state) => ({
      alerts: { ...state.alerts, [alert.ingredientId]: alert },
      unreadCount: state.unreadCount + 1,
    })),
  markAllRead: () => set({ unreadCount: 0 }),
  clearOne: (ingredientId) =>
    set((state) => {
      const next = { ...state.alerts };
      delete next[ingredientId];
      return { alerts: next };
    }),
}));

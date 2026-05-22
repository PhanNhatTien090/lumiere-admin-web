/**
 * Menu availability feed (in-memory only).
 *
 * Populated by the global STOMP subscription in App.tsx — every event from
 * `/topic/menu/availability`. Screens (MenuScreen, InventoryScreen) read
 * `lastEvent` / `pendingUpdates` to react in-place without refetching.
 */

import { create } from "zustand";

export type AvailabilityTrigger =
  | "INGREDIENT_ADJUSTED"
  | "INGREDIENT_MANUAL_REPORT"
  | "INGREDIENT_IMPORTED"
  | "MENU_ITEM_MARKED_UNAVAILABLE"
  | "MENU_ITEM_MARKED_AVAILABLE";

export interface MenuAvailabilityUpdate {
  menuItemId: number;
  available: boolean;
  ingredientSufficient: boolean;
}

export interface MenuAvailabilityEvent {
  trigger: AvailabilityTrigger;
  ingredientId: number | null;
  ingredientName: string | null;
  updates: MenuAvailabilityUpdate[];
  timestamp: string;
  receivedAt: string;
}

interface MenuAvailabilityState {
  /** Most-recent event — screens subscribe to this to re-render. */
  lastEvent: MenuAvailabilityEvent | null;
  /** Rolling history (max 20) — useful for an inventory activity log. */
  history: MenuAvailabilityEvent[];
  push: (evt: MenuAvailabilityEvent) => void;
  clear: () => void;
}

const HISTORY_LIMIT = 20;

export const useMenuAvailabilityStore = create<MenuAvailabilityState>((set) => ({
  lastEvent: null,
  history: [],
  push: (evt) =>
    set((state) => ({
      lastEvent: evt,
      history: [evt, ...state.history].slice(0, HISTORY_LIMIT),
    })),
  clear: () => set({ lastEvent: null, history: [] }),
}));

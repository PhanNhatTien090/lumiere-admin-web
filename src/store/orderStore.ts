import { create } from "zustand";
import { OrderResponse } from "@/types";

interface OrderStore {
  orders: OrderResponse[];
  loading: boolean;
  error: string | null;
  setOrders: (orders: OrderResponse[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useOrderStore = create<OrderStore>((set) => ({
  orders: [],
  loading: false,
  error: null,
  setOrders: (orders: OrderResponse[]) => set({ orders }),
  setLoading: (loading: boolean) => set({ loading }),
  setError: (error: string | null) => set({ error }),
}));

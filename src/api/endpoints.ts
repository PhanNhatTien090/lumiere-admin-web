import axiosInstance from "./client";
import {
  ApiResponse,
  LoginRequest,
  AuthResponse,
  OrderResponse,
  OrderStatus,
  CategoryResponse,
  CreateCategoryRequest,
  MenuItemResponse,
  CreateMenuItemRequest,
  TableResponse,
  CreateTableRequest,
  QrCodeResponse,
  Staff,
  CreateStaffRequest,
  UpdateStaffRequest,
  CreatePaymentRequest,
  PaymentResponse,
  PaymentStatusResponse,
  RefundRequest,
  AnalyticsSummary,
  RevenueDetailResponse,
  RevenueGroupBy,
  AdminMenuCategoryListItemResponse,
  CloseShiftResponse,
  InventoryItem,
  InventoryTransaction,
  SupportRequestResponse,
  CreateSupportRequest,
  AssignSupportRequestBody,
  UpdateSupportStatusBody,
  ShiftResponse,
  OpenShiftRequestBody,
  CloseShiftRequestBody,
  OrderInvoiceJson,
  ForecastRequest,
  ForecastResponse,
  ComboGenerateRequest,
  ComboGenerateResponse,
  RetrainJobResponse,
  RetrainJobStatusResponse,
} from "@/types";
import { v4 as uuidv4 } from "uuid";


// ─── Public Menu (no admin prefix — for listing) ────────────────────────────────
export const publicMenuAPI = {
  /** GET /menu/categories — public, returns categories with nested items */
  listCategories: () =>
    axiosInstance.get<ApiResponse<CategoryResponse[]>>("/menu/categories"),
  /** GET /menu — public, returns flat list of MenuItemResponse */
  listItems: () =>
    axiosInstance.get<ApiResponse<MenuItemResponse[]>>("/menu"),
};

// ─── Auth ───────────────────────────────────────────────────────────────────────
export const authAPI = {
  login: (credentials: LoginRequest) =>
    axiosInstance.post<ApiResponse<AuthResponse>>("/auth/login", credentials),
  logout: () => axiosInstance.post<ApiResponse<unknown>>("/auth/logout"),
};

// ─── Orders ─────────────────────────────────────────────────────────────────────
export const orderAPI = {
  listOrders: (status?: OrderStatus) =>
    axiosInstance.get<ApiResponse<OrderResponse[]>>("/orders", {
      params: status ? { status } : undefined,
    }),
  getOrder: (id: number) =>
    axiosInstance.get<ApiResponse<OrderResponse>>(`/orders/${id}`),
  getInvoiceJson: (id: number) =>
    axiosInstance.get<ApiResponse<OrderInvoiceJson>>(`/orders/${id}/invoice`),
  confirmOrder: (id: number) =>
    axiosInstance.put<ApiResponse<OrderResponse>>(`/orders/${id}/confirm`),
  cancelOrder: (id: number, reason: string) =>
    axiosInstance.put<ApiResponse<OrderResponse>>(`/orders/${id}/cancel`, { reason }),
  serveAll: (id: number) =>
    axiosInstance.put<ApiResponse<OrderResponse>>(`/orders/${id}/serve-all`),
};

// ─── Menu Categories (MANAGER) ──────────────────────────────────────────────────
export const categoryAPI = {
  list: () =>
    axiosInstance.get<ApiResponse<AdminMenuCategoryListItemResponse[]>>("/admin/menu/categories"),
  getOne: (id: number) =>
    axiosInstance.get<ApiResponse<CategoryResponse>>(`/admin/menu/categories/${id}`),
  create: (data: CreateCategoryRequest) =>
    axiosInstance.post<ApiResponse<CategoryResponse>>("/admin/menu/categories", data),
  update: (id: number, data: Partial<CreateCategoryRequest>) =>
    axiosInstance.put<ApiResponse<CategoryResponse>>(`/admin/menu/categories/${id}`, data),
  remove: (id: number) =>
    axiosInstance.delete<ApiResponse<void>>(`/admin/menu/categories/${id}`),
};

// ─── Menu Items (MANAGER) ───────────────────────────────────────────────────────
export const menuItemAPI = {
  /** GET /menu/items — requires categoryId (WAITER, MANAGER) */
  list: (categoryId: number) =>
    axiosInstance.get<ApiResponse<MenuItemResponse[]>>("/menu/items", { params: { categoryId } }),
  create: (data: CreateMenuItemRequest) =>
    axiosInstance.post<ApiResponse<MenuItemResponse>>("/admin/menu/items", data),
  update: (id: number, data: Partial<CreateMenuItemRequest>) =>
    axiosInstance.put<ApiResponse<MenuItemResponse>>(`/admin/menu/items/${id}`, data),
  remove: (id: number) =>
    axiosInstance.delete<ApiResponse<void>>(`/admin/menu/items/${id}`),
  uploadImage: (id: number, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return axiosInstance.put<ApiResponse<MenuItemResponse>>(`/menu/items/${id}/image`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};

// ─── Tables (MANAGER) ───────────────────────────────────────────────────────────
export const tableAPI = {
  list: () =>
    axiosInstance.get<ApiResponse<TableResponse[]>>("/tables"),
  create: (data: CreateTableRequest) =>
    axiosInstance.post<ApiResponse<TableResponse>>("/admin/tables", data),
  update: (tableCode: string, data: Partial<CreateTableRequest>) =>
    axiosInstance.put<ApiResponse<TableResponse>>(`/admin/tables/${tableCode}`, data),
  remove: (tableCode: string) =>
    axiosInstance.delete<ApiResponse<void>>(`/admin/tables/${tableCode}`),
  getQr: (tableCode: string) =>
    axiosInstance.get<ApiResponse<QrCodeResponse>>(`/tables/${tableCode}/qr-code`),
  rotateQr: (tableCode: string) =>
    axiosInstance.put<ApiResponse<QrCodeResponse>>(`/tables/${tableCode}/qr-code/rotate`),
};

// ─── Staff (MANAGER) ────────────────────────────────────────────────────────────
export const staffAPI = {
  list: () =>
    axiosInstance.get<ApiResponse<Staff[]>>("/staff"),
  create: (data: CreateStaffRequest) =>
    axiosInstance.post<ApiResponse<Staff>>("/staff", data),
  update: (id: number, data: UpdateStaffRequest) =>
    axiosInstance.put<ApiResponse<Staff>>(`/staff/${id}`, data),
  remove: (id: number) =>
    axiosInstance.delete<ApiResponse<void>>(`/staff/${id}`),
};

// ─── Inventory (MANAGER) ────────────────────────────────────────────────────────
export const inventoryAPI = {
  listItems: () =>
    axiosInstance.get<ApiResponse<InventoryItem[]>>("/admin/inventory/items"),
  /** Fallback: kitchen endpoint accessible to MANAGER+KITCHEN */
  listItemsKitchen: () =>
    axiosInstance.get<ApiResponse<InventoryItem[]>>("/kitchen/inventory/items"),
  createItem: (data: Partial<InventoryItem>) =>
    axiosInstance.post<ApiResponse<InventoryItem>>("/admin/inventory/items", data),
  updateItem: (id: number, data: Partial<InventoryItem>) =>
    axiosInstance.put<ApiResponse<InventoryItem>>(`/admin/inventory/items/${id}`, data),
  removeItem: (id: number) =>
    axiosInstance.delete<ApiResponse<void>>(`/admin/inventory/items/${id}`),
  listTransactions: () =>
    axiosInstance.get<ApiResponse<InventoryTransaction[]>>("/admin/inventory/transactions"),
  importStock: (data: { itemId: number; quantity: number; note?: string }) =>
    axiosInstance.post<ApiResponse<InventoryTransaction>>("/admin/inventory/transactions/import", data),
  exportStock: (data: { itemId: number; quantity: number; note?: string }) =>
    axiosInstance.post<ApiResponse<InventoryTransaction>>("/admin/inventory/transactions/export", data),
};

// ─── Payments (CASHIER + MANAGER) ───────────────────────────────────────────────
export const paymentAPI = {
  createPayment: (data: CreatePaymentRequest) => {
    const key = uuidv4();
    return axiosInstance.post<ApiResponse<PaymentResponse>>("/payments", data, {
      headers: { "X-Idempotency-Key": key },
    });
  },
  getStatus: (orderId: number) =>
    axiosInstance.get<ApiResponse<PaymentStatusResponse>>(`/payments/orders/${orderId}/status`),
  refundPayment: (paymentId: number, data: RefundRequest) => {
    const key = uuidv4();
    return axiosInstance.post<ApiResponse<PaymentResponse>>(
      `/payments/${paymentId}/refund`,
      data,
      { headers: { "X-Idempotency-Key": key } }
    );
  },
};

// ─── Analytics (MANAGER) ────────────────────────────────────────────────────────
export const analyticsAPI = {
  getSummary: (fromDate: string, toDate: string) =>
    axiosInstance.get<ApiResponse<AnalyticsSummary>>("/analytics/summary", {
      params: { fromDate, toDate },
    }),
  getRevenue: (params: { fromDate?: string; toDate?: string; groupBy?: RevenueGroupBy }) =>
    axiosInstance.get<ApiResponse<RevenueDetailResponse>>("/analytics/revenue", { params }),
};

// ─── Support — list/assign/status: WAITER, MANAGER; create/table/get: permitAll ──
export const supportAPI = {
  create: (data: CreateSupportRequest) =>
    axiosInstance.post<ApiResponse<SupportRequestResponse>>("/support", data),
  listByTable: (tableCode: string) =>
    axiosInstance.get<ApiResponse<SupportRequestResponse[]>>(
      `/support/table/${encodeURIComponent(tableCode)}`
    ),
  listAll: () => axiosInstance.get<ApiResponse<SupportRequestResponse[]>>("/support"),
  getOne: (id: number) =>
    axiosInstance.get<ApiResponse<SupportRequestResponse>>(`/support/${id}`),
  assign: (id: number, data: AssignSupportRequestBody) =>
    axiosInstance.put<ApiResponse<SupportRequestResponse>>(`/support/${id}/assign`, data),
  updateStatus: (id: number, data: UpdateSupportStatusBody) =>
    axiosInstance.put<ApiResponse<SupportRequestResponse>>(`/support/${id}/status`, data),
};

// ─── Cashier shifts (CASHIER, MANAGER) / list all MANAGER ─────────────────────
// NOTE: shift endpoints return raw objects (no ApiResponse wrapper)
export const shiftAPI = {
  open: (data: OpenShiftRequestBody) =>
    axiosInstance.post<ShiftResponse>("/shifts/open", data),
  close: (id: number, data: CloseShiftRequestBody) =>
    axiosInstance.post<CloseShiftResponse>(`/shifts/${id}/close`, data),
  current: () =>
    axiosInstance.get<ShiftResponse>("/shifts/current"),
  listAll: () => axiosInstance.get<ApiResponse<ShiftResponse[]>>("/shifts"),
};

// ─── AI Features (MANAGER) ──────────────────────────────────────────────────────
export const aiAPI = {
  /** POST /analytics/forecast — predict order count or revenue */
  forecast: (data: ForecastRequest) =>
    axiosInstance.post<ApiResponse<ForecastResponse>>("/analytics/forecast", data),

  /** POST /admin/menu/items/combo-generate — FP-Growth combo discovery */
  generateCombos: (data: ComboGenerateRequest) =>
    axiosInstance.post<ApiResponse<ComboGenerateResponse>>("/admin/menu/items/combo-generate", data),

  /** POST /admin/ai/retrain — trigger background retraining job */
  triggerRetrain: () =>
    axiosInstance.post<ApiResponse<RetrainJobResponse>>("/admin/ai/retrain"),

  /** GET /admin/ai/jobs/{jobId} — poll retrain job status */
  pollRetrainJob: (jobId: string) =>
    axiosInstance.get<ApiResponse<RetrainJobStatusResponse>>(`/admin/ai/jobs/${jobId}`),
};


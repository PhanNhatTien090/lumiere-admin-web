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
  listItems: () => axiosInstance.get<ApiResponse<MenuItemResponse[]>>("/menu"),
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
  /** Paginated listing — used by Cashier "Lịch sử" screen. */
  listOrdersPaged: (params: {
    status?: OrderStatus;
    page?: number;
    size?: number;
  }) =>
    axiosInstance.get<
      ApiResponse<{
        content: OrderResponse[];
        page: number;
        size: number;
        totalElements: number;
        totalPages: number;
      }>
    >("/orders/paged", {
      params: {
        status: params.status,
        page: params.page ?? 0,
        size: params.size ?? 20,
      },
    }),
  getOrder: (id: number) =>
    axiosInstance.get<ApiResponse<OrderResponse>>(`/orders/${id}`),
  getInvoiceJson: (id: number) =>
    axiosInstance.get<ApiResponse<OrderInvoiceJson>>(`/orders/${id}/invoice`),
  confirmOrder: (id: number) =>
    axiosInstance.put<ApiResponse<OrderResponse>>(`/orders/${id}/confirm`),
  cancelOrder: (id: number, reason: string) =>
    axiosInstance.put<ApiResponse<OrderResponse>>(`/orders/${id}/cancel`, {
      reason,
    }),
  serveAll: (id: number) =>
    axiosInstance.put<ApiResponse<OrderResponse>>(`/orders/${id}/serve-all`),
};

// ─── Menu Categories (MANAGER) ──────────────────────────────────────────────────
export const categoryAPI = {
  list: () =>
    axiosInstance.get<ApiResponse<AdminMenuCategoryListItemResponse[]>>(
      "/admin/menu/categories",
    ),
  getOne: (id: number) =>
    axiosInstance.get<ApiResponse<CategoryResponse>>(
      `/admin/menu/categories/${id}`,
    ),
  create: (data: CreateCategoryRequest) =>
    axiosInstance.post<ApiResponse<CategoryResponse>>(
      "/admin/menu/categories",
      data,
    ),
  update: (id: number, data: Partial<CreateCategoryRequest>) =>
    axiosInstance.put<ApiResponse<CategoryResponse>>(
      `/admin/menu/categories/${id}`,
      data,
    ),
  remove: (id: number) =>
    axiosInstance.delete<ApiResponse<void>>(`/admin/menu/categories/${id}`),
};

// ─── Menu Items (MANAGER) ───────────────────────────────────────────────────────
export const menuItemAPI = {
  /** GET /menu/items — requires categoryId (WAITER, MANAGER) */
  list: (categoryId: number) =>
    axiosInstance.get<ApiResponse<MenuItemResponse[]>>("/menu/items", {
      params: { categoryId },
    }),
  create: (data: CreateMenuItemRequest) =>
    axiosInstance.post<ApiResponse<MenuItemResponse>>(
      "/admin/menu/items",
      data,
    ),
  update: (id: number, data: Partial<CreateMenuItemRequest>) =>
    axiosInstance.put<ApiResponse<MenuItemResponse>>(
      `/admin/menu/items/${id}`,
      data,
    ),
  remove: (id: number) =>
    axiosInstance.delete<ApiResponse<void>>(`/admin/menu/items/${id}`),
  uploadImage: (id: number, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return axiosInstance.put<ApiResponse<MenuItemResponse>>(
      `/menu/items/${id}/image`,
      form,
      {
        headers: { "Content-Type": "multipart/form-data" },
      },
    );
  },
};

// ─── Tables (MANAGER) ───────────────────────────────────────────────────────────
export const tableAPI = {
  list: () => axiosInstance.get<ApiResponse<TableResponse[]>>("/tables"),
  create: (data: CreateTableRequest) =>
    axiosInstance.post<ApiResponse<TableResponse>>("/admin/tables", data),
  update: (tableCode: string, data: Partial<CreateTableRequest>) =>
    axiosInstance.put<ApiResponse<TableResponse>>(
      `/admin/tables/${tableCode}`,
      data,
    ),
  remove: (tableCode: string) =>
    axiosInstance.delete<ApiResponse<void>>(`/admin/tables/${tableCode}`),
  getQr: (tableCode: string) =>
    axiosInstance.get<ApiResponse<QrCodeResponse>>(
      `/tables/${tableCode}/qr-code`,
    ),
  rotateQr: (tableCode: string) =>
    axiosInstance.put<ApiResponse<QrCodeResponse>>(
      `/tables/${tableCode}/qr-code/rotate`,
    ),
};

// ─── Staff (MANAGER) ────────────────────────────────────────────────────────────
export const staffAPI = {
  list: () => axiosInstance.get<ApiResponse<Staff[]>>("/staff"),
  create: (data: CreateStaffRequest) =>
    axiosInstance.post<ApiResponse<Staff>>("/staff", data),
  update: (id: number, data: UpdateStaffRequest) =>
    axiosInstance.put<ApiResponse<Staff>>(`/staff/${id}`, data),
  remove: (id: number) =>
    axiosInstance.delete<ApiResponse<void>>(`/staff/${id}`),
};

// ─── Inventory (MANAGER) ────────────────────────────────────────────────────────
type IngredientUnit = "G" | "ML" | "UNIT";

type IngredientResponseDto = {
  id: number;
  name: string;
  unit: IngredientUnit;
  currentQty: number;
  lowStockThreshold: number;
  lowStock: boolean;
};

type StockTransactionResponseDto = {
  id: number;
  txnType: "IMPORT" | "ADJUSTMENT" | "MANUAL_REPORT";
  quantityChange: number;
  note?: string;
  createdAt: string;
};

const mapUnitToBackend = (unit?: string): IngredientUnit => {
  const normalized = (unit || "").trim().toUpperCase();
  if (normalized === "ML") return "ML";
  if (normalized === "UNIT") return "UNIT";
  return "G";
};

const mapIngredientToUi = (dto: IngredientResponseDto): InventoryItem => ({
  id: dto.id,
  name: dto.name,
  unit: dto.unit,
  currentStock: Number(dto.currentQty ?? 0),
  minStock: Number(dto.lowStockThreshold ?? 0),
});

const mapStockTxnToUi = (
  dto: StockTransactionResponseDto,
  itemId: number,
  itemName: string,
): InventoryTransaction => ({
  id: dto.id,
  itemId,
  itemName,
  type:
    dto.txnType === "IMPORT"
      ? "IMPORT"
      : Number(dto.quantityChange ?? 0) < 0
        ? "EXPORT"
        : "ADJUST",
  quantity: Math.abs(Number(dto.quantityChange ?? 0)),
  note: dto.note,
  createdAt: dto.createdAt,
});

export const inventoryAPI = {
  listItems: () =>
    axiosInstance
      .get<ApiResponse<IngredientResponseDto[]>>("/admin/inventory/ingredients")
      .then((res) => ({
        ...res,
        data: {
          ...res.data,
          data: (res.data.data || []).map(mapIngredientToUi),
        },
      })),
  /** Fallback: kitchen endpoint accessible to MANAGER+KITCHEN */
  listItemsKitchen: () =>
    axiosInstance
      .get<ApiResponse<IngredientResponseDto[]>>("/kitchen/inventory")
      .then((res) => ({
        ...res,
        data: {
          ...res.data,
          data: (res.data.data || []).map(mapIngredientToUi),
        },
      })),
  createItem: (data: Partial<InventoryItem>) =>
    axiosInstance
      .post<ApiResponse<IngredientResponseDto>>(
        "/admin/inventory/ingredients",
        {
          name: data.name,
          unit: mapUnitToBackend(data.unit),
          lowStockThreshold: Number(data.minStock ?? 0),
        },
      )
      .then((res) => ({
        ...res,
        data: { ...res.data, data: mapIngredientToUi(res.data.data) },
      })),
  updateItem: (id: number, data: Partial<InventoryItem>) =>
    axiosInstance
      .put<ApiResponse<IngredientResponseDto>>(
        `/admin/inventory/ingredients/${id}`,
        {
          name: data.name,
          unit: mapUnitToBackend(data.unit),
          lowStockThreshold: Number(data.minStock ?? 0),
        },
      )
      .then((res) => ({
        ...res,
        data: { ...res.data, data: mapIngredientToUi(res.data.data) },
      })),
  removeItem: (id: number) =>
    axiosInstance.delete<ApiResponse<void>>(
      `/admin/inventory/ingredients/${id}`,
    ),
  listTransactions: async () => {
    const itemsRes = await inventoryAPI.listItems();
    const items = itemsRes.data.data || [];
    const historyResponses = await Promise.all(
      items.map((item) =>
        axiosInstance
          .get<ApiResponse<StockTransactionResponseDto[]>>(
            `/admin/inventory/stock/${item.id}/history`,
          )
          .then((res) => ({ item, history: res.data.data || [] }))
          .catch(() => ({ item, history: [] })),
      ),
    );

    const transactions = historyResponses
      .flatMap(({ item, history }) =>
        history.map((tx) => mapStockTxnToUi(tx, item.id, item.name)),
      )
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

    return {
      data: {
        success: true,
        data: transactions,
      },
    };
  },
  importStock: (data: { itemId: number; quantity: number; note?: string }) =>
    axiosInstance.post<ApiResponse<IngredientResponseDto>>(
      "/admin/inventory/stock/import",
      {
        ingredientId: data.itemId,
        quantity: data.quantity,
        note: data.note,
      },
    ),
  exportStock: async (data: {
    itemId: number;
    quantity: number;
    note?: string;
  }) => {
    const itemRes = await axiosInstance.get<ApiResponse<IngredientResponseDto>>(
      `/admin/inventory/ingredients/${data.itemId}`,
    );
    const currentQty = Number(itemRes.data.data.currentQty ?? 0);
    const nextQty = currentQty - data.quantity;

    if (nextQty < 0) {
      throw {
        response: {
          data: { message: "Số lượng xuất vượt quá tồn kho hiện tại" },
        },
      };
    }

    return axiosInstance.put<ApiResponse<IngredientResponseDto>>(
      `/kitchen/inventory/${data.itemId}/adjust`,
      {
        newQuantity: nextQty,
        note: data.note,
      },
    );
  },
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
    axiosInstance.get<ApiResponse<PaymentStatusResponse>>(
      `/payments/orders/${orderId}/status`,
    ),
  refundPayment: (paymentId: number, data: RefundRequest) => {
    const key = uuidv4();
    return axiosInstance.post<ApiResponse<PaymentResponse>>(
      `/payments/${paymentId}/refund`,
      data,
      { headers: { "X-Idempotency-Key": key } },
    );
  },
};

// ─── Analytics (MANAGER) ────────────────────────────────────────────────────────
export const analyticsAPI = {
  getSummary: (fromDate: string, toDate: string) =>
    axiosInstance.get<ApiResponse<AnalyticsSummary>>("/analytics/summary", {
      params: { fromDate, toDate },
    }),
  getRevenue: (params: {
    fromDate?: string;
    toDate?: string;
    groupBy?: RevenueGroupBy;
  }) =>
    axiosInstance.get<ApiResponse<RevenueDetailResponse>>(
      "/analytics/revenue",
      { params },
    ),
};

// ─── Support — list/assign/status: WAITER, MANAGER; create/table/get: permitAll ──
export const supportAPI = {
  create: (data: CreateSupportRequest) =>
    axiosInstance.post<ApiResponse<SupportRequestResponse>>("/support", data),
  listByTable: (tableCode: string) =>
    axiosInstance.get<ApiResponse<SupportRequestResponse[]>>(
      `/support/table/${encodeURIComponent(tableCode)}`,
    ),
  listAll: () =>
    axiosInstance.get<ApiResponse<SupportRequestResponse[]>>("/support"),
  getOne: (id: number) =>
    axiosInstance.get<ApiResponse<SupportRequestResponse>>(`/support/${id}`),
  assign: (id: number, data: AssignSupportRequestBody) =>
    axiosInstance.put<ApiResponse<SupportRequestResponse>>(
      `/support/${id}/assign`,
      data,
    ),
  updateStatus: (id: number, data: UpdateSupportStatusBody) =>
    axiosInstance.put<ApiResponse<SupportRequestResponse>>(
      `/support/${id}/status`,
      data,
    ),
};

// ─── Cashier shifts (CASHIER, MANAGER) / list all MANAGER ─────────────────────
// NOTE: shift endpoints return raw objects (no ApiResponse wrapper)
export const shiftAPI = {
  open: (data: OpenShiftRequestBody) =>
    axiosInstance.post<ShiftResponse>("/shifts/open", data),
  close: (id: number, data: CloseShiftRequestBody) =>
    axiosInstance.post<CloseShiftResponse>(`/shifts/${id}/close`, data),
  current: () => axiosInstance.get<ShiftResponse>("/shifts/current"),
  listAll: () => axiosInstance.get<ApiResponse<ShiftResponse[]>>("/shifts"),
};

// ─── AI Features (MANAGER) ──────────────────────────────────────────────────────
type ForecastPredictionRaw = {
  day: number;
  value: number;
  lower_bound?: number;
  upper_bound?: number;
  lowerBound?: number;
  upperBound?: number;
};

type ForecastResponseRaw = {
  success: boolean;
  metric: "orders" | "revenue";
  predictions: ForecastPredictionRaw[];
};

const mapForecastPrediction = (p: ForecastPredictionRaw) => ({
  day: p.day,
  value: Number(p.value ?? 0),
  lowerBound: Number(p.lowerBound ?? p.lower_bound ?? 0),
  upperBound: Number(p.upperBound ?? p.upper_bound ?? 0),
});

export const aiAPI = {
  /** POST /analytics/forecast — predict order count or revenue */
  forecast: (data: ForecastRequest) =>
    axiosInstance
      .post<ApiResponse<ForecastResponseRaw>>("/analytics/forecast", data)
      .then((res) => ({
        ...res,
        data: {
          ...res.data,
          data: {
            ...res.data.data,
            predictions: (res.data.data?.predictions || []).map(
              mapForecastPrediction,
            ),
          },
        },
      })),

  /** POST /admin/menu/items/combo-generate — FP-Growth combo discovery */
  generateCombos: (data: ComboGenerateRequest) =>
    axiosInstance
      .post<ApiResponse<any>>("/admin/menu/items/combo-generate", data)
      .then((res) => ({
        ...res,
        data: {
          ...res.data,
          data: {
            ...res.data.data,
            draftCombos: (res.data.data?.draft_combos || []).map((c: any) => ({
              comboItems: c.combo_items,
              confidenceScore: c.confidence_score,
              liftScore: c.lift_score,
            })),
          },
        },
      })),

  /** POST /admin/ai/retrain — trigger background retraining job */
  triggerRetrain: () =>
    axiosInstance.post<ApiResponse<RetrainJobResponse>>("/admin/ai/retrain"),

  /** GET /admin/ai/jobs/{jobId} — poll retrain job status */
  pollRetrainJob: (jobId: string) =>
    axiosInstance.get<ApiResponse<RetrainJobStatusResponse>>(
      `/admin/ai/jobs/${jobId}`,
    ),
};

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
  ChangePasswordRequest,
  KitchenSlaStats,
  ExpiringLot,
  CreatePaymentRequest,
  CreateGroupPaymentRequest,
  GroupBillResponse,
  PaymentResponse,
  PaymentRequestResponse,
  PaymentStatusResponse,
  RefundRequest,
  RefundResponse,
  AnalyticsSummary,
  RevenueDetailResponse,
  RevenueGroupBy,
  ManagerMenuCategoryListItemResponse,
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
  ShiftSummaryResponse,
  OrderInvoiceJson,
  ForecastRequest,
  ForecastResponse,
  ComboGenerateRequest,
  ComboGenerateResponse,
  RetrainJobResponse,
  RetrainJobStatusResponse,
  TaxConfigResponse,
  TaxConfigUpdateRequest,
  MenuItemPricingPreviewResponse,
  RecipeItem,
  UpsertRecipeRequest,
} from "@/types";
import { v4 as uuidv4 } from "uuid";

// ─── Public Menu (no admin prefix — for listing) ────────────────────────────────
export const publicMenuAPI = {
  /** GET /menu/categories — public, returns categories with nested items */
  listCategories: () =>
    axiosInstance.get<ApiResponse<CategoryResponse[]>>("/menu/categories"),
  /**
   * GET /menu — backend returns categories with nested items; we flatten so
   * callers get a `MenuItemResponse[]` keyed by menuItemId (not categoryId).
   */
  listItems: async () => {
    const res = await axiosInstance.get<ApiResponse<CategoryResponse[]>>("/menu");
    const categories = res.data?.data ?? [];
    const flat: MenuItemResponse[] = categories.flatMap(
      (cat) => cat.items ?? [],
    );
    return {
      ...res,
      data: { ...res.data, data: flat },
    } as typeof res & { data: ApiResponse<MenuItemResponse[]> };
  },
};

// ─── Auth ───────────────────────────────────────────────────────────────────────
export const authAPI = {
  login: (credentials: LoginRequest) =>
    axiosInstance.post<ApiResponse<AuthResponse>>("/auth/login", credentials),
  logout: () => axiosInstance.post<ApiResponse<unknown>>("/auth/logout"),
  /** POST /auth/change-password — nhân viên tự đổi mật khẩu (đã đăng nhập). */
  changePassword: (data: ChangePasswordRequest) =>
    axiosInstance.post<ApiResponse<void>>("/auth/change-password", data),
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
    axiosInstance.get<ApiResponse<OrderInvoiceJson>>(`/payments/orders/${id}/invoice`),
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
    axiosInstance.get<ApiResponse<ManagerMenuCategoryListItemResponse[]>>(
      "/manager/menu/categories",
    ),
  getOne: (id: number) =>
    axiosInstance.get<ApiResponse<CategoryResponse>>(
      `/manager/menu/categories/${id}`,
    ),
  create: (data: CreateCategoryRequest) =>
    axiosInstance.post<ApiResponse<CategoryResponse>>(
      "/manager/menu/categories",
      data,
    ),
  update: (id: number, data: Partial<CreateCategoryRequest>) =>
    axiosInstance.put<ApiResponse<CategoryResponse>>(
      `/manager/menu/categories/${id}`,
      data,
    ),
  remove: (id: number) =>
    axiosInstance.delete<ApiResponse<void>>(`/manager/menu/categories/${id}`),
};

// ─── Menu Items (MANAGER) ───────────────────────────────────────────────────────
export const menuItemAPI = {
  /** GET /manager/menu/items — returns ALL items in category including unavailable ones */
  list: (categoryId: number) =>
    axiosInstance.get<ApiResponse<MenuItemResponse[]>>("/manager/menu/items", {
      params: { categoryId },
    }),
  create: (data: CreateMenuItemRequest) =>
    axiosInstance.post<ApiResponse<MenuItemResponse>>(
      "/manager/menu/items",
      data,
    ),
  update: (id: number, data: Partial<CreateMenuItemRequest>) =>
    axiosInstance.put<ApiResponse<MenuItemResponse>>(
      `/manager/menu/items/${id}`,
      data,
    ),
  remove: (id: number) =>
    axiosInstance.delete<ApiResponse<void>>(`/manager/menu/items/${id}`),
  getDetail: (id: number) =>
    axiosInstance.get<ApiResponse<any>>(`/manager/menu/items/${id}`),
  upsertFixedCombo: (
    id: number,
    data: { components: Array<{ menuItemId: number; quantity: number }> },
  ) =>
    axiosInstance.put<ApiResponse<any>>(
      `/manager/menu/items/${id}/combo/fixed`,
      data,
    ),
  upsertPickCombo: (
    id: number,
    data: {
      slots: Array<{
        name: string;
        minSelect: number;
        maxSelect: number;
        displayOrder: number;
        allowedItemIds: number[];
      }>;
    },
  ) =>
    axiosInstance.put<ApiResponse<any>>(
      `/manager/menu/items/${id}/combo/pick`,
      data,
    ),
  getRecipe: (id: number) =>
    axiosInstance.get<ApiResponse<RecipeItem[]>>(
      `/manager/menu/items/${id}/recipe`,
    ),
  upsertRecipe: (id: number, data: UpsertRecipeRequest) =>
    axiosInstance.put<ApiResponse<RecipeItem[]>>(
      `/manager/menu/items/${id}/recipe`,
      data,
    ),
  deleteRecipe: (id: number) =>
    axiosInstance.delete<ApiResponse<void>>(
      `/manager/menu/items/${id}/recipe`,
    ),
  uploadImage: (id: number, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return axiosInstance.put<ApiResponse<MenuItemResponse>>(
      `/manager/menu/items/${id}/image`,
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
    axiosInstance.post<ApiResponse<TableResponse>>("/manager/tables", data),
  update: (tableCode: string, data: Partial<CreateTableRequest>) =>
    axiosInstance.put<ApiResponse<TableResponse>>(
      `/manager/tables/${tableCode}`,
      data,
    ),
  remove: (tableCode: string) =>
    axiosInstance.delete<ApiResponse<void>>(`/manager/tables/${tableCode}`),
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
  /** POST /staff/{id}/reset-password — MANAGER đặt lại mật khẩu cho NV. */
  resetPassword: (id: number, newPassword: string) =>
    axiosInstance.post<ApiResponse<void>>(`/staff/${id}/reset-password`, {
      newPassword,
    }),
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
      .get<ApiResponse<IngredientResponseDto[]>>("/manager/inventory/ingredients")
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
        "/manager/inventory/ingredients",
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
        `/manager/inventory/ingredients/${id}`,
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
      `/manager/inventory/ingredients/${id}`,
    ),
  listTransactions: async () => {
    const itemsRes = await inventoryAPI.listItems();
    const items = itemsRes.data.data || [];
    const historyResponses = await Promise.all(
      items.map((item) =>
        axiosInstance
          .get<ApiResponse<StockTransactionResponseDto[]>>(
            `/manager/inventory/stock/${item.id}/history`,
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
  importStock: (data: {
    itemId: number;
    quantity: number;
    expiryDate: string; // yyyy-MM-dd, bắt buộc (ngày tương lai)
    note?: string;
  }) =>
    axiosInstance.post<ApiResponse<IngredientResponseDto>>(
      "/manager/inventory/stock/import",
      {
        ingredientId: data.itemId,
        quantity: data.quantity,
        expiryDate: data.expiryDate,
        note: data.note,
      },
    ),
  /** GET /manager/inventory/expiring?days= — lô sắp/đã hết hạn (FEFO). */
  getExpiring: (days = 3) =>
    axiosInstance.get<ApiResponse<ExpiringLot[]>>(
      "/manager/inventory/expiring",
      { params: { days } },
    ),
  /** POST /manager/inventory/lots/{id}/waste — đánh dấu lô huỷ/hao hụt. */
  wasteLot: (lotId: number, reason: string) =>
    axiosInstance.post<ApiResponse<void>>(
      `/manager/inventory/lots/${lotId}/waste`,
      { reason },
    ),
  exportStock: async (data: {
    itemId: number;
    quantity: number;
    note?: string;
  }) => {
    const itemRes = await axiosInstance.get<ApiResponse<IngredientResponseDto>>(
      `/manager/inventory/ingredients/${data.itemId}`,
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
  /** GET /payments/groups/{groupId}/bill — consolidated bill for a table group. */
  getGroupBill: (groupId: number) =>
    axiosInstance.get<ApiResponse<GroupBillResponse>>(
      `/payments/groups/${groupId}/bill`,
    ),
  /** POST /payments/groups/{groupId} — settle the whole group with one payment. */
  createGroupPayment: (groupId: number, data: CreateGroupPaymentRequest) => {
    const key = uuidv4();
    return axiosInstance.post<ApiResponse<PaymentResponse>>(
      `/payments/groups/${groupId}`,
      data,
      { headers: { "X-Idempotency-Key": key } },
    );
  },
  refundPayment: (paymentId: number, data: RefundRequest) => {
    const key = uuidv4();
    return axiosInstance.post<ApiResponse<RefundResponse>>(
      `/payments/${paymentId}/refund`,
      data,
      { headers: { "X-Idempotency-Key": key } },
    );
  },
  /** POST /payments/{id}/confirm — manual confirmation for CASH or VIETQR. */
  confirmManualPayment: (paymentId: number) =>
    axiosInstance.post<ApiResponse<PaymentResponse>>(
      `/payments/${paymentId}/confirm`,
    ),
  /** POST /payments/{id}/cancel — cashier abandons / switches method. */
  cancelPendingPayment: (paymentId: number, reason?: string) =>
    axiosInstance.post<ApiResponse<PaymentResponse>>(
      `/payments/${paymentId}/cancel`,
      { reason: reason ?? "CANCELLED_BY_CASHIER" },
    ),
  /** POST /payments/refunds/{refundId}/confirm — cashier confirms cash handed over / manual transfer done. */
  confirmRefund: (refundId: number) =>
    axiosInstance.post<ApiResponse<RefundResponse>>(
      `/payments/refunds/${refundId}/confirm`,
    ),
  /** POST /payments/refunds/{refundId}/cancel — cashier abandons a PENDING refund. */
  cancelRefund: (refundId: number, reason?: string) =>
    axiosInstance.post<ApiResponse<RefundResponse>>(
      `/payments/refunds/${refundId}/cancel`,
      { reason: reason ?? "CANCELLED_BY_CASHIER" },
    ),
  /** GET /payments/orders/{orderId}/refunds — refund history for one order. */
  listOrderRefunds: (orderId: number) =>
    axiosInstance.get<ApiResponse<RefundResponse[]>>(
      `/payments/orders/${orderId}/refunds`,
    ),
};

// ─── Payment Requests (Khách yêu cầu thanh toán) ───────────────────────
export const paymentRequestAPI = {
  /** GET /payment-requests?status=REQUESTED,ACKNOWLEDGED */
  list: (statuses?: ("REQUESTED" | "ACKNOWLEDGED" | "COMPLETED" | "CANCELLED")[]) =>
    axiosInstance.get<ApiResponse<PaymentRequestResponse[]>>("/payment-requests", {
      params: statuses && statuses.length > 0 ? { status: statuses.join(",") } : undefined,
    }),
  acknowledge: (id: number) =>
    axiosInstance.post<ApiResponse<PaymentRequestResponse>>(
      `/payment-requests/${id}/acknowledge`,
    ),
  cancel: (id: number, reason?: string) =>
    axiosInstance.post<ApiResponse<PaymentRequestResponse>>(
      `/payment-requests/${id}/cancel`,
      { reason: reason ?? "CANCELLED_BY_CASHIER" },
    ),
};

// ─── Kitchen menu (Báo hết món) ─────────────────────────────────────────────────
export const kitchenMenuAPI = {
  /** POST /kitchen/menu-items/{id}/mark-unavailable — bếp/manager tắt món. */
  markUnavailable: (menuItemId: number, reason?: string) =>
    axiosInstance.post<ApiResponse<unknown>>(
      `/kitchen/menu-items/${menuItemId}/mark-unavailable`,
      { reason },
    ),
  /** POST /manager/menu/items/{id}/mark-available — manager bật lại món. */
  markAvailable: (menuItemId: number) =>
    axiosInstance.post<ApiResponse<unknown>>(
      `/manager/menu/items/${menuItemId}/mark-available`,
    ),
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
  /** GET /analytics/kitchen-sla — thống kê SLA bếp (tỷ lệ trễ, p95...). */
  getKitchenSla: (fromDate?: string, toDate?: string) =>
    axiosInstance.get<ApiResponse<KitchenSlaStats>>("/analytics/kitchen-sla", {
      params: { fromDate, toDate },
    }),
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
// NOTE: open/close/current return raw objects (no ApiResponse wrapper)
export const shiftAPI = {
  open: (data: OpenShiftRequestBody) =>
    axiosInstance.post<ShiftResponse>("/shifts/open", data),
  close: (id: number, data: CloseShiftRequestBody) =>
    axiosInstance.post<CloseShiftResponse>(`/shifts/${id}/close`, data),
  getSummary: (id: number) =>
    axiosInstance.get<ShiftSummaryResponse>(`/shifts/${id}/summary`),
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

  /** POST /manager/menu/items/combo-generate — FP-Growth combo discovery */
  generateCombos: (data: ComboGenerateRequest) =>
    axiosInstance
      .post<ApiResponse<any>>("/manager/menu/items/combo-generate", data)
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

  /** POST /manager/ai/retrain — trigger background retraining job */
  triggerRetrain: () =>
    axiosInstance.post<ApiResponse<RetrainJobResponse>>("/manager/ai/retrain"),

  /** GET /manager/ai/jobs/{jobId} — poll retrain job status */
  pollRetrainJob: (jobId: string) =>
    axiosInstance.get<ApiResponse<RetrainJobStatusResponse>>(
      `/manager/ai/jobs/${jobId}`,
    ),
};

// ─── Tax Config (MANAGER) ───────────────────────────────────────────────────────
export const taxAPI = {
  /** GET /manager/tax/config — lấy cấu hình thuế toàn cục */
  getConfig: () =>
    axiosInstance.get<ApiResponse<TaxConfigResponse>>("/manager/tax/config"),

  /** PUT /manager/tax/config — cập nhật cấu hình thuế */
  updateConfig: (data: TaxConfigUpdateRequest) =>
    axiosInstance.put<ApiResponse<TaxConfigResponse>>("/manager/tax/config", data),

  /** GET /manager/tax/preview/menu-items — xem trước breakdown gross/net/tax */
  previewMenuItems: () =>
    axiosInstance.get<ApiResponse<MenuItemPricingPreviewResponse>>(
      "/manager/tax/preview/menu-items",
    ),
};

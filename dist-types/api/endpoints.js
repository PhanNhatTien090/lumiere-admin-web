import axiosInstance from "./client";
import { v4 as uuidv4 } from "uuid";
// ─── Public Menu (no admin prefix — for listing) ────────────────────────────────
export const publicMenuAPI = {
    /** GET /menu/categories — public, returns categories with nested items */
    listCategories: () => axiosInstance.get("/menu/categories"),
    /** GET /menu — public, returns flat list of MenuItemResponse */
    listItems: () => axiosInstance.get("/menu"),
};
// ─── Auth ───────────────────────────────────────────────────────────────────────
export const authAPI = {
    login: (credentials) => axiosInstance.post("/auth/login", credentials),
    logout: () => axiosInstance.post("/auth/logout"),
};
// ─── Orders ─────────────────────────────────────────────────────────────────────
export const orderAPI = {
    listOrders: (status) => axiosInstance.get("/orders", {
        params: status ? { status } : undefined,
    }),
    /** Paginated listing — used by Cashier "Lịch sử" screen. */
    listOrdersPaged: (params) => axiosInstance.get("/orders/paged", {
        params: {
            status: params.status,
            page: params.page ?? 0,
            size: params.size ?? 20,
        },
    }),
    getOrder: (id) => axiosInstance.get(`/orders/${id}`),
    getInvoiceJson: (id) => axiosInstance.get(`/orders/${id}/invoice`),
    confirmOrder: (id) => axiosInstance.put(`/orders/${id}/confirm`),
    cancelOrder: (id, reason) => axiosInstance.put(`/orders/${id}/cancel`, { reason }),
    serveAll: (id) => axiosInstance.put(`/orders/${id}/serve-all`),
};
// ─── Menu Categories (MANAGER) ──────────────────────────────────────────────────
export const categoryAPI = {
    list: () => axiosInstance.get("/admin/menu/categories"),
    getOne: (id) => axiosInstance.get(`/admin/menu/categories/${id}`),
    create: (data) => axiosInstance.post("/admin/menu/categories", data),
    update: (id, data) => axiosInstance.put(`/admin/menu/categories/${id}`, data),
    remove: (id) => axiosInstance.delete(`/admin/menu/categories/${id}`),
};
// ─── Menu Items (MANAGER) ───────────────────────────────────────────────────────
export const menuItemAPI = {
    /** GET /menu/items — requires categoryId (WAITER, MANAGER) */
    list: (categoryId) => axiosInstance.get("/menu/items", { params: { categoryId } }),
    create: (data) => axiosInstance.post("/admin/menu/items", data),
    update: (id, data) => axiosInstance.put(`/admin/menu/items/${id}`, data),
    remove: (id) => axiosInstance.delete(`/admin/menu/items/${id}`),
    uploadImage: (id, file) => {
        const form = new FormData();
        form.append("file", file);
        return axiosInstance.put(`/menu/items/${id}/image`, form, {
            headers: { "Content-Type": "multipart/form-data" },
        });
    },
};
// ─── Tables (MANAGER) ───────────────────────────────────────────────────────────
export const tableAPI = {
    list: () => axiosInstance.get("/tables"),
    create: (data) => axiosInstance.post("/admin/tables", data),
    update: (tableCode, data) => axiosInstance.put(`/admin/tables/${tableCode}`, data),
    remove: (tableCode) => axiosInstance.delete(`/admin/tables/${tableCode}`),
    getQr: (tableCode) => axiosInstance.get(`/tables/${tableCode}/qr-code`),
    rotateQr: (tableCode) => axiosInstance.put(`/tables/${tableCode}/qr-code/rotate`),
};
// ─── Staff (MANAGER) ────────────────────────────────────────────────────────────
export const staffAPI = {
    list: () => axiosInstance.get("/staff"),
    create: (data) => axiosInstance.post("/staff", data),
    update: (id, data) => axiosInstance.put(`/staff/${id}`, data),
    remove: (id) => axiosInstance.delete(`/staff/${id}`),
};
const mapUnitToBackend = (unit) => {
    const normalized = (unit || "").trim().toUpperCase();
    if (normalized === "ML")
        return "ML";
    if (normalized === "UNIT")
        return "UNIT";
    return "G";
};
const mapIngredientToUi = (dto) => ({
    id: dto.id,
    name: dto.name,
    unit: dto.unit,
    currentStock: Number(dto.currentQty ?? 0),
    minStock: Number(dto.lowStockThreshold ?? 0),
});
const mapStockTxnToUi = (dto, itemId, itemName) => ({
    id: dto.id,
    itemId,
    itemName,
    type: dto.txnType === "IMPORT"
        ? "IMPORT"
        : Number(dto.quantityChange ?? 0) < 0
            ? "EXPORT"
            : "ADJUST",
    quantity: Math.abs(Number(dto.quantityChange ?? 0)),
    note: dto.note,
    createdAt: dto.createdAt,
});
export const inventoryAPI = {
    listItems: () => axiosInstance
        .get("/admin/inventory/ingredients")
        .then((res) => ({
        ...res,
        data: { ...res.data, data: (res.data.data || []).map(mapIngredientToUi) },
    })),
    /** Fallback: kitchen endpoint accessible to MANAGER+KITCHEN */
    listItemsKitchen: () => axiosInstance
        .get("/kitchen/inventory")
        .then((res) => ({
        ...res,
        data: { ...res.data, data: (res.data.data || []).map(mapIngredientToUi) },
    })),
    createItem: (data) => axiosInstance
        .post("/admin/inventory/ingredients", {
        name: data.name,
        unit: mapUnitToBackend(data.unit),
        lowStockThreshold: Number(data.minStock ?? 0),
    })
        .then((res) => ({
        ...res,
        data: { ...res.data, data: mapIngredientToUi(res.data.data) },
    })),
    updateItem: (id, data) => axiosInstance
        .put(`/admin/inventory/ingredients/${id}`, {
        name: data.name,
        unit: mapUnitToBackend(data.unit),
        lowStockThreshold: Number(data.minStock ?? 0),
    })
        .then((res) => ({
        ...res,
        data: { ...res.data, data: mapIngredientToUi(res.data.data) },
    })),
    removeItem: (id) => axiosInstance.delete(`/admin/inventory/ingredients/${id}`),
    listTransactions: async () => {
        const itemsRes = await inventoryAPI.listItems();
        const items = itemsRes.data.data || [];
        const historyResponses = await Promise.all(items.map((item) => axiosInstance
            .get(`/admin/inventory/stock/${item.id}/history`)
            .then((res) => ({ item, history: res.data.data || [] }))
            .catch(() => ({ item, history: [] }))));
        const transactions = historyResponses
            .flatMap(({ item, history }) => history.map((tx) => mapStockTxnToUi(tx, item.id, item.name)))
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        return {
            data: {
                success: true,
                data: transactions,
            },
        };
    },
    importStock: (data) => axiosInstance.post("/admin/inventory/stock/import", {
        ingredientId: data.itemId,
        quantity: data.quantity,
        note: data.note,
    }),
    exportStock: async (data) => {
        const itemRes = await axiosInstance.get(`/admin/inventory/ingredients/${data.itemId}`);
        const currentQty = Number(itemRes.data.data.currentQty ?? 0);
        const nextQty = currentQty - data.quantity;
        if (nextQty < 0) {
            throw {
                response: {
                    data: { message: "Số lượng xuất vượt quá tồn kho hiện tại" },
                },
            };
        }
        return axiosInstance.put(`/kitchen/inventory/${data.itemId}/adjust`, {
            newQuantity: nextQty,
            note: data.note,
        });
    },
};
// ─── Payments (CASHIER + MANAGER) ───────────────────────────────────────────────
export const paymentAPI = {
    createPayment: (data) => {
        const key = uuidv4();
        return axiosInstance.post("/payments", data, {
            headers: { "X-Idempotency-Key": key },
        });
    },
    getStatus: (orderId) => axiosInstance.get(`/payments/orders/${orderId}/status`),
    refundPayment: (paymentId, data) => {
        const key = uuidv4();
        return axiosInstance.post(`/payments/${paymentId}/refund`, data, { headers: { "X-Idempotency-Key": key } });
    },
};
// ─── Analytics (MANAGER) ────────────────────────────────────────────────────────
export const analyticsAPI = {
    getSummary: (fromDate, toDate) => axiosInstance.get("/analytics/summary", {
        params: { fromDate, toDate },
    }),
    getRevenue: (params) => axiosInstance.get("/analytics/revenue", { params }),
};
// ─── Support — list/assign/status: WAITER, MANAGER; create/table/get: permitAll ──
export const supportAPI = {
    create: (data) => axiosInstance.post("/support", data),
    listByTable: (tableCode) => axiosInstance.get(`/support/table/${encodeURIComponent(tableCode)}`),
    listAll: () => axiosInstance.get("/support"),
    getOne: (id) => axiosInstance.get(`/support/${id}`),
    assign: (id, data) => axiosInstance.put(`/support/${id}/assign`, data),
    updateStatus: (id, data) => axiosInstance.put(`/support/${id}/status`, data),
};
// ─── Cashier shifts (CASHIER, MANAGER) / list all MANAGER ─────────────────────
// NOTE: shift endpoints return raw objects (no ApiResponse wrapper)
export const shiftAPI = {
    open: (data) => axiosInstance.post("/shifts/open", data),
    close: (id, data) => axiosInstance.post(`/shifts/${id}/close`, data),
    current: () => axiosInstance.get("/shifts/current"),
    listAll: () => axiosInstance.get("/shifts"),
};
const mapForecastPrediction = (p) => ({
    day: p.day,
    value: Number(p.value ?? 0),
    lowerBound: Number(p.lowerBound ?? p.lower_bound ?? 0),
    upperBound: Number(p.upperBound ?? p.upper_bound ?? 0),
});
export const aiAPI = {
    /** POST /analytics/forecast — predict order count or revenue */
    forecast: (data) => axiosInstance
        .post("/analytics/forecast", data)
        .then((res) => ({
        ...res,
        data: {
            ...res.data,
            data: {
                ...res.data.data,
                predictions: (res.data.data?.predictions || []).map(mapForecastPrediction),
            },
        },
    })),
    /** POST /admin/menu/items/combo-generate — FP-Growth combo discovery */
    generateCombos: (data) => axiosInstance.post("/admin/menu/items/combo-generate", data),
    /** POST /admin/ai/retrain — trigger background retraining job */
    triggerRetrain: () => axiosInstance.post("/admin/ai/retrain"),
    /** GET /admin/ai/jobs/{jobId} — poll retrain job status */
    pollRetrainJob: (jobId) => axiosInstance.get(`/admin/ai/jobs/${jobId}`),
};

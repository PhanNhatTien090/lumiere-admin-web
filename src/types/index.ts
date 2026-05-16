export type TaxMode = "NO_TAX" | "EXCLUSIVE" | "INCLUSIVE";

// ─── API Wrapper ───────────────────────────────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  timestamp?: string;
}

// ─── Auth / Staff ──────────────────────────────────────────────────────────────
export type StaffRole = "MANAGER" | "CASHIER" | "KITCHEN" | "WAITER";

export interface Staff {
  id: number;
  username: string;
  name?: string;       // backend field: name
  fullName?: string;   // alias for compatibility
  role: StaffRole;
  status?: string;
  createdAt?: string;
  updatedAt?: string | null;
}

export interface AuthResponse {
  accessToken: string;
  tokenType: string;
  expiresIn?: number;
  staff: Staff;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface CreateStaffRequest {
  username: string;
  password: string;
  name: string;        // backend field: name
  role: StaffRole;
}

export interface UpdateStaffRequest {
  name?: string;       // backend field: name
  role?: StaffRole;
  status?: string;
}

// ─── Table ─────────────────────────────────────────────────────────────────────
export type TableStatus = "AVAILABLE" | "OCCUPIED" | "RESERVED" | "CLEANING";

export interface TableResponse {
  id: number;
  tableCode: string;
  floor: number;
  tableNo: number;
  capacity: number;
  status: TableStatus;
}

export interface CreateTableRequest {
  tableCode: string;
  floor: number;
  tableNo: number;
  capacity: number;
}

export interface QrCodeResponse {
  tableCode: string;
  qrContent: string;
  qrImageUrl: string;
  expiresAt?: string;
}

// ─── Menu ──────────────────────────────────────────────────────────────────────
export interface CategoryResponse {
  id: number;
  name: string;
  description?: string | null;
  displayOrder: number;
  items?: MenuItemResponse[];
}

export interface CreateCategoryRequest {
  name: string;
  description?: string | null;
  displayOrder?: number;
}

export type ItemType = "SINGLE" | "COMBO";
export type ComboKind = "PICK" | "FIXED";

export interface MenuItemResponse {
  id: number;
  categoryId: number;
  categoryName?: string;
  name: string;
  description?: string | null;
  price: number;
  itemTaxMode?: TaxMode | null;
  itemTaxRateBps?: number | null;
  cookTime?: number | null;
  available: boolean;
  imageUrl?: string | null;
  itemType: ItemType;
  comboKind?: ComboKind | null;
  ingredientSufficient?: boolean;
}

export interface CreateMenuItemRequest {
  categoryId: number;
  name: string;
  description?: string | null;
  price: number;
  cookTime?: number | null;
  imageUrl?: string | null;
  itemType: ItemType;
  comboKind?: ComboKind | null;
  itemTaxMode: TaxMode;
  itemTaxRateBps: number;
}

export interface FixedComboComponent {
  menuItemId: number;
  quantity: number;
}

export interface PickComboSlot {
  id?: number;
  name: string;
  minSelect: number;
  maxSelect: number;
  displayOrder: number;
  allowedItemIds: number[];
}

export interface UpsertFixedComboRequest {
  components: FixedComboComponent[];
}

export interface UpsertPickComboRequest {
  slots: PickComboSlot[];
}

export interface MenuItemDetailResponse extends MenuItemResponse {
  itemTaxMode?: TaxMode | null;
  itemTaxRateBps?: number | null;
  fixedCombo?: {
    components: Array<{ menuItemId: number; quantity: number }>;
  } | null;
  pickCombo?: {
    slots: Array<{
      id: number;
      name: string;
      minSelect: number;
      maxSelect: number;
      displayOrder: number;
      allowedItemIds: number[];
    }>;
  } | null;
}

// ─── Order ─────────────────────────────────────────────────────────────────────
export type OrderStatus =
  | "CREATED"
  | "CONFIRMED"
  | "PREPARING"
  | "READY"
  | "SERVED"
  | "PAID"
  | "CANCELLED";

export type OrderItemStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PREPARING"
  | "READY"
  | "SERVED"
  | "CANCELLED";

export interface OrderItemResponse {
  id: number;
  menuItemId: number;
  menuItemName?: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  unitTaxMode?: TaxMode;
  unitTaxRateBps?: number;
  netSubtotal?: number;
  taxSubtotal?: number;
  note?: string | null;
  status: OrderItemStatus;
  createdAt: string;
  billable: boolean;
  comboParent: boolean;
}

export interface OrderResponse {
  id: number;
  tableId: number;
  tableCode?: string;
  status: OrderStatus;
  subtotalAmount: number;
  taxAmount: number;
  totalAmount: number;
  taxMode: TaxMode;
  taxRateBps: number;
  taxSnapshotAt?: string | null;
  taxSnapshotById?: number | null;
  note?: string | null;
  splitBillAllowed: boolean;
  createdAt: string;
  confirmedAt: string | null;
  readyAt: string | null;
  servedAt: string | null;
  paidAt: string | null;
  cancelledAt: string | null;
  latestRevisionNumber: number;
  items: OrderItemResponse[];
}

// ─── Payment ───────────────────────────────────────────────────────────────────
export type PaymentMethod = "CASH" | "QR_CODE" | "VNPAY_ATM";
export type PaymentProvider = "CASH" | "VNPAY";
export type PaymentStatus = "INITIATED" | "PENDING" | "PAID" | "FAILED" | "REFUNDED";

export interface CreatePaymentRequest {
  orderId: number;
  shiftId: number;
  paymentMethod: PaymentMethod;
  provider: PaymentProvider;
  locale?: string | null;
  clientIp?: string | null;
  bankCode?: string | null;
}

export interface PaymentResponse {
  paymentId: number;
  orderId: number;
  shiftId: number;
  subtotalAmount: number;
  taxAmount: number;
  amount: number;
  taxMode: TaxMode;
  taxRateBps: number;
  paymentMethod: PaymentMethod;
  provider: PaymentProvider;
  status: PaymentStatus;
  qrContent: string | null;
  payUrl: string | null;
  qrExpiresAt: string | null;
  createdAt: string;
  paidAt: string | null;
  failedAt: string | null;
}

export interface PaymentStatusResponse {
  orderId: number;
  paymentId?: number;
  status: string;
  amount?: number;
  paidAt?: string | null;
}

export interface RefundRequest {
  amount: number;
  reason: string;
}

// ─── Analytics ─────────────────────────────────────────────────────────────────
export interface AnalyticsSummary {
  totalOrders: number;
  confirmedOrders: number;
  cancelledOrders: number;
  totalRevenue: number;       // GROSS — số khách trả (gồm thuế)
  totalNetRevenue: number;    // NET — doanh thu thuần nhà hàng
  totalTax: number;           // TAX — thuế đã thu
  successfulPayments: number;
  failedPayments: number;
  fromDate: string;
  toDate: string;
  generatedAt: string;
}

export type RevenueGroupBy = "DAY" | "WEEK" | "MONTH" | "YEAR";

export interface RevenuePeriod {
  periodLabel: string;
  revenue: number;     // GROSS
  netRevenue: number;  // NET
  taxAmount: number;   // TAX
  orderCount: number;
}

export interface RevenueTopItem {
  menuItemId: number;
  menuItemName: string;
  totalQuantity: number;
  orderCount: number;
  totalRevenue: number;
}

export interface RevenueDetailResponse {
  fromDate: string;
  toDate: string;
  groupBy: RevenueGroupBy;
  totalRevenue: number;
  totalNetRevenue: number;
  totalTax: number;
  totalOrders: number;
  periods: RevenuePeriod[];
  topItems: RevenueTopItem[];
  generatedAt: string;
}

// ─── Manager Menu Categories ───────────────────────────────────────────────────
export interface ManagerMenuCategoryListItemResponse {
  id: number;
  name: string;
  description?: string | null;
  displayOrder: number;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Inventory ─────────────────────────────────────────────────────────────────
export interface InventoryItem {
  id: number;
  name: string;
  unit: string;
  currentStock: number;
  minStock: number;
  category?: string;
}

export interface InventoryTransaction {
  id: number;
  itemId: number;
  itemName: string;
  type: "IMPORT" | "EXPORT" | "ADJUST";
  quantity: number;
  note?: string;
  createdAt: string;
}

// ─── Support (WAITER / MANAGER customer-facing flows) ─────────────────────────
export type SupportRequestStatus =
  | "CREATED"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "RESOLVED"
  | "CLOSED";

export interface SupportRequestResponse {
  id: number;
  tableCode: string;
  status: SupportRequestStatus;
  staffId?: number | null;
  message?: string | null;
  createdAt: string;
  updatedAt?: string | null;
}

export interface CreateSupportRequest {
  tableCode: string;
  message?: string | null;
}

export interface AssignSupportRequestBody {
  staffId: number;
}

export interface UpdateSupportStatusBody {
  status: SupportRequestStatus;
}

// ─── Cashier shifts (CASHIER / MANAGER) ─────────────────────────────────────────
export interface ShiftResponse {
  id: number;
  cashierId: number;
  openedBy?: number;
  closedBy?: number | null;
  openedAt: string;
  closedAt: string | null;
  openingTotal: number;
  closingTotal?: number | null;
  openingNotes?: string | null;
  closingNotes?: string | null;
}

export interface OpenShiftRequestBody {
  cashierId: number;
  openingTotal: number;
  notes?: string;
}

export interface CloseShiftRequestBody {
  actualCash: number;
  notes?: string;
}

export interface CloseShiftResponse {
  shiftId: number;
  cashierId: number;
  openedBy: number;
  closedBy: number;
  openedAt: string;
  closedAt: string;
  openingTotal: number;
  cashRevenue: number;
  transferRevenue: number;
  expectedCash: number;
  actualCash: number;
  discrepancy: number;
  notes?: string | null;
}

export interface ShiftSummaryResponse {
  shiftId: number;
  cashierId: number;
  openedAt: string;
  openingTotal: number;
  cashRevenue: number;
  transferRevenue: number;
  expectedCash: number;
  totalBills: number;
}

/** GET /orders/{orderId}/invoice — JSON invoice payload */
export type OrderInvoiceJson = Record<string, unknown>;

// ─── AI Features ───────────────────────────────────────────────────────────────

/** POST /analytics/forecast */
export type ForecastMetric = "orders" | "revenue";

export interface ForecastRequest {
  metric: ForecastMetric;
  horizonDays: number;
}

export interface ForecastPrediction {
  day: number;
  value: number;
  lowerBound: number;
  upperBound: number;
}

export interface ForecastResponse {
  success: boolean;
  metric: ForecastMetric;
  predictions: ForecastPrediction[];
}

/** POST /manager/menu/items/combo-generate */
export interface ComboGenerateRequest {
  analyzeDays?: number;
  minSupport?: number;
  minConfidence?: number;
}

export interface DraftCombo {
  comboItems: number[];
  confidenceScore: number;
  liftScore: number;
}

export interface ComboGenerateResponse {
  success: boolean;
  draftCombos: DraftCombo[];
}

/** POST /manager/ai/retrain */
export interface RetrainJobResponse {
  jobId: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
}

/** GET /manager/ai/jobs/{jobId} */
export interface RetrainJobStatusResponse {
  success: boolean;
  jobId: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  message: string;
}

// ─── Tax Management (MANAGER only) ─────────────────────────────────────────────

/** GET/PUT /manager/tax/config */
export interface TaxConfigResponse {
  taxMode: TaxMode;
  taxRateBps: number;
  taxRatePercent: number;
  updatedAt?: string;
  updatedBy?: number;
}

export interface TaxConfigUpdateRequest {
  taxMode: TaxMode;
  taxRateBps: number;
}

/** GET /manager/tax/preview/menu-items */
export interface MenuItemPricingPreviewRow {
  menuItemId: number;
  name: string;
  category: string;
  effectiveTaxMode: TaxMode;
  effectiveTaxRateBps: number;
  grossPrice: number;
  netPrice: number;
  taxAmount: number;
}

export interface MenuItemPricingPreviewResponse {
  globalTaxMode: TaxMode;
  globalTaxRateBps: number;
  items: MenuItemPricingPreviewRow[];
}

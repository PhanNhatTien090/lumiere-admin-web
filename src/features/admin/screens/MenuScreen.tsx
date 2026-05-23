import { useState, useEffect } from "react";
import { categoryAPI, menuItemAPI, taxAPI, kitchenMenuAPI } from "@/api/endpoints";
import {
  ManagerMenuCategoryListItemResponse,
  MenuItemResponse,
  CreateMenuItemRequest,
  CreateCategoryRequest,
  TaxMode,
  ComboKind,
  ItemType,
} from "@/types";
import { useMenuAvailabilityStore } from "@/store/menuAvailabilityStore";

function fmtVnd(n: number) {
  return new Intl.NumberFormat("vi-VN").format(n) + "đ";
}

// ─── Modal ─────────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children, wide }: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-box"
        style={wide ? { maxWidth: 720 } : undefined}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Category Form ─────────────────────────────────────────────────────────────
function CategoryForm({ initial, onSave, onClose }: {
  initial?: ManagerMenuCategoryListItemResponse;
  onSave: () => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [desc, setDesc] = useState(initial?.description ?? "");
  const [order, setOrder] = useState(initial?.displayOrder ?? 0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    if (!name.trim()) { setErr("Tên danh mục không được trống"); return; }
    setLoading(true); setErr(null);
    try {
      const data: CreateCategoryRequest = { name: name.trim(), description: desc || null, displayOrder: order };
      if (initial) await categoryAPI.update(initial.id, data);
      else await categoryAPI.create(data);
      onSave();
    } catch (e: any) {
      setErr(e.response?.data?.message || "Lỗi lưu danh mục");
    } finally { setLoading(false); }
  };

  return (
    <>
      {err && <div className="form-err">{err}</div>}
      <div className="form-group">
        <label>Tên danh mục *</label>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="VD: Khai vị" />
      </div>
      <div className="form-group">
        <label>Mô tả</label>
        <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Mô tả ngắn..." />
      </div>
      <div className="form-group">
        <label>Thứ tự hiển thị</label>
        <input type="number" value={order} onChange={e => setOrder(+e.target.value)} />
      </div>
      <div className="form-actions">
        <button className="btn-secondary" onClick={onClose}>Huỷ</button>
        <button className="btn-primary" onClick={submit} disabled={loading}>
          {loading ? "Đang lưu..." : initial ? "Cập nhật" : "Tạo mới"}
        </button>
      </div>
    </>
  );
}

// ─── Combo Fixed Config ─────────────────────────────────────────────────────────
function FixedComboConfig({ itemId, items, initial, onSave, onSkip }: {
  itemId: number;
  items: MenuItemResponse[];
  initial?: Array<{ menuItemId: number; quantity: number }>;
  onSave: () => void;
  onSkip: () => void;
}) {
  const singleItems = items.filter(i => i.itemType === "SINGLE");
  const [components, setComponents] = useState<Array<{ menuItemId: number; quantity: number }>>(
    initial ?? []
  );
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const addRow = () => {
    if (singleItems.length === 0) return;
    setComponents(c => [...c, { menuItemId: singleItems[0].id, quantity: 1 }]);
  };

  const removeRow = (i: number) => setComponents(c => c.filter((_, idx) => idx !== i));

  const update = (i: number, field: "menuItemId" | "quantity", val: number) =>
    setComponents(c => c.map((row, idx) => idx === i ? { ...row, [field]: val } : row));

  const save = async () => {
    if (components.length === 0) { setErr("Cần ít nhất 1 thành phần"); return; }
    for (const c of components) {
      if (!c.menuItemId || c.quantity < 1) { setErr("Kiểm tra lại menuItemId và số lượng"); return; }
    }
    setLoading(true); setErr(null);
    try {
      await menuItemAPI.upsertFixedCombo(itemId, { components });
      onSave();
    } catch (e: any) {
      setErr(e.response?.data?.message || "Lỗi lưu cấu hình combo cố định");
    } finally { setLoading(false); }
  };

  return (
    <div className="combo-config-section">
      <h4 style={{ marginBottom: 8 }}>Thành phần combo cố định</h4>
      <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 12 }}>
        Khai báo các món ăn được bao gồm trong combo này.
      </p>
      {err && <div className="form-err">{err}</div>}
      {components.length > 0 && (
        <div className="combo-rows">
          {components.map((row, i) => (
            <div key={i} className="form-row" style={{ alignItems: "center", gap: 8 }}>
              <div className="form-group" style={{ flex: 2, margin: 0 }}>
                <select value={row.menuItemId} onChange={e => update(i, "menuItemId", +e.target.value)}>
                  {singleItems.map(it => <option key={it.id} value={it.id}>{it.name}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ flex: "0 0 80px", margin: 0 }}>
                <input type="number" min={1} value={row.quantity} onChange={e => update(i, "quantity", +e.target.value)} />
              </div>
              <button className="btn-icon-danger" onClick={() => removeRow(i)} title="Xoá">✕</button>
            </div>
          ))}
        </div>
      )}
      <button className="btn-secondary" style={{ marginTop: 8 }} onClick={addRow} disabled={singleItems.length === 0}>
        + Thêm thành phần
      </button>
      <div className="form-actions" style={{ marginTop: 16 }}>
        <button className="btn-secondary" onClick={onSkip}>Bỏ qua</button>
        <button className="btn-primary" onClick={save} disabled={loading}>
          {loading ? "Đang lưu..." : "Lưu cấu hình combo"}
        </button>
      </div>
    </div>
  );
}

// ─── Combo Pick Config ─────────────────────────────────────────────────────────
type PickSlotDraft = {
  name: string;
  minSelect: number;
  maxSelect: number;
  displayOrder: number;
  allowedItemIds: number[];
};

function PickComboConfig({ itemId, items, initial, onSave, onSkip }: {
  itemId: number;
  items: MenuItemResponse[];
  initial?: PickSlotDraft[];
  onSave: () => void;
  onSkip: () => void;
}) {
  const [slots, setSlots] = useState<PickSlotDraft[]>(initial ?? []);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const addSlot = () =>
    setSlots(s => [...s, { name: "", minSelect: 1, maxSelect: 1, displayOrder: s.length + 1, allowedItemIds: [] }]);

  const removeSlot = (i: number) => setSlots(s => s.filter((_, idx) => idx !== i));

  const updateSlot = (i: number, field: keyof PickSlotDraft, val: any) =>
    setSlots(s => s.map((row, idx) => idx === i ? { ...row, [field]: val } : row));

  const toggleItem = (slotIdx: number, itemId: number) => {
    setSlots(s => s.map((slot, idx) => {
      if (idx !== slotIdx) return slot;
      const has = slot.allowedItemIds.includes(itemId);
      return {
        ...slot,
        allowedItemIds: has
          ? slot.allowedItemIds.filter(id => id !== itemId)
          : [...slot.allowedItemIds, itemId],
      };
    }));
  };

  const save = async () => {
    if (slots.length === 0) { setErr("Cần ít nhất 1 slot"); return; }
    for (const s of slots) {
      if (!s.name.trim()) { setErr("Tên slot không được trống"); return; }
      if (s.minSelect < 0 || s.maxSelect < s.minSelect) { setErr("Giá trị chọn min/max không hợp lệ"); return; }
      if (s.allowedItemIds.length === 0) { setErr(`Slot "${s.name}" cần ít nhất 1 món cho phép`); return; }
    }
    setLoading(true); setErr(null);
    try {
      await menuItemAPI.upsertPickCombo(itemId, { slots });
      onSave();
    } catch (e: any) {
      setErr(e.response?.data?.message || "Lỗi lưu cấu hình combo tùy chọn");
    } finally { setLoading(false); }
  };

  return (
    <div className="combo-config-section">
      <h4 style={{ marginBottom: 8 }}>Cấu hình slot combo tùy chọn</h4>
      <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 12 }}>
        Mỗi slot cho phép khách chọn một nhóm món ăn trong combo.
      </p>
      {err && <div className="form-err">{err}</div>}
      {slots.map((slot, si) => (
        <div key={si} className="pick-slot-card" style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12, marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <strong style={{ fontSize: 13 }}>Slot #{si + 1}</strong>
            <button className="btn-icon-danger" onClick={() => removeSlot(si)} title="Xoá slot">✕</button>
          </div>
          <div className="form-group">
            <label>Tên slot *</label>
            <input value={slot.name} onChange={e => updateSlot(si, "name", e.target.value)} placeholder="VD: Chọn món chính" />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Chọn tối thiểu</label>
              <input type="number" min={0} value={slot.minSelect} onChange={e => updateSlot(si, "minSelect", +e.target.value)} />
            </div>
            <div className="form-group">
              <label>Chọn tối đa</label>
              <input type="number" min={1} value={slot.maxSelect} onChange={e => updateSlot(si, "maxSelect", +e.target.value)} />
            </div>
            <div className="form-group">
              <label>Thứ tự hiển thị</label>
              <input type="number" min={1} value={slot.displayOrder} onChange={e => updateSlot(si, "displayOrder", +e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label>Món được phép chọn ({slot.allowedItemIds.length} đã chọn)</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, maxHeight: 160, overflowY: "auto", border: "1px solid #e5e7eb", borderRadius: 6, padding: 8 }}>
              {items.filter(it => it.itemType === "SINGLE").map(it => {
                const selected = slot.allowedItemIds.includes(it.id);
                return (
                  <button
                    key={it.id}
                    type="button"
                    onClick={() => toggleItem(si, it.id)}
                    style={{
                      padding: "3px 10px",
                      borderRadius: 20,
                      fontSize: 12,
                      cursor: "pointer",
                      border: selected ? "1.5px solid #d4ad34" : "1px solid #e5e7eb",
                      background: selected ? "rgba(212,173,52,0.12)" : "#f9fafb",
                      color: selected ? "#a87d00" : "#374151",
                      fontWeight: selected ? 600 : 400,
                    }}
                  >
                    {selected ? "✓ " : ""}{it.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ))}
      <button className="btn-secondary" onClick={addSlot}>+ Thêm slot</button>
      <div className="form-actions" style={{ marginTop: 16 }}>
        <button className="btn-secondary" onClick={onSkip}>Bỏ qua</button>
        <button className="btn-primary" onClick={save} disabled={loading}>
          {loading ? "Đang lưu..." : "Lưu cấu hình slot"}
        </button>
      </div>
    </div>
  );
}

// ─── VND price input helpers ────────────────────────────────────────────────────
function fmtVndDisplay(n: number): string {
  if (!n || isNaN(n)) return "";
  return new Intl.NumberFormat("vi-VN").format(Math.round(n));
}

function parseVndText(s: string): number {
  // Remove all non-numeric chars (dots, commas, spaces) and parse
  const cleaned = s.replace(/[^\d]/g, "");
  const n = parseInt(cleaned, 10);
  return isNaN(n) ? 0 : n;
}

function VndPriceInput({ value, onChange, id, placeholder }: {
  value: number;
  onChange: (v: number) => void;
  id?: string;
  placeholder?: string;
}) {
  const [focused, setFocused] = useState(false);
  // While focused: show raw number string for easy editing
  // While blurred: show formatted VND string
  const displayVal = focused
    ? (value === 0 ? "" : String(value))
    : fmtVndDisplay(value);

  return (
    <div style={{ position: "relative" }}>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        placeholder={placeholder ?? "VD: 50.000"}
        value={displayVal}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={e => {
          const raw = parseVndText(e.target.value);
          onChange(raw);
        }}
        style={{ paddingRight: 32 }}
      />
      <span style={{
        position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
        fontSize: 11, color: "#9ca3af", pointerEvents: "none",
      }}>đ</span>
    </div>
  );
}

// ─── Menu Item Form ─────────────────────────────────────────────────────────────
const TAX_MODE_LABELS: Record<TaxMode, string> = {
  NO_TAX: "Không thuế",
  EXCLUSIVE: "Cộng thuế ngoài giá",
  INCLUSIVE: "Thuế trong giá",
};

function MenuItemForm({ initial, categories, items, onSave, onClose }: {
  initial?: MenuItemResponse;
  categories: ManagerMenuCategoryListItemResponse[];
  items: MenuItemResponse[];
  onSave: () => void;
  onClose: () => void;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [savedItemId, setSavedItemId] = useState<number | null>(initial?.id ?? null);
  const [detailLoading, setDetailLoading] = useState(false);

  // ── Step 1 fields ──
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? (categories[0]?.id || 0));
  const [name, setName] = useState(initial?.name ?? "");
  const [desc, setDesc] = useState(initial?.description ?? "");
  const [price, setPrice] = useState(initial?.price ?? 0);
  const [cookTimeText, setCookTimeText] = useState(String(initial?.cookTime ?? 5));
  const [itemType, setItemType] = useState<ItemType>(initial?.itemType ?? "SINGLE");
  const [comboKind, setComboKind] = useState<ComboKind>(initial?.comboKind ?? "FIXED");
  // Tax fields: pre-filled from global config for new items; overwritten by detail fetch when editing
  const [itemTaxMode, setItemTaxMode] = useState<TaxMode>(initial?.itemTaxMode ?? "NO_TAX");
  const [itemTaxRateBps, setItemTaxRateBps] = useState<number>(initial?.itemTaxRateBps ?? 0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(initial?.imageUrl ?? null);

  // ── Existing combo config (when editing) ──
  const [existingFixedComponents, setExistingFixedComponents] = useState<Array<{ menuItemId: number; quantity: number }> | undefined>();
  const [existingPickSlots, setExistingPickSlots] = useState<PickSlotDraft[] | undefined>();

  // When creating a new item, pre-fill tax fields from global tax config template
  useEffect(() => {
    if (initial?.id) return;
    taxAPI.getConfig()
      .then(res => {
        const cfg = res.data.data;
        if (!cfg) return;
        setItemTaxMode(cfg.taxMode ?? "INCLUSIVE");
        setItemTaxRateBps(cfg.taxRateBps ?? 800);
      })
      .catch(() => { /* silently keep defaults */ });
  }, [initial?.id]);

  // Fetch full manager detail when editing — list endpoint omits tax info
  useEffect(() => {
    if (!initial?.id) return;
    setDetailLoading(true);
    menuItemAPI.getDetail(initial.id)
      .then(res => {
        const d = res.data.data;
        if (!d) return;
        // Overwrite tax fields with authoritative values from manager endpoint
        setItemTaxMode(d.itemTaxMode ?? "NO_TAX");
        setItemTaxRateBps(d.itemTaxRateBps ?? 0);
        // Load combo config
        if (d.fixedCombo?.components) setExistingFixedComponents(d.fixedCombo.components);
        if (d.pickCombo?.slots) setExistingPickSlots(d.pickCombo.slots.map((s: any) => ({
          name: s.name,
          minSelect: s.minSelect,
          maxSelect: s.maxSelect,
          displayOrder: s.displayOrder,
          allowedItemIds: s.allowedItemIds ?? [],
        })));
      })
      .catch(() => {/* non-blocking, form still usable */})
      .finally(() => setDetailLoading(false));
  }, [initial?.id]);

  const cookTime = parseInt(cookTimeText, 10);
  const cookTimeValid = cookTimeText === "" || (!isNaN(cookTime) && cookTime >= 0);

  const submitStep1 = async () => {
    if (!name.trim()) { setErr("Tên món không được trống"); return; }
    if (!categoryId) { setErr("Chọn danh mục"); return; }
    if (price <= 0) { setErr("Giá bán phải lớn hơn 0đ"); return; }
    if (!cookTimeValid || isNaN(cookTime) || cookTime < 0) {
      setErr("Thời gian nấu phải >= 0 phút"); return;
    }
    if (itemTaxMode !== "NO_TAX" && itemTaxRateBps <= 0) {
      setErr("Thuế suất phải > 0 khi áp dụng thuế (VD: 1000 = 10%)"); return;
    }
    if (itemTaxMode !== "NO_TAX" && itemTaxRateBps > 10000) {
      setErr("Thuế suất tối đa 10000 bps (100%)"); return;
    }
    setLoading(true); setErr(null);
    try {
      const effectiveCookTime = cookTimeText === "" ? null : cookTime;
      const data: CreateMenuItemRequest = {
        categoryId,
        name: name.trim(),
        description: desc.trim() || null,
        price,
        cookTime: effectiveCookTime,
        itemType,
        comboKind: itemType === "COMBO" ? comboKind : null,
        imageUrl: previewImageUrl ?? null,
        itemTaxMode,
        itemTaxRateBps: itemTaxMode === "NO_TAX" ? 0 : itemTaxRateBps,
      };
      let itemId = savedItemId;
      if (initial) {
        await menuItemAPI.update(initial.id, data);
        itemId = initial.id;
      } else {
        const res = await menuItemAPI.create(data);
        itemId = res.data.data.id;
        setSavedItemId(itemId);
      }
      if (imageFile && itemId) {
        const imgRes = await menuItemAPI.uploadImage(itemId, imageFile);
        // Update preview URL from server response
        const serverUrl = imgRes.data?.data?.imageUrl ?? null;
        if (serverUrl) setPreviewImageUrl(serverUrl);
      }
      if (itemType === "COMBO") {
        setStep(2);
      } else {
        onSave();
      }
    } catch (e: any) {
      const fieldErrs = e.response?.data?.data;
      const detail = fieldErrs && typeof fieldErrs === "object"
        ? " (" + Object.entries(fieldErrs).map(([k, v]) => `${k}: ${v}`).join(", ") + ")"
        : "";
      setErr((e.response?.data?.message || "Lỗi lưu món ăn") + detail);
    } finally { setLoading(false); }
  };

  if (step === 2 && savedItemId) {
    return (
      <div>
        <div className="alert-success" style={{ marginBottom: 16 }}>
          ✅ Thông tin món đã lưu. Tiếp tục cấu hình combo bên dưới (hoặc bỏ qua để hoàn tất).
        </div>
        {comboKind === "FIXED" ? (
          <FixedComboConfig
            itemId={savedItemId}
            items={items}
            initial={existingFixedComponents}
            onSave={onSave}
            onSkip={onSave}
          />
        ) : (
          <PickComboConfig
            itemId={savedItemId}
            items={items}
            initial={existingPickSlots}
            onSave={onSave}
            onSkip={onSave}
          />
        )}
      </div>
    );
  }

  return (
    <>
      {detailLoading && (
        <div style={{ marginBottom: 10, fontSize: 12, color: "#9ca3af" }}>
          ⏳ Đang tải thông tin chi tiết...
        </div>
      )}
      {err && <div className="form-err">{err}</div>}
      <div className="form-row">
        <div className="form-group">
          <label>Danh mục *</label>
          <select value={categoryId} onChange={e => setCategoryId(+e.target.value)}>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Loại món *</label>
          <select value={itemType} onChange={e => {
            const t = e.target.value as ItemType;
            setItemType(t);
            if (t !== "COMBO") setComboKind("FIXED");
          }}>
            <option value="SINGLE">Đơn lẻ (SINGLE)</option>
            <option value="COMBO">Combo</option>
          </select>
        </div>
        {itemType === "COMBO" && (
          <div className="form-group">
            <label>Kiểu combo *</label>
            <select value={comboKind} onChange={e => setComboKind(e.target.value as ComboKind)}>
              <option value="FIXED">Cố định (FIXED)</option>
              <option value="PICK">Tùy chọn (PICK)</option>
            </select>
          </div>
        )}
      </div>
      <div className="form-group">
        <label>Tên món *</label>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="VD: Gỏi Cuốn Tôm" />
      </div>
      <div className="form-group">
        <label>Mô tả</label>
        <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Mô tả ngắn..." />
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>
            Giá bán *
            {price > 0 && (
              <span style={{ marginLeft: 6, fontWeight: 400, color: "#6b7280" }}>
                = {fmtVnd(price)}
              </span>
            )}
          </label>
          <VndPriceInput
            id="item-price"
            value={price}
            onChange={setPrice}
            placeholder="VD: 50.000"
          />
        </div>
        <div className="form-group">
          <label>
            Thời gian nấu (phút)
            <span style={{ marginLeft: 4, fontWeight: 400, color: "#6b7280", fontSize: 11 }}>(≥ 0)</span>
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={cookTimeText}
            onChange={e => {
              const v = e.target.value.replace(/[^\d]/g, "");
              setCookTimeText(v);
            }}
            placeholder="VD: 10"
            style={{ borderColor: cookTimeValid ? undefined : "#ef4444" }}
          />
          {!cookTimeValid && (
            <small style={{ color: "#ef4444" }}>Phải là số nguyên ≥ 0</small>
          )}
        </div>
      </div>

      {/* ── Tax fields ── */}
      <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: "12px 14px", marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 10 }}>
          ⚙️ Cài đặt thuế
          {detailLoading && <span style={{ fontWeight: 400, color: "#9ca3af", marginLeft: 6 }}>(đang tải...)</span>}
        </div>
        <div className="form-row">
          <div className="form-group" style={{ flex: 1 }}>
            <label>Chế độ thuế *</label>
            <select value={itemTaxMode} onChange={e => {
              const m = e.target.value as TaxMode;
              setItemTaxMode(m);
              if (m === "NO_TAX") setItemTaxRateBps(0);
            }}>
              {(Object.entries(TAX_MODE_LABELS) as [TaxMode, string][]).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          {itemTaxMode !== "NO_TAX" && (
            <div className="form-group" style={{ flex: 1 }}>
              <label>
                Thuế suất (bps) *
                <span style={{ color: "#6b7280", fontWeight: 400 }}> · 1000 = 10%</span>
              </label>
              <input
                type="number"
                min={1}
                max={10000}
                step={100}
                value={itemTaxRateBps}
                onChange={e => setItemTaxRateBps(Math.max(0, Math.min(10000, +e.target.value)))}
                placeholder="VD: 1000"
              />
            </div>
          )}
        </div>
        <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
          {itemTaxMode === "NO_TAX" && "Không áp dụng thuế cho món này."}
          {itemTaxMode !== "NO_TAX" && itemTaxRateBps > 0 && (
            <>
              Thuế suất: <strong>{(itemTaxRateBps / 100).toFixed(0)}%</strong>
              {itemTaxMode === "EXCLUSIVE"
                ? " · Khách thanh toán giá niêm yết + thuế"
                : " · Thuế đã gộp trong giá niêm yết"}
              {price > 0 && itemTaxMode === "EXCLUSIVE" && (
                <> · Tổng thực tế ≈ <strong>{fmtVnd(Math.round(price * (1 + itemTaxRateBps / 10000)))}</strong></>
              )}
              {price > 0 && itemTaxMode === "INCLUSIVE" && (
                <> · Thuế riêng ≈ <strong>{fmtVnd(Math.round(price * itemTaxRateBps / (10000 + itemTaxRateBps)))}</strong></>
              )}
            </>
          )}
          {itemTaxMode !== "NO_TAX" && itemTaxRateBps === 0 && (
            <span style={{ color: "#ef4444" }}>⚠️ Nhập thuế suất &gt; 0</span>
          )}
        </div>
      </div>

      <div className="form-group">
        <label>Ảnh món ăn</label>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={e => {
            const file = e.target.files?.[0] ?? null;
            setImageFile(file);
            if (file) {
              const reader = new FileReader();
              reader.onload = ev => setPreviewImageUrl(ev.target?.result as string);
              reader.readAsDataURL(file);
            }
          }}
        />
        {previewImageUrl && (
          <img src={previewImageUrl} alt="preview" className="img-preview" />
        )}
      </div>
      <div className="form-actions">
        <button className="btn-secondary" onClick={onClose}>Huỷ</button>
        <button className="btn-primary" onClick={submitStep1} disabled={loading || detailLoading}>
          {loading
            ? "Đang lưu..."
            : itemType === "COMBO"
              ? (initial ? "Cập nhật & cấu hình combo →" : "Tạo & cấu hình combo →")
              : (initial ? "Cập nhật" : "Tạo mới")}
        </button>
      </div>
    </>
  );
}

// ─── Availability helpers ──────────────────────────────────────────────────────
type AvailabilityStatus = "OK" | "INGREDIENT_OUT" | "DISABLED";

function getAvailabilityStatus(item: MenuItemResponse): AvailabilityStatus {
  if (!item.available) return "DISABLED";
  if (item.ingredientSufficient === false) return "INGREDIENT_OUT";
  return "OK";
}

const AVAILABILITY_META: Record<
  AvailabilityStatus,
  { label: string; bg: string; color: string; border: string }
> = {
  OK: { label: "✅ Đang phục vụ", bg: "#dcfce7", color: "#15803d", border: "#86efac" },
  INGREDIENT_OUT: { label: "⚠️ Hết nguyên liệu", bg: "#fef3c7", color: "#92400e", border: "#fde68a" },
  DISABLED: { label: "🚫 Đã tắt", bg: "#fee2e2", color: "#dc2626", border: "#fca5a5" },
};

// ─── Main MenuScreen ───────────────────────────────────────────────────────────
export function MenuScreen() {
  const [categories, setCategories] = useState<ManagerMenuCategoryListItemResponse[]>([]);
  const [items, setItems] = useState<MenuItemResponse[]>([]);
  const [selectedCat, setSelectedCat] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [catModal, setCatModal] = useState<"create" | "edit" | null>(null);
  const [editCat, setEditCat] = useState<ManagerMenuCategoryListItemResponse | undefined>();
  const [itemModal, setItemModal] = useState<"create" | "edit" | null>(null);
  const [editItem, setEditItem] = useState<MenuItemResponse | undefined>();
  const [search, setSearch] = useState("");
  const [availabilityFilter, setAvailabilityFilter] = useState<"ALL" | AvailabilityStatus>("ALL");
  const [toggleBusyId, setToggleBusyId] = useState<number | null>(null);

  const lastAvailabilityEvent = useMenuAvailabilityStore((s) => s.lastEvent);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const catRes = await categoryAPI.list();
      const cats = catRes.data.data;
      setCategories(cats);
      if (cats.length > 0) {
        const itemResults = await Promise.all(cats.map(c => menuItemAPI.list(c.id)));
        setItems(itemResults.flatMap(r => r.data.data));
      } else {
        setItems([]);
      }
    } catch (e: any) {
      if (!e.response) {
        setError("Không thể kết nối đến máy chủ. Kiểm tra backend localhost:8080.");
      } else if (e.response?.status === 500) {
        setError(`Lỗi máy chủ (500): ${e.response?.data?.message || "Backend đang gặp sự cố nội bộ"}`);
      } else {
        setError(e.response?.data?.message || "Lỗi tải dữ liệu menu");
      }
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  // Patch local items in-place when a STOMP availability delta arrives —
  // avoids a full menu refetch for every kitchen action / stock import.
  useEffect(() => {
    if (!lastAvailabilityEvent || lastAvailabilityEvent.updates.length === 0) return;
    const byId = new Map(lastAvailabilityEvent.updates.map((u) => [u.menuItemId, u]));
    setItems((prev) =>
      prev.map((it) => {
        const upd = byId.get(it.id);
        if (!upd) return it;
        return {
          ...it,
          available: upd.available,
          ingredientSufficient: upd.ingredientSufficient,
        };
      }),
    );
  }, [lastAvailabilityEvent]);

  const toggleAvailability = async (item: MenuItemResponse) => {
    const status = getAvailabilityStatus(item);
    if (toggleBusyId === item.id) return;

    if (status === "DISABLED") {
      // Mở lại món — manager only endpoint
      if (!confirm(`Mở lại món "${item.name}"?`)) return;
      setToggleBusyId(item.id);
      try {
        await kitchenMenuAPI.markAvailable(item.id);
        // Optimistic patch; STOMP delta will arrive too and confirm
        setItems((prev) =>
          prev.map((it) => (it.id === item.id ? { ...it, available: true } : it)),
        );
      } catch (e: any) {
        alert(e.response?.data?.message || "Không mở lại được món");
      } finally {
        setToggleBusyId(null);
      }
    } else {
      const reason = prompt(`Tắt món "${item.name}". Nhập lý do (bắt buộc):`, "");
      if (reason === null) return;
      if (!reason.trim()) {
        alert("Vui lòng nhập lý do tắt món để lưu lịch sử.");
        return;
      }
      setToggleBusyId(item.id);
      try {
        await kitchenMenuAPI.markUnavailable(item.id, reason.trim());
        setItems((prev) =>
          prev.map((it) => (it.id === item.id ? { ...it, available: false } : it)),
        );
      } catch (e: any) {
        alert(e.response?.data?.message || "Không tắt được món");
      } finally {
        setToggleBusyId(null);
      }
    }
  };

  const deleteCategory = async (cat: ManagerMenuCategoryListItemResponse) => {
    if (!confirm(`Xoá danh mục "${cat.name}"? Các món trong danh mục cũng sẽ bị ảnh hưởng.`)) return;
    try {
      await categoryAPI.remove(cat.id);
      load();
    } catch (e: any) {
      alert(e.response?.data?.message || "Lỗi xoá danh mục");
    }
  };

  const deleteItem = async (item: MenuItemResponse) => {
    if (!confirm(`Xoá món "${item.name}"?`)) return;
    try {
      await menuItemAPI.remove(item.id);
      load();
    } catch (e: any) {
      alert(e.response?.data?.message || "Lỗi xoá món");
    }
  };

  const filteredItems = items.filter(item => {
    const matchCat = selectedCat === null || item.categoryId === selectedCat;
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus =
      availabilityFilter === "ALL" || getAvailabilityStatus(item) === availabilityFilter;
    return matchCat && matchSearch && matchStatus;
  });

  const disabledCount = items.filter((i) => !i.available).length;
  const insufficientCount = items.filter(
    (i) => i.available && i.ingredientSufficient === false,
  ).length;

  return (
    <div className="screen">
      <header className="screen-header">
        <div>
          <h2>Quản lý <span>Menu</span></h2>
          <p>
            {items.length} món · {categories.length} danh mục
            {disabledCount > 0 && ` · 🚫 ${disabledCount} đang tắt`}
            {insufficientCount > 0 && ` · ⚠️ ${insufficientCount} hết NL`}
          </p>
        </div>
        <div className="header-actions">
          <button className="btn-secondary" onClick={() => { setCatModal("create"); setEditCat(undefined); }}>
            + Danh mục
          </button>
          <button className="btn-primary" onClick={() => { setItemModal("create"); setEditItem(undefined); }}>
            + Thêm món
          </button>
        </div>
      </header>

      {error && <div className="alert-error">{error}</div>}

      <div className="menu-layout">
        {/* Category sidebar */}
        <div className="cat-sidebar">
          <h4>Danh mục</h4>
          <button
            className={`cat-btn ${selectedCat === null ? "active" : ""}`}
            onClick={() => setSelectedCat(null)}
          >
            Tất cả ({items.length})
          </button>
          {categories.map(cat => {
            const count = items.filter(i => i.categoryId === cat.id).length;
            return (
              <div key={cat.id} className="cat-row">
                <button
                  className={`cat-btn ${selectedCat === cat.id ? "active" : ""}`}
                  onClick={() => setSelectedCat(cat.id)}
                >
                  {cat.name} ({count})
                </button>
                <div className="cat-actions">
                  <button title="Sửa" onClick={() => { setEditCat(cat); setCatModal("edit"); }}>✏️</button>
                  <button title="Xoá" onClick={() => deleteCategory(cat)}>🗑️</button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Item grid */}
        <div className="item-area">
          <input
            className="search-input"
            placeholder="🔍 Tìm kiếm món..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
            {(["ALL", "OK", "INGREDIENT_OUT", "DISABLED"] as const).map((f) => {
              const active = availabilityFilter === f;
              const label =
                f === "ALL"
                  ? `Tất cả (${items.length})`
                  : f === "OK"
                    ? `✅ Đang phục vụ (${items.length - disabledCount - insufficientCount})`
                    : f === "INGREDIENT_OUT"
                      ? `⚠️ Hết NL (${insufficientCount})`
                      : `🚫 Đã tắt (${disabledCount})`;
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => setAvailabilityFilter(f)}
                  style={{
                    padding: "4px 10px",
                    borderRadius: 16,
                    fontSize: 12,
                    cursor: "pointer",
                    border: active ? "1.5px solid #d4ad34" : "1px solid #e5e7eb",
                    background: active ? "rgba(212,173,52,0.12)" : "#f9fafb",
                    color: active ? "#a87d00" : "#374151",
                    fontWeight: active ? 600 : 400,
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
          {loading && <div className="loading-state">Đang tải...</div>}
          <div className="item-grid">
            {filteredItems.map(item => {
              const status = getAvailabilityStatus(item);
              const meta = AVAILABILITY_META[status];
              const busy = toggleBusyId === item.id;
              const isDisabled = status === "DISABLED";
              return (
                <div key={item.id} className="item-card" style={isDisabled ? { opacity: 0.75 } : undefined}>
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="item-img" style={isDisabled ? { filter: "grayscale(0.6)" } : undefined} />
                  ) : (
                    <div className="item-img-placeholder">🍽️</div>
                  )}
                  <div className="item-info">
                    <div className="item-header">
                      <strong>{item.name}</strong>
                      <div style={{ display: "flex", gap: 4 }}>
                        <span className={`item-type-badge ${item.itemType.toLowerCase()}`}>
                          {item.itemType}
                        </span>
                        {item.itemType === "COMBO" && item.comboKind && (
                          <span className="item-type-badge" style={{ background: "#f3e8c0", color: "#8a6a00" }}>
                            {item.comboKind}
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ marginBottom: 6 }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "2px 8px",
                          borderRadius: 12,
                          fontSize: 11,
                          fontWeight: 600,
                          background: meta.bg,
                          color: meta.color,
                          border: `1px solid ${meta.border}`,
                        }}
                      >
                        {meta.label}
                      </span>
                    </div>
                    <small>{item.description || "Không có mô tả"}</small>
                    <div className="item-footer">
                      <b className="item-price">{fmtVnd(item.price)}</b>
                      <div className="item-actions">
                        <button
                          title={isDisabled ? "Mở lại món" : "Tắt món"}
                          onClick={() => toggleAvailability(item)}
                          disabled={busy}
                          style={{
                            fontSize: 13,
                            cursor: busy ? "wait" : "pointer",
                            opacity: busy ? 0.5 : 1,
                          }}
                        >
                          {busy ? "⏳" : isDisabled ? "🔓" : "⛔"}
                        </button>
                        <button title="Sửa" onClick={() => { setEditItem(item); setItemModal("edit"); }}>✏️</button>
                        <button title="Xoá" onClick={() => deleteItem(item)}>🗑️</button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {filteredItems.length === 0 && !loading && (
              <div className="empty-state">Không có món nào phù hợp</div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {catModal && (
        <Modal title={catModal === "create" ? "Tạo danh mục mới" : "Sửa danh mục"} onClose={() => setCatModal(null)}>
          <CategoryForm initial={editCat} onSave={() => { setCatModal(null); load(); }} onClose={() => setCatModal(null)} />
        </Modal>
      )}
      {itemModal && (
        <Modal
          title={itemModal === "create" ? "Thêm món mới" : "Sửa món ăn"}
          onClose={() => setItemModal(null)}
          wide
        >
          <MenuItemForm
            initial={editItem}
            categories={categories}
            items={items}
            onSave={() => { setItemModal(null); load(); }}
            onClose={() => setItemModal(null)}
          />
        </Modal>
      )}
    </div>
  );
}

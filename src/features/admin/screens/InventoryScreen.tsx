import { useState, useEffect, useMemo } from "react";
import { inventoryAPI, categoryAPI, menuItemAPI } from "@/api/endpoints";
import {
  InventoryItem,
  InventoryTransaction,
  MenuItemResponse,
  ManagerMenuCategoryListItemResponse,
  RecipeItem,
  ExpiringLot,
} from "@/types";
import { fmtDateTime } from "@/utils/format";
import { useMenuAvailabilityStore } from "@/store/menuAvailabilityStore";

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ItemForm({
  initial,
  onSave,
  onClose,
}: {
  initial?: InventoryItem;
  onSave: () => void;
  onClose: () => void;
}) {
  const unitOptions = [
    { value: "G", label: "Gram (g)" },
    { value: "ML", label: "Milliliter (ml)" },
    { value: "UNIT", label: "Đơn vị (unit)" },
  ] as const;

  const [name, setName] = useState(initial?.name ?? "");
  const [unit, setUnit] = useState(initial?.unit ?? "G");
  const [minStock, setMinStock] = useState(initial?.minStock ?? 0);
  const [currentStock, setCurrentStock] = useState(initial?.currentStock ?? 0);
  // Hạn dùng cho lô tồn kho khởi tạo (chỉ dùng khi tạo mới + currentStock > 0).
  // Mặc định 30 ngày tới để qua ràng buộc @Future của backend.
  const [initExpiry, setInitExpiry] = useState(
    new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
  );
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    if (!name.trim()) {
      setErr("Tên nguyên liệu không được trống");
      return;
    }
    if (!unit.trim()) {
      setErr("Đơn vị không được trống");
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      const data = {
        name: name.trim(),
        unit: unit.trim(),
        minStock,
        currentStock,
      };
      if (initial) {
        await inventoryAPI.updateItem(initial.id, data);
      } else {
        const created = await inventoryAPI.createItem(data);
        if (currentStock > 0) {
          await inventoryAPI.importStock({
            itemId: created.data.data.id,
            quantity: currentStock,
            expiryDate: initExpiry,
            note: "Khởi tạo tồn kho ban đầu",
          });
        }
      }
      onSave();
    } catch (e: any) {
      setErr(e.response?.data?.message || "Lỗi lưu nguyên liệu");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {err && <div className="form-err">{err}</div>}
      <div className="form-row">
        <div className="form-group">
          <label>Tên nguyên liệu *</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="VD: Cà chua"
          />
        </div>
        <div className="form-group">
          <label>Đơn vị *</label>
          <select value={unit} onChange={(e) => setUnit(e.target.value)}>
            {unitOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>Tồn kho hiện tại</label>
          <input
            type="number"
            value={currentStock}
            onChange={(e) => setCurrentStock(+e.target.value)}
            min={0}
          />
        </div>
        <div className="form-group">
          <label>Tồn kho tối thiểu</label>
          <input
            type="number"
            value={minStock}
            onChange={(e) => setMinStock(+e.target.value)}
            min={0}
          />
        </div>
      </div>
      {!initial && currentStock > 0 && (
        <div className="form-group">
          <label>Hạn sử dụng lô khởi tạo *</label>
          <input
            type="date"
            value={initExpiry}
            min={new Date(Date.now() + 86400000).toISOString().slice(0, 10)}
            onChange={(e) => setInitExpiry(e.target.value)}
          />
        </div>
      )}
      <div className="form-actions">
        <button className="btn-secondary" onClick={onClose}>
          Huỷ
        </button>
        <button className="btn-primary" onClick={submit} disabled={loading}>
          {loading ? "Đang lưu..." : initial ? "Cập nhật" : "Thêm nguyên liệu"}
        </button>
      </div>
    </>
  );
}

function TransactionForm({
  items,
  type,
  onSave,
  onClose,
}: {
  items: InventoryItem[];
  type: "import" | "export";
  onSave: () => void;
  onClose: () => void;
}) {
  const [itemId, setItemId] = useState(items[0]?.id ?? 0);
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Ngày tối thiểu cho hạn dùng = ngày mai (backend yêu cầu @Future).
  const minExpiry = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }, []);

  const submit = async () => {
    if (!itemId) {
      setErr("Chọn nguyên liệu");
      return;
    }
    if (quantity <= 0) {
      setErr("Số lượng phải lớn hơn 0");
      return;
    }
    if (type === "import") {
      if (!expiryDate) { setErr("Chọn hạn sử dụng"); return; }
      if (expiryDate < minExpiry) { setErr("Hạn sử dụng phải sau ngày hôm nay"); return; }
    }
    setLoading(true);
    setErr(null);
    try {
      if (type === "import") {
        await inventoryAPI.importStock({ itemId, quantity, expiryDate, note: note || undefined });
      } else {
        await inventoryAPI.exportStock({ itemId, quantity, note: note || undefined });
      }
      onSave();
    } catch (e: any) {
      setErr(e.response?.data?.message || "Lỗi giao dịch kho");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {err && <div className="form-err">{err}</div>}
      <div className="form-group">
        <label>Nguyên liệu</label>
        <select value={itemId} onChange={(e) => setItemId(+e.target.value)}>
          {items.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name} ({i.unit})
            </option>
          ))}
        </select>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>Số lượng</label>
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(+e.target.value)}
            min={1}
          />
        </div>
        <div className="form-group">
          <label>Ghi chú</label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Lý do nhập/xuất..."
          />
        </div>
      </div>
      {type === "import" && (
        <div className="form-group">
          <label>Hạn sử dụng *</label>
          <input
            type="date"
            value={expiryDate}
            min={minExpiry}
            onChange={(e) => setExpiryDate(e.target.value)}
          />
        </div>
      )}
      <div className="form-actions">
        <button className="btn-secondary" onClick={onClose}>
          Huỷ
        </button>
        <button className="btn-primary" onClick={submit} disabled={loading}>
          {loading
            ? "Đang xử lý..."
            : type === "import"
              ? "Nhập kho"
              : "Xuất kho"}
        </button>
      </div>
    </>
  );
}

function RecipeManager({ items }: { items: InventoryItem[] }) {
  const [categories, setCategories] = useState<
    ManagerMenuCategoryListItemResponse[]
  >([]);
  const [menuItems, setMenuItems] = useState<MenuItemResponse[]>([]);
  const [menuLoading, setMenuLoading] = useState(false);
  const [menuError, setMenuError] = useState<string | null>(null);

  const [selectedCatId, setSelectedCatId] = useState<number | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const [recipe, setRecipe] = useState<
    Array<{ ingredientId: number; quantity: number }>
  >([]);
  const [recipeOriginal, setRecipeOriginal] = useState<
    Array<{ ingredientId: number; quantity: number }>
  >([]);
  const [recipeLoading, setRecipeLoading] = useState(false);
  const [recipeError, setRecipeError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setMenuLoading(true);
      setMenuError(null);
      try {
        const catRes = await categoryAPI.list();
        const cats = catRes.data.data ?? [];
        if (cancelled) return;
        setCategories(cats);
        if (cats.length === 0) {
          setMenuItems([]);
          return;
        }
        const itemResults = await Promise.all(
          cats.map((c) =>
            menuItemAPI
              .list(c.id)
              .then((r) => r.data.data ?? [])
              .catch(() => [] as MenuItemResponse[]),
          ),
        );
        if (cancelled) return;
        const flat = itemResults.flat();
        setMenuItems(flat);
        if (flat.length > 0 && selectedItemId === null) {
          setSelectedItemId(flat[0].id);
        }
      } catch (e: any) {
        if (!cancelled)
          setMenuError(e.response?.data?.message || "Lỗi tải danh sách món");
      } finally {
        if (!cancelled) setMenuLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedItemId === null) {
      setRecipe([]);
      setRecipeOriginal([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setRecipeLoading(true);
      setRecipeError(null);
      try {
        const res = await menuItemAPI.getRecipe(selectedItemId);
        if (cancelled) return;
        const next = (res.data.data ?? []).map((r: RecipeItem) => ({
          ingredientId: r.ingredientId,
          quantity: Number(r.quantity),
        }));
        setRecipe(next);
        setRecipeOriginal(next);
      } catch (e: any) {
        if (cancelled) return;
        if (e.response?.status === 404) {
          // No recipe yet — start fresh
          setRecipe([]);
          setRecipeOriginal([]);
        } else {
          setRecipeError(e.response?.data?.message || "Lỗi tải công thức");
        }
      } finally {
        if (!cancelled) setRecipeLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedItemId]);

  const filteredMenuItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return menuItems.filter((it) => {
      if (selectedCatId !== null && it.categoryId !== selectedCatId)
        return false;
      if (q && !it.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [menuItems, selectedCatId, search]);

  const selectedItem = menuItems.find((it) => it.id === selectedItemId) ?? null;
  const usedIngredientIds = new Set(recipe.map((r) => r.ingredientId));
  const availableIngredients = items.filter(
    (i) => !usedIngredientIds.has(i.id),
  );

  const dirty = useMemo(() => {
    if (recipe.length !== recipeOriginal.length) return true;
    const byId = new Map(
      recipeOriginal.map((r) => [r.ingredientId, r.quantity]),
    );
    for (const r of recipe) {
      const orig = byId.get(r.ingredientId);
      if (orig === undefined || orig !== r.quantity) return true;
    }
    return false;
  }, [recipe, recipeOriginal]);

  const addIngredient = () => {
    if (availableIngredients.length === 0) return;
    setRecipe((r) => [
      ...r,
      { ingredientId: availableIngredients[0].id, quantity: 1 },
    ]);
  };

  const updateRow = (
    idx: number,
    patch: Partial<{ ingredientId: number; quantity: number }>,
  ) =>
    setRecipe((rows) =>
      rows.map((row, i) => (i === idx ? { ...row, ...patch } : row)),
    );

  const removeRow = (idx: number) =>
    setRecipe((rows) => rows.filter((_, i) => i !== idx));

  const save = async () => {
    if (!selectedItemId) return;
    setSaving(true);
    setRecipeError(null);
    try {
      if (recipe.length === 0) {
        await menuItemAPI.deleteRecipe(selectedItemId);
        setRecipeOriginal([]);
      } else {
        for (const r of recipe) {
          if (!(r.quantity > 0)) {
            setRecipeError("Số lượng phải lớn hơn 0");
            setSaving(false);
            return;
          }
        }
        const seen = new Set<number>();
        for (const r of recipe) {
          if (seen.has(r.ingredientId)) {
            setRecipeError("Mỗi nguyên liệu chỉ được khai báo 1 lần");
            setSaving(false);
            return;
          }
          seen.add(r.ingredientId);
        }
        const res = await menuItemAPI.upsertRecipe(selectedItemId, {
          items: recipe.map((r) => ({
            ingredientId: r.ingredientId,
            quantity: r.quantity,
          })),
        });
        const next = (res.data.data ?? []).map((r) => ({
          ingredientId: r.ingredientId,
          quantity: Number(r.quantity),
        }));
        setRecipe(next);
        setRecipeOriginal(next);
      }
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1500);
    } catch (e: any) {
      setRecipeError(e.response?.data?.message || "Lỗi lưu công thức");
    } finally {
      setSaving(false);
    }
  };

  if (menuLoading) {
    return <div className="loading-state">Đang tải danh sách món...</div>;
  }
  if (menuError) {
    return <div className="alert-error">{menuError}</div>;
  }
  if (menuItems.length === 0) {
    return (
      <div className="empty-cell" style={{ padding: 32, textAlign: "center" }}>
        Chưa có món nào. Hãy tạo món ở mục Menu trước khi cấu hình nguyên liệu.
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <div className="empty-cell" style={{ padding: 32, textAlign: "center" }}>
        Chưa có nguyên liệu nào trong kho. Hãy thêm nguyên liệu trước khi gán
        cho món.
      </div>
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(220px, 280px) 1fr",
        gap: 16,
        alignItems: "start",
      }}
    >
      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 8,
          padding: 10,
          background: "#fff",
          maxHeight: "70vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <input
          className="search-input"
          placeholder="🔍 Tìm món..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ marginBottom: 8 }}
        />
        <select
          value={selectedCatId === null ? "" : String(selectedCatId)}
          onChange={(e) =>
            setSelectedCatId(e.target.value === "" ? null : +e.target.value)
          }
          style={{
            width: "100%",
            marginBottom: 8,
            padding: "6px 8px",
            fontSize: 13,
            border: "1px solid #e5e7eb",
            borderRadius: 6,
            background: "#fff",
          }}
        >
          <option value="">Tất cả danh mục ({menuItems.length})</option>
          {categories.map((c) => {
            const count = menuItems.filter((it) => it.categoryId === c.id).length;
            return (
              <option key={c.id} value={c.id}>
                {c.name} ({count})
              </option>
            );
          })}
        </select>
        <div style={{ overflowY: "auto", flex: 1 }}>
          {filteredMenuItems.map((it) => {
            const active = it.id === selectedItemId;
            return (
              <button
                key={it.id}
                type="button"
                onClick={() => setSelectedItemId(it.id)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "8px 10px",
                  marginBottom: 4,
                  borderRadius: 6,
                  border: active
                    ? "1.5px solid #d4ad34"
                    : "1px solid #e5e7eb",
                  background: active ? "rgba(212,173,52,0.12)" : "#f9fafb",
                  color: active ? "#a87d00" : "#374151",
                  fontWeight: active ? 600 : 400,
                  cursor: "pointer",
                }}
              >
                <div style={{ fontSize: 13 }}>{it.name}</div>
                <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
                  {it.itemType}
                  {it.itemType === "COMBO" && it.comboKind
                    ? ` · ${it.comboKind}`
                    : ""}
                </div>
              </button>
            );
          })}
          {filteredMenuItems.length === 0 && (
            <div
              style={{
                padding: 12,
                fontSize: 12,
                color: "#6b7280",
                textAlign: "center",
              }}
            >
              Không có món khớp.
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 8,
          padding: 16,
          background: "#fff",
        }}
      >
        {!selectedItem ? (
          <div style={{ color: "#9ca3af" }}>Chọn món ở bên trái để cấu hình.</div>
        ) : (
          <>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <div>
                <h3 style={{ margin: 0 }}>{selectedItem.name}</h3>
                <small style={{ color: "#6b7280" }}>
                  {selectedItem.itemType}
                  {selectedItem.itemType === "COMBO" &&
                    selectedItem.comboKind &&
                    ` · ${selectedItem.comboKind}`}
                  {" · "}công thức: {recipe.length} nguyên liệu
                </small>
              </div>
              {savedFlash && (
                <span style={{ color: "#15803d", fontSize: 12 }}>
                  ✅ Đã lưu
                </span>
              )}
            </div>

            {selectedItem.itemType === "COMBO" && (
              <div
                style={{
                  background: "#fffbeb",
                  border: "1px solid #fde68a",
                  color: "#92400e",
                  padding: "8px 12px",
                  borderRadius: 6,
                  fontSize: 12,
                  marginBottom: 12,
                }}
              >
                ⚠️ Đây là combo. Thông thường công thức nguyên liệu được khai
                báo trên từng món SINGLE thành phần.
              </div>
            )}

            {recipeError && <div className="form-err">{recipeError}</div>}

            {recipeLoading ? (
              <div className="loading-state">Đang tải công thức...</div>
            ) : (
              <>
                {recipe.length === 0 ? (
                  <div
                    style={{
                      padding: 16,
                      color: "#6b7280",
                      textAlign: "center",
                      border: "1px dashed #e5e7eb",
                      borderRadius: 8,
                      marginBottom: 12,
                    }}
                  >
                    Chưa có nguyên liệu nào cho món này.
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
                    {recipe.map((row, idx) => {
                      const ing = items.find((i) => i.id === row.ingredientId);
                      const otherUsed = recipe
                        .filter((_, i) => i !== idx)
                        .map((r) => r.ingredientId);
                      const optionItems = items.filter(
                        (i) => !otherUsed.includes(i.id),
                      );
                      return (
                        <div
                          key={idx}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 130px 80px 36px",
                            gap: 8,
                            alignItems: "center",
                          }}
                        >
                          <select
                            value={row.ingredientId}
                            onChange={(e) =>
                              updateRow(idx, { ingredientId: +e.target.value })
                            }
                          >
                            {optionItems.map((opt) => (
                              <option key={opt.id} value={opt.id}>
                                {opt.name}
                              </option>
                            ))}
                          </select>
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={row.quantity}
                            onChange={(e) =>
                              updateRow(idx, { quantity: +e.target.value })
                            }
                          />
                          <div style={{ fontSize: 12, color: "#6b7280" }}>
                            {ing?.unit ?? ""}
                          </div>
                          <button
                            type="button"
                            className="btn-small danger"
                            onClick={() => removeRow(idx)}
                            title="Xoá"
                          >
                            🗑️
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={addIngredient}
                  disabled={availableIngredients.length === 0}
                >
                  + Thêm nguyên liệu
                </button>
                {availableIngredients.length === 0 && recipe.length > 0 && (
                  <div
                    style={{
                      fontSize: 11,
                      color: "#6b7280",
                      marginTop: 4,
                    }}
                  >
                    Đã dùng hết các nguyên liệu trong kho.
                  </div>
                )}

                <div
                  className="form-actions"
                  style={{ marginTop: 16, justifyContent: "flex-end" }}
                >
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setRecipe(recipeOriginal)}
                    disabled={!dirty || saving}
                  >
                    Hoàn tác
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={save}
                    disabled={!dirty || saving}
                  >
                    {saving ? "Đang lưu..." : "Lưu công thức"}
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/** Panel "Cận hạn": liệt kê lô sắp/đã hết hạn (FEFO) + huỷ lô. */
function ExpiringPanel() {
  const [days, setDays] = useState(3);
  const [lots, setLots] = useState<ExpiringLot[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = async (d = days) => {
    setLoading(true); setErr(null);
    try {
      const res = await inventoryAPI.getExpiring(d);
      setLots(res.data.data || []);
    } catch (e: any) {
      setErr(e.response?.data?.message || "Lỗi tải danh sách cận hạn");
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const wasteLot = async (lot: ExpiringLot) => {
    const reason = window.prompt(
      `Lý do huỷ lô #${lot.lotId} — ${lot.ingredientName} (còn ${lot.remainingQty}):`,
      lot.expired ? "Hết hạn sử dụng" : "",
    );
    if (reason == null) return;
    if (!reason.trim()) { alert("Phải nhập lý do"); return; }
    try {
      await inventoryAPI.wasteLot(lot.lotId, reason.trim());
      load();
    } catch (e: any) {
      alert(e.response?.data?.message || "Lỗi huỷ lô");
    }
  };

  return (
    <div>
      <div className="filter-bar" style={{ marginBottom: 12 }}>
        <label style={{ marginRight: 8 }}>Trong vòng (ngày):</label>
        <select value={days} onChange={(e) => { const d = +e.target.value; setDays(d); load(d); }}>
          {[1, 3, 7, 14, 30].map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <button className="btn-secondary" onClick={() => load()} style={{ marginLeft: 8 }}>🔄 Tải lại</button>
      </div>
      {err && <div className="alert-error">{err}</div>}
      {loading && <div className="loading-state">Đang tải...</div>}
      <div className="staff-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Nguyên liệu</th>
              <th>Lô</th>
              <th>Còn lại</th>
              <th>Hạn sử dụng</th>
              <th>Còn (ngày)</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {lots.map((lot, idx) => (
              <tr key={lot.lotId} className={lot.expired ? "row-warning" : ""}>
                <td>{idx + 1}</td>
                <td><strong>{lot.ingredientName}</strong></td>
                <td><code>#{lot.lotId}</code></td>
                <td>{lot.remainingQty}</td>
                <td>{lot.expiryDate}</td>
                <td>{lot.daysUntilExpiry}</td>
                <td>
                  <span className={`status-badge ${lot.expired ? "inactive" : "active"}`}>
                    {lot.expired ? "❌ Hết hạn" : lot.daysUntilExpiry <= 1 ? "⚠️ Sắp hết hạn" : "🟡 Cận hạn"}
                  </span>
                </td>
                <td>
                  <button className="btn-small danger" onClick={() => wasteLot(lot)}>🗑️ Huỷ lô</button>
                </td>
              </tr>
            ))}
            {lots.length === 0 && !loading && (
              <tr>
                <td colSpan={8} className="empty-cell">Không có lô nào cận hạn trong {days} ngày</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function InventoryScreen() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"items" | "transactions" | "expiring" | "recipes">(
    "items",
  );
  const [modal, setModal] = useState<
    "create" | "edit" | "import" | "export" | null
  >(null);
  const [editItem, setEditItem] = useState<InventoryItem | undefined>();
  const [search, setSearch] = useState("");

  const lastAvailabilityEvent = useMenuAvailabilityStore((s) => s.lastEvent);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      // Try admin inventory endpoint; on 500 fall back to kitchen endpoint (MANAGER also has access)
      let loadedItems: InventoryItem[] = [];
      try {
        const itemRes = await inventoryAPI.listItems();
        loadedItems = itemRes.data.data;
      } catch (itemErr: any) {
        if (
          itemErr.response?.status === 500 ||
          itemErr.response?.status === 404
        ) {
          // Fallback: try kitchen endpoint (accessible to MANAGER+KITCHEN)
          try {
            const kitchenRes = await inventoryAPI.listItemsKitchen();
            loadedItems = kitchenRes.data.data;
          } catch {
            // Both endpoints failed — leave empty, show warning below
            loadedItems = [];
          }
        } else if (!itemErr.response) {
          throw itemErr; // Network error — bubble up
        }
      }
      setItems(loadedItems);

      // Transactions (no kitchen fallback available)
      try {
        const txRes = await inventoryAPI.listTransactions();
        setTransactions(txRes.data.data);
      } catch (txErr: any) {
        // Transactions 500 is non-fatal — show empty list
        setTransactions([]);
        if (txErr.response?.status === 500) {
          console.warn(
            "[InventoryScreen] /admin/inventory/transactions returned 500 — backend bug",
          );
        }
      }
    } catch (e: any) {
      if (!e.response) {
        setError(
          "Không thể kết nối đến máy chủ. Kiểm tra backend localhost:8080.",
        );
      } else if (e.response?.status === 500) {
        setError(
          `Lỗi máy chủ (500): ${e.response?.data?.message || "Backend đang gặp sự cố nội bộ — liên hệ dev backend."}`,
        );
      } else {
        setError(e.response?.data?.message || "Lỗi tải dữ liệu kho");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Auto-refresh when an ingredient delta arrives — covers manual reports and
  // imports done elsewhere (KDS / kitchen). Menu-item-only events are skipped
  // because they don't change ingredient quantities.
  useEffect(() => {
    if (!lastAvailabilityEvent) return;
    const t = lastAvailabilityEvent.trigger;
    if (
      t === "INGREDIENT_ADJUSTED" ||
      t === "INGREDIENT_MANUAL_REPORT" ||
      t === "INGREDIENT_IMPORTED"
    ) {
      load();
    }
  }, [lastAvailabilityEvent]);

  const deleteItem = async (i: InventoryItem) => {
    if (!confirm(`Xoá nguyên liệu "${i.name}"?`)) return;
    try {
      await inventoryAPI.removeItem(i.id);
      load();
    } catch (e: any) {
      alert(e.response?.data?.message || "Lỗi xoá");
    }
  };

  const lowStock = items.filter((i) => i.currentStock <= i.minStock);
  const filteredItems = items.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="screen">
      <header className="screen-header">
        <div>
          <h2>
            Quản lý <span>Kho hàng</span>
          </h2>
          <p>
            {items.length} nguyên liệu
            {lowStock.length > 0 ? ` · ⚠️ ${lowStock.length} sắp hết` : ""}
          </p>
        </div>
        <div className="header-actions">
          <button className="btn-secondary" onClick={() => setModal("import")}>
            📥 Nhập kho
          </button>
          <button className="btn-secondary" onClick={() => setModal("export")}>
            📤 Xuất kho
          </button>
          <button
            className="btn-primary"
            onClick={() => {
              setModal("create");
              setEditItem(undefined);
            }}
          >
            + Thêm nguyên liệu
          </button>
        </div>
      </header>

      {error && <div className="alert-error">{error}</div>}

      {lowStock.length > 0 && (
        <div className="low-stock-alert">
          ⚠️ Nguyên liệu sắp hết: {lowStock.map((i) => i.name).join(", ")}
        </div>
      )}

      <div className="inv-tabs">
        <button
          className={`inv-tab ${tab === "items" ? "active" : ""}`}
          onClick={() => setTab("items")}
        >
          Danh sách nguyên liệu
        </button>
        <button
          className={`inv-tab ${tab === "transactions" ? "active" : ""}`}
          onClick={() => setTab("transactions")}
        >
          Lịch sử giao dịch
        </button>
        <button
          className={`inv-tab ${tab === "expiring" ? "active" : ""}`}
          onClick={() => setTab("expiring")}
        >
          ⏰ Cận hạn
        </button>
        <button
          className={`inv-tab ${tab === "recipes" ? "active" : ""}`}
          onClick={() => setTab("recipes")}
        >
          🍳 Nguyên liệu theo món
        </button>
      </div>

      {tab === "items" && (
        <>
          <input
            className="search-input"
            placeholder="🔍 Tìm nguyên liệu..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ marginBottom: 12 }}
          />
          {loading && <div className="loading-state">Đang tải...</div>}
          {!loading && items.length === 0 ? (
            <div className="inv-empty-hero">
              <div className="inv-empty-icon">📦</div>
              <h3>Chưa có nguyên liệu nào trong kho</h3>
              <p>
                Bắt đầu thêm nguyên liệu để theo dõi tồn kho, cảnh báo sắp hết
                và liên kết với thực đơn sau này.
              </p>
              <div className="inv-empty-actions">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => {
                    setModal("create");
                    setEditItem(undefined);
                  }}
                >
                  ＋ Thêm nguyên liệu đầu tiên
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setModal("import")}
                >
                  📥 Nhập từ kho (phiếu nhập)
                </button>
              </div>
            </div>
          ) : (
            <div className="staff-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Tên nguyên liệu</th>
                    <th>Đơn vị</th>
                    <th>Tồn hiện tại</th>
                    <th>Tối thiểu</th>
                    <th>Trạng thái</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item, idx) => {
                    const isLow = item.currentStock <= item.minStock;
                    return (
                      <tr key={item.id} className={isLow ? "row-warning" : ""}>
                        <td>{idx + 1}</td>
                        <td>
                          <strong>{item.name}</strong>
                        </td>
                        <td>{item.unit}</td>
                        <td>{item.currentStock}</td>
                        <td>{item.minStock}</td>
                        <td>
                          <span
                            className={`status-badge ${isLow ? "inactive" : "active"}`}
                          >
                            {isLow ? "⚠️ Sắp hết" : "✅ Đủ"}
                          </span>
                        </td>
                        <td>
                          <div className="row-actions">
                            <button
                              type="button"
                              className="btn-small"
                              onClick={() => {
                                setEditItem(item);
                                setModal("edit");
                              }}
                            >
                              ✏️ Sửa
                            </button>
                            <button
                              type="button"
                              className="btn-small danger"
                              onClick={() => deleteItem(item)}
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredItems.length === 0 &&
                    !loading &&
                    items.length > 0 && (
                      <tr>
                        <td colSpan={7} className="empty-cell">
                          Không có nguyên liệu khớp tìm kiếm.
                        </td>
                      </tr>
                    )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {tab === "transactions" && (
        <div className="staff-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Nguyên liệu</th>
                <th>Loại</th>
                <th>Số lượng</th>
                <th>Ghi chú</th>
                <th>Thời gian</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx, idx) => (
                <tr key={tx.id}>
                  <td>{idx + 1}</td>
                  <td>{tx.itemName}</td>
                  <td>
                    <span className={`tx-badge ${tx.type.toLowerCase()}`}>
                      {tx.type === "IMPORT"
                        ? "📥 Nhập"
                        : tx.type === "EXPORT"
                          ? "📤 Xuất"
                          : "⚙️ Điều chỉnh"}
                    </span>
                  </td>
                  <td>{tx.quantity}</td>
                  <td>{tx.note || "—"}</td>
                  <td>{fmtDateTime(tx.createdAt)}</td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={6} className="empty-cell">
                    Chưa có giao dịch nào
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === "expiring" && <ExpiringPanel />}

      {tab === "recipes" && <RecipeManager items={items} />}

      {(modal === "create" || modal === "edit") && (
        <Modal
          title={modal === "create" ? "Thêm nguyên liệu" : "Sửa nguyên liệu"}
          onClose={() => setModal(null)}
        >
          <ItemForm
            initial={editItem}
            onSave={() => {
              setModal(null);
              load();
            }}
            onClose={() => setModal(null)}
          />
        </Modal>
      )}
      {modal === "import" && (
        <Modal title="Nhập kho" onClose={() => setModal(null)}>
          <TransactionForm
            items={items}
            type="import"
            onSave={() => {
              setModal(null);
              load();
            }}
            onClose={() => setModal(null)}
          />
        </Modal>
      )}
      {modal === "export" && (
        <Modal title="Xuất kho" onClose={() => setModal(null)}>
          <TransactionForm
            items={items}
            type="export"
            onSave={() => {
              setModal(null);
              load();
            }}
            onClose={() => setModal(null)}
          />
        </Modal>
      )}
    </div>
  );
}

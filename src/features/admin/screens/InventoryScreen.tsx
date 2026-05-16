import { useState, useEffect } from "react";
import { inventoryAPI } from "@/api/endpoints";
import { InventoryItem, InventoryTransaction } from "@/types";
import { fmtDateTime } from "@/utils/format";

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
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    if (!itemId) {
      setErr("Chọn nguyên liệu");
      return;
    }
    if (quantity <= 0) {
      setErr("Số lượng phải lớn hơn 0");
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      const data = { itemId, quantity, note: note || undefined };
      if (type === "import") await inventoryAPI.importStock(data);
      else await inventoryAPI.exportStock(data);
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

export function InventoryScreen() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"items" | "transactions">("items");
  const [modal, setModal] = useState<
    "create" | "edit" | "import" | "export" | null
  >(null);
  const [editItem, setEditItem] = useState<InventoryItem | undefined>();
  const [search, setSearch] = useState("");

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

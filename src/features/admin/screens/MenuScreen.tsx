import { useState, useEffect } from "react";
import { categoryAPI, menuItemAPI } from "@/api/endpoints";
import {
  ManagerMenuCategoryListItemResponse,
  MenuItemResponse,
  CreateMenuItemRequest,
  CreateCategoryRequest,
} from "@/types";

function fmtVnd(n: number) {
  return new Intl.NumberFormat("vi-VN").format(n) + "đ";
}

// ─── Modal ─────────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
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

// ─── Menu Item Form ─────────────────────────────────────────────────────────────
function MenuItemForm({ initial, categories, onSave, onClose }: {
  initial?: MenuItemResponse;
  categories: ManagerMenuCategoryListItemResponse[];
  onSave: () => void;
  onClose: () => void;
}) {
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? (categories[0]?.id || 0));
  const [name, setName] = useState(initial?.name ?? "");
  const [desc, setDesc] = useState(initial?.description ?? "");
  const [price, setPrice] = useState(initial?.price ?? 0);
  const [cookTime, setCookTime] = useState(initial?.cookTime ?? 5);
  const [itemType, setItemType] = useState<"SINGLE" | "COMBO">(initial?.itemType ?? "SINGLE");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [savedItemId, setSavedItemId] = useState<number | null>(initial?.id ?? null);

  const submit = async () => {
    if (!name.trim()) { setErr("Tên món không được trống"); return; }
    if (!categoryId) { setErr("Chọn danh mục"); return; }
    if (price <= 0) { setErr("Giá phải lớn hơn 0"); return; }
    setLoading(true); setErr(null);
    try {
      const data: CreateMenuItemRequest = {
        categoryId, name: name.trim(),
        description: desc || null, price, cookTime,
        itemType, imageUrl: initial?.imageUrl ?? null,
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
        await menuItemAPI.uploadImage(itemId, imageFile);
      }
      onSave();
    } catch (e: any) {
      setErr(e.response?.data?.message || "Lỗi lưu món ăn");
    } finally { setLoading(false); }
  };

  return (
    <>
      {err && <div className="form-err">{err}</div>}
      <div className="form-row">
        <div className="form-group">
          <label>Danh mục *</label>
          <select value={categoryId} onChange={e => setCategoryId(+e.target.value)}>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Loại món</label>
          <select value={itemType} onChange={e => setItemType(e.target.value as "SINGLE" | "COMBO")}>
            <option value="SINGLE">Đơn</option>
            <option value="COMBO">Combo</option>
          </select>
        </div>
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
          <label>Giá (đ) *</label>
          <input type="number" value={price} onChange={e => setPrice(+e.target.value)} />
        </div>
        <div className="form-group">
          <label>Thời gian nấu (phút)</label>
          <input type="number" value={cookTime} onChange={e => setCookTime(+e.target.value)} />
        </div>
      </div>
      <div className="form-group">
        <label>Ảnh món ăn</label>
        <input type="file" accept="image/jpeg,image/png,image/webp"
          onChange={e => setImageFile(e.target.files?.[0] ?? null)} />
        {initial?.imageUrl && (
          <img src={initial.imageUrl} alt="preview" className="img-preview" />
        )}
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
    return matchCat && matchSearch;
  });

  return (
    <div className="screen">
      <header className="screen-header">
        <div>
          <h2>Quản lý <span>Menu</span></h2>
          <p>{items.length} món · {categories.length} danh mục</p>
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
          {loading && <div className="loading-state">Đang tải...</div>}
          <div className="item-grid">
            {filteredItems.map(item => (
              <div key={item.id} className="item-card">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.name} className="item-img" />
                ) : (
                  <div className="item-img-placeholder">🍽️</div>
                )}
                <div className="item-info">
                  <div className="item-header">
                    <strong>{item.name}</strong>
                    <span className={`item-type-badge ${item.itemType.toLowerCase()}`}>{item.itemType}</span>
                  </div>
                  <small>{item.description || "Không có mô tả"}</small>
                  <div className="item-footer">
                    <b className="item-price">{fmtVnd(item.price)}</b>
                    <div className="item-actions">
                      <button title="Sửa" onClick={() => { setEditItem(item); setItemModal("edit"); }}>✏️</button>
                      <button title="Xoá" onClick={() => deleteItem(item)}>🗑️</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
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
        <Modal title={itemModal === "create" ? "Thêm món mới" : "Sửa món ăn"} onClose={() => setItemModal(null)}>
          <MenuItemForm initial={editItem} categories={categories}
            onSave={() => { setItemModal(null); load(); }} onClose={() => setItemModal(null)} />
        </Modal>
      )}
    </div>
  );
}

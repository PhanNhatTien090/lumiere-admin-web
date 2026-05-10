import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { categoryAPI, menuItemAPI } from "@/api/endpoints";
function fmtVnd(n) {
    return new Intl.NumberFormat("vi-VN").format(n) + "đ";
}
// ─── Modal ─────────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
    return (_jsx("div", { className: "modal-overlay", onClick: onClose, children: _jsxs("div", { className: "modal-box", onClick: e => e.stopPropagation(), children: [_jsxs("div", { className: "modal-header", children: [_jsx("h3", { children: title }), _jsx("button", { className: "modal-close", onClick: onClose, children: "\u2715" })] }), children] }) }));
}
// ─── Category Form ─────────────────────────────────────────────────────────────
function CategoryForm({ initial, onSave, onClose }) {
    const [name, setName] = useState(initial?.name ?? "");
    const [desc, setDesc] = useState(initial?.description ?? "");
    const [order, setOrder] = useState(initial?.displayOrder ?? 0);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState(null);
    const submit = async () => {
        if (!name.trim()) {
            setErr("Tên danh mục không được trống");
            return;
        }
        setLoading(true);
        setErr(null);
        try {
            const data = { name: name.trim(), description: desc || null, displayOrder: order };
            if (initial)
                await categoryAPI.update(initial.id, data);
            else
                await categoryAPI.create(data);
            onSave();
        }
        catch (e) {
            setErr(e.response?.data?.message || "Lỗi lưu danh mục");
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsxs(_Fragment, { children: [err && _jsx("div", { className: "form-err", children: err }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "T\u00EAn danh m\u1EE5c *" }), _jsx("input", { value: name, onChange: e => setName(e.target.value), placeholder: "VD: Khai v\u1ECB" })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "M\u00F4 t\u1EA3" }), _jsx("input", { value: desc, onChange: e => setDesc(e.target.value), placeholder: "M\u00F4 t\u1EA3 ng\u1EAFn..." })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Th\u1EE9 t\u1EF1 hi\u1EC3n th\u1ECB" }), _jsx("input", { type: "number", value: order, onChange: e => setOrder(+e.target.value) })] }), _jsxs("div", { className: "form-actions", children: [_jsx("button", { className: "btn-secondary", onClick: onClose, children: "Hu\u1EF7" }), _jsx("button", { className: "btn-primary", onClick: submit, disabled: loading, children: loading ? "Đang lưu..." : initial ? "Cập nhật" : "Tạo mới" })] })] }));
}
// ─── Menu Item Form ─────────────────────────────────────────────────────────────
function MenuItemForm({ initial, categories, onSave, onClose }) {
    const [categoryId, setCategoryId] = useState(initial?.categoryId ?? (categories[0]?.id || 0));
    const [name, setName] = useState(initial?.name ?? "");
    const [desc, setDesc] = useState(initial?.description ?? "");
    const [price, setPrice] = useState(initial?.price ?? 0);
    const [cookTime, setCookTime] = useState(initial?.cookTime ?? 5);
    const [itemType, setItemType] = useState(initial?.itemType ?? "SINGLE");
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState(null);
    const [imageFile, setImageFile] = useState(null);
    const [savedItemId, setSavedItemId] = useState(initial?.id ?? null);
    const submit = async () => {
        if (!name.trim()) {
            setErr("Tên món không được trống");
            return;
        }
        if (!categoryId) {
            setErr("Chọn danh mục");
            return;
        }
        if (price <= 0) {
            setErr("Giá phải lớn hơn 0");
            return;
        }
        setLoading(true);
        setErr(null);
        try {
            const data = {
                categoryId, name: name.trim(),
                description: desc || null, price, cookTime,
                itemType, imageUrl: initial?.imageUrl ?? null,
            };
            let itemId = savedItemId;
            if (initial) {
                await menuItemAPI.update(initial.id, data);
                itemId = initial.id;
            }
            else {
                const res = await menuItemAPI.create(data);
                itemId = res.data.data.id;
                setSavedItemId(itemId);
            }
            if (imageFile && itemId) {
                await menuItemAPI.uploadImage(itemId, imageFile);
            }
            onSave();
        }
        catch (e) {
            setErr(e.response?.data?.message || "Lỗi lưu món ăn");
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsxs(_Fragment, { children: [err && _jsx("div", { className: "form-err", children: err }), _jsxs("div", { className: "form-row", children: [_jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Danh m\u1EE5c *" }), _jsx("select", { value: categoryId, onChange: e => setCategoryId(+e.target.value), children: categories.map(c => _jsx("option", { value: c.id, children: c.name }, c.id)) })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Lo\u1EA1i m\u00F3n" }), _jsxs("select", { value: itemType, onChange: e => setItemType(e.target.value), children: [_jsx("option", { value: "SINGLE", children: "\u0110\u01A1n" }), _jsx("option", { value: "COMBO", children: "Combo" })] })] })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "T\u00EAn m\u00F3n *" }), _jsx("input", { value: name, onChange: e => setName(e.target.value), placeholder: "VD: G\u1ECFi Cu\u1ED1n T\u00F4m" })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "M\u00F4 t\u1EA3" }), _jsx("input", { value: desc, onChange: e => setDesc(e.target.value), placeholder: "M\u00F4 t\u1EA3 ng\u1EAFn..." })] }), _jsxs("div", { className: "form-row", children: [_jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Gi\u00E1 (\u0111) *" }), _jsx("input", { type: "number", value: price, onChange: e => setPrice(+e.target.value) })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Th\u1EDDi gian n\u1EA5u (ph\u00FAt)" }), _jsx("input", { type: "number", value: cookTime, onChange: e => setCookTime(+e.target.value) })] })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "\u1EA2nh m\u00F3n \u0103n" }), _jsx("input", { type: "file", accept: "image/jpeg,image/png,image/webp", onChange: e => setImageFile(e.target.files?.[0] ?? null) }), initial?.imageUrl && (_jsx("img", { src: initial.imageUrl, alt: "preview", className: "img-preview" }))] }), _jsxs("div", { className: "form-actions", children: [_jsx("button", { className: "btn-secondary", onClick: onClose, children: "Hu\u1EF7" }), _jsx("button", { className: "btn-primary", onClick: submit, disabled: loading, children: loading ? "Đang lưu..." : initial ? "Cập nhật" : "Tạo mới" })] })] }));
}
// ─── Main MenuScreen ───────────────────────────────────────────────────────────
export function MenuScreen() {
    const [categories, setCategories] = useState([]);
    const [items, setItems] = useState([]);
    const [selectedCat, setSelectedCat] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [catModal, setCatModal] = useState(null);
    const [editCat, setEditCat] = useState();
    const [itemModal, setItemModal] = useState(null);
    const [editItem, setEditItem] = useState();
    const [search, setSearch] = useState("");
    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            const catRes = await categoryAPI.list();
            const cats = catRes.data.data;
            setCategories(cats);
            if (cats.length > 0) {
                const itemResults = await Promise.all(cats.map(c => menuItemAPI.list(c.id)));
                setItems(itemResults.flatMap(r => r.data.data));
            }
            else {
                setItems([]);
            }
        }
        catch (e) {
            if (!e.response) {
                setError("Không thể kết nối đến máy chủ. Kiểm tra backend localhost:8080.");
            }
            else if (e.response?.status === 500) {
                setError(`Lỗi máy chủ (500): ${e.response?.data?.message || "Backend đang gặp sự cố nội bộ"}`);
            }
            else {
                setError(e.response?.data?.message || "Lỗi tải dữ liệu menu");
            }
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => { load(); }, []);
    const deleteCategory = async (cat) => {
        if (!confirm(`Xoá danh mục "${cat.name}"? Các món trong danh mục cũng sẽ bị ảnh hưởng.`))
            return;
        try {
            await categoryAPI.remove(cat.id);
            load();
        }
        catch (e) {
            alert(e.response?.data?.message || "Lỗi xoá danh mục");
        }
    };
    const deleteItem = async (item) => {
        if (!confirm(`Xoá món "${item.name}"?`))
            return;
        try {
            await menuItemAPI.remove(item.id);
            load();
        }
        catch (e) {
            alert(e.response?.data?.message || "Lỗi xoá món");
        }
    };
    const filteredItems = items.filter(item => {
        const matchCat = selectedCat === null || item.categoryId === selectedCat;
        const matchSearch = item.name.toLowerCase().includes(search.toLowerCase());
        return matchCat && matchSearch;
    });
    return (_jsxs("div", { className: "screen", children: [_jsxs("header", { className: "screen-header", children: [_jsxs("div", { children: [_jsxs("h2", { children: ["Qu\u1EA3n l\u00FD ", _jsx("span", { children: "Menu" })] }), _jsxs("p", { children: [items.length, " m\u00F3n \u00B7 ", categories.length, " danh m\u1EE5c"] })] }), _jsxs("div", { className: "header-actions", children: [_jsx("button", { className: "btn-secondary", onClick: () => { setCatModal("create"); setEditCat(undefined); }, children: "+ Danh m\u1EE5c" }), _jsx("button", { className: "btn-primary", onClick: () => { setItemModal("create"); setEditItem(undefined); }, children: "+ Th\u00EAm m\u00F3n" })] })] }), error && _jsx("div", { className: "alert-error", children: error }), _jsxs("div", { className: "menu-layout", children: [_jsxs("div", { className: "cat-sidebar", children: [_jsx("h4", { children: "Danh m\u1EE5c" }), _jsxs("button", { className: `cat-btn ${selectedCat === null ? "active" : ""}`, onClick: () => setSelectedCat(null), children: ["T\u1EA5t c\u1EA3 (", items.length, ")"] }), categories.map(cat => {
                                const count = items.filter(i => i.categoryId === cat.id).length;
                                return (_jsxs("div", { className: "cat-row", children: [_jsxs("button", { className: `cat-btn ${selectedCat === cat.id ? "active" : ""}`, onClick: () => setSelectedCat(cat.id), children: [cat.name, " (", count, ")"] }), _jsxs("div", { className: "cat-actions", children: [_jsx("button", { title: "S\u1EEDa", onClick: () => { setEditCat(cat); setCatModal("edit"); }, children: "\u270F\uFE0F" }), _jsx("button", { title: "Xo\u00E1", onClick: () => deleteCategory(cat), children: "\uD83D\uDDD1\uFE0F" })] })] }, cat.id));
                            })] }), _jsxs("div", { className: "item-area", children: [_jsx("input", { className: "search-input", placeholder: "\uD83D\uDD0D T\u00ECm ki\u1EBFm m\u00F3n...", value: search, onChange: e => setSearch(e.target.value) }), loading && _jsx("div", { className: "loading-state", children: "\u0110ang t\u1EA3i..." }), _jsxs("div", { className: "item-grid", children: [filteredItems.map(item => (_jsxs("div", { className: "item-card", children: [item.imageUrl ? (_jsx("img", { src: item.imageUrl, alt: item.name, className: "item-img" })) : (_jsx("div", { className: "item-img-placeholder", children: "\uD83C\uDF7D\uFE0F" })), _jsxs("div", { className: "item-info", children: [_jsxs("div", { className: "item-header", children: [_jsx("strong", { children: item.name }), _jsx("span", { className: `item-type-badge ${item.itemType.toLowerCase()}`, children: item.itemType })] }), _jsx("small", { children: item.description || "Không có mô tả" }), _jsxs("div", { className: "item-footer", children: [_jsx("b", { className: "item-price", children: fmtVnd(item.price) }), _jsxs("div", { className: "item-actions", children: [_jsx("button", { title: "S\u1EEDa", onClick: () => { setEditItem(item); setItemModal("edit"); }, children: "\u270F\uFE0F" }), _jsx("button", { title: "Xo\u00E1", onClick: () => deleteItem(item), children: "\uD83D\uDDD1\uFE0F" })] })] })] })] }, item.id))), filteredItems.length === 0 && !loading && (_jsx("div", { className: "empty-state", children: "Kh\u00F4ng c\u00F3 m\u00F3n n\u00E0o ph\u00F9 h\u1EE3p" }))] })] })] }), catModal && (_jsx(Modal, { title: catModal === "create" ? "Tạo danh mục mới" : "Sửa danh mục", onClose: () => setCatModal(null), children: _jsx(CategoryForm, { initial: editCat, onSave: () => { setCatModal(null); load(); }, onClose: () => setCatModal(null) }) })), itemModal && (_jsx(Modal, { title: itemModal === "create" ? "Thêm món mới" : "Sửa món ăn", onClose: () => setItemModal(null), children: _jsx(MenuItemForm, { initial: editItem, categories: categories, onSave: () => { setItemModal(null); load(); }, onClose: () => setItemModal(null) }) }))] }));
}

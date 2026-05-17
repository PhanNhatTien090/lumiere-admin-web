import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { inventoryAPI } from "@/api/endpoints";
import { fmtDateTime } from "@/utils/format";
function Modal({ title, onClose, children, }) {
    return (_jsx("div", { className: "modal-overlay", onClick: onClose, children: _jsxs("div", { className: "modal-box", onClick: (e) => e.stopPropagation(), children: [_jsxs("div", { className: "modal-header", children: [_jsx("h3", { children: title }), _jsx("button", { className: "modal-close", onClick: onClose, children: "\u2715" })] }), children] }) }));
}
function ItemForm({ initial, onSave, onClose, }) {
    const unitOptions = [
        { value: "G", label: "Gram (g)" },
        { value: "ML", label: "Milliliter (ml)" },
        { value: "UNIT", label: "Đơn vị (unit)" },
    ];
    const [name, setName] = useState(initial?.name ?? "");
    const [unit, setUnit] = useState(initial?.unit ?? "G");
    const [minStock, setMinStock] = useState(initial?.minStock ?? 0);
    const [currentStock, setCurrentStock] = useState(initial?.currentStock ?? 0);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState(null);
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
            }
            else {
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
        }
        catch (e) {
            setErr(e.response?.data?.message || "Lỗi lưu nguyên liệu");
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsxs(_Fragment, { children: [err && _jsx("div", { className: "form-err", children: err }), _jsxs("div", { className: "form-row", children: [_jsxs("div", { className: "form-group", children: [_jsx("label", { children: "T\u00EAn nguy\u00EAn li\u1EC7u *" }), _jsx("input", { value: name, onChange: (e) => setName(e.target.value), placeholder: "VD: C\u00E0 chua" })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "\u0110\u01A1n v\u1ECB *" }), _jsx("select", { value: unit, onChange: (e) => setUnit(e.target.value), children: unitOptions.map((opt) => (_jsx("option", { value: opt.value, children: opt.label }, opt.value))) })] })] }), _jsxs("div", { className: "form-row", children: [_jsxs("div", { className: "form-group", children: [_jsx("label", { children: "T\u1ED3n kho hi\u1EC7n t\u1EA1i" }), _jsx("input", { type: "number", value: currentStock, onChange: (e) => setCurrentStock(+e.target.value), min: 0 })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "T\u1ED3n kho t\u1ED1i thi\u1EC3u" }), _jsx("input", { type: "number", value: minStock, onChange: (e) => setMinStock(+e.target.value), min: 0 })] })] }), _jsxs("div", { className: "form-actions", children: [_jsx("button", { className: "btn-secondary", onClick: onClose, children: "Hu\u1EF7" }), _jsx("button", { className: "btn-primary", onClick: submit, disabled: loading, children: loading ? "Đang lưu..." : initial ? "Cập nhật" : "Thêm nguyên liệu" })] })] }));
}
function TransactionForm({ items, type, onSave, onClose, }) {
    const [itemId, setItemId] = useState(items[0]?.id ?? 0);
    const [quantity, setQuantity] = useState(1);
    const [note, setNote] = useState("");
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState(null);
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
            if (type === "import")
                await inventoryAPI.importStock(data);
            else
                await inventoryAPI.exportStock(data);
            onSave();
        }
        catch (e) {
            setErr(e.response?.data?.message || "Lỗi giao dịch kho");
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsxs(_Fragment, { children: [err && _jsx("div", { className: "form-err", children: err }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Nguy\u00EAn li\u1EC7u" }), _jsx("select", { value: itemId, onChange: (e) => setItemId(+e.target.value), children: items.map((i) => (_jsxs("option", { value: i.id, children: [i.name, " (", i.unit, ")"] }, i.id))) })] }), _jsxs("div", { className: "form-row", children: [_jsxs("div", { className: "form-group", children: [_jsx("label", { children: "S\u1ED1 l\u01B0\u1EE3ng" }), _jsx("input", { type: "number", value: quantity, onChange: (e) => setQuantity(+e.target.value), min: 1 })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Ghi ch\u00FA" }), _jsx("input", { value: note, onChange: (e) => setNote(e.target.value), placeholder: "L\u00FD do nh\u1EADp/xu\u1EA5t..." })] })] }), _jsxs("div", { className: "form-actions", children: [_jsx("button", { className: "btn-secondary", onClick: onClose, children: "Hu\u1EF7" }), _jsx("button", { className: "btn-primary", onClick: submit, disabled: loading, children: loading
                            ? "Đang xử lý..."
                            : type === "import"
                                ? "Nhập kho"
                                : "Xuất kho" })] })] }));
}
export function InventoryScreen() {
    const [items, setItems] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [tab, setTab] = useState("items");
    const [modal, setModal] = useState(null);
    const [editItem, setEditItem] = useState();
    const [search, setSearch] = useState("");
    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            // Try admin inventory endpoint; on 500 fall back to kitchen endpoint (MANAGER also has access)
            let loadedItems = [];
            try {
                const itemRes = await inventoryAPI.listItems();
                loadedItems = itemRes.data.data;
            }
            catch (itemErr) {
                if (itemErr.response?.status === 500 ||
                    itemErr.response?.status === 404) {
                    // Fallback: try kitchen endpoint (accessible to MANAGER+KITCHEN)
                    try {
                        const kitchenRes = await inventoryAPI.listItemsKitchen();
                        loadedItems = kitchenRes.data.data;
                    }
                    catch {
                        // Both endpoints failed — leave empty, show warning below
                        loadedItems = [];
                    }
                }
                else if (!itemErr.response) {
                    throw itemErr; // Network error — bubble up
                }
            }
            setItems(loadedItems);
            // Transactions (no kitchen fallback available)
            try {
                const txRes = await inventoryAPI.listTransactions();
                setTransactions(txRes.data.data);
            }
            catch (txErr) {
                // Transactions 500 is non-fatal — show empty list
                setTransactions([]);
                if (txErr.response?.status === 500) {
                    console.warn("[InventoryScreen] /admin/inventory/transactions returned 500 — backend bug");
                }
            }
        }
        catch (e) {
            if (!e.response) {
                setError("Không thể kết nối đến máy chủ. Kiểm tra backend localhost:8080.");
            }
            else if (e.response?.status === 500) {
                setError(`Lỗi máy chủ (500): ${e.response?.data?.message || "Backend đang gặp sự cố nội bộ — liên hệ dev backend."}`);
            }
            else {
                setError(e.response?.data?.message || "Lỗi tải dữ liệu kho");
            }
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        load();
    }, []);
    const deleteItem = async (i) => {
        if (!confirm(`Xoá nguyên liệu "${i.name}"?`))
            return;
        try {
            await inventoryAPI.removeItem(i.id);
            load();
        }
        catch (e) {
            alert(e.response?.data?.message || "Lỗi xoá");
        }
    };
    const lowStock = items.filter((i) => i.currentStock <= i.minStock);
    const filteredItems = items.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()));
    return (_jsxs("div", { className: "screen", children: [_jsxs("header", { className: "screen-header", children: [_jsxs("div", { children: [_jsxs("h2", { children: ["Qu\u1EA3n l\u00FD ", _jsx("span", { children: "Kho h\u00E0ng" })] }), _jsxs("p", { children: [items.length, " nguy\u00EAn li\u1EC7u", lowStock.length > 0 ? ` · ⚠️ ${lowStock.length} sắp hết` : ""] })] }), _jsxs("div", { className: "header-actions", children: [_jsx("button", { className: "btn-secondary", onClick: () => setModal("import"), children: "\uD83D\uDCE5 Nh\u1EADp kho" }), _jsx("button", { className: "btn-secondary", onClick: () => setModal("export"), children: "\uD83D\uDCE4 Xu\u1EA5t kho" }), _jsx("button", { className: "btn-primary", onClick: () => {
                                    setModal("create");
                                    setEditItem(undefined);
                                }, children: "+ Th\u00EAm nguy\u00EAn li\u1EC7u" })] })] }), error && _jsx("div", { className: "alert-error", children: error }), lowStock.length > 0 && (_jsxs("div", { className: "low-stock-alert", children: ["\u26A0\uFE0F Nguy\u00EAn li\u1EC7u s\u1EAFp h\u1EBFt: ", lowStock.map((i) => i.name).join(", ")] })), _jsxs("div", { className: "inv-tabs", children: [_jsx("button", { className: `inv-tab ${tab === "items" ? "active" : ""}`, onClick: () => setTab("items"), children: "Danh s\u00E1ch nguy\u00EAn li\u1EC7u" }), _jsx("button", { className: `inv-tab ${tab === "transactions" ? "active" : ""}`, onClick: () => setTab("transactions"), children: "L\u1ECBch s\u1EED giao d\u1ECBch" })] }), tab === "items" && (_jsxs(_Fragment, { children: [_jsx("input", { className: "search-input", placeholder: "\uD83D\uDD0D T\u00ECm nguy\u00EAn li\u1EC7u...", value: search, onChange: (e) => setSearch(e.target.value), style: { marginBottom: 12 } }), loading && _jsx("div", { className: "loading-state", children: "\u0110ang t\u1EA3i..." }), !loading && items.length === 0 ? (_jsxs("div", { className: "inv-empty-hero", children: [_jsx("div", { className: "inv-empty-icon", children: "\uD83D\uDCE6" }), _jsx("h3", { children: "Ch\u01B0a c\u00F3 nguy\u00EAn li\u1EC7u n\u00E0o trong kho" }), _jsx("p", { children: "B\u1EAFt \u0111\u1EA7u th\u00EAm nguy\u00EAn li\u1EC7u \u0111\u1EC3 theo d\u00F5i t\u1ED3n kho, c\u1EA3nh b\u00E1o s\u1EAFp h\u1EBFt v\u00E0 li\u00EAn k\u1EBFt v\u1EDBi th\u1EF1c \u0111\u01A1n sau n\u00E0y." }), _jsxs("div", { className: "inv-empty-actions", children: [_jsx("button", { type: "button", className: "btn-primary", onClick: () => {
                                            setModal("create");
                                            setEditItem(undefined);
                                        }, children: "\uFF0B Th\u00EAm nguy\u00EAn li\u1EC7u \u0111\u1EA7u ti\u00EAn" }), _jsx("button", { type: "button", className: "btn-secondary", onClick: () => setModal("import"), children: "\uD83D\uDCE5 Nh\u1EADp t\u1EEB kho (phi\u1EBFu nh\u1EADp)" })] })] })) : (_jsx("div", { className: "staff-table-wrap", children: _jsxs("table", { className: "data-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "#" }), _jsx("th", { children: "T\u00EAn nguy\u00EAn li\u1EC7u" }), _jsx("th", { children: "\u0110\u01A1n v\u1ECB" }), _jsx("th", { children: "T\u1ED3n hi\u1EC7n t\u1EA1i" }), _jsx("th", { children: "T\u1ED1i thi\u1EC3u" }), _jsx("th", { children: "Tr\u1EA1ng th\u00E1i" }), _jsx("th", { children: "Thao t\u00E1c" })] }) }), _jsxs("tbody", { children: [filteredItems.map((item, idx) => {
                                            const isLow = item.currentStock <= item.minStock;
                                            return (_jsxs("tr", { className: isLow ? "row-warning" : "", children: [_jsx("td", { children: idx + 1 }), _jsx("td", { children: _jsx("strong", { children: item.name }) }), _jsx("td", { children: item.unit }), _jsx("td", { children: item.currentStock }), _jsx("td", { children: item.minStock }), _jsx("td", { children: _jsx("span", { className: `status-badge ${isLow ? "inactive" : "active"}`, children: isLow ? "⚠️ Sắp hết" : "✅ Đủ" }) }), _jsx("td", { children: _jsxs("div", { className: "row-actions", children: [_jsx("button", { type: "button", className: "btn-small", onClick: () => {
                                                                        setEditItem(item);
                                                                        setModal("edit");
                                                                    }, children: "\u270F\uFE0F S\u1EEDa" }), _jsx("button", { type: "button", className: "btn-small danger", onClick: () => deleteItem(item), children: "\uD83D\uDDD1\uFE0F" })] }) })] }, item.id));
                                        }), filteredItems.length === 0 &&
                                            !loading &&
                                            items.length > 0 && (_jsx("tr", { children: _jsx("td", { colSpan: 7, className: "empty-cell", children: "Kh\u00F4ng c\u00F3 nguy\u00EAn li\u1EC7u kh\u1EDBp t\u00ECm ki\u1EBFm." }) }))] })] }) }))] })), tab === "transactions" && (_jsx("div", { className: "staff-table-wrap", children: _jsxs("table", { className: "data-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "#" }), _jsx("th", { children: "Nguy\u00EAn li\u1EC7u" }), _jsx("th", { children: "Lo\u1EA1i" }), _jsx("th", { children: "S\u1ED1 l\u01B0\u1EE3ng" }), _jsx("th", { children: "Ghi ch\u00FA" }), _jsx("th", { children: "Th\u1EDDi gian" })] }) }), _jsxs("tbody", { children: [transactions.map((tx, idx) => (_jsxs("tr", { children: [_jsx("td", { children: idx + 1 }), _jsx("td", { children: tx.itemName }), _jsx("td", { children: _jsx("span", { className: `tx-badge ${tx.type.toLowerCase()}`, children: tx.type === "IMPORT"
                                                    ? "📥 Nhập"
                                                    : tx.type === "EXPORT"
                                                        ? "📤 Xuất"
                                                        : "⚙️ Điều chỉnh" }) }), _jsx("td", { children: tx.quantity }), _jsx("td", { children: tx.note || "—" }), _jsx("td", { children: fmtDateTime(tx.createdAt) })] }, tx.id))), transactions.length === 0 && (_jsx("tr", { children: _jsx("td", { colSpan: 6, className: "empty-cell", children: "Ch\u01B0a c\u00F3 giao d\u1ECBch n\u00E0o" }) }))] })] }) })), (modal === "create" || modal === "edit") && (_jsx(Modal, { title: modal === "create" ? "Thêm nguyên liệu" : "Sửa nguyên liệu", onClose: () => setModal(null), children: _jsx(ItemForm, { initial: editItem, onSave: () => {
                        setModal(null);
                        load();
                    }, onClose: () => setModal(null) }) })), modal === "import" && (_jsx(Modal, { title: "Nh\u1EADp kho", onClose: () => setModal(null), children: _jsx(TransactionForm, { items: items, type: "import", onSave: () => {
                        setModal(null);
                        load();
                    }, onClose: () => setModal(null) }) })), modal === "export" && (_jsx(Modal, { title: "Xu\u1EA5t kho", onClose: () => setModal(null), children: _jsx(TransactionForm, { items: items, type: "export", onSave: () => {
                        setModal(null);
                        load();
                    }, onClose: () => setModal(null) }) }))] }));
}

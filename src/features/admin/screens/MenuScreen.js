import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { categoryAPI, menuItemAPI, taxAPI } from "@/api/endpoints";
function fmtVnd(n) {
    return new Intl.NumberFormat("vi-VN").format(n) + "đ";
}
// ─── Modal ─────────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children, wide }) {
    return (_jsx("div", { className: "modal-overlay", onClick: onClose, children: _jsxs("div", { className: "modal-box", style: wide ? { maxWidth: 720 } : undefined, onClick: e => e.stopPropagation(), children: [_jsxs("div", { className: "modal-header", children: [_jsx("h3", { children: title }), _jsx("button", { className: "modal-close", onClick: onClose, children: "\u2715" })] }), children] }) }));
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
// ─── Combo Fixed Config ─────────────────────────────────────────────────────────
function FixedComboConfig({ itemId, items, initial, onSave, onSkip }) {
    const singleItems = items.filter(i => i.itemType === "SINGLE");
    const [components, setComponents] = useState(initial ?? []);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState(null);
    const addRow = () => {
        if (singleItems.length === 0)
            return;
        setComponents(c => [...c, { menuItemId: singleItems[0].id, quantity: 1 }]);
    };
    const removeRow = (i) => setComponents(c => c.filter((_, idx) => idx !== i));
    const update = (i, field, val) => setComponents(c => c.map((row, idx) => idx === i ? { ...row, [field]: val } : row));
    const save = async () => {
        if (components.length === 0) {
            setErr("Cần ít nhất 1 thành phần");
            return;
        }
        for (const c of components) {
            if (!c.menuItemId || c.quantity < 1) {
                setErr("Kiểm tra lại menuItemId và số lượng");
                return;
            }
        }
        setLoading(true);
        setErr(null);
        try {
            await menuItemAPI.upsertFixedCombo(itemId, { components });
            onSave();
        }
        catch (e) {
            setErr(e.response?.data?.message || "Lỗi lưu cấu hình combo cố định");
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsxs("div", { className: "combo-config-section", children: [_jsx("h4", { style: { marginBottom: 8 }, children: "Th\u00E0nh ph\u1EA7n combo c\u1ED1 \u0111\u1ECBnh" }), _jsx("p", { style: { color: "#6b7280", fontSize: 13, marginBottom: 12 }, children: "Khai b\u00E1o c\u00E1c m\u00F3n \u0103n \u0111\u01B0\u1EE3c bao g\u1ED3m trong combo n\u00E0y." }), err && _jsx("div", { className: "form-err", children: err }), components.length > 0 && (_jsx("div", { className: "combo-rows", children: components.map((row, i) => (_jsxs("div", { className: "form-row", style: { alignItems: "center", gap: 8 }, children: [_jsx("div", { className: "form-group", style: { flex: 2, margin: 0 }, children: _jsx("select", { value: row.menuItemId, onChange: e => update(i, "menuItemId", +e.target.value), children: singleItems.map(it => _jsx("option", { value: it.id, children: it.name }, it.id)) }) }), _jsx("div", { className: "form-group", style: { flex: "0 0 80px", margin: 0 }, children: _jsx("input", { type: "number", min: 1, value: row.quantity, onChange: e => update(i, "quantity", +e.target.value) }) }), _jsx("button", { className: "btn-icon-danger", onClick: () => removeRow(i), title: "Xo\u00E1", children: "\u2715" })] }, i))) })), _jsx("button", { className: "btn-secondary", style: { marginTop: 8 }, onClick: addRow, disabled: singleItems.length === 0, children: "+ Th\u00EAm th\u00E0nh ph\u1EA7n" }), _jsxs("div", { className: "form-actions", style: { marginTop: 16 }, children: [_jsx("button", { className: "btn-secondary", onClick: onSkip, children: "B\u1ECF qua" }), _jsx("button", { className: "btn-primary", onClick: save, disabled: loading, children: loading ? "Đang lưu..." : "Lưu cấu hình combo" })] })] }));
}
function PickComboConfig({ itemId, items, initial, onSave, onSkip }) {
    const [slots, setSlots] = useState(initial ?? []);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState(null);
    const addSlot = () => setSlots(s => [...s, { name: "", minSelect: 1, maxSelect: 1, displayOrder: s.length + 1, allowedItemIds: [] }]);
    const removeSlot = (i) => setSlots(s => s.filter((_, idx) => idx !== i));
    const updateSlot = (i, field, val) => setSlots(s => s.map((row, idx) => idx === i ? { ...row, [field]: val } : row));
    const toggleItem = (slotIdx, itemId) => {
        setSlots(s => s.map((slot, idx) => {
            if (idx !== slotIdx)
                return slot;
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
        if (slots.length === 0) {
            setErr("Cần ít nhất 1 slot");
            return;
        }
        for (const s of slots) {
            if (!s.name.trim()) {
                setErr("Tên slot không được trống");
                return;
            }
            if (s.minSelect < 0 || s.maxSelect < s.minSelect) {
                setErr("Giá trị chọn min/max không hợp lệ");
                return;
            }
            if (s.allowedItemIds.length === 0) {
                setErr(`Slot "${s.name}" cần ít nhất 1 món cho phép`);
                return;
            }
        }
        setLoading(true);
        setErr(null);
        try {
            await menuItemAPI.upsertPickCombo(itemId, { slots });
            onSave();
        }
        catch (e) {
            setErr(e.response?.data?.message || "Lỗi lưu cấu hình combo tùy chọn");
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsxs("div", { className: "combo-config-section", children: [_jsx("h4", { style: { marginBottom: 8 }, children: "C\u1EA5u h\u00ECnh slot combo t\u00F9y ch\u1ECDn" }), _jsx("p", { style: { color: "#6b7280", fontSize: 13, marginBottom: 12 }, children: "M\u1ED7i slot cho ph\u00E9p kh\u00E1ch ch\u1ECDn m\u1ED9t nh\u00F3m m\u00F3n \u0103n trong combo." }), err && _jsx("div", { className: "form-err", children: err }), slots.map((slot, si) => (_jsxs("div", { className: "pick-slot-card", style: { border: "1px solid #e5e7eb", borderRadius: 8, padding: 12, marginBottom: 12 }, children: [_jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }, children: [_jsxs("strong", { style: { fontSize: 13 }, children: ["Slot #", si + 1] }), _jsx("button", { className: "btn-icon-danger", onClick: () => removeSlot(si), title: "Xo\u00E1 slot", children: "\u2715" })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "T\u00EAn slot *" }), _jsx("input", { value: slot.name, onChange: e => updateSlot(si, "name", e.target.value), placeholder: "VD: Ch\u1ECDn m\u00F3n ch\u00EDnh" })] }), _jsxs("div", { className: "form-row", children: [_jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Ch\u1ECDn t\u1ED1i thi\u1EC3u" }), _jsx("input", { type: "number", min: 0, value: slot.minSelect, onChange: e => updateSlot(si, "minSelect", +e.target.value) })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Ch\u1ECDn t\u1ED1i \u0111a" }), _jsx("input", { type: "number", min: 1, value: slot.maxSelect, onChange: e => updateSlot(si, "maxSelect", +e.target.value) })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Th\u1EE9 t\u1EF1 hi\u1EC3n th\u1ECB" }), _jsx("input", { type: "number", min: 1, value: slot.displayOrder, onChange: e => updateSlot(si, "displayOrder", +e.target.value) })] })] }), _jsxs("div", { className: "form-group", children: [_jsxs("label", { children: ["M\u00F3n \u0111\u01B0\u1EE3c ph\u00E9p ch\u1ECDn (", slot.allowedItemIds.length, " \u0111\u00E3 ch\u1ECDn)"] }), _jsx("div", { style: { display: "flex", flexWrap: "wrap", gap: 6, maxHeight: 160, overflowY: "auto", border: "1px solid #e5e7eb", borderRadius: 6, padding: 8 }, children: items.map(it => {
                                    const selected = slot.allowedItemIds.includes(it.id);
                                    return (_jsxs("button", { type: "button", onClick: () => toggleItem(si, it.id), style: {
                                            padding: "3px 10px",
                                            borderRadius: 20,
                                            fontSize: 12,
                                            cursor: "pointer",
                                            border: selected ? "1.5px solid #d4ad34" : "1px solid #e5e7eb",
                                            background: selected ? "rgba(212,173,52,0.12)" : "#f9fafb",
                                            color: selected ? "#a87d00" : "#374151",
                                            fontWeight: selected ? 600 : 400,
                                        }, children: [selected ? "✓ " : "", it.name] }, it.id));
                                }) })] })] }, si))), _jsx("button", { className: "btn-secondary", onClick: addSlot, children: "+ Th\u00EAm slot" }), _jsxs("div", { className: "form-actions", style: { marginTop: 16 }, children: [_jsx("button", { className: "btn-secondary", onClick: onSkip, children: "B\u1ECF qua" }), _jsx("button", { className: "btn-primary", onClick: save, disabled: loading, children: loading ? "Đang lưu..." : "Lưu cấu hình slot" })] })] }));
}
// ─── VND price input helpers ────────────────────────────────────────────────────
function fmtVndDisplay(n) {
    if (!n || isNaN(n))
        return "";
    return new Intl.NumberFormat("vi-VN").format(Math.round(n));
}
function parseVndText(s) {
    // Remove all non-numeric chars (dots, commas, spaces) and parse
    const cleaned = s.replace(/[^\d]/g, "");
    const n = parseInt(cleaned, 10);
    return isNaN(n) ? 0 : n;
}
function VndPriceInput({ value, onChange, id, placeholder }) {
    const [focused, setFocused] = useState(false);
    // While focused: show raw number string for easy editing
    // While blurred: show formatted VND string
    const displayVal = focused
        ? (value === 0 ? "" : String(value))
        : fmtVndDisplay(value);
    return (_jsxs("div", { style: { position: "relative" }, children: [_jsx("input", { id: id, type: "text", inputMode: "numeric", placeholder: placeholder ?? "VD: 50.000", value: displayVal, onFocus: () => setFocused(true), onBlur: () => setFocused(false), onChange: e => {
                    const raw = parseVndText(e.target.value);
                    onChange(raw);
                }, style: { paddingRight: 32 } }), _jsx("span", { style: {
                    position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                    fontSize: 11, color: "#9ca3af", pointerEvents: "none",
                }, children: "\u0111" })] }));
}
// ─── Menu Item Form ─────────────────────────────────────────────────────────────
const TAX_MODE_LABELS = {
    NO_TAX: "Không thuế",
    EXCLUSIVE: "Cộng thuế ngoài giá",
    INCLUSIVE: "Thuế trong giá",
};
function MenuItemForm({ initial, categories, items, onSave, onClose }) {
    const [step, setStep] = useState(1);
    const [savedItemId, setSavedItemId] = useState(initial?.id ?? null);
    const [detailLoading, setDetailLoading] = useState(false);
    // ── Step 1 fields ──
    const [categoryId, setCategoryId] = useState(initial?.categoryId ?? (categories[0]?.id || 0));
    const [name, setName] = useState(initial?.name ?? "");
    const [desc, setDesc] = useState(initial?.description ?? "");
    const [price, setPrice] = useState(initial?.price ?? 0);
    const [cookTimeText, setCookTimeText] = useState(String(initial?.cookTime ?? 5));
    const [itemType, setItemType] = useState(initial?.itemType ?? "SINGLE");
    const [comboKind, setComboKind] = useState(initial?.comboKind ?? "FIXED");
    // Tax fields: pre-filled from global config for new items; overwritten by detail fetch when editing
    const [itemTaxMode, setItemTaxMode] = useState(initial?.itemTaxMode ?? "NO_TAX");
    const [itemTaxRateBps, setItemTaxRateBps] = useState(initial?.itemTaxRateBps ?? 0);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState(null);
    const [imageFile, setImageFile] = useState(null);
    const [previewImageUrl, setPreviewImageUrl] = useState(initial?.imageUrl ?? null);
    // ── Existing combo config (when editing) ──
    const [existingFixedComponents, setExistingFixedComponents] = useState();
    const [existingPickSlots, setExistingPickSlots] = useState();
    // When creating a new item, pre-fill tax fields from global tax config template
    useEffect(() => {
        if (initial?.id)
            return;
        taxAPI.getConfig()
            .then(res => {
            const cfg = res.data.data;
            if (!cfg)
                return;
            setItemTaxMode(cfg.taxMode ?? "INCLUSIVE");
            setItemTaxRateBps(cfg.taxRateBps ?? 800);
        })
            .catch(() => { });
    }, [initial?.id]);
    // Fetch full manager detail when editing — list endpoint omits tax info
    useEffect(() => {
        if (!initial?.id)
            return;
        setDetailLoading(true);
        menuItemAPI.getDetail(initial.id)
            .then(res => {
            const d = res.data.data;
            if (!d)
                return;
            // Overwrite tax fields with authoritative values from manager endpoint
            setItemTaxMode(d.itemTaxMode ?? "NO_TAX");
            setItemTaxRateBps(d.itemTaxRateBps ?? 0);
            // Load combo config
            if (d.fixedCombo?.components)
                setExistingFixedComponents(d.fixedCombo.components);
            if (d.pickCombo?.slots)
                setExistingPickSlots(d.pickCombo.slots.map((s) => ({
                    name: s.name,
                    minSelect: s.minSelect,
                    maxSelect: s.maxSelect,
                    displayOrder: s.displayOrder,
                    allowedItemIds: s.allowedItemIds ?? [],
                })));
        })
            .catch(() => { })
            .finally(() => setDetailLoading(false));
    }, [initial?.id]);
    const cookTime = parseInt(cookTimeText, 10);
    const cookTimeValid = cookTimeText === "" || (!isNaN(cookTime) && cookTime >= 0);
    const submitStep1 = async () => {
        if (!name.trim()) {
            setErr("Tên món không được trống");
            return;
        }
        if (!categoryId) {
            setErr("Chọn danh mục");
            return;
        }
        if (price <= 0) {
            setErr("Giá bán phải lớn hơn 0đ");
            return;
        }
        if (!cookTimeValid || isNaN(cookTime) || cookTime < 0) {
            setErr("Thời gian nấu phải >= 0 phút");
            return;
        }
        if (itemTaxMode !== "NO_TAX" && itemTaxRateBps <= 0) {
            setErr("Thuế suất phải > 0 khi áp dụng thuế (VD: 1000 = 10%)");
            return;
        }
        if (itemTaxMode !== "NO_TAX" && itemTaxRateBps > 10000) {
            setErr("Thuế suất tối đa 10000 bps (100%)");
            return;
        }
        setLoading(true);
        setErr(null);
        try {
            const effectiveCookTime = cookTimeText === "" ? null : cookTime;
            const data = {
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
            }
            else {
                const res = await menuItemAPI.create(data);
                itemId = res.data.data.id;
                setSavedItemId(itemId);
            }
            if (imageFile && itemId) {
                const imgRes = await menuItemAPI.uploadImage(itemId, imageFile);
                // Update preview URL from server response
                const serverUrl = imgRes.data?.data?.imageUrl ?? null;
                if (serverUrl)
                    setPreviewImageUrl(serverUrl);
            }
            if (itemType === "COMBO") {
                setStep(2);
            }
            else {
                onSave();
            }
        }
        catch (e) {
            const fieldErrs = e.response?.data?.data;
            const detail = fieldErrs && typeof fieldErrs === "object"
                ? " (" + Object.entries(fieldErrs).map(([k, v]) => `${k}: ${v}`).join(", ") + ")"
                : "";
            setErr((e.response?.data?.message || "Lỗi lưu món ăn") + detail);
        }
        finally {
            setLoading(false);
        }
    };
    if (step === 2 && savedItemId) {
        return (_jsxs("div", { children: [_jsx("div", { className: "alert-success", style: { marginBottom: 16 }, children: "\u2705 Th\u00F4ng tin m\u00F3n \u0111\u00E3 l\u01B0u. Ti\u1EBFp t\u1EE5c c\u1EA5u h\u00ECnh combo b\u00EAn d\u01B0\u1EDBi (ho\u1EB7c b\u1ECF qua \u0111\u1EC3 ho\u00E0n t\u1EA5t)." }), comboKind === "FIXED" ? (_jsx(FixedComboConfig, { itemId: savedItemId, items: items, initial: existingFixedComponents, onSave: onSave, onSkip: onSave })) : (_jsx(PickComboConfig, { itemId: savedItemId, items: items, initial: existingPickSlots, onSave: onSave, onSkip: onSave }))] }));
    }
    return (_jsxs(_Fragment, { children: [detailLoading && (_jsx("div", { style: { marginBottom: 10, fontSize: 12, color: "#9ca3af" }, children: "\u23F3 \u0110ang t\u1EA3i th\u00F4ng tin chi ti\u1EBFt..." })), err && _jsx("div", { className: "form-err", children: err }), _jsxs("div", { className: "form-row", children: [_jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Danh m\u1EE5c *" }), _jsx("select", { value: categoryId, onChange: e => setCategoryId(+e.target.value), children: categories.map(c => _jsx("option", { value: c.id, children: c.name }, c.id)) })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Lo\u1EA1i m\u00F3n *" }), _jsxs("select", { value: itemType, onChange: e => {
                                    const t = e.target.value;
                                    setItemType(t);
                                    if (t !== "COMBO")
                                        setComboKind("FIXED");
                                }, children: [_jsx("option", { value: "SINGLE", children: "\u0110\u01A1n l\u1EBB (SINGLE)" }), _jsx("option", { value: "COMBO", children: "Combo" })] })] }), itemType === "COMBO" && (_jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Ki\u1EC3u combo *" }), _jsxs("select", { value: comboKind, onChange: e => setComboKind(e.target.value), children: [_jsx("option", { value: "FIXED", children: "C\u1ED1 \u0111\u1ECBnh (FIXED)" }), _jsx("option", { value: "PICK", children: "T\u00F9y ch\u1ECDn (PICK)" })] })] }))] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "T\u00EAn m\u00F3n *" }), _jsx("input", { value: name, onChange: e => setName(e.target.value), placeholder: "VD: G\u1ECFi Cu\u1ED1n T\u00F4m" })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "M\u00F4 t\u1EA3" }), _jsx("input", { value: desc, onChange: e => setDesc(e.target.value), placeholder: "M\u00F4 t\u1EA3 ng\u1EAFn..." })] }), _jsxs("div", { className: "form-row", children: [_jsxs("div", { className: "form-group", children: [_jsxs("label", { children: ["Gi\u00E1 b\u00E1n *", price > 0 && (_jsxs("span", { style: { marginLeft: 6, fontWeight: 400, color: "#6b7280" }, children: ["= ", fmtVnd(price)] }))] }), _jsx(VndPriceInput, { id: "item-price", value: price, onChange: setPrice, placeholder: "VD: 50.000" })] }), _jsxs("div", { className: "form-group", children: [_jsxs("label", { children: ["Th\u1EDDi gian n\u1EA5u (ph\u00FAt)", _jsx("span", { style: { marginLeft: 4, fontWeight: 400, color: "#6b7280", fontSize: 11 }, children: "(\u2265 0)" })] }), _jsx("input", { type: "text", inputMode: "numeric", value: cookTimeText, onChange: e => {
                                    const v = e.target.value.replace(/[^\d]/g, "");
                                    setCookTimeText(v);
                                }, placeholder: "VD: 10", style: { borderColor: cookTimeValid ? undefined : "#ef4444" } }), !cookTimeValid && (_jsx("small", { style: { color: "#ef4444" }, children: "Ph\u1EA3i l\u00E0 s\u1ED1 nguy\u00EAn \u2265 0" }))] })] }), _jsxs("div", { style: { background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: "12px 14px", marginBottom: 14 }, children: [_jsxs("div", { style: { fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 10 }, children: ["\u2699\uFE0F C\u00E0i \u0111\u1EB7t thu\u1EBF", detailLoading && _jsx("span", { style: { fontWeight: 400, color: "#9ca3af", marginLeft: 6 }, children: "(\u0111ang t\u1EA3i...)" })] }), _jsxs("div", { className: "form-row", children: [_jsxs("div", { className: "form-group", style: { flex: 1 }, children: [_jsx("label", { children: "Ch\u1EBF \u0111\u1ED9 thu\u1EBF *" }), _jsx("select", { value: itemTaxMode, onChange: e => {
                                            const m = e.target.value;
                                            setItemTaxMode(m);
                                            if (m === "NO_TAX")
                                                setItemTaxRateBps(0);
                                        }, children: Object.entries(TAX_MODE_LABELS).map(([v, l]) => (_jsx("option", { value: v, children: l }, v))) })] }), itemTaxMode !== "NO_TAX" && (_jsxs("div", { className: "form-group", style: { flex: 1 }, children: [_jsxs("label", { children: ["Thu\u1EBF su\u1EA5t (bps) *", _jsx("span", { style: { color: "#6b7280", fontWeight: 400 }, children: " \u00B7 1000 = 10%" })] }), _jsx("input", { type: "number", min: 1, max: 10000, step: 100, value: itemTaxRateBps, onChange: e => setItemTaxRateBps(Math.max(0, Math.min(10000, +e.target.value))), placeholder: "VD: 1000" })] }))] }), _jsxs("div", { style: { fontSize: 12, color: "#6b7280", marginTop: 4 }, children: [itemTaxMode === "NO_TAX" && "Không áp dụng thuế cho món này.", itemTaxMode !== "NO_TAX" && itemTaxRateBps > 0 && (_jsxs(_Fragment, { children: ["Thu\u1EBF su\u1EA5t: ", _jsxs("strong", { children: [(itemTaxRateBps / 100).toFixed(0), "%"] }), itemTaxMode === "EXCLUSIVE"
                                        ? " · Khách thanh toán giá niêm yết + thuế"
                                        : " · Thuế đã gộp trong giá niêm yết", price > 0 && itemTaxMode === "EXCLUSIVE" && (_jsxs(_Fragment, { children: [" \u00B7 T\u1ED5ng th\u1EF1c t\u1EBF \u2248 ", _jsx("strong", { children: fmtVnd(Math.round(price * (1 + itemTaxRateBps / 10000))) })] })), price > 0 && itemTaxMode === "INCLUSIVE" && (_jsxs(_Fragment, { children: [" \u00B7 Thu\u1EBF ri\u00EAng \u2248 ", _jsx("strong", { children: fmtVnd(Math.round(price * itemTaxRateBps / (10000 + itemTaxRateBps))) })] }))] })), itemTaxMode !== "NO_TAX" && itemTaxRateBps === 0 && (_jsx("span", { style: { color: "#ef4444" }, children: "\u26A0\uFE0F Nh\u1EADp thu\u1EBF su\u1EA5t > 0" }))] })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "\u1EA2nh m\u00F3n \u0103n" }), _jsx("input", { type: "file", accept: "image/jpeg,image/png,image/webp", onChange: e => {
                            const file = e.target.files?.[0] ?? null;
                            setImageFile(file);
                            if (file) {
                                const reader = new FileReader();
                                reader.onload = ev => setPreviewImageUrl(ev.target?.result);
                                reader.readAsDataURL(file);
                            }
                        } }), previewImageUrl && (_jsx("img", { src: previewImageUrl, alt: "preview", className: "img-preview" }))] }), _jsxs("div", { className: "form-actions", children: [_jsx("button", { className: "btn-secondary", onClick: onClose, children: "Hu\u1EF7" }), _jsx("button", { className: "btn-primary", onClick: submitStep1, disabled: loading || detailLoading, children: loading
                            ? "Đang lưu..."
                            : itemType === "COMBO"
                                ? (initial ? "Cập nhật & cấu hình combo →" : "Tạo & cấu hình combo →")
                                : (initial ? "Cập nhật" : "Tạo mới") })] })] }));
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
                            })] }), _jsxs("div", { className: "item-area", children: [_jsx("input", { className: "search-input", placeholder: "\uD83D\uDD0D T\u00ECm ki\u1EBFm m\u00F3n...", value: search, onChange: e => setSearch(e.target.value) }), loading && _jsx("div", { className: "loading-state", children: "\u0110ang t\u1EA3i..." }), _jsxs("div", { className: "item-grid", children: [filteredItems.map(item => (_jsxs("div", { className: "item-card", children: [item.imageUrl ? (_jsx("img", { src: item.imageUrl, alt: item.name, className: "item-img" })) : (_jsx("div", { className: "item-img-placeholder", children: "\uD83C\uDF7D\uFE0F" })), _jsxs("div", { className: "item-info", children: [_jsxs("div", { className: "item-header", children: [_jsx("strong", { children: item.name }), _jsxs("div", { style: { display: "flex", gap: 4 }, children: [_jsx("span", { className: `item-type-badge ${item.itemType.toLowerCase()}`, children: item.itemType }), item.itemType === "COMBO" && item.comboKind && (_jsx("span", { className: "item-type-badge", style: { background: "#f3e8c0", color: "#8a6a00" }, children: item.comboKind }))] })] }), _jsx("small", { children: item.description || "Không có mô tả" }), _jsxs("div", { className: "item-footer", children: [_jsx("b", { className: "item-price", children: fmtVnd(item.price) }), _jsxs("div", { className: "item-actions", children: [_jsx("button", { title: "S\u1EEDa", onClick: () => { setEditItem(item); setItemModal("edit"); }, children: "\u270F\uFE0F" }), _jsx("button", { title: "Xo\u00E1", onClick: () => deleteItem(item), children: "\uD83D\uDDD1\uFE0F" })] })] })] })] }, item.id))), filteredItems.length === 0 && !loading && (_jsx("div", { className: "empty-state", children: "Kh\u00F4ng c\u00F3 m\u00F3n n\u00E0o ph\u00F9 h\u1EE3p" }))] })] })] }), catModal && (_jsx(Modal, { title: catModal === "create" ? "Tạo danh mục mới" : "Sửa danh mục", onClose: () => setCatModal(null), children: _jsx(CategoryForm, { initial: editCat, onSave: () => { setCatModal(null); load(); }, onClose: () => setCatModal(null) }) })), itemModal && (_jsx(Modal, { title: itemModal === "create" ? "Thêm món mới" : "Sửa món ăn", onClose: () => setItemModal(null), wide: true, children: _jsx(MenuItemForm, { initial: editItem, categories: categories, items: items, onSave: () => { setItemModal(null); load(); }, onClose: () => setItemModal(null) }) }))] }));
}

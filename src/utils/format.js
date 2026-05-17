/** Format VND đầy đủ — "108.000đ" */
export function fmtVnd(n) {
    return new Intl.NumberFormat("vi-VN").format(n) + "đ";
}
/** Format VND nhỏ gọn cho UI cards có không gian hạn chế.
 *  ≥ 1 tỷ → "1,23 tỷ"
 *  ≥ 1 triệu → "1,2 tr"
 *  ≥ 1 nghìn → "12K"
 *  còn lại → số nguyên kèm "đ"
 */
export function fmtVndCompact(n) {
    if (!Number.isFinite(n))
        return "0đ";
    const abs = Math.abs(n);
    if (abs >= 1000000000)
        return (n / 1000000000).toFixed(2).replace(".", ",") + " tỷ";
    if (abs >= 1000000)
        return (n / 1000000).toFixed(1).replace(".", ",") + " tr";
    if (abs >= 10000)
        return Math.round(n / 1000) + "K";
    return new Intl.NumberFormat("vi-VN").format(n) + "đ";
}
/** Format count gọn — 1.2K, 3.4M */
export function fmtCount(n) {
    if (!Number.isFinite(n))
        return "0";
    if (n >= 1000000)
        return (n / 1000000).toFixed(1) + "M";
    if (n >= 1000)
        return (n / 1000).toFixed(0) + "K";
    return n.toString();
}
const _pad2 = (n) => n.toString().padStart(2, "0");
/** Format ngày dd/MM/yyyy — nhận Date, ISO string hoặc timestamp. Trả "—" nếu invalid. */
export function fmtDate(input) {
    if (input == null || input === "")
        return "—";
    const d = input instanceof Date ? input : new Date(input);
    if (Number.isNaN(d.getTime()))
        return "—";
    return `${_pad2(d.getDate())}/${_pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
}
/** Format ngày giờ dd/MM/yyyy HH:mm. Trả "—" nếu invalid. */
export function fmtDateTime(input) {
    if (input == null || input === "")
        return "—";
    const d = input instanceof Date ? input : new Date(input);
    if (Number.isNaN(d.getTime()))
        return "—";
    return `${_pad2(d.getDate())}/${_pad2(d.getMonth() + 1)}/${d.getFullYear()} ${_pad2(d.getHours())}:${_pad2(d.getMinutes())}`;
}
/** Format ngày dạng ngắn dd/MM — dùng cho trục biểu đồ. */
export function fmtDateShort(input) {
    if (input == null || input === "")
        return "";
    const d = input instanceof Date ? input : new Date(input);
    if (Number.isNaN(d.getTime()))
        return "";
    return `${_pad2(d.getDate())}/${_pad2(d.getMonth() + 1)}`;
}

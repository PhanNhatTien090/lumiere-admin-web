import { useState, useEffect } from "react";
import { tableAPI } from "@/api/endpoints";
import { TableResponse, CreateTableRequest, QrCodeResponse, TableStatus } from "@/types";

const STATUS_LABELS: Record<TableStatus, string> = {
  AVAILABLE: "Trống",
  OCCUPIED: "Đang dùng",
  RESERVED: "Đặt trước",
  CLEANING: "Chờ dọn · thanh toán",
};

/** LUMIÈRE table status palette — aligned with POS / UX spec */
const STATUS_COLORS: Record<TableStatus, string> = {
  AVAILABLE: "#16A34A",
  RESERVED: "#CA8A04",
  OCCUPIED: "#2563EB",
  CLEANING: "#EA580C",
};

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

function TableForm({ initial, onSave, onClose }: {
  initial?: TableResponse;
  onSave: () => void;
  onClose: () => void;
}) {
  const [tableCode, setTableCode] = useState(initial?.tableCode ?? "");
  const [floor, setFloor] = useState(initial?.floor ?? 1);
  const [tableNo, setTableNo] = useState(initial?.tableNo ?? 1);
  const [capacity, setCapacity] = useState(initial?.capacity ?? 4);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    if (!tableCode.trim()) { setErr("Mã bàn không được trống"); return; }
    setLoading(true); setErr(null);
    try {
      const data: CreateTableRequest = { tableCode: tableCode.trim(), floor, tableNo, capacity };
      if (initial) await tableAPI.update(initial.tableCode, data);
      else await tableAPI.create(data);
      onSave();
    } catch (e: any) {
      setErr(e.response?.data?.message || "Lỗi lưu bàn");
    } finally { setLoading(false); }
  };

  return (
    <>
      {err && <div className="form-err">{err}</div>}
      <div className="form-group">
        <label>Mã bàn *</label>
        <input
          value={tableCode} onChange={e => setTableCode(e.target.value)}
          placeholder="VD: T01" disabled={!!initial}
        />
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>Tầng</label>
          <input type="number" value={floor} onChange={e => setFloor(+e.target.value)} min={1} />
        </div>
        <div className="form-group">
          <label>Số bàn</label>
          <input type="number" value={tableNo} onChange={e => setTableNo(+e.target.value)} min={1} />
        </div>
        <div className="form-group">
          <label>Sức chứa</label>
          <input type="number" value={capacity} onChange={e => setCapacity(+e.target.value)} min={1} />
        </div>
      </div>
      <div className="form-actions">
        <button className="btn-secondary" onClick={onClose}>Huỷ</button>
        <button className="btn-primary" onClick={submit} disabled={loading}>
          {loading ? "Đang lưu..." : initial ? "Cập nhật" : "Tạo bàn"}
        </button>
      </div>
    </>
  );
}

function QrPanel({ table, onClose }: { table: TableResponse; onClose: () => void }) {
  const [qr, setQr] = useState<QrCodeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const loadQr = async () => {
    setLoading(true); setErr(null);
    try {
      const res = await tableAPI.getQr(table.tableCode);
      setQr(res.data.data);
    } catch (e: any) {
      setErr(e.response?.data?.message || "Lỗi tải QR Code");
    } finally { setLoading(false); }
  };

  const rotateQr = async () => {
    if (!confirm(`Xác nhận tạo QR mới cho bàn ${table.tableCode}? QR cũ sẽ bị vô hiệu hoá.`)) return;
    setRotating(true);
    try {
      const res = await tableAPI.rotateQr(table.tableCode);
      setQr(res.data.data);
    } catch (e: any) {
      alert(e.response?.data?.message || "Lỗi rotate QR");
    } finally { setRotating(false); }
  };

  useEffect(() => { loadQr(); }, []);

  return (
    <Modal title={`QR Code — Bàn ${table.tableCode}`} onClose={onClose}>
      {loading && <div className="loading-state">Đang tải QR...</div>}
      {err && <div className="form-err">{err}</div>}
      {qr && (
        <div className="qr-panel">
          {qr.qrImageUrl ? (
            <img src={qr.qrImageUrl} alt="QR Code" className="qr-img" />
          ) : (
            <div className="qr-placeholder">
              <p>QR Content:</p>
              <code>{qr.qrContent}</code>
            </div>
          )}
          {qr.expiresAt && (
            <p className="qr-expire">Hết hạn: {new Date(qr.expiresAt).toLocaleString("vi-VN")}</p>
          )}
          <div className="form-actions" style={{ marginTop: 16 }}>
            <button className="btn-danger" onClick={rotateQr} disabled={rotating}>
              {rotating ? "Đang xử lý..." : "🔄 Xoay QR mới"}
            </button>
            <button className="btn-secondary" onClick={onClose}>Đóng</button>
          </div>
        </div>
      )}
    </Modal>
  );
}

export function TablesScreen() {
  const [tables, setTables] = useState<TableResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tableModal, setTableModal] = useState<"create" | "edit" | null>(null);
  const [editTable, setEditTable] = useState<TableResponse | undefined>();
  const [qrTable, setQrTable] = useState<TableResponse | null>(null);
  const [filterFloor, setFilterFloor] = useState<number | null>(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const res = await tableAPI.list();
      setTables(res.data.data);
    } catch (e: any) {
      if (!e.response) {
        setError("Không thể kết nối đến máy chủ. Kiểm tra backend localhost:8080.");
      } else if (e.response?.status === 500) {
        setError(`Lỗi máy chủ (500): ${e.response?.data?.message || "Backend đang gặp sự cố nội bộ"}`);
      } else {
        setError(e.response?.data?.message || "Lỗi tải danh sách bàn");
      }
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const deleteTable = async (t: TableResponse) => {
    if (!confirm(`Xoá bàn ${t.tableCode}?`)) return;
    try {
      await tableAPI.remove(t.tableCode);
      load();
    } catch (e: any) {
      alert(e.response?.data?.message || "Lỗi xoá bàn");
    }
  };

  const floors = [...new Set(tables.map(t => t.floor))].sort();
  const displayTables = filterFloor !== null ? tables.filter(t => t.floor === filterFloor) : tables;

  return (
    <div className="screen">
      <header className="screen-header">
        <div>
          <h2>Bàn &amp; <span>QR Code</span></h2>
          <p>{tables.length} bàn · {floors.length} tầng</p>
        </div>
        <button className="btn-primary" onClick={() => { setTableModal("create"); setEditTable(undefined); }}>
          + Thêm bàn
        </button>
      </header>

      {error && <div className="alert-error">{error}</div>}

      {/* Floor filter */}
      <div className="floor-tabs">
        <button className={`floor-tab ${filterFloor === null ? "active" : ""}`} onClick={() => setFilterFloor(null)}>
          Tất cả
        </button>
        {floors.map(f => (
          <button key={f} className={`floor-tab ${filterFloor === f ? "active" : ""}`} onClick={() => setFilterFloor(f)}>
            Tầng {f}
          </button>
        ))}
      </div>

      {loading && <div className="loading-state">Đang tải...</div>}

      <div className="table-grid">
        {displayTables.map(table => (
          <div key={table.id} className="table-card">
            <div className="table-card-header">
              <div className="table-code">{table.tableCode}</div>
              <span className="table-status-badge" style={{ background: STATUS_COLORS[table.status] }}>
                {STATUS_LABELS[table.status]}
              </span>
            </div>
            <div className="table-details">
              <span>Tầng {table.floor} · Bàn {table.tableNo}</span>
              <span>👥 {table.capacity} người</span>
            </div>
            <div className="table-card-actions">
              <button type="button" className="btn-small" title="Xem và tải mã QR" aria-label="Mã QR bàn" onClick={() => setQrTable(table)}>
                🔲 QR
              </button>
              <button type="button" className="btn-small" title="Sửa thông tin bàn" aria-label="Sửa bàn" onClick={() => { setEditTable(table); setTableModal("edit"); }}>
                ✏️ Sửa
              </button>
              <button type="button" className="btn-small danger" title="Xóa bàn khỏi hệ thống" aria-label="Xóa bàn" onClick={() => deleteTable(table)}>
                🗑️
              </button>
            </div>
          </div>
        ))}
        {displayTables.length === 0 && !loading && (
          <div className="empty-state">Không có bàn nào</div>
        )}
      </div>

      {tableModal && (
        <Modal title={tableModal === "create" ? "Thêm bàn mới" : "Sửa bàn"} onClose={() => setTableModal(null)}>
          <TableForm initial={editTable} onSave={() => { setTableModal(null); load(); }} onClose={() => setTableModal(null)} />
        </Modal>
      )}

      {qrTable && <QrPanel table={qrTable} onClose={() => setQrTable(null)} />}
    </div>
  );
}

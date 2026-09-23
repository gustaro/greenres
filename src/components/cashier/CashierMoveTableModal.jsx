import { orderCode } from '../StaffShared'

export function CashierMoveTableModal({
    order,
    newTableInput,
    setNewTableInput,
    onConfirm,
    onCancel,
    loading,
}) {
    if (!order) return null

    return (
        <div className="overlay" style={{ zIndex: 1200, display: 'grid', placeItems: 'center', background: 'rgba(0,0,0,0.5)' }}>
            <div style={{ background: '#fff', borderRadius: 12, padding: 24, width: '90%', maxWidth: 400, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
                <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800, color: 'var(--brand-primary-dark)', display: 'flex', alignItems: 'center' }}>
                    <i className="bi bi-arrow-left-right me-2"></i> ย้ายโต๊ะอาหาร
                </h3>
                <p style={{ margin: '0 0 16px', fontSize: 13, color: '#666' }}>
                    ออเดอร์ {orderCode(order)} (ปัจจุบัน: โต๊ะ {order.tableNumber || '—'})
                </p>
                <label style={{ display: 'grid', gap: 6, fontSize: 13, fontWeight: 700, color: '#333' }}>
                    ระบุหมายเลขโต๊ะใหม่
                    <input
                        autoFocus
                        value={newTableInput}
                        onChange={e => setNewTableInput(e.target.value)}
                        placeholder="เช่น 14 หรือ B2"
                        style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc', fontSize: 15 }}
                    />
                </label>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
                    <button
                        type="button"
                        className="staff-secondary"
                        onClick={onCancel}
                        disabled={loading}
                    >
                        ยกเลิก
                    </button>
                    <button
                        type="button"
                        className="staff-primary"
                        onClick={onConfirm}
                        disabled={loading || !newTableInput.trim()}
                    >
                        {loading ? 'กำลังบันทึก...' : 'ยืนยันย้ายโต๊ะ'}
                    </button>
                </div>
            </div>
        </div>
    )
}

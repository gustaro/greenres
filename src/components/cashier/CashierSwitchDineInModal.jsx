import { orderCode } from '../StaffShared'

const QUICK_TABLES = ['1', '2', '3', '4', '5', '6', '7', '8', 'A1', 'A2', 'B1', 'B2']

export function CashierSwitchDineInModal({
    order,
    customerLabel,
    switchTableInput,
    setSwitchTableInput,
    onConfirm,
    onCancel,
    loading,
}) {
    if (!order) return null

    return (
        <div className="overlay" style={{ zIndex: 1200, display: 'grid', placeItems: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }}>
            <div style={{ background: '#fff', borderRadius: 16, padding: 24, width: '90%', maxWidth: 440, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)', border: '1px solid #d8e7d2' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--brand-primary-dark)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <i className="bi bi-shop" style={{ color: 'var(--brand-primary, #12852f)' }}></i> เปลี่ยนเป็นทานที่ร้าน
                    </h3>
                    <button
                        type="button"
                        onClick={onCancel}
                        style={{ border: 0, background: 'transparent', fontSize: 24, lineHeight: 1, cursor: 'pointer', color: '#9ca3af' }}
                    >
                        &times;
                    </button>
                </div>

                <div style={{ background: '#f6faf2', borderRadius: 10, padding: '10px 14px', marginBottom: 16, border: '1px solid #d8e7d2' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#17351f' }}>
                        ออเดอร์: <span style={{ color: 'var(--brand-primary-dark)' }}>{orderCode(order)}</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#6d7b6e', marginTop: 2 }}>
                        ลูกค้า: {customerLabel(order)} {order.customerPhone ? `(${order.customerPhone})` : ''}
                    </div>
                </div>

                <label style={{ display: 'grid', gap: 6, fontSize: 13, fontWeight: 700, color: '#17351f' }}>
                    <span>ระบุหมายเลขโต๊ะที่ลูกค้านั่งทาน:</span>
                    <input
                        autoFocus
                        value={switchTableInput}
                        onChange={e => setSwitchTableInput(e.target.value)}
                        placeholder="เช่น 1, 2, A1, B3..."
                        style={{ padding: '12px 14px', borderRadius: 10, border: '1.5px solid #12852f', fontSize: 16, fontWeight: 700, outline: 'none' }}
                        onKeyDown={e => {
                            if (e.key === 'Enter') onConfirm()
                        }}
                    />
                </label>

                {/* Quick table buttons */}
                <div style={{ marginTop: 14 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#6d7b6e' }}>เลือกโต๊ะด่วน:</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                        {QUICK_TABLES.map(tbl => (
                            <button
                                key={tbl}
                                type="button"
                                onClick={() => setSwitchTableInput(tbl)}
                                style={{
                                    border: switchTableInput === tbl ? '1.5px solid #12852f' : '1px solid #d8e7d2',
                                    background: switchTableInput === tbl ? '#effbdc' : '#f6faf2',
                                    color: switchTableInput === tbl ? '#075c1b' : '#17351f',
                                    fontWeight: 700,
                                    fontSize: 12,
                                    padding: '5px 12px',
                                    borderRadius: 8,
                                    cursor: 'pointer'
                                }}
                            >
                                โต๊ะ {tbl}
                            </button>
                        ))}
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>
                    <button
                        type="button"
                        className="staff-secondary"
                        onClick={onCancel}
                        disabled={loading}
                        style={{ padding: '10px 18px', borderRadius: 10, fontWeight: 700 }}
                    >
                        ยกเลิก
                    </button>
                    <button
                        type="button"
                        className="staff-primary"
                        onClick={onConfirm}
                        disabled={loading || !switchTableInput.trim()}
                        style={{
                            padding: '10px 20px',
                            borderRadius: 10,
                            fontWeight: 800,
                            background: 'var(--brand-primary, #12852f)',
                            borderColor: 'var(--brand-primary-dark, #075c1b)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6
                        }}
                    >
                        {loading ? (
                            <><span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> กำลังบันทึก...</>
                        ) : (
                            <><i className="bi bi-check2"></i> ยืนยันย้ายไปทานที่ร้าน</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}

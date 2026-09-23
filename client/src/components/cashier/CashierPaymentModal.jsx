import { money, orderCode } from '../StaffShared'
import { CashierPaymentMethodDetails } from './CashierPaymentMethodDetails'

export function CashierPaymentModal({
    order,
    customerLabel,
    selectedPaymentMethod,
    setSelectedPaymentMethod,
    cashReceived,
    setCashReceived,
    onConfirm,
    onCancel,
    loading,
}) {
    if (!order) return null

    const total = Number(order.totalAmount) || 0
    const cash = Number(cashReceived) || 0
    const change = cash - total
    const isCashShort = selectedPaymentMethod === 'CASH' && cash < total

    return (
        <div className="overlay" style={{ zIndex: 1200, display: 'grid', placeItems: 'center', background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)' }}>
            <div style={{ background: '#fff', borderRadius: 16, padding: 24, width: '92%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 35px -5px rgba(0,0,0,0.25)', border: '1px solid #effbdc' }}>
                {/* Modal Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: 'var(--brand-primary-dark, #075c1b)', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <i className="bi bi-cash-coin" style={{ color: 'var(--brand-primary, #12852f)' }}></i> รับชำระเงิน
                        </h3>
                        <div style={{ fontSize: 13, color: '#6d7b6e', marginTop: 2 }}>
                            ออเดอร์ <strong>{orderCode(order)}</strong> &bull; {customerLabel(order)}
                            {order.tableNumber ? ` (โต๊ะ ${order.tableNumber})` : ` (${order.deliveryType || 'สั่งกลับบ้าน'})`}
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onCancel}
                        style={{ border: 0, background: 'transparent', fontSize: 26, lineHeight: 1, cursor: 'pointer', color: '#9ca3af' }}
                    >
                        &times;
                    </button>
                </div>

                {/* Total Due Banner */}
                <div style={{ background: 'linear-gradient(135deg, #effbdc 0%, #effbdc 100%)', borderRadius: 14, padding: '16px 20px', border: '1.5px solid #9fe51f', textAlign: 'center', marginBottom: 20 }}>
                    <div style={{ fontSize: 12, color: '#075c1b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        ยอดรวมที่ต้องชำระ (Total Amount)
                    </div>
                    <div style={{ fontSize: 38, fontWeight: 900, color: '#075c1b', letterSpacing: '-0.5px', margin: '4px 0' }}>
                        {money(total)}
                    </div>
                    <div style={{ fontSize: 12, color: '#12852f', fontWeight: 600 }}>
                        {order.items?.length || 0} รายการสินค้า
                    </div>
                </div>

                {/* Payment Method Selector (3 Options) */}
                <div style={{ marginBottom: 18 }}>
                    <label style={{ fontSize: 13, fontWeight: 800, color: '#17351f', display: 'block', marginBottom: 8 }}>
                        เลือกช่องทางการชำระเงิน:
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                        {[
                            { key: 'CASH', icon: 'bi-cash-stack', label: 'เงินสด', sub: 'Cash' },
                            { key: 'QR', icon: 'bi-qr-code-scan', label: 'สแกนคิวอาร์', sub: 'PromptPay' },
                            { key: 'CARD', icon: 'bi-credit-card-2-front', label: 'บัตรเครดิต', sub: 'Credit / Debit' },
                        ].map(item => {
                            const isSel = selectedPaymentMethod === item.key
                            return (
                                <button
                                    key={item.key}
                                    type="button"
                                    onClick={() => setSelectedPaymentMethod(item.key)}
                                    style={{
                                        border: isSel ? '2px solid #12852f' : '1.5px solid #d8e7d2',
                                        background: isSel ? '#effbdc' : '#fff',
                                        borderRadius: 12,
                                        padding: '12px 8px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: 6,
                                        cursor: 'pointer',
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    <div style={{
                                        width: 40,
                                        height: 40,
                                        borderRadius: '50%',
                                        background: isSel ? '#12852f' : '#f6faf2',
                                        color: isSel ? '#fff' : '#6d7b6e',
                                        display: 'grid',
                                        placeItems: 'center',
                                        fontSize: 20
                                    }}>
                                        <i className={`bi ${item.icon}`}></i>
                                    </div>
                                    <span style={{ fontSize: 13, fontWeight: 800, color: isSel ? '#075c1b' : '#17351f' }}>
                                        {item.label}
                                    </span>
                                    <span style={{ fontSize: 10, color: '#6d7b6e' }}>{item.sub}</span>
                                </button>
                            )
                        })}
                    </div>
                </div>

                <CashierPaymentMethodDetails
                    selectedPaymentMethod={selectedPaymentMethod}
                    total={total}
                    cashReceived={cashReceived}
                    setCashReceived={setCashReceived}
                    isCashShort={isCashShort}
                    change={change}
                    onConfirm={onConfirm}
                    orderId={order.id}
                />

                {/* Action Buttons */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                    <button
                        type="button"
                        className="staff-secondary"
                        onClick={onCancel}
                        disabled={loading}
                        style={{ padding: '12px 20px', borderRadius: 10, fontWeight: 700, fontSize: 14 }}
                    >
                        ยกเลิก
                    </button>
                    <button
                        type="button"
                        className="staff-primary"
                        onClick={onConfirm}
                        disabled={loading || isCashShort}
                        style={{
                            flex: 1,
                            padding: '12px 24px',
                            borderRadius: 10,
                            fontWeight: 800,
                            fontSize: 15,
                            background: isCashShort ? '#9ca3af' : 'var(--brand-primary, #12852f)',
                            borderColor: isCashShort ? '#9ca3af' : 'var(--brand-primary-dark, #075c1b)',
                            cursor: isCashShort ? 'not-allowed' : 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8
                        }}
                    >
                        {loading ? (
                            <><span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> กำลังบันทึก...</>
                        ) : (
                            <><i className="bi bi-check-circle-fill"></i> ยืนยันรับชำระเงิน ({money(total)})</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}

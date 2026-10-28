import { useEffect, useState } from 'react'
import { money, orderCode, formatCashierPaymentMethod } from '../StaffShared'

const REFUND_METHODS = [
    { key: 'CASH', label: 'คืนเงินสด', icon: 'bi-cash-stack' },
    { key: 'TRANSFER', label: 'โอนเงินคืน', icon: 'bi-bank' },
    { key: 'STRIPE', label: 'คืนผ่าน Stripe (อัตโนมัติ)', icon: 'bi-credit-card', needsStripe: true },
]

export function CashierCancelModal({ order, customerLabel, onConfirm, onCancel, loading }) {
    const [reason, setReason] = useState('')
    const [refundMethod, setRefundMethod] = useState('CASH')
    const [refundHanded, setRefundHanded] = useState(false)

    useEffect(() => {
        setReason('')
        setRefundMethod(order?.stripePaymentId ? 'STRIPE' : 'CASH')
        setRefundHanded(false)
    }, [order?.id])

    if (!order) return null

    // Matches the server: full total when paid, or the earlier payment when items were added afterwards.
    const refundAmount = order.isPaid ? Number(order.totalAmount) || 0 : Number(order.paidAmount) || 0
    const needsRefund = refundAmount > 0
    const isManualRefund = needsRefund && refundMethod !== 'STRIPE'
    const canSubmit = !loading && (!isManualRefund || refundHanded)

    return (
        <div className="overlay" style={{ zIndex: 1200, display: 'grid', placeItems: 'center', background: 'rgba(0,0,0,0.55)' }}>
            <div style={{ background: '#fff', borderRadius: 14, padding: 24, width: '92%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 35px -5px rgba(0,0,0,0.25)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#b42318', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <i className="bi bi-x-octagon"></i> {needsRefund ? 'ยกเลิกออเดอร์และคืนเงิน' : 'ยกเลิกออเดอร์'}
                        </h3>
                        <small style={{ color: '#666' }}>{orderCode(order)} · {customerLabel(order)}{order.tableNumber ? ` · โต๊ะ ${order.tableNumber}` : ''}</small>
                    </div>
                    <button onClick={onCancel} disabled={loading} style={{ border: 0, background: 'transparent', fontSize: 24, cursor: 'pointer' }}>×</button>
                </div>

                {['PREPARING', 'READY', 'DELIVERING', 'DELIVERED'].includes(order.serverStatus) && (
                    <div style={{ background: '#fff8e6', border: '1px solid #ffd88a', color: '#8e5800', borderRadius: 8, padding: '8px 12px', fontSize: 12, fontWeight: 700, marginBottom: 12 }}>
                        <i className="bi bi-exclamation-triangle me-1" /> ครัวเริ่มทำออเดอร์นี้แล้ว ({order.foodStatus}) — ตรวจสอบกับครัวก่อนยกเลิก
                    </div>
                )}

                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>เหตุผลการยกเลิก (ไม่บังคับ)</label>
                <input
                    value={reason}
                    onChange={event => setReason(event.target.value)}
                    placeholder="เช่น ลูกค้าเปลี่ยนใจ, สั่งผิด, ของหมด"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #c2cdc1', fontSize: 14, marginBottom: 14, boxSizing: 'border-box' }}
                />

                {needsRefund ? (
                    <div style={{ background: '#fef3f2', border: '1px solid #fdc5c0', borderRadius: 10, padding: 14, marginBottom: 14 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                            <span style={{ fontSize: 13, fontWeight: 800, color: '#b42318' }}>ยอดที่ต้องคืนลูกค้า</span>
                            <strong style={{ fontSize: 22, color: '#b42318' }}>{money(refundAmount)}</strong>
                        </div>
                        <small style={{ color: '#7a271a', display: 'block', marginBottom: 10 }}>
                            ชำระไว้ด้วย: {formatCashierPaymentMethod(order.paymentMethod, order)}
                        </small>

                        <div style={{ display: 'grid', gap: 6 }}>
                            {REFUND_METHODS.filter(method => !method.needsStripe || order.stripePaymentId).map(method => (
                                <label key={method.key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, background: '#fff', border: `1.5px solid ${refundMethod === method.key ? '#f04438' : '#f2d4d0'}`, cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
                                    <input type="radio" name="refund-method" checked={refundMethod === method.key} onChange={() => { setRefundMethod(method.key); setRefundHanded(false) }} />
                                    <i className={`bi ${method.icon}`} /> {method.label}
                                </label>
                            ))}
                        </div>

                        {isManualRefund && (
                            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 12, fontSize: 13, fontWeight: 700, color: '#7a271a', cursor: 'pointer' }}>
                                <input type="checkbox" checked={refundHanded} onChange={event => setRefundHanded(event.target.checked)} style={{ marginTop: 3 }} />
                                ยืนยันว่าคืนเงิน {money(refundAmount)} ให้ลูกค้าเรียบร้อยแล้ว
                            </label>
                        )}
                        {refundMethod === 'STRIPE' && (
                            <small style={{ display: 'block', marginTop: 10, color: '#7a271a' }}>
                                ระบบจะสั่งคืนเงินเข้าบัตร/บัญชีของลูกค้าผ่าน Stripe ทันทีเมื่อกดยืนยัน
                            </small>
                        )}
                    </div>
                ) : (
                    <p style={{ fontSize: 13, color: '#555', marginBottom: 14 }}>ออเดอร์นี้ยังไม่ได้ชำระเงิน จึงไม่ต้องคืนเงิน</p>
                )}

                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button type="button" className="staff-secondary" onClick={onCancel} disabled={loading}>ไม่ยกเลิก</button>
                    <button
                        type="button"
                        className="staff-primary"
                        onClick={() => onConfirm({ reason, refundMethod: needsRefund ? refundMethod : '' })}
                        disabled={!canSubmit}
                        style={{ background: '#d92d20', borderColor: '#b42318' }}
                    >
                        {loading ? 'กำลังยกเลิก...' : needsRefund ? <><i className="bi bi-arrow-counterclockwise me-1" />ยกเลิกและคืนเงิน</> : <><i className="bi bi-x-circle me-1" />ยืนยันยกเลิก</>}
                    </button>
                </div>
            </div>
        </div>
    )
}

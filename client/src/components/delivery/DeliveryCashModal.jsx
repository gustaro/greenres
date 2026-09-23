import { money } from '../StaffShared'

export function DeliveryCashModal({ cashConfirm, setCashConfirm, cashConfirming, confirmCashPayment }) {
    if (!cashConfirm) return null

    return (
        <div className="receipt-overlay" onMouseDown={() => setCashConfirm(null)}>
            <article className="receipt cashier-receipt" onMouseDown={e => e.stopPropagation()} style={{ maxWidth: 380 }}>
                <header>
                    <b><i className="bi bi-cash-stack me-2" />บันทึกรับเงินสด</b>
                    <small>ยืนยันรับเงินจากลูกค้า</small>
                </header>
                <div style={{ padding: '18px 0 10px', textAlign: 'center' }}>
                    <p style={{ fontSize: 13, color: '#555', marginBottom: 8 }}>
                        ออเดอร์ <b>{cashConfirm.orderNumber}</b>
                    </p>
                    <div style={{ fontSize: 36, fontWeight: 900, color: '#12852f' }}>
                        {money(cashConfirm.totalAmount)}
                    </div>
                    <p style={{ fontSize: 12, color: '#888', marginTop: 8 }}>
                        เมื่อกด "ยืนยัน" ระบบจะบันทึกว่าชำระแล้ว
                    </p>
                </div>
                <div className="receipt-payment" style={{ gap: 10, padding: '12px 0 0' }}>
                    <button onClick={() => setCashConfirm(null)} disabled={cashConfirming}>ยกเลิก</button>
                    <button className="staff-primary" disabled={cashConfirming} onClick={() => confirmCashPayment(cashConfirm)}>
                        {cashConfirming ? (
                            <><i className="bi bi-arrow-repeat spin me-1" /> กำลังบันทึก...</>
                        ) : (
                            <><i className="bi bi-check-circle-fill me-1" /> ยืนยันรับเงินสดแล้ว</>
                        )}
                    </button>
                </div>
            </article>
        </div>
    )
}

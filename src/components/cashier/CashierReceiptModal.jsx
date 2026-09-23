import { groupOrderItems, money, orderCode } from '../StaffShared'

export function CashierReceiptModal({
    receipt,
    settings,
    customerLabel,
    onClose,
}) {
    if (!receipt) return null

    return (
        <div className="receipt-overlay" onMouseDown={onClose}>
            <article className="receipt cashier-receipt" onMouseDown={event => event.stopPropagation()}>
                <header className="thermal-header">
                    <h2>{settings?.siteName || 'LimeLeaf'}</h2>
                    <p className="thermal-address">
                        {settings?.restaurantAddress || 'กรุงเทพมหานคร\nโทรศัพท์: 02-123-4567'}
                    </p>
                    <div className="thermal-title">{receipt.isPaid ? 'ใบเสร็จรับเงิน' : 'ใบสรุปรายการ'}</div>
                </header>

                <div className="thermal-meta">
                    <div className="thermal-meta-row"><span>เลขที่:</span><span>{orderCode(receipt)}</span></div>
                    <div className="thermal-meta-row"><span>ประเภท:</span><span>{receipt.deliveryType}</span></div>
                    <div className="thermal-meta-row"><span>ลูกค้า:</span><span>{customerLabel(receipt)}</span></div>
                    {receipt.customerPhone && <div className="thermal-meta-row"><span>เบอร์โทร:</span><span>{receipt.customerPhone}</span></div>}
                    {receipt.deliveryType === 'ทานที่ร้าน' && <div className="thermal-meta-row thermal-table-row"><span>เบอร์โต๊ะ:</span><strong>{receipt.tableNumber || '—'}</strong></div>}
                    {receipt.reservationTime && <div className="thermal-meta-row"><span>เวลาจอง:</span><strong>{receipt.reservationTime}</strong></div>}
                    {receipt.createdAt && <div className="thermal-meta-row"><span>เวลาสั่ง:</span><span>{new Date(receipt.createdAt).toLocaleString('th-TH')}</span></div>}
                    {receipt.paidAt && <div className="thermal-meta-row"><span>เวลาชำระ:</span><span>{new Date(receipt.paidAt).toLocaleString('th-TH')}</span></div>}
                </div>

                <div className="thermal-items-header">
                    <span className="col-name">สินค้า</span>
                    <span className="col-qty">Qty</span>
                    <span className="col-price">ราคา</span>
                </div>

                <ul className="thermal-items">
                    {groupOrderItems(receipt.items).map((item, idx) => (
                        <li key={item.id || idx}>
                            <span className="col-name">
                                {item.displayName}
                                {item.cleanNote && <small style={{ color: '#666', display: 'block' }}>({item.cleanNote})</small>}
                            </span>
                            <span className="col-qty">{item.quantity}</span>
                            <span className="col-price">{money(item.totalPrice)}</span>
                        </li>
                    ))}
                </ul>

                <div className="thermal-divider" />

                <div className="thermal-summary">
                    <div className="thermal-sum-row"><span>ยอดรวม</span><span>{money(receipt.subtotal)}</span></div>
                    {receipt.discountAmount > 0 && <div className="thermal-sum-row"><span>ส่วนลด</span><span>-{money(receipt.discountAmount)}</span></div>}
                    {receipt.deliveryFee > 0 && <div className="thermal-sum-row"><span>ค่าจัดส่ง</span><span>{money(receipt.deliveryFee)}</span></div>}
                </div>

                <div className="thermal-divider-dashed" />

                <div className="thermal-total">
                    <span>ทั้งหมด</span>
                    <strong>{money(receipt.totalAmount)}</strong>
                </div>
                {receipt.isPaid && (
                    <div className="thermal-payment-type">
                        <span>{receipt.paymentMethod || 'เงินสด'}</span>
                        <span>{money(receipt.totalAmount)}</span>
                    </div>
                )}

                <div className="thermal-divider" />

                <footer className="thermal-footer">
                    <p>ขอบคุณลูกค้าทุกท่านที่มาใช้บริการ</p>
                    <p>***</p>
                    <p>สถานะการชำระ: {receipt.paymentStatus || (receipt.isPaid ? 'PAID' : 'PENDING')}</p>
                </footer>

                <div className="receipt-actions noprint">
                    <button onClick={onClose}>ปิด</button>
                    {receipt.isPaid && (
                        <button className="staff-primary" onClick={() => window.print()}>
                            <i className="bi bi-printer me-1"></i> พิมพ์ใบเสร็จ
                        </button>
                    )}
                </div>
            </article>
        </div>
    )
}

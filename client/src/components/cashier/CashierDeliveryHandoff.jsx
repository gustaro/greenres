import { money, orderCode, formatCashierPaymentMethod, OrderItems } from '../StaffShared'

const PICKED_UP_STATUSES = ['PICKED_UP', 'ON_THE_WAY', 'ARRIVED', 'DELIVERED']

// Delivery orders the kitchen has finished. The card waits for the rider; once the rider
// has the food the action button turns grey and the card stays until the order is delivered.
export function CashierDeliveryHandoff({ orders, customerLabel, actionLoadingId, onHandoff, onViewReceipt }) {
    if (orders.length === 0) return null

    return (
        <div style={{ marginBottom: 24 }}>
            <div className="staff-section-head cashier-section-head" style={{ marginBottom: 10 }}>
                <div>
                    <h2><i className="bi bi-bicycle me-2" />ออเดอร์จัดส่ง ({orders.length})</h2>
                    <p>เตรียมอาหารให้ไรเดอร์ กดยืนยันเมื่อไรเดอร์รับอาหารแล้ว</p>
                </div>
            </div>
            <div className="staff-order-grid cashier-grid">
                {orders.map(order => {
                    const pickedUp = order.serverStatus === 'DELIVERING' || PICKED_UP_STATUSES.includes(order.deliveryStatus)
                    const hasRider = Boolean(order.riderName) || order.deliveryStatus === 'ASSIGNED'
                    const busy = actionLoadingId === order.id

                    let buttonLabel = <><i className="bi bi-hourglass-split" /> รอไรเดอร์มารับ</>
                    if (pickedUp) buttonLabel = <><i className="bi bi-check2-all" /> ไรเดอร์รับแล้ว · กำลังจัดส่ง</>
                    else if (busy) buttonLabel = 'กำลังบันทึก...'
                    else if (hasRider) buttonLabel = <><i className="bi bi-box-arrow-up-right" /> ยืนยันไรเดอร์รับอาหารแล้ว</>

                    return (
                        <article
                            className="staff-order-card cashier-order"
                            key={order.id}
                            style={{ borderColor: pickedUp ? '#d6d3d1' : 'var(--brand-primary, #12852f)', opacity: pickedUp ? 0.85 : 1 }}
                        >
                            <header style={{ background: pickedUp ? '#f5f5f4' : 'var(--brand-accent-soft, #effbdc)', padding: '12px 14px', borderRadius: '8px 8px 0 0' }}>
                                <div>
                                    <small style={{ color: pickedUp ? '#78716c' : 'var(--brand-primary-dark, #075c1b)', fontWeight: 800 }}>
                                        {pickedUp ? 'PICKED UP' : 'WAITING FOR RIDER'}
                                    </small>
                                    <h3 style={{ margin: 0, fontSize: 18 }}>{orderCode(order)}</h3>
                                </div>
                                <i className={`status ${pickedUp ? 'paid' : 'shipping'}`}>
                                    <i className={`bi ${pickedUp ? 'bi-truck' : 'bi-bicycle'} me-1`} />
                                    {pickedUp ? 'ไรเดอร์รับแล้ว' : 'รอไรเดอร์มารับ'}
                                </i>
                            </header>

                            <div className="cashier-order-meta" style={{ padding: '10px 14px 4px' }}>
                                <span><i className="bi bi-person me-1" />{customerLabel(order)}</span>
                                {order.customerPhone && <span style={{ fontSize: 11, color: '#666' }}><i className="bi bi-telephone me-1" />{order.customerPhone}</span>}
                            </div>
                            <div style={{ padding: '0 14px 8px', fontSize: 12, color: '#57534e' }}>
                                <div><i className="bi bi-geo-alt me-1" />{order.deliveryAddress || '—'}</div>
                                <div style={{ marginTop: 4, fontWeight: 700, color: hasRider ? 'var(--brand-primary-dark, #075c1b)' : '#9b6210' }}>
                                    <i className="bi bi-person-badge me-1" />
                                    {hasRider ? `ไรเดอร์: ${order.riderName || 'รับงานแล้ว'}${order.riderPhone ? ` (${order.riderPhone})` : ''}` : order.deliveryId ? 'ยังไม่มีไรเดอร์รับงาน' : 'กำลังสร้างงานจัดส่ง...'}
                                </div>
                            </div>

                            <div style={{ padding: '0 14px' }}>
                                <OrderItems order={order} />
                            </div>

                            <div className="cashier-due" style={{ padding: '10px 14px' }}>
                                <span>{order.isPaid ? `ชำระแล้ว (${formatCashierPaymentMethod(order.paymentMethod, order)})` : 'เก็บเงินปลายทาง'}</span>
                                <strong>{money(order.totalAmount)}</strong>
                            </div>

                            <div className="staff-actions" style={{ padding: '12px 14px', gap: 8 }}>
                                <button className="staff-secondary" onClick={() => onViewReceipt(order)}>
                                    <i className="bi bi-receipt me-1"></i> ดูรายการ
                                </button>
                                <button
                                    type="button"
                                    className="staff-primary cashier-handoff-btn"
                                    onClick={() => onHandoff(order)}
                                    disabled={pickedUp || !hasRider || busy}
                                    style={{
                                        flex: 1,
                                        minHeight: 44,
                                        fontSize: 13,
                                        fontWeight: 800,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 6,
                                        ...(pickedUp
                                            ? { background: '#d6d3d1', borderColor: '#a8a29e', color: '#57534e', cursor: 'not-allowed', opacity: 1 }
                                            : !hasRider
                                                ? { background: '#fff', borderColor: 'var(--brand-primary, #12852f)', color: 'var(--brand-primary-dark, #075c1b)', cursor: 'default', opacity: 1 }
                                                : { background: 'var(--brand-primary, #12852f)', borderColor: 'var(--brand-primary-dark, #075c1b)' }),
                                    }}
                                >
                                    {buttonLabel}
                                </button>
                            </div>
                        </article>
                    )
                })}
            </div>
        </div>
    )
}

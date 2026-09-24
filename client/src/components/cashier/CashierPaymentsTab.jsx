import { Empty, money, orderCode, OrderItems } from '../StaffShared'

export function CashierPaymentsTab({
    unpaidOrders,
    searchField,
    setSearchField,
    search,
    setSearch,
    customerLabel,
    onMoveTable,
    onToggleTakeaway,
    onAddItems,
    onViewReceipt,
    onOpenPaymentModal,
}) {
    return (
        <section>
            <div className="staff-section-head cashier-section-head" style={{ alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div>
                    <h2>รายการรอชำระเงิน (Unpaid Orders)</h2>
                    <p>จัดการย้ายโต๊ะ เปลี่ยนเป็นกลับบ้าน เพิ่มเมนู และรับชำระเงิน</p>
                </div>
                <div className="cashier-search-bar" style={{ display: 'flex', gap: 8, alignItems: 'center', marginLeft: 'auto' }}>
                    <select
                        className="cashier-search-selector"
                        value={searchField}
                        onChange={e => setSearchField(e.target.value)}
                        style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #c2cdc1', background: '#fff', fontSize: 13, fontWeight: 600 }}
                    >
                        <option value="all">ทั้งหมด</option>
                        <option value="order">เลขออเดอร์</option>
                        <option value="customer">ลูกค้า / เบอร์โต๊ะ</option>
                        <option value="time">เวลาสั่งซื้อ</option>
                        <option value="channel">ช่องทาง / ประเภท</option>
                        <option value="amount">ยอดเงิน</option>
                    </select>
                    <input
                        className="cashier-search"
                        value={search}
                        onChange={event => setSearch(event.target.value)}
                        placeholder="ค้นหาตามตัวกรอง..."
                        style={{ width: 220 }}
                    />
                </div>
            </div>

            <div className="staff-order-grid cashier-grid">
                {unpaidOrders.length === 0 ? (
                    <Empty text={search ? 'ไม่พบรายการที่ค้นหา' : 'ไม่มีรายการค้างชำระ'} />
                ) : (
                    unpaidOrders.map(order => {
                        const isDineIn = order.deliveryType === 'ทานที่ร้าน'
                        return (
                            <article className="staff-order-card cashier-order" key={order.id} style={{ position: 'relative' }}>
                                <header>
                                    <div>
                                        <small>ORDER</small>
                                        <h3>{orderCode(order)}</h3>
                                    </div>
                                    <i className="status pending">{order.paymentStatus || 'PENDING'}</i>
                                </header>

                                <div className="cashier-order-meta">
                                    <span style={{ fontWeight: 700, color: 'var(--brand-primary-dark)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                        {isDineIn ? <><i className="bi bi-shop"></i> ทานที่ร้าน</> : <><i className="bi bi-box2"></i> สั่งกลับบ้าน</>}
                                    </span>
                                    {isDineIn && <span className="table-number-badge" style={{ background: 'var(--brand-accent, #b8ff35)', color: 'var(--brand-primary-dark, #075c1b)', fontWeight: 800 }}>โต๊ะ {order.tableNumber || '—'}</span>}
                                    <span>{customerLabel(order)}</span>
                                    {order.customerPhone && <span style={{ fontSize: 11, color: '#666' }}><i className="bi bi-telephone me-1"></i>{order.customerPhone}</span>}
                                    <span>{new Date(order.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>

                                {order.reservationTime && (
                                    <div style={{ background: '#eff6ff', color: '#1d4ed8', padding: '4px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, marginBottom: 8, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                        <i className="bi bi-calendar3"></i> จองรอบ: {order.reservationTime} {order.reservationGuests ? `(${order.reservationGuests} ท่าน)` : ''}
                                    </div>
                                )}

                                <OrderItems order={order} />

                                <div className="cashier-due">
                                    <span>ยอดชำระ</span>
                                    <strong>{money(order.totalAmount)}</strong>
                                </div>

                                {order.serverStatus === 'PENDING' && order.orderSource === 'online' && (
                                    <div className="cashier-online-badge">
                                        <i className="bi bi-globe me-1"></i> ออเดอร์ออนไลน์ — รอ Admin อนุมัติ
                                    </div>
                                )}

                                {/* Quick Operational Controls: Move Table, Switch Dine-in/Takeaway, Add Items */}
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '10px 0', borderTop: '1px solid #f0f0f0', paddingTop: 8 }}>
                                    {isDineIn && (
                                        <button
                                            type="button"
                                            className="staff-secondary"
                                            onClick={() => onMoveTable(order)}
                                            style={{ fontSize: 11, padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                        >
                                            <i className="bi bi-arrow-left-right"></i> ย้ายโต๊ะ
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        className="staff-secondary"
                                        onClick={() => onToggleTakeaway(order)}
                                        style={{ fontSize: 11, padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                    >
                                        {isDineIn ? (
                                            <><i className="bi bi-box2"></i> เปลี่ยนเป็นกลับบ้าน</>
                                        ) : (
                                            <><i className="bi bi-shop"></i> เปลี่ยนเป็นทานที่ร้าน</>
                                        )}
                                    </button>
                                    <button
                                        type="button"
                                        className="staff-secondary"
                                        onClick={() => onAddItems(order)}
                                        style={{ fontSize: 11, padding: '4px 8px', background: 'var(--brand-accent-soft, #effbdc)', borderColor: 'var(--brand-accent, #9fe51f)', color: 'var(--brand-primary-dark, #075c1b)', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                    >
                                        <i className="bi bi-plus-circle"></i> เพิ่มเมนู
                                    </button>
                                </div>

                                <div className="staff-actions" style={{ gap: 8 }}>
                                    <button className="staff-secondary" onClick={() => onViewReceipt(order)}>
                                        <i className="bi bi-receipt me-1"></i> ดูรายการ
                                    </button>
                                    {!order.isPaid && (
                                        <button
                                            className="staff-primary"
                                            style={{ flex: 1, minHeight: 44, fontSize: 14, fontWeight: 800, background: 'var(--brand-primary, #12852f)', borderColor: 'var(--brand-primary-dark, #075c1b)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                                            onClick={() => onOpenPaymentModal(order)}
                                        >
                                            <i className="bi bi-cash-coin"></i> รับชำระเงิน
                                        </button>
                                    )}
                                </div>
                            </article>
                        )
                    })
                )}
            </div>
        </section>
    )
}

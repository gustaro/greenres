import { Empty, money, orderCode, OrderItems, formatCashierPaymentMethod } from '../StaffShared'
import { orderAmountDue } from './useCashierOperations'

const ORDER_FILTERS = [
    { key: 'all', label: 'ทั้งหมด' },
    { key: 'pending', label: 'รอยืนยัน' },
    { key: 'unpaid', label: 'รอชำระ' },
    { key: 'paid', label: 'ชำระแล้ว' },
]

// Kitchen/delivery progress shown on each card header.
const kitchenStatus = order => {
    if (order.serverStatus === 'PENDING') return { label: 'รอยืนยันออเดอร์', className: 'pending', icon: 'bi-hourglass' }
    if (order.serverStatus === 'CONFIRMED') return { label: 'รอครัว', className: 'cooking', icon: 'bi-clock' }
    if (order.serverStatus === 'PREPARING') return { label: 'กำลังทำ', className: 'cooking', icon: 'bi-fire' }
    if (order.serverStatus === 'READY') return order.deliveryType === 'ให้จัดส่ง'
        ? { label: 'รอไรเดอร์มารับ', className: 'shipping', icon: 'bi-bicycle' }
        : { label: 'อาหารพร้อม', className: 'paid', icon: 'bi-bell-fill' }
    if (order.serverStatus === 'DELIVERING') return { label: 'กำลังจัดส่ง', className: 'shipping', icon: 'bi-truck' }
    if (order.serverStatus === 'DELIVERED') return { label: 'ส่งมอบแล้ว', className: 'paid', icon: 'bi-check2-all' }
    return { label: order.foodStatus, className: 'pending', icon: 'bi-info-circle' }
}

const deliveryTypeLabel = order => {
    if (order.deliveryType === 'ทานที่ร้าน') return <><i className="bi bi-shop"></i> ทานที่ร้าน</>
    if (order.deliveryType === 'ให้จัดส่ง') return <><i className="bi bi-bicycle"></i> จัดส่ง</>
    if (order.deliveryType === 'รับเองที่ร้าน') return <><i className="bi bi-bag"></i> รับเองที่ร้าน</>
    return <><i className="bi bi-box2"></i> สั่งกลับบ้าน</>
}

export function CashierPaymentsTab({
    orders,
    ordersFilter,
    setOrdersFilter,
    searchField,
    setSearchField,
    search,
    setSearch,
    customerLabel,
    actionLoadingId,
    onConfirmOrder,
    onCancelOrder,
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
                    <h2>ออเดอร์ที่กำลังดำเนินการ</h2>
                    <p>ยืนยันออเดอร์ เพิ่มเมนู ย้ายโต๊ะ ยกเลิก/คืนเงิน และรับชำระเงิน — ออเดอร์ที่ชำระแล้วยังแสดงจนกว่าจะส่งมอบ</p>
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

            <div className="counter-category-tabs" style={{ marginBottom: 14 }}>
                {ORDER_FILTERS.map(filter => (
                    <button key={filter.key} className={ordersFilter === filter.key ? 'active' : ''} onClick={() => setOrdersFilter(filter.key)}>{filter.label}</button>
                ))}
            </div>

            <div className="staff-order-grid cashier-grid">
                {orders.length === 0 ? (
                    <Empty text={search ? 'ไม่พบรายการที่ค้นหา' : 'ไม่มีออเดอร์ที่กำลังดำเนินการ'} />
                ) : (
                    orders.map(order => {
                        const isDineIn = order.deliveryType === 'ทานที่ร้าน'
                        const isDelivery = order.deliveryType === 'ให้จัดส่ง'
                        const isCounterOrder = order.orderSource === 'walkin' || order.orderSource === 'takeaway'
                        const isPending = order.serverStatus === 'PENDING'
                        const riderHasFood = order.serverStatus === 'DELIVERING'
                        const amountDue = orderAmountDue(order)
                        const busy = actionLoadingId === order.id
                        const status = kitchenStatus(order)
                        return (
                            <article className="staff-order-card cashier-order" key={order.id} style={{ position: 'relative', borderColor: isPending ? '#f59e0b' : undefined }}>
                                <header>
                                    <div>
                                        <small>{order.orderSource === 'online' ? 'ONLINE ORDER' : 'ORDER'}</small>
                                        <h3>{orderCode(order)}</h3>
                                    </div>
                                    <i className={`status ${status.className}`}><i className={`bi ${status.icon} me-1`} />{status.label}</i>
                                </header>

                                <div className="cashier-order-meta">
                                    <span style={{ fontWeight: 700, color: 'var(--brand-primary-dark)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                        {deliveryTypeLabel(order)}
                                    </span>
                                    {isDineIn && <span className="table-number-badge" style={{ background: 'var(--brand-accent, #b8ff35)', color: 'var(--brand-primary-dark, #075c1b)', fontWeight: 800 }}>โต๊ะ {order.tableNumber || '—'}</span>}
                                    <span>{customerLabel(order)}</span>
                                    {order.customerPhone && <span style={{ fontSize: 11, color: '#666' }}><i className="bi bi-telephone me-1"></i>{order.customerPhone}</span>}
                                    <span>{new Date(order.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>

                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                                    {order.isPaid ? (
                                        <i className="status paid"><i className="bi bi-check2 me-1" />ชำระแล้ว ({formatCashierPaymentMethod(order.paymentMethod, order)})</i>
                                    ) : order.isCashOnDelivery ? (
                                        <i className="status shipping"><i className="bi bi-cash-coin me-1" />เก็บเงินปลายทาง — ไรเดอร์เก็บ {money(amountDue)}</i>
                                    ) : (
                                        <i className="status pending"><i className="bi bi-clock-history me-1" />ยังไม่ชำระ {money(amountDue)}</i>
                                    )}
                                    {!order.isPaid && order.paidAmount > 0 && (
                                        <i className="status paid"><i className="bi bi-plus-circle me-1" />ชำระแล้ว {money(order.paidAmount)} · ค้างเฉพาะเมนูสั่งเพิ่ม</i>
                                    )}
                                </div>

                                {order.reservationTime && (
                                    <div style={{ background: '#eff6ff', color: '#1d4ed8', padding: '4px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, marginBottom: 8, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                        <i className="bi bi-calendar3"></i> จองรอบ: {order.reservationTime} {order.reservationGuests ? `(${order.reservationGuests} ท่าน)` : ''}
                                    </div>
                                )}

                                <OrderItems order={order} />

                                <div className="cashier-due">
                                    <span>{order.isPaid ? 'ยอดรวม (ชำระแล้ว)' : order.isCashOnDelivery ? 'เก็บเงินปลายทาง' : 'ยอดชำระ'}</span>
                                    <strong>{money(order.isPaid ? order.totalAmount : amountDue)}</strong>
                                </div>

                                {isPending && (
                                    <div className="cashier-online-badge" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                                        <span><i className="bi bi-globe me-1"></i> ออเดอร์ใหม่ — รอยืนยันก่อนส่งเข้าครัว</span>
                                        <button
                                            type="button"
                                            className="staff-primary"
                                            onClick={() => onConfirmOrder(order)}
                                            disabled={busy}
                                            style={{ padding: '6px 14px', fontSize: 12 }}
                                        >
                                            {busy ? 'กำลังยืนยัน...' : <><i className="bi bi-check2-circle me-1" />ยืนยันออเดอร์</>}
                                        </button>
                                    </div>
                                )}

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
                                    {isCounterOrder && (
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
                                    )}
                                    {!riderHasFood && (
                                        <button
                                            type="button"
                                            className="staff-secondary"
                                            onClick={() => onAddItems(order)}
                                            style={{ fontSize: 11, padding: '4px 8px', background: 'var(--brand-accent-soft, #effbdc)', borderColor: 'var(--brand-accent, #9fe51f)', color: 'var(--brand-primary-dark, #075c1b)', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                        >
                                            <i className="bi bi-plus-circle"></i> เพิ่มเมนู
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        className="staff-secondary"
                                        onClick={() => onCancelOrder(order)}
                                        style={{ fontSize: 11, padding: '4px 8px', color: '#b42318', borderColor: '#fdc5c0', display: 'inline-flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}
                                    >
                                        <i className="bi bi-x-circle"></i> {order.isPaid || order.paidAmount > 0 ? 'ยกเลิก/คืนเงิน' : 'ยกเลิกออเดอร์'}
                                    </button>
                                </div>

                                <div className="staff-actions" style={{ gap: 8 }}>
                                    <button className="staff-secondary" onClick={() => onViewReceipt(order)}>
                                        <i className="bi bi-receipt me-1"></i> ดูรายการ
                                    </button>
                                    {!order.isPaid && !order.isCashOnDelivery && (
                                        <button
                                            className="staff-primary"
                                            style={{ flex: 1, minHeight: 44, fontSize: 14, fontWeight: 800, background: 'var(--brand-primary, #12852f)', borderColor: 'var(--brand-primary-dark, #075c1b)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                                            onClick={() => onOpenPaymentModal(order)}
                                        >
                                            <i className="bi bi-cash-coin"></i> รับชำระเงิน {money(amountDue)}
                                        </button>
                                    )}
                                    {isDelivery && !order.isPaid && order.isCashOnDelivery && (
                                        <span style={{ flex: 1, alignSelf: 'center', fontSize: 12, fontWeight: 700, color: '#276da6' }}>
                                            <i className="bi bi-info-circle me-1" />ไม่ต้องเก็บเงินที่ร้าน ไรเดอร์เก็บเงินสดจากลูกค้า
                                        </span>
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

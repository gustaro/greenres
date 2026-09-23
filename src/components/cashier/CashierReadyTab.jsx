import { Empty, money, orderCode } from '../StaffShared'

export function CashierReadyTab({
    readyOrders,
    searchField,
    setSearchField,
    search,
    setSearch,
    customerLabel,
    onViewReceipt,
    onCompleteOrder,
    onServeItem,
    onServeAllReadyItems,
    onAddItems,
}) {
    return (
        <section>
            <div className="staff-section-head cashier-section-head" style={{ alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div>
                    <h2>ออเดอร์พร้อมส่งมอบ (Ready to Serve)</h2>
                    <p>รายการที่ครัวปรุงเสร็จแล้ว พนักงานสามารถตรวจสอบ นำไปเสิร์ฟทีละรายการ และส่งมอบให้ลูกค้า</p>
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
                        <option value="time">เวลา</option>
                        <option value="channel">ช่องทาง / ประเภท</option>
                        <option value="amount">ยอดเงิน</option>
                    </select>
                    <input
                        className="cashier-search"
                        value={search}
                        onChange={event => setSearch(event.target.value)}
                        placeholder="ค้นหาออเดอร์..."
                        style={{ width: 220 }}
                    />
                </div>
            </div>

            <div className="staff-order-grid cashier-grid">
                {readyOrders.length === 0 ? (
                    <Empty text={search ? 'ไม่พบรายการที่ค้นหา' : 'ไม่มีออเดอร์ที่รอส่งมอบในขณะนี้'} />
                ) : (
                    readyOrders.map(order => {
                        const isDineIn = order.deliveryType === 'ทานที่ร้าน'
                        const items = order.items || []
                        const readyToServeItems = items.filter(i => i.itemStatus === 'READY')
                        const alreadyServedItems = items.filter(i => i.itemStatus === 'SERVED')
                        const cookingItems = items.filter(i => i.itemStatus !== 'READY' && i.itemStatus !== 'SERVED')
                        const isAllCompleted = items.length > 0 && cookingItems.length === 0
                        const totalCompleted = readyToServeItems.length + alreadyServedItems.length
                        const progressPct = items.length > 0 ? Math.round((totalCompleted / items.length) * 100) : 100

                        return (
                            <article className="staff-order-card cashier-order ready-order-card" key={order.id} style={{ position: 'relative', borderColor: isAllCompleted ? '#84cc16' : '#38bdf8', boxShadow: '0 6px 20px rgba(18, 63, 39, 0.08)' }}>
                                <header style={{ background: isAllCompleted ? 'rgba(132, 204, 22, 0.14)' : 'rgba(56, 189, 248, 0.12)', padding: '12px 14px', borderRadius: '8px 8px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <small style={{ color: isAllCompleted ? '#3f6212' : '#0369a1', fontWeight: 800 }}>
                                            {isAllCompleted ? 'READY TO SERVE (ครบแล้ว)' : 'PARTIAL READY (ทยอยเสิร์ฟ)'}
                                        </small>
                                        <h3 style={{ margin: 0, fontSize: 18 }}>{orderCode(order)}</h3>
                                    </div>
                                    {isAllCompleted ? (
                                        <span className="status ready" style={{ background: '#12852f', color: '#fff', padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                            <i className="bi bi-check2-all"></i> ครัวทำเสร็จครบแล้ว
                                        </span>
                                    ) : readyToServeItems.length > 0 ? (
                                        <span className="status ready" style={{ background: '#0284c7', color: '#fff', padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                            <i className="bi bi-bell-fill"></i> ทยอยเสิร์ฟ (พร้อมส่ง {readyToServeItems.length} เมนู)
                                        </span>
                                    ) : (
                                        <span className="status pending" style={{ background: '#eab308', color: '#713f12', padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                            <i className="bi bi-hourglass-split"></i> เสิร์ฟแล้ว {alreadyServedItems.length}/{items.length} (รอครัว)
                                        </span>
                                    )}
                                </header>

                                <div className="cashier-order-meta" style={{ padding: '12px 14px 8px' }}>
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 }}>
                                        <span style={{ fontWeight: 700, color: 'var(--brand-primary-dark)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                            {isDineIn ? <><i className="bi bi-shop"></i> ทานที่ร้าน</> : <><i className="bi bi-box2"></i> สั่งกลับบ้าน</>}
                                        </span>
                                        {isDineIn && (
                                            <span className="table-number-badge" style={{ background: '#b8ff35', color: '#075c1b', fontWeight: 900, padding: '4px 12px', borderRadius: 8, fontSize: 14, border: '1.5px solid #b8ff35' }}>
                                                โต๊ะ {order.tableNumber || '—'}
                                            </span>
                                        )}
                                        {order.isPaid ? (
                                            <span className="status paid" style={{ fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                                <i className="bi bi-check2"></i> ชำระแล้ว ({order.paymentMethod || 'เงินสด'})
                                            </span>
                                        ) : (
                                            <span className="status pending" style={{ fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                                <i className="bi bi-clock-history"></i> ยังไม่ชำระ ({money(order.totalAmount)})
                                            </span>
                                        )}
                                    </div>

                                    <div style={{ fontSize: 13, color: '#6d7b6e', marginBottom: 4 }}>
                                        <i className="bi bi-person me-1"></i> {customerLabel(order)}
                                        {order.customerPhone && <span style={{ marginLeft: 8, color: '#6d7b6e' }}><i className="bi bi-telephone me-1"></i>{order.customerPhone}</span>}
                                    </div>
                                </div>

                                {/* Serving Progress Bar */}
                                <div style={{ margin: '0 14px 10px', background: '#f6faf2', padding: '8px 12px', borderRadius: 8, border: '1px solid #d8e7d2' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                                        <span>ความคืบหน้าอาหาร</span>
                                        <span style={{ color: isAllCompleted ? '#075c1b' : '#0369a1' }}>
                                            {isAllCompleted ? `ครบแล้ว (${items.length}/${items.length})` : `เสร็จ ${totalCompleted}/${items.length} รายการ (${progressPct}%)`}
                                        </span>
                                    </div>
                                    <div style={{ width: '100%', height: 6, background: '#d8e7d2', borderRadius: 6, overflow: 'hidden' }}>
                                        <div style={{ width: `${progressPct}%`, height: '100%', background: isAllCompleted ? '#12852f' : '#0284c7', borderRadius: 6, transition: 'width 0.3s ease' }} />
                                    </div>
                                </div>

                                {/* Items Breakdown */}
                                <div style={{ padding: '0 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {/* Ready To Serve Items */}
                                    {readyToServeItems.length > 0 && (
                                        <div>
                                            <div style={{ fontSize: 11, fontWeight: 800, color: '#075c1b', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <i className="bi bi-bell-fill text-success"></i> พร้อมนำไปเสิร์ฟที่โต๊ะ ({readyToServeItems.length} รายการ)
                                            </div>
                                            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
                                                {readyToServeItems.map(item => (
                                                    <li key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#effbdc', border: '1.5px solid #9fe51f', padding: '6px 10px', borderRadius: 8, fontSize: 13 }}>
                                                        <div>
                                                            <strong style={{ color: '#075c1b' }}>{item.productName || item.displayName || 'สินค้า'}</strong>
                                                            {item.isTakeaway && <span style={{ fontSize: 10, background: '#fef3c7', color: '#92400e', padding: '1px 5px', borderRadius: 4, marginLeft: 5, fontWeight: 700 }}>กลับบ้าน</span>}
                                                            {item.isAddedLater && <span style={{ fontSize: 10, background: '#fee2e2', color: '#b91c1c', padding: '1px 5px', borderRadius: 4, marginLeft: 5, fontWeight: 700 }}>สั่งเพิ่ม</span>}
                                                            {item.cleanNote && <small style={{ display: 'block', color: '#b45309', fontSize: 11 }}>{item.cleanNote}</small>}
                                                        </div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                            <strong style={{ color: '#075c1b', fontSize: 13 }}>×{item.quantity}</strong>
                                                            {onServeItem && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => onServeItem(order, item.id)}
                                                                    title="คลิกเมื่อนำรายการนี้ไปเสิร์ฟที่โต๊ะแล้ว"
                                                                    style={{ padding: '3px 8px', fontSize: 11, fontWeight: 700, background: '#12852f', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 3 }}
                                                                >
                                                                    <i className="bi bi-check2"></i> เสิร์ฟแล้ว
                                                                </button>
                                                            )}
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {/* Already Served Items */}
                                    {alreadyServedItems.length > 0 && (
                                        <div>
                                            <div style={{ fontSize: 11, fontWeight: 700, color: '#6d7b6e', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <i className="bi bi-check2-circle text-muted"></i> เสิร์ฟที่โต๊ะแล้ว ({alreadyServedItems.length} รายการ)
                                            </div>
                                            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                {alreadyServedItems.map(item => (
                                                    <li key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fafaf9', border: '1px solid #e7e5e4', padding: '4px 10px', borderRadius: 6, fontSize: 12, color: '#78716c' }}>
                                                        <span style={{ textDecoration: 'line-through' }}>{item.productName || item.displayName || 'สินค้า'}</span>
                                                        <span style={{ color: '#12852f', fontSize: 11, fontWeight: 700 }}><i className="bi bi-check-circle-fill me-1" />เสิร์ฟแล้ว ×{item.quantity}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {/* Cooking in Kitchen Items */}
                                    {cookingItems.length > 0 && (
                                        <div>
                                            <div style={{ fontSize: 11, fontWeight: 700, color: '#b45309', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <i className="bi bi-fire text-warning"></i> กำลังปรุงในครัว ({cookingItems.length} รายการ)
                                            </div>
                                            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                {cookingItems.map(item => (
                                                    <li key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fffbeb', border: '1px dashed #fcd34d', padding: '4px 10px', borderRadius: 6, fontSize: 12, color: '#92400e' }}>
                                                        <span>{item.productName || item.displayName || 'สินค้า'}</span>
                                                        <span style={{ fontSize: 11, fontWeight: 700 }}><i className="bi bi-hourglass-split me-1" />กำลังปรุง ×{item.quantity}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>

                                <div className="cashier-due" style={{ padding: '10px 14px', borderTop: '1px solid #f0f0f0', marginTop: 8 }}>
                                    <span>ยอดรวม</span>
                                    <strong>{money(order.totalAmount)}</strong>
                                </div>

                                <div className="staff-actions" style={{ padding: '12px 14px', gap: 8, flexWrap: 'wrap' }}>
                                    <button className="staff-secondary" onClick={() => onViewReceipt(order)}>
                                        <i className="bi bi-receipt me-1"></i> ดูรายการ
                                    </button>
                                    {onAddItems && (
                                        <button
                                            type="button"
                                            className="staff-secondary"
                                            onClick={() => onAddItems(order)}
                                            style={{ background: '#effbdc', borderColor: '#9fe51f', color: '#075c1b', display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 700 }}
                                        >
                                            <i className="bi bi-plus-circle"></i> สั่งเพิ่ม
                                        </button>
                                    )}
                                    {readyToServeItems.length > 0 && onServeAllReadyItems && !isAllCompleted && (
                                        <button
                                            type="button"
                                            onClick={() => onServeAllReadyItems(order)}
                                            style={{ padding: '8px 12px', fontSize: 12, fontWeight: 800, background: '#0284c7', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                            title="กดเมื่อนำรายการที่พร้อมทั้งหมดไปเสิร์ฟที่โต๊ะแล้ว"
                                        >
                                            <i className="bi bi-send-check"></i> เสิร์ฟที่พร้อม ({readyToServeItems.length})
                                        </button>
                                    )}
                                    <button
                                        className="staff-primary"
                                        style={{ flex: 1, minHeight: 44, fontSize: 13, fontWeight: 800, background: '#12852f', borderColor: '#075c1b', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                                        onClick={() => {
                                            if (cookingItems.length > 0) {
                                                if (!window.confirm(`โต๊ะนี้ยังมีอีก ${cookingItems.length} รายการที่ครัวกำลังปรุงอยู่ ต้องการส่งมอบและปิดออเดอร์ทั้งหมดทันทีหรือไม่?`)) {
                                                    return
                                                }
                                            }
                                            onCompleteOrder(order)
                                        }}
                                    >
                                        <i className="bi bi-check2-circle"></i> {isAllCompleted ? 'ส่งมอบครบแล้ว' : 'ส่งมอบทั้งหมด'}
                                    </button>
                                </div>
                            </article>
                        )
                    })
                )}
            </div>
        </section>
    )
}

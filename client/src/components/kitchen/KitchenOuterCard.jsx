import { orderCode, scheduleLabel } from '../StaffShared'

export function KitchenOuterCard({
    order,
    onOpenModal,
    actionLoadingId,
    onDispatchAll,
    startOrder,
    finishOrder,
    cancelKitchenOrder,
}) {
    const isActionLoading = actionLoadingId === order.id
    const isDineIn = order.deliveryType === 'ทานที่ร้าน'
    const isCancelled = order.serverStatus === 'CANCELLED' || order.foodStatus === 'ยกเลิก'

    const items = order.items || []
    const readyItems = items.filter(i => i.itemStatus === 'READY' || i.itemStatus === 'SERVED')
    const activeItems = items.filter(i => i.itemStatus !== 'READY' && i.itemStatus !== 'SERVED')
    const hasAddedLater = items.some(i => i.isAddedLater)
    const progressPercent = items.length > 0 ? Math.round((readyItems.length / items.length) * 100) : 0
    const isAllReady = items.length > 0 && readyItems.length === items.length

    return (
        <article
            className={`kitchen-outer-white-card status-${(order.serverStatus || 'CONFIRMED').toLowerCase()}${isCancelled ? ' is-cancelled' : ''}`}
            onClick={isCancelled ? undefined : () => onOpenModal?.(order)}
            style={{
                cursor: isCancelled ? 'default' : 'pointer',
                opacity: isCancelled ? 0.78 : 1,
            }}
            title={isCancelled ? 'ออเดอร์ถูกยกเลิกแล้ว (ไม่สามารถดำเนินการได้)' : 'คลิกเพื่อดูและส่งทีละรายการ (Popup)'}
        >
            {/* Header */}
            <header className="kitchen-outer-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    {isDineIn ? (
                        <div className="kitchen-table-badge">
                            <i className="bi bi-shop"></i> โต๊ะ {order.tableNumber || '—'}
                        </div>
                    ) : (
                        <div className="kitchen-takeaway-badge">
                            <i className="bi bi-box2-fill"></i> {order.deliveryType || 'สั่งกลับบ้าน'}
                        </div>
                    )}
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#17351f' }}>
                                {orderCode(order)}
                            </h3>
                            {hasAddedLater && (
                                <span className="kitchen-batch-pill">
                                    <i className="bi bi-plus-circle-fill"></i> มีสั่งเพิ่ม
                                </span>
                            )}
                        </div>
                        {order.customerName && (
                            <small style={{ color: '#6d7b6e', fontSize: 12 }}>
                                ลูกค้า: {order.customerName}
                            </small>
                        )}
                    </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                    <span className={`status ${order.serverStatus === 'PREPARING' ? 'cooking' : order.serverStatus === 'READY' ? 'paid' : order.serverStatus === 'CANCELLED' ? 'blocked' : 'pending'}`}>
                        {order.serverStatus === 'CONFIRMED' ? (
                            <><i className="bi bi-clock-history"></i> รอทำ</>
                        ) : order.serverStatus === 'PREPARING' ? (
                            <><i className="bi bi-fire"></i> กำลังทำ</>
                        ) : order.serverStatus === 'READY' ? (
                            <><i className="bi bi-check2-circle"></i> พร้อมเสิร์ฟ</>
                        ) : (
                            <><i className="bi bi-x-circle"></i> ยกเลิก</>
                        )}
                    </span>
                    <div style={{ fontSize: 11, color: '#6d7b6e', marginTop: 3 }}>
                        {scheduleLabel(order)} · สั่ง {new Date(order.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                </div>
            </header>

            {/* Overall Progress Box */}
            <div className="kitchen-progress-box">
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, marginBottom: 4, color: '#17351f' }}>
                    <span>ความคืบหน้าอาหาร</span>
                    <span style={{ color: isAllReady ? 'var(--brand-primary, #12852f)' : '#1d4ed8' }}>
                        เสร็จแล้ว {readyItems.length}/{items.length} รายการ ({progressPercent}%)
                    </span>
                </div>
                <div className="kitchen-progress-track">
                    <div
                        className="kitchen-progress-bar"
                        style={{
                            width: `${progressPercent}%`,
                            background: isAllReady ? 'var(--brand-primary, #12852f)' : '#3b82f6',
                        }}
                    />
                </div>
            </div>

            {/* Order Notes */}
            {order.notes && (
                <div className="kitchen-notes-callout">
                    <i className="bi bi-chat-left-text me-1"></i>
                    <strong>หมายเหตุโต๊ะ:</strong> {order.notes}
                </div>
            )}

            {/* Items Summary Preview */}
            <div className="kitchen-preview-items-box">
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {items.slice(0, 4).map(item => {
                        const isDone = item.itemStatus === 'READY' || item.itemStatus === 'SERVED'
                        return (
                            <li
                                key={item.id}
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    fontSize: 13,
                                    padding: '6px 0',
                                    borderBottom: '1px dashed #e8f0e6',
                                    color: isDone ? '#9ca3af' : '#17351f',
                                    textDecoration: isDone ? 'line-through' : 'none',
                                }}
                            >
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                                    <span style={{ color: isDone ? 'var(--brand-primary, #12852f)' : '#f59e0b', fontSize: 13, display: 'inline-flex' }}>
                                        {isDone ? <i className="bi bi-check2" /> : <i className="bi bi-circle-fill" style={{ fontSize: 6 }} />}
                                    </span>
                                    <span style={{ fontWeight: isDone ? 500 : 700 }}>
                                        {item.productName || item.displayName || 'สินค้า'}
                                    </span>
                                    {item.isAddedLater && (
                                        <span className="kitchen-batch-pill" style={{ fontSize: 10, padding: '1px 6px' }}>
                                            สั่งเพิ่ม
                                        </span>
                                    )}
                                </span>
                                <strong className="kitchen-preview-qty">×{item.quantity}</strong>
                            </li>
                        )
                    })}
                    {items.length > 4 && (
                        <li style={{ fontSize: 12, color: '#6d7b6e', padding: '6px 0 2px', textAlign: 'center', fontStyle: 'italic' }}>
                            และอีก {items.length - 4} รายการ...
                        </li>
                    )}
                </ul>
            </div>

            {/* Click to open popup hint banner */}
            <div
                className={`kitchen-card-open-hint ${isCancelled ? 'disabled' : ''}`}
                style={isCancelled ? {
                    background: '#f9fafb',
                    color: '#9ca3af',
                    borderColor: '#e5e7eb',
                    cursor: 'not-allowed',
                    pointerEvents: 'none',
                } : undefined}
            >
                <i className={`bi ${isCancelled ? 'bi-slash-circle' : 'bi-cursor-fill'} me-1`}></i>
                {isCancelled ? 'ออเดอร์ถูกยกเลิกแล้ว (ปิดการสั่งทำ)' : 'คลิกการ์ดนี้เพื่อเปิดส่งทีละรายการ (Popup)'}
            </div>

            {/* Quick Actions Footer */}
            <footer
                className="kitchen-outer-footer"
                onClick={e => e.stopPropagation()}
            >
                {!isAllReady && (
                    <button
                        type="button"
                        className="kitchen-dispatch-all-btn"
                        onClick={() => onDispatchAll(order)}
                        disabled={isActionLoading || isCancelled}
                        style={isCancelled ? {
                            background: '#9ca3af',
                            borderColor: '#9ca3af',
                            color: '#ffffff',
                            cursor: 'not-allowed',
                            opacity: 0.45,
                            boxShadow: 'none',
                            pointerEvents: 'none',
                        } : undefined}
                    >
                        <i className={`bi ${isActionLoading ? 'bi-arrow-repeat spin' : 'bi-send-check-fill'}`}></i>
                        {isActionLoading ? 'กำลังส่ง...' : `ส่งทุกรายการ (${activeItems.length})`}
                    </button>
                )}

                {order.serverStatus === 'CONFIRMED' && (
                    <button
                        type="button"
                        className="staff-secondary"
                        onClick={() => startOrder(order)}
                        disabled={isActionLoading || isCancelled}
                        style={{
                            padding: '8px 12px',
                            fontSize: 12,
                            fontWeight: 700,
                            ...(isCancelled ? { opacity: 0.45, cursor: 'not-allowed', pointerEvents: 'none' } : {}),
                        }}
                    >
                        <i className={`bi ${isActionLoading ? 'bi-arrow-repeat spin me-1' : 'bi-fire me-1'}`}></i>
                        {isActionLoading ? 'กำลังเริ่ม...' : 'เริ่มทำ'}
                    </button>
                )}

                {order.serverStatus === 'PREPARING' && isAllReady && (
                    <button
                        type="button"
                        className="staff-primary"
                        onClick={() => finishOrder(order)}
                        disabled={isActionLoading || isCancelled}
                        style={{
                            flex: 1,
                            padding: '8px 12px',
                            fontSize: 12,
                            fontWeight: 800,
                            background: 'var(--brand-primary, #12852f)',
                            ...(isCancelled ? { opacity: 0.45, cursor: 'not-allowed', pointerEvents: 'none' } : {}),
                        }}
                    >
                        <i className={`bi ${isActionLoading ? 'bi-arrow-repeat spin me-1' : 'bi-check2-circle me-1'}`}></i>
                        {isActionLoading ? 'กำลังอัปเดต...' : 'พร้อมเสิร์ฟ'}
                    </button>
                )}

                <button
                    type="button"
                    className="staff-danger"
                    onClick={() => cancelKitchenOrder(order)}
                    disabled={isActionLoading || isCancelled}
                    title={isCancelled ? 'ออเดอร์นี้ถูกยกเลิกแล้ว' : 'ยกเลิกออเดอร์'}
                    style={{
                        padding: '8px 10px',
                        fontSize: 12,
                        background: isCancelled ? '#f3f4f6' : '#fee2e2',
                        color: isCancelled ? '#9ca3af' : '#b91c1c',
                        border: isCancelled ? '1px solid #e5e7eb' : '1px solid #fca5a5',
                        borderRadius: 8,
                        cursor: isCancelled ? 'not-allowed' : 'pointer',
                        fontWeight: 700,
                        opacity: isCancelled ? 0.45 : 1,
                        pointerEvents: isCancelled ? 'none' : 'auto',
                    }}
                >
                    <i className={`bi ${isActionLoading ? 'bi-arrow-repeat spin' : 'bi-x-circle'}`}></i>
                </button>
            </footer>
        </article>
    )
}

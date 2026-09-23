import { useState } from 'react'
import { orderCode, scheduleLabel } from '../StaffShared'
import { KitchenItemRow } from './KitchenItemRow'

export function KitchenItemModal({
    order,
    onClose,
    itemLoadingKey,
    onUpdateItemStatus,
    onDispatchAll,
    startOrder,
    finishOrder,
}) {
    const [showCompletedHistory, setShowCompletedHistory] = useState(false)
    if (!order) return null

    const items = order.items || []
    const readyItems = items.filter(i => i.itemStatus === 'READY' || i.itemStatus === 'SERVED')
    const activeItems = items.filter(i => i.itemStatus !== 'READY' && i.itemStatus !== 'SERVED')
    const hasAddedLater = items.some(i => i.isAddedLater)
    const progressPercent = items.length > 0 ? Math.round((readyItems.length / items.length) * 100) : 0
    const isAllReady = items.length > 0 && readyItems.length === items.length
    const isDineIn = order.deliveryType === 'ทานที่ร้าน'

    return (
        <div className="kitchen-modal-overlay" onClick={onClose}>
            <div
                className="kitchen-modal-content"
                onClick={e => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label="จัดการรายการอาหารในออเดอร์"
            >
                {/* Modal Header */}
                <header className="kitchen-modal-header">
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
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#17351f' }}>
                                    {orderCode(order)}
                                </h3>
                                {hasAddedLater && (
                                    <span className="kitchen-batch-pill">
                                        <i className="bi bi-plus-circle-fill"></i> มีสั่งเพิ่ม
                                    </span>
                                )}
                            </div>
                            <small style={{ color: '#6d7b6e', fontSize: 12 }}>
                                {order.customerName ? `ลูกค้า: ${order.customerName} · ` : ''}
                                {scheduleLabel(order)} · สั่ง {new Date(order.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                            </small>
                        </div>
                    </div>

                    <button
                        type="button"
                        className="kitchen-modal-close"
                        onClick={onClose}
                        title="ปิดหน้าต่าง"
                        aria-label="ปิด"
                    >
                        <i className="bi bi-x-lg" />
                    </button>
                </header>

                {/* Modal Body */}
                <div className="kitchen-modal-body">
                    {/* Overall Progress Box */}
                    <div className="kitchen-progress-box">
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, marginBottom: 4, color: '#17351f' }}>
                            <span>ความคืบหน้าอาหาร (กดส่งทีละรายการได้ที่นี่)</span>
                            <span style={{ color: isAllReady ? '#12852f' : '#1d4ed8' }}>
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

                    {/* Table Notes */}
                    {order.notes && (
                        <div className="kitchen-notes-callout">
                            <i className="bi bi-chat-left-text me-1"></i>
                            <strong>หมายเหตุโต๊ะ:</strong> {order.notes}
                        </div>
                    )}

                    {/* Active Items to Prepare and Dispatch */}
                    <div style={{ marginTop: 12 }}>
                        {activeItems.length > 0 ? (
                            <div>
                                <div style={{ fontSize: 13, fontWeight: 800, color: '#17351f', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <i className="bi bi-fire text-danger"></i> รายการที่ต้องทำ/พร้อมส่ง ({activeItems.length} รายการ)
                                </div>
                                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                    {activeItems.map(item => (
                                        <KitchenItemRow
                                            key={item.id}
                                            item={item}
                                            orderId={order.id}
                                            itemLoadingKey={itemLoadingKey}
                                            onUpdateItemStatus={onUpdateItemStatus}
                                        />
                                    ))}
                                </ul>
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '16px', background: '#effbdc', color: '#075c1b', borderRadius: 10, fontWeight: 700, fontSize: 14, border: '1.5px solid #9fe51f' }}>
                                <i className="bi bi-check2-all me-1" style={{ fontSize: 20 }}></i>
                                <div>อาหารพร้อมเสิร์ฟครบทุกรายการแล้ว!</div>
                            </div>
                        )}

                        {/* Completed Items Section */}
                        {readyItems.length > 0 && activeItems.length > 0 && (
                            <div style={{ marginTop: 12 }}>
                                <button
                                    type="button"
                                    onClick={() => setShowCompletedHistory(prev => !prev)}
                                    style={{
                                        width: '100%',
                                        padding: '8px 12px',
                                        background: '#effbdc',
                                        border: '1px dashed #9fe51f',
                                        borderRadius: 8,
                                        color: '#075c1b',
                                        fontSize: 12,
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                    }}
                                >
                                    <span><i className="bi bi-check-circle-fill me-1"></i> รายการที่ส่งไปเสิร์ฟแล้ว ({readyItems.length} รายการ)</span>
                                    <i className={`bi bi-chevron-${showCompletedHistory ? 'up' : 'down'}`}></i>
                                </button>
                                {showCompletedHistory && (
                                    <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0 0' }}>
                                        {readyItems.map(item => (
                                            <KitchenItemRow
                                                key={item.id}
                                                item={item}
                                                orderId={order.id}
                                                itemLoadingKey={itemLoadingKey}
                                                onUpdateItemStatus={onUpdateItemStatus}
                                            />
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Modal Footer */}
                <footer className="kitchen-modal-footer">
                    {!isAllReady && (
                        <button
                            type="button"
                            className="kitchen-dispatch-all-btn"
                            onClick={() => onDispatchAll(order)}
                        >
                            <i className="bi bi-send-check-fill"></i>
                            กดส่งทุกรายการที่เหลือ ({activeItems.length})
                        </button>
                    )}

                    {order.serverStatus === 'CONFIRMED' && (
                        <button
                            type="button"
                            className="staff-secondary"
                            onClick={() => startOrder(order)}
                            style={{ padding: '8px 14px', fontSize: 13, fontWeight: 700 }}
                        >
                            <i className="bi bi-fire me-1"></i> เริ่มทำทั้งออเดอร์
                        </button>
                    )}

                    {order.serverStatus === 'PREPARING' && isAllReady && (
                        <button
                            type="button"
                            className="staff-primary"
                            onClick={() => {
                                finishOrder(order)
                                onClose()
                            }}
                            style={{ padding: '10px 16px', fontSize: 13, fontWeight: 800, background: 'var(--brand-primary, #12852f)' }}
                        >
                            <i className="bi bi-check2-circle me-1"></i> พร้อมเสิร์ฟแล้ว
                        </button>
                    )}

                    <button
                        type="button"
                        className="staff-secondary"
                        onClick={onClose}
                        style={{ padding: '8px 16px', fontSize: 13, fontWeight: 700 }}
                    >
                        ปิดหน้าต่าง
                    </button>
                </footer>
            </div>
        </div>
    )
}

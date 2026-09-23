import { useState } from 'react'
import { Empty } from '../StaffShared'
import { KitchenOuterCard } from './KitchenOuterCard'
import { KitchenItemModal } from './KitchenItemModal'
import { useKitchenItemActions } from './useKitchenItemActions'

export function KitchenQueueTab({
    statusFilter,
    setStatusFilter,
    waiting,
    preparing,
    ready,
    cancelled,
    queue,
    setQueue,
    setOrders,
    loadKitchenData,
    addToast,
    stats,
    loading,
    displayedOrders,
    actionLoadingId,
    startOrder,
    finishOrder,
    cancelKitchenOrder,
}) {
    const [modalOrderId, setModalOrderId] = useState(null)
    const currentModalOrder = modalOrderId ? (queue.find(o => o.id === modalOrderId) || null) : null

    const { itemLoadingKey, updateItemStatus, dispatchAllRemaining } = useKitchenItemActions({
        setQueue,
        setOrders,
        refreshData: loadKitchenData,
        addToast,
    })

    return (
        <section>
            <div className="staff-section-head" style={{ alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
                <div>
                    <h2>คิวทำอาหาร (Kitchen Queue)</h2>
                    <p>คลิกการ์ดเพื่อเปิด Popup ดูและกดส่งทีละรายการ หรือจัดการด่วนที่การ์ดได้ทันที</p>
                </div>
                {/* 4-Status Filter Pills */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginLeft: 'auto' }}>
                    <button
                        type="button"
                        onClick={() => setStatusFilter('active')}
                        style={{
                            padding: '6px 12px',
                            borderRadius: 20,
                            border: statusFilter === 'active' ? '2px solid var(--brand-primary, #12852f)' : '1px solid #d8e7d2',
                            background: statusFilter === 'active' ? '#e8f5e9' : '#fff',
                            color: statusFilter === 'active' ? '#12852f' : '#17351f',
                            fontWeight: 700,
                            fontSize: 12,
                            cursor: 'pointer'
                        }}
                    >
                        กำลังดำเนินการ ({waiting.length + preparing.length + ready.length})
                    </button>
                    <button
                        type="button"
                        onClick={() => setStatusFilter('CONFIRMED')}
                        style={{
                            padding: '6px 12px',
                            borderRadius: 20,
                            border: statusFilter === 'CONFIRMED' ? '2px solid #f59e0b' : '1px solid #d8e7d2',
                            background: statusFilter === 'CONFIRMED' ? '#fef3c7' : '#fff',
                            color: statusFilter === 'CONFIRMED' ? '#b45309' : '#17351f',
                            fontWeight: 700,
                            fontSize: 12,
                            cursor: 'pointer'
                        }}
                    >
                        <i className="bi bi-clock-history" style={{ marginRight: 5 }}></i>
                        รอทำ ({waiting.length})
                    </button>
                    <button
                        type="button"
                        onClick={() => setStatusFilter('PREPARING')}
                        style={{
                            padding: '6px 12px',
                            borderRadius: 20,
                            border: statusFilter === 'PREPARING' ? '2px solid #3b82f6' : '1px solid #d8e7d2',
                            background: statusFilter === 'PREPARING' ? '#dbeafe' : '#fff',
                            color: statusFilter === 'PREPARING' ? '#1d4ed8' : '#17351f',
                            fontWeight: 700,
                            fontSize: 12,
                            cursor: 'pointer'
                        }}
                    >
                        <i className="bi bi-fire" style={{ marginRight: 5 }}></i>
                        กำลังทำ ({preparing.length})
                    </button>
                    <button
                        type="button"
                        onClick={() => setStatusFilter('READY')}
                        style={{
                            padding: '6px 12px',
                            borderRadius: 20,
                            border: statusFilter === 'READY' ? '2px solid #12852f' : '1px solid #d8e7d2',
                            background: statusFilter === 'READY' ? '#effbdc' : '#fff',
                            color: statusFilter === 'READY' ? '#075c1b' : '#17351f',
                            fontWeight: 700,
                            fontSize: 12,
                            cursor: 'pointer'
                        }}
                    >
                        <i className="bi bi-check2-circle" style={{ marginRight: 5 }}></i>
                        พร้อมเสิร์ฟ ({ready.length})
                    </button>
                    <button
                        type="button"
                        onClick={() => setStatusFilter('CANCELLED')}
                        style={{
                            padding: '6px 12px',
                            borderRadius: 20,
                            border: statusFilter === 'CANCELLED' ? '2px solid #ef4444' : '1px solid #d8e7d2',
                            background: statusFilter === 'CANCELLED' ? '#fee2e2' : '#fff',
                            color: statusFilter === 'CANCELLED' ? '#b91c1c' : '#17351f',
                            fontWeight: 700,
                            fontSize: 12,
                            cursor: 'pointer'
                        }}
                    >
                        <i className="bi bi-x-circle" style={{ marginRight: 5 }}></i>
                        ยกเลิก ({cancelled.length})
                    </button>
                </div>
            </div>

            {stats && (
                <div className="staff-metrics">
                    <article><small>รอเริ่มทำ</small><strong style={{ color: '#b45309' }}>{stats.confirmed ?? waiting.length}</strong></article>
                    <article><small>กำลังทำ</small><strong style={{ color: '#1d4ed8' }}>{stats.preparing ?? preparing.length}</strong></article>
                    <article><small>พร้อมเสิร์ฟ</small><strong style={{ color: '#075c1b' }}>{ready.length}</strong></article>
                    <article><small>คิวทั้งหมด</small><strong>{queue.length}</strong></article>
                </div>
            )}

            {/* Container Box wrapping all order cards with internal scrollbar */}
            <div className={`kitchen-queue-container-box ${(loading || displayedOrders.length === 0) ? 'is-empty' : ''}`}>
                <div className={`staff-order-grid ${(loading || displayedOrders.length === 0) ? 'is-empty' : ''}`}>
                    {loading ? (
                        <Empty text="กำลังโหลดคิวครัว..." />
                    ) : displayedOrders.length === 0 ? (
                        <Empty text="ไม่มีออเดอร์ในหมวดนี้" />
                    ) : (
                        displayedOrders.map(order => (
                            <KitchenOuterCard
                                key={order.id}
                                order={order}
                                onOpenModal={o => setModalOrderId(o.id)}
                                actionLoadingId={actionLoadingId}
                                onDispatchAll={dispatchAllRemaining}
                                startOrder={startOrder}
                                finishOrder={finishOrder}
                                cancelKitchenOrder={cancelKitchenOrder}
                            />
                        ))
                    )}
                </div>
            </div>

            {/* Item-by-item Dispatch Popup Modal */}
            {currentModalOrder && (
                <KitchenItemModal
                    order={currentModalOrder}
                    onClose={() => setModalOrderId(null)}
                    itemLoadingKey={itemLoadingKey}
                    onUpdateItemStatus={updateItemStatus}
                    onDispatchAll={dispatchAllRemaining}
                    startOrder={startOrder}
                    finishOrder={finishOrder}
                />
            )}
        </section>
    )
}

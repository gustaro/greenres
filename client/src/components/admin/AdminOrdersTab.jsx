import { useRef, useState } from 'react'
import { PageHead, Empty, money, formatCashierPaymentMethod } from './AdminShared'
import { DeliveryImageLightbox } from '../delivery/DeliveryImageLightbox'
import { orderItemOptionLabel } from '../../lib/productOptions'

export function AdminOrdersTab({
    pendingOrders = [],
    orders = [],
    products = [],
    approveOrder,
    cancelOrder,
}) {
    const [actionLoading, setActionLoading] = useState(null)
    const [lightboxImage, setLightboxImage] = useState(null)
    const [search, setSearch] = useState('')
    const [sourceFilter, setSourceFilter] = useState('all')
    const actionRequestRef = useRef(false)

    const normalizedSearch = search.trim().toLowerCase()
    const matchesOrder = order => !normalizedSearch || `${order.orderNumber || order.id} ${order.customerId || ''}`.toLowerCase().includes(normalizedSearch)
    const visiblePendingOrders = pendingOrders.filter(matchesOrder)
    const visibleHistory = orders.filter(order => order.serverStatus !== 'PENDING' && matchesOrder(order) && (sourceFilter === 'all' || order.orderSource === sourceFilter))

    const handleCancel = async (orderId) => {
        if (!cancelOrder || actionRequestRef.current) return
        actionRequestRef.current = true
        setActionLoading(orderId)
        try {
            await cancelOrder(orderId)
        } finally {
            actionRequestRef.current = false
            setActionLoading(null)
        }
    }

    const handleApprove = async (orderId) => {
        if (!approveOrder || actionRequestRef.current) return
        actionRequestRef.current = true
        setActionLoading(orderId)
        try {
            await approveOrder(orderId)
        } finally {
            actionRequestRef.current = false
            setActionLoading(null)
        }
    }

    return (
        <>
            <PageHead eyebrow="ORDER APPROVAL" title="อนุมัติออเดอร์ออนไลน์" description="ออเดอร์ออนไลน์จากลูกค้า — ต้องอนุมัติก่อนส่งเข้าครัว (ออเดอร์หน้าร้านไม่ต้องอนุมัติ)" />
            <div className="admin-order-cards">
                {visiblePendingOrders.length === 0 ? (
                    <Empty>ไม่มีออเดอร์ออนไลน์ที่รออนุมัติ</Empty>
                ) : (
                    visiblePendingOrders.map(order => (
                        <article key={order.id} className="admin-order-card">
                            <header>
                                <div>
                                    <span><i className="bi bi-globe me-1" />ออเดอร์ออนไลน์ — รออนุมัติ</span>
                                    <h3>{order.orderNumber || order.id}</h3>
                                </div>
                                <strong>{money(order.totalAmount)}</strong>
                            </header>
                            <p>
                                ลูกค้า: {order.customerId} · {order.deliveryType}
                                {order.deliveryScheduleType === 'ระบุเวลา' && order.scheduledAt ? ` (${new Date(order.scheduledAt).toLocaleString('th-TH')})` : order.deliveryType === 'ให้จัดส่ง' ? ' (ทันที)' : ''}
                                {' · '}{formatCashierPaymentMethod(order.paymentMethod, order)}
                            </p>
                            <ul>
                                {order.items.map(item => (
                                    <li key={item.id}>
                                        <span>
                                            {item.productName || products.find(product => product.id === String(item.productId))?.name || item.productId} × {item.quantity}
                                            {orderItemOptionLabel(item) && <small className="staff-item-options">{orderItemOptionLabel(item)}</small>}
                                        </span>
                                        <b>{money(item.priceAtTime * item.quantity)}</b>
                                    </li>
                                ))}
                            </ul>
                            <footer>
                                <button
                                    className="admin-danger"
                                    disabled={Boolean(actionLoading)}
                                    onClick={() => handleCancel(order.id)}
                                >
                                    {actionLoading === order.id ? (
                                        <><i className="bi bi-arrow-repeat spin me-1" />กำลังยกเลิก...</>
                                    ) : (
                                        'ยกเลิกออเดอร์'
                                    )}
                                </button>
                                <button
                                    className="admin-primary"
                                    disabled={Boolean(actionLoading)}
                                    onClick={() => handleApprove(order.id)}
                                >
                                    {actionLoading === order.id ? (
                                        <><i className="bi bi-arrow-repeat spin me-1" />กำลังอนุมัติ...</>
                                    ) : (
                                        <><i className="bi bi-check-circle-fill me-1" />อนุมัติ → ส่งเข้าครัว</>
                                    )}
                                </button>
                            </footer>
                        </article>
                    ))
                )}
            </div>
            <section className="admin-panel admin-history">
                <div className="admin-panel-head">
                    <div><h2>ประวัติคำสั่งซื้อ</h2><p>รายการที่ผ่านการตรวจสอบแล้ว พร้อมหลักฐานการจัดส่งและชำระเงิน</p></div>
                </div>
                <div className="admin-list-toolbar">
                    <label className="admin-list-search"><i className="bi bi-search" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="ค้นหาเลขออเดอร์หรือลูกค้า..." /></label>
                    <select value={sourceFilter} onChange={event => setSourceFilter(event.target.value)} aria-label="กรองตามช่องทาง">
                        <option value="all">ทุกช่องทาง</option><option value="online">ออนไลน์</option><option value="walkin">ทานที่ร้าน</option><option value="takeaway">สั่งกลับบ้าน</option>
                    </select>
                    <span>{visibleHistory.length} รายการ</span>
                </div>
                <div className="admin-table-wrap">
                    <table className="admin-responsive-table">
                        <thead>
                            <tr>
                                <th>เลขออเดอร์</th>
                                <th>ลูกค้า</th>
                                <th>ช่องทาง</th>
                                <th>ยอดรวม</th>
                                <th>สถานะ</th>
                                <th>หลักฐาน (รูปภาพ)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {visibleHistory.map(order => (
                                <tr key={order.id}>
                                    <td data-label="เลขออเดอร์"><b>{order.orderNumber || order.id}</b></td>
                                    <td data-label="ลูกค้า">{order.customerId}</td>
                                    <td data-label="ช่องทาง">
                                        <i className={`admin-badge ${order.orderSource === 'online' ? '' : 'pending'}`}>
                                            {order.orderSource === 'walkin' ? 'ทานที่ร้าน' : order.orderSource === 'takeaway' ? 'สั่งกลับบ้าน' : 'ออนไลน์'}
                                        </i>
                                    </td>
                                    <td data-label="ยอดรวม">{money(order.totalAmount)}</td>
                                    <td data-label="สถานะ"><i className="admin-badge">{order.foodStatus}</i></td>
                                    <td data-label="หลักฐาน">
                                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                            {order.proofImageUrl && (
                                                <button
                                                    type="button"
                                                    onClick={() => setLightboxImage({
                                                        url: order.proofImageUrl,
                                                        title: 'ภาพถ่ายตอนส่งของสำเร็จ',
                                                        subtitle: `ออเดอร์ ${order.orderNumber || order.id} · ${order.customerId}`,
                                                    })}
                                                    style={{
                                                        padding: '4px 8px',
                                                        borderRadius: 6,
                                                        border: '1px solid #86efac',
                                                        background: '#f0fdf4',
                                                        color: '#15803d',
                                                        fontSize: 11,
                                                        fontWeight: 700,
                                                        cursor: 'pointer',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: 4,
                                                    }}
                                                >
                                                    <i className="bi bi-camera-fill" /> ส่งของ
                                                </button>
                                            )}
                                            {order.paymentProofUrl && (
                                                <button
                                                    type="button"
                                                    onClick={() => setLightboxImage({
                                                        url: order.paymentProofUrl,
                                                        title: 'หลักฐานการชำระเงิน (สลิป/เงินสด)',
                                                        subtitle: `ออเดอร์ ${order.orderNumber || order.id} · ${money(order.totalAmount)}`,
                                                    })}
                                                    style={{
                                                        padding: '4px 8px',
                                                        borderRadius: 6,
                                                        border: '1px solid #fdba74',
                                                        background: '#fff7ed',
                                                        color: '#c2410c',
                                                        fontSize: 11,
                                                        fontWeight: 700,
                                                        cursor: 'pointer',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: 4,
                                                    }}
                                                >
                                                    <i className="bi bi-receipt" /> สลิป/เงิน
                                                </button>
                                            )}
                                            {!order.proofImageUrl && !order.paymentProofUrl && (
                                                <span style={{ color: '#9ca3af', fontSize: 12 }}>-</span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            {lightboxImage && (
                <DeliveryImageLightbox
                    image={lightboxImage.url}
                    title={lightboxImage.title}
                    subtitle={lightboxImage.subtitle}
                    onClose={() => setLightboxImage(null)}
                />
            )}
        </>
    )
}

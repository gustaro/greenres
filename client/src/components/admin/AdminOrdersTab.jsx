import { useState } from 'react'
import { PageHead, Empty, money, formatCashierPaymentMethod } from './AdminShared'
import { DeliveryImageLightbox } from '../delivery/DeliveryImageLightbox'

export function AdminOrdersTab({
    pendingOrders = [],
    orders = [],
    products = [],
    approveOrder,
    cancelOrder,
}) {
    const [actionLoading, setActionLoading] = useState(null)
    const [lightboxImage, setLightboxImage] = useState(null)

    const handleCancel = async (orderId) => {
        if (!cancelOrder) return
        setActionLoading(orderId)
        try {
            await cancelOrder(orderId)
        } finally {
            setActionLoading(null)
        }
    }

    const handleApprove = async (orderId) => {
        if (!approveOrder) return
        setActionLoading(orderId)
        try {
            await approveOrder(orderId)
        } finally {
            setActionLoading(null)
        }
    }

    return (
        <>
            <PageHead eyebrow="ORDER APPROVAL" title="อนุมัติออเดอร์ออนไลน์" description="ออเดอร์ออนไลน์จากลูกค้า — ต้องอนุมัติก่อนส่งเข้าครัว (ออเดอร์หน้าร้านไม่ต้องอนุมัติ)" />
            <div className="admin-order-cards">
                {pendingOrders.length === 0 ? (
                    <Empty>ไม่มีออเดอร์ออนไลน์ที่รออนุมัติ</Empty>
                ) : (
                    pendingOrders.map(order => (
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
                                        </span>
                                        <b>{money(item.priceAtTime * item.quantity)}</b>
                                    </li>
                                ))}
                            </ul>
                            <footer>
                                <button
                                    className="admin-danger"
                                    disabled={actionLoading === order.id}
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
                                    disabled={actionLoading === order.id}
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
                <div className="admin-table-wrap">
                    <table>
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
                            {orders.filter(order => order.serverStatus !== 'PENDING').map(order => (
                                <tr key={order.id}>
                                    <td><b>{order.orderNumber || order.id}</b></td>
                                    <td>{order.customerId}</td>
                                    <td>
                                        <i className={`admin-badge ${order.orderSource === 'online' ? '' : 'pending'}`}>
                                            {order.orderSource === 'walkin' ? 'ทานที่ร้าน' : order.orderSource === 'takeaway' ? 'สั่งกลับบ้าน' : 'ออนไลน์'}
                                        </i>
                                    </td>
                                    <td>{money(order.totalAmount)}</td>
                                    <td><i className="admin-badge">{order.foodStatus}</i></td>
                                    <td>
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

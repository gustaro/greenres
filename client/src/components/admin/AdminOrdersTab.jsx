import { PageHead, Empty, money } from './AdminShared'

export function AdminOrdersTab({
    pendingOrders,
    orders,
    products,
    approveOrder,
    cancelOrder,
}) {
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
                                {' · '}{order.paymentMethod}
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
                                <button className="admin-danger" onClick={() => cancelOrder(order.id)}>ยกเลิกออเดอร์</button>
                                <button className="admin-primary" onClick={() => approveOrder(order.id)}><i className="bi bi-check-circle-fill me-1" />อนุมัติ → ส่งเข้าครัว</button>
                            </footer>
                        </article>
                    ))
                )}
            </div>
            <section className="admin-panel admin-history">
                <div className="admin-panel-head">
                    <div><h2>ประวัติคำสั่งซื้อ</h2><p>รายการที่ผ่านการตรวจสอบแล้ว</p></div>
                </div>
                <div className="admin-table-wrap">
                    <table>
                        <thead>
                            <tr><th>เลขออเดอร์</th><th>ลูกค้า</th><th>ช่องทาง</th><th>ยอดรวม</th><th>สถานะ</th></tr>
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
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </>
    )
}

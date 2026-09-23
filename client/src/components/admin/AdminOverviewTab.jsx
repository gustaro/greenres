import { PageHead, money } from './AdminShared'

export function AdminOverviewTab({
    revenue = 0,
    orders = [],
    pendingOrders = [],
    averageOrder = 0,
    paidOrders = [],
    lowStock = [],
    productSales = [],
    setActiveTab,
    setActive,
}) {
    const handleTabChange = setActiveTab || setActive

    return (
        <>
            <PageHead eyebrow="ADMIN DASHBOARD" title="ภาพรวมร้านวันนี้" description="ติดตามยอดขาย ออเดอร์ และสิ่งที่ต้องจัดการจากจุดเดียว" />
            <div className="admin-portal-shortcuts">
                <div className="portal-shortcuts-title">
                    <i className="bi bi-speedometer2"></i>
                    <span>พอร์ทัลการทำงานและทดสอบระบบปฏิบัติการ (Operational Portals)</span>
                </div>
                <div className="portal-shortcuts-grid">
                    <a href="/cashier" target="_blank" rel="noopener noreferrer" className="portal-shortcut-card cashier">
                        <div className="portal-card-icon"><i className="bi bi-cash-stack"></i></div>
                        <div className="portal-card-info">
                            <strong>พอร์ทัลแคชเชียร์ (Cashier)</strong>
                            <small>รับชำระเงิน เปิดบิล ย้ายโต๊ะ จัดการออเดอร์</small>
                        </div>
                        <span className="portal-card-arrow">เปิดพอร์ทัล <i className="bi bi-box-arrow-up-right"></i></span>
                    </a>
                    <a href="/kitchen" target="_blank" rel="noopener noreferrer" className="portal-shortcut-card kitchen">
                        <div className="portal-card-icon"><i className="bi bi-fire"></i></div>
                        <div className="portal-card-info">
                            <strong>จอแสดงผลห้องครัว (Kitchen)</strong>
                            <small>คิวทำอาหาร กำลังทำ พร้อมเสิร์ฟ ยกเลิก</small>
                        </div>
                        <span className="portal-card-arrow">เปิดพอร์ทัล <i className="bi bi-box-arrow-up-right"></i></span>
                    </a>
                    <a href="/delivery" target="_blank" rel="noopener noreferrer" className="portal-shortcut-card delivery">
                        <div className="portal-card-icon"><i className="bi bi-bicycle"></i></div>
                        <div className="portal-card-info">
                            <strong>ระบบจัดส่งไรเดอร์ (Delivery)</strong>
                            <small>ทดสอบรับงาน แผนที่ Google Maps ส่งมอบอาหาร</small>
                        </div>
                        <span className="portal-card-arrow">ทดสอบงานจัดส่ง <i className="bi bi-box-arrow-up-right"></i></span>
                    </a>
                    <a href="/order" target="_blank" rel="noopener noreferrer" className="portal-shortcut-card order">
                        <div className="portal-card-icon"><i className="bi bi-bag-check"></i></div>
                        <div className="portal-card-info">
                            <strong>หน้าสั่งอาหาร (Ordering)</strong>
                            <small>ทดสอบสั่งอาหาร จองโต๊ะ ทานร้าน/กลับบ้าน</small>
                        </div>
                        <span className="portal-card-arrow">ดูหน้าสั่งซื้อ <i className="bi bi-box-arrow-up-right"></i></span>
                    </a>
                </div>
            </div>
            <div className="admin-stats">
                <article><span className="green"><i className="bi bi-cash-stack" /></span><small>ยอดขายรวม</small><strong>{money(revenue)}</strong><em>จากรายการที่ชำระแล้ว</em></article>
                <article><span className="lime"><i className="bi bi-receipt" /></span><small>ออเดอร์ทั้งหมด</small><strong>{orders?.length || 0}</strong><em>{pendingOrders?.length || 0} รายการรอยืนยัน</em></article>
                <article><span className="blue"><i className="bi bi-graph-up-arrow" /></span><small>ยอดเฉลี่ยต่อบิล</small><strong>{money(averageOrder)}</strong><em>{paidOrders?.length || 0} บิลที่ชำระแล้ว</em></article>
                <article><span className="orange"><i className="bi bi-exclamation-circle" /></span><small>สต๊อกใกล้หมด</small><strong>{lowStock?.length || 0}</strong><em>ควรเติมวัตถุดิบ</em></article>
            </div>
            <div className="admin-overview-grid">
                <section className="admin-panel">
                    <div className="admin-panel-head">
                        <div><h2>คำสั่งซื้อล่าสุด</h2><p>สถานะออเดอร์ในระบบ</p></div>
                        <button className="admin-link" onClick={() => handleTabChange?.('orders')}>ดูทั้งหมด <i className="bi bi-arrow-right" /></button>
                    </div>
                    <div className="admin-order-list">
                        {(orders || []).slice(-5).reverse().map(order => (
                            <div key={order.id}>
                                <span className="admin-order-icon"><i className="bi bi-bag-check" /></span>
                                <div><b>{order.orderNumber || order.id}</b><small>{order.customerId} · {order.items?.length || 0} รายการ</small></div>
                                <strong>{money(order.totalAmount)}</strong>
                                <i className={`admin-badge ${order.foodStatus === 'รอยืนยัน' ? 'pending' : ''}`}>{order.foodStatus}</i>
                            </div>
                        ))}
                    </div>
                </section>
                <section className="admin-panel">
                    <div className="admin-panel-head"><div><h2>เมนูขายดี</h2><p>เรียงตามจำนวนที่ขาย</p></div></div>
                    {productSales.filter(p => (p.sold || 0) > 0).length === 0 ? (
                        <div style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--brand-muted)' }}>
                            <i className="bi bi-bar-chart" style={{ fontSize: 32, opacity: 0.35, display: 'block', marginBottom: 8 }} />
                            <span style={{ fontSize: 13, fontWeight: 600 }}>ยังไม่มีข้อมูลยอดขายเมนูในระบบ</span>
                            <small style={{ display: 'block', fontSize: 11, opacity: 0.7, marginTop: 4 }}>
                                เมื่อมีออเดอร์ที่ชำระเงินแล้ว ระบบจะจัดอันดับเมนูขายดีให้อัตโนมัติ
                            </small>
                        </div>
                    ) : (
                        <div className="admin-top-products">
                            {productSales.filter(p => (p.sold || 0) > 0).slice(0, 5).map((product, index) => (
                                <div key={product.id}>
                                    <b>{index + 1}</b>
                                    <img src={product.img} alt="" />
                                    <span>{product.name}<small>{product.sold} ชิ้น</small></span>
                                    <strong>{money(product.price * product.sold)}</strong>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </>
    )
}

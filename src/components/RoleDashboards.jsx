import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../lib/AuthContext'
import { mapProduct, api, adminApi, kitchenApi, deliveryApi, ensureDeliveryForOrder, updateOrder, confirmOrder, placeCounterOrder, markOrderPaid } from '../lib/database'
import './RoleDashboards.css'

const money = value => new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(value || 0)
const orderCode = order => order.orderNumber || order.orderId || order.id
const scheduleLabel = order => order.deliveryType !== 'ให้จัดส่ง' ? order.deliveryType : order.deliveryScheduleType === 'ระบุเวลา' && order.scheduledAt ? `จัดส่ง ${new Date(order.scheduledAt).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}` : 'จัดส่งทันที'

function StaffShell({ role, title, subtitle, tabs, active, onTab, children }) {
    const { settings } = useAuth();
    return <div className={`staff-page ${role}`}>
        <header className="staff-top"><div className="staff-brand">{settings?.logoUrl ? <img src={settings.logoUrl} alt="Logo" style={{ width: 36, height: 36, objectFit: 'contain', borderRadius: 6 }} /> : <span>LL</span>}<div><b>{settings?.siteName || 'LimeLeaf'} Operations</b><small>{role.toUpperCase()} PORTAL</small></div></div><div><h1>{title}</h1><p>{subtitle}</p></div><span className="staff-live"><i /> LIVE</span></header>
        <nav className="staff-tabs">{tabs.map(t => <button key={t.key || t.tab} className={active === (t.key || t.tab) ? 'active' : ''} onClick={() => onTab(t.key || t.tab)}><i className={`bi ${t.icon}`}></i>{t.label}{t.count > 0 && <b>{t.count}</b>}</button>)}</nav>
        <main className="staff-content">{children}</main>
    </div>
}

function OrderItems({ order }) {
    const items = Array.isArray(order.items) ? order.items : []
    return <ul className="staff-order-items">{items.map(item => <li key={item.id || item.productId}><span>{item.productName || item.product?.name || 'สินค้า'} <small>× {item.quantity}</small></span><b>{money(Number(item.priceAtTime || item.unitPrice || 0) * Number(item.quantity || 0))}</b></li>)}</ul>
}

function Empty({ text }) { return <div className="staff-empty"><i className="bi bi-check-circle" style={{ fontSize: 40, marginBottom: 15, color: '#9dc59c', display: 'block', fontStyle: 'normal' }}></i><h3>เรียบร้อยทั้งหมด</h3><p>{text}</p></div> }

export function KitchenDashboard({ setOrders }) {
    const [tab, setTab] = useState('orders')
    const [queue, setQueue] = useState([])
    const [products, setProducts] = useState([])
    const [inventory, setInventory] = useState([])
    const [stats, setStats] = useState(null)
    const [loading, setLoading] = useState(true)

    const loadKitchenData = async (silent = false) => {
        if (!silent) setLoading(true)
        try {
            const [queueResult, statsResult] = await Promise.all([
                kitchenApi.queue(),
                kitchenApi.stats(),
            ])
            setQueue(queueResult)
            setStats(statsResult)
        } catch (error) {
            if (!silent) window.alert('โหลดข้อมูลครัวไม่สำเร็จ: ' + error.message)
        } finally {
            if (!silent) setLoading(false)
        }
    }

    useEffect(() => {
        api('/products?limit=100').then(result => setProducts((result.products || []).map(mapProduct))).catch(() => { })
        api('/inventory').then(result => setInventory(result.map(item => ({
            id: item.id,
            ingredientName: item.product?.name || 'วัตถุดิบทั่วไป',
            quantity: Number(item.quantity),
            unit: 'ชิ้น',
            lowThreshold: Number(item.lowThreshold || 10),
            productId: item.productId,
        })))).catch(() => { })
        loadKitchenData()
        const timer = window.setInterval(() => loadKitchenData(true), 10000)
        return () => window.clearInterval(timer)
    }, [])

    const startOrder = async order => {
        try {
            // Optimistic update
            setOrders(current => current.map(item => item.id === order.id ? { ...item, foodStatus: 'กำลังทำ', serverStatus: 'PREPARING' } : item))
            await kitchenApi.start(order.id)
            loadKitchenData(true)
        } catch (error) {
            window.alert('Error updating order: ' + error.message)
            loadKitchenData(true) // rollback
        }
    }

    const finishOrder = async order => {
        try {
            // Optimistic update
            setOrders(current => current.map(item => item.id === order.id ? { ...item, foodStatus: item.deliveryType === 'ให้จัดส่ง' ? 'พร้อมจัดส่ง' : 'ทำเสร็จแล้ว', serverStatus: 'READY' } : item))
            await kitchenApi.ready(order.id)
            loadKitchenData(true)
        } catch (error) {
            window.alert('Error finishing order: ' + error.message)
            loadKitchenData(true) // rollback
        }
    }

    const waiting = queue.filter(order => order.serverStatus === 'CONFIRMED')
    const preparing = queue.filter(order => order.serverStatus === 'PREPARING')

    return <StaffShell role="kitchen" title="ศูนย์จัดการครัว" subtitle="คิวครัวเชื่อมกับ Kitchen API ของ Server โดยตรง" active={tab} onTab={setTab} tabs={[
        { key: 'orders', label: 'คิวทำอาหาร', icon: 'bi-grid-1x2', count: queue.length },
        { key: 'products', label: 'สถานะสินค้า', icon: 'bi-box-seam' },
        { key: 'inventory', label: 'สต๊อกสินค้า', icon: 'bi-list-check' },
    ]}>
        {tab === 'orders' && <section>
            <div className="staff-section-head"><div><h2>คิวครัว</h2><p>รับเฉพาะออเดอร์ CONFIRMED / PREPARING ตามสิทธิ์ KITCHEN ของ Server</p></div><strong>{queue.length} ออเดอร์</strong></div>
            {stats && <div className="staff-metrics"><article><small>รอเริ่มทำ</small><strong>{stats.confirmed ?? waiting.length}</strong></article><article><small>กำลังทำ</small><strong>{stats.preparing ?? preparing.length}</strong></article><article><small>คิวทั้งหมด</small><strong>{queue.length}</strong></article></div>}
            <div className="staff-order-grid">{loading ? <Empty text="กำลังโหลดคิวครัว" /> : queue.length === 0 ? <Empty text="ยังไม่มีออเดอร์ที่ต้องทำ" /> : queue.map(order => <article className="staff-order-card" key={order.id}>
                <header><div><small>ORDER</small><h3>{orderCode(order)}</h3></div><i className={`status ${order.serverStatus === 'PREPARING' ? 'cooking' : 'pending'}`}>{order.foodStatus}</i></header>
                <p>{scheduleLabel(order)} · สั่งเมื่อ {new Date(order.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</p>
                <OrderItems order={order} />
                {order.serverStatus === 'CONFIRMED' && <button className="staff-primary" onClick={() => startOrder(order)}>เริ่มทำอาหาร →</button>}
                {order.serverStatus === 'PREPARING' && <button className="staff-primary" onClick={() => finishOrder(order)}>ทำเสร็จแล้ว →</button>}
            </article>)}</div>
        </section>}
        {tab === 'products' && <section><div className="staff-section-head"><div><h2>สถานะสินค้า</h2><p>ดูสถานะสินค้าและสต๊อกวัตถุดิบ</p></div></div><div className="staff-table"><table><thead><tr><th>เมนู</th><th>คงเหลือ</th><th>สถานะ</th></tr></thead><tbody>{products.map(product => <tr key={product.id}><td><div className="staff-product"><img src={product.img} alt="" /><b>{product.name}</b></div></td><td>{product.stock} ชิ้น</td><td><i className={`status ${product.status === 'หมด' ? 'pending' : product.status === 'วัตถุดิ้ ไม่เพียงพอ' ? 'cooking' : 'paid'}`}>{product.status}</i></td></tr>)}</tbody></table></div></section>}
        {tab === 'inventory' && <section><div className="staff-section-head"><div><h2>สต๊อกวัตถุดิบ</h2><p>ปรับปรุงปริมาณสต๊อกวัตถุดิบ (KITCHEN สามารถแก้ไขได้ผ่าน API /inventory)</p></div></div><div className="staff-table"><table><thead><tr><th>วัตถุดิบ</th><th>คงเหลือ</th><th>สถานะสต๊อก</th><th>ปรับลง/เพิ่ม</th></tr></thead><tbody>{inventory.map(item => <tr key={item.id}><td><b>{item.ingredientName}</b></td><td><strong>{item.quantity} {item.unit}</strong></td><td><select value={item.quantity <= 0 ? 'หมดอายุ' : item.quantity <= item.lowThreshold ? 'ยังคงเหลือ' : 'ยังคงเหลือ'} style={{ fontSize: 13 }}><option value="ยังคงเหลือ">ยังคงเหลือ</option><option value="หมดอายุ">หมดอายุ</option></select></td><td><div className="ad-stepper"><button onClick={async () => { try { await adminApi.updateInventory(item.productId, { quantity: Math.max(0, item.quantity - 1) }); setInventory(current => current.map(i => i.id === item.id ? { ...i, quantity: i.quantity - 1 } : i)); } catch (error) { window.alert(error.message) } }}>−</button><span>{item.quantity}</span><button onClick={async () => { try { await adminApi.updateInventory(item.productId, { quantity: item.quantity + 1 }); setInventory(current => current.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i)); } catch (error) { window.alert(error.message) } }}>+</button></div></td></tr>)}</tbody></table></div></section>}
    </StaffShell>
}

export function CashierDashboard({ orders, setOrders }) {
    const [tab, setTab] = useState('payments')
    const [receipt, setReceipt] = useState(null)
    const [search, setSearch] = useState('')
    const [period, setPeriod] = useState('today')
    // Counter order state
    const [counterProducts, setCounterProducts] = useState([])
    const [counterCart, setCounterCart] = useState({})
    const [counterSource, setCounterSource] = useState('walkin')
    const [counterNote, setCounterNote] = useState('')
    const [counterLoading, setCounterLoading] = useState(false)

    useEffect(() => {
        api('/products?limit=100').then(result => setCounterProducts((result.products || []).map(mapProduct))).catch(() => { })
    }, [])

    const counterAdd = p => setCounterCart(prev => ({ ...prev, [p.id]: (prev[p.id] || 0) + 1 }))
    const counterRemove = p => setCounterCart(prev => ({ ...prev, [p.id]: Math.max(0, (prev[p.id] || 0) - 1) }))
    const counterItems = counterProducts.filter(p => counterCart[p.id] > 0)
    const counterTotal = counterItems.reduce((s, p) => s + p.price * counterCart[p.id], 0)

    const submitCounterOrder = async () => {
        if (counterItems.length === 0) return window.alert('กรุณาเลือกสินค้าก่อน')
        setCounterLoading(true)
        try {
            await placeCounterOrder({ cart: counterCart, orderSource: counterSource, notes: counterNote })
            setCounterCart({})
            setCounterNote('')
            window.alert('✅ ส่งออเดอร์เข้าครัวเรียบร้อย!')
        } catch (error) {
            window.alert('เกิดข้อผิดพลาด: ' + error.message)
        } finally {
            setCounterLoading(false)
        }
    }

    useEffect(() => {
        let active = true
        const prepareDeliveries = async () => {
            const readyDeliveryOrders = orders.filter(order => order.deliveryType === 'ให้จัดส่ง' && order.serverStatus === 'READY' && order.deliveryAddress)
            for (const order of readyDeliveryOrders) {
                try {
                    const delivery = await ensureDeliveryForOrder(order)
                    if (active && delivery?.status === 'PENDING') await deliveryApi.autoAssign(delivery.id).catch(() => null)
                } catch (error) { console.warn('[Delivery setup]', error.message) }
            }
        }
        prepareDeliveries()
        const timer = window.setInterval(prepareDeliveries, 10000)
        return () => { active = false; window.clearInterval(timer) }
    }, [orders])

    const validOrders = orders.filter(order => order.foodStatus !== 'ยกเลิก')
    const unpaidOrders = validOrders.filter(order => !order.isPaid).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    const paidOrders = validOrders.filter(order => order.isPaid).sort((a, b) => new Date(b.paidAt || b.createdAt) - new Date(a.paidAt || a.createdAt))
    const normalizedSearch = search.trim().toLowerCase()
    const matchesSearch = order => !normalizedSearch || [orderCode(order), order.customerId, order.paymentMethod, order.deliveryType].some(value => String(value || '').toLowerCase().includes(normalizedSearch))
    const filteredUnpaid = unpaidOrders.filter(matchesSearch)
    const filteredPaid = paidOrders.filter(matchesSearch)

    const periodStart = new Date()
    if (period === 'today') periodStart.setHours(0, 0, 0, 0)
    if (period === '7days') { periodStart.setDate(periodStart.getDate() - 6); periodStart.setHours(0, 0, 0, 0) }
    const periodOrders = paidOrders.filter(order => period === 'all' || new Date(order.paidAt || order.updatedAt || order.createdAt) >= periodStart)
    const revenue = periodOrders.reduce((sum, order) => sum + order.totalAmount, 0)
    const paymentMethods = useMemo(() => Object.entries(periodOrders.reduce((result, order) => {
        const key = order.paymentMethod || 'ไม่ระบุ'
        result[key] ||= []
        result[key].push(order)
        return result
    }, {})).map(([method, methodOrders]) => ({ method, orders: methodOrders })), [periodOrders])
    const productSales = useMemo(() => {
        const result = {}
        periodOrders.forEach(order => order.items.forEach(item => {
            const name = item.productName || 'สินค้า'
            result[name] ||= { name, quantity: 0, amount: 0 }
            result[name].quantity += item.quantity
            result[name].amount += item.priceAtTime * item.quantity
        }))
        return Object.values(result).sort((a, b) => b.quantity - a.quantity)
    }, [periodOrders])

    const completeCounterOrder = async order => {
        try {
            setOrders(current => current.map(item => item.id === order.id ? { ...item, serverStatus: 'DELIVERED', foodStatus: 'เสร็จสิ้น' } : item))
            await updateOrder(order.id, { status: 'DELIVERED' })
        } catch (error) {
            window.alert('Error completing order: ' + error.message)
            fetchOrders?.()
        }
    }

    const exportSales = () => {
        const rows = [['เลขออเดอร์', 'วันที่', 'ลูกค้า', 'ช่องทาง', 'ประเภทออเดอร์', 'ยอดสุทธิ'], ...periodOrders.map(order => [orderCode(order), new Date(order.paidAt || order.createdAt).toLocaleString('th-TH'), order.customerId, order.paymentMethod, order.deliveryType, order.totalAmount])]
        const csv = '\uFEFF' + rows.map(row => row.map(value => `"${String(value ?? '').replaceAll('"', '""')}"`).join(',')).join('\n')
        const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
        const link = document.createElement('a')
        link.href = url; link.download = `cashier-sales-${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(url)
    }

    return <StaffShell role="cashier" title="ระบบแคชเชียร์" subtitle="ดูสถานะการชำระเงินจริงจาก Server และจัดเตรียมงาน Delivery" active={tab} onTab={setTab} tabs={[{ key: 'counter', label: 'รับออเดอร์', icon: 'bi-pencil-square', count: 0 }, { key: 'payments', label: 'รอชำระเงิน', icon: 'bi-currency-bitcoin', count: unpaidOrders.length }, { key: 'history', label: 'ประวัติและใบเสร็จ', icon: 'bi-receipt', count: 0 }, { key: 'summary', label: 'สรุปยอดขาย', icon: 'bi-graph-up-arrow', count: 0 }]}>
        <div className="staff-alert">กด "ชำระเงินแล้ว" เมื่อลูกค้าชำระเงินสดเงินสดบนระบบ</div>
        {tab === 'counter' && <section>
            <div className="staff-section-head"><div><h2>รับออเดอร์หน้าร้าน</h2><p>สร้างออเดอร์สำหรับลูกค้าทานที่ร้านหรือสั่งกลับบ้าน — ส่งเข้าครัวทันที</p></div></div>
            <div className="counter-order-layout">
                <div className="counter-menu">
                    <div className="counter-source-bar">
                        <label className={counterSource === 'walkin' ? 'active' : ''} onClick={() => setCounterSource('walkin')}><input type="radio" name="source" value="walkin" checked={counterSource === 'walkin'} onChange={() => setCounterSource('walkin')} /> 🍽 ทานที่ร้าน</label>
                        <label className={counterSource === 'takeaway' ? 'active' : ''} onClick={() => setCounterSource('takeaway')}><input type="radio" name="source" value="takeaway" checked={counterSource === 'takeaway'} onChange={() => setCounterSource('takeaway')} /> 🥡 สั่งกลับบ้าน</label>
                    </div>
                    <div className="counter-products">{counterProducts.filter(p => p.status !== 'หมด').map(p => <div className="counter-product" key={p.id}>
                        <img src={p.img} alt={p.name} />
                        <div><b>{p.name}</b><small>฿{p.price}</small></div>
                        <div className="counter-qty">
                            <button onClick={() => counterRemove(p)}>−</button>
                            <span>{counterCart[p.id] || 0}</span>
                            <button onClick={() => counterAdd(p)}>+</button>
                        </div>
                    </div>)}</div>
                </div>
                <aside className="counter-cart">
                    <h3>รายการสั่ง</h3>
                    {counterItems.length === 0 ? <p className="counter-empty">ยังไม่มีรายการ</p> : counterItems.map(p => <div className="counter-cart-row" key={p.id}>
                        <span>{p.name} × {counterCart[p.id]}</span>
                        <b>฿{p.price * counterCart[p.id]}</b>
                    </div>)}
                    <div className="counter-total"><span>ยอดรวม</span><b>฿{counterTotal}</b></div>
                    <textarea className="counter-note" value={counterNote} onChange={e => setCounterNote(e.target.value)} placeholder="หมายเหตุ (ถ้ามี)" rows={2} />
                    <button className="staff-primary counter-submit" onClick={submitCounterOrder} disabled={counterLoading || counterItems.length === 0}>{counterLoading ? 'กำลังส่ง...' : '🍳 ส่งเข้าครัว'}</button>
                </aside>
            </div>
        </section>}
        {tab === 'payments' && <section><div className="staff-section-head cashier-section-head"><div><h2>รายการรอชำระ</h2><p>ตรวจสอบยอดและสถานะ paymentStatus ที่ Server ส่งมา</p></div><input className="cashier-search" value={search} onChange={event => setSearch(event.target.value)} placeholder="ค้นหาเลขออเดอร์หรือลูกค้า" /></div><div className="staff-order-grid cashier-grid">{filteredUnpaid.length === 0 ? <Empty text={search ? 'ไม่พบรายการที่ค้นหา' : 'ไม่มีรายการค้างชำระ'} /> : filteredUnpaid.map(order => <article className="staff-order-card cashier-order" key={order.id}><header><div><small>ORDER</small><h3>{orderCode(order)}</h3></div><i className="status pending">{order.paymentStatus || 'PENDING'}</i></header><div className="cashier-order-meta"><span>{order.deliveryType}</span><span>{order.customerId || 'ลูกค้าทั่วไป'}</span><span>{new Date(order.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</span></div><OrderItems order={order} /><div className="cashier-due"><span>ยอดชำระ</span><strong>{money(order.totalAmount)}</strong></div>
            {order.serverStatus === 'PENDING' && order.orderSource === 'online' && <div className="cashier-online-badge">🌐 ออเดอร์ออนไลน์ — รอ Admin อนุมัติ</div>}
            <div className="staff-actions"><button className="staff-secondary" onClick={() => setReceipt(order)}>ดูรายการ</button>{order.serverPaymentMethod === 'CASH' && !order.isPaid && <button className="staff-primary" onClick={async () => { try { await markOrderPaid(order.id); setOrders(current => current.map(item => item.id === order.id ? { ...item, isPaid: true, paymentStatus: 'PAID' } : item)); } catch (error) { window.alert(error.message) } }}>ชำระเงินแล้ว</button>}{order.serverStatus === 'READY' && order.deliveryType !== 'ให้จัดส่ง' && <button className="staff-primary" onClick={() => completeCounterOrder(order)}>ส่งมอบแล้ว</button>}</div></article>)}</div></section>}
        {tab === 'history' && <section><div className="staff-section-head cashier-section-head"><div><h2>ประวัติการชำระ</h2><p>รายการที่ Server ระบุ paymentStatus = PAID</p></div><input className="cashier-search" value={search} onChange={event => setSearch(event.target.value)} placeholder="ค้นหารายการย้อนหลัง" /></div><div className="staff-table cashier-history"><table><thead><tr><th>ออเดอร์</th><th>เวลาชำระ</th><th>ลูกค้า</th><th>ช่องทาง</th><th>ยอดสุทธิ</th><th></th></tr></thead><tbody>{filteredPaid.map(order => <tr key={order.id}><td><b>{orderCode(order)}</b><small>{order.deliveryType}</small></td><td>{new Date(order.paidAt || order.createdAt).toLocaleString('th-TH')}</td><td>{order.customerId || 'ลูกค้าทั่วไป'}</td><td><i className="status paid">{order.paymentMethod}</i></td><td><strong>{money(order.totalAmount)}</strong></td><td><button className="staff-link" onClick={() => setReceipt(order)}>พิมพ์ใบเสร็จ</button></td></tr>)}</tbody></table>{filteredPaid.length === 0 && <Empty text="ยังไม่มีประวัติการชำระเงิน" />}</div></section>}
        {tab === 'summary' && <section><div className="staff-section-head cashier-section-head"><div><h2>สรุปยอดขาย</h2><p>คำนวณจากธุรกรรมที่ Server ระบุว่าชำระสำเร็จแล้ว</p></div><div className="cashier-report-actions"><select value={period} onChange={event => setPeriod(event.target.value)}><option value="today">วันนี้</option><option value="7days">7 วันล่าสุด</option><option value="all">ทั้งหมด</option></select><button className="staff-secondary" onClick={exportSales}>ดาวน์โหลด CSV</button></div></div><div className="staff-metrics"><article><small>ยอดขายสุทธิ</small><strong>{money(revenue)}</strong></article><article><small>จำนวนบิล</small><strong>{periodOrders.length}</strong></article><article><small>ยอดเฉลี่ยต่อบิล</small><strong>{money(periodOrders.length ? revenue / periodOrders.length : 0)}</strong></article><article><small>รายการรอชำระ</small><strong>{unpaidOrders.length}</strong></article></div><div className="cashier-summary-grid"><section className="staff-table"><div className="cashier-panel-title"><h3>ยอดตามช่องทางชำระเงิน</h3></div><table><thead><tr><th>ช่องทาง</th><th>จำนวนบิล</th><th>ยอดรวม</th></tr></thead><tbody>{paymentMethods.map(item => <tr key={item.method}><td><b>{item.method}</b></td><td>{item.orders.length}</td><td><strong>{money(item.orders.reduce((sum, order) => sum + order.totalAmount, 0))}</strong></td></tr>)}</tbody></table></section><section className="staff-table"><div className="cashier-panel-title"><h3>สินค้าขายดี</h3></div><table><thead><tr><th>สินค้า</th><th>จำนวน</th><th>ยอดขาย</th></tr></thead><tbody>{productSales.slice(0, 8).map(item => <tr key={item.name}><td><b>{item.name}</b></td><td>{item.quantity}</td><td><strong>{money(item.amount)}</strong></td></tr>)}</tbody></table></section></div></section>}
        {receipt && <div className="receipt-overlay" onMouseDown={() => setReceipt(null)}><article className="receipt cashier-receipt" onMouseDown={event => event.stopPropagation()}><header><b>{settings?.siteName || 'LimeLeaf'} Kitchen</b><small>{receipt.isPaid ? 'ใบเสร็จรับเงิน' : 'ใบสรุปรายการรอชำระ'}</small></header><div className="receipt-meta"><p>เลขที่ {orderCode(receipt)}<br />วันที่ {new Date(receipt.paidAt || receipt.createdAt).toLocaleString('th-TH')}</p><p>ลูกค้า: {receipt.customerId || 'ลูกค้าทั่วไป'}<br />ประเภท: {receipt.deliveryType}</p></div><OrderItems order={receipt} /><div className="receipt-breakdown"><span>ยอดสินค้า <b>{money(receipt.subtotal)}</b></span>{receipt.discountAmount > 0 && <span>ส่วนลด <b>-{money(receipt.discountAmount)}</b></span>}{receipt.deliveryFee > 0 && <span>ค่าบริการ/จัดส่ง <b>{money(receipt.deliveryFee)}</b></span>}</div><div className="receipt-total"><span>ยอดสุทธิ</span><b>{money(receipt.totalAmount)}</b></div><p className="receipt-thanks">สถานะการชำระ: {receipt.paymentStatus || (receipt.isPaid ? 'PAID' : 'PENDING')}</p><footer><button onClick={() => setReceipt(null)}>ปิด</button>{receipt.isPaid && <button className="staff-primary" onClick={() => window.print()}>⎙ พิมพ์ใบเสร็จ</button>}</footer></article></div>}
    </StaffShell>
}

const DELIVERY_FLOW = {
    PENDING: ['ASSIGNED', '📋 รับงาน'],
    ASSIGNED: ['PICKED_UP', '✅ รับอาหารแล้ว'],
    PICKED_UP: ['ON_THE_WAY', '🛵 เริ่มเดินทาง'],
    ON_THE_WAY: ['ARRIVED', '📍 ถึงปลายทาง'],
    ARRIVED: ['DELIVERED', '🏠 ส่งมอบสำเร็จ'],
}

const DELIVERY_STATUS_LABEL = {
    PENDING: 'รอรับงาน', ASSIGNED: 'รับงานแล้ว', PICKED_UP: 'รับอาหารแล้ว',
    ON_THE_WAY: 'กำลังส่ง', ARRIVED: 'ถึงที่แล้ว', DELIVERED: 'ส่งสำเร็จ',
    FAILED: 'ส่งไม่สำเร็จ', CANCELLED: 'ยกเลิก',
}
const DELIVERY_STATUS_CLASS = {
    PENDING: 'pending', ASSIGNED: 'pending', PICKED_UP: 'shipping',
    ON_THE_WAY: 'shipping', ARRIVED: 'shipping', DELIVERED: 'paid',
    FAILED: 'blocked', CANCELLED: 'blocked',
}

export function DeliveryDashboard({ setOrders }) {
    const { profile } = useAuth()
    const isAdmin = profile?.role === 'admin'
    const [tab, setTab] = useState('active')
    const [jobs, setJobs] = useState([])
    const [rider, setRider] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [expanded, setExpanded] = useState(null)
    const [cashConfirm, setCashConfirm] = useState(null)
    const [notice, setNotice] = useState('')

    const notify = msg => { setNotice(msg); setTimeout(() => setNotice(''), 2500) }

    const load = async (silent = false) => {
        if (!silent) setLoading(true)
        try {
            setError('')
            if (isAdmin) {
                const result = await deliveryApi.list()
                setJobs(result.deliveries ?? result)
            } else {
                const [riderResult, deliveryResult] = await Promise.all([
                    deliveryApi.riderProfile(),
                    deliveryApi.riderDeliveries(),
                ])
                setRider(riderResult)
                setJobs(deliveryResult)
            }
        } catch (loadError) {
            setError(loadError.message)
        } finally {
            if (!silent) setLoading(false)
        }
    }

    useEffect(() => {
        load()
        const timer = window.setInterval(() => load(true), 10000)
        return () => window.clearInterval(timer)
    }, [isAdmin])

    const toggleAvailability = async () => {
        if (!rider) return
        const next = rider.status === 'AVAILABLE' ? 'OFFLINE' : 'AVAILABLE'
        try {
            const updated = await deliveryApi.setRiderStatus(next)
            setRider(current => ({ ...current, ...updated }))
            if (next === 'AVAILABLE' && navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    pos => deliveryApi.updateRiderLocation(pos.coords.latitude, pos.coords.longitude).catch(() => { }),
                    () => { }
                )
            }
        } catch (err) { window.alert(err.message) }
    }

    const advance = async job => {
        const delivStatus = job.status ?? job.serverDeliveryStatus
        const flow = DELIVERY_FLOW[delivStatus]
        if (!flow) return
        const [nextStatus] = flow
        try {
            // Optimistic update
            setJobs(current => current.map(j => (j.id === job.id || j.deliveryId === job.deliveryId) ? { ...j, status: nextStatus, serverDeliveryStatus: nextStatus, foodStatus: DELIVERY_STATUS_LABEL[nextStatus] ?? nextStatus } : j))
            if (nextStatus === 'DELIVERED') {
                const oid = job.orderId ?? job.order?.id
                if (oid) setOrders(current => current.map(o => o.id === oid ? { ...o, foodStatus: 'จัดส่งเสร็จสิ้น', serverStatus: 'DELIVERED' } : o))
            }

            if (isAdmin) await deliveryApi.updateStatus(job.deliveryId ?? job.id, nextStatus)
            else await deliveryApi.updateRiderDelivery(job.deliveryId ?? job.id, nextStatus)

            notify('อัปเดตสถานะแล้ว')
            load(true) // async refresh
        } catch (err) {
            window.alert('Error updating status: ' + err.message)
            load(true) // rollback
        }
    }

    const confirmCashPayment = async job => {
        const orderId = job.orderId ?? job.order?.id
        if (!orderId) return window.alert('ไม่พบ Order ID')
        try {
            // Optimistic update
            setOrders(current => current.map(o => o.id === orderId ? { ...o, isPaid: true, paymentStatus: 'PAID' } : o))
            setJobs(current => current.map(j => (j.id === job.id || j.deliveryId === job.deliveryId) ? { ...j, order: { ...j.order, isPaid: true } } : j))
            setCashConfirm(null)

            await markOrderPaid(orderId)
            notify('บันทึกรับเงินสดแล้ว')
        } catch (err) {
            window.alert('Error updating payment: ' + err.message)
            load(true) // rollback
        }
    }

    // Normalize: backend returns delivery objects with nested order
    const normalizeJob = raw => {
        const order = raw.order || {}
        return {
            id: raw.id,
            deliveryId: raw.id,
            orderId: raw.orderId ?? order.id,
            orderNumber: order.orderNumber ?? raw.orderNumber ?? raw.id,
            status: raw.status,
            serverDeliveryStatus: raw.status,
            foodStatus: DELIVERY_STATUS_LABEL[raw.status] ?? raw.status,
            deliveryAddress: raw.dropAddress ?? order.deliveryAddress ?? '',
            provider: raw.provider ?? 'INTERNAL',
            estimatedMinutes: raw.estimatedMinutes,
            totalAmount: order.totalAmount ?? raw.totalAmount ?? 0,
            paymentMethod: order.paymentMethod ?? raw.paymentMethod ?? '',
            isPaid: order.isPaid ?? raw.isPaid ?? false,
            customerName: order.user?.name ?? order.customerId ?? 'ลูกค้า',
            customerPhone: order.user?.phone ?? '',
            items: (order.items ?? []).map(item => ({
                id: item.id,
                productName: item.product?.name ?? item.productName ?? 'สินค้า',
                quantity: item.quantity,
                priceAtTime: item.priceAtTime ?? item.unitPrice ?? 0,
            })),
            riderName: raw.rider?.user?.name ?? '',
            riderPhone: raw.rider?.user?.phone ?? '',
            order,
        }
    }

    const normalizedJobs = jobs.map(normalizeJob)
    const activeJobs = normalizedJobs.filter(j => !['DELIVERED', 'FAILED', 'CANCELLED'].includes(j.status))
    const completedJobs = normalizedJobs.filter(j => j.status === 'DELIVERED')
    const cards = tab === 'active' ? activeJobs : completedJobs

    return <StaffShell role="delivery" title="ศูนย์จัดส่ง" subtitle={isAdmin ? 'จัดการงานส่งทั้งหมด' : 'งานจัดส่งของคุณ'}
        active={tab} onTab={setTab}
        tabs={[
            { key: 'active', label: 'งานจัดส่ง', icon: 'bi-bicycle', count: activeJobs.length },
            { key: 'completed', label: 'จัดส่งสำเร็จ', icon: 'bi-check-circle', count: completedJobs.length },
        ]}>

        {/* Rider status bar */}
        {!isAdmin && rider && <div className="staff-alert delivery-rider-bar">
            <div>
                <b>{rider.status === 'AVAILABLE' ? '🟢 พร้อมรับงาน' : rider.status === 'BUSY' ? '🟡 กำลังส่งงาน' : '⚫ ออฟไลน์'}</b>
                <small>ยืนยันตัวตน: {rider.isVerified ? '✅ ผ่านแล้ว' : '❌ ยังไม่ผ่าน'}</small>
            </div>
            <button className="staff-secondary" disabled={rider.status === 'BUSY'} onClick={toggleAvailability}>
                {rider.status === 'BUSY' ? 'กำลังส่งงาน' : rider.status === 'AVAILABLE' ? 'ตั้งเป็น OFFLINE' : 'พร้อมรับงาน'}
            </button>
        </div>}

        {error && <div className="staff-alert">{error.includes('Rider profile') ? '⚠️ บัญชีนี้ยังไม่มี Rider profile — กรุณาลงทะเบียน Rider ก่อน' : error}</div>}

        <section>
            <div className="staff-section-head">
                <div><h2>{tab === 'active' ? `งานจัดส่ง (${activeJobs.length})` : `ประวัติส่งสำเร็จ (${completedJobs.length})`}</h2>
                    <p>{isAdmin ? 'ข้อมูลจาก /api/delivery' : 'ข้อมูลจาก /api/delivery/rider/me/deliveries'} · อัปเดตอัตโนมัติทุก 10 วินาที</p></div>
            </div>

            {loading ? <Empty text="กำลังโหลดงานจัดส่ง..." /> : cards.length === 0 ? <Empty text={tab === 'active' ? 'ไม่มีงานจัดส่งที่รออยู่' : 'ยังไม่มีประวัติการจัดส่งสำเร็จ'} /> :
                <div className="delivery-grid">
                    {cards.map(job => {
                        const flow = DELIVERY_FLOW[job.status]
                        const isCash = ['ชำระเงินปลายทาง', 'CASH', 'เงินสด'].includes(job.paymentMethod)
                        const needCash = isCash && !job.isPaid && job.status === 'DELIVERED'
                        const isOpen = expanded === job.id

                        return <article className={`delivery-card${isOpen ? ' expanded' : ''}`} key={job.id}>
                            {/* Card Header */}
                            <header onClick={() => setExpanded(isOpen ? null : job.id)} style={{ cursor: 'pointer' }}>
                                <div>
                                    <small>DELIVERY · {job.provider}</small>
                                    <h3>{job.orderNumber}</h3>
                                    <span style={{ fontSize: 11, color: '#7b887e' }}>{job.customerName}{job.customerPhone ? ` · ${job.customerPhone}` : ''}</span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'end', gap: 6 }}>
                                    <i className={`status ${DELIVERY_STATUS_CLASS[job.status] ?? ''}`}>{DELIVERY_STATUS_LABEL[job.status] ?? job.status}</i>
                                    <span style={{ fontSize: 10, color: '#8a9190' }}>{isOpen ? '▲ ซ่อน' : '▼ ดูรายละเอียด'}</span>
                                </div>
                            </header>

                            {/* Expandable detail */}
                            {isOpen && <>
                                {/* Address */}
                                <div className="delivery-address">
                                    <span>⌖</span>
                                    <div>
                                        <small>{job.estimatedMinutes ? `ประมาณ ${job.estimatedMinutes} นาที` : 'ไม่ระบุเวลา'}</small>
                                        <p>{job.deliveryAddress || 'ไม่ได้ระบุที่อยู่'}</p>
                                    </div>
                                </div>

                                {/* Items */}
                                {job.items.length > 0 && <ul className="staff-order-items">
                                    {job.items.map(item => <li key={item.id ?? item.productName}>
                                        <span>{item.productName} <small>× {item.quantity}</small></span>
                                        <b>{money(Number(item.priceAtTime) * Number(item.quantity))}</b>
                                    </li>)}
                                </ul>}

                                {/* Rider info (admin view) */}
                                {isAdmin && job.riderName && <div style={{ padding: '8px 0', fontSize: 12, color: '#5a7060', borderTop: '1px solid #edf1eb' }}>
                                    🛵 Rider: <b>{job.riderName}</b>{job.riderPhone ? ` · ${job.riderPhone}` : ''}
                                </div>}

                                {/* Payment row */}
                                <div className="delivery-payment">
                                    <span>ยอดออเดอร์ <b>{money(job.totalAmount)}</b></span>
                                    <i className={`status ${job.isPaid ? 'paid' : 'pending'}`}>
                                        {job.isPaid ? '✅ ชำระแล้ว' : isCash ? '💵 เก็บเงินสดปลายทาง' : '⏳ รอชำระ'}
                                    </i>
                                </div>

                                {/* Status progress bar */}
                                <div className="delivery-progress">
                                    {['ASSIGNED', 'PICKED_UP', 'ON_THE_WAY', 'ARRIVED', 'DELIVERED'].map((s, i, arr) => {
                                        const statuses = ['PENDING', 'ASSIGNED', 'PICKED_UP', 'ON_THE_WAY', 'ARRIVED', 'DELIVERED']
                                        const currentIdx = statuses.indexOf(job.status)
                                        const stepIdx = statuses.indexOf(s)
                                        return <div key={s} className={`dp-step${stepIdx <= currentIdx ? ' done' : ''}`}>
                                            <div className="dp-dot" />
                                            {i < arr.length - 1 && <div className="dp-line" />}
                                            <small>{DELIVERY_STATUS_LABEL[s]}</small>
                                        </div>
                                    })}
                                </div>
                            </>}

                            {/* Action buttons */}
                            <footer>
                                {flow && tab === 'active' && <button className="staff-primary" onClick={() => advance(job)}>
                                    {flow[1]}
                                </button>}
                                {needCash && <button className="staff-danger" onClick={() => setCashConfirm(job)}>
                                    💵 บันทึกรับเงินสด
                                </button>}
                                {!isOpen && isCash && !job.isPaid && job.status !== 'DELIVERED' && <small style={{ color: '#c17d00', fontSize: 10, fontWeight: 700 }}>💵 เก็บเงินสดตอนส่ง</small>}
                            </footer>
                        </article>
                    })}
                </div>
            }
        </section>

        {/* Cash payment confirm modal */}
        {cashConfirm && <div className="receipt-overlay" onMouseDown={() => setCashConfirm(null)}>
            <article className="receipt cashier-receipt" onMouseDown={e => e.stopPropagation()} style={{ maxWidth: 380 }}>
                <header><b>💵 บันทึกรับเงินสด</b><small>ยืนยันรับเงินจากลูกค้า</small></header>
                <div style={{ padding: '18px 0 10px', textAlign: 'center' }}>
                    <p style={{ fontSize: 13, color: '#555', marginBottom: 8 }}>ออเดอร์ <b>{cashConfirm.orderNumber}</b></p>
                    <div style={{ fontSize: 36, fontWeight: 900, color: '#0f9e1e' }}>{money(cashConfirm.totalAmount)}</div>
                    <p style={{ fontSize: 12, color: '#888', marginTop: 8 }}>เมื่อกด "ยืนยัน" ระบบจะบันทึกว่าชำระแล้ว</p>
                </div>
                <div className="receipt-payment" style={{ gap: 10, padding: '12px 0 0' }}>
                    <button onClick={() => setCashConfirm(null)}>ยกเลิก</button>
                    <button className="staff-primary" onClick={() => confirmCashPayment(cashConfirm)}>✅ ยืนยันรับเงินสดแล้ว</button>
                </div>
            </article>
        </div>}

        {notice && <div className="ad-toast">✓ {notice}</div>}
    </StaffShell>
}


import { useEffect, useMemo, useState } from 'react'
import { mapProduct, updateOrder, fetchOrders, api, catalogApi, adminApi } from '../lib/database'
import './RoleDashboards.css'

const money = value => new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(value || 0)
const orderCode = order => order.orderNumber || order.id
const scheduleLabel = order => order.deliveryType !== 'ให้จัดส่ง' ? order.deliveryType : order.deliveryScheduleType === 'ระบุเวลา' && order.scheduledAt ? `จัดส่ง ${new Date(order.scheduledAt).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}` : 'จัดส่งทันที'

function StaffShell({ role, title, subtitle, tabs, active, onTab, children }) {
    return <div className={`staff-page ${role}`}>
        <header className="staff-top"><div className="staff-brand"><span>LL</span><div><b>LimeLeaf Operations</b><small>{role.toUpperCase()} PORTAL</small></div></div><div><h1>{title}</h1><p>{subtitle}</p></div><span className="staff-live"><i /> LIVE</span></header>
        <nav className="staff-tabs">{tabs.map(tab => <button key={tab.key} className={active === tab.key ? 'active' : ''} onClick={() => onTab(tab.key)}><i>{tab.icon}</i>{tab.label}{tab.count > 0 && <b>{tab.count}</b>}</button>)}</nav>
        <main className="staff-content">{children}</main>
    </div>
}

function OrderItems({ order }) {
    return <ul className="staff-order-items">{order.items.map(item => <li key={item.id}><span>{item.productName || 'สินค้า'} <small>× {item.quantity}</small></span><b>{money(item.priceAtTime * item.quantity)}</b></li>)}</ul>
}

function Empty({ text }) { return <div className="staff-empty"><span>✓</span><h3>เรียบร้อยทั้งหมด</h3><p>{text}</p></div> }

function PaymentModal({ order, onClose, onConfirm }) {
    const defaultMethod = ['เงินสด', 'QR Payment', 'บัตรเครดิต/เดบิต'].includes(order.paymentMethod) ? order.paymentMethod : 'เงินสด'
    const [method, setMethod] = useState(defaultMethod)
    const [tendered, setTendered] = useState(order.totalAmount)
    const [saving, setSaving] = useState(false)
    const change = method === 'เงินสด' ? Math.max(Number(tendered || 0) - order.totalAmount, 0) : 0
    const submit = async event => {
        event.preventDefault()
        if (method === 'เงินสด' && Number(tendered) < order.totalAmount) return
        setSaving(true)
        await onConfirm({ method, tenderedAmount: method === 'เงินสด' ? Number(tendered) : order.totalAmount, reference: new FormData(event.currentTarget).get('reference').trim(), note: new FormData(event.currentTarget).get('note').trim() })
        setSaving(false)
    }
    return <div className="receipt-overlay payment-overlay" onMouseDown={onClose}><article className="counter-payment" onMouseDown={event => event.stopPropagation()}>
        <header><div><small>รับชำระออเดอร์</small><h2>{orderCode(order)}</h2></div><button onClick={onClose}>×</button></header>
        <OrderItems order={order} />
        <div className="counter-total"><span>ยอดที่ต้องชำระ</span><strong>{money(order.totalAmount)}</strong></div>
        <form onSubmit={submit}>
            <label>ช่องทางรับชำระ<select value={method} onChange={event => setMethod(event.target.value)}><option>เงินสด</option><option>QR Payment</option><option>บัตรเครดิต/เดบิต</option></select></label>
            {method === 'เงินสด' && <label>จำนวนเงินที่รับ<input type="number" min={order.totalAmount} step="1" value={tendered} onChange={event => setTendered(event.target.value)} required /></label>}
            {method !== 'เงินสด' && <label>เลขอ้างอิงการชำระ<input name="reference" placeholder="เลขอ้างอิง / เลขสลิป" /></label>}
            {method === 'เงินสด' && <input name="reference" type="hidden" value="" />}
            <label>หมายเหตุ<input name="note" placeholder="ไม่บังคับ" /></label>
            <div className="counter-change"><span>{method === 'เงินสด' ? 'เงินทอน' : 'ยอดรับชำระ'}</span><b>{money(method === 'เงินสด' ? change : order.totalAmount)}</b></div>
            <button className="staff-primary" disabled={saving || (method === 'เงินสด' && Number(tendered) < order.totalAmount)}>{saving ? 'กำลังบันทึก...' : 'ยืนยันรับชำระและออกใบเสร็จ'}</button>
        </form>
    </article></div>
}

export function KitchenDashboard({ orders, setOrders }) {
    const [tab, setTab] = useState('orders')
    const [products, setProducts] = useState([])
    const [inventory, setInventory] = useState([])
    const [recipes, setRecipes] = useState([])
    const kitchenOrders = orders.filter(order => order.foodStatus === 'กำลังทำ')

    const loadKitchenData = async () => {
        try {
            const [productResult, inventoryResult] = await Promise.all([
                api('/products?limit=100'),
                api('/inventory')
            ])
            setProducts(productResult.products.map(mapProduct))
            setInventory(inventoryResult)
        } catch (error) {
            window.alert('โหลดข้อมูลครัวไม่สำเร็จ: ' + error.message)
        }
    }
    useEffect(() => { loadKitchenData() }, [])

    const finishOrder = async order => {
        const status = order.deliveryType === 'ให้จัดส่ง' ? 'READY' : 'READY'
        try { await updateOrder(order.id, { status }); setOrders(current => current.map(item => item.id === order.id ? { ...item, foodStatus: order.deliveryType === 'ให้จัดส่ง' ? 'พร้อมจัดส่ง' : 'ทำเสร็จแล้ว', serverStatus: 'READY' } : item)) } catch (error) { window.alert(error.message) }
    }
    const setProductStatus = async (id, status) => {
        const isAvailable = status === 'มี'
        try {
            await catalogApi.updateProduct(id, { isActive: isAvailable })
            setProducts(current => current.map(product => product.id === id ? { ...product, status } : product))
        } catch (error) { window.alert(error.message) }
    }
    const updateStock = async (item, changes) => {
        try {
            await adminApi.updateInventory(item.productId, { quantity: changes.quantity })
            setInventory(current => current.map(stock => stock.id === item.id ? { ...stock, ...changes } : stock))
        } catch (error) { window.alert(error.message) }
    }

    return <StaffShell role="kitchen" title="ศูนย์จัดการครัว" subtitle="ควบคุมออเดอร์ เมนู และวัตถุดิบ" active={tab} onTab={setTab} tabs={[
        { key: 'orders', label: 'คิวทำอาหาร', icon: '▣', count: kitchenOrders.length }, { key: 'products', label: 'สถานะสินค้า', icon: '◫' }, { key: 'inventory', label: 'สต๊อกสินค้า', icon: '▥' },
    ]}>
        {tab === 'orders' && <section><div className="staff-section-head"><div><h2>คิวที่กำลังทำ</h2><p>เรียงตามเวลาที่ได้รับออเดอร์</p></div><strong>{kitchenOrders.length} ออเดอร์</strong></div><div className="staff-order-grid">{kitchenOrders.length === 0 ? <Empty text="ยังไม่มีออเดอร์ที่ต้องทำ" /> : kitchenOrders.map(order => <article className="staff-order-card" key={order.id}><header><div><small>ORDER</small><h3>{orderCode(order)}</h3></div><i className="status cooking">กำลังทำ</i></header><p>{scheduleLabel(order)} · สั่งเมื่อ {new Date(order.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</p><OrderItems order={order} /><button className="staff-primary" onClick={() => finishOrder(order)}>ทำเสร็จแล้ว →</button></article>)}</div></section>}
        {tab === 'products' && <section><div className="staff-section-head"><div><h2>เปลี่ยนสถานะสินค้า</h2><p>สถานะจะอัปเดตไปหน้าสั่งอาหารทันที</p></div></div><div className="staff-table"><table><thead><tr><th>เมนู</th><th>คงเหลือ</th><th>สถานะสินค้า</th></tr></thead><tbody>{products.map(product => <tr key={product.id}><td><div className="staff-product"><img src={product.img} alt="" /><b>{product.name}</b></div></td><td>{product.stock} ชิ้น</td><td><select value={product.status} onChange={event => setProductStatus(product.id, event.target.value)}><option>มี</option><option>เหลือน้อย</option><option>หมด</option></select></td></tr>)}</tbody></table></div></section>}
        {tab === 'inventory' && <section><div className="staff-section-head"><div><h2>จัดการสต๊อกสินค้า</h2><p>อัปเดตจำนวนสต๊อกสินค้า</p></div></div><div className="staff-table"><table><thead><tr><th>สินค้า</th><th>จำนวน</th></tr></thead><tbody>{inventory.map(item => <tr key={item.id}><td><b>{item.product?.name}</b></td><td><input className="stock-input" type="number" min="0" defaultValue={item.quantity} onBlur={event => updateStock(item, { quantity: Number(event.target.value) })} /></td></tr>)}</tbody></table></div></section>}
    </StaffShell>
}

export function CashierDashboard({ orders, setOrders }) {
    const [tab, setTab] = useState('payments')
    const [receipt, setReceipt] = useState(null)
    const [paymentOrder, setPaymentOrder] = useState(null)
    const [search, setSearch] = useState('')
    const [period, setPeriod] = useState('today')
    const validOrders = orders.filter(order => order.foodStatus !== 'ยกเลิก')
    const unpaidOrders = validOrders.filter(order => !order.isPaid).sort((first, second) => new Date(first.createdAt) - new Date(second.createdAt))
    const paidOrders = validOrders.filter(order => order.isPaid).sort((first, second) => new Date(second.paidAt || second.createdAt) - new Date(first.paidAt || first.createdAt))
    const cashFromDelivery = paidOrders.filter(order => order.cashCollectedAt)
    const normalizedSearch = search.trim().toLowerCase()
    const matchesSearch = order => !normalizedSearch || [orderCode(order), order.customerId, order.paymentMethod, order.deliveryType].some(value => String(value || '').toLowerCase().includes(normalizedSearch))
    const filteredUnpaid = unpaidOrders.filter(matchesSearch)
    const filteredPaid = paidOrders.filter(matchesSearch)
    const periodStart = new Date()
    if (period === 'today') periodStart.setHours(0, 0, 0, 0)
    if (period === '7days') periodStart.setDate(periodStart.getDate() - 6), periodStart.setHours(0, 0, 0, 0)
    const periodOrders = paidOrders.filter(order => period === 'all' || new Date(order.paidAt || order.createdAt) >= periodStart)
    const revenue = periodOrders.reduce((sum, order) => sum + order.totalAmount, 0)
    const paymentMethods = ['เงินสด', 'QR Payment', 'บัตรเครดิต/เดบิต', 'ชำระเงินปลายทาง'].map(method => ({ method, orders: periodOrders.filter(order => order.paymentMethod === method) })).filter(item => item.orders.length)
    const productSales = Object.values(periodOrders.flatMap(order => order.items).reduce((result, item) => {
        const key = item.productId || item.productName
        result[key] = result[key] || { name: item.productName || 'สินค้า', quantity: 0, amount: 0 }
        result[key].quantity += item.quantity; result[key].amount += item.priceAtTime * item.quantity
        return result
    }, {})).sort((first, second) => second.quantity - first.quantity)

    const confirmPayment = async (order, details) => {
        const paidAt = new Date().toISOString()
        const updatedOrder = { ...order, isPaid: true, paidAt, paymentMethod: details.method, paymentReference: details.reference, paymentNote: details.note, tenderedAmount: details.tenderedAmount }
        try {
            await updateOrder(order.id, { is_paid: true, paid_at: paidAt, payment_method: details.method, payment_reference: details.reference || null, payment_note: details.note || null, tendered_amount: details.tenderedAmount })
            setOrders(current => current.map(item => item.id === order.id ? updatedOrder : item)); setPaymentOrder(null); setReceipt(updatedOrder)
        } catch (error) { window.alert(error.message) }
    }
    const exportSales = () => {
        const rows = [['เลขออเดอร์', 'วันที่ชำระ', 'ลูกค้า', 'ช่องทาง', 'ประเภทออเดอร์', 'ยอดสุทธิ', 'เลขอ้างอิง'], ...periodOrders.map(order => [orderCode(order), new Date(order.paidAt || order.createdAt).toLocaleString('th-TH'), order.customerId, order.paymentMethod, order.deliveryType, order.totalAmount, order.paymentReference || ''])]
        const csv = '\uFEFF' + rows.map(row => row.map(value => `"${String(value ?? '').replaceAll('"', '""')}"`).join(',')).join('\n')
        const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); const link = document.createElement('a')
        link.href = url; link.download = `cashier-sales-${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(url)
    }

    return <StaffShell role="cashier" title="ระบบแคชเชียร์" subtitle="รับชำระเงินหน้าร้าน ออกใบเสร็จ และตรวจสอบยอดขาย" active={tab} onTab={setTab} tabs={[{ key: 'payments', label: 'รับชำระเงิน', icon: '฿', count: unpaidOrders.length }, { key: 'history', label: 'ประวัติและใบเสร็จ', icon: '▤' }, { key: 'summary', label: 'สรุปยอดขาย', icon: '↗' }]}>
        {cashFromDelivery.length > 0 && <div className="staff-alert">เดลิเวอรี่แจ้งรับเงินสดแล้ว {cashFromDelivery.length} ออเดอร์ รวม {money(cashFromDelivery.reduce((sum, order) => sum + order.cashCollectedAmount, 0))}</div>}
        {tab === 'payments' && <section><div className="staff-section-head cashier-section-head"><div><h2>รายการรอชำระ</h2><p>ตรวจสอบรายการ เลือกช่องทางรับเงิน และคำนวณเงินทอน</p></div><input className="cashier-search" value={search} onChange={event => setSearch(event.target.value)} placeholder="ค้นหาเลขออเดอร์หรือลูกค้า" /></div><div className="staff-order-grid cashier-grid">{filteredUnpaid.length === 0 ? <Empty text={search ? 'ไม่พบรายการที่ค้นหา' : 'ไม่มีรายการค้างชำระ'} /> : filteredUnpaid.map(order => <article className="staff-order-card cashier-order" key={order.id}><header><div><small>ORDER</small><h3>{orderCode(order)}</h3></div><i className="status pending">รอชำระ</i></header><div className="cashier-order-meta"><span>{order.deliveryType}</span><span>{order.customerId || 'ลูกค้าทั่วไป'}</span><span>{new Date(order.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</span></div><OrderItems order={order} /><div className="cashier-due"><span>ยอดชำระ</span><strong>{money(order.totalAmount)}</strong></div><div className="staff-actions"><button className="staff-secondary" onClick={() => setReceipt(order)}>ดูรายการ</button><button className="staff-primary" onClick={() => setPaymentOrder(order)}>รับชำระเงิน</button></div></article>)}</div></section>}
        {tab === 'history' && <section><div className="staff-section-head cashier-section-head"><div><h2>ประวัติการรับชำระ</h2><p>ค้นหาธุรกรรมและพิมพ์ใบเสร็จย้อนหลัง</p></div><input className="cashier-search" value={search} onChange={event => setSearch(event.target.value)} placeholder="ค้นหารายการย้อนหลัง" /></div><div className="staff-table cashier-history"><table><thead><tr><th>ออเดอร์</th><th>เวลาชำระ</th><th>ลูกค้า</th><th>ช่องทาง</th><th>อ้างอิง</th><th>ยอดสุทธิ</th><th></th></tr></thead><tbody>{filteredPaid.map(order => <tr key={order.id}><td><b>{orderCode(order)}</b><small>{order.deliveryType}</small></td><td>{new Date(order.paidAt || order.createdAt).toLocaleString('th-TH')}</td><td>{order.customerId || 'ลูกค้าทั่วไป'}</td><td><i className="status paid">{order.paymentMethod}</i></td><td>{order.paymentReference || '—'}</td><td><strong>{money(order.totalAmount)}</strong></td><td><button className="staff-link" onClick={() => setReceipt(order)}>พิมพ์ใบเสร็จ</button></td></tr>)}</tbody></table>{filteredPaid.length === 0 && <Empty text="ยังไม่มีประวัติการชำระเงิน" />}</div></section>}
        {tab === 'summary' && <section><div className="staff-section-head cashier-section-head"><div><h2>สรุปยอดขาย</h2><p>ยอดจากธุรกรรมที่ชำระสำเร็จ แยกตามช่องทางและสินค้า</p></div><div className="cashier-report-actions"><select value={period} onChange={event => setPeriod(event.target.value)}><option value="today">วันนี้</option><option value="7days">7 วันล่าสุด</option><option value="all">ทั้งหมด</option></select><button className="staff-secondary" onClick={exportSales}>ดาวน์โหลด CSV</button></div></div><div className="staff-metrics"><article><small>ยอดขายสุทธิ</small><strong>{money(revenue)}</strong></article><article><small>จำนวนบิล</small><strong>{periodOrders.length}</strong></article><article><small>ยอดเฉลี่ยต่อบิล</small><strong>{money(periodOrders.length ? revenue / periodOrders.length : 0)}</strong></article><article><small>รายการรอชำระ</small><strong>{unpaidOrders.length}</strong></article></div><div className="cashier-summary-grid"><section className="staff-table"><div className="cashier-panel-title"><h3>ยอดตามช่องทางชำระเงิน</h3></div><table><thead><tr><th>ช่องทาง</th><th>จำนวนบิล</th><th>ยอดรวม</th></tr></thead><tbody>{paymentMethods.map(item => <tr key={item.method}><td><b>{item.method}</b></td><td>{item.orders.length}</td><td><strong>{money(item.orders.reduce((sum, order) => sum + order.totalAmount, 0))}</strong></td></tr>)}</tbody></table></section><section className="staff-table"><div className="cashier-panel-title"><h3>สินค้าขายดี</h3></div><table><thead><tr><th>สินค้า</th><th>จำนวน</th><th>ยอดขาย</th></tr></thead><tbody>{productSales.slice(0, 8).map(item => <tr key={item.name}><td><b>{item.name}</b></td><td>{item.quantity}</td><td><strong>{money(item.amount)}</strong></td></tr>)}</tbody></table></section></div></section>}
        {paymentOrder && <PaymentModal order={paymentOrder} onClose={() => setPaymentOrder(null)} onConfirm={details => confirmPayment(paymentOrder, details)} />}
        {receipt && <div className="receipt-overlay" onMouseDown={() => setReceipt(null)}><article className="receipt cashier-receipt" onMouseDown={event => event.stopPropagation()}><header><b>LimeLeaf Kitchen</b><small>{receipt.isPaid ? 'ใบเสร็จรับเงิน / TAX INVOICE (ABB.)' : 'ใบสรุปรายการรอชำระ'}</small></header><div className="receipt-meta"><p>เลขที่ {orderCode(receipt)}<br />วันที่ {new Date(receipt.paidAt || receipt.createdAt).toLocaleString('th-TH')}</p><p>ลูกค้า: {receipt.customerId || 'ลูกค้าทั่วไป'}<br />ประเภท: {receipt.deliveryType}</p></div><OrderItems order={receipt} /><div className="receipt-breakdown"><span>ยอดสินค้า <b>{money(receipt.subtotal)}</b></span>{receipt.discountAmount > 0 && <span>ส่วนลด <b>-{money(receipt.discountAmount)}</b></span>}{receipt.deliveryFee > 0 && <span>ค่าจัดส่ง <b>{money(receipt.deliveryFee)}</b></span>}</div><div className="receipt-total"><span>ยอดสุทธิ</span><b>{money(receipt.totalAmount)}</b></div>{receipt.isPaid && <div className="receipt-payment"><span>ชำระโดย <b>{receipt.paymentMethod}</b></span>{receipt.paymentReference && <span>เลขอ้างอิง <b>{receipt.paymentReference}</b></span>}{receipt.tenderedAmount > 0 && receipt.paymentMethod === 'เงินสด' && <><span>รับเงิน <b>{money(receipt.tenderedAmount)}</b></span><span>เงินทอน <b>{money(receipt.tenderedAmount - receipt.totalAmount)}</b></span></>}{receipt.paymentNote && <span>หมายเหตุ <b>{receipt.paymentNote}</b></span>}</div>}<p className="receipt-thanks">ขอบคุณที่ใช้บริการ LimeLeaf Kitchen</p><footer><button onClick={() => setReceipt(null)}>ปิด</button>{receipt.isPaid && <button className="staff-primary" onClick={() => window.print()}>⎙ พิมพ์ใบเสร็จ</button>}</footer></article></div>}
    </StaffShell>
}

export function DeliveryDashboard({ orders, setOrders }) {
    const [tab, setTab] = useState('active')
    const deliveryOrders = orders.filter(order => order.deliveryType === 'ให้จัดส่ง')
    const activeOrders = deliveryOrders.filter(order => ['พร้อมจัดส่ง', 'กำลังจัดส่ง'].includes(order.foodStatus))
    const completedOrders = deliveryOrders.filter(order => order.foodStatus === 'จัดส่งเสร็จสิ้น')
    const isCashOrder = order => ['ชำระเงินปลายทาง', 'เงินสด'].includes(order.paymentMethod)
    const setDeliveryStatus = async (order, status) => { try { await updateOrder(order.id, { food_status: status }); setOrders(current => current.map(item => item.id === order.id ? { ...item, foodStatus: status } : item)) } catch (error) { window.alert(error.message) } }
    const collectCash = async order => {
        const collectedAt = new Date().toISOString()
        try { await updateOrder(order.id, { is_paid: true, cash_collected_amount: order.totalAmount, cash_collected_at: collectedAt }); setOrders(current => current.map(item => item.id === order.id ? { ...item, isPaid: true, cashCollectedAmount: order.totalAmount, cashCollectedAt: collectedAt } : item)) } catch (error) { window.alert(error.message) }
    }

    const cards = tab === 'active' ? activeOrders : completedOrders
    return <StaffShell role="delivery" title="ศูนย์จัดส่ง" subtitle="ดูเส้นทาง อัปเดตสถานะ และแจ้งรับเงินสด" active={tab} onTab={setTab} tabs={[{ key: 'active', label: 'ออเดอร์ที่ต้องจัดส่ง', icon: '➤', count: activeOrders.length }, { key: 'completed', label: 'จัดส่งสำเร็จ', icon: '✓' }]}>
        <section><div className="staff-section-head"><div><h2>{tab === 'active' ? 'งานจัดส่งของฉัน' : 'ประวัติการจัดส่ง'}</h2><p>{tab === 'active' ? 'ออเดอร์ที่พร้อมรับจากครัวและกำลังเดินทาง' : 'รายการที่ส่งถึงลูกค้าแล้ว'}</p></div></div><div className="delivery-grid">{cards.length === 0 ? <Empty text="ไม่มีออเดอร์จัดส่งในขณะนี้" /> : cards.map(order => <article className="delivery-card" key={order.id}><header><div><small>DELIVERY ORDER</small><h3>{orderCode(order)}</h3></div><i className={`status ${order.foodStatus === 'กำลังจัดส่ง' ? 'shipping' : ''}`}>{order.foodStatus}</i></header><div className="delivery-address"><span>⌖</span><p><small>{scheduleLabel(order)}</small>{order.deliveryAddress || 'ไม่ได้ระบุที่อยู่'}</p></div><OrderItems order={order} /><div className="delivery-payment"><span>ยอดเรียกเก็บ <b>{money(order.totalAmount)}</b></span><i className={`status ${order.isPaid ? 'paid' : 'pending'}`}>{order.isPaid ? 'ชำระแล้ว' : isCashOrder(order) ? 'เก็บเงินสด' : 'รอชำระ'}</i></div>{tab === 'active' && <footer>{order.foodStatus === 'พร้อมจัดส่ง' && <button className="staff-primary" onClick={() => setDeliveryStatus(order, 'กำลังจัดส่ง')}>รับงานและเริ่มจัดส่ง</button>}{order.foodStatus === 'กำลังจัดส่ง' && <>{isCashOrder(order) && !order.isPaid && <button className="cash-button" onClick={() => collectCash(order)}>฿ แจ้งรับเงินสดแล้ว</button>}<button className="staff-primary" disabled={isCashOrder(order) && !order.isPaid} onClick={() => setDeliveryStatus(order, 'จัดส่งเสร็จสิ้น')}>จัดส่งเสร็จสิ้น</button></>}</footer>}</article>)}</div></section>
    </StaffShell>
}

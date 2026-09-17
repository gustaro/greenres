import { useEffect, useMemo, useState } from 'react'
import { fetchCatalog, updateOrder, placeCounterOrder, markOrderPaid } from '../lib/database'
import { StaffShell, OrderItems, Empty, money, orderCode } from './StaffShared'
import { useAuth } from '../lib/AuthContext'

export function CashierDashboard({ orders, setOrders, refreshOrders }) {
    const { settings } = useAuth()
    const [tab, setTab] = useState('payments')
    const [receipt, setReceipt] = useState(null)
    const [search, setSearch] = useState('')
    const [period, setPeriod] = useState('today')
    // Counter order state
    const [counterProducts, setCounterProducts] = useState([])
    const [counterCategories, setCounterCategories] = useState([])
    const [counterCategory, setCounterCategory] = useState('all')
    const [counterCart, setCounterCart] = useState({})
    const [counterSource, setCounterSource] = useState('walkin')
    const [counterCustomerName, setCounterCustomerName] = useState('')
    const [counterTableNumber, setCounterTableNumber] = useState('')
    const [counterNote, setCounterNote] = useState('')
    const [counterLoading, setCounterLoading] = useState(false)
    const [counterNotice, setCounterNotice] = useState('')

    useEffect(() => {
        fetchCatalog().then(result => {
            setCounterProducts(result.products || [])
            setCounterCategories(result.categories || [])
        }).catch(() => { })
    }, [])

    const counterAdd = p => setCounterCart(prev => ({ ...prev, [p.id]: (prev[p.id] || 0) + 1 }))
    const counterRemove = p => setCounterCart(prev => ({ ...prev, [p.id]: Math.max(0, (prev[p.id] || 0) - 1) }))
    const counterItems = counterProducts.filter(p => counterCart[p.id] > 0)
    const counterTotal = counterItems.reduce((s, p) => s + p.price * counterCart[p.id], 0)
    const counterGroups = useMemo(() => {
        const available = counterProducts.filter(product => product.status !== 'หมด')
        const categories = [...counterCategories].sort((a, b) => (a.sortOrder ?? a.sort_order ?? 0) - (b.sortOrder ?? b.sort_order ?? 0))
        const categoryIds = new Set(categories.map(category => category.id))
        const groups = categories.map(category => ({
            id: category.id,
            name: category.name,
            products: available.filter(product => product.categoryId === category.id),
        })).filter(group => group.products.length > 0)
        const otherProducts = available.filter(product => !categoryIds.has(product.categoryId))
        if (otherProducts.length > 0) groups.push({ id: 'other', name: 'อื่น ๆ', products: otherProducts })
        return groups
    }, [counterProducts, counterCategories])
    const visibleCounterGroups = counterCategory === 'all' ? counterGroups : counterGroups.filter(group => group.id === counterCategory)
    const customerLabel = order => order.customerName || (order.orderSource === 'online' ? order.customerId : '') || 'ลูกค้าทั่วไป'

    const submitCounterOrder = async () => {
        if (counterItems.length === 0) return window.alert('กรุณาเลือกสินค้าก่อน')
        if (counterSource === 'walkin' && !counterTableNumber.trim()) return window.alert('กรุณากรอกเบอร์โต๊ะสำหรับออเดอร์ทานที่ร้าน')
        setCounterLoading(true)
        try {
            const createdOrder = await placeCounterOrder({
                cart: counterCart,
                orderSource: counterSource,
                notes: counterNote,
                customerName: counterCustomerName,
                tableNumber: counterTableNumber,
            })
            setOrders(current => [createdOrder, ...current.filter(order => order.id !== createdOrder.id)])
            setCounterCart({})
            setCounterCustomerName('')
            setCounterTableNumber('')
            setCounterNote('')
            setCounterNotice('✅ ส่งออเดอร์เข้าครัวเรียบร้อย')
            window.setTimeout(() => setCounterNotice(''), 2500)
            refreshOrders?.()
        } catch (error) {
            window.alert('เกิดข้อผิดพลาด: ' + error.message)
        } finally {
            setCounterLoading(false)
        }
    }


    const validOrders = orders.filter(order => order.foodStatus !== 'ยกเลิก')
    const unpaidOrders = validOrders.filter(order => !order.isPaid).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    const paidOrders = validOrders.filter(order => order.isPaid).sort((a, b) => new Date(b.paidAt || b.createdAt) - new Date(a.paidAt || a.createdAt))
    const normalizedSearch = search.trim().toLowerCase()
    const matchesSearch = order => !normalizedSearch || [orderCode(order), order.customerId, order.customerName, order.tableNumber, order.paymentMethod, order.deliveryType].some(value => String(value || '').toLowerCase().includes(normalizedSearch))
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
        }
    }

    const exportSales = () => {
        const rows = [['เลขออเดอร์', 'วันที่', 'ลูกค้า', 'โต๊ะ', 'ช่องทาง', 'ประเภทออเดอร์', 'ยอดสุทธิ'], ...periodOrders.map(order => [orderCode(order), new Date(order.paidAt || order.createdAt).toLocaleString('th-TH'), customerLabel(order), order.deliveryType === 'ทานที่ร้าน' ? order.tableNumber || '' : '', order.paymentMethod, order.deliveryType, order.totalAmount])]
        const csv = '\uFEFF' + rows.map(row => row.map(value => `"${String(value ?? '').replaceAll('"', '""')}"`).join(',')).join('\n')
        const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
        const link = document.createElement('a')
        link.href = url; link.download = `cashier-sales-${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(url)
    }

    return <StaffShell role="cashier" title="ระบบแคชเชียร์" subtitle="ดูสถานะการชำระเงินจริงจาก Server และจัดเตรียมงาน Delivery" active={tab} onTab={setTab} tabs={[{ key: 'counter', label: 'รับออเดอร์', icon: 'bi-pencil-square', count: 0 }, { key: 'payments', label: 'รอชำระเงิน', icon: 'bi-currency-bitcoin', count: unpaidOrders.length }, { key: 'history', label: 'ประวัติและใบเสร็จ', icon: 'bi-receipt', count: 0 }, { key: 'summary', label: 'สรุปยอดขาย', icon: 'bi-graph-up-arrow', count: 0 }]}>
        <div className="staff-alert">กด "ชำระเงินแล้ว" เมื่อลูกค้าชำระเงินสดเงินสดบนระบบ</div>
        {counterNotice && <div className="staff-alert" style={{ borderColor: '#75c94a', color: '#287a20' }}>{counterNotice}</div>}
        {tab === 'counter' && <section>
            <div className="staff-section-head"><div><h2>รับออเดอร์หน้าร้าน</h2><p>สร้างออเดอร์สำหรับลูกค้าทานที่ร้านหรือสั่งกลับบ้าน — ส่งเข้าครัวทันที</p></div></div>
            <div className="counter-order-layout">
                <div className="counter-menu">
                    <div className="counter-source-bar">
                        <label className={counterSource === 'walkin' ? 'active' : ''} onClick={() => setCounterSource('walkin')}><input type="radio" name="source" value="walkin" checked={counterSource === 'walkin'} onChange={() => setCounterSource('walkin')} /> 🍽 ทานที่ร้าน</label>
                        <label className={counterSource === 'takeaway' ? 'active' : ''} onClick={() => { setCounterSource('takeaway'); setCounterTableNumber('') }}><input type="radio" name="source" value="takeaway" checked={counterSource === 'takeaway'} onChange={() => { setCounterSource('takeaway'); setCounterTableNumber('') }} /> 🥡 สั่งกลับบ้าน</label>
                    </div>
                    <div className="counter-category-tabs">
                        <button className={counterCategory === 'all' ? 'active' : ''} onClick={() => setCounterCategory('all')}>ทั้งหมด</button>
                        {counterGroups.map(group => <button key={group.id} className={counterCategory === group.id ? 'active' : ''} onClick={() => setCounterCategory(group.id)}>{group.name}</button>)}
                    </div>
                    <div className="counter-category-list">
                        {visibleCounterGroups.map(group => <section className="counter-category-section" key={group.id}>
                            <div className="counter-category-heading"><h3>{group.name}</h3><span>{group.products.length} เมนู</span></div>
                            <div className="counter-products">{group.products.map(p => <div className="counter-product" key={p.id}>
                                <img src={p.img} alt={p.name} />
                                <div><b>{p.name}</b><small>฿{p.price}</small></div>
                                <div className="counter-qty">
                                    <button onClick={() => counterRemove(p)}>−</button>
                                    <span>{counterCart[p.id] || 0}</span>
                                    <button onClick={() => counterAdd(p)}>+</button>
                                </div>
                            </div>)}</div>
                        </section>)}
                        {visibleCounterGroups.length === 0 && <p className="counter-empty">ยังไม่มีเมนูในหมวดหมู่นี้</p>}
                    </div>
                </div>
                <aside className="counter-cart">
                    <h3>ข้อมูลออเดอร์</h3>
                    <div className="counter-customer-fields">
                        <label>ชื่อลูกค้า <small>(ไม่บังคับ)</small><input value={counterCustomerName} onChange={event => setCounterCustomerName(event.target.value)} placeholder="เช่น คุณเอ" maxLength={80} /></label>
                        {counterSource === 'walkin' && <label>เบอร์โต๊ะ <b>*</b><input value={counterTableNumber} onChange={event => setCounterTableNumber(event.target.value)} placeholder="เช่น 12 หรือ A3" maxLength={20} /></label>}
                    </div>
                    <h3 className="counter-cart-title">รายการสั่ง</h3>
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
        {tab === 'payments' && <section><div className="staff-section-head cashier-section-head"><div><h2>รายการรอชำระ</h2><p>ตรวจสอบยอดและสถานะ paymentStatus ที่ Server ส่งมา</p></div><input className="cashier-search" value={search} onChange={event => setSearch(event.target.value)} placeholder="ค้นหาเลขออเดอร์ ลูกค้า หรือโต๊ะ" /></div><div className="staff-order-grid cashier-grid">{filteredUnpaid.length === 0 ? <Empty text={search ? 'ไม่พบรายการที่ค้นหา' : 'ไม่มีรายการค้างชำระ'} /> : filteredUnpaid.map(order => <article className="staff-order-card cashier-order" key={order.id}><header><div><small>ORDER</small><h3>{orderCode(order)}</h3></div><i className="status pending">{order.paymentStatus || 'PENDING'}</i></header><div className="cashier-order-meta"><span>{order.deliveryType}</span>{order.deliveryType === 'ทานที่ร้าน' && <span className="table-number-badge">โต๊ะ {order.tableNumber || '—'}</span>}<span>{customerLabel(order)}</span><span>{new Date(order.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</span></div><OrderItems order={order} /><div className="cashier-due"><span>ยอดชำระ</span><strong>{money(order.totalAmount)}</strong></div>
            {order.serverStatus === 'PENDING' && order.orderSource === 'online' && <div className="cashier-online-badge">🌐 ออเดอร์ออนไลน์ — รอ Admin อนุมัติ</div>}
            <div className="staff-actions"><button className="staff-secondary" onClick={() => setReceipt(order)}>ดูรายการ</button>{order.serverPaymentMethod === 'CASH' && !order.isPaid && <button className="staff-primary" onClick={async () => { try { await markOrderPaid(order.id); setOrders(current => current.map(item => item.id === order.id ? { ...item, isPaid: true, paymentStatus: 'PAID' } : item)); } catch (error) { window.alert(error.message) } }}>ชำระเงินแล้ว</button>}{order.serverStatus === 'READY' && order.deliveryType !== 'ให้จัดส่ง' && <button className="staff-primary" onClick={() => completeCounterOrder(order)}>ส่งมอบแล้ว</button>}</div></article>)}</div></section>}
        {tab === 'history' && <section><div className="staff-section-head cashier-section-head"><div><h2>ประวัติการชำระ</h2><p>รายการที่ Server ระบุ paymentStatus = PAID</p></div><input className="cashier-search" value={search} onChange={event => setSearch(event.target.value)} placeholder="ค้นหารายการย้อนหลัง" /></div><div className="staff-table cashier-history"><table><thead><tr><th>ออเดอร์</th><th>เวลาชำระ</th><th>ลูกค้า</th><th>ช่องทาง</th><th>ยอดสุทธิ</th><th></th></tr></thead><tbody>{filteredPaid.map(order => <tr key={order.id}><td><b>{orderCode(order)}</b><small>{order.deliveryType}{order.deliveryType === 'ทานที่ร้าน' && order.tableNumber ? ` · โต๊ะ ${order.tableNumber}` : ''}</small></td><td>{new Date(order.paidAt || order.createdAt).toLocaleString('th-TH')}</td><td>{customerLabel(order)}</td><td><i className="status paid">{order.paymentMethod}</i></td><td><strong>{money(order.totalAmount)}</strong></td><td><button className="staff-link" onClick={() => setReceipt(order)}>พิมพ์ใบเสร็จ</button></td></tr>)}</tbody></table>{filteredPaid.length === 0 && <Empty text="ยังไม่มีประวัติการชำระเงิน" />}</div></section>}
        {tab === 'summary' && <section><div className="staff-section-head cashier-section-head"><div><h2>สรุปยอดขาย</h2><p>คำนวณจากธุรกรรมที่ Server ระบุว่าชำระสำเร็จแล้ว</p></div><div className="cashier-report-actions"><select value={period} onChange={event => setPeriod(event.target.value)}><option value="today">วันนี้</option><option value="7days">7 วันล่าสุด</option><option value="all">ทั้งหมด</option></select><button className="staff-secondary" onClick={exportSales}>ดาวน์โหลด CSV</button></div></div><div className="staff-metrics"><article><small>ยอดขายสุทธิ</small><strong>{money(revenue)}</strong></article><article><small>จำนวนบิล</small><strong>{periodOrders.length}</strong></article><article><small>ยอดเฉลี่ยต่อบิล</small><strong>{money(periodOrders.length ? revenue / periodOrders.length : 0)}</strong></article><article><small>รายการรอชำระ</small><strong>{unpaidOrders.length}</strong></article></div><div className="cashier-summary-grid"><section className="staff-table"><div className="cashier-panel-title"><h3>ยอดตามช่องทางชำระเงิน</h3></div><table><thead><tr><th>ช่องทาง</th><th>จำนวนบิล</th><th>ยอดรวม</th></tr></thead><tbody>{paymentMethods.map(item => <tr key={item.method}><td><b>{item.method}</b></td><td>{item.orders.length}</td><td><strong>{money(item.orders.reduce((sum, order) => sum + order.totalAmount, 0))}</strong></td></tr>)}</tbody></table></section><section className="staff-table"><div className="cashier-panel-title"><h3>สินค้าขายดี</h3></div><table><thead><tr><th>สินค้า</th><th>จำนวน</th><th>ยอดขาย</th></tr></thead><tbody>{productSales.slice(0, 8).map(item => <tr key={item.name}><td><b>{item.name}</b></td><td>{item.quantity}</td><td><strong>{money(item.amount)}</strong></td></tr>)}</tbody></table></section></div></section>}
        {receipt && <div className="receipt-overlay" onMouseDown={() => setReceipt(null)}>
            <article className="receipt cashier-receipt" onMouseDown={event => event.stopPropagation()}>
                <header className="thermal-header">
                    <h2>{settings?.siteName || 'LimeLeaf'}</h2>
                    <p className="thermal-address">
                        {settings?.address || 'ชั้น 1 ซอยเสาชิงช้า ถนนบำรุงเมือง\nพระนคร, กรุงเทพมหานคร 10200\nโทรศัพท์: 062-xxx-xxxx'}
                    </p>
                    <div className="thermal-title">{receipt.isPaid ? 'ใบเสร็จรับเงิน' : 'ใบสรุปรายการ'}</div>
                </header>

                <div className="thermal-meta">
                    <div className="thermal-meta-row"><span>เลขที่:</span><span>{orderCode(receipt)}</span></div>
                    <div className="thermal-meta-row"><span>ประเภท:</span><span>{receipt.deliveryType}</span></div>
                    <div className="thermal-meta-row"><span>ลูกค้า:</span><span>{customerLabel(receipt)}</span></div>
                    {receipt.deliveryType === 'ทานที่ร้าน' && <div className="thermal-meta-row thermal-table-row"><span>เบอร์โต๊ะ:</span><strong>{receipt.tableNumber || '—'}</strong></div>}
                    {receipt.createdAt && <div className="thermal-meta-row"><span>เวลาสั่ง:</span><span>{new Date(receipt.createdAt).toLocaleString('th-TH')}</span></div>}
                    {receipt.paidAt && <div className="thermal-meta-row"><span>เวลาชำระ:</span><span>{new Date(receipt.paidAt).toLocaleString('th-TH')}</span></div>}
                </div>

                <div className="thermal-items-header">
                    <span className="col-name">สินค้า</span>
                    <span className="col-qty">Qty</span>
                    <span className="col-price">ราคา</span>
                </div>

                <ul className="thermal-items">
                    {(Array.isArray(receipt.items) ? receipt.items : []).map((item, idx) => (
                        <li key={item.id || idx}>
                            <span className="col-name">{item.productName || item.product?.name || 'สินค้า'}</span>
                            <span className="col-qty">{item.quantity}</span>
                            <span className="col-price">{money(Number(item.priceAtTime || item.unitPrice || 0) * Number(item.quantity || 0))}</span>
                        </li>
                    ))}
                </ul>

                <div className="thermal-divider" />

                <div className="thermal-summary">
                    <div className="thermal-sum-row"><span>ยอดรวม</span><span>{money(receipt.subtotal)}</span></div>
                    {receipt.discountAmount > 0 && <div className="thermal-sum-row"><span>ส่วนลด</span><span>-{money(receipt.discountAmount)}</span></div>}
                    {receipt.deliveryFee > 0 && <div className="thermal-sum-row"><span>ค่าจัดส่ง</span><span>{money(receipt.deliveryFee)}</span></div>}
                </div>

                <div className="thermal-divider-dashed" />

                <div className="thermal-total">
                    <span>ทั้งหมด</span>
                    <strong>{money(receipt.totalAmount)}</strong>
                </div>
                {receipt.isPaid && (
                    <div className="thermal-payment-type">
                        <span>{receipt.paymentMethod || 'เงินสด'}</span>
                        <span>{money(receipt.totalAmount)}</span>
                    </div>
                )}

                <div className="thermal-divider" />

                <footer className="thermal-footer">
                    <p>ขอบคุณลูกค้าทุกท่านที่มาใช้บริการ</p>
                    <p>***</p>
                    <p>สถานะการชำระ: {receipt.paymentStatus || (receipt.isPaid ? 'PAID' : 'PENDING')}</p>
                </footer>

                <div className="receipt-actions noprint">
                    <button onClick={() => setReceipt(null)}>ปิด</button>
                    {receipt.isPaid && <button className="staff-primary" onClick={() => window.print()}>⎙ พิมพ์ใบเสร็จ</button>}
                </div>
            </article>
        </div>}
    </StaffShell>
}

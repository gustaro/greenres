import { useEffect, useState } from 'react'
import { mapProduct, api, adminApi, kitchenApi } from '../lib/database'
import { StaffShell, OrderItems, Empty, orderCode, scheduleLabel } from './StaffShared'

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

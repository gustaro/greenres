import { useEffect, useMemo, useState } from 'react'
import { fetchOrders } from '../../lib/database'
import { Empty, money, orderCode } from '../StaffShared'

export function KitchenOrdersStatusTab() {
    const [orders, setOrders] = useState([])
    const [loading, setLoading] = useState(true)
    const [dateRange, setDateRange] = useState('today') // 'today' | '7days' | 'all'
    const [statusFilter, setStatusFilter] = useState('all') // 'all' | 'DELIVERED' | 'CANCELLED' | 'ACTIVE'
    const [search, setSearch] = useState('')

    const loadOrders = async () => {
        setLoading(true)
        try {
            const data = await fetchOrders()
            setOrders(data || [])
        } catch (error) {
            console.error('Error fetching orders for kitchen history:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { loadOrders() }, [])

    // Filter by Date Range
    const dateFilteredOrders = useMemo(() => {
        if (dateRange === 'all') return orders
        const now = new Date()
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
        if (dateRange === 'today') {
            return orders.filter(o => new Date(o.createdAt).getTime() >= startOfToday)
        }
        if (dateRange === '7days') {
            const sevenDaysAgo = startOfToday - (7 * 24 * 60 * 60 * 1000)
            return orders.filter(o => new Date(o.createdAt).getTime() >= sevenDaysAgo)
        }
        return orders
    }, [orders, dateRange])

    // Filter by Status & Search
    const displayedOrders = useMemo(() => {
        return dateFilteredOrders.filter(order => {
            const isCompleted = order.serverStatus === 'DELIVERED' || order.status === 'DELIVERED' || order.foodStatus === 'เสร็จสิ้น'
            const isCancelled = order.serverStatus === 'CANCELLED' || order.status === 'CANCELLED' || order.foodStatus === 'ยกเลิก'
            const isActive = !isCompleted && !isCancelled

            if (statusFilter === 'DELIVERED' && !isCompleted) return false
            if (statusFilter === 'CANCELLED' && !isCancelled) return false
            if (statusFilter === 'ACTIVE' && !isActive) return false

            if (search.trim()) {
                const q = search.trim().toLowerCase()
                const code = String(orderCode(order)).toLowerCase()
                const customer = String(order.customerName || '').toLowerCase()
                const table = String(order.tableNumber || '').toLowerCase()
                const hasItem = (order.items || []).some(i => (i.productName || i.displayName || '').toLowerCase().includes(q))
                return code.includes(q) || customer.includes(q) || table.includes(q) || hasItem
            }
            return true
        }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    }, [dateFilteredOrders, statusFilter, search])

    // Metrics calculation
    const metrics = useMemo(() => {
        let completed = 0, cancelled = 0, active = 0
        dateFilteredOrders.forEach(o => {
            const isComp = o.serverStatus === 'DELIVERED' || o.status === 'DELIVERED' || o.foodStatus === 'เสร็จสิ้น'
            const isCanc = o.serverStatus === 'CANCELLED' || o.status === 'CANCELLED' || o.foodStatus === 'ยกเลิก'
            if (isComp) completed++
            else if (isCanc) cancelled++
            else active++
        })
        return { total: dateFilteredOrders.length, completed, cancelled, active }
    }, [dateFilteredOrders])

    const dateBtnStyle = active => ({
        padding: '6px 14px', borderRadius: 20, cursor: 'pointer', fontWeight: 800, fontSize: 13,
        border: active ? '2px solid var(--brand-primary, #12852f)' : '1px solid var(--brand-border, #d8e7d2)',
        background: active ? 'var(--brand-accent-soft, #effbdc)' : '#ffffff',
        color: active ? 'var(--brand-primary-dark, #075c1b)' : '#6d7b6e'
    })

    return (
        <section>
            {/* Header */}
            <div className="staff-section-head" style={{ alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div>
                    <h2>สถานะออร์เดอร์ (Order Status & History)</h2>
                    <p>ตรวจสอบประวัติออเดอร์ที่ทำสำเร็จและออเดอร์ที่ยกเลิกตามช่วงเวลา</p>
                </div>
                <button
                    type="button"
                    onClick={loadOrders}
                    disabled={loading}
                    className="staff-secondary"
                    style={{ padding: '8px 14px', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
                >
                    <i className={`bi bi-arrow-clockwise ${loading ? 'spin' : ''}`}></i>
                    รีเฟรชข้อมูล
                </button>
            </div>

            {/* Metrics Overview Bar */}
            <div className="staff-metrics" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', marginBottom: 20 }}>
                <article>
                    <small>ออเดอร์ทั้งหมด</small>
                    <strong>{metrics.total}</strong>
                </article>
                <article style={{ borderLeft: '4px solid var(--brand-primary, #12852f)' }}>
                    <small>ทำสำเร็จ</small>
                    <strong style={{ color: 'var(--brand-primary-dark, #075c1b)' }}>{metrics.completed}</strong>
                </article>
                <article style={{ borderLeft: '4px solid #ef4444' }}>
                    <small>ยกเลิก</small>
                    <strong style={{ color: '#dc2626' }}>{metrics.cancelled}</strong>
                </article>
                <article style={{ borderLeft: '4px solid #0284c7' }}>
                    <small>กำลังทำ/รอเสิร์ฟ</small>
                    <strong style={{ color: '#0284c7' }}>{metrics.active}</strong>
                </article>
            </div>

            {/* Filter Controls Bar */}
            <div style={{ background: '#ffffff', padding: '14px 18px', borderRadius: 16, border: '2px solid var(--brand-border, #d8e7d2)', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                {/* Date Filters */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#17351f', marginRight: 2 }}>
                        <i className="bi bi-calendar-event me-1"></i> ช่วงเวลา:
                    </span>
                    <button type="button" onClick={() => setDateRange('today')} style={dateBtnStyle(dateRange === 'today')}>วันนี้</button>
                    <button type="button" onClick={() => setDateRange('7days')} style={dateBtnStyle(dateRange === '7days')}>ย้อนหลัง 7 วัน</button>
                    <button type="button" onClick={() => setDateRange('all')} style={dateBtnStyle(dateRange === 'all')}>ทั้งหมด</button>
                </div>

                {/* Status Filters */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#17351f', marginRight: 2 }}>
                        <i className="bi bi-funnel me-1"></i> สถานะ:
                    </span>
                    <button
                        type="button"
                        onClick={() => setStatusFilter('all')}
                        style={{
                            padding: '6px 12px', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 12.5,
                            border: statusFilter === 'all' ? '2px solid #17351f' : '1px solid var(--brand-border, #d8e7d2)',
                            background: statusFilter === 'all' ? '#17351f' : '#ffffff',
                            color: statusFilter === 'all' ? '#ffffff' : '#17351f'
                        }}
                    >
                        ทั้งหมด ({dateFilteredOrders.length})
                    </button>
                    <button
                        type="button"
                        onClick={() => setStatusFilter('DELIVERED')}
                        style={{
                            padding: '6px 12px', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 12.5,
                            border: statusFilter === 'DELIVERED' ? '2px solid var(--brand-primary, #12852f)' : '1px solid var(--brand-accent, #b8ff35)',
                            background: statusFilter === 'DELIVERED' ? 'var(--brand-primary-dark, #075c1b)' : 'var(--brand-accent-soft, #effbdc)',
                            color: statusFilter === 'DELIVERED' ? '#ffffff' : 'var(--brand-primary-dark, #075c1b)'
                        }}
                    >
                        <i className="bi bi-check2-circle me-1"></i> ทำสำเร็จ ({metrics.completed})
                    </button>
                    <button
                        type="button"
                        onClick={() => setStatusFilter('CANCELLED')}
                        style={{
                            padding: '6px 12px', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 12.5,
                            border: statusFilter === 'CANCELLED' ? '2px solid #dc2626' : '1px solid #fecaca',
                            background: statusFilter === 'CANCELLED' ? '#b91c1c' : '#fef2f2',
                            color: statusFilter === 'CANCELLED' ? '#ffffff' : '#991b1b'
                        }}
                    >
                        <i className="bi bi-x-circle me-1"></i> ยกเลิก ({metrics.cancelled})
                    </button>
                </div>

                {/* Search box */}
                <div style={{ flex: 1, minWidth: 200, maxWidth: 300 }}>
                    <input
                        className="cashier-search"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="ค้นหาเลขออเดอร์, โต๊ะ, เมนู..."
                        style={{ width: '100%', padding: '7px 12px', borderRadius: 10 }}
                    />
                </div>
            </div>

            {/* Orders Grid */}
            <div className="kitchen-status-container-box">
                {loading ? (
                    <Empty text="กำลังโหลดข้อมูลสถานะออร์เดอร์..." />
                ) : displayedOrders.length === 0 ? (
                    <Empty text={search ? 'ไม่พบออเดอร์ตามคำค้นหา' : 'ไม่มีออเดอร์ในหมวดหมู่นี้'} />
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: 16, flex: 1 }}>
                        {displayedOrders.map(order => {
                            const isComp = order.serverStatus === 'DELIVERED' || order.status === 'DELIVERED' || order.foodStatus === 'เสร็จสิ้น'
                            const isCanc = order.serverStatus === 'CANCELLED' || order.status === 'CANCELLED' || order.foodStatus === 'ยกเลิก'
                            const isDineIn = order.deliveryType === 'ทานที่ร้าน'

                            return (
                                <article
                                    key={order.id}
                                    style={{
                                        background: '#ffffff',
                                        border: `2px solid ${isComp ? 'var(--brand-accent, #9fe51f)' : isCanc ? '#fca5a5' : '#93c5fd'}`,
                                        borderTop: `5px solid ${isComp ? 'var(--brand-primary, #12852f)' : isCanc ? '#dc2626' : '#2563eb'}`,
                                        borderRadius: 16,
                                        padding: 16,
                                        boxShadow: '0 4px 14px rgba(18, 63, 39, 0.06)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                    }}
                                >
                                    {/* Order Card Header */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid #f0f4ee' }}>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                                {isDineIn ? (
                                                    <span style={{ background: 'var(--brand-accent, #b8ff35)', color: 'var(--brand-primary-dark, #075c1b)', fontWeight: 900, fontSize: 13, padding: '3px 10px', borderRadius: 8, border: '1.5px solid var(--brand-accent, #b8ff35)' }}>
                                                        โต๊ะ {order.tableNumber || '—'}
                                                    </span>
                                                ) : (
                                                    <span style={{ background: '#fef3c7', color: '#92400e', fontWeight: 800, fontSize: 12, padding: '3px 8px', borderRadius: 6 }}>
                                                        {order.deliveryType || 'สั่งกลับบ้าน'}
                                                    </span>
                                                )}
                                                <h4 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#17351f' }}>
                                                    {orderCode(order)}
                                                </h4>
                                            </div>
                                            <small style={{ color: '#6d7b6e', fontSize: 11 }}>
                                                {new Date(order.createdAt).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}
                                                {order.customerName && ` · ${order.customerName}`}
                                            </small>
                                        </div>

                                        <span style={{
                                            padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 800,
                                            display: 'inline-flex', alignItems: 'center', gap: 4,
                                            background: isComp ? 'var(--brand-accent-soft, #effbdc)' : isCanc ? '#fee2e2' : '#eff6ff',
                                            color: isComp ? 'var(--brand-primary-dark, #075c1b)' : isCanc ? '#b91c1c' : '#1d4ed8',
                                            border: `1px solid ${isComp ? 'var(--brand-accent, #9fe51f)' : isCanc ? '#fca5a5' : '#bfdbfe'}`
                                        }}>
                                            {isComp ? <><i className="bi bi-check-circle-fill"></i> ทำสำเร็จ</> :
                                             isCanc ? <><i className="bi bi-x-circle-fill"></i> ยกเลิก</> :
                                             <><i className="bi bi-hourglass-split"></i> กำลังดำเนินการ</>}
                                        </span>
                                    </div>
                                    <div style={{ flex: 1, marginBottom: 10, background: '#fbfdfa', padding: '10px 12px', borderRadius: 10, border: '1px solid #e5ede3' }}>
                                        <div style={{ fontSize: 11, fontWeight: 800, color: '#6d7b6e', marginBottom: 6 }}>
                                            รายการอาหาร ({order.items?.length || 0}):
                                        </div>
                                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
                                            {(order.items || []).map(item => (
                                                <li key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, color: isCanc ? '#9ca3af' : '#17351f', textDecoration: isCanc ? 'line-through' : 'none' }}>
                                                    <span>
                                                        <span style={{ color: isComp ? 'var(--brand-primary, #12852f)' : isCanc ? '#dc2626' : '#2563eb', marginRight: 6, display: 'inline-flex' }}>
                                                            {isComp ? <i className="bi bi-check2" /> : isCanc ? <i className="bi bi-x" /> : <i className="bi bi-circle-fill" style={{ fontSize: 5 }} />}
                                                        </span>
                                                        <strong>{item.productName || item.displayName || 'สินค้า'}</strong>
                                                        {item.isAddedLater && (
                                                            <span style={{ fontSize: 10, background: '#fee2e2', color: '#b91c1c', padding: '1px 5px', borderRadius: 4, marginLeft: 4, fontWeight: 700 }}>
                                                                สั่งเพิ่ม
                                                            </span>
                                                        )}
                                                    </span>
                                                    <strong style={{ color: 'var(--brand-primary-dark, #075c1b)' }}>×{item.quantity}</strong>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    {/* Footer */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '1px solid #f0f4ee', fontSize: 12 }}>
                                        <span style={{ color: '#6d7b6e' }}>
                                            ยอดรวม: <strong style={{ color: '#17351f', fontSize: 14 }}>{money(order.totalAmount)}</strong>
                                        </span>
                                        <span style={{ fontSize: 11, color: '#6d7b6e' }}>
                                            {order.isPaid ? <><i className="bi bi-check-circle-fill" style={{ color: 'var(--brand-primary, #12852f)', marginRight: 4 }} />ชำระแล้ว</> : 'ยังไม่ชำระ'}
                                        </span>
                                    </div>
                                </article>
                            )
                        })}
                    </div>
                )}
            </div>
        </section>
    )
}

import { useEffect, useState } from 'react'
import { useAuth } from '../lib/AuthContext'
import { deliveryApi, markOrderPaid } from '../lib/database'
import { StaffShell, OrderItems, Empty, money } from './StaffShared'

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

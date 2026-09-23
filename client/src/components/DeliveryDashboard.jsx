import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../lib/AuthContext'
import { deliveryApi, markOrderPaid } from '../lib/database'
import { StaffShell, Empty } from './StaffShared'
import { SERVER_CHANGE_EVENT, SERVER_SYNC_KEY } from '../lib/api'
import { attachRealtimeFallback, subscribeDatabaseChanges } from '../lib/realtime'
import { DELIVERY_FLOW, DELIVERY_STATUS_LABEL, normalizeJob } from './delivery/DeliveryShared'
import { DeliveryRiderBar } from './delivery/DeliveryRiderBar'
import { DeliveryJobCard } from './delivery/DeliveryJobCard'
import { DeliveryRiderProfileModal } from './delivery/DeliveryRiderProfileModal'
import { DeliveryCashModal } from './delivery/DeliveryCashModal'

export function DeliveryDashboard({ setOrders }) {
    const { profile, session } = useAuth()
    const isAdmin = profile?.role === 'admin'
    const [tab, setTab] = useState('active')
    const [jobs, setJobs] = useState([])
    const [rider, setRider] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [expanded, setExpanded] = useState(null)
    const [cashConfirm, setCashConfirm] = useState(null)
    const [notice, setNotice] = useState('')
    const [showProfileModal, setShowProfileModal] = useState(false)

    const loadRequestRef = useRef(null)

    const notify = msg => {
        setNotice(msg)
        setTimeout(() => setNotice(''), 2500)
    }

    const load = useCallback(async (silent = false) => {
        if (loadRequestRef.current) return loadRequestRef.current
        if (!silent) setLoading(true)

        const request = (async () => {
            try {
                setError('')
                const [riderResult, deliveryResult] = await Promise.all([
                    deliveryApi.riderProfile().catch(() => null),
                    isAdmin ? deliveryApi.list() : deliveryApi.riderDeliveries(),
                ])

                if (riderResult) setRider(riderResult)
                setJobs(deliveryResult?.deliveries ?? (Array.isArray(deliveryResult) ? deliveryResult : []))
            } catch (loadError) {
                setError(loadError.message)
            } finally {
                if (!silent) setLoading(false)
            }
        })().finally(() => {
            loadRequestRef.current = null
        })

        loadRequestRef.current = request
        return request
    }, [isAdmin])

    useEffect(() => {
        const refresh = () => load(true)
        const onServerChange = event => {
            const path = event.detail?.path || ''
            if (path.startsWith('/delivery') || path.startsWith('/orders')) refresh()
        }
        const onStorage = event => {
            if (event.key !== SERVER_SYNC_KEY || !event.newValue) return
            try {
                const change = JSON.parse(event.newValue)
                if (change.path?.startsWith('/delivery') || change.path?.startsWith('/orders')) refresh()
            } catch { /* ignore malformed sync payload */ }
        }

        load()

        const unsubscribeRealtime = subscribeDatabaseChanges({
            channelName: 'limeleaf-delivery',
            tables: ['deliveries', 'tracking_events', 'orders'],
            onChange: refresh,
            onStatus: (status, err) => {
                if (status === 'SUBSCRIBED') console.info('[Realtime] Delivery connected')
                if (err) console.warn('[Realtime] Delivery connection error', err)
            },
        })
        const detachFallback = attachRealtimeFallback({ refresh, pollMs: 30000 })

        window.addEventListener(SERVER_CHANGE_EVENT, onServerChange)
        window.addEventListener('storage', onStorage)

        return () => {
            unsubscribeRealtime()
            detachFallback()
            window.removeEventListener(SERVER_CHANGE_EVENT, onServerChange)
            window.removeEventListener('storage', onStorage)
        }
    }, [load])

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
        } catch (err) {
            window.alert(err.message)
        }
    }

    const advance = async job => {
        const delivStatus = job.status ?? job.serverDeliveryStatus
        const flow = DELIVERY_FLOW[delivStatus]
        if (!flow) return
        const [nextStatus] = flow

        try {
            setJobs(current => current.map(j =>
                (j.id === job.id || j.deliveryId === job.deliveryId)
                    ? { ...j, status: nextStatus, serverDeliveryStatus: nextStatus, foodStatus: DELIVERY_STATUS_LABEL[nextStatus] ?? nextStatus }
                    : j
            ))
            if (nextStatus === 'DELIVERED') {
                const oid = job.orderId ?? job.order?.id
                if (oid && setOrders) {
                    setOrders(current => current.map(o => o.id === oid ? { ...o, foodStatus: 'จัดส่งเสร็จสิ้น', serverStatus: 'DELIVERED' } : o))
                }
            }

            if (isAdmin) await deliveryApi.updateStatus(job.deliveryId ?? job.id, nextStatus)
            else await deliveryApi.updateRiderDelivery(job.deliveryId ?? job.id, nextStatus)

            notify('อัปเดตสถานะแล้ว')
            load(true)
        } catch (err) {
            window.alert('Error updating status: ' + err.message)
            load(true)
        }
    }

    const confirmCashPayment = async job => {
        const orderId = job.orderId ?? job.order?.id
        if (!orderId) return window.alert('ไม่พบ Order ID')
        try {
            if (setOrders) {
                setOrders(current => current.map(o => o.id === orderId ? { ...o, isPaid: true, paymentStatus: 'PAID' } : o))
            }
            setJobs(current => current.map(j =>
                (j.id === job.id || j.deliveryId === job.deliveryId)
                    ? { ...j, order: { ...j.order, isPaid: true } }
                    : j
            ))
            setCashConfirm(null)

            await markOrderPaid(orderId)
            notify('บันทึกรับเงินสดแล้ว')
        } catch (err) {
            window.alert('Error updating payment: ' + err.message)
            load(true)
        }
    }

    const normalizedJobs = jobs.map(normalizeJob)
    const activeJobs = normalizedJobs.filter(j => !['DELIVERED', 'FAILED', 'CANCELLED'].includes(j.status))
    const completedJobs = normalizedJobs.filter(j => j.status === 'DELIVERED')
    const cards = tab === 'active' ? activeJobs : completedJobs

    return (
        <StaffShell
            role="delivery"
            title="ศูนย์จัดส่ง (Rider Hub)"
            subtitle={isAdmin ? 'จัดการงานส่งทั้งหมดและทดสอบการวิ่งงาน (Admin)' : 'งานจัดส่งและโปรไฟล์ของคุณ'}
            active={tab}
            onTab={setTab}
            tabs={[
                { key: 'active', label: 'งานจัดส่ง', icon: 'bi-bicycle', count: activeJobs.length },
                { key: 'completed', label: 'จัดส่งสำเร็จ', icon: 'bi-check-circle' },
            ]}
        >
            <DeliveryRiderBar
                rider={rider}
                session={session}
                profile={profile}
                isAdmin={isAdmin}
                toggleAvailability={toggleAvailability}
                setShowProfileModal={setShowProfileModal}
            />

            {error && (
                <div className="staff-alert" style={{ background: '#fef2f2', borderColor: '#fca5a5', color: '#b91c1c' }}>
                    {error}
                </div>
            )}

            <section>
                <div className="staff-section-head">
                    <div>
                        <h2>{tab === 'active' ? `งานจัดส่ง (${activeJobs.length})` : `ประวัติส่งสำเร็จ (${completedJobs.length})`}</h2>
                        <p>{isAdmin ? 'ข้อมูลออเดอร์จัดส่งทั้งหมด (Admin Mode)' : 'งานที่ได้รับมอบหมาย'} · นำทางด้วย Google Maps</p>
                    </div>
                </div>

                {loading ? (
                    <Empty text="กำลังโหลดงานจัดส่ง..." />
                ) : cards.length === 0 ? (
                    <Empty text={tab === 'active' ? 'ไม่มีงานจัดส่งที่รออยู่' : 'ยังไม่มีประวัติการจัดส่งสำเร็จ'} />
                ) : (
                    <div className="delivery-grid">
                        {cards.map(job => (
                            <DeliveryJobCard
                                key={job.id}
                                job={job}
                                isAdmin={isAdmin}
                                tab={tab}
                                isOpen={expanded === job.id}
                                onToggle={() => setExpanded(expanded === job.id ? null : job.id)}
                                advance={advance}
                                onConfirmCash={setCashConfirm}
                            />
                        ))}
                    </div>
                )}
            </section>

            <DeliveryRiderProfileModal
                showProfileModal={showProfileModal}
                setShowProfileModal={setShowProfileModal}
                rider={rider}
                setRider={setRider}
                notify={notify}
            />

            <DeliveryCashModal
                cashConfirm={cashConfirm}
                setCashConfirm={setCashConfirm}
                confirmCashPayment={confirmCashPayment}
            />

            {notice && <div className="ad-toast"><i className="bi bi-check2-circle me-1" />{notice}</div>}
        </StaffShell>
    )
}

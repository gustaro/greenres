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
import { DeliveryCompleteModal } from './delivery/DeliveryCompleteModal'
import { DeliveryImageLightbox } from './delivery/DeliveryImageLightbox'

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
    const [activeDeliveryJob, setActiveDeliveryJob] = useState(null)
    const [lightboxImage, setLightboxImage] = useState(null)
    const [notice, setNotice] = useState('')
    const [showProfileModal, setShowProfileModal] = useState(false)
    const [advancingJobId, setAdvancingJobId] = useState(null)
    const [cashConfirming, setCashConfirming] = useState(false)
    const [modalSubmitting, setModalSubmitting] = useState(false)

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

        // When moving to DELIVERED, require proof photo & payment via modal!
        if (nextStatus === 'DELIVERED') {
            setActiveDeliveryJob(job)
            return
        }

        const targetId = job.deliveryId ?? job.id
        setAdvancingJobId(targetId)
        try {
            setJobs(current => current.map(j =>
                (j.id === job.id || j.deliveryId === job.deliveryId)
                    ? { ...j, status: nextStatus, serverDeliveryStatus: nextStatus, foodStatus: DELIVERY_STATUS_LABEL[nextStatus] ?? nextStatus }
                    : j
            ))

            if (isAdmin) await deliveryApi.updateStatus(job.deliveryId ?? job.id, nextStatus)
            else await deliveryApi.updateRiderDelivery(job.deliveryId ?? job.id, nextStatus)

            notify('อัปเดตสถานะแล้ว')
            load(true)
        } catch (err) {
            window.alert('Error updating status: ' + err.message)
            load(true)
        } finally {
            setAdvancingJobId(null)
        }
    }

    const handleCompleteDelivery = async ({
        job,
        deliveryProofFile,
        deliveryProofUrl,
        paymentMode,
        paymentProofFile,
        paymentProofUrl,
        isQrPaid,
        stripePaymentId,
    }) => {
        const targetId = job.deliveryId ?? job.id
        const orderId = job.orderId ?? job.order?.id
        setModalSubmitting(true)
        try {
            let finalProofUrl = deliveryProofUrl
            let finalPaymentProofUrl = paymentProofUrl

            // 1. Upload proof of delivery if file provided
            if (deliveryProofFile) {
                try {
                    const res = await deliveryApi.uploadProof(targetId, deliveryProofFile, 'delivery')
                    if (res?.url || res?.proofImageUrl) finalProofUrl = res.url || res.proofImageUrl
                } catch (err) {
                    console.warn('Delivery proof upload error:', err.message)
                }
            }

            // 2. Upload payment proof if file provided
            if (paymentProofFile) {
                try {
                    const res = await deliveryApi.uploadProof(targetId, paymentProofFile, 'payment')
                    if (res?.url || res?.paymentProofUrl) finalPaymentProofUrl = res.url || res.paymentProofUrl
                } catch (err) {
                    console.warn('Payment proof upload error:', err.message)
                }
            }

            // 3. Mark payment paid if job was unpaid or QR paid
            if (!job.isPaid && orderId) {
                const method = isQrPaid ? 'PROMPTPAY_STRIPE' : 'CASH'
                const detail = isQrPaid ? 'สแกนคิวอาร์ (PromptPay)' : (paymentMode === 'cash_transfer' ? 'เงินสด/โอนตรง' : 'เงินสด')
                await markOrderPaid(orderId, method, detail, stripePaymentId, finalPaymentProofUrl).catch(err => {
                    console.warn('Mark order paid error:', err.message)
                })
                if (setOrders) {
                    setOrders(current => current.map(o => o.id === orderId ? { ...o, isPaid: true, paymentStatus: 'PAID' } : o))
                }
            }

            // 4. Advance delivery status to DELIVERED with proofImageUrl
            const nextStatus = 'DELIVERED'
            if (isAdmin) await deliveryApi.updateStatus(targetId, nextStatus, { proofImageUrl: finalProofUrl })
            else await deliveryApi.updateRiderDelivery(targetId, nextStatus, { proofImageUrl: finalProofUrl })

            if (orderId && setOrders) {
                setOrders(current => current.map(o => o.id === orderId ? { ...o, foodStatus: 'จัดส่งเสร็จสิ้น', serverStatus: 'DELIVERED', isPaid: true } : o))
            }

            notify('ส่งมอบสินค้าและบันทึกข้อมูลเรียบร้อยแล้ว')
            setActiveDeliveryJob(null)
            setCashConfirm(null)
            load(true)
        } catch (err) {
            window.alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' + err.message)
            load(true)
        } finally {
            setModalSubmitting(false)
        }
    }

    const confirmCashPayment = async data => {
        await handleCompleteDelivery(data)
    }

    const openCardRef = useRef(null)

    useEffect(() => {
        if (expanded && openCardRef.current) {
            openCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        }
    }, [expanded])

    const normalizedJobs = jobs.map(normalizeJob)
    const activeJobs = normalizedJobs.filter(j => !['DELIVERED', 'FAILED', 'CANCELLED'].includes(j.status))
    const completedJobs = normalizedJobs.filter(j => j.status === 'DELIVERED')
    const cards = tab === 'active' ? activeJobs : completedJobs

    const closedCards = expanded ? cards.filter(j => j.id !== expanded) : cards
    const activeOpenCard = expanded ? cards.find(j => j.id === expanded) : null

    return (
        <StaffShell
            role="delivery"
            title="ศูนย์จัดส่ง (Rider Hub)"
            subtitle={isAdmin ? 'จัดการงานส่งทั้งหมดและทดสอบการวิ่งงาน (Admin)' : 'งานจัดส่งและโปรไฟล์ของคุณ'}
            active={tab}
            onTab={t => {
                setTab(t)
                setExpanded(null)
            }}
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
                    <div className="delivery-cards-container">
                        {/* การ์ดที่ไม่ได้ถูกเปิด ให้เรียงอยู่ข้างบน */}
                        <div className="delivery-grid" style={activeOpenCard ? { paddingBottom: 24 } : {}}>
                            {closedCards.map(job => (
                                <DeliveryJobCard
                                    key={job.id}
                                    job={job}
                                    isAdmin={isAdmin}
                                    tab={tab}
                                    isOpen={false}
                                    onToggle={() => setExpanded(job.id)}
                                    advance={advance}
                                    advancingJobId={advancingJobId}
                                    onConfirmCash={setActiveDeliveryJob}
                                    onViewImage={(url, title, subtitle) => setLightboxImage({ url, title, subtitle })}
                                />
                            ))}
                        </div>

                        {/* การ์ดที่ถูกเปิด เลื่อนลงมาข้างล่างตรงกลาง */}
                        {activeOpenCard && (
                            <div
                                ref={openCardRef}
                                className="delivery-active-focus-section"
                                style={{
                                    width: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    paddingBottom: 50,
                                }}
                            >
                                <div style={{ width: '100%', maxWidth: 820 }}>
                                    <DeliveryJobCard
                                        key={activeOpenCard.id}
                                        job={activeOpenCard}
                                        isAdmin={isAdmin}
                                        tab={tab}
                                        isOpen={true}
                                        onToggle={() => setExpanded(null)}
                                        advance={advance}
                                        advancingJobId={advancingJobId}
                                        onConfirmCash={setActiveDeliveryJob}
                                        onViewImage={(url, title, subtitle) => setLightboxImage({ url, title, subtitle })}
                                    />
                                </div>
                            </div>
                        )}
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

            {activeDeliveryJob && (
                <DeliveryCompleteModal
                    job={activeDeliveryJob}
                    onClose={() => setActiveDeliveryJob(null)}
                    onConfirm={handleCompleteDelivery}
                    isSubmitting={modalSubmitting}
                />
            )}

            {lightboxImage && (
                <DeliveryImageLightbox
                    image={lightboxImage.url}
                    title={lightboxImage.title}
                    subtitle={lightboxImage.subtitle}
                    onClose={() => setLightboxImage(null)}
                />
            )}

            {notice && <div className="ad-toast"><i className="bi bi-check2-circle me-1" />{notice}</div>}
        </StaffShell>
    )
}

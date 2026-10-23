import { DELIVERY_FLOW, DELIVERY_STATUS_LABEL, DELIVERY_STATUS_CLASS } from './DeliveryShared'
import { money } from '../StaffShared'
import { buildGoogleMapsNavUrl } from '../../lib/geo'
import { orderItemOptionLabel } from '../../lib/productOptions'

export function DeliveryJobCard({ job, isAdmin, tab, isOpen, onToggle, advance, advancingJobId, onConfirmCash, onViewImage }) {
    const flow = DELIVERY_FLOW[job.status]
    const isCash = ['ชำระเงินปลายทาง', 'CASH', 'เงินสด'].includes(job.paymentMethod)
    const needCash = isCash && !job.isPaid && job.status === 'DELIVERED'
    const isAdvancing = advancingJobId === (job.deliveryId ?? job.id)
    const hasCoords = job.dropLat != null && job.dropLng != null && !isNaN(Number(job.dropLat)) && !isNaN(Number(job.dropLng))
    const googleMapsUrl = buildGoogleMapsNavUrl({
        lat: job.dropLat,
        lng: job.dropLng,
        address: job.deliveryAddress,
    })
    const customerPhoneLink = job.customerPhone ? `tel:${String(job.customerPhone).replace(/[^\d+]/g, '')}` : ''
    const canNavigate = Boolean(job.deliveryAddress || hasCoords)
    const currentStatusLabel = DELIVERY_STATUS_LABEL[job.status] ?? job.status
    const nextStatusLabel = flow ? DELIVERY_STATUS_LABEL[flow[0]] ?? flow[1] : ''

    return (
        <article
            className={`delivery-card${isOpen ? ' expanded' : ''}`}
            style={{
                borderLeft: '5px solid var(--brand-primary, #12852f)',
                borderRadius: 14,
                boxShadow: '0 4px 14px rgba(0, 193, 74, 0.12)',
            }}
        >
            {/* Card Header */}
            <header>
                <button type="button" className="delivery-card-toggle" onClick={onToggle} aria-expanded={isOpen}>
                    <span className="delivery-card-customer">
                        <small>DELIVERY · {job.provider}</small>
                        <strong>{job.orderNumber}</strong>
                        <span>{job.customerName}{job.customerPhone ? ` · ${job.customerPhone}` : ''}</span>
                    </span>
                    <span className="delivery-card-state">
                        <i className={`status ${DELIVERY_STATUS_CLASS[job.status] ?? ''}`}>{currentStatusLabel}</i>
                        <span>{isOpen ? <><i className="bi bi-chevron-up" /> ซ่อน</> : <><i className="bi bi-chevron-down" /> ดูรายละเอียด</>}</span>
                    </span>
                </button>
            </header>

            {!isOpen && job.deliveryAddress && (
                <div className="delivery-destination-preview">
                    <i className="bi bi-geo-alt-fill" />
                    <span>{job.deliveryAddress}</span>
                </div>
            )}

            <div className="delivery-quick-actions" aria-label="การดำเนินการด่วน">
                {customerPhoneLink && (
                    <a className="delivery-quick-action call" href={customerPhoneLink}>
                        <i className="bi bi-telephone-fill" />
                        <span>โทรหาลูกค้า</span>
                    </a>
                )}
                {canNavigate && (
                    <a className="delivery-quick-action maps" href={googleMapsUrl} target="_blank" rel="noopener noreferrer">
                        <i className="bi bi-geo-alt-fill" />
                        <span>เปิด Google Maps</span>
                    </a>
                )}
            </div>

            {isCash && !job.isPaid && (
                <div className="delivery-cash-alert">
                    <span><i className="bi bi-cash-coin" /> ต้องเก็บเงินปลายทาง</span>
                    <b>{money(job.totalAmount)}</b>
                </div>
            )}

            {/* Expandable detail */}
            {isOpen && (
                <>
                    {/* Address & Google Maps link */}
                    <div className="delivery-address" style={{ background: 'var(--brand-surface, #f6faf2)', padding: 12, borderRadius: 8, border: '1px solid var(--brand-border, #d8e7d2)' }}>
                        <span style={{ fontSize: 20, color: 'var(--brand-primary, #12852f)' }}>
                            <i className="bi bi-geo-alt"></i>
                        </span>
                        <div style={{ flex: 1 }}>
                            <small style={{ color: '#6d7b6e' }}>{job.estimatedMinutes ? `ประมาณ ${job.estimatedMinutes} นาที` : 'ระยะทางทั่วไป'}</small>
                            <p style={{ margin: '4px 0 8px', fontWeight: 600, color: '#17351f' }}>{job.deliveryAddress || 'ไม่ได้ระบุที่อยู่'}</p>
                            {hasCoords && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                                        <span
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 4,
                                                fontSize: 11,
                                                fontWeight: 700,
                                                color: 'var(--brand-primary, #12852f)',
                                                background: '#fff',
                                                padding: '5px 10px',
                                                borderRadius: 6,
                                                border: '1px solid var(--brand-border, #d8e7d2)',
                                            }}
                                        >
                                            <i className="bi bi-pin-map-fill" style={{ color: 'var(--brand-primary, #12852f)' }}></i>
                                            ปักหมุดพิกัด: {Number(job.dropLat).toFixed(5)}, {Number(job.dropLng).toFixed(5)}
                                        </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Items */}
                    {job.items.length > 0 && (
                        <ul className="staff-order-items">
                            {job.items.map(item => (
                                <li key={item.id ?? item.productName}>
                                    <span>{item.productName} <small>× {item.quantity}</small>{orderItemOptionLabel(item) && <small className="staff-item-options">{orderItemOptionLabel(item)}</small>}</span>
                                    <b>{money(Number(item.priceAtTime) * Number(item.quantity))}</b>
                                </li>
                            ))}
                        </ul>
                    )}

                    {/* Rider info */}
                    {isAdmin && job.riderName && (
                        <div style={{ padding: '8px 0', fontSize: 12, color: '#17351f', borderTop: '1px solid #edf1eb', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <i className="bi bi-bicycle"></i> Rider ที่รับงาน: <b>{job.riderName}</b>{job.riderPhone ? <span> · <i className="bi bi-telephone me-1"></i>{job.riderPhone}</span> : ''}
                        </div>
                    )}

                    {/* Payment row */}
                    <div className="delivery-payment" style={{ padding: '8px 12px', background: '#fdfbf7', borderRadius: 6 }}>
                        <span>ยอดออเดอร์ <b>{money(job.totalAmount)}</b></span>
                        <i className={`status ${job.isPaid ? 'paid' : 'pending'}`}>
                            {job.isPaid ? (
                                <><i className="bi bi-check2 me-1"></i> ชำระแล้ว</>
                            ) : isCash ? (
                                <><i className="bi bi-cash-coin me-1"></i> เก็บเงินสดปลายทาง</>
                            ) : (
                                <><i className="bi bi-clock-history me-1"></i> รอชำระ</>
                            )}
                        </i>
                    </div>

                    {/* Proof Images Section (Delivery photo & Payment slip) */}
                    {(job.proofImageUrl || job.paymentProofUrl) && (
                        <div
                            style={{
                                padding: '10px 12px',
                                background: '#f0fdf4',
                                border: '1px solid #bbf7d0',
                                borderRadius: 10,
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 8,
                            }}
                        >
                            <small style={{ fontSize: 11, fontWeight: 800, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                <i className="bi bi-shield-check me-1" />
                                หลักฐานการจัดส่งและชำระเงิน (ตรวจสอบย้อนหลัง)
                            </small>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                                {job.proofImageUrl && (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            onViewImage?.(job.proofImageUrl, 'ภาพถ่ายตอนส่งของสำเร็จ', `ออเดอร์ ${job.orderNumber}`)
                                        }}
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 8,
                                            padding: '6px 10px',
                                            background: '#ffffff',
                                            border: '1px solid #86efac',
                                            borderRadius: 8,
                                            cursor: 'pointer',
                                            color: '#15803d',
                                            fontWeight: 700,
                                            fontSize: 12,
                                        }}
                                    >
                                        <img
                                            src={job.proofImageUrl}
                                            alt="Proof"
                                            style={{ width: 28, height: 28, borderRadius: 4, objectFit: 'cover' }}
                                        />
                                        <span><i className="bi bi-camera-fill me-1" />รูปส่งของสำเร็จ</span>
                                        <i className="bi bi-box-arrow-up-right ms-1 text-muted" style={{ fontSize: 10 }} />
                                    </button>
                                )}
                                {job.paymentProofUrl && (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            onViewImage?.(job.paymentProofUrl, 'หลักฐานการชำระเงิน (เงินสด/สลิป)', `ออเดอร์ ${job.orderNumber} · ${money(job.totalAmount)}`)
                                        }}
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 8,
                                            padding: '6px 10px',
                                            background: '#ffffff',
                                            border: '1px solid #fdba74',
                                            borderRadius: 8,
                                            cursor: 'pointer',
                                            color: '#c2410c',
                                            fontWeight: 700,
                                            fontSize: 12,
                                        }}
                                    >
                                        <img
                                            src={job.paymentProofUrl}
                                            alt="Payment Slip/Cash"
                                            style={{ width: 28, height: 28, borderRadius: 4, objectFit: 'cover' }}
                                        />
                                        <span><i className="bi bi-receipt me-1" />สลิป/รูปเงินสด</span>
                                        <i className="bi bi-box-arrow-up-right ms-1 text-muted" style={{ fontSize: 10 }} />
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Status progress bar */}
                    <div className="delivery-progress">
                        {['ASSIGNED', 'PICKED_UP', 'ON_THE_WAY', 'ARRIVED', 'DELIVERED'].map((s, i, arr) => {
                            const statuses = ['PENDING', 'ASSIGNED', 'PICKED_UP', 'ON_THE_WAY', 'ARRIVED', 'DELIVERED']
                            const currentIdx = statuses.indexOf(job.status)
                            const stepIdx = statuses.indexOf(s)
                            return (
                                <div key={s} className={`dp-step${stepIdx <= currentIdx ? ' done' : ''}`}>
                                    <div className="dp-dot" />
                                    {i < arr.length - 1 && <div className="dp-line" />}
                                    <small>{DELIVERY_STATUS_LABEL[s]}</small>
                                </div>
                            )
                        })}
                    </div>
                    <div className="delivery-progress-mobile">
                        <span><small>สถานะปัจจุบัน</small><b>{currentStatusLabel}</b></span>
                        {flow && <i className="bi bi-arrow-right" />}
                        {flow && <span><small>ขั้นตอนถัดไป</small><b>{nextStatusLabel}</b></span>}
                    </div>
                </>
            )}

            {/* Action buttons */}
            <footer className="delivery-card-actions">
                {flow && tab === 'active' && (
                    <button
                        className="staff-primary"
                        onClick={() => advance(job)}
                        disabled={isAdvancing}
                        style={{ fontWeight: 800, padding: '10px 18px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                    >
                        <i className={`bi ${isAdvancing ? 'bi-arrow-repeat spin' : flow[2]}`}></i>
                        {isAdvancing ? 'กำลังอัปเดต...' : flow[1]}
                    </button>
                )}
                {needCash && (
                    <button
                        className="staff-danger"
                        onClick={() => onConfirmCash(job)}
                        style={{ fontWeight: 800, padding: '10px 18px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                    >
                        <i className="bi bi-cash-coin"></i> บันทึกรับเงินสด
                    </button>
                )}
                {!isOpen && isCash && !job.isPaid && job.status !== 'DELIVERED' && (
                    <small style={{ color: '#c17d00', fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <i className="bi bi-cash-coin"></i> เก็บเงินสดตอนส่ง
                    </small>
                )}
            </footer>
        </article>
    )
}

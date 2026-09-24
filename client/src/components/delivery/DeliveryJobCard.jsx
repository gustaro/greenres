import { DELIVERY_FLOW, DELIVERY_STATUS_LABEL, DELIVERY_STATUS_CLASS } from './DeliveryShared'
import { money } from '../StaffShared'

export function DeliveryJobCard({ job, isAdmin, tab, isOpen, onToggle, advance, advancingJobId, onConfirmCash, onViewImage }) {
    const flow = DELIVERY_FLOW[job.status]
    const isCash = ['ชำระเงินปลายทาง', 'CASH', 'เงินสด'].includes(job.paymentMethod)
    const needCash = isCash && !job.isPaid && job.status === 'DELIVERED'
    const isAdvancing = advancingJobId === (job.deliveryId ?? job.id)

    return (
        <article
            className={`delivery-card${isOpen ? ' expanded' : ''}`}
            style={{
                borderLeft: '5px solid #12852f',
                borderRadius: 14,
                boxShadow: '0 4px 14px rgba(0, 193, 74, 0.12)',
            }}
        >
            {/* Card Header */}
            <header onClick={onToggle} style={{ cursor: 'pointer' }}>
                <div>
                    <small style={{ color: '#12852f', fontWeight: 800 }}>DELIVERY · {job.provider}</small>
                    <h3 style={{ margin: '3px 0' }}>{job.orderNumber}</h3>
                    <span style={{ fontSize: 12, color: '#6d7b6e', fontWeight: 600 }}>
                        {job.customerName}{job.customerPhone ? <span style={{ marginLeft: 6 }}><i className="bi bi-telephone me-1"></i>{job.customerPhone}</span> : ''}
                    </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'end', gap: 6 }}>
                    <i className={`status ${DELIVERY_STATUS_CLASS[job.status] ?? ''}`}>{DELIVERY_STATUS_LABEL[job.status] ?? job.status}</i>
                    <span style={{ fontSize: 11, color: '#12852f', fontWeight: 700 }}>
                        {isOpen ? <><i className="bi bi-chevron-up me-1"></i>ซ่อน</> : <><i className="bi bi-chevron-down me-1"></i>ดูรายละเอียด & นำทาง</>}
                    </span>
                </div>
            </header>

            {/* Expandable detail */}
            {isOpen && (
                <>
                    {/* Address & Google Maps link */}
                    <div className="delivery-address" style={{ background: '#f6faf2', padding: 12, borderRadius: 8, border: '1px solid #d8e7d2' }}>
                        <span style={{ fontSize: 20, color: '#12852f' }}>
                            <i className="bi bi-geo-alt"></i>
                        </span>
                        <div style={{ flex: 1 }}>
                            <small style={{ color: '#6d7b6e' }}>{job.estimatedMinutes ? `ประมาณ ${job.estimatedMinutes} นาที` : 'ระยะทางทั่วไป'}</small>
                            <p style={{ margin: '4px 0 8px', fontWeight: 600, color: '#17351f' }}>{job.deliveryAddress || 'ไม่ได้ระบุที่อยู่'}</p>
                            {job.deliveryAddress && (
                                <a
                                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.deliveryAddress)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        fontSize: 12,
                                        fontWeight: 700,
                                        color: '#008a36',
                                        background: '#effbdc',
                                        padding: '6px 12px',
                                        borderRadius: 6,
                                        textDecoration: 'none',
                                        border: '1px solid #9fe51f',
                                    }}
                                >
                                    <i className="bi bi-geo-alt-fill" style={{ color: '#e11d48' }}></i> เปิดนำทางบน Google Maps <i className="bi bi-box-arrow-up-right ms-1"></i>
                                </a>
                            )}
                        </div>
                    </div>

                    {/* Items */}
                    {job.items.length > 0 && (
                        <ul className="staff-order-items">
                            {job.items.map(item => (
                                <li key={item.id ?? item.productName}>
                                    <span>{item.productName} <small>× {item.quantity}</small></span>
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
                </>
            )}

            {/* Action buttons */}
            <footer>
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

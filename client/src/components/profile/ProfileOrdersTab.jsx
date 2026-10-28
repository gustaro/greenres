import { useMemo, useState, useRef } from 'react'
import { useLanguage } from '../../lib/LanguageContext'
import { useAuth } from '../../lib/AuthContext'
import { attachOrderSlip } from '../../lib/database'
import { orderItemOptionLabel } from '../../lib/productOptions'
import { getShopBankAccounts, bankColor } from '../../lib/bankAccounts'

const statusTranslation = {
    'รอยืนยัน': 'Pending',
    'รอครัว': 'Queued',
    'กำลังทำ': 'Cooking',
    'รอไรเดอร์': 'Finding Rider',
    'พร้อมจัดส่ง': 'Ready',
    'กำลังจัดส่ง': 'Delivering',
    'ถึงปลายทาง': 'Arrived',
    'จัดส่งเสร็จสิ้น': 'Delivered',
    'ทำเสร็จแล้ว': 'Ready',
    'เสร็จสิ้น': 'Completed',
    'ยกเลิก': 'Cancelled',
}

export function ProfileOrdersTab({
    orders,
    setOrders,
    activityLoading,
    orderSteps,
    money,
    cancelOrder,
    cancellingOrderId,
    onOrderMore,
}) {
    const { isEn, t } = useLanguage()
    const { settings } = useAuth()
    const bankAccounts = getShopBankAccounts(settings)
    const [uploadingOrderId, setUploadingOrderId] = useState(null)
    const [copiedKey, setCopiedKey] = useState('')
    const [viewingSlipUrl, setViewingSlipUrl] = useState(null)
    const [viewingOrderNumber, setViewingOrderNumber] = useState('')
    const [expandedBankOrders, setExpandedBankOrders] = useState({})
    const fileInputRef = useRef(null)
    const targetOrderIdRef = useRef(null)

    const sortedOrders = useMemo(() => {
        return [...(orders || [])].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    }, [orders])

    const translateStep = (step) => isEn ? (statusTranslation[step] || step) : step

    const translateDeliveryType = (type) => {
        const map = {
            'ให้จัดส่ง': isEn ? 'Home Delivery' : 'ให้จัดส่ง',
            'ทานที่ร้าน': isEn ? 'Dine-In' : 'ทานที่ร้าน',
            'รับเองที่ร้าน': isEn ? 'Self Pickup' : 'รับเองที่ร้าน',
            'สั่งกลับบ้าน': isEn ? 'Takeaway' : 'สั่งกลับบ้าน',
        }
        return map[type] || type
    }

    const getPaymentIcon = (method = '') => {
        if (method.includes('บัตร')) return 'bi-credit-card'
        if (method.includes('พร้อมเพย์') || method.includes('QR') || method.includes('คิวอาร์')) return 'bi-qr-code'
        if (method.includes('โอน') || method.includes('สลิป')) return 'bi-wallet2'
        if (method.includes('ปลายทาง') || method.includes('เงินสด')) return 'bi-cash'
        return 'bi-receipt'
    }

    const copyToClipboard = (text, key) => {
        if (!text) return
        navigator.clipboard?.writeText?.(text).then(() => {
            setCopiedKey(key)
            setTimeout(() => setCopiedKey(''), 2000)
        }).catch(() => {})
    }

    const toggleBankBox = (orderId) => {
        setExpandedBankOrders(prev => ({
            ...prev,
            [orderId]: !prev[orderId]
        }))
    }

    const triggerUploadSlip = (orderId) => {
        targetOrderIdRef.current = orderId
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
            fileInputRef.current.click()
        }
    }

    const handleFileSelected = async (e) => {
        const file = e.target.files?.[0]
        const orderId = targetOrderIdRef.current
        if (!file || !orderId) return

        setUploadingOrderId(orderId)
        try {
            const updated = await attachOrderSlip(orderId, file)
            const slipUrl = updated.paymentProofUrl || updated.slipUrl || URL.createObjectURL(file)
            setOrders?.(prev => (prev || []).map(o => o.id === orderId ? {
                ...o,
                paymentProofUrl: slipUrl,
                slipUrl: slipUrl,
            } : o))
        } catch (err) {
            alert(isEn ? `Failed to upload slip: ${err.message}` : `ไม่สามารถแนบสลิปได้: ${err.message}`)
        } finally {
            setUploadingOrderId(null)
            targetOrderIdRef.current = null
        }
    }

    return (
        <>
            <div className="pf-content-head">
                <div>
                    <h2>{t('profileOrderHistoryTitle')}</h2>
                    <p>{t('profileOrderHistoryDesc')}</p>
                </div>
                <button onClick={onOrderMore}>{t('profileOrderMore')}</button>
            </div>

            {activityLoading && <p className="pf-muted">{t('profileLoadingOrders')}</p>}
            {!activityLoading && sortedOrders.length === 0 && <div className="pf-activity-empty">{t('noOrdersYet')}</div>}

            {/* Hidden file input for uploading slip */}
            <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleFileSelected}
                hidden
            />

            <div className="pf-order-list">
                {sortedOrders.map(order => {
                    const steps = orderSteps(order)
                    const currentStep = steps.indexOf(order.foodStatus)
                    const isCancelled = order.foodStatus === 'ยกเลิก' || order.status === 'CANCELLED' || order.serverStatus === 'CANCELLED'
                    // Completed orders are closed: the slip can no longer be attached or replaced.
                    const isCompleted = order.serverStatus === 'DELIVERED' || order.status === 'DELIVERED' || ['เสร็จสิ้น', 'จัดส่งเสร็จสิ้น'].includes(order.foodStatus)
                    const slipUrl = order.paymentProofUrl || order.slipUrl
                    const isBankTransfer = (order.paymentMethodDetail || order.paymentMethod || '').includes('โอน') ||
                                           (order.paymentMethodDetail || order.paymentMethod || '').includes('สลิป')
                    const isBankBoxOpen = expandedBankOrders[order.id] !== undefined
                        ? expandedBankOrders[order.id]
                        : (!order.isPaid || isBankTransfer || Boolean(slipUrl))

                    return (
                        <article key={order.id} className={isCancelled ? 'cancelled' : ''}>
                            <header>
                                <div>
                                    <small>{new Date(order.createdAt).toLocaleString(isEn ? 'en-US' : 'th-TH')}</small>
                                    <h3>{order.orderNumber || order.id}</h3>
                                </div>
                                <div>
                                    <i>{translateStep(isCancelled ? 'ยกเลิก' : order.foodStatus)}</i>
                                    <strong>{money(order.totalAmount)}</strong>
                                </div>
                            </header>

                            {/* Delivery & Promo Info */}
                            <p>
                                {translateDeliveryType(order.deliveryType)}
                                {order.deliveryScheduleType === 'ระบุเวลา' && order.scheduledAt ? ` · ${new Date(order.scheduledAt).toLocaleString(isEn ? 'en-US' : 'th-TH')}` : ''}
                                {order.promotionCode ? ` · ${t('profileCodeLabel')} ${order.promotionCode}` : ''}
                            </p>

                            {/* Payment Method & Status Bar */}
                            <div className="pf-payment-info-bar">
                                <span className="pf-payment-method-badge">
                                    <i className={`bi ${getPaymentIcon(order.paymentMethodDetail || order.paymentMethod)}`} />
                                    <span>{isEn ? 'Payment:' : 'วิธีชำระเงิน:'} <strong>{order.paymentMethodDetail || order.paymentMethod || (isEn ? 'Cash' : 'เงินสด')}</strong></span>
                                </span>
                                <span className={`pf-payment-status-badge ${order.isPaid ? 'paid' : (slipUrl ? 'slip-attached' : 'pending')}`}>
                                    {order.isPaid ? (
                                        <><i className="bi bi-check-circle-fill" /> {isEn ? 'Paid' : 'ชำระแล้ว'}</>
                                    ) : slipUrl ? (
                                        <><i className="bi bi-receipt" /> {isEn ? 'Slip Attached (Reviewing)' : 'แนบสลิปแล้ว (รอตรวจสอบ)'}</>
                                    ) : (
                                        <><i className="bi bi-hourglass-split" /> {isEn ? 'Pending Payment / Slip' : 'ยังไม่ชำระ / รอแนบสลิป'}</>
                                    )}
                                </span>
                            </div>

                            {/* Bank Details & Slip Attachment Section */}
                            {!isCancelled && (
                                <div className="pf-bank-box">
                                    <div className="pf-bank-box-header">
                                        <div className="pf-bank-title">
                                            <i className="bi bi-bank" />
                                            <span>{isEn ? 'Restaurant Bank & Transfer Slip' : 'เลขบัญชีธนาคารร้านและแนบสลิป'}</span>
                                        </div>
                                        <button
                                            type="button"
                                            className="pf-copy-btn"
                                            onClick={() => toggleBankBox(order.id)}
                                            style={{ border: 'none', background: 'transparent' }}
                                        >
                                            <i className={`bi ${isBankBoxOpen ? 'bi-chevron-up' : 'bi-chevron-down'}`} />
                                            {isBankBoxOpen ? (isEn ? 'Hide Details' : 'ซ่อนข้อมูล') : (isEn ? 'Show Details' : 'ดูรายละเอียด')}
                                        </button>
                                    </div>

                                    {isBankBoxOpen && (
                                        <>
                                            <div className="pf-bank-accounts">
                                                {bankAccounts.map(account => {
                                                    const copyKey = `acc-${order.id}-${account.id}`
                                                    return (
                                                        <div className="pf-bank-account" key={account.id} style={{ borderLeftColor: bankColor(account.bankName) }}>
                                                            <div style={{ minWidth: 0 }}>
                                                                <small style={{ color: bankColor(account.bankName), fontWeight: 700, display: 'block' }}>{account.bankName}</small>
                                                                <span className="pf-bank-acc-num">{account.accountNumber}</span>
                                                                <small style={{ color: '#475569', display: 'block' }}>{account.accountName}</small>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                className={`pf-copy-btn ${copiedKey === copyKey ? 'copied' : ''}`}
                                                                onClick={() => copyToClipboard(account.accountNumber, copyKey)}
                                                            >
                                                                <i className={`bi ${copiedKey === copyKey ? 'bi-check-lg' : 'bi-clipboard'}`} />
                                                                {copiedKey === copyKey ? (isEn ? 'Copied' : 'คัดลอกแล้ว') : (isEn ? 'Copy' : 'คัดลอก')}
                                                            </button>
                                                        </div>
                                                    )
                                                })}
                                            </div>

                                            <div className="pf-bank-grid">

                                                {settings?.promptpayNumber && (
                                                    <div>
                                                        <small style={{ color: '#64748b', display: 'block', marginBottom: '2px' }}>{isEn ? 'PromptPay' : 'พร้อมเพย์'}</small>
                                                        <div className="pf-bank-acc-row">
                                                            <strong style={{ color: '#0284c7' }}>{settings.promptpayNumber}</strong>
                                                            <button
                                                                type="button"
                                                                className={`pf-copy-btn ${copiedKey === `pp-${order.id}` ? 'copied' : ''}`}
                                                                onClick={() => copyToClipboard(settings.promptpayNumber, `pp-${order.id}`)}
                                                            >
                                                                <i className={`bi ${copiedKey === `pp-${order.id}` ? 'bi-check-lg' : 'bi-clipboard'}`} />
                                                                {copiedKey === `pp-${order.id}` ? (isEn ? 'Copied' : 'คัดลอกแล้ว') : (isEn ? 'Copy' : 'คัดลอก')}
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {settings?.promptpayQrUrl && (
                                                <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '12px', background: '#fff', padding: '8px 12px', borderRadius: '8px', border: '1px solid #dcfce7' }}>
                                                    <img
                                                        src={settings.promptpayQrUrl}
                                                        alt="PromptPay QR"
                                                        style={{ width: '60px', height: '60px', objectFit: 'contain', cursor: 'pointer' }}
                                                        onClick={() => {
                                                            setViewingSlipUrl(settings.promptpayQrUrl)
                                                            setViewingOrderNumber('QR Code ร้านค้า')
                                                        }}
                                                    />
                                                    <div style={{ fontSize: '0.82rem', color: '#475569' }}>
                                                        <div><strong style={{ color: '#0f172a' }}>{isEn ? 'Scan QR to Pay' : 'สแกน QR เพื่อโอนชำระ'}</strong></div>
                                                        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{isEn ? 'Click image to view full QR code' : 'คลิกรูปเพื่อดูภาพขยาย QR code'}</div>
                                                    </div>
                                                </div>
                                            )}

                                            {settings?.bankTransferNote && (
                                                <div style={{ marginTop: '8px', fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic' }}>
                                                    <i className="bi bi-info-circle me-1" />
                                                    {settings.bankTransferNote}
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {/* Slip Section */}
                                    <div className="pf-slip-section">
                                        {slipUrl ? (
                                            <div className="pf-slip-thumbnail-row">
                                                <img
                                                    src={slipUrl}
                                                    alt="Payment Slip"
                                                    className="pf-slip-thumb"
                                                    title={isEn ? 'Click to view full slip' : 'คลิกเพื่อดูรูปสลิปขยาย'}
                                                    onClick={() => {
                                                        setViewingSlipUrl(slipUrl)
                                                        setViewingOrderNumber(order.orderNumber || order.id)
                                                    }}
                                                />
                                                <div>
                                                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#15803d', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                        <i className="bi bi-patch-check-fill" /> {isEn ? 'Slip Attached' : 'แนบสลิปเรียบร้อยแล้ว'}
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setViewingSlipUrl(slipUrl)
                                                            setViewingOrderNumber(order.orderNumber || order.id)
                                                        }}
                                                        style={{ background: 'none', border: 'none', color: '#0284c7', fontSize: '0.8rem', cursor: 'pointer', padding: 0, textDecoration: 'underline', marginRight: '10px' }}
                                                    >
                                                        {isEn ? 'View Full Slip' : 'ดูรูปสลิปขยาย'}
                                                    </button>
                                                    {!isCompleted && (
                                                        <button
                                                            type="button"
                                                            disabled={uploadingOrderId === order.id}
                                                            onClick={() => triggerUploadSlip(order.id)}
                                                            style={{ background: 'none', border: 'none', color: 'var(--brand-primary, #12852f)', fontSize: '0.8rem', cursor: 'pointer', padding: 0, fontWeight: 600 }}
                                                        >
                                                            {uploadingOrderId === order.id ? (isEn ? 'Uploading...' : 'กำลังอัปโหลด...') : (isEn ? 'Change Slip' : 'เปลี่ยนสลิปใหม่')}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <div style={{ fontSize: '0.88rem', color: '#64748b' }}>
                                                <i className="bi bi-exclamation-circle me-1 text-warning" />
                                                {isEn ? 'No payment slip attached yet' : 'ยังไม่ได้แนบสลิปหลักฐานการโอนเงิน'}
                                            </div>
                                        )}

                                        <div>
                                            <button
                                                type="button"
                                                className={`pf-attach-slip-btn ${isCompleted ? 'is-closed' : ''}`}
                                                disabled={isCompleted || uploadingOrderId === order.id}
                                                onClick={() => { if (!isCompleted) triggerUploadSlip(order.id) }}
                                                title={isCompleted ? (isEn ? 'This order is completed' : 'ออเดอร์นี้เสร็จสิ้นแล้ว') : undefined}
                                            >
                                                {isCompleted ? (
                                                    <><i className="bi bi-lock-fill" /> {isEn ? 'Order completed — slip locked' : 'ออเดอร์เสร็จสิ้นแล้ว แนบสลิปไม่ได้'}</>
                                                ) : uploadingOrderId === order.id ? (
                                                    <><i className="bi bi-arrow-repeat spin" /> {isEn ? 'Uploading Slip...' : 'กำลังอัปโหลดสลิป...'}</>
                                                ) : slipUrl ? (
                                                    <><i className="bi bi-arrow-repeat" /> {isEn ? 'Upload New Slip' : 'อัปโหลดสลิปใหม่'}</>
                                                ) : (
                                                    <><i className="bi bi-cloud-arrow-up" /> {isEn ? 'Attach Payment Slip' : 'แนบสลิปการโอนเงิน'}</>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Order items list */}
                            <ul>
                                {order.items.map(item => (
                                    <li key={item.id}>
                                        <span>{item.productName} × {item.quantity}{orderItemOptionLabel(item) && <small className="staff-item-options">{orderItemOptionLabel(item)}</small>}</span>
                                        <b>{money(item.priceAtTime * item.quantity)}</b>
                                    </li>
                                ))}
                            </ul>

                            {isCancelled ? (
                                <div className="pf-cancelled"><i className="bi bi-x-circle-fill me-1" />{t('profileOrderCancelledNotice')}</div>
                            ) : (
                                <div className="pf-tracking">
                                    {steps.map((step, index) => (
                                        <div key={step} className={index <= currentStep ? 'done' : ''}>
                                            <span>{index < currentStep ? <i className="bi bi-check-lg" /> : index + 1}</span>
                                            <small>{translateStep(step)}</small>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {order.foodStatus === 'รอยืนยัน' && !order.isPaid && (
                                <button
                                    className="pf-cancel-order"
                                    disabled={cancellingOrderId === order.id}
                                    onClick={() => cancelOrder(order)}
                                >
                                    {cancellingOrderId === order.id ? (
                                        <><i className="bi bi-arrow-repeat spin me-1" />{isEn ? 'Cancelling...' : 'กำลังยกเลิก...'}</>
                                    ) : (
                                        t('profileCancelOrder')
                                    )}
                                </button>
                            )}
                        </article>
                    )
                })}
            </div>

            {/* Lightbox Modal for viewing payment slip */}
            {viewingSlipUrl && (
                <div className="pf-lightbox-overlay" onClick={() => setViewingSlipUrl(null)}>
                    <div className="pf-lightbox-card" onClick={e => e.stopPropagation()}>
                        <div className="pf-lightbox-head">
                            <h4>{isEn ? 'Payment Slip' : 'สลิปหลักฐานการชำระเงิน'} {viewingOrderNumber ? `(${viewingOrderNumber})` : ''}</h4>
                            <button
                                type="button"
                                className="pf-lightbox-close"
                                onClick={() => setViewingSlipUrl(null)}
                            >
                                <i className="bi bi-x-lg" />
                            </button>
                        </div>
                        <div className="pf-lightbox-img-wrap">
                            <img src={viewingSlipUrl} alt="Slip Full Preview" />
                        </div>
                        <div style={{ padding: '12px 18px', textAlign: 'right', background: '#fff', borderTop: '1px solid #e2e8f0' }}>
                            <a
                                href={viewingSlipUrl}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    fontSize: '0.85rem',
                                    color: 'var(--brand-primary, #12852f)',
                                    fontWeight: 700,
                                    textDecoration: 'none',
                                    marginRight: '12px'
                                }}
                            >
                                <i className="bi bi-box-arrow-up-right" /> {isEn ? 'Open Full Image' : 'เปิดดูรูปเต็ม'}
                            </a>
                            <button
                                type="button"
                                className="admin-button admin-secondary"
                                onClick={() => setViewingSlipUrl(null)}
                                style={{ padding: '6px 16px', fontSize: '0.85rem' }}
                            >
                                {isEn ? 'Close' : 'ปิด'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

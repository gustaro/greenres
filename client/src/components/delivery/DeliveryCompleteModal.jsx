import { useState, useRef, useEffect } from 'react'
import { money } from '../StaffShared'
import { PromptPayQR } from '../payment/PromptPayQR'

export function DeliveryCompleteModal({
    job,
    onClose,
    onConfirm,
    isSubmitting = false,
}) {
    const [deliveryProofFile, setDeliveryProofFile] = useState(null)
    const [deliveryProofPreview, setDeliveryProofPreview] = useState(job?.proofImageUrl || '')

    // Payment method mode: 'cash_transfer' (เงินสด/โอนตรง แนบรูป) | 'qr' (สแกน PromptPay QR ร้าน)
    const [paymentMode, setPaymentMode] = useState('cash_transfer')
    const [paymentProofFile, setPaymentProofFile] = useState(null)
    const [paymentProofPreview, setPaymentProofPreview] = useState(job?.paymentProofUrl || '')
    const [qrPaid, setQrPaid] = useState(false)
    const [stripePaymentId, setStripePaymentId] = useState(null)

    const deliveryInputRef = useRef(null)
    const paymentInputRef = useRef(null)

    const isPaid = job?.isPaid || qrPaid

    // Cleanup object URLs on unmount
    useEffect(() => {
        return () => {
            if (deliveryProofPreview && deliveryProofPreview.startsWith('blob:')) {
                URL.revokeObjectURL(deliveryProofPreview)
            }
            if (paymentProofPreview && paymentProofPreview.startsWith('blob:')) {
                URL.revokeObjectURL(paymentProofPreview)
            }
        }
    }, [deliveryProofPreview, paymentProofPreview])

    if (!job) return null

    const handleDeliveryFileChange = e => {
        const file = e.target.files?.[0]
        if (!file) return
        setDeliveryProofFile(file)
        const url = URL.createObjectURL(file)
        setDeliveryProofPreview(url)
    }

    const handleClearDeliveryProof = () => {
        setDeliveryProofFile(null)
        setDeliveryProofPreview('')
        if (deliveryInputRef.current) deliveryInputRef.current.value = ''
    }

    const handlePaymentFileChange = e => {
        const file = e.target.files?.[0]
        if (!file) return
        setPaymentProofFile(file)
        const url = URL.createObjectURL(file)
        setPaymentProofPreview(url)
    }

    const handleClearPaymentProof = () => {
        setPaymentProofFile(null)
        setPaymentProofPreview('')
        if (paymentInputRef.current) paymentInputRef.current.value = ''
    }

    const handleSubmit = async () => {
        if (!deliveryProofFile && !deliveryProofPreview) {
            window.alert('กรุณาอัปโหลดรูปภาพถ่ายตอนส่งของสำเร็จก่อนยืนยัน')
            return
        }

        await onConfirm({
            job,
            deliveryProofFile,
            deliveryProofUrl: deliveryProofPreview,
            paymentMode,
            paymentProofFile,
            paymentProofUrl: paymentProofPreview,
            isQrPaid: qrPaid,
            stripePaymentId,
        })
    }

    const hasProof = Boolean(deliveryProofFile || deliveryProofPreview)

    return (
        <div className="receipt-overlay" style={{ zIndex: 999 }} onMouseDown={onClose}>
            <article
                className="delivery-complete-modal"
                onMouseDown={e => e.stopPropagation()}
                style={{
                    background: '#ffffff',
                    borderRadius: 20,
                    maxWidth: 480,
                    width: '94%',
                    maxHeight: '90vh',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    boxShadow: '0 20px 50px rgba(0, 50, 15, 0.25)',
                    border: '1px solid #d4e8ce',
                    animation: 'scaleUp 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
            >
                {/* Modal Header */}
                <header
                    style={{
                        padding: '16px 20px',
                        background: 'linear-gradient(135deg, var(--brand-primary, #12852f) 0%, var(--brand-primary-dark, #085d1d) 100%)',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}
                >
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span
                                style={{
                                    background: 'var(--brand-accent, #b8ff35)',
                                    color: 'var(--brand-primary-dark, #075c1b)',
                                    padding: '2px 8px',
                                    borderRadius: 6,
                                    fontSize: 11,
                                    fontWeight: 800,
                                }}
                            >
                                RIDER HUB
                            </span>
                            <b style={{ fontSize: 16 }}>ยืนยันการส่งมอบสินค้า</b>
                        </div>
                        <small style={{ opacity: 0.85, fontSize: 12, display: 'block', marginTop: 3 }}>
                            ออเดอร์ <b>{job.orderNumber}</b> · {job.customerName || 'ลูกค้า'}
                        </small>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={isSubmitting}
                        style={{
                            background: 'rgba(255, 255, 255, 0.15)',
                            border: 'none',
                            color: '#ffffff',
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                        }}
                    >
                        <i className="bi bi-x-lg" />
                    </button>
                </header>

                {/* Modal Scrollable Body */}
                <div
                    style={{
                        padding: '18px 20px',
                        overflowY: 'auto',
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 16,
                    }}
                >
                    {/* Amount & Destination Card */}
                    <div
                        style={{
                            background: '#f6faf2',
                            border: '1px solid #d8e7d2',
                            borderRadius: 12,
                            padding: '12px 16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                        }}
                    >
                        <div>
                            <small style={{ color: '#556958', fontSize: 12, display: 'block' }}>
                                ยอดที่ต้องเรียกเก็บจากลูกค้า
                            </small>
                            <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--brand-primary, #12852f)', lineHeight: 1.1 }}>
                                {money(job.totalAmount)}
                            </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <span
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 5,
                                    fontSize: 12,
                                    fontWeight: 700,
                                    padding: '4px 10px',
                                    borderRadius: 20,
                                    background: isPaid ? '#dcfce7' : '#fef3c7',
                                    color: isPaid ? '#15803d' : '#b45309',
                                    border: `1px solid ${isPaid ? '#86efac' : '#fde68a'}`,
                                }}
                            >
                                <i className={`bi ${isPaid ? 'bi-check-circle-fill' : 'bi-clock-history'}`} />
                                {isPaid ? 'ชำระเงินแล้ว' : 'รอชำระเงิน'}
                            </span>
                        </div>
                    </div>

                    {/* SECTION 1: ภาพถ่ายตอนส่งของสำเร็จ (MANDATORY with red asterisk) */}
                    <div
                        style={{
                            background: '#ffffff',
                            borderRadius: 14,
                            border: hasProof ? '2px solid #22c55e' : '2px dashed #f87171',
                            padding: 14,
                            transition: 'all 0.2s',
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <label style={{ fontSize: 14, fontWeight: 800, color: '#1f2937', display: 'flex', alignItems: 'center' }}>
                                <i className="bi bi-camera-fill text-success me-2" />
                                ภาพถ่ายตอนส่งของสำเร็จ
                                <span style={{ color: '#ef4444', fontSize: 16, fontWeight: 900, marginLeft: 4 }}>*</span>
                            </label>
                            {hasProof && (
                                <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 700, background: '#dcfce7', padding: '2px 8px', borderRadius: 12 }}>
                                    <i className="bi bi-check2 me-1" />พร้อมส่ง
                                </span>
                            )}
                        </div>
                        <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 10px' }}>
                            ถ่ายรูปพัสดุ/อาหารที่ส่งมอบให้กับลูกค้าเรียบร้อยแล้ว <b style={{ color: '#ef4444' }}>(จำเป็นต้องมีรูปก่อนยืนยัน)</b>
                        </p>

                        <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            ref={deliveryInputRef}
                            style={{ display: 'none' }}
                            onChange={handleDeliveryFileChange}
                        />

                        {deliveryProofPreview ? (
                            <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: '1px solid #86efac' }}>
                                <img
                                    src={deliveryProofPreview}
                                    alt="ภาพส่งของสำเร็จ"
                                    style={{ width: '100%', height: 180, objectFit: 'cover', display: 'block' }}
                                />
                                <div
                                    style={{
                                        position: 'absolute',
                                        top: 8,
                                        right: 8,
                                        display: 'flex',
                                        gap: 6,
                                    }}
                                >
                                    <button
                                        type="button"
                                        onClick={() => deliveryInputRef.current?.click()}
                                        style={{
                                            background: 'rgba(0,0,0,0.7)',
                                            color: '#fff',
                                            border: 'none',
                                            borderRadius: 6,
                                            padding: '4px 10px',
                                            fontSize: 12,
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                        }}
                                    >
                                        <i className="bi bi-arrow-repeat me-1" />เปลี่ยน
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleClearDeliveryProof}
                                        style={{
                                            background: '#ef4444',
                                            color: '#fff',
                                            border: 'none',
                                            borderRadius: 6,
                                            padding: '4px 8px',
                                            fontSize: 12,
                                            cursor: 'pointer',
                                        }}
                                    >
                                        <i className="bi bi-trash-fill" />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => deliveryInputRef.current?.click()}
                                style={{
                                    width: '100%',
                                    padding: '24px 16px',
                                    border: '2px dashed #93c5fd',
                                    borderRadius: 10,
                                    background: '#f8fafc',
                                    cursor: 'pointer',
                                    textAlign: 'center',
                                    transition: 'background 0.2s',
                                }}
                            >
                                <div
                                    style={{
                                        width: 50,
                                        height: 50,
                                        borderRadius: '50%',
                                        background: '#eff6ff',
                                        color: '#2563eb',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        margin: '0 auto 10px',
                                        fontSize: 24,
                                    }}
                                >
                                    <i className="bi bi-camera" />
                                </div>
                                <strong style={{ fontSize: 14, color: '#1e40af', display: 'block' }}>
                                    กดที่นี่เพื่อถ่ายรูป หรือเลือกรูปภาพ
                                </strong>
                                <small style={{ color: '#64748b', fontSize: 12 }}>
                                    รองรับกล้องมือถือและไฟล์ JPG, PNG
                                </small>
                            </button>
                        )}

                        {!hasProof && (
                            <div style={{ color: '#ef4444', fontSize: 12, marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                                <i className="bi bi-exclamation-triangle-fill" />
                                ต้องใส่รูปถ่ายตอนส่งของสำเร็จก่อน จึงจะสามารถกดยืนยันได้
                            </div>
                        )}
                    </div>

                    {/* SECTION 2: PAYMENT HANDLING (If not yet paid) */}
                    {!isPaid ? (
                        <div
                            style={{
                                background: '#fdfbf7',
                                border: '1px solid #fed7aa',
                                borderRadius: 14,
                                padding: 14,
                            }}
                        >
                            <label style={{ fontSize: 14, fontWeight: 800, color: '#9a3412', display: 'flex', alignItems: 'center', marginBottom: 10 }}>
                                <i className="bi bi-cash-coin me-2" />
                                วิธีการรับชำระเงินจากลูกค้า
                            </label>

                            {/* Payment Mode Pills */}
                            <div
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr',
                                    gap: 8,
                                    marginBottom: 12,
                                }}
                            >
                                <button
                                    type="button"
                                    onClick={() => setPaymentMode('cash_transfer')}
                                    style={{
                                        padding: '10px 8px',
                                        borderRadius: 8,
                                        border: paymentMode === 'cash_transfer' ? '2px solid var(--brand-primary, #12852f)' : '1px solid #d1d5db',
                                        background: paymentMode === 'cash_transfer' ? 'var(--brand-accent-soft, #effbdc)' : '#ffffff',
                                        color: paymentMode === 'cash_transfer' ? 'var(--brand-primary-dark, #075c1b)' : '#374151',
                                        fontWeight: 700,
                                        fontSize: 12,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: 4,
                                    }}
                                >
                                    <i className="bi bi-wallet2" style={{ fontSize: 16 }} />
                                    <span>เงินสด / โอนตรง</span>
                                    <small style={{ fontSize: 10, opacity: 0.8, fontWeight: 500 }}>แนบรูปเงิน/สลิป</small>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setPaymentMode('qr')}
                                    style={{
                                        padding: '10px 8px',
                                        borderRadius: 8,
                                        border: paymentMode === 'qr' ? '2px solid #1a56be' : '1px solid #d1d5db',
                                        background: paymentMode === 'qr' ? '#eff6ff' : '#ffffff',
                                        color: paymentMode === 'qr' ? '#1e40af' : '#374151',
                                        fontWeight: 700,
                                        fontSize: 12,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: 4,
                                    }}
                                >
                                    <i className="bi bi-qr-code-scan" style={{ fontSize: 16 }} />
                                    <span>QR ของร้าน (Stripe)</span>
                                    <small style={{ fontSize: 10, opacity: 0.8, fontWeight: 500 }}>ระบบออโต้ตามตะกร้า</small>
                                </button>
                            </div>

                            {/* Mode A: Cash / Direct Transfer (Single shared upload field for cash or slip) */}
                            {paymentMode === 'cash_transfer' && (
                                <div style={{ background: '#ffffff', borderRadius: 10, padding: 12, border: '1px solid #e5e7eb' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                        <span style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>
                                            <i className="bi bi-receipt me-1" />
                                            หลักฐานการชำระเงิน (ภาพถ่ายเงินสด หรือ สลิปเงินโอน)
                                        </span>
                                    </div>
                                    <small style={{ color: '#6b7280', fontSize: 11, display: 'block', marginBottom: 8 }}>
                                        กรณีเงินสด: ถ่ายรูปเงินที่ลูกค้าจ่าย / กรณีโอนตรง: อัปโหลดสลิปของลูกค้า
                                    </small>

                                    <input
                                        type="file"
                                        accept="image/*"
                                        capture="environment"
                                        ref={paymentInputRef}
                                        style={{ display: 'none' }}
                                        onChange={handlePaymentFileChange}
                                    />

                                    {paymentProofPreview ? (
                                        <div style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', border: '1px solid #d1d5db' }}>
                                            <img
                                                src={paymentProofPreview}
                                                alt="หลักฐานชำระเงิน"
                                                style={{ width: '100%', height: 140, objectFit: 'cover', display: 'block' }}
                                            />
                                            <div style={{ position: 'absolute', top: 6, right: 6, display: 'flex', gap: 6 }}>
                                                <button
                                                    type="button"
                                                    onClick={() => paymentInputRef.current?.click()}
                                                    style={{ background: 'rgba(0,0,0,0.7)', color: '#fff', border: 'none', borderRadius: 4, padding: '3px 8px', fontSize: 11, cursor: 'pointer' }}
                                                >
                                                    เปลี่ยน
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={handleClearPaymentProof}
                                                    style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: 4, padding: '3px 6px', fontSize: 11, cursor: 'pointer' }}
                                                >
                                                    <i className="bi bi-trash-fill" />
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => paymentInputRef.current?.click()}
                                            style={{
                                                width: '100%',
                                                padding: '14px',
                                                border: '1px dashed #9ca3af',
                                                borderRadius: 8,
                                                background: '#f9fafb',
                                                cursor: 'pointer',
                                                textAlign: 'center',
                                                fontSize: 13,
                                                color: '#4b5563',
                                                fontWeight: 600,
                                            }}
                                        >
                                            <i className="bi bi-camera me-1" /> กดเพื่อถ่ายรูปเงินสด หรืออัปโหลดสลิป
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Mode B: Automatic PromptPay QR (Stripe) */}
                            {paymentMode === 'qr' && (
                                <div style={{ background: '#ffffff', borderRadius: 10, padding: 12, border: '1px solid #bfdbfe' }}>
                                    <div style={{ marginBottom: 6, fontSize: 12, color: '#1e40af', fontWeight: 600 }}>
                                        <i className="bi bi-info-circle-fill me-1" />
                                        ให้ลูกค้าใช้แอปธนาคารสแกน PromptPay QR นี้เพื่อชำระเงิน
                                    </div>
                                    <PromptPayQR
                                        total={job.totalAmount}
                                        reference={job.orderNumber}
                                        compact={true}
                                        isPaid={qrPaid}
                                        onSimulateSuccess={res => {
                                            setQrPaid(true)
                                            if (res?.paymentIntentId) setStripePaymentId(res.paymentIntentId)
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                    ) : (
                        /* Already Paid Notice */
                        <div
                            style={{
                                background: '#ecfdf5',
                                border: '1px solid #a7f3d0',
                                borderRadius: 12,
                                padding: '12px 14px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                                color: '#065f46',
                            }}
                        >
                            <i className="bi bi-patch-check-fill" style={{ fontSize: 24, color: '#10b981' }} />
                            <div>
                                <strong style={{ fontSize: 13, display: 'block' }}>ออเดอร์นี้ชำระเงินแล้วเรียบร้อย</strong>
                                <small style={{ fontSize: 11, opacity: 0.85 }}>ไม่ต้องเก็บเงินสดหรือให้ลูกค้าโอนเพิ่ม</small>
                            </div>
                        </div>
                    )}
                </div>

                {/* Modal Footer Actions */}
                <footer
                    style={{
                        padding: '14px 20px',
                        background: '#f8faf7',
                        borderTop: '1px solid #e5ebe3',
                        display: 'flex',
                        gap: 10,
                        alignItems: 'center',
                    }}
                >
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        style={{
                            flex: 1,
                            padding: '12px 16px',
                            borderRadius: 10,
                            border: '1px solid #d1d5db',
                            background: '#ffffff',
                            color: '#4b5563',
                            fontWeight: 700,
                            cursor: 'pointer',
                        }}
                    >
                        ยกเลิก
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={!hasProof || isSubmitting}
                        className="staff-primary"
                        style={{
                            flex: 2,
                            padding: '12px 18px',
                            borderRadius: 10,
                            fontWeight: 800,
                            fontSize: 14,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                            opacity: !hasProof || isSubmitting ? 0.6 : 1,
                            cursor: !hasProof || isSubmitting ? 'not-allowed' : 'pointer',
                        }}
                    >
                        {isSubmitting ? (
                            <><i className="bi bi-arrow-repeat spin" /> กำลังบันทึกข้อมูล...</>
                        ) : (
                            <><i className="bi bi-check-circle-fill" /> ยืนยันการส่งสินค้า</>
                        )}
                    </button>
                </footer>
            </article>
        </div>
    )
}

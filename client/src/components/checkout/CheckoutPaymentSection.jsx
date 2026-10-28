import { useState } from 'react'
import { useLanguage } from '../../lib/LanguageContext'
import { useAuth } from '../../lib/AuthContext'
import { PromptPayQR } from '../payment/PromptPayQR'
import { CreditCardForm } from '../payment/CreditCardForm'
import { getShopBankAccounts, bankColor } from '../../lib/bankAccounts'

export function CheckoutPaymentSection({
    promotionCode,
    setPromotionCode,
    applyPromotion,
    checkingPromotion,
    promotionError,
    appliedPromotion,
    deliveryType,
    paymentMethod,
    setPaymentMethod,
    onClose,
    isFormValid,
    orderTotal = 0,
    cardData = {},
    setCardData,
    recipientName = '',
    isQrPaid = false,
    setIsQrPaid,
    qrData,
    setQrData,
    slipFile,
    setSlipFile,
    slipPreview,
    setSlipPreview,
    isSubmitting = false,
}) {
    const { isEn, t } = useLanguage()
    const { settings } = useAuth()
    const bankAccounts = getShopBankAccounts(settings)
    const [copiedField, setCopiedField] = useState('')

    const copyToClipboard = (text, fieldName) => {
        if (!text) return
        navigator.clipboard?.writeText?.(text).then(() => {
            setCopiedField(fieldName)
            setTimeout(() => setCopiedField(''), 2000)
        }).catch(() => {})
    }

    const handleSlipChange = e => {
        const file = e.target.files?.[0]
        if (!file) return
        setSlipFile?.(file)
        const objectUrl = URL.createObjectURL(file)
        setSlipPreview?.(objectUrl)
    }

    const handleRemoveSlip = () => {
        setSlipFile?.(null)
        setSlipPreview?.(null)
    }

    return (
        <>
            {/* Promo Code */}
            <div className="chk-card">
                <h3 className="chk-title">{t('checkoutPromoTitle')}</h3>
                <div className="chk-promo-row">
                    <div className="chk-input-wrap" style={{ flex: 1 }}>
                        <input
                            value={promotionCode}
                            onChange={e => setPromotionCode(e.target.value.toUpperCase())}
                            placeholder={t('checkoutPromoPlaceholder')}
                        />
                    </div>
                    <button
                        type="button"
                        onClick={applyPromotion}
                        disabled={!promotionCode || checkingPromotion}
                        className="primary"
                        style={{ padding: '0 24px', borderRadius: 4 }}
                    >
                        {checkingPromotion ? '...' : t('checkoutPromoRedeem')}
                    </button>
                </div>
                {promotionError && <p style={{ color: 'var(--brand-primary)', margin: '8px 0 0', fontSize: 13, fontWeight: 600 }}>{promotionError}</p>}
                {appliedPromotion && <p style={{ color: 'var(--brand-primary)', margin: '8px 0 0', fontSize: 13, fontWeight: 600 }}><i className="bi bi-tag-fill me-1" />{t('checkoutDiscountReceived')} ฿{appliedPromotion.discount}</p>}
            </div>

            {/* Payment Method */}
            <div className="chk-card">
                <h3 className="chk-title">{t('checkoutPaymentTitle')}</h3>
                <div className="chk-payment-list">
                    {deliveryType === 'ให้จัดส่ง' && (
                        <label className={`chk-payment-box ${paymentMethod === 'ชำระเงินปลายทาง' ? 'active' : ''}`}>
                            <input
                                type="radio"
                                value="ชำระเงินปลายทาง"
                                checked={paymentMethod === 'ชำระเงินปลายทาง'}
                                onChange={e => setPaymentMethod(e.target.value)}
                            />
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span>{isEn ? 'Cash on Delivery' : 'ชำระเงินปลายทาง'}</span>
                                <small style={{ fontSize: 10, color: '#666' }}>{isEn ? 'Pay rider upon delivery' : 'ชำระเงินสดกับไรเดอร์เมื่อรับอาหาร'}</small>
                            </div>
                            <i className="bi bi-cash chk-payment-icon"></i>
                        </label>
                    )}
                    {(deliveryType === 'ให้จัดส่ง' || deliveryType === 'รับเองที่ร้าน') && (
                        <>
                            {/* PromptPay QR Option */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <label className={`chk-payment-box ${paymentMethod === 'พร้อมเพย์' ? 'active' : ''}`} style={{ borderColor: paymentMethod === 'พร้อมเพย์' ? '#1a56be' : '', background: paymentMethod === 'พร้อมเพย์' ? '#f0f5ff' : '' }}>
                                    <input
                                        type="radio"
                                        value="พร้อมเพย์"
                                        checked={paymentMethod === 'พร้อมเพย์'}
                                        onChange={e => setPaymentMethod(e.target.value)}
                                    />
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontWeight: 700, color: paymentMethod === 'พร้อมเพย์' ? '#1a56be' : 'inherit' }}>
                                            PromptPay QR (พร้อมเพย์)
                                        </span>
                                        <small style={{ fontSize: 11, color: '#4b5563' }}>
                                            {isEn ? 'Scan with any mobile banking app (Free fee)' : 'สแกนจ่ายผ่านแอปธนาคาร ไม่มีค่าธรรมเนียม'}
                                        </small>
                                    </div>
                                    <i className="bi bi-qr-code chk-payment-icon" style={{ color: '#1a56be' }}></i>
                                </label>
                                {paymentMethod === 'พร้อมเพย์' && (
                                    <div style={{ padding: '4px 0 10px', animation: 'fadeIn 0.2s ease-in-out' }}>
                                        <PromptPayQR
                                            total={orderTotal}
                                            onSimulateSuccess={(data) => {
                                                setIsQrPaid?.(true)
                                                setQrData?.(data)
                                            }}
                                            isPaid={isQrPaid}
                                        />
                                        {isQrPaid && (
                                            <div style={{
                                                marginTop: 8,
                                                background: '#ecfdf5',
                                                border: '1.5px solid #a7f3d0',
                                                borderRadius: 12,
                                                padding: '10px 14px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 10,
                                                color: '#065f46',
                                                fontSize: 13,
                                                fontWeight: 700,
                                                animation: 'fadeIn 0.2s ease-in-out',
                                            }}>
                                                <i className="bi bi-patch-check-fill" style={{ fontSize: 20, color: '#059669' }} />
                                                <div style={{ flex: 1 }}>
                                                    <div>ระบบจำลองการชำระเงินผ่าน QR สำเร็จแล้ว</div>
                                                    <div style={{ fontSize: 11, fontWeight: 500, color: '#047857' }}>
                                                        {isEn ? 'You can proceed to confirm your order now.' : 'สามารถกดปุ่ม "ยืนยันการสั่งซื้อ" ด้านล่างเพื่อส่งออเดอร์เข้าครัวได้ทันที'}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Credit / Debit Card Option */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <label className={`chk-payment-box ${paymentMethod === 'บัตรเครดิต/เดบิต' ? 'active' : ''}`} style={{ borderColor: paymentMethod === 'บัตรเครดิต/เดบิต' ? 'var(--brand-primary, #12852f)' : '', background: paymentMethod === 'บัตรเครดิต/เดบิต' ? '#f4fbf4' : '' }}>
                                    <input
                                        type="radio"
                                        value="บัตรเครดิต/เดบิต"
                                        checked={paymentMethod === 'บัตรเครดิต/เดบิต'}
                                        onChange={e => setPaymentMethod(e.target.value)}
                                    />
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontWeight: 700, color: paymentMethod === 'บัตรเครดิต/เดบิต' ? 'var(--brand-primary-dark, #075c1b)' : 'inherit' }}>
                                            Credit / Debit Card (บัตรเครดิต/เดบิต)
                                        </span>
                                        <small style={{ fontSize: 11, color: '#4b5563' }}>
                                            {isEn ? 'Visa, Mastercard, JCB (Secure 256-Bit SSL)' : 'Visa, Mastercard, JCB ปลอดภัยมาตรฐานสากล'}
                                        </small>
                                    </div>
                                    <i className="bi bi-credit-card chk-payment-icon" style={{ color: 'var(--brand-primary, #12852f)' }}></i>
                                </label>
                                {paymentMethod === 'บัตรเครดิต/เดบิต' && (
                                    <div style={{ padding: '4px 0 10px', animation: 'fadeIn 0.2s ease-in-out' }}>
                                        <CreditCardForm
                                            value={cardData}
                                            onChange={setCardData}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Bank Transfer Slip Option */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <label className={`chk-payment-box ${paymentMethod === 'โอนเงินผ่านระบบ / พร้อมเพย์' ? 'active' : ''}`} style={{ borderColor: paymentMethod === 'โอนเงินผ่านระบบ / พร้อมเพย์' ? 'var(--brand-primary, #12852f)' : '', background: paymentMethod === 'โอนเงินผ่านระบบ / พร้อมเพย์' ? 'rgba(18, 133, 47, 0.04)' : '' }}>
                                    <input
                                        type="radio"
                                        value="โอนเงินผ่านระบบ / พร้อมเพย์"
                                        checked={paymentMethod === 'โอนเงินผ่านระบบ / พร้อมเพย์'}
                                        onChange={e => setPaymentMethod(e.target.value)}
                                    />
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontWeight: 700, color: paymentMethod === 'โอนเงินผ่านระบบ / พร้อมเพย์' ? 'var(--brand-primary-dark, #075c1b)' : 'inherit' }}>
                                            {isEn ? 'Bank Transfer / Attach Slip' : 'โอนเงินผ่านบัญชีธนาคาร / แนบสลิป'}
                                        </span>
                                        <small style={{ fontSize: 11, color: '#4b5563' }}>
                                            {isEn ? 'Transfer to restaurant bank account and attach receipt' : 'โอนเงินเข้าบัญชีร้านค้า และสามารถแนบสลิปได้ทันที'}
                                        </small>
                                    </div>
                                    <i className="bi bi-wallet2 chk-payment-icon" style={{ color: 'var(--brand-primary, #12852f)' }}></i>
                                </label>

                                {paymentMethod === 'โอนเงินผ่านระบบ / พร้อมเพย์' && (
                                    <div style={{
                                        padding: '16px',
                                        background: '#fff',
                                        border: '1.5px solid #bbf7d0',
                                        borderRadius: '12px',
                                        marginTop: 4,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '14px',
                                        animation: 'fadeIn 0.2s ease-in-out',
                                    }}>
                                        {/* Bank details card */}
                                        <div style={{
                                            background: '#f8fafc',
                                            border: '1px solid #e2e8f0',
                                            borderRadius: '10px',
                                            padding: '14px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '10px',
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: 'var(--brand-primary-dark, #0c4d1d)', fontSize: '0.95rem' }}>
                                                <i className="bi bi-bank" style={{ color: 'var(--brand-primary, #12852f)' }} />
                                                <span>{isEn ? 'Transfer to any shop account' : 'โอนเข้าบัญชีร้านบัญชีใดก็ได้'}</span>
                                            </div>

                                            {bankAccounts.map(account => {
                                                const copyKey = `acc-${account.id}`
                                                return (
                                                    <div key={account.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderLeft: `4px solid ${bankColor(account.bankName)}`, borderRadius: '8px', padding: '10px 12px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                                                        <div style={{ minWidth: 0 }}>
                                                            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: bankColor(account.bankName) }}>{account.bankName}</div>
                                                            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', letterSpacing: '0.5px' }}>{account.accountNumber}</div>
                                                            <div style={{ fontSize: '0.8rem', color: '#475569' }}>{account.accountName}</div>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => copyToClipboard(account.accountNumber, copyKey)}
                                                            style={{
                                                                padding: '6px 12px',
                                                                borderRadius: '6px',
                                                                fontSize: '0.8rem',
                                                                fontWeight: 600,
                                                                background: copiedField === copyKey ? '#22c55e' : '#f1f5f9',
                                                                color: copiedField === copyKey ? '#fff' : '#334155',
                                                                border: '1px solid #cbd5e1',
                                                                cursor: 'pointer',
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '4px',
                                                            }}
                                                        >
                                                            <i className={`bi ${copiedField === copyKey ? 'bi-check-lg' : 'bi-clipboard'}`} />
                                                            {copiedField === copyKey ? (isEn ? 'Copied!' : 'คัดลอกแล้ว') : (isEn ? 'Copy' : 'คัดลอก')}
                                                        </button>
                                                    </div>
                                                )
                                            })}

                                            {settings?.promptpayNumber && (
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '6px', borderTop: '1px dashed #e2e8f0' }}>
                                                    <div>
                                                        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>พร้อมเพย์ (PromptPay)</div>
                                                        <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0284c7' }}>
                                                            {settings.promptpayNumber}
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => copyToClipboard(settings.promptpayNumber, 'pp')}
                                                        style={{
                                                            padding: '4px 10px',
                                                            borderRadius: '6px',
                                                            fontSize: '0.78rem',
                                                            fontWeight: 600,
                                                            background: copiedField === 'pp' ? '#22c55e' : '#f1f5f9',
                                                            color: copiedField === 'pp' ? '#fff' : '#334155',
                                                            border: '1px solid #cbd5e1',
                                                            cursor: 'pointer',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '4px',
                                                        }}
                                                    >
                                                        <i className={`bi ${copiedField === 'pp' ? 'bi-check-lg' : 'bi-clipboard'}`} />
                                                        {copiedField === 'pp' ? (isEn ? 'Copied!' : 'คัดลอกแล้ว') : (isEn ? 'Copy' : 'คัดลอก')}
                                                    </button>
                                                </div>
                                            )}

                                            {settings?.promptpayQrUrl && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#fff', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                                    <img src={settings.promptpayQrUrl} alt="QR Code" style={{ width: '80px', height: '80px', objectFit: 'contain' }} />
                                                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                                        <strong style={{ color: '#0f172a', display: 'block' }}>สแกน QR เพื่อโอนเงิน</strong>
                                                        ยอดที่ต้องชำระ: <strong style={{ color: 'var(--brand-primary, #12852f)' }}>฿{orderTotal.toLocaleString()}</strong>
                                                    </div>
                                                </div>
                                            )}

                                            <div style={{ fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic' }}>
                                                <i className="bi bi-info-circle me-1" />
                                                {settings?.bankTransferNote || 'เมื่อโอนเงินเรียบร้อยแล้ว กรุณาแนบสลิปหลักฐานการโอนเงินเพื่อความรวดเร็วในการจัดเตรียมอาหาร'}
                                            </div>
                                        </div>

                                        {/* Slip Upload Section */}
                                        <div style={{
                                            border: '1.5px dashed #12852f',
                                            borderRadius: '10px',
                                            padding: '14px',
                                            background: '#fcfdfc',
                                            textAlign: 'center',
                                        }}>
                                            {slipPreview ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', textAlign: 'left' }}>
                                                    <img
                                                        src={slipPreview}
                                                        alt="Slip Preview"
                                                        style={{ width: '70px', height: '70px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #bbf7d0' }}
                                                    />
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ color: '#15803d', fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                            <i className="bi bi-check-circle-fill" /> แนบสลิปเรียบร้อยแล้ว
                                                        </div>
                                                        <small style={{ color: '#64748b', fontSize: '0.78rem' }}>
                                                            {slipFile?.name || 'สลิปการโอนเงิน'}
                                                        </small>
                                                        <div style={{ marginTop: '6px', display: 'flex', gap: '8px' }}>
                                                            <label htmlFor="chkSlipFile" style={{ cursor: 'pointer', fontSize: '0.78rem', color: 'var(--brand-primary, #12852f)', fontWeight: 600 }}>
                                                                เปลี่ยนรูปสลิป
                                                            </label>
                                                            <button
                                                                type="button"
                                                                onClick={handleRemoveSlip}
                                                                style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.78rem', cursor: 'pointer', padding: 0 }}
                                                            >
                                                                ลบ
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div>
                                                    <i className="bi bi-receipt" style={{ fontSize: '1.8rem', color: 'var(--brand-primary, #12852f)', display: 'block', marginBottom: '4px' }} />
                                                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1e293b' }}>
                                                        แนบหลักฐานการโอนเงิน (สลิป)
                                                    </div>
                                                    <p style={{ margin: '4px 0 10px', fontSize: '0.8rem', color: '#64748b' }}>
                                                        แนบสลิปทันที หรือสามารถข้ามไปกดสั่งซื้อก่อน แล้วแนบสลิปในหน้าประวัติคำสั่งซื้อได้
                                                    </p>
                                                    <label
                                                        htmlFor="chkSlipFile"
                                                        className="primary"
                                                        style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '6px',
                                                            padding: '7px 18px',
                                                            borderRadius: '6px',
                                                            fontSize: '0.85rem',
                                                            cursor: 'pointer',
                                                            fontWeight: 600,
                                                        }}
                                                    >
                                                        <i className="bi bi-cloud-arrow-up" /> เลือกรูปภาพสลิป
                                                    </label>
                                                </div>
                                            )}
                                            <input
                                                type="file"
                                                id="chkSlipFile"
                                                accept="image/*"
                                                onChange={handleSlipChange}
                                                hidden
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                    {deliveryType === 'ทานที่ร้าน' && (
                        <label className="chk-payment-box active">
                            <input type="radio" checked readOnly />
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span>{isEn ? 'Pay at Counter / Dine-In' : 'ชำระเงินที่ร้าน (Pay at Store)'}</span>
                                <small style={{ fontSize: 10, color: '#666' }}>{isEn ? 'Cash or card at the cashier' : 'ชำระเงินสดหรือบัตรที่เคาน์เตอร์'}</small>
                            </div>
                            <i className="bi bi-shop chk-payment-icon"></i>
                        </label>
                    )}
                </div>

                <div className="chk-actions" style={{ marginTop: 30 }}>
                    <button
                        type="button"
                        className="secondary"
                        onClick={onClose}
                        disabled={isSubmitting}
                        style={{ borderRadius: 4, padding: '14px 24px', fontSize: 14 }}
                    >
                        {isEn ? 'BACK TO CART' : 'ย้อนกลับไปตะกร้า'}
                    </button>
                    <button
                        type="submit"
                        className="primary"
                        disabled={!isFormValid || isSubmitting}
                        style={{
                            borderRadius: 4,
                            padding: '14px 40px',
                            fontSize: 14,
                            opacity: isFormValid && !isSubmitting ? 1 : 0.5,
                            cursor: isFormValid && !isSubmitting ? 'pointer' : 'not-allowed',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 8,
                        }}
                    >
                        {isSubmitting ? (
                            <>
                                <i className="bi bi-arrow-repeat spin" />
                                {isEn ? 'PROCESSING ORDER...' : 'กำลังบันทึกคำสั่งซื้อ...'}
                            </>
                        ) : paymentMethod === 'พร้อมเพย์' && isQrPaid ? (
                            <>
                                <i className="bi bi-check-circle-fill" />
                                {isEn ? 'CONFIRM ORDER (PAID VIA QR)' : 'ยืนยันการสั่งซื้อ (ชำระผ่าน QR แล้ว)'}
                            </>
                        ) : (
                            isEn ? 'CONFIRM ORDER' : 'ยืนยันการสั่งซื้อ'
                        )}
                    </button>
                </div>
            </div>
        </>
    )
}

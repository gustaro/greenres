import { useLanguage } from '../../lib/LanguageContext'
import { PromptPayQR } from '../payment/PromptPayQR'
import { CreditCardForm } from '../payment/CreditCardForm'

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
}) {
    const { isEn, t } = useLanguage()

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
                                            defaultName={recipientName}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Bank Transfer Slip Option */}
                            <label className={`chk-payment-box ${paymentMethod === 'โอนเงินผ่านระบบ / พร้อมเพย์' ? 'active' : ''}`}>
                                <input
                                    type="radio"
                                    value="โอนเงินผ่านระบบ / พร้อมเพย์"
                                    checked={paymentMethod === 'โอนเงินผ่านระบบ / พร้อมเพย์'}
                                    onChange={e => setPaymentMethod(e.target.value)}
                                />
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span>{isEn ? 'Bank Transfer (Manual)' : 'โอนเงินผ่านระบบ / แนบสลิป'}</span>
                                    <small style={{ fontSize: 10, color: '#666' }}>{isEn ? 'Upload payment slip' : 'โอนเงินเข้าบัญชีร้านค้าและแนบสลิป'}</small>
                                </div>
                                <i className="bi bi-wallet2 chk-payment-icon"></i>
                            </label>
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
                        style={{ borderRadius: 4, padding: '14px 24px', fontSize: 14 }}
                    >
                        {isEn ? 'BACK TO CART' : 'ย้อนกลับไปตะกร้า'}
                    </button>
                    <button
                        type="submit"
                        className="primary"
                        disabled={!isFormValid}
                        style={{
                            borderRadius: 4,
                            padding: '14px 40px',
                            fontSize: 14,
                            opacity: isFormValid ? 1 : 0.5,
                            cursor: isFormValid ? 'pointer' : 'not-allowed',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 8,
                        }}
                    >
                        {paymentMethod === 'พร้อมเพย์' && isQrPaid ? (
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

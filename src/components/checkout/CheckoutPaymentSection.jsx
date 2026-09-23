import { useLanguage } from '../../lib/LanguageContext'

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
                            <label className={`chk-payment-box ${paymentMethod === 'พร้อมเพย์' ? 'active' : ''}`} style={{ borderColor: paymentMethod === 'พร้อมเพย์' ? '#1a56be' : '', background: paymentMethod === 'พร้อมเพย์' ? '#f0f5ff' : '' }}>
                                <input
                                    type="radio"
                                    value="พร้อมเพย์"
                                    checked={paymentMethod === 'พร้อมเพย์'}
                                    onChange={e => setPaymentMethod(e.target.value)}
                                />
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span>PromptPay QR</span>
                                    <small style={{ fontSize: 10, color: '#666' }}>{isEn ? 'Scan with any mobile banking app' : 'แสกนจ่ายผ่านแอปธนาคาร ฟรีค่าธรรมเนียม'}</small>
                                </div>
                                <i className="bi bi-qr-code chk-payment-icon" style={{ color: '#1a56be' }}></i>
                            </label>
                            <label className={`chk-payment-box ${paymentMethod === 'บัตรเครดิต/เดบิต' ? 'active' : ''}`} style={{ borderColor: paymentMethod === 'บัตรเครดิต/เดบิต' ? '#6772e5' : '', background: paymentMethod === 'บัตรเครดิต/เดบิต' ? '#f5f6ff' : '' }}>
                                <input
                                    type="radio"
                                    value="บัตรเครดิต/เดบิต"
                                    checked={paymentMethod === 'บัตรเครดิต/เดบิต'}
                                    onChange={e => setPaymentMethod(e.target.value)}
                                />
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span>Credit / Debit Card</span>
                                    <small style={{ fontSize: 10, color: '#666' }}>Visa, Mastercard, JCB (Secure)</small>
                                </div>
                                <i className="bi bi-credit-card chk-payment-icon" style={{ color: '#6772e5' }}></i>
                            </label>
                            <label className={`chk-payment-box ${paymentMethod === 'โอนเงินผ่านระบบ / พร้อมเพย์' ? 'active' : ''}`}>
                                <input
                                    type="radio"
                                    value="โอนเงินผ่านระบบ / พร้อมเพย์"
                                    checked={paymentMethod === 'โอนเงินผ่านระบบ / พร้อมเพย์'}
                                    onChange={e => setPaymentMethod(e.target.value)}
                                />
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span>{isEn ? 'Bank Transfer (Manual)' : 'โอนเงิน (Manual)'}</span>
                                    <small style={{ fontSize: 10, color: '#666' }}>{isEn ? 'Upload payment slip' : 'แนบสลิปการโอน'}</small>
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
                            cursor: isFormValid ? 'pointer' : 'not-allowed'
                        }}
                    >
                        {isEn ? 'CONFIRM ORDER' : 'ยืนยันการสั่งซื้อ'}
                    </button>
                </div>
            </div>
        </>
    )
}

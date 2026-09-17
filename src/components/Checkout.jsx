import { useEffect, useState } from 'react'
import { useAuth } from '../lib/AuthContext'
import { validatePromotion } from '../lib/database'

export const SERVER_DELIVERY_FEE = Number(import.meta.env.VITE_DELIVERY_FEE || 35)
export const SERVER_FREE_DELIVERY_THRESHOLD = Number(import.meta.env.VITE_FREE_DELIVERY_THRESHOLD || 300)

export function CheckoutModal({ cart, products, itemNotes, onClose, onDone }) {
    const { profile } = useAuth()
    const [orderMode, setOrderMode] = useState('takeaway')
    const [takeawayMethod, setTakeawayMethod] = useState('delivery')
    const [scheduleType, setScheduleType] = useState('ทันที')
    const deliveryType = orderMode === 'dine-in' ? 'ทานที่ร้าน' : takeawayMethod === 'pickup' ? 'รับเองที่ร้าน' : 'ให้จัดส่ง'
    const [paymentMethod, setPaymentMethod] = useState('ชำระเงินปลายทาง')
    const [promotionCode, setPromotionCode] = useState('')
    const [appliedPromotion, setAppliedPromotion] = useState(null)
    const [promotionError, setPromotionError] = useState('')
    const [checkingPromotion, setCheckingPromotion] = useState(false)

    // Form states for validation
    const savedAddresses = profile?.addresses || []
    const defaultAddress = savedAddresses.find(a => a.isDefault) || savedAddresses[0]

    const [recipientName, setRecipientName] = useState(profile?.name || '')
    const [recipientPhone, setRecipientPhone] = useState(profile?.phone || '')
    const [recipientEmail, setRecipientEmail] = useState(profile?.email || '')
    const [addressId, setAddressId] = useState(defaultAddress ? defaultAddress.id : 'new')
    const [manualAddress, setManualAddress] = useState(profile?.address || '')
    const [dineInTable, setDineInTable] = useState('')

    // Update if profile loads slower than modal open
    useEffect(() => {
        if (!recipientName && profile?.name) setRecipientName(profile.name)
        if (!recipientPhone && profile?.phone) setRecipientPhone(profile.phone)
        if (addressId === 'new' && !manualAddress && defaultAddress) setAddressId(defaultAddress.id)
    }, [profile])


    const items = products.filter(product => cart[product.id])
    const subtotal = items.reduce((sum, product) => sum + product.price * cart[product.id], 0)
    const fee = subtotal >= SERVER_FREE_DELIVERY_THRESHOLD ? 0 : SERVER_DELIVERY_FEE
    const discount = appliedPromotion?.discount || 0
    const total = subtotal - discount + fee

    useEffect(() => {
        if (deliveryType === 'ทานที่ร้าน' && paymentMethod !== 'ชำระที่ร้าน') setPaymentMethod('ชำระที่ร้าน')
        if (deliveryType === 'รับเองที่ร้าน' && ['ชำระเงินปลายทาง', 'ชำระที่ร้าน'].includes(paymentMethod)) setPaymentMethod('บัตรเครดิต/เดบิต')
        if (deliveryType === 'ให้จัดส่ง' && ['เงินสด', 'ชำระที่ร้าน'].includes(paymentMethod)) setPaymentMethod('ชำระเงินปลายทาง')
    }, [deliveryType, paymentMethod])

    const applyPromotion = async () => {
        setCheckingPromotion(true); setPromotionError('')
        try { setAppliedPromotion(await validatePromotion(promotionCode, subtotal)) }
        catch (error) { setAppliedPromotion(null); setPromotionError(error.message) }
        setCheckingPromotion(false)
    }

    const isPersonalInfoValid = recipientName.trim().length > 0 && recipientPhone.trim().length >= 9
    let isDeliveryValid = true
    if (deliveryType === 'ให้จัดส่ง') {
        if (addressId === 'new') {
            isDeliveryValid = manualAddress.trim().length > 5
        }
    }
    const isFormValid = isPersonalInfoValid && isDeliveryValid && paymentMethod

    const submit = event => {
        event.preventDefault()
        if (!isFormValid) return

        const form = new FormData(event.currentTarget)
        const scheduledValue = form.get('scheduledAt')

        const selectedAddress = addressId === 'new' ? null : savedAddresses.find(a => a.id === addressId)
        const deliveryAddressText = addressId === 'new' ? manualAddress : `${selectedAddress?.street || ''} ${selectedAddress?.state || ''} ${selectedAddress?.zip || ''}`.trim()

        onDone({
            deliveryAddress: deliveryType === 'ให้จัดส่ง' ? deliveryAddressText : deliveryType === 'ทานที่ร้าน' ? dineInTable : '',
            deliveryAddressId: deliveryType === 'ให้จัดส่ง' && addressId !== 'new' ? addressId : null,
            paymentMethod,
            deliveryType,
            deliveryScheduleType: deliveryType === 'ให้จัดส่ง' ? scheduleType : null,
            scheduledAt: deliveryType === 'ให้จัดส่ง' && scheduleType === 'ระบุเวลา' && scheduledValue ? new Date(scheduledValue).toISOString() : null,
            promotionCode: appliedPromotion?.code || null,
            recipientName,
            recipientPhone,
        })
    }

    return (
        <div className="overlay checkout-overlay">
            <div className="checkout-modal">
                <button className="checkout-modal-close" onClick={onClose} type="button">×</button>
                <section>
                    <form onSubmit={submit} id="checkout-form">

                        {/* Personal Information */}
                        <div className="chk-card">
                            <h3 className="chk-title">Personal Information</h3>
                            <div className="chk-grid full">
                                <div className="chk-input-wrap">
                                    <label>ชื่อผู้รับ (First Name)</label>
                                    <input name="recipientName" required value={recipientName} onChange={e => setRecipientName(e.target.value)} />
                                </div>
                            </div>
                            <div className="chk-grid" style={{ marginTop: 20 }}>
                                <div className="chk-input-wrap">
                                    <label>เบอร์โทร (Mobile Number)</label>
                                    <input name="recipientPhone" required value={recipientPhone} onChange={e => setRecipientPhone(e.target.value)} placeholder="08x-xxx-xxxx" />
                                </div>
                                <div className="chk-input-wrap">
                                    <label>อีเมล (Email)</label>
                                    <input name="recipientEmail" type="email" value={recipientEmail} onChange={e => setRecipientEmail(e.target.value)} placeholder="example@mail.com" />
                                </div>
                            </div>
                        </div>

                        {/* Delivery Options */}
                        <div className="chk-card">
                            <h3 className="chk-title">Delivery Options</h3>
                            <div className="order-options" style={{ marginBottom: 20 }}>
                                <label><input type="radio" name="orderMode" checked={orderMode === 'takeaway'} onChange={() => setOrderMode('takeaway')} /> สั่งกลับบ้าน / เดลิเวอรี</label>
                                <label><input type="radio" name="orderMode" checked={orderMode === 'dine-in'} onChange={() => setOrderMode('dine-in')} /> ทานที่ร้าน</label>
                            </div>

                            {orderMode === 'takeaway' ? (
                                <>
                                    <div className="order-options" style={{ marginBottom: 20 }}>
                                        <label><input type="radio" name="takeawayMethod" checked={takeawayMethod === 'delivery'} onChange={() => setTakeawayMethod('delivery')} /> จัดส่งถึงบ้าน</label>
                                        <label><input type="radio" name="takeawayMethod" checked={takeawayMethod === 'pickup'} onChange={() => setTakeawayMethod('pickup')} /> รับเองที่ร้าน</label>
                                    </div>

                                    {takeawayMethod === 'delivery' && (
                                        <div className="chk-grid">
                                            {savedAddresses.length > 0 && (
                                                <div className="chk-input-wrap" style={{ gridColumn: '1 / -1' }}>
                                                    <label>เลือกที่อยู่จัดส่ง (Saved Addresses)</label>
                                                    <select value={addressId} onChange={e => setAddressId(e.target.value)} style={{ padding: '12px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '14px', width: '100%', boxSizing: 'border-box' }}>
                                                        {savedAddresses.map(a => (
                                                            <option key={a.id} value={a.id}>{a.label || 'ที่อยู่'} - {a.street} {a.state} {a.zip}</option>
                                                        ))}
                                                        <option value="new">+ ระบุที่อยู่ใหม่</option>
                                                    </select>
                                                </div>
                                            )}

                                            {addressId === 'new' && (
                                                <div className="chk-input-wrap" style={{ gridColumn: '1 / -1' }}>
                                                    <label>ที่อยู่จัดส่ง ({savedAddresses.length > 0 ? 'ระบุที่อยู่ใหม่' : 'Delivery Address'})</label>
                                                    <textarea required value={manualAddress} onChange={e => setManualAddress(e.target.value)} rows={3} placeholder="M7J4+M93 ถ.ราษฎร์บำรุง..." />
                                                </div>
                                            )}

                                            <div className="chk-input-wrap">
                                                <label>เวลาจัดส่ง (Delivery Time)</label>
                                                <select value={scheduleType} onChange={event => setScheduleType(event.target.value)} style={{ padding: '12px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '14px', width: '100%', boxSizing: 'border-box' }}>
                                                    <option value="ทันที">เร็วที่สุด (ASAP)</option>
                                                    <option value="ระบุเวลา">ระบุเวลา (Schedule)</option>
                                                </select>
                                            </div>

                                            {scheduleType === 'ระบุเวลา' && (
                                                <div className="chk-input-wrap">
                                                    <label>วันที่และเวลา</label>
                                                    <input name="scheduledAt" type="datetime-local" required />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="chk-input-wrap full">
                                    <label>หมายเลขโต๊ะ (ถ้าทราบ)</label>
                                    <input value={dineInTable} onChange={e => setDineInTable(e.target.value)} placeholder="เช่น โต๊ะ 12" />
                                </div>
                            )}
                        </div>

                        {/* Promo Code */}
                        <div className="chk-card">
                            <h3 className="chk-title">Promo Code / e-Coupon</h3>
                            <div className="chk-promo-row">
                                <div className="chk-input-wrap" style={{ flex: 1 }}>
                                    <input value={promotionCode} onChange={e => setPromotionCode(e.target.value.toUpperCase())} placeholder="COUPON CODE" />
                                </div>
                                <button type="button" onClick={applyPromotion} disabled={!promotionCode || checkingPromotion} className="primary" style={{ padding: '0 24px', borderRadius: 4 }}>
                                    {checkingPromotion ? '...' : 'Redeem'}
                                </button>
                            </div>
                            {promotionError && <p style={{ color: 'var(--brand-primary)', margin: '8px 0 0', fontSize: 13, fontWeight: 600 }}>{promotionError}</p>}
                            {appliedPromotion && <p style={{ color: 'var(--brand-primary)', margin: '8px 0 0', fontSize: 13, fontWeight: 600 }}>✓ ได้รับส่วนลด ฿{appliedPromotion.discount}</p>}
                        </div>

                        {/* Payment Method */}
                        <div className="chk-card">
                            <h3 className="chk-title">Payment method</h3>
                            <div className="chk-payment-list">
                                {deliveryType === 'ให้จัดส่ง' && (
                                    <label className={`chk-payment-box ${paymentMethod === 'ชำระเงินปลายทาง' ? 'active' : ''}`}>
                                        <input type="radio" value="ชำระเงินปลายทาง" checked={paymentMethod === 'ชำระเงินปลายทาง'} onChange={e => setPaymentMethod(e.target.value)} />
                                        Cash On Delivery
                                        <i className="bi bi-cash chk-payment-icon"></i>
                                    </label>
                                )}
                                {(deliveryType === 'ให้จัดส่ง' || deliveryType === 'รับเองที่ร้าน') && (
                                    <>
                                        <label className={`chk-payment-box ${paymentMethod === 'พร้อมเพย์' ? 'active' : ''}`} style={{ borderColor: paymentMethod === 'พร้อมเพย์' ? '#1a56be' : '', background: paymentMethod === 'พร้อมเพย์' ? '#f0f5ff' : '' }}>
                                            <input type="radio" value="พร้อมเพย์" checked={paymentMethod === 'พร้อมเพย์'} onChange={e => setPaymentMethod(e.target.value)} />
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span>PromptPay QR</span>
                                                <small style={{ fontSize: 10, color: '#666' }}>แสกนจ่ายผ่านแอปธนาคาร</small>
                                            </div>
                                            <i className="bi bi-qr-code chk-payment-icon" style={{ color: '#1a56be' }}></i>
                                        </label>
                                        <label className={`chk-payment-box ${paymentMethod === 'บัตรเครดิต/เดบิต' ? 'active' : ''}`} style={{ borderColor: paymentMethod === 'บัตรเครดิต/เดบิต' ? '#6772e5' : '', background: paymentMethod === 'บัตรเครดิต/เดบิต' ? '#f5f6ff' : '' }}>
                                            <input type="radio" value="บัตรเครดิต/เดบิต" checked={paymentMethod === 'บัตรเครดิต/เดบิต'} onChange={e => setPaymentMethod(e.target.value)} />
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span>Credit / Debit Card</span>
                                                <small style={{ fontSize: 10, color: '#666' }}>powered by Stripe</small>
                                            </div>
                                            <i className="bi bi-credit-card chk-payment-icon" style={{ color: '#6772e5' }}></i>
                                        </label>
                                        <label className={`chk-payment-box ${paymentMethod === 'เงินสดตู้หมายเลขบัญชี' ? 'active' : ''}`}>
                                            <input type="radio" value="โอนเงินผ่านระบบ / พร้อมเพย์" checked={paymentMethod === 'โอนเงินผ่านระบบ / พร้อมเพย์'} onChange={e => setPaymentMethod(e.target.value)} />
                                            โอนเงิน (Manual)
                                            <i className="bi bi-wallet2 chk-payment-icon"></i>
                                        </label>
                                    </>
                                )}
                                {deliveryType === 'ทานที่ร้าน' && (
                                    <label className={`chk-payment-box active`}>
                                        <input type="radio" checked readOnly />
                                        ชำระเงินที่ร้าน (Pay at Store)
                                        <i className="bi bi-shop chk-payment-icon"></i>
                                    </label>
                                )}
                            </div>

                            <div className="chk-actions" style={{ marginTop: 30 }}>
                                <button type="button" className="secondary" onClick={onClose} style={{ borderRadius: 4, padding: '14px 24px', fontSize: 14 }}>BACK TO CART</button>
                                <button type="submit" className="primary" disabled={!isFormValid} style={{ borderRadius: 4, padding: '14px 40px', fontSize: 14, opacity: isFormValid ? 1 : 0.5, cursor: isFormValid ? 'pointer' : 'not-allowed' }}>CHECK OUT</button>
                            </div>
                        </div>

                    </form>
                </section>
                <aside>
                    <div className="chk-card" style={{ position: 'sticky', top: 30 }}>
                        <h3 className="chk-title">Order Summary</h3>
                        {items.map(product => (
                            <div className="sum-row" key={product.id}>
                                <span>
                                    {product.name}
                                    <small style={{ display: 'block', color: '#888', fontSize: 11, marginTop: 4 }}>
                                        {cart[product.id]} × ฿{product.price}
                                        {itemNotes[product.id] ? ` · ${itemNotes[product.id]}` : ''}
                                    </small>
                                </span>
                                <b style={{ fontWeight: 600 }}>฿{product.price * cart[product.id]}</b>
                            </div>
                        ))}

                        <hr style={{ border: 0, borderTop: '1px solid #f0f0f0', margin: '20px 0' }} />

                        <div className="sum-row" style={{ fontSize: 12 }}>
                            <span>Subtotal</span>
                            <span>฿{subtotal}</span>
                        </div>
                        <div className="sum-row" style={{ fontSize: 12 }}>
                            <span>Delivery Fee</span>
                            <span>{fee ? `฿${fee}` : 'FREE'}</span>
                        </div>
                        <div className="sum-row" style={{ fontSize: 12 }}>
                            <span>Discount</span>
                            <span style={{ color: discount ? 'var(--brand-primary)' : 'inherit' }}>{discount ? `-฿${discount}` : '฿0'}</span>
                        </div>

                        <div className="sum-total" style={{ borderTop: 0, marginTop: 25, paddingTop: 0 }}>
                            <span style={{ fontSize: 18, fontWeight: 900, color: '#000' }}>Total</span>
                            <b style={{ color: '#000', fontSize: 22, fontWeight: 900 }}>฿{total}</b>
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    )
}

import { useEffect, useState } from 'react'
import { useAuth } from '../lib/AuthContext'
import { useLanguage } from '../lib/LanguageContext'
import { validatePromotion } from '../lib/database'
import { CheckoutOrderSummary } from './checkout/CheckoutOrderSummary'
import { CheckoutDeliverySection } from './checkout/CheckoutDeliverySection'
import { CheckoutPaymentSection } from './checkout/CheckoutPaymentSection'

export const SERVER_DELIVERY_FEE = Number(import.meta.env.VITE_DELIVERY_FEE || 35)
export const SERVER_FREE_DELIVERY_THRESHOLD = Number(import.meta.env.VITE_FREE_DELIVERY_THRESHOLD || 300)

export function CheckoutModal({ cart, products, itemNotes = {}, onClose, onDone }) {
    const { profile } = useAuth()
    const { isEn, t } = useLanguage()
    const [orderMode, setOrderMode] = useState('takeaway') // 'takeaway' | 'dine-in'
    const [takeawayMethod, setTakeawayMethod] = useState('delivery') // 'delivery' | 'pickup'
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

    // New address structured fields
    const [newStreet, setNewStreet] = useState('')
    const [newState, setNewState] = useState('กรุงเทพมหานคร')
    const [newZip, setNewZip] = useState('')
    const [newLabel, setNewLabel] = useState('บ้าน')
    const [manualAddress, setManualAddress] = useState(profile?.address || '')

    // Dine-in / Table Reservation states
    const [reservationMode, setReservationMode] = useState('now') // 'now' | 'slot'
    const [reservationSlot, setReservationSlot] = useState('11:00 - 12:30')
    const [customReservationTime, setCustomReservationTime] = useState('')
    const [reservationGuests, setReservationGuests] = useState('2')
    const [dineInTable, setDineInTable] = useState('')

    // Mixed Dine-in with takeaway items map (productId -> boolean)
    const [takeawayItemMap, setTakeawayItemMap] = useState({})

    useEffect(() => {
        if (!recipientName && profile?.name) setRecipientName(profile.name)
        if (!recipientPhone && profile?.phone) setRecipientPhone(profile.phone)
        if (addressId === 'new' && !manualAddress && defaultAddress) setAddressId(defaultAddress.id)
    }, [profile])

    const items = products.filter(product => cart[product.id])
    const subtotal = items.reduce((sum, product) => sum + product.price * cart[product.id], 0)
    const fee = deliveryType === 'ให้จัดส่ง' ? (subtotal >= SERVER_FREE_DELIVERY_THRESHOLD ? 0 : SERVER_DELIVERY_FEE) : 0
    const discount = appliedPromotion?.discount || 0
    const total = Math.max(0, subtotal - discount + fee)

    useEffect(() => {
        if (deliveryType === 'ทานที่ร้าน' && paymentMethod !== 'ชำระที่ร้าน') setPaymentMethod('ชำระที่ร้าน')
        if (deliveryType === 'รับเองที่ร้าน' && ['ชำระเงินปลายทาง', 'ชำระที่ร้าน'].includes(paymentMethod)) setPaymentMethod('บัตรเครดิต/เดบิต')
        if (deliveryType === 'ให้จัดส่ง' && ['เงินสด', 'ชำระที่ร้าน'].includes(paymentMethod)) setPaymentMethod('ชำระเงินปลายทาง')
    }, [deliveryType, paymentMethod])

    const applyPromotion = async () => {
        setCheckingPromotion(true)
        setPromotionError('')
        try {
            setAppliedPromotion(await validatePromotion(promotionCode, subtotal))
        } catch (error) {
            setAppliedPromotion(null)
            setPromotionError(error.message)
        }
        setCheckingPromotion(false)
    }

    const [cardData, setCardData] = useState({
        cardNumber: '',
        cleanNumber: '',
        cardHolder: profile?.name || '',
        expiry: '',
        cvv: '',
        cardType: 'GENERIC',
        isValid: false,
        maskedCard: '',
    })
    const [isQrPaid, setIsQrPaid] = useState(false)
    const [qrData, setQrData] = useState(null)
    const [isSubmitting, setIsSubmitting] = useState(false)

    const isPersonalInfoValid = recipientName.trim().length > 0 && recipientPhone.trim().length >= 9
    let isDeliveryValid = true
    if (deliveryType === 'ให้จัดส่ง') {
        if (addressId === 'new') {
            isDeliveryValid = (newStreet.trim().length > 3 || manualAddress.trim().length > 5)
        }
    }
    const isPaymentValid = paymentMethod === 'บัตรเครดิต/เดบิต' ? cardData.isValid : Boolean(paymentMethod)
    const isFormValid = isPersonalInfoValid && isDeliveryValid && isPaymentValid

    const submit = async event => {
        event.preventDefault()
        if (!isFormValid || isSubmitting) return

        const form = new FormData(event.currentTarget)
        const scheduledValue = form.get('scheduledAt')

        const selectedAddress = addressId === 'new' ? null : savedAddresses.find(a => String(a.id) === String(addressId))
        const formattedNewAddress = [newStreet, newState, newZip].filter(Boolean).join(' ')
        const selectedAddressFormatted = selectedAddress
            ? [selectedAddress.street, selectedAddress.city !== selectedAddress.state ? selectedAddress.city : null, selectedAddress.state, selectedAddress.zip].filter(Boolean).join(' ')
            : ''
        const deliveryAddressText = addressId === 'new'
            ? (formattedNewAddress || manualAddress)
            : (selectedAddressFormatted || manualAddress || '')

        const finalReservationTime = orderMode === 'dine-in'
            ? (reservationMode === 'slot'
                ? (reservationSlot === 'custom' ? customReservationTime : reservationSlot)
                : 'ทันที (Walk-in)')
            : null

        const finalItemNotes = { ...(itemNotes || {}) }
        items.forEach(product => {
            const isItemTakeaway = orderMode === 'dine-in' && Boolean(takeawayItemMap[product.id])
            const existingNote = (finalItemNotes[product.id] || '').replace(/\[กลับบ้าน\]\s*/, '').trim()
            if (isItemTakeaway) {
                finalItemNotes[product.id] = `[กลับบ้าน] ${existingNote}`.trim()
            } else if (orderMode === 'dine-in') {
                finalItemNotes[product.id] = existingNote
            }
        })

        const stripePaymentId = (paymentMethod === 'พร้อมเพย์' && qrData?.paymentIntentId)
            ? qrData.paymentIntentId
            : (paymentMethod === 'บัตรเครดิต/เดบิต' && cardData?.stripePaymentId)
                ? cardData.stripePaymentId
                : null

        const paymentDetail = paymentMethod === 'บัตรเครดิต/เดบิต'
            ? (cardData.maskedCard || 'บัตรเครดิต')
            : paymentMethod === 'พร้อมเพย์'
                ? (isQrPaid ? `สแกนคิวอาร์ (PromptPay จำลองสำเร็จ - REF: ${qrData?.refCode || ''}${qrData?.paymentIntentId ? ` | Stripe: ${qrData.paymentIntentId}` : ''})` : 'สแกนคิวอาร์ (PromptPay)')
                : paymentMethod

        setIsSubmitting(true)
        try {
            await onDone({
                deliveryAddress: deliveryType === 'ให้จัดส่ง' ? deliveryAddressText : deliveryType === 'ทานที่ร้าน' ? (dineInTable ? `โต๊ะ ${dineInTable}` : 'ทานที่ร้าน') : '',
                deliveryAddressId: deliveryType === 'ให้จัดส่ง' && addressId !== 'new' ? addressId : null,
                newAddressObj: addressId === 'new' ? {
                    label: newLabel || 'บ้าน',
                    street: newStreet || manualAddress,
                    city: newState || 'กรุงเทพมหานคร',
                    state: newState || 'กรุงเทพมหานคร',
                    zip: newZip || '10110',
                } : null,
                paymentMethod,
                paymentDetail,
                stripePaymentId,
                cardData: paymentMethod === 'บัตรเครดิต/เดบิต' ? {
                    maskedCard: cardData.maskedCard,
                    cardType: cardData.cardType,
                } : null,
                deliveryType,
                deliveryScheduleType: deliveryType === 'ให้จัดส่ง' ? scheduleType : null,
                scheduledAt: deliveryType === 'ให้จัดส่ง' && scheduleType === 'ระบุเวลา' && scheduledValue ? new Date(scheduledValue).toISOString() : null,
                reservationTime: finalReservationTime,
                reservationGuests: orderMode === 'dine-in' ? Number(reservationGuests || 2) : null,
                tableNumber: dineInTable || '',
                promotionCode: appliedPromotion?.code || null,
                recipientName,
                recipientPhone,
                itemNotes: finalItemNotes,
            })
        } catch (err) {
            console.error(err)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="overlay checkout-overlay">
            <div className="checkout-modal">
                <button className="checkout-modal-close" onClick={onClose} type="button">×</button>
                <section>
                    <div style={{ marginBottom: 24, textAlign: 'center' }}>
                        <h2 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: 'var(--brand-primary-dark)' }}>{t('checkoutTitle')}</h2>
                    </div>
                    <form onSubmit={submit} id="checkout-form">
                        {/* Personal Information */}
                        <div className="chk-card">
                            <h3 className="chk-title">{isEn ? 'Personal Information' : 'ข้อมูลผู้สั่งซื้อ'}</h3>
                            <div className="chk-grid full">
                                <div className="chk-input-wrap">
                                    <label>{t('name')}</label>
                                    <input name="recipientName" required value={recipientName} onChange={e => setRecipientName(e.target.value)} placeholder={isEn ? 'e.g. John Doe' : 'เช่น สมชาย ใจดี'} />
                                </div>
                            </div>
                            <div className="chk-grid" style={{ marginTop: 20 }}>
                                <div className="chk-input-wrap">
                                    <label>{t('phone')}</label>
                                    <input name="recipientPhone" required value={recipientPhone} onChange={e => setRecipientPhone(e.target.value)} placeholder="08x-xxx-xxxx" />
                                </div>
                                <div className="chk-input-wrap">
                                    <label>{isEn ? 'Email' : 'อีเมล'}</label>
                                    <input name="recipientEmail" type="email" value={recipientEmail} onChange={e => setRecipientEmail(e.target.value)} placeholder="example@mail.com" />
                                </div>
                            </div>
                        </div>

                        {/* Delivery Options / Table Reservation */}
                        <CheckoutDeliverySection
                            orderMode={orderMode}
                            setOrderMode={setOrderMode}
                            takeawayMethod={takeawayMethod}
                            setTakeawayMethod={setTakeawayMethod}
                            savedAddresses={savedAddresses}
                            addressId={addressId}
                            setAddressId={setAddressId}
                            newStreet={newStreet}
                            setNewStreet={setNewStreet}
                            newState={newState}
                            setNewState={setNewState}
                            newZip={newZip}
                            setNewZip={setNewZip}
                            newLabel={newLabel}
                            setNewLabel={setNewLabel}
                            manualAddress={manualAddress}
                            setManualAddress={setManualAddress}
                            scheduleType={scheduleType}
                            setScheduleType={setScheduleType}
                            reservationMode={reservationMode}
                            setReservationMode={setReservationMode}
                            reservationSlot={reservationSlot}
                            setReservationSlot={setReservationSlot}
                            customReservationTime={customReservationTime}
                            setCustomReservationTime={setCustomReservationTime}
                            reservationGuests={reservationGuests}
                            setReservationGuests={setReservationGuests}
                            dineInTable={dineInTable}
                            setDineInTable={setDineInTable}
                        />

                        {/* Mixed Takeaway items when Dine-in */}
                        {orderMode === 'dine-in' && (
                            <div className="chk-card" style={{ borderLeft: '4px solid var(--brand-accent, #b8ff35)' }}>
                                <h3 className="chk-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span><i className="bi bi-bag-plus me-2 text-success" />{isEn ? 'Pack items for takeaway?' : 'สั่งอาหารกลับบ้านเพิ่มด้วยหรือไม่?'}</span>
                                    <span style={{ fontSize: 11, fontWeight: 500, color: '#555' }}>{isEn ? 'Dine-in with boxed takeaway' : 'ทานที่ร้านแต่แพ็กกลับบ้านบางจาน'}</span>
                                </h3>
                                <p style={{ fontSize: 12, color: '#666', margin: '0 0 12px' }}>
                                    {isEn ? 'If you wish to take any dish home, click "Takeaway" below and the kitchen will box it up for you.' : 'หากต้องการนำอาหารบางรายการกลับบ้าน ให้กดเลือก "สั่งกลับบ้าน" ที่เมนูด้านล่าง ครัวจะจัดแพ็กเกจใส่กล่องให้ทันที'}
                                </p>
                                <div style={{ display: 'grid', gap: 8 }}>
                                    {items.map(product => {
                                        const isTakeaway = Boolean(takeawayItemMap[product.id])
                                        return (
                                            <div key={product.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: isTakeaway ? '#f0fdf0' : '#fff', border: isTakeaway ? '1px solid #b8ff35' : '1px solid #eee', borderRadius: 6 }}>
                                                <span style={{ fontSize: 13, fontWeight: 600 }}>
                                                    {(isEn && product.en) ? product.en : product.name} × {cart[product.id]}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => setTakeawayItemMap(prev => ({ ...prev, [product.id]: !prev[product.id] }))}
                                                    style={{
                                                        border: 0,
                                                        background: isTakeaway ? 'var(--brand-primary, #12852f)' : '#d8e7d2',
                                                        color: isTakeaway ? '#fff' : '#17351f',
                                                        padding: '6px 12px',
                                                        borderRadius: 20,
                                                        fontSize: 12,
                                                        fontWeight: 700,
                                                        cursor: 'pointer',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: 6
                                                    }}
                                                >
                                                    {isTakeaway ? <><i className="bi bi-bag-check" /> {isEn ? 'Takeaway' : 'สั่งกลับบ้าน'}</> : <><i className="bi bi-shop" /> {isEn ? 'Dine-In' : 'ทานที่ร้าน'}</>}
                                                </button>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Promo Code & Payment Methods */}
                        <CheckoutPaymentSection
                            promotionCode={promotionCode}
                            setPromotionCode={setPromotionCode}
                            applyPromotion={applyPromotion}
                            checkingPromotion={checkingPromotion}
                            promotionError={promotionError}
                            appliedPromotion={appliedPromotion}
                            deliveryType={deliveryType}
                            paymentMethod={paymentMethod}
                            setPaymentMethod={setPaymentMethod}
                            onClose={onClose}
                            isFormValid={isFormValid}
                            orderTotal={total}
                            cardData={cardData}
                            setCardData={setCardData}
                            recipientName={recipientName}
                            isQrPaid={isQrPaid}
                            setIsQrPaid={setIsQrPaid}
                            qrData={qrData}
                            setQrData={setQrData}
                            isSubmitting={isSubmitting}
                        />
                    </form>
                </section>

                <CheckoutOrderSummary
                    items={items}
                    cart={cart}
                    orderMode={orderMode}
                    takeawayItemMap={takeawayItemMap}
                    itemNotes={itemNotes}
                    subtotal={subtotal}
                    fee={fee}
                    discount={discount}
                    total={total}
                />
            </div>
        </div>
    )
}

import { useEffect, useState } from 'react'
import { useAuth } from '../lib/AuthContext'
import { validatePromotion } from '../lib/database'

export const SERVER_DELIVERY_FEE = Number(import.meta.env.VITE_DELIVERY_FEE || 35)
export const SERVER_FREE_DELIVERY_THRESHOLD = Number(import.meta.env.VITE_FREE_DELIVERY_THRESHOLD || 300)

const money = value => new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(value || 0)

// ─── Cart Drawer (Global Header Cart) ───────────────────────────────────────
export function CartDrawer({ cart, setCart, products, itemNotes, setItemNotes, onClose, onCheckout }) {
    const items = products.filter(p => cart[p.id])
    const total = items.reduce((s, p) => s + p.price * cart[p.id], 0)

    return (
        <div className="drawer-backdrop" onMouseDown={onClose}>
            <aside className="cart-drawer" onMouseDown={e => e.stopPropagation()}>
                <div className="drawer-head">
                    <div>
                        <small>YOUR ORDER</small>
                        <h2>ตะกร้าของคุณ</h2>
                    </div>
                    <button onClick={onClose}>×</button>
                </div>
                {items.length === 0 ? (
                    <div className="drawer-empty">ยังไม่มีสินค้าในตะกร้า</div>
                ) : (
                    <>
                        <div className="drawer-items">
                            {items.map(p => (
                                <div className="cart-item-ui" key={p.id}>
                                    <img src={p.img} alt={p.name} className="cart-item-ui-img" />
                                    <div className="cart-item-ui-content">
                                        <div className="cart-item-ui-header">
                                            <b>{p.name}</b>
                                            <strong>฿{p.price * cart[p.id]}</strong>
                                        </div>
                                        <small className="cart-item-ui-price">฿{p.price} × {cart[p.id]}</small>
                                        <div className="cart-item-ui-actions">
                                            <input
                                                type="text"
                                                placeholder="หมายเหตุเพิ่มเติม..."
                                                value={itemNotes[p.id] || ''}
                                                onChange={e => setItemNotes?.(v => ({ ...v, [p.id]: e.target.value }))}
                                                className="cart-note-input"
                                            />
                                            <div className="qty cart-qty-ui">
                                                <button onClick={() => setCart(v => ({ ...v, [p.id]: Math.max(0, (v[p.id] || 0) - 1) }))}>
                                                    <i className="bi bi-dash"></i>
                                                </button>
                                                <span>{cart[p.id]}</span>
                                                <button onClick={() => setCart(v => ({ ...v, [p.id]: (v[p.id] || 0) + 1 }))}>
                                                    <i className="bi bi-plus"></i>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="drawer-total">
                            <span>ยอดรวมทั้งหมด</span>
                            <b>฿{total}</b>
                        </div>
                        <button className="primary" onClick={onCheckout}>ชำระเงิน ›</button>
                    </>
                )}
            </aside>
        </div>
    )
}

// ─── Cart Sidebar (Order Page) ──────────────────────────────────────────────
export function CartSidebar({ cart, setCart, products, itemNotes, setItemNotes, onCheckout }) {
    const cartItems = products.filter(p => cart[p.id])
    const total = cartItems.reduce((s, p) => s + p.price * cart[p.id], 0)
    const count = cartItems.reduce((s, p) => s + cart[p.id], 0)

    const add = (p) => setCart?.(prev => ({ ...prev, [p.id]: (prev[p.id] || 0) + 1 }))
    const remove = (p) => setCart?.(prev => ({ ...prev, [p.id]: Math.max(0, (prev[p.id] || 0) - 1) }))

    return (
        <aside className="op-cart">
            <div className="op-cart-header">ตะกร้าสินค้า</div>
            <div className="op-cart-info">
                <div className="op-cart-info-row">
                    <span>📍 ที่อยู่จัดส่ง</span>
                    <button className="op-edit-btn">+ เพิ่มที่อยู่</button>
                </div>
                <p className="op-addr-text">กรอกที่อยู่จัดส่งของคุณ</p>
            </div>
            <div className="op-cart-info op-cart-time">
                <div className="op-cart-info-row">
                    <span>🕐 เวลาจัดส่ง</span>
                </div>
                <p className="op-addr-text">เลือกวิธีรับอาหารและเวลาในขั้นตอนชำระเงิน</p>
            </div>

            {cartItems.length > 0 && (
                <div className="op-cart-items">
                    {cartItems.map(p => (
                        <div className="cart-item-ui" key={p.id}>
                            <img src={p.img} alt={p.name} className="cart-item-ui-img" />
                            <div className="cart-item-ui-content">
                                <div className="cart-item-ui-header">
                                    <b>{p.name}</b>
                                    <strong>฿{p.price * cart[p.id]}</strong>
                                </div>
                                <small className="cart-item-ui-price">฿{p.price}</small>
                                <div className="cart-item-ui-actions">
                                    <input
                                        type="text"
                                        placeholder="หมายเหตุ (เช่น ไม่เผ็ด, ไม่ผัก)"
                                        value={itemNotes?.[p.id] || ''}
                                        onChange={e => setItemNotes?.(v => ({ ...v, [p.id]: e.target.value }))}
                                        className="cart-note-input"
                                    />
                                    <div className="op-qty cart-qty-ui">
                                        <button onClick={() => remove(p)}><i className="bi bi-dash"></i></button>
                                        <span>{cart[p.id]}</span>
                                        <button onClick={() => add(p)}><i className="bi bi-plus"></i></button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {cartItems.length === 0 && (
                <div className="op-cart-empty">ยังไม่มีสินค้าในตะกร้า</div>
            )}

            <div className="op-cart-total-row">
                <span>ยอดรวมทั้งหมด</span>
                <b className="op-total-num">฿{total}</b>
            </div>
            <div className="op-checkout-wrapper">
                <button
                    className={`op-checkout-btn ${count === 0 ? 'disabled' : ''}`}
                    onClick={count > 0 ? onCheckout : undefined}
                    disabled={count === 0}
                >
                    ชำระเงิน
                </button>
            </div>
        </aside>
    )
}

// ─── Checkout Modal ─────────────────────────────────────────────────────────
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

    const items = products.filter(product => cart[product.id])
    const subtotal = items.reduce((sum, product) => sum + product.price * cart[product.id], 0)
    const fee = subtotal >= SERVER_FREE_DELIVERY_THRESHOLD ? 0 : SERVER_DELIVERY_FEE
    const discount = appliedPromotion?.discount || 0
    const total = subtotal - discount + fee

    useEffect(() => {
        if (deliveryType === 'ทานที่ร้าน' && paymentMethod !== 'ชำระที่ร้าน') setPaymentMethod('ชำระที่ร้าน')
        if (deliveryType === 'รับเองที่ร้าน' && ['ชำระเงินปลายทาง', 'ชำระที่ร้าน'].includes(paymentMethod)) setPaymentMethod('เงินสด')
        if (deliveryType === 'ให้จัดส่ง' && ['เงินสด', 'ชำระที่ร้าน'].includes(paymentMethod)) setPaymentMethod('ชำระเงินปลายทาง')
    }, [deliveryType, paymentMethod])

    const applyPromotion = async () => {
        setCheckingPromotion(true); setPromotionError('')
        try { setAppliedPromotion(await validatePromotion(promotionCode, subtotal)) }
        catch (error) { setAppliedPromotion(null); setPromotionError(error.message) }
        setCheckingPromotion(false)
    }

    const submit = event => {
        event.preventDefault()
        const form = new FormData(event.currentTarget)
        const scheduledValue = form.get('scheduledAt')
        onDone({
            deliveryAddress: form.get('address'),
            paymentMethod,
            deliveryType,
            deliveryScheduleType: deliveryType === 'ให้จัดส่ง' ? scheduleType : null,
            scheduledAt: deliveryType === 'ให้จัดส่ง' && scheduleType === 'ระบุเวลา' && scheduledValue ? new Date(scheduledValue).toISOString() : null,
            promotionCode: appliedPromotion?.code || null,
            recipientName: form.get('recipientName'),
            recipientPhone: form.get('recipientPhone'),
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
                                    <input name="recipientName" required defaultValue={profile?.name || ''} />
                                </div>
                            </div>
                            <div className="chk-grid" style={{ marginTop: 20 }}>
                                <div className="chk-input-wrap">
                                    <label>เบอร์โทร (Mobile Number)</label>
                                    <input name="recipientPhone" required defaultValue={profile?.phone || ''} placeholder="08x-xxx-xxxx" />
                                </div>
                                <div className="chk-input-wrap">
                                    <label>อีเมล (Email)</label>
                                    <input name="recipientEmail" type="email" placeholder="example@mail.com" />
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
                                            <div className="chk-input-wrap" style={{ gridColumn: '1 / -1' }}>
                                                <label>ที่อยู่จัดส่ง (Delivery Address)</label>
                                                <textarea name="address" required defaultValue={profile?.address || ''} rows={3} placeholder="M7J4+M93 ถ.ราษฎร์บำรุง..." />
                                            </div>

                                            <div className="chk-input-wrap">
                                                <label>เวลาจัดส่ง (Delivery Time)</label>
                                                <select value={scheduleType} onChange={event => setScheduleType(event.target.value)}>
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
                                    <input name="address" placeholder="เช่น โต๊ะ 12" />
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
                                        <label className={`chk-payment-box ${paymentMethod === 'โอนเงินผ่านระบบ / พร้อมเพย์' ? 'active' : ''}`}>
                                            <input type="radio" value="โอนเงินผ่านระบบ / พร้อมเพย์" checked={paymentMethod === 'โอนเงินผ่านระบบ / พร้อมเพย์'} onChange={e => setPaymentMethod(e.target.value)} />
                                            PromptPay / โอนเงิน
                                            <i className="bi bi-qr-code chk-payment-icon"></i>
                                        </label>
                                        <label className={`chk-payment-box ${paymentMethod === 'เงินสด' ? 'active' : ''}`}>
                                            <input type="radio" value="เงินสด" checked={paymentMethod === 'เงินสด'} onChange={e => setPaymentMethod(e.target.value)} />
                                            Cash at Store
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
                                <button type="submit" className="primary" style={{ borderRadius: 4, padding: '14px 40px', fontSize: 14 }}>CHECK OUT</button>
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

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { useLanguage } from '../lib/LanguageContext'
import { validatePromotion } from '../lib/database'
import { CartPointsWidget } from './cart/CartPointsWidget'

export const SERVER_DELIVERY_FEE = Number(import.meta.env.VITE_DELIVERY_FEE || 35)
export const SERVER_FREE_DELIVERY_THRESHOLD = Number(import.meta.env.VITE_FREE_DELIVERY_THRESHOLD || 300)

const money = value => new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(value || 0)

const formatSavedAddress = address => {
    if (!address) return ''
    const street = String(address.street || '').trim()
    const extraParts = [address.city, address.state, address.zip]
        .map(value => String(value || '').trim())
        .filter(value => value && !street.includes(value))
    return [street, ...extraParts].filter(Boolean).join(' ')
}

// ─── Cart Drawer (Global Header Cart) ───────────────────────────────────────
export function CartDrawer({ cart, setCart, products, itemNotes, setItemNotes, onClose, onCheckout, pointsToUse = 0, setPointsToUse, onAuth }) {
    const { isEn, t } = useLanguage()
    const items = products.filter(p => cart[p.id])
    const { settings } = useAuth()
    const total = items.reduce((s, p) => s + p.price * cart[p.id], 0)
    const redeemRate = Number(settings?.pointsRedeemRate || 10)
    const pointsDiscount = pointsToUse > 0 ? Math.floor(pointsToUse / redeemRate) : 0
    const netTotal = Math.max(0, total - pointsDiscount)

    return (
        <div className="drawer-backdrop" onMouseDown={onClose}>
            <aside className="cart-drawer" onMouseDown={e => e.stopPropagation()}>
                <div className="drawer-head">
                    <div>
                        <small>YOUR ORDER</small>
                        <h2>{t('cartTitle')}</h2>
                    </div>
                    <button onClick={onClose}>×</button>
                </div>
                {items.length === 0 ? (
                    <div className="drawer-empty">{t('cartEmpty')}</div>
                ) : (
                    <>
                        <div className="drawer-items">
                            {items.map(p => (
                                <div className="cart-item-ui" key={p.id}>
                                    <img src={p.img} alt={p.name} className="cart-item-ui-img" />
                                    <div className="cart-item-ui-content">
                                        <div className="cart-item-ui-header">
                                            <b>{isEn && p.en ? p.en : p.name}</b>
                                            <strong>฿{p.price * cart[p.id]}</strong>
                                        </div>
                                        <small className="cart-item-ui-price">฿{p.price} × {cart[p.id]}</small>
                                        <div className="cart-item-ui-actions">
                                            <input
                                                type="text"
                                                placeholder={t('notePlaceholder')}
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
                        <CartPointsWidget
                            subtotal={total}
                            pointsToUse={pointsToUse}
                            setPointsToUse={setPointsToUse}
                            onAuth={onAuth}
                            compact
                        />
                        {pointsDiscount > 0 && (
                            <>
                                <div className="drawer-total" style={{ fontSize: 13, marginBottom: 2, color: 'var(--brand-muted)' }}>
                                    <span>{t('subtotal')}</span>
                                    <span>฿{total}</span>
                                </div>
                                <div className="drawer-total" style={{ fontSize: 13, marginBottom: 6, color: 'var(--brand-primary)', fontWeight: 600 }}>
                                    <span>{t('cartPointsDiscount')} ({pointsToUse} {t('profilePointsUnit')})</span>
                                    <span>-฿{pointsDiscount}</span>
                                </div>
                            </>
                        )}
                        <div className="drawer-total">
                            <span>{t('netTotal')}</span>
                            <b>฿{netTotal}</b>
                        </div>
                        <button className="primary" onClick={onCheckout}>{t('proceedToCheckout')} ›</button>
                    </>
                )}
            </aside>
        </div>
    )
}

// ─── Cart Sidebar (Order Page) ──────────────────────────────────────────────
export function CartSidebar({ cart, setCart, products, itemNotes, setItemNotes, onCheckout, onAuth, pointsToUse = 0, setPointsToUse }) {
    const { isEn, t } = useLanguage()
    const { session, profile, addAddress, settings } = useAuth()
    const navigate = useNavigate()
    const cartItems = products.filter(p => cart[p.id])
    const total = cartItems.reduce((s, p) => s + p.price * cart[p.id], 0)
    const redeemRate = Number(settings?.pointsRedeemRate || 10)
    const pointsDiscount = pointsToUse > 0 ? Math.floor(pointsToUse / redeemRate) : 0
    const netTotal = Math.max(0, total - pointsDiscount)
    const count = cartItems.reduce((s, p) => s + cart[p.id], 0)
    const savedAddresses = profile?.addresses || []
    const defaultAddress = savedAddresses.find(address => address.isDefault) || savedAddresses[0]
    const [showAddressForm, setShowAddressForm] = useState(false)
    const [savingAddress, setSavingAddress] = useState(false)
    const [addressError, setAddressError] = useState('')
    const [addressForm, setAddressForm] = useState({ label: 'บ้าน', street: '', province: 'กรุงเทพมหานคร', zip: '' })

    const add = (p) => setCart?.(prev => ({ ...prev, [p.id]: (prev[p.id] || 0) + 1 }))
    const remove = (p) => setCart?.(prev => ({ ...prev, [p.id]: Math.max(0, (prev[p.id] || 0) - 1) }))
    const updateAddressField = (field, value) => setAddressForm(current => ({ ...current, [field]: value }))

    const openAddressForm = () => {
        if (!session) {
            onAuth?.()
            return
        }
        setAddressError('')
        setShowAddressForm(current => !current)
    }

    const saveAddress = async () => {
        if (!addressForm.street.trim() || !addressForm.province.trim() || !addressForm.zip.trim()) {
            setAddressError(isEn ? 'Please complete the address and postal code.' : 'กรุณากรอกที่อยู่ จังหวัด และรหัสไปรษณีย์ให้ครบ')
            return
        }
        setSavingAddress(true)
        setAddressError('')
        const { error } = await addAddress({ ...addressForm, phone: profile?.phone || '', isDefault: true })
        setSavingAddress(false)
        if (error) {
            setAddressError(error.message)
            return
        }
        setAddressForm({ label: 'บ้าน', street: '', province: 'กรุงเทพมหานคร', zip: '' })
        setShowAddressForm(false)
    }

    return (
        <aside className="op-cart">
            <div className="op-cart-header">{t('cartTitle')}</div>
            <div className="op-cart-info">
                <div className="op-cart-info-row">
                    <span><i className="bi bi-geo-alt-fill me-1 text-danger" />{isEn ? 'Delivery Address' : 'ที่อยู่จัดส่ง'}</span>
                    <button type="button" className="op-edit-btn" onClick={openAddressForm}>
                        {showAddressForm ? (isEn ? 'Cancel' : 'ยกเลิก') : (isEn ? '+ Add Address' : '+ เพิ่มที่อยู่')}
                    </button>
                </div>
                <p className={`op-addr-text ${defaultAddress ? 'has-address' : ''}`}>
                    {defaultAddress
                        ? <><b>{defaultAddress.label || (isEn ? 'Address' : 'ที่อยู่')}</b> — {formatSavedAddress(defaultAddress)}</>
                        : (isEn ? 'Enter your delivery address' : 'กรอกที่อยู่จัดส่งของคุณ')}
                </p>
                {session && savedAddresses.length > 0 && (
                    <button type="button" className="op-address-manage" onClick={() => navigate('/profile?tab=address')}>
                        <i className="bi bi-geo-alt me-1" />{isEn ? 'Manage My Addresses' : 'จัดการในที่อยู่ของฉัน'}
                    </button>
                )}
                {showAddressForm && (
                    <div className="op-address-form">
                        <input
                            value={addressForm.label}
                            onChange={event => updateAddressField('label', event.target.value)}
                            placeholder={isEn ? 'Label, e.g. Home' : 'ชื่อที่อยู่ เช่น บ้าน'}
                        />
                        <textarea
                            value={addressForm.street}
                            onChange={event => updateAddressField('street', event.target.value)}
                            placeholder={isEn ? 'House number, building, street' : 'บ้านเลขที่ อาคาร ซอย ถนน'}
                            rows={2}
                        />
                        <div>
                            <input
                                value={addressForm.province}
                                onChange={event => updateAddressField('province', event.target.value)}
                                placeholder={isEn ? 'Province / State' : 'จังหวัด / เขต'}
                            />
                            <input
                                value={addressForm.zip}
                                onChange={event => updateAddressField('zip', event.target.value)}
                                placeholder={isEn ? 'Postal code' : 'รหัสไปรษณีย์'}
                                inputMode="numeric"
                            />
                        </div>
                        {addressError && <small className="op-address-error">{addressError}</small>}
                        <button type="button" className="op-address-save" onClick={saveAddress} disabled={savingAddress}>
                            {savingAddress ? (isEn ? 'Saving...' : 'กำลังบันทึก...') : (isEn ? 'Save Address' : 'บันทึกที่อยู่')}
                        </button>
                    </div>
                )}
            </div>
            <div className="op-cart-info op-cart-time">
                <div className="op-cart-info-row">
                    <span><i className="bi bi-clock-fill me-1 text-primary" />{isEn ? 'Delivery Time' : 'เวลาจัดส่ง'}</span>
                </div>
                <p className="op-addr-text">{isEn ? 'Select schedule & delivery type at checkout' : 'เลือกวิธีรับอาหารและเวลาในขั้นตอนชำระเงิน'}</p>
            </div>

            {cartItems.length > 0 && (
                <div className="op-cart-items">
                    {cartItems.map(p => (
                        <div className="cart-item-ui" key={p.id}>
                            <img src={p.img} alt={p.name} className="cart-item-ui-img" />
                            <div className="cart-item-ui-content">
                                <div className="cart-item-ui-header">
                                    <b>{isEn && p.en ? p.en : p.name}</b>
                                    <strong>฿{p.price * cart[p.id]}</strong>
                                </div>
                                <small className="cart-item-ui-price">฿{p.price}</small>
                                <div className="cart-item-ui-actions">
                                    <input
                                        type="text"
                                        placeholder={t('notePlaceholder')}
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
                <div className="op-cart-empty">{t('cartEmpty')}</div>
            )}

            {cartItems.length > 0 && (
                <div style={{ padding: '0 18px' }}>
                    <CartPointsWidget
                        subtotal={total}
                        pointsToUse={pointsToUse}
                        setPointsToUse={setPointsToUse}
                        onAuth={onAuth}
                    />
                </div>
            )}

            {pointsDiscount > 0 && (
                <>
                    <div className="op-cart-total-row" style={{ fontSize: 13, color: 'var(--brand-muted)', padding: '4px 18px' }}>
                        <span>{t('subtotal')}</span>
                        <span>฿{total}</span>
                    </div>
                    <div className="op-cart-total-row" style={{ fontSize: 13, color: 'var(--brand-primary)', fontWeight: 600, padding: '4px 18px' }}>
                        <span>{t('cartPointsDiscount')} ({pointsToUse} {t('profilePointsUnit')})</span>
                        <span>-฿{pointsDiscount}</span>
                    </div>
                </>
            )}

            <div className="op-cart-total-row">
                <span>{t('netTotal')}</span>
                <b className="op-total-num">฿{netTotal}</b>
            </div>
            <div className="op-checkout-wrapper">
                <button
                    className={`op-checkout-btn ${count === 0 ? 'disabled' : ''}`}
                    onClick={count > 0 ? onCheckout : undefined}
                    disabled={count === 0}
                >
                    {isEn ? 'Checkout' : 'ชำระเงิน'}
                </button>
            </div>
        </aside>
    )
}


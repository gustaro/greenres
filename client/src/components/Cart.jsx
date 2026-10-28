import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { useLanguage } from '../lib/LanguageContext'
import { validatePromotion } from '../lib/database'
import { cleanAddressText } from '../lib/geo'
import { CartPointsWidget } from './cart/CartPointsWidget'
import { buildCartLines } from '../lib/productOptions'

export const SERVER_DELIVERY_FEE = Number(import.meta.env.VITE_DELIVERY_FEE || 35)
export const SERVER_FREE_DELIVERY_THRESHOLD = Number(import.meta.env.VITE_FREE_DELIVERY_THRESHOLD || 300)

const money = value => new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(value || 0)

const formatSavedAddress = address => {
    if (!address) return ''
    const street = cleanAddressText(String(address.street || ''))
    const extraParts = [
        cleanAddressText(String(address.city || '')),
        cleanAddressText(String(address.state || '')),
        cleanAddressText(String(address.zip || ''))
    ]
        .map(value => String(value || '').trim())
        .filter(value => value && !street.includes(value))
    const formatted = [street, ...extraParts].filter(Boolean).join(' ')
    return cleanAddressText(formatted)
}

// ─── Cart Drawer (Global Header Cart) ───────────────────────────────────────
export function CartDrawer({ cart, setCart, products, itemNotes, setItemNotes, onClose, onCheckout, pointsToUse = 0, setPointsToUse, onAuth }) {
    const { isEn, t } = useLanguage()
    const navigate = useNavigate()
    const items = buildCartLines(cart, products)
    const { session, profile, updateProfile, settings } = useAuth()
    const [showDrawerPhoneForm, setShowDrawerPhoneForm] = useState(false)
    const [savingDrawerPhone, setSavingDrawerPhone] = useState(false)
    const [drawerPhoneError, setDrawerPhoneError] = useState('')
    const [drawerPhoneSuccess, setDrawerPhoneSuccess] = useState('')
    const [drawerPhoneInput, setDrawerPhoneInput] = useState(profile?.phone || '')

    const saveDrawerPhone = async () => {
        const cleaned = drawerPhoneInput.trim()
        if (!cleaned) {
            setDrawerPhoneError(isEn ? 'Please enter a phone number' : 'กรุณากรอกเบอร์โทรศัพท์')
            return
        }
        setSavingDrawerPhone(true)
        setDrawerPhoneError('')
        setDrawerPhoneSuccess('')
        const { error } = await updateProfile({ phone: cleaned })
        setSavingDrawerPhone(false)
        if (error) {
            setDrawerPhoneError(error.message)
            return
        }
        setDrawerPhoneSuccess(isEn ? 'Saved to profile!' : 'บันทึกลงโปรไฟล์แล้ว')
        setTimeout(() => {
            setDrawerPhoneSuccess('')
            setShowDrawerPhoneForm(false)
        }, 1200)
    }
    const total = items.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0)
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {items.length > 0 && (
                            <button
                                type="button"
                                onClick={() => {
                                    if (window.confirm(isEn ? 'Clear all items from your cart?' : 'ต้องการล้างสินค้าในตะกร้าทั้งหมดใช่หรือไม่?')) {
                                        setCart?.({})
                                        setItemNotes?.({})
                                        setPointsToUse?.(0)
                                        localStorage.removeItem('lime-cart')
                                        localStorage.removeItem('lime-cart-notes')
                                    }
                                }}
                                style={{
                                    background: '#fee2e2',
                                    border: '1px solid #fca5a5',
                                    borderRadius: 6,
                                    padding: '5px 10px',
                                    fontSize: 12,
                                    fontWeight: 700,
                                    color: '#dc2626',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 5,
                                    transition: 'all 0.15s',
                                }}
                                title={t('clearCart')}
                            >
                                <i className="bi bi-trash3" />
                                <span>{t('clearCart')}</span>
                            </button>
                        )}
                        <button onClick={onClose} style={{ fontSize: 24, lineHeight: 1 }}>×</button>
                    </div>
                </div>
                {items.length === 0 ? (
                    <div className="drawer-empty">
                        <div style={{ textAlign: 'center', padding: '32px 16px' }}>
                            <div style={{
                                width: 80,
                                height: 80,
                                borderRadius: '50%',
                                background: 'var(--brand-accent-soft, #f0fae8)',
                                color: 'var(--brand-primary, #0c4d1d)',
                                display: 'grid',
                                placeItems: 'center',
                                margin: '0 auto 16px',
                                fontSize: 36
                            }}>
                                <i className="bi bi-cart-x"></i>
                            </div>
                            <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--brand-primary-dark, #0c2e14)', margin: '0 0 6px' }}>
                                {t('cartEmpty')}
                            </p>
                            <p style={{ fontSize: 13, color: 'var(--brand-muted, #778076)', margin: '0 0 24px', maxWidth: 260, lineHeight: 1.5 }}>
                                {isEn ? 'Explore our menu and add your favorite dishes to the cart.' : 'เลือกเมนูอร่อยที่คุณชอบและเพิ่มลงในตะกร้าได้เลย'}
                            </p>
                            <button
                                type="button"
                                className="primary"
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 8,
                                    padding: '12px 28px',
                                    fontSize: 14,
                                    borderRadius: 99
                                }}
                                onClick={() => {
                                    onClose?.()
                                    navigate('/order')
                                }}
                            >
                                <i className="bi bi-bag-plus"></i>
                                <span>{isEn ? 'Order Food' : 'สั่งอาหาร'}</span>
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="drawer-items">
                            {items.map(line => {
                                const p = line.product
                                return <div className="cart-item-ui" key={line.lineKey}>
                                    <img src={p.img} alt={p.name} className="cart-item-ui-img" />
                                    <div className="cart-item-ui-content">
                                        <div className="cart-item-ui-header">
                                            <b>{isEn && p.en ? p.en : p.name}</b>
                                            <strong>฿{line.unitPrice * line.quantity}</strong>
                                        </div>
                                        {line.selectedOptions.length > 0 && <small className="cart-item-options">{line.selectedOptions.map(option => isEn && option.nameEn ? option.nameEn : option.name).join(' · ')}</small>}
                                        <small className="cart-item-ui-price">฿{line.unitPrice} × {line.quantity}</small>
                                        <div className="cart-item-ui-actions">
                                            <input
                                                type="text"
                                                placeholder={t('notePlaceholder')}
                                                value={itemNotes[line.lineKey] || ''}
                                                onChange={e => setItemNotes?.(v => ({ ...v, [line.lineKey]: e.target.value }))}
                                                className="cart-note-input"
                                            />
                                            <div className="qty cart-qty-ui">
                                                <button onClick={() => setCart(v => ({ ...v, [line.lineKey]: Math.max(0, (v[line.lineKey] || 0) - 1) }))}>
                                                    <i className="bi bi-dash"></i>
                                                </button>
                                                <span>{line.quantity}</span>
                                                <button onClick={() => setCart(v => ({ ...v, [line.lineKey]: (v[line.lineKey] || 0) + 1 }))}>
                                                    <i className="bi bi-plus"></i>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            })}
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
                        <div style={{ margin: '8px 0 12px', padding: '10px 14px', background: 'var(--brand-surface, #fbfdfa)', border: '1px solid var(--brand-border-soft, #e5ede3)', borderRadius: 8 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                                <span style={{ fontWeight: 800, color: 'var(--brand-primary-dark)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                    <i className="bi bi-telephone-fill text-success" />
                                    {isEn ? 'Contact Phone' : 'เบอร์โทรติดต่อ'}
                                </span>
                                <button
                                    type="button"
                                    className="op-edit-btn"
                                    style={{ fontSize: 11 }}
                                    onClick={() => {
                                        if (!session) { onAuth?.(); return }
                                        setDrawerPhoneError('')
                                        setDrawerPhoneSuccess('')
                                        setDrawerPhoneInput(profile?.phone || '')
                                        setShowDrawerPhoneForm(!showDrawerPhoneForm)
                                    }}
                                >
                                    {showDrawerPhoneForm ? (isEn ? 'Cancel' : 'ยกเลิก') : (profile?.phone ? (isEn ? 'Edit' : 'แก้ไข') : (isEn ? '+ Add Phone' : '+ เพิ่มเบอร์โทร'))}
                                </button>
                            </div>
                            {!showDrawerPhoneForm ? (
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                                    <span style={{ fontSize: 13, fontWeight: profile?.phone ? 700 : 500, color: profile?.phone ? 'var(--brand-primary-dark)' : 'var(--brand-muted)' }}>
                                        {profile?.phone || (isEn ? 'No phone number yet' : 'ยังไม่ได้ระบุเบอร์โทรศัพท์')}
                                    </span>
                                    {session && (
                                        <button
                                            type="button"
                                            className="op-address-manage"
                                            style={{ margin: 0, padding: 0, fontSize: 11 }}
                                            onClick={() => { onClose?.(); navigate('/profile?tab=info') }}
                                            title={isEn ? 'Go to Profile' : 'ไปที่หน้าโปรไฟล์'}
                                        >
                                            <i className="bi bi-person-gear me-1" />{isEn ? 'Profile' : 'โปรไฟล์'}
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div style={{ marginTop: 8 }}>
                                    <div style={{ display: 'flex', gap: 6 }}>
                                        <input
                                            type="tel"
                                            value={drawerPhoneInput}
                                            onChange={e => setDrawerPhoneInput(e.target.value)}
                                            placeholder="08x-xxx-xxxx"
                                            style={{ flex: 1, padding: '7px 10px', borderRadius: 6, border: '1px solid #c2cdc1', fontSize: 12 }}
                                        />
                                        <button
                                            type="button"
                                            className="primary"
                                            style={{ padding: '7px 14px', fontSize: 12, borderRadius: 6, width: 'auto' }}
                                            onClick={saveDrawerPhone}
                                            disabled={savingDrawerPhone}
                                        >
                                            {savingDrawerPhone ? (isEn ? '...' : '...') : (isEn ? 'Save' : 'บันทึก')}
                                        </button>
                                    </div>
                                    {drawerPhoneError && <small style={{ color: '#b91c1c', fontSize: 10, display: 'block', marginTop: 3 }}>{drawerPhoneError}</small>}
                                    {drawerPhoneSuccess && <small style={{ color: '#16a34a', fontSize: 10, fontWeight: 700, display: 'block', marginTop: 3 }}><i className="bi bi-check-circle-fill me-1" />{drawerPhoneSuccess}</small>}
                                </div>
                            )}
                        </div>

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
    const { session, profile, addAddress, updateProfile, settings } = useAuth()
    const [showPhoneForm, setShowPhoneForm] = useState(false)
    const [savingPhone, setSavingPhone] = useState(false)
    const [phoneError, setPhoneError] = useState('')
    const [phoneSuccess, setPhoneSuccess] = useState('')
    const [phoneInput, setPhoneInput] = useState(profile?.phone || '')

    const openPhoneForm = () => {
        if (!session) {
            onAuth?.()
            return
        }
        setPhoneError('')
        setPhoneSuccess('')
        setPhoneInput(profile?.phone || '')
        setShowPhoneForm(current => !current)
    }

    const savePhone = async () => {
        const cleaned = phoneInput.trim()
        if (!cleaned) {
            setPhoneError(isEn ? 'Please enter a phone number' : 'กรุณากรอกเบอร์โทรศัพท์')
            return
        }
        setSavingPhone(true)
        setPhoneError('')
        setPhoneSuccess('')
        const { error } = await updateProfile({ phone: cleaned })
        setSavingPhone(false)
        if (error) {
            setPhoneError(error.message)
            return
        }
        setPhoneSuccess(isEn ? 'Saved to profile!' : 'บันทึกลงโปรไฟล์แล้ว')
        setTimeout(() => {
            setPhoneSuccess('')
            setShowPhoneForm(false)
        }, 1200)
    }
    const navigate = useNavigate()
    const cartItems = buildCartLines(cart, products)
    const total = cartItems.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0)
    const redeemRate = Number(settings?.pointsRedeemRate || 10)
    const pointsDiscount = pointsToUse > 0 ? Math.floor(pointsToUse / redeemRate) : 0
    const netTotal = Math.max(0, total - pointsDiscount)
    const count = cartItems.reduce((sum, line) => sum + line.quantity, 0)
    const savedAddresses = profile?.addresses || []
    const defaultAddress = savedAddresses.find(address => address.isDefault) || savedAddresses[0]
    const [showAddressForm, setShowAddressForm] = useState(false)
    const [savingAddress, setSavingAddress] = useState(false)
    const [addressError, setAddressError] = useState('')
    const [addressForm, setAddressForm] = useState({ label: 'บ้าน', street: '', province: 'กรุงเทพมหานคร', zip: '' })

    const add = line => setCart?.(prev => ({ ...prev, [line.lineKey]: (prev[line.lineKey] || 0) + 1 }))
    const remove = line => setCart?.(prev => ({ ...prev, [line.lineKey]: Math.max(0, (prev[line.lineKey] || 0) - 1) }))
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
            <div className="op-cart-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{t('cartTitle')}</span>
                {cartItems.length > 0 && (
                    <button
                        type="button"
                        onClick={() => {
                            if (window.confirm(isEn ? 'Clear all items from your cart?' : 'ต้องการล้างสินค้าในตะกร้าทั้งหมดใช่หรือไม่?')) {
                                setCart?.({})
                                setItemNotes?.({})
                                setPointsToUse?.(0)
                                localStorage.removeItem('lime-cart')
                                localStorage.removeItem('lime-cart-notes')
                            }
                        }}
                        style={{
                            background: '#fee2e2',
                            border: '1px solid #fca5a5',
                            borderRadius: 6,
                            padding: '4px 8px',
                            fontSize: 11,
                            fontWeight: 700,
                            color: '#dc2626',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            transition: 'all 0.15s',
                        }}
                        title={t('clearCart')}
                    >
                        <i className="bi bi-trash3" />
                        <span>{t('clearCart')}</span>
                    </button>
                )}
            </div>
            <div className="op-cart-info">
                <div className="op-cart-info-row">
                    <span><i className="bi bi-geo-alt-fill me-1 text-danger" />{isEn ? 'Delivery Address' : 'ที่อยู่จัดส่ง'}</span>
                    <button type="button" className="op-edit-btn" onClick={openAddressForm}>
                        {showAddressForm ? (isEn ? 'Cancel' : 'ยกเลิก') : (isEn ? '+ Add Address' : '+ เพิ่มที่อยู่')}
                    </button>
                </div>
                <p className={`op-addr-text ${defaultAddress ? 'has-address' : ''}`}>
                    {defaultAddress ? (() => {
                        const label = cleanAddressText(defaultAddress.label) || (isEn ? 'Address' : 'ที่อยู่')
                        const addrText = formatSavedAddress(defaultAddress)
                        return addrText ? <><b>{label}</b> — {addrText}</> : <b>{label}</b>
                    })() : (isEn ? 'Enter your delivery address' : 'กรอกที่อยู่จัดส่งของคุณ')}
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
            <div className="op-cart-info op-cart-phone">
                <div className="op-cart-info-row">
                    <span><i className="bi bi-telephone-fill me-1 text-success" />{isEn ? 'Contact Phone' : 'เบอร์โทรติดต่อ'}</span>
                    <button type="button" className="op-edit-btn" onClick={openPhoneForm}>
                        {showPhoneForm ? (isEn ? 'Cancel' : 'ยกเลิก') : (profile?.phone ? (isEn ? 'Edit' : 'แก้ไข') : (isEn ? '+ Add Phone' : '+ เพิ่มเบอร์โทร'))}
                    </button>
                </div>
                {!showPhoneForm ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 3 }}>
                        <p className={`op-addr-text ${profile?.phone ? 'has-address' : ''}`} style={{ fontWeight: profile?.phone ? 700 : 500, margin: 0 }}>
                            {profile?.phone || (isEn ? 'Enter your contact phone' : 'ยังไม่ได้ระบุเบอร์โทรศัพท์')}
                        </p>
                        {session && (
                            <button
                                type="button"
                                className="op-address-manage"
                                style={{ margin: 0, padding: 0, fontSize: 10, whiteSpace: 'nowrap' }}
                                onClick={() => navigate('/profile?tab=info')}
                                title={isEn ? 'Manage in Profile' : 'จัดการในหน้าโปรไฟล์'}
                            >
                                <i className="bi bi-person-gear me-1" />{isEn ? 'Profile' : 'โปรไฟล์'}
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="op-phone-form">
                        <div style={{ display: 'flex', gap: 6 }}>
                            <input
                                type="tel"
                                value={phoneInput}
                                onChange={event => setPhoneInput(event.target.value)}
                                placeholder="08x-xxx-xxxx"
                                autoFocus
                            />
                            <button
                                type="button"
                                className="op-address-save"
                                onClick={savePhone}
                                disabled={savingPhone}
                                style={{ width: 'auto', padding: '0 12px', margin: 0, whiteSpace: 'nowrap' }}
                            >
                                {savingPhone ? (isEn ? 'Saving...' : 'กำลังบันทึก...') : (isEn ? 'Save' : 'บันทึก')}
                            </button>
                        </div>
                        {phoneError && <small className="op-address-error">{phoneError}</small>}
                        {phoneSuccess && (
                            <small style={{ color: '#16a34a', fontWeight: 700, fontSize: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
                                <i className="bi bi-check-circle-fill" /> {phoneSuccess}
                            </small>
                        )}
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
                    {cartItems.map(line => {
                        const p = line.product
                        return <div className="cart-item-ui" key={line.lineKey}>
                            <img src={p.img} alt={p.name} className="cart-item-ui-img" />
                            <div className="cart-item-ui-content">
                                <div className="cart-item-ui-header">
                                    <b>{isEn && p.en ? p.en : p.name}</b>
                                    <strong>฿{line.unitPrice * line.quantity}</strong>
                                </div>
                                {line.selectedOptions.length > 0 && <small className="cart-item-options">{line.selectedOptions.map(option => isEn && option.nameEn ? option.nameEn : option.name).join(' · ')}</small>}
                                <small className="cart-item-ui-price">฿{line.unitPrice}</small>
                                <div className="cart-item-ui-actions">
                                    <input
                                        type="text"
                                        placeholder={t('notePlaceholder')}
                                        value={itemNotes?.[line.lineKey] || ''}
                                        onChange={e => setItemNotes?.(v => ({ ...v, [line.lineKey]: e.target.value }))}
                                        className="cart-note-input"
                                    />
                                    <div className="op-qty cart-qty-ui">
                                        <button onClick={() => remove(line)}><i className="bi bi-dash"></i></button>
                                        <span>{line.quantity}</span>
                                        <button onClick={() => add(line)}><i className="bi bi-plus"></i></button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    })}
                </div>
            )}

            {cartItems.length === 0 && (
                <div className="op-cart-empty">
                    <div style={{
                        width: 56,
                        height: 56,
                        borderRadius: '50%',
                        background: 'var(--brand-accent-soft, #f0fae8)',
                        color: 'var(--brand-primary, #0c4d1d)',
                        display: 'grid',
                        placeItems: 'center',
                        margin: '0 auto 12px',
                        fontSize: 26
                    }}>
                        <i className="bi bi-cart-x"></i>
                    </div>
                    <p style={{ margin: '0 0 14px', color: 'var(--brand-text, #2d372e)', fontWeight: 700, fontSize: 14 }}>
                        {t('cartEmpty')}
                    </p>
                    <button
                        type="button"
                        className="primary"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                            padding: '9px 22px',
                            fontSize: 13,
                            borderRadius: 99
                        }}
                        onClick={() => {
                            const searchEl = document.querySelector('.op-search-input input')
                            const menuGrid = document.querySelector('.op-menu-grid')
                            if (searchEl) {
                                searchEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
                                searchEl.focus()
                            } else if (menuGrid) {
                                menuGrid.scrollIntoView({ behavior: 'smooth', block: 'start' })
                            }
                        }}
                    >
                        <i className="bi bi-bag-plus"></i>
                        <span>{isEn ? 'Order Food' : 'สั่งอาหาร'}</span>
                    </button>
                </div>
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


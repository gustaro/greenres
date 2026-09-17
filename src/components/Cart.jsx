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


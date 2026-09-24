import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import './RoleDashboards.css'

export const money = value => new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(value || 0)
export const orderCode = order => order.orderNumber || order.orderId || order.id
export const scheduleLabel = order => order.deliveryType !== 'ให้จัดส่ง' ? order.deliveryType : order.deliveryScheduleType === 'ระบุเวลา' && order.scheduledAt ? `จัดส่ง ${new Date(order.scheduledAt).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}` : 'จัดส่งทันที'

/**
 * Normalizes payment method for Admin Overview / Reports and Summary
 * Groups all QR/PromptPay variants into a single overview label: "จ่ายด้วย QR"
 */
export function formatPaymentOverview(method) {
    if (!method) return 'ไม่ระบุ'
    const str = String(method).trim()
    if (/promptpay|คิวอาร์|qr|พร้อมเพย์/i.test(str)) {
        return 'จ่ายด้วย QR'
    }
    if (/เงินสด|cash/i.test(str)) {
        return 'เงินสด'
    }
    if (/บัตร|card|credit|edc|stripe/i.test(str)) {
        return 'บัตรเครดิต/เดบิต'
    }
    if (/ปลายทาง|cod/i.test(str)) {
        return 'ชำระเงินปลายทาง'
    }
    if (/ชำระที่ร้าน|หน้าร้าน/i.test(str)) {
        return 'ชำระที่ร้าน'
    }
    return str
}

/**
 * Formats payment method for Cashier display
 * For QR payments, displays only "QR - [REF No.]" (e.g. "QR - LL-261421")
 */
export function formatCashierPaymentMethod(method, order = null) {
    if (!method && !order) return 'ไม่ระบุ'
    const str = String(method || order?.paymentMethod || '').trim()

    // Check if it's a QR / PromptPay payment
    const isQr = /promptpay|คิวอาร์|qr|พร้อมเพย์/i.test(str) || order?.serverPaymentMethod === 'PROMPTPAY_STRIPE'
    if (isQr) {
        // Try extracting REF code from: "REF: LL-261421", "LL-261421", or order properties
        const refMatch = str.match(/REF:\s*([A-Za-z0-9_-]+)/i) || str.match(/\b(LL-\d+)\b/i)
        const refCode = refMatch ? refMatch[1] : (order?.paymentReference || order?.refCode || '')

        if (refCode) {
            return `QR - ${refCode}`
        }
        // Fallback if there's a Stripe PaymentIntent ID (e.g. pi_3U1bU...)
        const stripeMatch = str.match(/Stripe:\s*([A-Za-z0-9_]+)/i) || (order?.stripePaymentId ? [null, order.stripePaymentId] : null)
        if (stripeMatch) {
            const shortStripe = stripeMatch[1].length > 10 ? stripeMatch[1].slice(-8) : stripeMatch[1]
            return `QR - ${shortStripe}`
        }
        return 'QR'
    }

    if (/เงินสด|cash/i.test(str)) {
        return 'เงินสด'
    }
    if (/บัตร|card|credit|edc/i.test(str)) {
        const cardMatch = str.match(/(?:บัตร\s*)?(\([•\*\d\s]+\)|[•\*\d\s]{4,})/i)
        return cardMatch ? `บัตร ${cardMatch[1]}` : 'บัตรเครดิต'
    }
    if (/ปลายทาง|cod/i.test(str)) {
        return 'ชำระเงินปลายทาง'
    }
    if (/ชำระที่ร้าน|หน้าร้าน/i.test(str)) {
        return 'ชำระที่ร้าน'
    }
    return str || 'ไม่ระบุ'
}

export function StaffShell({ role, title, subtitle, tabs, active, onTab, children }) {
    const { settings, profile, session, signOut } = useAuth()
    const navigate = useNavigate()
    const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true)

    useEffect(() => {
        const handleOnline = () => setIsOnline(true)
        const handleOffline = () => setIsOnline(false)
        window.addEventListener('online', handleOnline)
        window.addEventListener('offline', handleOffline)
        return () => {
            window.removeEventListener('online', handleOnline)
            window.removeEventListener('offline', handleOffline)
        }
    }, [])

    const userName = profile?.name || session?.user?.name || session?.user?.email || 'เจ้าหน้าที่'
    const userRole = profile?.role || 'staff'
    const isAdmin = userRole === 'admin'

    const roleBadgeTitle = {
        admin: 'ผู้ดูแลระบบ (Admin)',
        cashier: 'แคชเชียร์ (Cashier)',
        kitchen: 'ห้องครัว (Kitchen)',
        delivery: 'จัดส่ง (Rider)',
    }[userRole] || userRole

    return (
        <div className={`staff-page ${role}`}>
            <header className="staff-top">
                {/* 1. Brand & Portal Identity */}
                <div className="staff-brand">
                    <Link to="/" className="staff-brand-link" title="กลับหน้าแรก">
                        {settings?.logoUrl ? (
                            <img src={settings.logoUrl} alt="Logo" className="staff-brand-img" />
                        ) : (
                            <span className="staff-brand-fallback">LL</span>
                        )}
                        <div className="staff-brand-text">
                            <b>{settings?.siteName || 'LimeLeaf'} Operations</b>
                            <span className="staff-portal-badge">{role.toUpperCase()} PORTAL</span>
                        </div>
                    </Link>
                </div>

                {/* 2. Station Title & Subtitle */}
                <div className="staff-header-center">
                    <h1 className="staff-header-title">{title}</h1>
                    {subtitle && <p className="staff-subtitle">{subtitle}</p>}
                </div>

                {/* 3. Quick Navigation Station Switcher */}
                <nav className="staff-quick-nav" aria-label="สลับหน้าที่รับผิดชอบ">
                    <Link to="/" className="staff-quick-btn" title="กลับหน้าแรก">
                        <i className="bi bi-house-door"></i>
                        <span>หน้าหลัก</span>
                    </Link>
                    {(isAdmin || userRole === 'cashier') && role !== 'cashier' && (
                        <Link to="/cashier" className="staff-quick-btn" title="แคชเชียร์">
                            <i className="bi bi-cash-coin"></i>
                            <span>แคชเชียร์</span>
                        </Link>
                    )}
                    {(isAdmin || userRole === 'kitchen') && role !== 'kitchen' && (
                        <Link to="/kitchen" className="staff-quick-btn" title="ครัว">
                            <i className="bi bi-fire"></i>
                            <span>ครัว</span>
                        </Link>
                    )}
                    {(isAdmin || userRole === 'delivery') && role !== 'delivery' && (
                        <Link to="/delivery" className="staff-quick-btn" title="จัดส่ง">
                            <i className="bi bi-bicycle"></i>
                            <span>จัดส่ง</span>
                        </Link>
                    )}
                    {isAdmin && role !== 'admin' && (
                        <Link to="/admin" className="staff-quick-btn" title="แอดมิน">
                            <i className="bi bi-speedometer2"></i>
                            <span>แอดมิน</span>
                        </Link>
                    )}
                </nav>

                {/* 4. User Profile & Logout */}
                <div className="staff-user-badge">
                    <div className="staff-avatar-wrap">
                        {profile?.avatarUrl ? (
                            <img src={profile.avatarUrl} alt={userName} className="staff-avatar-img" />
                        ) : (
                            <span className="staff-avatar-letter">{userName.charAt(0).toUpperCase()}</span>
                        )}
                        <span className={`staff-avatar-status ${isOnline ? 'online' : 'offline'}`} title={isOnline ? 'ออนไลน์' : 'ออฟไลน์'} />
                    </div>
                    <div className="staff-user-info">
                        <span className="staff-user-name" title={userName}>{userName}</span>
                        <small className="staff-user-role">{roleBadgeTitle}</small>
                    </div>
                    <button
                        type="button"
                        onClick={async () => {
                            await signOut()
                            navigate('/')
                        }}
                        className="staff-logout-btn"
                        title="ออกจากระบบ"
                        aria-label="ออกจากระบบ"
                    >
                        <i className="bi bi-box-arrow-right"></i>
                    </button>
                </div>
            </header>

            <nav className="staff-tabs" aria-label="แท็บเมนูการดำเนินงาน">
                <div className="staff-tabs-list">
                    {tabs.map(t => (
                        <button key={t.key || t.tab} className={active === (t.key || t.tab) ? 'active' : ''} onClick={() => onTab(t.key || t.tab)}>
                            <i className={`bi ${t.icon}`}></i>
                            <span>{t.label}</span>
                            {t.count > 0 && <b className="staff-tab-count">{t.count}</b>}
                        </button>
                    ))}
                </div>

                <div className="staff-tabs-right">
                    <span className={`staff-live ${isOnline ? 'online' : 'offline'}`} title={isOnline ? 'สถานะ: ออนไลน์' : 'สถานะ: ออฟไลน์'}>
                        <i />
                        <span className="staff-live-text">{isOnline ? 'ออนไลน์' : 'ออฟไลน์'}</span>
                        <span className="staff-live-subtext">{isOnline ? ' (Online)' : ' (Offline)'}</span>
                    </span>
                </div>
            </nav>
            <main className="staff-content">{children}</main>
        </div>
    )
}

export function groupOrderItems(rawItems = []) {
    const groups = []
    const items = Array.isArray(rawItems) ? rawItems : []
    items.forEach(item => {
        const rawName = item.productName || item.product?.name || 'สินค้า'
        const isTakeaway = Boolean(item.isTakeaway || (item.note && item.note.includes('[กลับบ้าน]')))
        const cleanNote = (item.cleanNote || (item.note || '').replace(/\[กลับบ้าน\]\s*/g, '')).trim()
        const displayName = isTakeaway ? `${rawName} (กลับบ้าน)` : rawName
        const unitPrice = Number(item.priceAtTime || item.unitPrice || item.product?.price || 0)
        const qty = Number(item.quantity || 1)

        const existing = groups.find(g =>
            g.displayName === displayName &&
            g.cleanNote === cleanNote &&
            Math.abs(g.unitPrice - unitPrice) < 0.01
        )

        if (existing) {
            existing.quantity += qty
            existing.totalPrice += unitPrice * qty
        } else {
            groups.push({
                id: item.id || item.productId || `${displayName}_${cleanNote}_${groups.length}`,
                productId: item.productId,
                rawName,
                displayName,
                isTakeaway,
                cleanNote,
                unitPrice,
                quantity: qty,
                totalPrice: unitPrice * qty,
            })
        }
    })
    return groups
}

export function OrderItems({ order }) {
    const items = groupOrderItems(order?.items)
    return (
        <ul className="staff-order-items">
            {items.map(item => (
                <li key={item.id || (item.displayName + '_' + item.cleanNote)}>
                    <span>
                        {item.displayName} <small>× {item.quantity}</small>
                        {item.cleanNote && (
                            <small style={{ display: 'block', color: '#666', fontSize: 11 }}>
                                {item.cleanNote}
                            </small>
                        )}
                    </span>
                    <b>{money(item.totalPrice)}</b>
                </li>
            ))}
        </ul>
    )
}

export function Empty({ text }) {
    return (
        <div className="staff-empty">
            <i className="bi bi-check-circle" style={{ fontSize: 40, marginBottom: 15, color: '#9dc59c', display: 'block', fontStyle: 'normal' }}></i>
            <h3>เรียบร้อยทั้งหมด</h3>
            <p>{text}</p>
        </div>
    )
}

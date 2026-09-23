import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import './RoleDashboards.css'

export const money = value => new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(value || 0)
export const orderCode = order => order.orderNumber || order.orderId || order.id
export const scheduleLabel = order => order.deliveryType !== 'ให้จัดส่ง' ? order.deliveryType : order.deliveryScheduleType === 'ระบุเวลา' && order.scheduledAt ? `จัดส่ง ${new Date(order.scheduledAt).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}` : 'จัดส่งทันที'

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
                <div className="staff-brand">
                    {settings?.logoUrl ? (
                        <img src={settings.logoUrl} alt="Logo" style={{ width: 38, height: 38, objectFit: 'contain', borderRadius: 8, background: '#fff', padding: 2 }} />
                    ) : (
                        <span>LL</span>
                    )}
                    <div>
                        <b>{settings?.siteName || 'LimeLeaf'} Operations</b>
                        <small>{role.toUpperCase()} PORTAL</small>
                    </div>
                </div>

                <div className="staff-header-center">
                    <h1 style={{ margin: 0, fontSize: 20, color: '#fff', fontWeight: 800 }}>{title}</h1>
                    <p className="staff-subtitle" style={{ margin: '2px 0 0', fontSize: 12 }}>{subtitle}</p>
                </div>

                <div className="staff-header-right" style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    {/* Navigation Quick Links for Staff/Admin */}
                    <div className="staff-quick-nav" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <Link to="/" className="staff-quick-btn" title="กลับหน้าแรก">
                            <i className="bi bi-house-door"></i> หน้าหลัก
                        </Link>
                        {(isAdmin || userRole === 'cashier') && role !== 'cashier' && (
                            <Link to="/cashier" className="staff-quick-btn" title="แคชเชียร์">
                                <i className="bi bi-cash-coin"></i> แคชเชียร์
                            </Link>
                        )}
                        {(isAdmin || userRole === 'kitchen') && role !== 'kitchen' && (
                            <Link to="/kitchen" className="staff-quick-btn" title="ครัว">
                                <i className="bi bi-fire"></i> ครัว
                            </Link>
                        )}
                        {(isAdmin || userRole === 'delivery') && role !== 'delivery' && (
                            <Link to="/delivery" className="staff-quick-btn" title="จัดส่ง">
                                <i className="bi bi-bicycle"></i> จัดส่ง
                            </Link>
                        )}
                        {isAdmin && role !== 'admin' && (
                            <Link to="/admin" className="staff-quick-btn" title="แอดมิน">
                                <i className="bi bi-speedometer2"></i> แอดมิน
                            </Link>
                        )}
                    </div>

                    {/* User Profile Avatar & Name */}
                    <div className="staff-user-badge" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 10px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: 24, border: '1px solid rgba(255, 255, 255, 0.15)' }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#b8ff35', color: '#075c1b', fontWeight: 800, fontSize: 13, display: 'grid', placeItems: 'center', overflow: 'hidden' }}>
                            {profile?.avatarUrl ? (
                                <img src={profile.avatarUrl} alt={userName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                userName.charAt(0).toUpperCase()
                            )}
                        </div>
                        <div style={{ textAlign: 'left', lineHeight: 1.2 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', maxWidth: 110, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {userName}
                            </div>
                            <small style={{ fontSize: 9, color: '#9db7a5', display: 'block' }}>{roleBadgeTitle}</small>
                        </div>
                        <button
                            type="button"
                            onClick={async () => {
                                await signOut()
                                navigate('/')
                            }}
                            title="ออกจากระบบ"
                            style={{ border: 0, background: 'transparent', color: '#fca5a5', cursor: 'pointer', padding: 2, fontSize: 14, marginLeft: 4 }}
                        >
                            <i className="bi bi-box-arrow-right"></i>
                        </button>
                    </div>
                </div>
            </header>

            <nav className="staff-tabs">
                <div className="staff-tabs-list">
                    {tabs.map(t => (
                        <button key={t.key || t.tab} className={active === (t.key || t.tab) ? 'active' : ''} onClick={() => onTab(t.key || t.tab)}>
                            <i className={`bi ${t.icon}`}></i>{t.label}{t.count > 0 && <b>{t.count}</b>}
                        </button>
                    ))}
                </div>

                <div className="staff-tabs-right">
                    <span className={`staff-live ${isOnline ? 'online' : 'offline'}`} title={isOnline ? 'สถานะ: ออนไลน์' : 'สถานะ: ออฟไลน์'}>
                        <i />
                        {isOnline ? 'ออนไลน์ (Online)' : 'ออฟไลน์ (Offline)'}
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

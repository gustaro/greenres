import { useAuth } from '../lib/AuthContext'
import './RoleDashboards.css'

export const money = value => new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(value || 0)
export const orderCode = order => order.orderNumber || order.orderId || order.id
export const scheduleLabel = order => order.deliveryType !== 'ให้จัดส่ง' ? order.deliveryType : order.deliveryScheduleType === 'ระบุเวลา' && order.scheduledAt ? `จัดส่ง ${new Date(order.scheduledAt).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}` : 'จัดส่งทันที'

export function StaffShell({ role, title, subtitle, tabs, active, onTab, children }) {
    const { settings } = useAuth();
    return <div className={`staff-page ${role}`}>
        <header className="staff-top"><div className="staff-brand">{settings?.logoUrl ? <img src={settings.logoUrl} alt="Logo" style={{ width: 36, height: 36, objectFit: 'contain', borderRadius: 6 }} /> : <span>LL</span>}<div><b>{settings?.siteName || 'LimeLeaf'} Operations</b><small>{role.toUpperCase()} PORTAL</small></div></div><div><h1>{title}</h1><p>{subtitle}</p></div><span className="staff-live"><i /> LIVE</span></header>
        <nav className="staff-tabs">{tabs.map(t => <button key={t.key || t.tab} className={active === (t.key || t.tab) ? 'active' : ''} onClick={() => onTab(t.key || t.tab)}><i className={`bi ${t.icon}`}></i>{t.label}{t.count > 0 && <b>{t.count}</b>}</button>)}</nav>
        <main className="staff-content">{children}</main>
    </div>
}

export function OrderItems({ order }) {
    const items = Array.isArray(order.items) ? order.items : []
    return <ul className="staff-order-items">{items.map(item => <li key={item.id || item.productId}><span>{item.productName || item.product?.name || 'สินค้า'} <small>× {item.quantity}</small></span><b>{money(Number(item.priceAtTime || item.unitPrice || 0) * Number(item.quantity || 0))}</b></li>)}</ul>
}

export function Empty({ text }) { return <div className="staff-empty"><i className="bi bi-check-circle" style={{ fontSize: 40, marginBottom: 15, color: '#9dc59c', display: 'block', fontStyle: 'normal' }}></i><h3>เรียบร้อยทั้งหมด</h3><p>{text}</p></div> }

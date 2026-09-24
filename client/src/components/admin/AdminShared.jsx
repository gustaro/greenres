export const PAGE_LINK_OPTIONS = [
    { value: '/order', label: 'หน้าสั่งอาหารทั้งหมด (/order)' },
    { value: '/order?category=recommended', label: 'เมนูแนะนำ (/order?category=recommended)' },
    { value: '/order?category=drinks', label: 'เครื่องดื่ม (/order?category=drinks)' },
    { value: '/order?category=desserts', label: 'ของหวาน (/order?category=desserts)' },
    { value: '/profile', label: 'โปรไฟล์และประวัติการสั่ง (/profile)' },
    { value: '/#deals', label: 'ดีลและโปรโมชั่นพิเศษ (/#deals)' },
    { value: '/cashier', label: 'พอร์ทัลแคชเชียร์ (/cashier)' },
    { value: '/kitchen', label: 'พอร์ทัลห้องครัว (/kitchen)' },
    { value: '/delivery', label: 'พอร์ทัลจัดส่งไรเดอร์ (/delivery)' },
]

export const roleNames = {
    customer: 'ลูกค้า',
    cashier: 'แคชเชียร์ / STAFF',
    kitchen: 'ครัว',
    admin: 'แอดมิน',
    delivery: 'ไรเดอร์ / จัดส่ง',
}

export { formatPaymentOverview, formatCashierPaymentMethod } from '../StaffShared'

export const money = value => new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(value || 0)

export function PageHead({ eyebrow, title, description, children }) {
    return (
        <div className="admin-page-head">
            <div>
                <span>{eyebrow}</span>
                <h1>{title}</h1>
                <p>{description}</p>
            </div>
            {children && <div className="admin-page-actions">{children}</div>}
        </div>
    )
}

export function Empty({ children }) {
    return (
        <div className="admin-empty">
            <i className="bi bi-circle"></i>
            <p>{children}</p>
        </div>
    )
}

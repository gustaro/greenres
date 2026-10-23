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
    staff: 'แคชเชียร์ / STAFF',
    kitchen: 'ครัว',
    admin: 'แอดมิน',
    delivery: 'ไรเดอร์ / จัดส่ง',
    rider: 'ไรเดอร์ / จัดส่ง',
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

function AdminConfirmDialog({ request, onResolve }) {
    useEffect(() => {
        const handleKeyDown = event => {
            if (event.key === 'Escape') onResolve(false)
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [onResolve])

    return (
        <div className="admin-confirm-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && onResolve(false)}>
            <section className="admin-confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="admin-confirm-title" aria-describedby="admin-confirm-message">
                <span className="admin-confirm-icon"><i className="bi bi-exclamation-triangle-fill" /></span>
                <div><h3 id="admin-confirm-title">{request.title || 'ยืนยันการทำรายการ'}</h3><p id="admin-confirm-message">{request.message}</p></div>
                <footer>
                    <button type="button" className="admin-secondary" onClick={() => onResolve(false)}>ยกเลิก</button>
                    <button type="button" className={request.danger === false ? 'admin-primary' : 'admin-danger'} onClick={() => onResolve(true)} autoFocus>{request.confirmLabel || 'ยืนยัน'}</button>
                </footer>
            </section>
        </div>
    )
}

export function useAdminConfirm() {
    const [request, setRequest] = useState(null)
    const confirm = useCallback((message, options = {}) => new Promise(resolve => {
        setRequest({ message, resolve, ...options })
    }), [])
    const resolveConfirm = useCallback(result => {
        setRequest(current => {
            current?.resolve(result)
            return null
        })
    }, [])
    return { confirm, isConfirming: Boolean(request), confirmDialog: request ? <AdminConfirmDialog request={request} onResolve={resolveConfirm} /> : null }
}

export function useAdminModalFocus(isOpen, onClose, blocked = false) {
    const modalRef = useRef(null)
    const closeRef = useRef(onClose)
    const blockedRef = useRef(blocked)
    useEffect(() => { closeRef.current = onClose }, [onClose])
    useEffect(() => { blockedRef.current = blocked }, [blocked])
    useEffect(() => {
        if (!isOpen) return undefined
        const previousFocus = document.activeElement
        const previousOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        window.requestAnimationFrame(() => {
            modalRef.current?.querySelector('input, select, textarea, button, [tabindex]:not([tabindex="-1"])')?.focus()
        })
        const handleKeyDown = event => {
            if (event.key === 'Escape' && !blockedRef.current) closeRef.current?.()
            if (event.key !== 'Tab' || !modalRef.current) return
            const focusable = [...modalRef.current.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])')]
            if (!focusable.length) return
            const first = focusable[0]
            const last = focusable[focusable.length - 1]
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
            if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => {
            window.removeEventListener('keydown', handleKeyDown)
            document.body.style.overflow = previousOverflow
            previousFocus?.focus?.()
        }
    }, [isOpen])
    return modalRef
}
import { useCallback, useEffect, useRef, useState } from 'react'

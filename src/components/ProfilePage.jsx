import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Navbar } from './Navbar'
import { useAuth } from '../lib/AuthContext'
import { cancelOwnOrder, fetchOrderHistory } from '../lib/database'
import { api } from '../lib/api'
import { MapLocationPicker } from './MapLocationPicker'
import 'bootstrap-icons/font/bootstrap-icons.css'
import './ProfilePage.css'

const MENU = [
    { key: 'info', icon: <i className="bi bi-person" style={{ fontSize: 18, verticalAlign: 'middle' }} />, label: 'ข้อมูลส่วนตัว' },
    { key: 'orders', icon: <i className="bi bi-receipt" style={{ fontSize: 18, verticalAlign: 'middle' }} />, label: 'ประวัติการสั่งซื้อ' },
    { key: 'address', icon: <i className="bi bi-geo-alt" style={{ fontSize: 18, verticalAlign: 'middle' }} />, label: 'ที่อยู่ของฉัน' },
]
const money = value => new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(value || 0)

export function ProfilePage() {
    const { session, profile, loading, updateProfile, signOut } = useAuth()
    const navigate = useNavigate()

    const [tab, setTab] = useState('info')
    const [name, setName] = useState('')
    const [phone, setPhone] = useState('')
    const [addresses, setAddresses] = useState([])
    const [newAddrLabel, setNewAddrLabel] = useState('')
    const [newAddrPhone, setNewAddrPhone] = useState('')
    const [newAddrStreet, setNewAddrStreet] = useState('')
    const [newAddrProvince, setNewAddrProvince] = useState('')
    const [newAddrZip, setNewAddrZip] = useState('')
    const [saving, setSaving] = useState(false)
    const [toast, setToast] = useState('')
    const [orders, setOrders] = useState([])
    const [activityLoading, setActivityLoading] = useState(false)

    // Redirect if not logged in
    useEffect(() => {
        if (!loading && !session) navigate('/')
    }, [loading, session])

    // Populate fields from profile
    useEffect(() => {
        if (profile) {
            setName(profile.name ?? '')
            setPhone(profile.phone ?? '')
            setAddresses(profile.addresses ?? [])
        }
    }, [profile])

    useEffect(() => {
        if (!session) return undefined
        let active = true
        const loadActivity = async () => {
            if (active) setActivityLoading(true)
            const orderResult = await fetchOrderHistory().catch(() => [])
            if (active) {
                setOrders(orderResult.slice().reverse())
                setActivityLoading(false)
            }
        }
        loadActivity()
        const timer = window.setInterval(() => fetchOrderHistory().then(orderResult => {
            if (active) setOrders(orderResult.slice().reverse())
        }).catch(() => { }), 30000)
        return () => { active = false; window.clearInterval(timer) }
    }, [session])

    const showToast = (msg) => {
        setToast(msg)
        setTimeout(() => setToast(''), 2800)
    }

    const handleSave = async () => {
        setSaving(true)
        const { error } = await updateProfile({ name, phone })
        setSaving(false)
        if (error) showToast('❌ บันทึกไม่สำเร็จ: ' + error.message)
        else showToast('✅ บันทึกสำเร็จแล้ว!')
    }

    const handleLogout = async () => {
        await signOut()
        navigate('/')
    }

    const addAddress = async () => {
        if (!newAddrStreet.trim()) return
        try {
            const rawLabel = newAddrLabel.trim() || 'ที่อยู่'
            const fullStreet = `${newAddrStreet} ${newAddrProvince} ${newAddrZip}`.trim()

            const added = await api('/users/addresses', {
                method: 'POST',
                body: JSON.stringify({ label: rawLabel, street: fullStreet, city: '', state: newAddrProvince, zip: newAddrZip, phone: newAddrPhone, isDefault: true })
            })
            setAddresses(p => [...p, added])
            setNewAddrLabel('')
            setNewAddrPhone('')
            setNewAddrStreet('')
            setNewAddrProvince('')
            setNewAddrZip('')
            showToast('✅ เพิ่มที่อยู่สำเร็จ')
        } catch (error) {
            showToast('❌ ขัดข้อง: ' + error.message)
        }
    }

    const removeAddress = async (id, index) => {
        try {
            if (id) await api(`/users/addresses/${id}`, { method: 'DELETE' })
            setAddresses(p => p.filter((_, j) => j !== index))
            showToast('✅ ลบที่อยู่สำเร็จ')
        } catch (error) {
            showToast('❌ ลบที่อยู่ไม่สำเร็จ: ' + error.message)
        }
    }

    const cancelOrder = async order => {
        if (!window.confirm(`ยืนยันยกเลิกออเดอร์ ${order.orderNumber || order.id}?`)) return
        try {
            await cancelOwnOrder(order.id)
            setOrders(current => current.map(item => item.id === order.id ? { ...item, foodStatus: 'ยกเลิก' } : item))
            showToast('✅ ยกเลิกออเดอร์และคืนสต๊อกแล้ว')
        } catch (error) { showToast(`❌ ${error.message}`) }
    }

    const orderSteps = order => order.deliveryType === 'ให้จัดส่ง'
        ? ['รอยืนยัน', 'รอครัว', 'กำลังทำ', 'รอไรเดอร์', 'พร้อมจัดส่ง', 'กำลังจัดส่ง', 'ถึงปลายทาง', 'จัดส่งเสร็จสิ้น']
        : ['รอยืนยัน', 'รอครัว', 'กำลังทำ', 'ทำเสร็จแล้ว', 'เสร็จสิ้น']

    if (loading) return <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', fontSize: 28 }}>⏳</div>

    const initial = (profile?.name ?? session?.user?.email ?? '?')[0].toUpperCase()

    return (
        <div className="profile-page">
            <Navbar
                user={profile}
                onOrder={() => navigate('/order')}
                onAuth={() => { }}
                onLogout={handleLogout}
                cartCount={0}
                onCart={() => { }}
                breadcrumbs={[
                    { label: 'My Profile', to: '/profile' },
                    { label: MENU.find(m => m.key === tab)?.label ?? 'โปรไฟล์' }
                ]}
            />

            <div className="profile-wrap">
                {/* ── Sidebar ── */}
                <aside className="profile-sidebar">
                    <div className="sidebar-avatar-block">
                        <div className="sidebar-avatar">
                            <div className="sidebar-avatar-placeholder">{initial}</div>
                        </div>

                        <div className="sidebar-user-info">
                            <strong>{profile?.name ?? 'Guest'}</strong>
                            <small>{session?.user?.email}</small>
                            {profile?.points !== undefined && <div style={{ fontSize: 12, color: '#0f9e1e', fontWeight: 700, marginTop: 4 }}>★ {profile.points} แต้ม</div>}
                        </div>
                    </div>

                    <nav className="sidebar-nav">
                        {MENU.map(m => (
                            <button
                                key={m.key}
                                className={`sidebar-nav-item ${tab === m.key ? 'active' : ''}`}
                                onClick={() => setTab(m.key)}
                            >
                                <span className="nav-icon">{m.icon}</span>
                                {m.label}
                            </button>
                        ))}
                    </nav>

                    <button className="sidebar-logout-btn" onClick={handleLogout}>ออกจากระบบ</button>
                </aside>

                {/* ── Main Content ── */}
                <main className="profile-content">
                    {tab === 'info' && (
                        <>
                            <h2>ข้อมูลส่วนตัว</h2>

                            <p className="pf-section-title">ชื่อ - นามสกุล</p>
                            <div className="pf-grid">
                                <div className="pf-field">
                                    <label>ชื่อ (หรือ นามสกุลด้วยเว้นวรรค)</label>
                                    <input value={name} onChange={e => setName(e.target.value)} placeholder="ชื่อ นามสกุล" />
                                </div>
                            </div>

                            <button className="pf-save-btn" onClick={handleSave} disabled={saving}>
                                {saving ? 'กำลังบันทึก...' : 'บันทึก'}
                            </button>
                        </>
                    )}

                    {tab === 'address' && (
                        <>
                            <h2>ที่อยู่ของฉัน</h2>
                            {addresses.length === 0 && <p style={{ color: '#aaa', fontSize: 13, marginBottom: 16 }}>ยังไม่มีที่อยู่บันทึกไว้</p>}
                            {addresses.map((addr, i) => (
                                <div className="addr-card" key={i}>
                                    <span>📍 {addr.street || addr}</span>
                                    <button className="addr-del" onClick={() => removeAddress(addr.id, i)}>ลบ</button>
                                </div>
                            ))}
                            <div style={{ marginTop: 25, display: 'grid', gap: 10 }}>
                                <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>เพิ่มที่อยู่ใหม่ (ลากหมุดเพื่อดึงข้อมูลอัตโนมัติ)</p>
                                <MapLocationPicker onLocationSelect={(obj) => {
                                    setNewAddrStreet(obj.street)
                                    setNewAddrProvince(obj.province)
                                    setNewAddrZip(obj.zip)
                                }} />
                                <div className="ad-address-form">
                                    <div className="ad-address-row">
                                        <input
                                            placeholder="ชื่อที่จะบันทึก (เช่น บ้าน, ที่ทำงาน)"
                                            value={newAddrLabel}
                                            onChange={e => setNewAddrLabel(e.target.value)}
                                        />
                                        <input
                                            placeholder="เบอร์โทรติดต่อ"
                                            value={newAddrPhone}
                                            onChange={e => setNewAddrPhone(e.target.value)}
                                        />
                                    </div>
                                    <textarea
                                        placeholder="บ้านเลขที่, ซอย, ถนน หรือรายละเอียดเพิ่มเติม"
                                        value={newAddrStreet}
                                        onChange={e => setNewAddrStreet(e.target.value)}
                                        rows={2}
                                    />
                                    <div className="ad-address-row">
                                        <input placeholder="จังหวัด" value={newAddrProvince} onChange={e => setNewAddrProvince(e.target.value)} />
                                        <input placeholder="รหัสไปรษณีย์" value={newAddrZip} onChange={e => setNewAddrZip(e.target.value)} />
                                    </div>
                                    <button className="ad-address-submit" onClick={addAddress}>+ บันทึกที่อยู่ใหม่</button>
                                </div>
                            </div>
                        </>
                    )}

                    {tab === 'orders' && <>
                        <div className="pf-content-head"><div><h2>ประวัติและติดตามคำสั่งซื้อ</h2><p>ตรวจสอบสถานะล่าสุดของทุกออเดอร์</p></div><button onClick={() => navigate('/order')}>สั่งอาหารเพิ่ม</button></div>
                        {activityLoading && <p className="pf-muted">กำลังโหลดรายการ...</p>}
                        {!activityLoading && orders.length === 0 && <div className="pf-activity-empty">ยังไม่มีประวัติการสั่งซื้อ</div>}
                        <div className="pf-order-list">{orders.map(order => {
                            const steps = orderSteps(order); const currentStep = steps.indexOf(order.foodStatus)
                            return <article key={order.id} className={order.foodStatus === 'ยกเลิก' ? 'cancelled' : ''}>
                                <header><div><small>{new Date(order.createdAt).toLocaleString('th-TH')}</small><h3>{order.orderNumber || order.id}</h3></div><div><i>{order.foodStatus}</i><strong>{money(order.totalAmount)}</strong></div></header>
                                <p>{order.deliveryType}{order.deliveryScheduleType === 'ระบุเวลา' && order.scheduledAt ? ` · ${new Date(order.scheduledAt).toLocaleString('th-TH')}` : ''}{order.promotionCode ? ` · โค้ด ${order.promotionCode}` : ''}</p>
                                <ul>{order.items.map(item => <li key={item.id}><span>{item.productName} × {item.quantity}</span><b>{money(item.priceAtTime * item.quantity)}</b></li>)}</ul>
                                {order.foodStatus === 'ยกเลิก' ? <div className="pf-cancelled">ออเดอร์นี้ถูกยกเลิกแล้ว</div> : <div className="pf-tracking">{steps.map((step, index) => <div key={step} className={index <= currentStep ? 'done' : ''}><span>{index < currentStep ? '✓' : index + 1}</span><small>{step}</small></div>)}</div>}
                                {order.foodStatus === 'รอยืนยัน' && !order.isPaid && <button className="pf-cancel-order" onClick={() => cancelOrder(order)}>ยกเลิกคำสั่งซื้อ</button>}
                            </article>
                        })}</div>
                    </>}
                </main>
            </div>

            {toast && <div className="pf-toast">{toast}</div>}
        </div>
    )
}

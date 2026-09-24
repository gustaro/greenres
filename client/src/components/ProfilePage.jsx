import { useEffect, useState, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Navbar } from './Navbar'
import { useAuth } from '../lib/AuthContext'
import { useLanguage } from '../lib/LanguageContext'
import { hasSessionToken } from '../lib/api'
import { cancelOwnOrder, fetchOrderHistory, normalizeRole, getRoleDashboardPath } from '../lib/database'
import { embedCoordinates, cacheAddressCoordinates } from '../lib/geo'
import { ProfileInfoTab } from './profile/ProfileInfoTab'
import { ProfileAddressTab } from './profile/ProfileAddressTab'
import { ProfileOrdersTab } from './profile/ProfileOrdersTab'
import { ProfilePointsTab } from './profile/ProfilePointsTab'
import 'bootstrap-icons/font/bootstrap-icons.css'
import './ProfilePage.css'

const money = value => new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(value || 0)

export function ProfilePage({
    onCart,
    cartCount = 0,
    onAuth,
    onOrder,
} = {}) {
    const { session, profile, loading, updateProfile, signOut, uploadAvatar, addAddress: addSavedAddress, deleteAddress, refreshProfile, settings } = useAuth()
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const { isEn, t } = useLanguage()

    const [tab, setTab] = useState(() => searchParams.get('tab') === 'address' ? 'address' : 'info')
    const [name, setName] = useState('')
    const [phone, setPhone] = useState('')
    const [birthday, setBirthday] = useState('')
    const [gender, setGender] = useState('')
    const [saving, setSaving] = useState(false)
    const [toast, setToast] = useState('')
    const [orders, setOrders] = useState([])
    const [activityLoading, setActivityLoading] = useState(false)
    const [uploadingAvatar, setUploadingAvatar] = useState(false)
    const [cancellingOrderId, setCancellingOrderId] = useState(null)

    // Redirect if not logged in
    useEffect(() => {
        if (!loading && !session) navigate('/')
    }, [loading, session])

    const handleAvatarUpload = async (file) => {
        if (!file) return
        setUploadingAvatar(true)
        const { error } = await uploadAvatar(file)
        setUploadingAvatar(false)
        if (error) {
            showToast(isEn ? 'Failed to upload photo: ' + error.message : 'อัพโหลดรูปภาพไม่สำเร็จ: ' + error.message, 'error')
        } else {
            showToast(isEn ? 'Profile photo updated!' : 'อัพเดทรูปโปรไฟล์เรียบร้อยแล้ว!', 'success')
        }
    }

    // Populate fields from profile
    useEffect(() => {
        if (profile) {
            setName(profile.name ?? '')
            setPhone(profile.phone ?? '')
            setBirthday(profile.birthday ?? profile.dateOfBirth ?? '')
            setGender(profile.gender ?? '')
        }
    }, [profile])

    useEffect(() => {
        if (searchParams.get('tab') === 'address') setTab('address')
    }, [searchParams])

    const userId = session?.user?.id

    useEffect(() => {
        if (!userId) return undefined
        let active = true
        const sortOrdersLatestFirst = (list) => {
            return (list || []).slice().sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
        }
        const loadActivity = async () => {
            if (active) setActivityLoading(true)
            try {
                await refreshProfile?.().catch(() => { })
                const orderResult = await fetchOrderHistory().catch(() => [])
                if (active) {
                    setOrders(sortOrdersLatestFirst(orderResult))
                }
            } finally {
                if (active) {
                    setActivityLoading(false)
                }
            }
        }
        loadActivity()
        const timer = window.setInterval(() => {
            refreshProfile?.().catch(() => { })
            fetchOrderHistory().then(orderResult => {
                if (active) setOrders(sortOrdersLatestFirst(orderResult))
            }).catch(() => { })
        }, 30000)
        return () => { active = false; window.clearInterval(timer) }
    }, [userId, refreshProfile])

    const earnRate = Number(settings?.pointsEarnRate || 10)
    const netDeliveredPoints = useMemo(() => {
        let earned = 0
        let used = 0
        for (const order of orders || []) {
            if (order.foodStatus === 'ยกเลิก' || order.status === 'CANCELLED') continue
            const isCompleted = ['จัดส่งเสร็จสิ้น', 'ทำเสร็จแล้ว', 'เสร็จสิ้น'].includes(order.foodStatus) || order.status === 'DELIVERED'
            if (isCompleted) {
                const total = Number(order.totalAmount || order.total || 0)
                earned += Math.floor(total / earnRate)
            }
            const usedPts = Number(order.pointsUsed || order.meta?.pointsUsed || 0)
            if (usedPts > 0) {
                used += usedPts
            }
        }
        return Math.max(0, earned - used)
    }, [orders, earnRate])

    const displayPoints = Math.max(Number(profile?.points || 0), netDeliveredPoints)

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type })
        setTimeout(() => setToast(null), 2800)
    }

    const handleSave = async () => {
        setSaving(true)
        const { error } = await updateProfile({ name, phone, birthday, gender })
        setSaving(false)
        if (error) showToast('บันทึกไม่สำเร็จ: ' + error.message, 'error')
        else showToast('บันทึกสำเร็จแล้ว!', 'success')
    }

    const handleLogout = async () => {
        await signOut()
        navigate('/')
    }

    const addAddress = async ({ label, phone, street, province, zip, lat, lng }) => {
        if (!street?.trim()) return false
        const streetWithGeo = (lat != null && lng != null)
            ? embedCoordinates(street, { lat, lng })
            : street
        const { data, error } = await addSavedAddress({ label, phone, street: streetWithGeo, province, zip, isDefault: true })
        if (error) {
            showToast(isEn ? 'Failed: ' + error.message : 'ขัดข้อง: ' + error.message, 'error')
            return false
        }
        if (data?.id && lat != null && lng != null) {
            cacheAddressCoordinates(data.id, { lat, lng })
        }
        showToast(isEn ? 'Address added successfully' : 'เพิ่มที่อยู่สำเร็จ', 'success')
        return true
    }

    const removeAddress = async id => {
        const { error } = await deleteAddress(id)
        if (error) showToast('ลบที่อยู่ไม่สำเร็จ: ' + error.message, 'error')
        else showToast('ลบที่อยู่สำเร็จ', 'success')
    }

    const cancelOrder = async order => {
        if (!window.confirm(`ยืนยันยกเลิกออเดอร์ ${order.orderNumber || order.id}?`)) return
        setCancellingOrderId(order.id)
        try {
            await cancelOwnOrder(order.id)
            setOrders(current => current.map(item => item.id === order.id ? { ...item, foodStatus: 'ยกเลิก' } : item))
            showToast('ยกเลิกออเดอร์และคืนสต๊อกแล้ว', 'success')
        } catch (error) {
            showToast(error.message, 'error')
        } finally {
            setCancellingOrderId(null)
        }
    }

    const orderSteps = order => order.deliveryType === 'ให้จัดส่ง'
        ? ['รอยืนยัน', 'รอครัว', 'กำลังทำ', 'รอไรเดอร์', 'พร้อมจัดส่ง', 'กำลังจัดส่ง', 'ถึงปลายทาง', 'จัดส่งเสร็จสิ้น']
        : ['รอยืนยัน', 'รอครัว', 'กำลังทำ', 'ทำเสร็จแล้ว', 'เสร็จสิ้น']

    if (loading || (!profile && hasSessionToken())) {
        return (
            <div className="app-loading" role="status" aria-label="กำลังโหลด">
                <div className="app-loading-mark"><i /><i /></div>
                <span className="app-loading-spinner" />
                <p style={{ marginTop: 16, color: '#e8f3e5', fontWeight: 600, fontSize: 14 }}>กำลังเตรียมข้อมูลของคุณ...</p>
            </div>
        )
    }

    const initial = (profile?.name ?? session?.user?.email ?? '?')[0].toUpperCase()

    const userRole = normalizeRole(profile?.role || session?.user?.role)
    const isOperational = ['admin', 'cashier', 'kitchen', 'delivery'].includes(userRole)

    const roleTitles = {
        admin: isEn ? 'Admin Management' : 'ระบบจัดการแอดมิน',
        cashier: isEn ? 'Cashier Station' : 'สเตชั่นแคชเชียร์',
        kitchen: isEn ? 'Kitchen Station' : 'สเตชั่นห้องครัว',
        delivery: isEn ? 'Delivery Portal' : 'พอร์ทัลไรเดอร์ / จัดส่ง',
    }

    const roleIcons = {
        admin: 'bi bi-speedometer2',
        cashier: 'bi bi-cash-coin',
        kitchen: 'bi bi-fire',
        delivery: 'bi bi-bicycle',
    }

    const menu = [
        { key: 'info', icon: <i className="bi bi-person" style={{ fontSize: 18, verticalAlign: 'middle' }} />, label: isEn ? 'Personal Info' : 'ข้อมูลส่วนตัว' },
        { key: 'orders', icon: <i className="bi bi-receipt" style={{ fontSize: 18, verticalAlign: 'middle' }} />, label: isEn ? 'Order History' : 'ประวัติการสั่งซื้อ' },
        { key: 'points', icon: <i className="bi bi-star" style={{ fontSize: 18, verticalAlign: 'middle' }} />, label: isEn ? 'Points History' : 'ประวัติสะสมแต้ม' },
        { key: 'address', icon: <i className="bi bi-geo-alt" style={{ fontSize: 18, verticalAlign: 'middle' }} />, label: isEn ? 'My Addresses' : 'ที่อยู่ของฉัน' },
    ]

    return (
        <div className="profile-page">
            <Navbar
                user={profile}
                onOrder={onOrder || (() => navigate('/order'))}
                onAuth={onAuth || (() => { })}
                onLogout={handleLogout}
                cartCount={cartCount}
                onCart={onCart || (() => { })}
                breadcrumbs={[
                    { label: isEn ? 'My Profile' : 'โปรไฟล์ของฉัน', to: '/profile' },
                    { label: menu.find(m => m.key === tab)?.label ?? (isEn ? 'Profile' : 'โปรไฟล์') }
                ]}
            />

            <div className="profile-wrap">
                <aside className="profile-sidebar">
                    <div className="sidebar-avatar-block">
                        <div className="sidebar-avatar">
                            {profile?.avatarUrl ? (
                                <img src={profile.avatarUrl} alt={profile?.name || 'User'} className="sidebar-avatar-img" />
                            ) : (
                                <div className="sidebar-avatar-placeholder">{initial}</div>
                            )}
                            <label className="sidebar-avatar-overlay" title={isEn ? "Change Photo" : "เปลี่ยนรูปโปรไฟล์"}>
                                <i className={`bi ${uploadingAvatar ? 'bi-arrow-repeat spin' : 'bi-camera-fill'}`} />
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={e => handleAvatarUpload(e.target.files?.[0])}
                                    disabled={uploadingAvatar}
                                    style={{ display: 'none' }}
                                />
                            </label>
                        </div>

                        <div className="sidebar-user-info">
                            <strong>{profile?.name ?? 'Guest'}</strong>
                            <small>{session?.user?.email}</small>
                        </div>

                        {profile?.points !== undefined && (
                            <div
                                className="sidebar-points"
                                title={isEn ? 'View Points History' : 'ดูประวัติสะสมแต้ม'}
                                onClick={() => setTab('points')}
                                role="button"
                                tabIndex={0}
                                style={{ cursor: 'pointer' }}
                            >
                                <i className="bi bi-star-fill" />
                                <span>{displayPoints.toLocaleString()} P</span>
                            </div>
                        )}
                    </div>

                    {isOperational && (
                        <div className="sidebar-role-panel">
                            <div className="sidebar-role-panel-header">
                                <span className="sidebar-role-badge">
                                    <i className={roleIcons[userRole]} /> {roleTitles[userRole]}
                                </span>
                            </div>
                            <button
                                className="sidebar-role-go-btn"
                                onClick={() => navigate(getRoleDashboardPath(userRole))}
                            >
                                <span>{isEn ? 'Go to Station' : 'ไปยังหน้าปฏิบัติงาน'}</span>
                                <i className="bi bi-arrow-right-short" style={{ fontSize: 20 }} />
                            </button>
                            {userRole === 'admin' && (
                                <div className="sidebar-role-subgrid">
                                    <button onClick={() => navigate('/cashier')}><i className="bi bi-cash-coin" /> แคชเชียร์</button>
                                    <button onClick={() => navigate('/kitchen')}><i className="bi bi-fire" /> ครัว</button>
                                    <button onClick={() => navigate('/delivery')}><i className="bi bi-bicycle" /> ไรเดอร์</button>
                                </div>
                            )}
                        </div>
                    )}

                    <nav className="sidebar-nav">
                        {menu.map(m => (
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

                    <button className="sidebar-logout-btn" onClick={handleLogout}>{isEn ? 'Sign Out' : 'ออกจากระบบ'}</button>
                </aside>

                <main className="profile-content">
                    {tab === 'info' && (
                        <ProfileInfoTab
                            name={name}
                            setName={setName}
                            phone={phone}
                            setPhone={setPhone}
                            birthday={birthday}
                            setBirthday={setBirthday}
                            gender={gender}
                            setGender={setGender}
                            email={session?.user?.email}
                            avatarUrl={profile?.avatarUrl}
                            uploadingAvatar={uploadingAvatar}
                            onAvatarUpload={handleAvatarUpload}
                            handleSave={handleSave}
                            saving={saving}
                        />
                    )}

                    {tab === 'address' && (
                        <ProfileAddressTab
                            addresses={profile?.addresses || []}
                            removeAddress={removeAddress}
                            onAddAddress={addAddress}
                        />
                    )}

                    {tab === 'orders' && (
                        <ProfileOrdersTab
                            orders={orders}
                            activityLoading={activityLoading}
                            orderSteps={orderSteps}
                            money={money}
                            cancelOrder={cancelOrder}
                            cancellingOrderId={cancellingOrderId}
                            onOrderMore={() => navigate('/order')}
                        />
                    )}

                    {tab === 'points' && (
                        <ProfilePointsTab
                            profile={profile}
                            orders={orders}
                            money={money}
                            onOrderMore={() => navigate('/order')}
                            refreshProfile={refreshProfile}
                            displayPoints={displayPoints}
                        />
                    )}
                </main>
            </div>

            {toast && (
                <div className="pf-toast" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <i className={`bi ${toast.type === 'error' ? 'bi-x-circle-fill text-danger' : 'bi-check-circle-fill text-success'}`} style={{ fontSize: 16 }} />
                    <span>{toast.msg}</span>
                </div>
            )}
        </div>
    )
}

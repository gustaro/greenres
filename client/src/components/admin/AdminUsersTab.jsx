import { useState } from 'react'
import { adminApi } from '../../lib/database'
import { PageHead, useAdminModalFocus } from './AdminShared'

export function AdminUsersTab({ users, setUsers, notify, fail }) {
    const [isAdding, setIsAdding] = useState(false)
    const [updatingStatusId, setUpdatingStatusId] = useState(null)
    const [updatingRoleId, setUpdatingRoleId] = useState(null)
    const [updatingPointsId, setUpdatingPointsId] = useState(null)
    const [passwordUser, setPasswordUser] = useState(null)
    const [savingPassword, setSavingPassword] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [search, setSearch] = useState('')
    const [roleFilter, setRoleFilter] = useState('all')
    const [statusFilter, setStatusFilter] = useState('all')

    const normalizedSearch = search.trim().toLowerCase()
    const visibleUsers = users.filter(user => {
        const role = String(user.role || '').toLowerCase()
        const normalizedRole = role === 'rider' ? 'delivery' : role === 'staff' ? 'cashier' : role
        const matchesSearch = !normalizedSearch || `${user.name || ''} ${user.email || ''}`.toLowerCase().includes(normalizedSearch)
        const matchesRole = roleFilter === 'all' || normalizedRole === roleFilter
        const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' ? user.isActive : !user.isActive)
        return matchesSearch && matchesRole && matchesStatus
    })

    const handleEditPoints = async (user) => {
        const current = Number(user.points || 0)
        const promptVal = window.prompt(`ระบุจำนวนแต้มสะสมใหม่สำหรับ ${user.name || user.email}:`, String(current))
        if (promptVal === null) return
        const newPoints = parseInt(promptVal.trim(), 10)
        if (isNaN(newPoints) || newPoints < 0) {
            return notify('กรุณาระบุจำนวนแต้มที่ถูกต้อง (ตัวเลขจำนวนเต็มตั้งแต่ 0 ขึ้นไป)')
        }
        setUpdatingPointsId(user.id)
        try {
            await adminApi.updateUserPoints(user.id, newPoints)
            setUsers(currentList => currentList.map(item => item.id === user.id ? { ...item, points: newPoints } : item))
            notify(`อัปเดตแต้มของ ${user.name || user.email} เป็น ${newPoints.toLocaleString()} แต้มแล้ว`)
        } catch (error) {
            fail(error)
        } finally {
            setUpdatingPointsId(null)
        }
    }

    const updateUserRole = async (id, role) => {
        setUpdatingRoleId(id)
        try {
            await adminApi.updateUserRole(id, role)
            setUsers(current => current.map(item => item.id === id ? { ...item, role } : item))
            notify('อัปเดตบทบาทผู้ใช้งานแล้ว')
        } catch (error) {
            fail(error)
        } finally {
            setUpdatingRoleId(null)
        }
    }

    const updateUserStatus = async (id, isActive) => {
        setUpdatingStatusId(id)
        try {
            await adminApi.updateUserStatus(id, isActive)
            setUsers(current => current.map(item => item.id === id ? { ...item, isActive } : item))
            notify('อัปเดตสถานะผู้ใช้งานแล้ว')
        } catch (error) {
            fail(error)
        } finally {
            setUpdatingStatusId(null)
        }
    }

    const closePasswordModal = () => {
        if (savingPassword) return
        setPasswordUser(null)
        setShowPassword(false)
    }

    const updateUserPassword = async event => {
        event.preventDefault()
        if (!passwordUser) return
        const form = new FormData(event.currentTarget)
        const password = String(form.get('password') || '')
        const confirmPassword = String(form.get('confirmPassword') || '')
        if (password.length < 6) return notify('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร')
        if (password !== confirmPassword) return notify('รหัสผ่านทั้งสองช่องไม่ตรงกัน')

        setSavingPassword(true)
        try {
            await adminApi.updateUserPassword(passwordUser.id, password)
            notify(`เปลี่ยนรหัสผ่านของ ${passwordUser.name || passwordUser.email} แล้ว`)
            setPasswordUser(null)
            setShowPassword(false)
        } catch (error) {
            fail(error)
        } finally {
            setSavingPassword(false)
        }
    }

    const addUser = async event => {
        event.preventDefault()
        const formElement = event.currentTarget
        const form = new FormData(formElement)
        const email = form.get('email').trim()
        const password = form.get('password')
        const name = form.get('name').trim()
        const role = form.get('role')
        if (!email || !password) return notify('กรุณากรอกอีเมลและรหัสผ่าน')
        setIsAdding(true)
        try {
            const data = await adminApi.createUser({ email, name, password, role })
            const serverRoleDisplayMap = { CUSTOMER: 'customer', STAFF: 'cashier', KITCHEN: 'kitchen', ADMIN: 'admin' }
            setUsers(current => [...current, { id: data.id, email: data.email, name: data.name, role: serverRoleDisplayMap[data.role] || data.role, isActive: true, points: 0 }])
            formElement.reset()
            notify('เพิ่มผู้ใช้งานใหม่แล้ว')
        } catch (error) {
            fail(error)
        } finally {
            setIsAdding(false)
        }
    }

    const passwordModalRef = useAdminModalFocus(Boolean(passwordUser), closePasswordModal, savingPassword)

    return (
        <>
            <PageHead eyebrow="USERS & ACCESS" title="จัดการผู้ใช้งานทั้งหมด" description="กำหนดบทบาทและเปิด/ปิดใช้งานผู้ใช้ผ่าน API" />
            <form className="admin-grid-form users" onSubmit={addUser}>
                <label>อีเมล<input name="email" type="email" required placeholder="user@example.com" /></label>
                <label>ชื่อ<input name="name" placeholder="ชื่อผู้ใช้งาน" /></label>
                <label>รหัสผ่าน<input name="password" type="password" required placeholder="อย่างน้อย 6 ตัว" /></label>
                <label>
                    บทบาท
                    <select name="role" defaultValue="CUSTOMER">
                        <option value="CUSTOMER">ลูกค้า (Customer)</option>
                        <option value="STAFF">แคชเชียร์ (Staff)</option>
                        <option value="KITCHEN">ครัว (Kitchen)</option>
                        <option value="RIDER">ไรเดอร์ / จัดส่ง (Rider)</option>
                        <option value="ADMIN">แอดมิน (Admin)</option>
                    </select>
                </label>
                <button className="admin-primary" style={{ alignSelf: 'end' }} disabled={isAdding}>
                    {isAdding ? <><i className="bi bi-arrow-repeat spin me-1" />กำลังเพิ่มผู้ใช้...</> : '+ เพิ่มผู้ใช้'}
                </button>
            </form>
            <section className="admin-panel">
                <div className="admin-list-toolbar">
                    <label className="admin-list-search"><i className="bi bi-search" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="ค้นหาชื่อหรืออีเมล..." /></label>
                    <select value={roleFilter} onChange={event => setRoleFilter(event.target.value)} aria-label="กรองตามบทบาท">
                        <option value="all">ทุกบทบาท</option><option value="customer">ลูกค้า</option><option value="cashier">แคชเชียร์</option><option value="kitchen">ครัว</option><option value="delivery">ไรเดอร์</option><option value="admin">แอดมิน</option>
                    </select>
                    <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} aria-label="กรองตามสถานะ">
                        <option value="all">ทุกสถานะ</option><option value="active">เปิดใช้งาน</option><option value="inactive">ปิดใช้งาน</option>
                    </select>
                    <span>{visibleUsers.length} / {users.length} คน</span>
                </div>
                <div className="admin-table-wrap">
                    <table className="admin-responsive-table">
                        <thead>
                            <tr>
                                <th>ผู้ใช้งาน</th>
                                <th>แต้มสะสม</th>
                                <th>บทบาท</th>
                                <th>สถานะ</th>
                                <th>การจัดการสิทธิ์</th>
                            </tr>
                        </thead>
                        <tbody>
                            {visibleUsers.map(user => {
                                const userRoleLower = (user.role || '').toLowerCase()
                                return (
                                    <tr key={user.id}>
                                        <td data-label="ผู้ใช้งาน">
                                            <div className="admin-user-cell">
                                                <span>{(user.name || user.email || '?').charAt(0)}</span>
                                                <div>
                                                    <b>{user.name || 'ยังไม่ได้ตั้งชื่อ'}</b>
                                                    <small>{user.email}</small>
                                                </div>
                                            </div>
                                        </td>
                                        <td data-label="แต้มสะสม">
                                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                                <span style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: 5,
                                                    fontWeight: 700,
                                                    color: 'var(--brand-primary-dark, #075c1b)',
                                                    background: 'rgba(18, 133, 47, 0.08)',
                                                    border: '1px solid rgba(18, 133, 47, 0.2)',
                                                    padding: '3px 8px',
                                                    borderRadius: 14,
                                                    fontSize: 12,
                                                }}>
                                                    <i className="bi bi-coin text-warning"></i>
                                                    {Number(user.points || 0).toLocaleString()} แต้ม
                                                </span>
                                                <button
                                                    type="button"
                                                    title="แก้ไขแต้มสะสม"
                                                    disabled={updatingPointsId === user.id}
                                                    style={{
                                                        border: '1px solid #d1d5db',
                                                        background: '#fff',
                                                        color: '#4b5563',
                                                        cursor: 'pointer',
                                                        padding: '2px 6px',
                                                        borderRadius: 4,
                                                        fontSize: 11,
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: 3,
                                                    }}
                                                    onClick={() => handleEditPoints(user)}
                                                >
                                                    {updatingPointsId === user.id ? (
                                                        <i className="bi bi-arrow-repeat spin" />
                                                    ) : (
                                                        <><i className="bi bi-pencil-fill" style={{ fontSize: 9 }}></i> แก้ไข</>
                                                    )}
                                                </button>
                                            </div>
                                        </td>
                                        <td data-label="บทบาท">
                                            <select
                                                value={userRoleLower === 'rider' ? 'delivery' : userRoleLower === 'staff' ? 'cashier' : userRoleLower}
                                                disabled={updatingRoleId === user.id}
                                                onChange={event => updateUserRole(user.id, event.target.value)}
                                                aria-label={`เปลี่ยนบทบาทของ ${user.name || user.email}`}
                                            >
                                                <option value="customer">ลูกค้า (Customer)</option>
                                                <option value="cashier">แคชเชียร์ (Staff)</option>
                                                <option value="kitchen">ครัว (Kitchen)</option>
                                                <option value="delivery">ไรเดอร์ / จัดส่ง (Rider)</option>
                                                <option value="admin">แอดมิน (Admin)</option>
                                            </select>
                                            {updatingRoleId === user.id && <small className="admin-user-updating"><i className="bi bi-arrow-repeat spin" /> กำลังเปลี่ยนสิทธิ์</small>}
                                        </td>
                                        <td data-label="สถานะ">
                                            <button
                                                className={user.isActive ? 'admin-primary' : 'admin-text-danger'}
                                                style={{ fontSize: 12, padding: '4px 12px', borderRadius: 6 }}
                                                disabled={updatingStatusId === user.id}
                                                onClick={() => updateUserStatus(user.id, !user.isActive)}
                                            >
                                                {updatingStatusId === user.id ? (
                                                    <><i className="bi bi-arrow-repeat spin me-1" />...</>
                                                ) : (
                                                    user.isActive ? 'เปิดใช้งานแล้ว' : 'ปิดใช้งาน'
                                                )}
                                            </button>
                                        </td>
                                        <td data-label="การจัดการสิทธิ์">
                                            <div className="admin-user-actions">
                                                <button type="button" className="admin-user-password-btn" onClick={() => setPasswordUser(user)}>
                                                    <i className="bi bi-key" /> เปลี่ยนรหัสผ่าน
                                                </button>
                                                <small><i className="bi bi-shield-check" /> แอดมินแก้ไขได้</small>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </section>

            {passwordUser && (
                <div className="admin-modal-backdrop" onClick={event => { if (event.target === event.currentTarget) closePasswordModal() }}>
                    <div className="admin-modal-card admin-password-modal" role="dialog" aria-modal="true" aria-labelledby="admin-password-title" ref={passwordModalRef}>
                        <div className="admin-modal-header">
                            <div className="admin-modal-title-wrap">
                                <h3 id="admin-password-title"><i className="bi bi-key-fill" /> เปลี่ยนรหัสผ่าน</h3>
                                <small>{passwordUser.name || 'ยังไม่ได้ตั้งชื่อ'} · {passwordUser.email}</small>
                            </div>
                            <button type="button" className="admin-modal-close" onClick={closePasswordModal} disabled={savingPassword} aria-label="ปิด">
                                <i className="bi bi-x-lg" />
                            </button>
                        </div>
                        <form onSubmit={updateUserPassword}>
                            <div className="admin-modal-body">
                                <div className="admin-password-notice">
                                    <i className="bi bi-shield-lock" />
                                    <span>ตั้งรหัสผ่านใหม่อย่างน้อย 6 ตัวอักษร ระบบจะยกเลิกการเข้าสู่ระบบเดิมเมื่อโทเคนหมดอายุ</span>
                                </div>
                                <div className="admin-modal-field">
                                    <label htmlFor="admin-new-password">รหัสผ่านใหม่ *</label>
                                    <div className="admin-password-input-wrap">
                                        <input id="admin-new-password" name="password" type={showPassword ? 'text' : 'password'} minLength="6" required autoComplete="new-password" placeholder="อย่างน้อย 6 ตัวอักษร" autoFocus />
                                        <button type="button" onClick={() => setShowPassword(current => !current)} aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}>
                                            <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`} />
                                        </button>
                                    </div>
                                </div>
                                <div className="admin-modal-field">
                                    <label htmlFor="admin-confirm-password">ยืนยันรหัสผ่านใหม่ *</label>
                                    <input id="admin-confirm-password" name="confirmPassword" type={showPassword ? 'text' : 'password'} minLength="6" required autoComplete="new-password" placeholder="กรอกรหัสผ่านใหม่อีกครั้ง" />
                                </div>
                            </div>
                            <div className="admin-modal-footer">
                                <button type="button" className="admin-secondary" onClick={closePasswordModal} disabled={savingPassword}>ยกเลิก</button>
                                <button type="submit" className="admin-primary" disabled={savingPassword}>
                                    {savingPassword ? <><i className="bi bi-arrow-repeat spin" /> กำลังบันทึก...</> : <><i className="bi bi-check2-circle" /> บันทึกรหัสผ่านใหม่</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    )
}

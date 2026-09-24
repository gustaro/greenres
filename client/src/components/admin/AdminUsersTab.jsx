import { useState } from 'react'
import { adminApi } from '../../lib/database'
import { PageHead, roleNames } from './AdminShared'

export function AdminUsersTab({ users, setUsers, notify, fail }) {
    const [isAdding, setIsAdding] = useState(false)
    const [updatingStatusId, setUpdatingStatusId] = useState(null)
    const [updatingRoleId, setUpdatingRoleId] = useState(null)
    const [updatingPointsId, setUpdatingPointsId] = useState(null)

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
                        <option value="CUSTOMER">ลูกค้า</option>
                        <option value="STAFF">แคชเชียร์</option>
                        <option value="KITCHEN">ครัว</option>
                        <option value="DELIVERY">เดลิเวอรี่ / ไรเดอร์</option>
                        <option value="ADMIN">แอดมิน</option>
                    </select>
                </label>
                <button className="admin-primary" style={{ alignSelf: 'end' }} disabled={isAdding}>
                    {isAdding ? <><i className="bi bi-arrow-repeat spin me-1" />กำลังเพิ่มผู้ใช้...</> : '+ เพิ่มผู้ใช้'}
                </button>
            </form>
            <section className="admin-panel">
                <div className="admin-table-wrap">
                    <table>
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
                            {users.map(user => {
                                const userRoleLower = (user.role || '').toLowerCase()
                                const isOperational = ['cashier', 'staff', 'kitchen', 'admin'].includes(userRoleLower)
                                return (
                                    <tr key={user.id}>
                                        <td>
                                            <div className="admin-user-cell">
                                                <span>{(user.name || user.email || '?').charAt(0)}</span>
                                                <div>
                                                    <b>{user.name || 'ยังไม่ได้ตั้งชื่อ'}</b>
                                                    <small>{user.email}</small>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
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
                                        <td>
                                            {isOperational ? (
                                                <span className={`admin-badge-protected ${userRoleLower === 'staff' ? 'cashier' : userRoleLower}`}>
                                                    <i className="bi bi-shield-fill-check"></i> {roleNames[userRoleLower] || user.role}
                                                </span>
                                            ) : (
                                                <select
                                                    value={userRoleLower}
                                                    disabled={updatingRoleId === user.id}
                                                    onChange={event => updateUserRole(user.id, event.target.value)}
                                                >
                                                    <option value="customer">ลูกค้า (Customer)</option>
                                                    <option value="delivery">ไรเดอร์ / จัดส่ง (Delivery)</option>
                                                </select>
                                            )}
                                        </td>
                                        <td>
                                            {userRoleLower === 'admin' ? (
                                                <span className="admin-badge active"><i className="bi bi-lock-fill" style={{ marginRight: 4 }}></i>เปิดใช้งานถาวร</span>
                                            ) : (
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
                                            )}
                                        </td>
                                        <td>
                                            {isOperational ? (
                                                <small style={{ color: '#8898aa', fontWeight: 600 }}><i className="bi bi-shield-lock"></i> สิทธิ์ระดับปฏิบัติการ (Read-only)</small>
                                            ) : (
                                                <small style={{ color: 'var(--brand-primary, #12852f)', fontWeight: 600 }}><i className="bi bi-pencil-square"></i> แก้ไขบทบาท/เปิดปิดได้</small>
                                            )}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </section>
        </>
    )
}

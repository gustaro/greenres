import { useState, useEffect } from 'react'
import { deliveryApi } from '../../lib/database'
import { useAuth } from '../../lib/AuthContext'

export function DeliveryRiderProfileModal({ showProfileModal, setShowProfileModal, rider, setRider, notify }) {
    const { uploadAvatar, profile } = useAuth()
    const [editName, setEditName] = useState('')
    const [editPhone, setEditPhone] = useState('')
    const [editVehicleType, setEditVehicleType] = useState('มอเตอร์ไซค์')
    const [editVehiclePlate, setEditVehiclePlate] = useState('')
    const [editEmergencyContact, setEditEmergencyContact] = useState('')
    const [editAvatarUrl, setEditAvatarUrl] = useState('')
    const [savingProfile, setSavingProfile] = useState(false)
    const [uploadingAvatar, setUploadingAvatar] = useState(false)

    useEffect(() => {
        if (rider) {
            setEditName(rider.user?.name || '')
            setEditPhone(rider.user?.phone || '')
            setEditVehicleType(rider.vehicleType || 'มอเตอร์ไซค์')
            setEditVehiclePlate(rider.vehiclePlate || rider.licensePlate || '')
            setEditEmergencyContact(rider.emergencyContact || '')
            setEditAvatarUrl(rider.user?.avatarUrl || profile?.avatarUrl || '')
        }
    }, [rider, profile])

    if (!showProfileModal) return null

    const handleAvatarFileChange = async e => {
        const file = e.target.files?.[0]
        if (!file) return
        if (!file.type.startsWith('image/')) {
            window.alert('กรุณาเลือกไฟล์รูปภาพเท่านั้น (JPG, PNG, WebP)')
            return
        }
        if (file.size > 5 * 1024 * 1024) {
            window.alert('ขนาดไฟล์ต้องไม่เกิน 5MB')
            return
        }

        setUploadingAvatar(true)
        try {
            const { data, error } = await uploadAvatar(file)
            if (error) {
                window.alert('อัพโหลดรูปภาพไม่สำเร็จ: ' + error.message)
            } else if (data?.avatarUrl) {
                setEditAvatarUrl(data.avatarUrl)
                setRider(prev => prev ? ({ ...prev, user: { ...(prev?.user || {}), avatarUrl: data.avatarUrl } }) : prev)
                notify('อัพโหลดรูปโปรไฟล์เรียบร้อย')
            }
        } catch (err) {
            window.alert('เกิดข้อผิดพลาดในการอัพโหลด: ' + err.message)
        } finally {
            setUploadingAvatar(false)
            e.target.value = ''
        }
    }

    const handleSaveProfile = async e => {
        e.preventDefault()
        setSavingProfile(true)
        try {
            const updated = await deliveryApi.updateProfile({
                name: editName.trim(),
                phone: editPhone.trim(),
                vehicleType: editVehicleType.trim(),
                vehiclePlate: editVehiclePlate.trim(),
                licensePlate: editVehiclePlate.trim(),
                emergencyContact: editEmergencyContact.trim(),
                avatarUrl: editAvatarUrl.trim(),
            })
            setRider(prev => ({
                ...prev,
                ...updated,
                vehiclePlate: editVehiclePlate.trim(),
                licensePlate: editVehiclePlate.trim(),
                user: { ...(prev?.user || {}), ...(updated?.user || {}), name: editName.trim(), phone: editPhone.trim(), avatarUrl: editAvatarUrl.trim() }
            }))
            setShowProfileModal(false)
            notify('บันทึกข้อมูลส่วนตัวเรียบร้อย')
        } catch (err) {
            window.alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' + err.message)
        } finally {
            setSavingProfile(false)
        }
    }

    const inputStyle = { padding: '9px 12px', borderRadius: 6, border: '1px solid #d8e7d2', fontSize: 14 }
    const labelStyle = { display: 'grid', gap: 4, fontSize: 13, fontWeight: 700, color: '#17351f' }

    return (
        <div className="overlay" style={{ zIndex: 1200, display: 'grid', placeItems: 'center', background: 'rgba(0,0,0,0.5)' }}>
            <div style={{ background: '#fff', borderRadius: 12, padding: 24, width: '90%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--brand-primary-dark)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <i className="bi bi-bicycle"></i> แก้ไขข้อมูลส่วนตัวไรเดอร์
                    </h3>
                    <button onClick={() => setShowProfileModal(false)} style={{ border: 0, background: 'transparent', fontSize: 24, cursor: 'pointer' }}>×</button>
                </div>

                <form onSubmit={handleSaveProfile} style={{ display: 'grid', gap: 14 }}>
                    {/* Profile Photo Upload Section */}
                    <div style={{ display: 'grid', gap: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#17351f' }}>รูปโปรไฟล์ไรเดอร์</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16, background: '#f6faf2', padding: '12px 14px', borderRadius: 8, border: '1px solid #d8e7d2' }}>
                            <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'var(--brand-accent, #b8ff35)', display: 'grid', placeItems: 'center', overflow: 'hidden', border: '2px solid var(--brand-primary, #12852f)', flexShrink: 0, position: 'relative' }}>
                                {editAvatarUrl ? (
                                    <img
                                        src={editAvatarUrl}
                                        alt="Avatar Preview"
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        onError={e => {
                                            e.currentTarget.style.display = 'none'
                                            if (e.currentTarget.nextElementSibling) e.currentTarget.nextElementSibling.style.display = 'block'
                                        }}
                                    />
                                ) : null}
                                <i className="bi bi-person-fill" style={{ fontSize: 32, color: 'var(--brand-primary-dark, #075c1b)', display: editAvatarUrl ? 'none' : 'block' }} />
                                {uploadingAvatar && (
                                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center', color: '#fff', fontSize: 18 }}>
                                        <i className="bi bi-arrow-repeat spin" />
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'grid', gap: 6, flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                    <label
                                        htmlFor="rider-avatar-upload-file"
                                        style={{
                                            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 6, fontSize: 13, fontWeight: 700,
                                            background: 'var(--brand-primary, #12852f)', color: '#fff', cursor: uploadingAvatar ? 'not-allowed' : 'pointer', opacity: uploadingAvatar ? 0.7 : 1, border: 0
                                        }}
                                    >
                                        <i className={`bi ${uploadingAvatar ? 'bi-arrow-repeat spin' : 'bi-camera-fill'}`} />
                                        {uploadingAvatar ? 'กำลังอัพโหลด...' : editAvatarUrl ? 'เปลี่ยนรูปภาพ' : 'อัพโหลดรูปภาพ'}
                                    </label>
                                    <input id="rider-avatar-upload-file" type="file" accept="image/*" onChange={handleAvatarFileChange} disabled={uploadingAvatar} style={{ display: 'none' }} />
                                    {editAvatarUrl && !uploadingAvatar && (
                                        <button
                                            type="button"
                                            onClick={() => setEditAvatarUrl('')}
                                            style={{ border: 0, background: 'transparent', color: '#ef4444', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                        >
                                            <i className="bi bi-trash3" /> ลบรูป
                                        </button>
                                    )}
                                </div>
                                <span style={{ fontSize: 11, color: '#6d7b6e' }}>รองรับไฟล์ JPG, PNG, WebP ขนาดไม่เกิน 5MB</span>
                            </div>
                        </div>
                    </div>

                    <label style={labelStyle}>
                        ชื่อ - นามสกุล
                        <input required value={editName} onChange={e => setEditName(e.target.value)} placeholder="เช่น สมศักดิ์ จัดส่งไว" style={inputStyle} />
                    </label>

                    <label style={labelStyle}>
                        เบอร์โทรศัพท์
                        <input required value={editPhone} onChange={e => setEditPhone(e.target.value)} placeholder="08x-xxx-xxxx" style={inputStyle} />
                    </label>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <label style={labelStyle}>
                            ประเภทยานพาหนะ
                            <select value={editVehicleType} onChange={e => setEditVehicleType(e.target.value)} style={inputStyle}>
                                <option value="มอเตอร์ไซค์">มอเตอร์ไซค์</option>
                                <option value="จักรยานยนต์ไฟฟ้า">จักรยานยนต์ไฟฟ้า (EV)</option>
                                <option value="รถยนต์">รถยนต์</option>
                                <option value="จักรยาน">จักรยาน</option>
                            </select>
                        </label>
                        <label style={labelStyle}>
                            เลขทะเบียนรถ
                            <input value={editVehiclePlate} onChange={e => setEditVehiclePlate(e.target.value)} placeholder="เช่น 1กข 9999 กทม." style={inputStyle} />
                        </label>
                    </div>

                    <label style={labelStyle}>
                        เบอร์โทรติดต่อฉุกเฉิน
                        <input value={editEmergencyContact} onChange={e => setEditEmergencyContact(e.target.value)} placeholder="เบอร์โทรบุคคลใกล้ชิด" style={inputStyle} />
                    </label>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                        <button type="button" className="staff-secondary" onClick={() => setShowProfileModal(false)} disabled={savingProfile || uploadingAvatar}>
                            ยกเลิก
                        </button>
                        <button type="submit" className="staff-primary" disabled={savingProfile || uploadingAvatar}>
                            {savingProfile ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

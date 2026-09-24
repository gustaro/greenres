import { useState } from 'react'
import { adminApi } from '../../lib/database'
import { PageHead, PAGE_LINK_OPTIONS, money } from './AdminShared'

const getPromotionStatus = promotion => {
    const expiresAt = promotion.expiresAt ? new Date(promotion.expiresAt).getTime() : null
    const isExpired = Number.isFinite(expiresAt) && expiresAt <= Date.now()
    const usageLimit = Number(promotion.usageLimit || 0)
    const usedCount = Number(promotion.usedCount || 0)
    const isFull = usageLimit > 0 && usedCount >= usageLimit

    if (isExpired) return { key: 'expired', label: 'หมดอายุ', icon: 'bi-clock-fill' }
    if (isFull) return { key: 'full', label: 'สิทธิ์เต็ม', icon: 'bi-ticket-perforated-fill' }
    if (promotion.isActive) return { key: 'active', label: 'ใช้งานอยู่', icon: 'bi-check-circle-fill' }
    return { key: 'inactive', label: 'ปิดใช้งาน', icon: 'bi-pause-circle-fill' }
}

export function AdminPromotionsTab({ promotions, setPromotions, adminName, notify, fail }) {
    const [editingPromotion, setEditingPromotion] = useState(null)
    const [isAdding, setIsAdding] = useState(false)
    const [savingId, setSavingId] = useState(null)
    const [togglingId, setTogglingId] = useState(null)
    const [deletingId, setDeletingId] = useState(null)

    const addPromotion = async event => {
        event.preventDefault()
        const formElement = event.currentTarget
        const form = new FormData(formElement)
        setIsAdding(true)
        try {
            const minAmt = Number(form.get('minOrderAmount') || 0)
            const usageLimitVal = form.get('usageLimit') ? Number(form.get('usageLimit')) : null
            const expiresAtVal = form.get('expiresAt') ? new Date(form.get('expiresAt')).toISOString() : null

            const payload = {
                code: form.get('code').trim().toUpperCase(),
                title: form.get('title').trim(),
                titleEn: form.get('titleEn')?.trim() || '',
                description: form.get('description').trim(),
                descriptionEn: form.get('descriptionEn')?.trim() || '',
                discountType: form.get('discountType') || 'PERCENT',
                discountValue: Number(form.get('value')),
                buttonLabel: form.get('buttonLabel').trim() || 'ดูเมนู',
                buttonLabelEn: form.get('buttonLabelEn')?.trim() || '',
                buttonLink: form.get('buttonLink').trim() || '/order',
                usageLimit: usageLimitVal,
                expiresAt: expiresAtVal,
                ...(minAmt > 0 ? { minOrderAmount: minAmt } : {})
            }

            const imageFile = form.get('imageFile')
            let body = payload
            if (imageFile instanceof File && imageFile.size > 0) {
                body = new FormData()
                Object.entries(payload).forEach(([key, value]) => {
                    if (value !== null && value !== undefined) body.append(key, String(value))
                })
                body.append('image', imageFile)
            }
            const data = await adminApi.createCoupon(body)
            setPromotions(current => [data, ...current])
            formElement.reset()
            notify('สร้างโปรโมชั่นแล้ว')
        } catch (error) {
            fail(error)
        } finally {
            setIsAdding(false)
        }
    }

    const togglePromotion = async promotion => {
        setTogglingId(promotion.id)
        try {
            await adminApi.updateCoupon(promotion.id, { isActive: !promotion.isActive })
            setPromotions(current => current.map(item => item.id === promotion.id ? { ...item, isActive: !item.isActive } : item))
        } catch (error) {
            fail(error)
        } finally {
            setTogglingId(null)
        }
    }

    const savePromotion = async (event, promotion) => {
        event.preventDefault()
        const form = new FormData(event.currentTarget)
        setSavingId(promotion.id)
        try {
            const minAmt = Number(form.get('minOrderAmount') || 0)
            const usageLimitVal = form.get('usageLimit') ? Number(form.get('usageLimit')) : null
            const expiresAtVal = form.get('expiresAt') ? new Date(form.get('expiresAt')).toISOString() : null

            const prevHistory = Array.isArray(promotion.history) ? promotion.history : []
            const newHistory = [...prevHistory, { action: 'EDIT', by: adminName, at: new Date().toISOString() }]

            const payload = {
                code: form.get('code').trim().toUpperCase(),
                title: form.get('title').trim(),
                titleEn: form.get('titleEn')?.trim() || '',
                description: form.get('description').trim(),
                descriptionEn: form.get('descriptionEn')?.trim() || '',
                discountType: form.get('discountType') || 'PERCENT',
                discountValue: Number(form.get('value')),
                buttonLabel: form.get('buttonLabel').trim() || 'ดูเมนู',
                buttonLabelEn: form.get('buttonLabelEn')?.trim() || '',
                buttonLink: form.get('buttonLink').trim() || '/order',
                minOrderAmount: minAmt > 0 ? minAmt : null,
                usageLimit: usageLimitVal,
                expiresAt: expiresAtVal,
                history: JSON.stringify(newHistory),
            }
            const imageFile = form.get('imageFile')
            let body = payload
            if (imageFile instanceof File && imageFile.size > 0) {
                body = new FormData()
                Object.entries(payload).forEach(([key, value]) => {
                    if (value !== null && value !== undefined) body.append(key, String(value))
                })
                body.append('image', imageFile)
            }
            const data = await adminApi.updateCoupon(promotion.id, body)
            setPromotions(current => current.map(item => item.id === promotion.id ? data : item))
            setEditingPromotion(null)
            notify('บันทึกโปรโมชั่นแล้ว')
        } catch (error) {
            fail(error)
        } finally {
            setSavingId(null)
        }
    }

    const deletePromotion = async id => {
        if (!window.confirm('คุณต้องการลบโปรโมชั่นนี้ใช่หรือไม่?')) return
        setDeletingId(id)
        try {
            await adminApi.deleteCoupon(id)
            setPromotions(current => current.filter(item => item.id !== id))
            notify('ลบโปรโมชั่นแล้ว')
        } catch (error) {
            fail(error)
        } finally {
            setDeletingId(null)
        }
    }

    return (
        <>
            <PageHead eyebrow="MARKETING" title="จัดการโปรโมชั่น" description="จัดการคูปองตาม Coupon API ของ Server (รายการคูปองฝั่งลูกค้าเป็นสิทธิ์ที่ Server จำกัดไว้)" />
            <form className="admin-marketing-form promotion" onSubmit={addPromotion}>
                <label>โค้ดโปรโมชั่น<input name="code" required placeholder="LIME20" /></label>
                <label>หัวข้อโปรโมชั่น (ภาษาไทย)<input name="title" required placeholder="สมาชิกใหม่ลดทันที" /></label>
                <label className="wide">หัวข้อโปรโมชั่น (ภาษาอังกฤษ - English Title)<input name="titleEn" placeholder="e.g. New Member Instant Discount" /></label>
                <label className="wide">รายละเอียด (ภาษาไทย)<textarea name="description" required placeholder="รับส่วนลดสำหรับออเดอร์แรก" /></label>
                <label className="wide">รายละเอียด (ภาษาอังกฤษ - English Description)<textarea name="descriptionEn" placeholder="e.g. Get instant 20% discount on your first order" /></label>
                <label>
                    ประเภทส่วนลด
                    <select name="discountType" defaultValue="PERCENT">
                        <option value="PERCENT">เปอร์เซ็นต์ (%)</option>
                        <option value="FIXED">จำนวนเงิน (฿)</option>
                    </select>
                </label>
                <label>มูลค่าส่วนลด<input name="value" required type="number" min="1" step="0.01" /></label>
                <label>ยอดสั่งขั้นต่ำ (฿)<input name="minOrderAmount" type="number" min="0" step="0.01" placeholder="0 = ไม่จำกัด" /></label>
                <label>ลิงก์ปุ่ม
                    <select name="buttonLink" defaultValue="/order">
                        {PAGE_LINK_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                </label>
                <label className="wide">ข้อความบนปุ่ม (ภาษาไทย)<input name="buttonLabel" defaultValue="ดูเมนู" placeholder="ดูเมนู" /></label>
                <label className="wide">ข้อความบนปุ่ม (ภาษาอังกฤษ)<input name="buttonLabelEn" placeholder="e.g. View Menu / Claim Now" /></label>
                <label>วันหมดอายุ<input name="expiresAt" type="datetime-local" /></label>
                <label>จำกัดจำนวนสิทธิ์ (ครั้ง)<input name="usageLimit" type="number" min="1" placeholder="ว่าง = ไม่จำกัด" /></label>
                <label className="wide">อัปโหลดรูปภาพ (ไม่บังคับ)<input type="file" name="imageFile" accept="image/png, image/jpeg, image/webp" /></label>
                <button className="admin-primary" disabled={isAdding}>
                    {isAdding ? <><i className="bi bi-arrow-repeat spin me-1" />กำลังสร้างโปรโมชั่น...</> : '+ สร้างโปรโมชั่น'}
                </button>
            </form>
            <div className="admin-promo-grid">
                {promotions.map(promotion => {
                    const promotionStatus = getPromotionStatus(promotion)
                    return (
                    <article key={promotion.id} className={promotionStatus.key === 'inactive' ? 'inactive' : ''}>
                        <img className="admin-promo-image" src={promotion.imageUrl || '/assets/basil-rice.png'} alt="" />
                        {editingPromotion === promotion.id ? (
                            <form className="admin-edit-form" onSubmit={event => savePromotion(event, promotion)}>
                                <label>โค้ด<input name="code" required defaultValue={promotion.code} /></label>
                                <label>
                                    ประเภทส่วนลด
                                    <select name="discountType" defaultValue={promotion.discountType}>
                                        <option value="PERCENT">เปอร์เซ็นต์ (%)</option>
                                        <option value="FIXED">จำนวนเงิน (฿)</option>
                                    </select>
                                </label>
                                <label>หัวข้อ (ภาษาไทย)<input name="title" required defaultValue={promotion.title} /></label>
                                <label>หัวข้อ (ภาษาอังกฤษ)<input name="titleEn" defaultValue={promotion.titleEn || ''} placeholder="e.g. New Member Discount" /></label>
                                <label className="wide">รายละเอียด (ภาษาไทย)<textarea name="description" required defaultValue={promotion.description} /></label>
                                <label className="wide">รายละเอียด (ภาษาอังกฤษ)<textarea name="descriptionEn" defaultValue={promotion.descriptionEn || ''} placeholder="e.g. 20% discount on first order" /></label>
                                <label>มูลค่าส่วนลด<input name="value" type="number" min="1" step="0.01" required defaultValue={promotion.discountValue} /></label>
                                <label>ยอดสั่งซื้อขั้นต่ำ (0 = ไม่มีขั้นต่ำ)<input name="minOrderAmount" type="number" min="0" step="1" defaultValue={promotion.minOrderAmount || ''} /></label>
                                <label>ข้อความบนปุ่ม (ภาษาไทย)<input name="buttonLabel" defaultValue={promotion.buttonLabel} /></label>
                                <label>ข้อความบนปุ่ม (ภาษาอังกฤษ)<input name="buttonLabelEn" defaultValue={promotion.buttonLabelEn || ''} placeholder="e.g. View Menu" /></label>
                                <label>ลิงก์ปุ่ม
                                    <select name="buttonLink" defaultValue={promotion.buttonLink || '/order'}>
                                        {PAGE_LINK_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                        {!PAGE_LINK_OPTIONS.some(opt => opt.value === promotion.buttonLink) && (
                                            <option value={promotion.buttonLink}>{promotion.buttonLink} (กำหนดเอง)</option>
                                        )}
                                    </select>
                                </label>
                                <label>วันหมดอายุ<input name="expiresAt" type="datetime-local" defaultValue={promotion.expiresAt ? new Date(promotion.expiresAt).toISOString().slice(0, 16) : ''} /></label>
                                <label className="wide">จำกัดจำนวนสิทธิ์ (ครั้ง)<input name="usageLimit" type="number" min="0" defaultValue={promotion.usageLimit || ''} placeholder="ไม่จำกัด" /></label>
                                <label className="wide">อัปโหลดรูปภาพใหม่<input type="file" name="imageFile" accept="image/png, image/jpeg, image/webp" /></label>
                                <div className="admin-form-actions">
                                    <button type="button" onClick={() => setEditingPromotion(null)}>ยกเลิก</button>
                                    <button className="admin-primary" disabled={savingId === promotion.id}>
                                        {savingId === promotion.id ? <><i className="bi bi-arrow-repeat spin me-1" />กำลังบันทึก...</> : 'บันทึก'}
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <>
                                <div className={`admin-promo-badge status-${promotionStatus.key}`}>
                                    <i className={`bi ${promotionStatus.icon}`} />
                                    {promotionStatus.label}
                                </div>
                                <div className="admin-promo-content">
                                    <div className="admin-promo-title-row"><span className="code">{promotion.code}</span></div>
                                    <h2>
                                        {promotion.title}
                                        {promotion.titleEn && <span style={{ display: 'block', fontSize: '13px', color: 'var(--brand-muted)', fontWeight: 600, marginTop: 2 }}>{promotion.titleEn}</span>}
                                    </h2>
                                    <p>{promotion.description}</p>
                                    {promotion.descriptionEn && <p style={{ fontSize: '12px', color: '#68776b', fontStyle: 'italic', margin: '2px 0 6px' }}>{promotion.descriptionEn}</p>}
                                    <div className="admin-promo-discount">
                                        <strong>{promotion.discountType === 'PERCENT' ? `ลด ${promotion.discountValue}%` : `ลด ${money(promotion.discountValue)}`}</strong>
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'var(--brand-muted)', margin: '4px 0 6px' }}>
                                        <i className="bi bi-cursor-fill me-1" />
                                        ปุ่ม: <b>{promotion.buttonLabel}</b>
                                        {promotion.buttonLabelEn && <span> ({promotion.buttonLabelEn})</span>}
                                        {' → '}{promotion.buttonLink}
                                    </div>
                                    {promotion.expiresAt && (
                                        <div className="admin-promo-meta-tag">
                                            <i className="bi bi-clock-history" style={{ marginRight: 4 }}></i>
                                            หมดอายุ: {new Date(promotion.expiresAt).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}
                                        </div>
                                    )}
                                    {promotion.usageLimit ? (
                                        <div className="admin-promo-meta-tag">
                                            <i className="bi bi-ticket-perforated" style={{ marginRight: 4 }}></i>
                                            สิทธิ์: {promotion.usedCount || 0} / {promotion.usageLimit} ครั้ง
                                        </div>
                                    ) : null}
                                    {Array.isArray(promotion.history) && promotion.history.length > 0 && (
                                        <details className="admin-promo-history">
                                            <summary><i className="bi bi-journal-text" style={{ marginRight: 4 }}></i>ประวัติการแก้ไข ({promotion.history.length})</summary>
                                            <ul>
                                                {promotion.history.slice(-3).reverse().map((h, i) => (
                                                    <li key={i}><small>{h.action} โดย {h.by || 'Admin'} เมื่อ {new Date(h.at).toLocaleDateString('th-TH')}</small></li>
                                                ))}
                                            </ul>
                                        </details>
                                    )}
                                </div>
                            </>
                        )}
                        {editingPromotion !== promotion.id && (
                            <footer>
                                <button onClick={() => setEditingPromotion(promotion.id)}>แก้ไข</button>
                                <button disabled={togglingId === promotion.id} onClick={() => togglePromotion(promotion)}>
                                    {togglingId === promotion.id ? <><i className="bi bi-arrow-repeat spin me-1" />...</> : (promotion.isActive ? 'ปิดใช้งาน' : 'เปิดใช้งาน')}
                                </button>
                                <button className="admin-text-danger" disabled={deletingId === promotion.id} onClick={() => deletePromotion(promotion.id)}>
                                    {deletingId === promotion.id ? <><i className="bi bi-arrow-repeat spin me-1" />ลบ...</> : 'ลบ'}
                                </button>
                            </footer>
                        )}
                    </article>
                    )
                })}
            </div>
        </>
    )
}

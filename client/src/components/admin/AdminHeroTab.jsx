import { useState } from 'react'
import { heroApi } from '../../lib/database'
import { PageHead, Empty, PAGE_LINK_OPTIONS } from './AdminShared'

export function AdminHeroTab({ heroSlides, setHeroSlides, notify, fail }) {
    const [editingHero, setEditingHero] = useState(null)
    const [isAdding, setIsAdding] = useState(false)
    const [savingId, setSavingId] = useState(null)
    const [togglingId, setTogglingId] = useState(null)
    const [deletingId, setDeletingId] = useState(null)

    const addHero = async event => {
        event.preventDefault()
        const formEl = event.currentTarget
        const form = new FormData(formEl)
        const title = form.get('title')?.trim()
        if (!title) return notify('กรุณาใส่หัวข้อหลัก')

        const imageFile = form.get('image')
        const formData = new FormData()
        formData.append('eyebrow', form.get('eyebrow')?.trim() || '')
        formData.append('eyebrowEn', form.get('eyebrowEn')?.trim() || '')
        formData.append('title', title)
        formData.append('titleEn', form.get('titleEn')?.trim() || '')
        formData.append('description', form.get('description')?.trim() || '')
        formData.append('descriptionEn', form.get('descriptionEn')?.trim() || '')
        formData.append('buttonLabel', form.get('buttonLabel')?.trim() || 'สั่งเลย')
        formData.append('buttonLabelEn', form.get('buttonLabelEn')?.trim() || '')
        formData.append('buttonLink', form.get('buttonLink')?.trim() || '/order')
        formData.append('sortOrder', String(Number(form.get('sortOrder') || heroSlides.length + 1)))

        if (imageFile instanceof File && imageFile.size > 0) {
            formData.append('image', imageFile)
        }

        setIsAdding(true)
        try {
            const data = await heroApi.create(formData)
            setHeroSlides(current => [...current, data].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)))
            formEl.reset()
            notify('เพิ่มแบนเนอร์หน้าแรกเรียบร้อยแล้ว')
        } catch (error) {
            fail(error)
        } finally {
            setIsAdding(false)
        }
    }

    const saveHero = async (event, hero) => {
        event.preventDefault()
        const formEl = event.currentTarget
        const form = new FormData(formEl)
        const title = form.get('title')?.trim()
        if (!title) return notify('กรุณาใส่หัวข้อหลัก')

        const imageFile = form.get('image')
        const formData = new FormData()
        formData.append('eyebrow', form.get('eyebrow')?.trim() || '')
        formData.append('eyebrowEn', form.get('eyebrowEn')?.trim() || '')
        formData.append('title', title)
        formData.append('titleEn', form.get('titleEn')?.trim() || '')
        formData.append('description', form.get('description')?.trim() || '')
        formData.append('descriptionEn', form.get('descriptionEn')?.trim() || '')
        formData.append('buttonLabel', form.get('buttonLabel')?.trim() || 'สั่งเลย')
        formData.append('buttonLabelEn', form.get('buttonLabelEn')?.trim() || '')
        formData.append('buttonLink', form.get('buttonLink')?.trim() || '/order')
        formData.append('sortOrder', String(Number(form.get('sortOrder') || hero.sortOrder)))
        formData.append('imageUrl', hero.imageUrl || '/assets/hero-food.png')

        if (imageFile instanceof File && imageFile.size > 0) {
            formData.append('image', imageFile)
        }

        setSavingId(hero.id)
        try {
            const data = await heroApi.update(hero.id, formData)
            setHeroSlides(current => current.map(s => s.id === hero.id ? data : s).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)))
            setEditingHero(null)
            notify('บันทึกการแก้ไขแบนเนอร์แล้ว')
        } catch (error) {
            fail(error)
        } finally {
            setSavingId(null)
        }
    }

    const toggleHero = async hero => {
        setTogglingId(hero.id)
        try {
            await heroApi.update(hero.id, { isActive: !hero.isActive })
            setHeroSlides(current => current.map(s => s.id === hero.id ? { ...s, isActive: !hero.isActive } : s))
            notify(hero.isActive ? 'ซ่อนแบนเนอร์แล้ว' : 'เปิดแสดงแบนเนอร์แล้ว')
        } catch (error) {
            fail(error)
        } finally {
            setTogglingId(null)
        }
    }

    const deleteHero = async id => {
        if (!window.confirm('ลบแบนเนอร์นี้ออกจากหน้าแรกใช่หรือไม่?')) return
        setDeletingId(id)
        try {
            await heroApi.remove(id)
            setHeroSlides(current => current.filter(s => s.id !== id))
            notify('ลบแบนเนอร์เรียบร้อยแล้ว')
        } catch (error) {
            fail(error)
        } finally {
            setDeletingId(null)
        }
    }

    return (
        <>
            <PageHead
                eyebrow="HOMEPAGE BANNER"
                title="จัดการแบนเนอร์หน้าแรก (Hero Section)"
                description="จัดการป้ายสไลด์โปรโมทสินค้า ดีลพิเศษ หรือภาพไฮไลท์เด่นที่จะแสดงด้านบนสุดของหน้าแรก"
            />
            <div className="admin-hero-theme-tip">
                <i className="bi bi-palette-fill" />
                <div>
                    <strong>ระบบสลับสีพื้นหลังแบนเนอร์อัตโนมัติตามธีม (2 สี)</strong>
                    <p>
                        พื้นหลังของแบนเนอร์แต่ละสไลด์จะสลับ 2 โทนสีระหว่าง <b>โทนไฮไลท์สดใส (Accent)</b> และ <b>โทนสว่างประกายแดด (Highlight)</b> ให้โดยอัตโนมัติตามธีมสีของเว็บไซต์ โดยไม่ซ้ำหรือกลืนกับสีพื้นหลังของส่วนโปรโมชั่นด้านล่าง
                    </p>
                </div>
            </div>
            <form className="admin-marketing-form" onSubmit={addHero}>
                <label className="wide">
                    หัวข้อย่อยด้านบน (Eyebrow - ภาษาไทย)
                    <input name="eyebrow" required placeholder="เช่น LIMELEAF CATERING หรือ โปรโมชั่นพิเศษ" />
                </label>
                <label className="wide">
                    หัวข้อย่อยด้านบน (Eyebrow - ภาษาอังกฤษ)
                    <input name="eyebrowEn" placeholder="e.g. LIMELEAF CATERING or SPECIAL PROMOTION" />
                </label>
                <label className="wide">
                    หัวข้อหลัก (Title - ภาษาไทย)
                    <input name="title" required placeholder="เช่น สดใหม่ทุกโอกาส หรือ เมนูแนะนำประจำสัปดาห์" />
                </label>
                <label className="wide">
                    หัวข้อหลัก (Title - ภาษาอังกฤษ)
                    <input name="titleEn" placeholder="e.g. Fresh for Every Occasion" />
                </label>
                <label className="wide">
                    รายละเอียด (Description - ภาษาไทย)
                    <textarea name="description" required placeholder="คำอธิบายสั้นๆ ดึงดูดลูกค้า เช่น บริการจัดเลี้ยงอาหารไทยรสชาติต้นตำรับ..." />
                </label>
                <label className="wide">
                    รายละเอียด (Description - ภาษาอังกฤษ)
                    <textarea name="descriptionEn" placeholder="Short engaging description in English..." />
                </label>
                <label>
                    ข้อความบนปุ่มกด (TH)
                    <input name="buttonLabel" required defaultValue="สั่งเลย" placeholder="เช่น สั่งเลย, ดูเมนู" />
                </label>
                <label>
                    ข้อความบนปุ่มกด (EN)
                    <input name="buttonLabelEn" defaultValue="Order Now" placeholder="e.g. Order Now, View Menu" />
                </label>
                <label>
                    ปลายทางเมื่อกดปุ่ม (Button Link)
                    <select name="buttonLink" defaultValue="/order">
                        {PAGE_LINK_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                </label>
                <label>
                    ลำดับการแสดงผล (Sort Order)
                    <input name="sortOrder" type="number" min="0" defaultValue={heroSlides.length + 1} title="เลขน้อยจะแสดงก่อน" />
                </label>
                <label className="wide" style={{ gridColumn: '1 / -1' }}>
                    อัปโหลดรูปภาพแบนเนอร์ (ไม่เกิน 5 MB)
                    <input name="image" type="file" accept="image/*" />
                    <span style={{ fontSize: '11px', color: 'var(--brand-muted)', marginTop: '4px', display: 'block' }}>
                        * ขนาดมาตรฐานที่แนะนำ: อัตราส่วน 16:10 หรือ 16:9 (เช่น 1200×750px หรือ 960×600px) ระบบจะปรับและ Crop พอดีกรอบมาตรฐานของทุกแบนเนอร์ให้อัตโนมัติ
                    </span>
                </label>
                <button className="admin-primary" disabled={isAdding} style={{ gridColumn: '1 / -1' }}>
                    {isAdding ? <><i className="bi bi-arrow-repeat spin" /> กำลังเพิ่มแบนเนอร์...</> : '+ เพิ่มแบนเนอร์หน้าแรก'}
                </button>
            </form>
            <div className="admin-hero-list">
                {heroSlides.length === 0 ? (
                    <Empty>ยังไม่มีแบนเนอร์สไลด์หน้าแรก กรุณากรอกแบบฟอร์มด้านบนเพื่อเพิ่มแบนเนอร์</Empty>
                ) : (
                    heroSlides.map((hero, index) => {
                        const isAltTone = index % 2 === 1
                        const previewBg = isAltTone
                            ? 'linear-gradient(135deg, var(--brand-highlight, #edf38b) 0%, var(--brand-accent-soft, #effbdc) 100%)'
                            : 'linear-gradient(135deg, var(--brand-accent) 0%, var(--brand-accent-strong, var(--brand-accent)) 100%)'
                        return (
                            <article key={hero.id} className={`${!hero.isActive ? 'inactive' : ''} ${editingHero === hero.id ? 'is-editing' : ''}`}>
                                <div className="admin-hero-preview" style={{ background: previewBg }}>
                                    <img src={hero.imageUrl} alt="" />
                                    <span>ลำดับที่ {hero.sortOrder} • {isAltTone ? 'โทน 2 (โกลเด้นไฮไลท์)' : 'โทน 1 (ไลม์สดใส)'}</span>
                                </div>
                                {editingHero === hero.id ? (
                                    <form className="admin-edit-form" onSubmit={event => saveHero(event, hero)}>
                                        <label className="wide">หัวข้อย่อยด้านบน (ภาษาไทย)<input name="eyebrow" required defaultValue={hero.eyebrow} /></label>
                                        <label className="wide">หัวข้อย่อยด้านบน (ภาษาอังกฤษ)<input name="eyebrowEn" defaultValue={hero.eyebrowEn || ''} placeholder="e.g. LIMELEAF CATERING" /></label>
                                        <label className="wide">หัวข้อหลัก (ภาษาไทย)<input name="title" required defaultValue={hero.title} /></label>
                                        <label className="wide">หัวข้อหลัก (ภาษาอังกฤษ)<input name="titleEn" defaultValue={hero.titleEn || ''} placeholder="e.g. Fresh for Every Occasion" /></label>
                                        <label className="wide">รายละเอียด (ภาษาไทย)<textarea name="description" required defaultValue={hero.description} /></label>
                                        <label className="wide">รายละเอียด (ภาษาอังกฤษ)<textarea name="descriptionEn" defaultValue={hero.descriptionEn || ''} placeholder="Short English description..." /></label>
                                        <label>ข้อความบนปุ่มกด (TH)<input name="buttonLabel" required defaultValue={hero.buttonLabel} /></label>
                                        <label>ข้อความบนปุ่มกด (EN)<input name="buttonLabelEn" defaultValue={hero.buttonLabelEn || ''} placeholder="e.g. Order Now" /></label>
                                        <label>ปลายทางเมื่อกดปุ่ม
                                            <select name="buttonLink" defaultValue={hero.buttonLink || '/order'}>
                                                {PAGE_LINK_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                                {!PAGE_LINK_OPTIONS.some(opt => opt.value === hero.buttonLink) && (
                                                    <option value={hero.buttonLink}>{hero.buttonLink} (กำหนดเอง)</option>
                                                )}
                                            </select>
                                        </label>
                                        <label>ลำดับการแสดงผล<input name="sortOrder" type="number" min="0" defaultValue={hero.sortOrder} /></label>
                                        <label className="wide" style={{ gridColumn: '1 / -1' }}>
                                            เลือกเปลี่ยนรูปภาพใหม่ (ไม่เกิน 5 MB)
                                            <input name="image" type="file" accept="image/*" />
                                            <span style={{ fontSize: '11px', color: 'var(--brand-muted)', marginTop: '4px', display: 'block' }}>
                                                * ขนาดมาตรฐานที่แนะนำ: อัตราส่วน 16:10 หรือ 16:9 (ระบบจะ Crop พอดีกรอบมาตรฐานทุกแบนเนอร์ให้อัตโนมัติ)
                                            </span>
                                        </label>
                                        <div className="admin-form-actions">
                                            <button type="button" onClick={() => setEditingHero(null)}>ยกเลิก</button>
                                            <button className="admin-primary" disabled={savingId === hero.id}>
                                                {savingId === hero.id ? <><i className="bi bi-arrow-repeat spin" /> กำลังบันทึก...</> : 'บันทึกการแก้ไข'}
                                            </button>
                                        </div>
                                    </form>
                                ) : (
                                    <div className="admin-hero-info">
                                        <small>
                                            {hero.eyebrow}
                                            {hero.eyebrowEn && <span style={{ color: 'var(--brand-muted)', marginLeft: 6 }}>({hero.eyebrowEn})</span>}
                                        </small>
                                        <h2>
                                            {hero.title}
                                            {hero.titleEn && <span style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--brand-muted)', marginTop: 2 }}>{hero.titleEn}</span>}
                                        </h2>
                                        <p>{hero.description}</p>
                                        {hero.descriptionEn && <p style={{ fontSize: 12, color: '#68776b', fontStyle: 'italic', margin: '2px 0 6px' }}>{hero.descriptionEn}</p>}
                                        <b>
                                            {hero.buttonLabel}
                                            {hero.buttonLabelEn && <span style={{ fontWeight: 500, color: 'var(--brand-muted)', marginLeft: 4 }}>({hero.buttonLabelEn})</span>}
                                            {' → '}{hero.buttonLink}
                                        </b>
                                    </div>
                                )}
                                {editingHero !== hero.id && (
                                    <footer>
                                        <button onClick={() => setEditingHero(hero.id)}>แก้ไข</button>
                                        <button disabled={togglingId === hero.id} onClick={() => toggleHero(hero)}>
                                            {togglingId === hero.id ? <><i className="bi bi-arrow-repeat spin" /> กำลังเปลี่ยนสถานะ...</> : (hero.isActive ? 'ซ่อนจากหน้าแรก' : 'เปิดแสดงบนหน้าแรก')}
                                        </button>
                                        <button className="admin-text-danger" disabled={deletingId === hero.id} onClick={() => deleteHero(hero.id)}>
                                            {deletingId === hero.id ? <><i className="bi bi-arrow-repeat spin" /> กำลังลบ...</> : 'ลบแบนเนอร์'}
                                        </button>
                                    </footer>
                                )}
                            </article>
                        )
                    })
                )}
            </div>
        </>
    )
}

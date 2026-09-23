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
        const form = new FormData(event.currentTarget)
        const payload = {
            eyebrow: form.get('eyebrow')?.trim() || '',
            title: form.get('title')?.trim() || '',
            description: form.get('description')?.trim() || '',
            buttonLabel: form.get('buttonLabel')?.trim() || 'สั่งเลย',
            buttonLink: form.get('buttonLink')?.trim() || '/order',
            backgroundColor: form.get('backgroundColor') || '#b8ff35',
            sortOrder: Number(form.get('sortOrder') || heroSlides.length + 1),
            imageUrl: form.get('imageUrl')?.trim() || '/assets/hero-food.png',
        }
        if (!payload.title) return notify('กรุณาใส่หัวข้อหลัก')
        setIsAdding(true)
        try {
            const data = await heroApi.create(payload)
            setHeroSlides(current => [...current, data].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)))
            event.currentTarget.reset()
            notify('เพิ่มแบนเนอร์หน้าแรกเรียบร้อยแล้ว')
        } catch (error) {
            fail(error)
        } finally {
            setIsAdding(false)
        }
    }

    const saveHero = async (event, hero) => {
        event.preventDefault()
        const form = new FormData(event.currentTarget)
        const payload = {
            eyebrow: form.get('eyebrow')?.trim() || '',
            title: form.get('title')?.trim() || '',
            description: form.get('description')?.trim() || '',
            buttonLabel: form.get('buttonLabel')?.trim() || 'สั่งเลย',
            buttonLink: form.get('buttonLink')?.trim() || '/order',
            backgroundColor: form.get('backgroundColor') || '#b8ff35',
            sortOrder: Number(form.get('sortOrder') || hero.sortOrder),
            imageUrl: form.get('imageUrl')?.trim() || hero.imageUrl,
        }
        setSavingId(hero.id)
        try {
            const data = await heroApi.update(hero.id, payload)
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
            <form className="admin-marketing-form" onSubmit={addHero}>
                <label>
                    หัวข้อย่อยด้านบน (Eyebrow)
                    <input name="eyebrow" required placeholder="เช่น LIMELEAF CATERING หรือ โปรโมชั่นพิเศษ" />
                </label>
                <label>
                    หัวข้อหลัก (Title)
                    <input name="title" required placeholder="เช่น สดใหม่ทุกโอกาส หรือ เมนูแนะนำประจำสัปดาห์" />
                </label>
                <label className="wide">
                    รายละเอียด (Description)
                    <textarea name="description" required placeholder="คำอธิบายสั้นๆ ดึงดูดลูกค้า เช่น บริการจัดเลี้ยงอาหารไทยรสชาติต้นตำรับ..." />
                </label>
                <label>
                    ข้อความบนปุ่มกด (Button Label)
                    <input name="buttonLabel" required defaultValue="สั่งเลย" placeholder="เช่น สั่งเลย, ดูเมนู, จองโต๊ะ" />
                </label>
                <label>
                    ปลายทางเมื่อกดปุ่ม (Button Link)
                    <select name="buttonLink" defaultValue="/order">
                        {PAGE_LINK_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                </label>
                <label>
                    สีพื้นหลังแบนเนอร์ (Background)
                    <input name="backgroundColor" type="color" defaultValue="#b8ff35" />
                </label>
                <label>
                    ลำดับการแสดงผล (Sort Order)
                    <input name="sortOrder" type="number" min="0" defaultValue={heroSlides.length + 1} title="เลขน้อยจะแสดงก่อน" />
                </label>
                <label className="wide">
                    ลิงก์รูปภาพ (Image URL)
                    <input name="imageUrl" placeholder="/assets/hero-food.png หรือ https://..." />
                </label>
                <label className="wide">
                    หรือเลือกไฟล์รูปจากเครื่อง (ไม่เกิน 5 MB)
                    <input name="image" type="file" accept="image/*" />
                </label>
                <button className="admin-primary" disabled={isAdding}>
                    {isAdding ? <><i className="bi bi-arrow-repeat spin" /> กำลังเพิ่มแบนเนอร์...</> : '+ เพิ่มแบนเนอร์หน้าแรก'}
                </button>
            </form>
            <div className="admin-hero-list">
                {heroSlides.length === 0 ? (
                    <Empty>ยังไม่มีแบนเนอร์สไลด์หน้าแรก กรุณากรอกแบบฟอร์มด้านบนเพื่อเพิ่มแบนเนอร์</Empty>
                ) : (
                    heroSlides.map(hero => (
                        <article key={hero.id} className={!hero.isActive ? 'inactive' : ''}>
                            <div className="admin-hero-preview" style={{ background: hero.backgroundColor }}>
                                <img src={hero.imageUrl} alt="" />
                                <span>ลำดับที่ {hero.sortOrder}</span>
                            </div>
                            {editingHero === hero.id ? (
                                <form className="admin-edit-form" onSubmit={event => saveHero(event, hero)}>
                                    <label>หัวข้อย่อยด้านบน<input name="eyebrow" required defaultValue={hero.eyebrow} /></label>
                                    <label>หัวข้อหลัก<input name="title" required defaultValue={hero.title} /></label>
                                    <label className="wide">รายละเอียด<textarea name="description" required defaultValue={hero.description} /></label>
                                    <label>ข้อความบนปุ่มกด<input name="buttonLabel" required defaultValue={hero.buttonLabel} /></label>
                                    <label>ปลายทางเมื่อกดปุ่ม
                                        <select name="buttonLink" defaultValue={hero.buttonLink || '/order'}>
                                            {PAGE_LINK_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                            {!PAGE_LINK_OPTIONS.some(opt => opt.value === hero.buttonLink) && (
                                                <option value={hero.buttonLink}>{hero.buttonLink} (กำหนดเอง)</option>
                                            )}
                                        </select>
                                    </label>
                                    <label>สีพื้นหลังแบนเนอร์<input name="backgroundColor" type="color" defaultValue={hero.backgroundColor} /></label>
                                    <label>ลำดับการแสดงผล<input name="sortOrder" type="number" min="0" defaultValue={hero.sortOrder} /></label>
                                    <label className="wide">ลิงก์รูปภาพ<input name="imageUrl" defaultValue={hero.imageUrl} /></label>
                                    <label className="wide">เปลี่ยนรูปภาพใหม่<input name="image" type="file" accept="image/*" /></label>
                                    <div className="admin-form-actions">
                                        <button type="button" onClick={() => setEditingHero(null)}>ยกเลิก</button>
                                        <button className="admin-primary" disabled={savingId === hero.id}>
                                            {savingId === hero.id ? <><i className="bi bi-arrow-repeat spin" /> กำลังบันทึก...</> : 'บันทึกการแก้ไข'}
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <div className="admin-hero-info">
                                    <small>{hero.eyebrow}</small>
                                    <h2>{hero.title}</h2>
                                    <p>{hero.description}</p>
                                    <b>{hero.buttonLabel} → {hero.buttonLink}</b>
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
                    ))
                )}
            </div>
        </>
    )
}

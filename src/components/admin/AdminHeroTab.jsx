import { useState } from 'react'
import { heroApi } from '../../lib/database'
import { PageHead, Empty, PAGE_LINK_OPTIONS } from './AdminShared'

export function AdminHeroTab({ heroSlides, setHeroSlides, notify, fail }) {
    const [editingHero, setEditingHero] = useState(null)

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
        try {
            const data = await heroApi.create(payload)
            setHeroSlides(current => [...current, data].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)))
            event.currentTarget.reset()
            notify('เพิ่ม Hero Slide แล้ว')
        } catch (error) {
            fail(error)
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
        try {
            const data = await heroApi.update(hero.id, payload)
            setHeroSlides(current => current.map(s => s.id === hero.id ? data : s).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)))
            setEditingHero(null)
            notify('บันทึก Hero Slide แล้ว')
        } catch (error) {
            fail(error)
        }
    }

    const toggleHero = async hero => {
        try {
            await heroApi.update(hero.id, { isActive: !hero.isActive })
            setHeroSlides(current => current.map(s => s.id === hero.id ? { ...s, isActive: !hero.isActive } : s))
        } catch (error) {
            fail(error)
        }
    }

    const deleteHero = async id => {
        if (!window.confirm('ลบ Hero Slide นี้?')) return
        try {
            await heroApi.remove(id)
            setHeroSlides(current => current.filter(s => s.id !== id))
            notify('ลบ Hero Slide แล้ว')
        } catch (error) {
            fail(error)
        }
    }

    return (
        <>
            <PageHead eyebrow="HOMEPAGE HERO" title="จัดการ Hero หน้าแรก" description="เพิ่ม แก้ไข เรียงลำดับ และเลือกสไลด์ที่แสดงบนหน้าเว็บ" />
            <form className="admin-marketing-form" onSubmit={addHero}>
                <label>ข้อความกำกับ<input name="eyebrow" required placeholder="LIMELEAF CATERING" /></label>
                <label>หัวข้อหลัก<input name="title" required placeholder="สดใหม่ทุกโอกาส" /></label>
                <label className="wide">รายละเอียด<textarea name="description" required placeholder="รายละเอียดสั้น ๆ ของแคมเปญ" /></label>
                <label>ข้อความบนปุ่ม<input name="buttonLabel" required defaultValue="สั่งเลย" /></label>
                <label>ลิงก์ปุ่ม
                    <select name="buttonLink" defaultValue="/order">
                        {PAGE_LINK_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                </label>
                <label>สีพื้นหลัง<input name="backgroundColor" type="color" defaultValue="#b8ff35" /></label>
                <label>ลำดับ<input name="sortOrder" type="number" min="0" defaultValue={heroSlides.length + 1} /></label>
                <label className="wide">URL รูปภาพ<input name="imageUrl" placeholder="/assets/hero-food.png หรือ https://..." /></label>
                <label className="wide">หรืออัปโหลดรูป (ไม่เกิน 5 MB)<input name="image" type="file" accept="image/*" /></label>
                <button className="admin-primary">+ เพิ่ม Hero slide</button>
            </form>
            <div className="admin-hero-list">
                {heroSlides.length === 0 ? (
                    <Empty>Server ปัจจุบันไม่มี endpoint สำหรับ Hero slide</Empty>
                ) : (
                    heroSlides.map(hero => (
                        <article key={hero.id} className={!hero.isActive ? 'inactive' : ''}>
                            <div className="admin-hero-preview" style={{ background: hero.backgroundColor }}>
                                <img src={hero.imageUrl} alt="" />
                                <span>ลำดับ {hero.sortOrder}</span>
                            </div>
                            {editingHero === hero.id ? (
                                <form className="admin-edit-form" onSubmit={event => saveHero(event, hero)}>
                                    <label>ข้อความกำกับ<input name="eyebrow" required defaultValue={hero.eyebrow} /></label>
                                    <label>หัวข้อ<input name="title" required defaultValue={hero.title} /></label>
                                    <label className="wide">รายละเอียด<textarea name="description" required defaultValue={hero.description} /></label>
                                    <label>ข้อความบนปุ่ม<input name="buttonLabel" required defaultValue={hero.buttonLabel} /></label>
                                    <label>ลิงก์ปุ่ม
                                        <select name="buttonLink" defaultValue={hero.buttonLink || '/order'}>
                                            {PAGE_LINK_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                            {!PAGE_LINK_OPTIONS.some(opt => opt.value === hero.buttonLink) && (
                                                <option value={hero.buttonLink}>{hero.buttonLink} (กำหนดเอง)</option>
                                            )}
                                        </select>
                                    </label>
                                    <label>สีพื้นหลัง<input name="backgroundColor" type="color" defaultValue={hero.backgroundColor} /></label>
                                    <label>ลำดับ<input name="sortOrder" type="number" min="0" defaultValue={hero.sortOrder} /></label>
                                    <label className="wide">URL รูปภาพ<input name="imageUrl" defaultValue={hero.imageUrl} /></label>
                                    <label className="wide">เปลี่ยนรูป<input name="image" type="file" accept="image/*" /></label>
                                    <div className="admin-form-actions">
                                        <button type="button" onClick={() => setEditingHero(null)}>ยกเลิก</button>
                                        <button className="admin-primary">บันทึก</button>
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
                                    <button onClick={() => toggleHero(hero)}>{hero.isActive ? 'ปิดการแสดง' : 'เปิดการแสดง'}</button>
                                    <button className="admin-text-danger" onClick={() => deleteHero(hero.id)}>ลบ</button>
                                </footer>
                            )}
                        </article>
                    ))
                )}
            </div>
        </>
    )
}

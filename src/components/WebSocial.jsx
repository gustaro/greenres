import { useEffect, useState } from 'react'
import { PageHead } from './AdminDashboard'
import { settingsApi } from '../lib/database'
import { useAuth } from '../lib/AuthContext'

const SOCIAL_FIELDS = [
    { key: 'facebook', label: 'Facebook', icon: 'bi-facebook', placeholder: 'https://facebook.com/yourpage', className: 'facebook' },
    { key: 'instagram', label: 'Instagram', icon: 'bi-instagram', placeholder: 'https://instagram.com/youraccount', className: 'instagram' },
    { key: 'line', label: 'LINE Official', icon: 'bi-chat-dots-fill', placeholder: 'https://lin.ee/your-id', className: 'line' },
]

export const WebSocial = ({ notify, fail }) => {
    const { settings, setSettings } = useAuth()
    const [values, setValues] = useState({ facebook: '', instagram: '', line: '' })

    useEffect(() => {
        if (!settings) return
        setValues({
            facebook: settings.facebookUrl || '',
            instagram: settings.instagramUrl || '',
            line: settings.lineUrl || '',
        })
    }, [settings])

    const updateValue = (key, value) => setValues(current => ({ ...current, [key]: value }))

    const handleSave = async () => {
        try {
            const updatePayload = {
                facebookUrl: values.facebook.trim(),
                instagramUrl: values.instagram.trim(),
                lineUrl: values.line.trim(),
            }
            setSettings(prev => ({ ...prev, ...updatePayload }))
            await settingsApi.update(updatePayload)
            notify('บันทึกข้อมูลโซเชียลมีเดียสำเร็จ')
        } catch (error) {
            fail(error)
        }
    }

    return (
        <>
            <PageHead eyebrow="SETTINGS" title="โซเชียลมีเดีย" description="จัดการช่องทางออนไลน์ที่จะแสดงให้ลูกค้าเห็นในส่วนท้ายเว็บไซต์" />

            <section className="admin-settings-card admin-social-card">
                <header className="admin-settings-card-head">
                    <div className="admin-settings-card-icon"><i className="bi bi-share" /></div>
                    <div>
                        <h2>ช่องทางโซเชียล</h2>
                        <p>เพิ่มลิงก์บัญชีของร้าน ลูกค้าจะสามารถกดไปยังแต่ละแพลตฟอร์มจาก Footer ได้ทันที</p>
                    </div>
                </header>

                <div className="admin-settings-body admin-social-list">
                    {SOCIAL_FIELDS.map(field => (
                        <label className={`admin-social-field ${field.className}`} key={field.key}>
                            <span className="admin-social-icon"><i className={`bi ${field.icon}`} /></span>
                            <span className="admin-social-copy">
                                <b>{field.label}</b>
                                <small>กรอก URL แบบเต็มที่ขึ้นต้นด้วย https://</small>
                            </span>
                            <input
                                type="url"
                                inputMode="url"
                                placeholder={field.placeholder}
                                value={values[field.key]}
                                onChange={event => updateValue(field.key, event.target.value)}
                            />
                        </label>
                    ))}
                </div>

                <footer className="admin-settings-actions">
                    <span><i className="bi bi-eye" /> ลิงก์ที่บันทึกจะแสดงในส่วนท้ายของหน้าเว็บ</span>
                    <button type="button" className="admin-primary admin-settings-save" onClick={handleSave}>
                        <i className="bi bi-check2-circle" /> บันทึกช่องทางโซเชียล
                    </button>
                </footer>
            </section>
        </>
    )
}

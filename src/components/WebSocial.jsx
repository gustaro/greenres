import React, { useState, useEffect } from 'react'
import { PageHead } from './AdminDashboard'
import { settingsApi } from '../lib/database'
import { useAuth } from '../lib/AuthContext'

export const WebSocial = ({ notify, fail }) => {
    const { settings, setSettings } = useAuth()
    const [tempFacebook, setTempFacebook] = useState('')
    const [tempInstagram, setTempInstagram] = useState('')
    const [tempLine, setTempLine] = useState('')

    useEffect(() => {
        if (settings) {
            setTempFacebook(settings.facebookUrl || '')
            setTempInstagram(settings.instagramUrl || '')
            setTempLine(settings.lineUrl || '')
        }
    }, [settings])

    return <>
        <PageHead eyebrow="SETTINGS" title="โซเชียลมีเดีย" description="ตั้งค่าลิงก์เชื่อมต่อไปยังแอปพลิเคชันโซเชียลของคุณ" />
        <section className="ad-panel" style={{ maxWidth: 600 }}>
            <div className="ad-panel-head"><div><h2>อัปเดตช่องทางติดต่อ</h2><p>แก้ไขลิงก์ตามแพลตฟอร์มต่างๆ เพื่อให้ลูกค้ากดใน Footer</p></div></div>
            <div style={{ padding: 24, display: 'grid', gap: 20 }}>
                <label style={{ display: 'grid', gap: 6, fontSize: 13, fontWeight: 700, color: '#1a5c08' }}>
                    Facebook URL
                    <input
                        placeholder="https://facebook.com/..."
                        style={{ padding: 12, borderRadius: 8, border: '1px solid #d7ddd4', fontFamily: 'inherit' }}
                        value={tempFacebook}
                        onChange={e => setTempFacebook(e.target.value)}
                    />
                </label>
                <label style={{ display: 'grid', gap: 6, fontSize: 13, fontWeight: 700, color: '#1a5c08' }}>
                    Instagram URL
                    <input
                        placeholder="https://instagram.com/..."
                        style={{ padding: 12, borderRadius: 8, border: '1px solid #d7ddd4', fontFamily: 'inherit' }}
                        value={tempInstagram}
                        onChange={e => setTempInstagram(e.target.value)}
                    />
                </label>
                <label style={{ display: 'grid', gap: 6, fontSize: 13, fontWeight: 700, color: '#1a5c08' }}>
                    LINE URL
                    <input
                        placeholder="https://lin.ee/..."
                        style={{ padding: 12, borderRadius: 8, border: '1px solid #d7ddd4', fontFamily: 'inherit' }}
                        value={tempLine}
                        onChange={e => setTempLine(e.target.value)}
                    />
                </label>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                    <button
                        className="ad-primary"
                        style={{ padding: '10px 20px', fontSize: 14 }}
                        onClick={async () => {
                            try {
                                const facebookUrl = tempFacebook.trim();
                                const instagramUrl = tempInstagram.trim();
                                const lineUrl = tempLine.trim();
                                setSettings(prev => ({ ...prev, facebookUrl, instagramUrl, lineUrl }));
                                await settingsApi.update({ facebookUrl, instagramUrl, lineUrl });
                                notify('บันทึกข้อมูลโซเชียลมีเดียสำเร็จ');
                            } catch (e) { fail(e) }
                        }}
                    >
                        บันทึกการตั้งค่า
                    </button>
                </div>
            </div>
        </section>
    </>
}

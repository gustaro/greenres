import { useState, useEffect } from 'react'
import { COLOR_THEMES, DEFAULT_THEME_ID, applyTheme } from '../../lib/themeConfig'
import { settingsApi } from '../../lib/database'

export function WebSettingsThemeSection({ settings, setSettings, notify, fail }) {
    const currentServerTheme = settings?.colorTheme || DEFAULT_THEME_ID
    const [selectedThemeId, setSelectedThemeId] = useState(currentServerTheme)
    const [isSaving, setIsSaving] = useState(false)

    useEffect(() => {
        if (settings?.colorTheme) {
            setSelectedThemeId(settings.colorTheme)
        }
    }, [settings?.colorTheme])

    const handleSelectTheme = (themeId) => {
        setSelectedThemeId(themeId)
        // Instant live preview
        applyTheme(themeId)
    }

    const handleSaveTheme = async () => {
        setIsSaving(true)
        try {
            const result = await settingsApi.update({ colorTheme: selectedThemeId })
            setSettings(prev => ({ ...prev, colorTheme: selectedThemeId }))
            applyTheme(selectedThemeId)
            const themeObj = COLOR_THEMES.find(t => t.id === selectedThemeId)
            notify(`บันทึกธีมสี "${themeObj?.nameTh || selectedThemeId}" เรียบร้อยแล้ว`)
        } catch (error) {
            fail(error)
        } finally {
            setIsSaving(false)
        }
    }

    const activeTheme = COLOR_THEMES.find(t => t.id === selectedThemeId) || COLOR_THEMES[0]

    return (
        <section className="admin-settings-card" id="theme-settings">
            <header className="admin-settings-card-head">
                <div className="admin-settings-card-icon" style={{ background: 'rgba(18, 133, 47, 0.12)', color: 'var(--brand-primary, #12852f)' }}>
                    <i className="bi bi-palette2" />
                </div>
                <div>
                    <h2>ธีมสีและบรรยากาศเว็บไซต์ (Color Theme)</h2>
                    <p>เลือกเฉดสีเขียวที่เหมาะกับเอกลักษณ์ร้านของคุณ คลิกเพื่อดูตัวอย่างจริงได้ทันที</p>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                        fontSize: 12,
                        padding: '4px 10px',
                        borderRadius: 20,
                        background: 'var(--brand-accent-soft, #effbdc)',
                        color: 'var(--brand-primary-dark, #075c1b)',
                        fontWeight: 700,
                        border: '1px solid var(--brand-border-soft, #d8e7d2)'
                    }}>
                        ธีมปัจจุบัน: {activeTheme.nameTh}
                    </span>
                </div>
            </header>

            <div className="admin-settings-body">
                {/* ── Theme Selection Grid ── */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))',
                    gap: 16,
                    padding: '6px 0 16px'
                }}>
                    {COLOR_THEMES.map(theme => {
                        const isSelected = selectedThemeId === theme.id
                        const isCurrentActive = currentServerTheme === theme.id
                        return (
                            <div
                                key={theme.id}
                                onClick={() => handleSelectTheme(theme.id)}
                                style={{
                                    border: isSelected ? '2px solid var(--brand-primary, #12852f)' : '1.5px solid #e1ebe0',
                                    borderRadius: 14,
                                    padding: '16px 18px',
                                    background: isSelected ? '#f7fdf7' : '#ffffff',
                                    cursor: 'pointer',
                                    boxShadow: isSelected ? '0 8px 24px rgba(18, 133, 47, 0.16)' : '0 2px 8px rgba(0,0,0,0.04)',
                                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                                    position: 'relative',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between'
                                }}
                            >
                                <div>
                                    {/* Swatch & Badges header */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                            <span
                                                style={{ width: 28, height: 28, borderRadius: '50%', background: theme.preview.primary, display: 'inline-block', boxShadow: '0 2px 6px rgba(0,0,0,0.18)', border: '2px solid #fff' }}
                                                title={`สีหลัก (Primary): ${theme.preview.primary}`}
                                            />
                                            <span
                                                style={{ width: 24, height: 24, borderRadius: '50%', background: theme.preview.accent, display: 'inline-block', boxShadow: '0 2px 5px rgba(0,0,0,0.12)', border: '2px solid #fff' }}
                                                title={`สีเด่น (Accent): ${theme.preview.accent}`}
                                            />
                                            <span
                                                style={{ width: 20, height: 20, borderRadius: '50%', background: theme.preview.dark, display: 'inline-block', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', border: '2px solid #fff' }}
                                                title={`สีเข้ม (Dark): ${theme.preview.dark}`}
                                            />
                                            <span
                                                style={{ width: 18, height: 18, borderRadius: '50%', background: theme.preview.surface, display: 'inline-block', border: '1px solid #ccc' }}
                                                title={`สีพื้นหลัง (Surface): ${theme.preview.surface}`}
                                            />
                                        </div>

                                        <div style={{ display: 'flex', gap: 6 }}>
                                            {theme.badge && (
                                                <span style={{
                                                    fontSize: 10,
                                                    fontWeight: 800,
                                                    padding: '2px 8px',
                                                    borderRadius: 12,
                                                    background: theme.id === 'sage-herb' ? '#e2f5ec' : '#f0f3ee',
                                                    color: theme.id === 'sage-herb' ? '#16624f' : '#4b5563',
                                                    border: theme.id === 'sage-herb' ? '1px solid #94ddbc' : '1px solid #d1d5db'
                                                }}>
                                                    {theme.badge}
                                                </span>
                                            )}
                                            {isCurrentActive && (
                                                <span style={{
                                                    fontSize: 10,
                                                    fontWeight: 900,
                                                    padding: '2px 8px',
                                                    borderRadius: 12,
                                                    background: '#12852f',
                                                    color: '#fff'
                                                }}>
                                                    ใช้งานบนเว็บ
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <h4 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 800, color: isSelected ? 'var(--brand-primary-dark, #075c1b)' : '#1a2e1d', display: 'flex', alignItems: 'center', gap: 6 }}>
                                        {theme.nameTh}
                                    </h4>
                                    <div style={{ fontSize: 12, color: '#6d7b6e', fontWeight: 600, marginBottom: 8 }}>
                                        {theme.name}
                                    </div>
                                    <p style={{ margin: 0, fontSize: 12, lineHeight: 1.55, color: '#4b5563' }}>
                                        {theme.desc}
                                    </p>
                                </div>

                                {/* Active selection check */}
                                <div style={{
                                    marginTop: 14,
                                    paddingTop: 10,
                                    borderTop: '1px dashed #e5e7eb',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    fontSize: 12,
                                    fontWeight: 700
                                }}>
                                    <span style={{ color: isSelected ? 'var(--brand-primary, #12852f)' : '#9ca3af', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                        <i className={`bi ${isSelected ? 'bi-check-circle-fill' : 'bi-circle'}`} style={{ fontSize: 15 }} />
                                        {isSelected ? 'กำลังดูตัวอย่างธีมนี้' : 'คลิกเพื่อทดลองใช้'}
                                    </span>
                                    <span style={{
                                        fontSize: 11,
                                        color: '#6b7280',
                                        background: '#f9fafb',
                                        padding: '2px 6px',
                                        borderRadius: 6,
                                        border: '1px solid #e5e7eb'
                                    }}>
                                        {theme.preview.primary}
                                    </span>
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* ── Live Components Interactive Preview ── */}
                <div style={{
                    marginTop: 8,
                    padding: '16px 20px',
                    borderRadius: 14,
                    background: 'var(--brand-surface, #f6faf2)',
                    border: '1.5px solid var(--brand-border-soft, #d8e7d2)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <i className="bi bi-eye" style={{ color: 'var(--brand-primary, #12852f)', fontSize: 18 }} />
                            <b style={{ fontSize: 13, color: 'var(--brand-primary-dark, #075c1b)' }}>
                                ตัวอย่างจำลององค์ประกอบจริง (Live Preview) — {activeTheme.nameTh}
                            </b>
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--brand-muted, #6d7b6e)' }}>
                            *การแสดงผลจริงจะอัปเดตทุกปุ่ม แบนเนอร์ และแถบเมนูทั่วเว็บไซต์
                        </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                        {/* Primary Button */}
                        <button
                            type="button"
                            style={{
                                background: 'var(--brand-primary, #12852f)',
                                color: '#ffffff',
                                border: 0,
                                padding: '10px 18px',
                                borderRadius: 8,
                                fontWeight: 800,
                                fontSize: 13,
                                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                cursor: 'default'
                            }}
                        >
                            <i className="bi bi-bag-check-fill" /> ปุ่มสั่งอาหาร (Primary)
                        </button>

                        {/* Accent Badge */}
                        <span style={{
                            background: 'var(--brand-accent, #b8ff35)',
                            color: 'var(--brand-primary-dark, #075c1b)',
                            padding: '8px 14px',
                            borderRadius: 8,
                            fontWeight: 900,
                            fontSize: 13,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6
                        }}>
                            <i className="bi bi-stars" /> ป้ายไฮไลท์ (Accent)
                        </span>

                        {/* Soft Pill */}
                        <span style={{
                            background: 'var(--brand-accent-soft, #effbdc)',
                            color: 'var(--brand-primary-dark, #075c1b)',
                            border: '1px solid var(--brand-border, #72aa6e)',
                            padding: '7px 12px',
                            borderRadius: 20,
                            fontWeight: 700,
                            fontSize: 12
                        }}>
                            หมวดหมู่แนะนำ
                        </span>

                        {/* Card mock */}
                        <div style={{
                            background: '#fff',
                            border: '1px solid var(--brand-border-soft, #d8e7d2)',
                            borderRadius: 8,
                            padding: '6px 14px',
                            fontSize: 12,
                            fontWeight: 700,
                            color: 'var(--brand-text, #17351f)'
                        }}>
                            การ์ดเมนูอาหาร ฿145
                        </div>
                    </div>
                </div>
            </div>

            <footer className="admin-settings-actions" style={{ marginTop: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <i className="bi bi-info-circle" style={{ color: 'var(--brand-primary, #12852f)' }} />
                    <span>เมื่อกดบันทึก ลูกค้าและพนักงานทุกคนจะเห็นธีมสีใหม่นี้ทันทีโดยไม่ต้องรีโหลด</span>
                </div>
                <button
                    type="button"
                    className="admin-primary admin-settings-save"
                    onClick={handleSaveTheme}
                    disabled={isSaving}
                    style={{ minWidth: 160 }}
                >
                    {isSaving ? (
                        <><i className="bi bi-arrow-repeat spin" /> กำลังบันทึกธีม...</>
                    ) : (
                        <><i className="bi bi-check2-circle" /> บันทึกธีมสีเว็บไซต์</>
                    )}
                </button>
            </footer>
        </section>
    )
}

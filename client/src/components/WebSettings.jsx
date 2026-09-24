import { useEffect, useState } from 'react'
import { useAuth } from '../lib/AuthContext'
import { settingsApi } from '../lib/database'
import { PageHead } from './admin/AdminShared'
import { WebSettingsMapSection } from './settings/WebSettingsMapSection'
import { WebSettingsPointsSection } from './settings/WebSettingsPointsSection'
import { WebSettingsThemeSection } from './settings/WebSettingsThemeSection'

export function WebSettings({ notify, fail }) {
    const { settings, setSettings } = useAuth()
    const [tempSiteName, setTempSiteName] = useState('')
    const [tempAddress, setTempAddress] = useState('')
    const [tempPhone, setTempPhone] = useState('')
    const [tempFooterDesc, setTempFooterDesc] = useState('')
    const [tempFooterCopyright, setTempFooterCopyright] = useState('')
    const [isUploadingLogo, setIsUploadingLogo] = useState(false)
    const [isSavingGeneral, setIsSavingGeneral] = useState(false)

    useEffect(() => {
        if (!settings) return
        setTempSiteName(settings.siteName || '')
        setTempAddress(settings.restaurantAddress || '')
        setTempPhone(settings.restaurantPhone || '')
        setTempFooterDesc(settings.footerDescription || 'อาหารไทยและฟิวชั่น ทำสดทุกออเดอร์\nส่งตรงถึงบ้านทุกวัน')
        setTempFooterCopyright(settings.footerCopyright || `© ${new Date().getFullYear()} ${settings.siteName || 'LimeLeaf'} Kitchen. All rights reserved.`)
    }, [settings])

    const uploadLogoFile = async e => {
        const file = e.target.files?.[0]
        if (!file) return
        setIsUploadingLogo(true)
        try {
            notify('กำลังอัปโหลดโลโก้...')
            const result = await settingsApi.updateLogo(file)
            setSettings(prev => ({ ...prev, logoUrl: result.logoUrl }))
            notify('อัปโหลดโลโก้สำเร็จ')
        } catch (error) {
            fail(error)
        } finally {
            setIsUploadingLogo(false)
        }
    }

    const handleSaveGeneral = async () => {
        setIsSavingGeneral(true)
        try {
            const updatePayload = {
                siteName: tempSiteName.trim(),
                restaurantAddress: tempAddress.trim(),
                restaurantPhone: tempPhone.trim(),
                footerDescription: tempFooterDesc.trim(),
                footerCopyright: tempFooterCopyright.trim(),
            }

            setSettings(prev => ({ ...prev, ...updatePayload }))
            await settingsApi.update(updatePayload)
            document.title = updatePayload.siteName || 'LimeLeaf Catering'
            notify('บันทึกข้อมูลเว็บไซต์สำเร็จ')
        } catch (error) {
            fail(error)
        } finally {
            setIsSavingGeneral(false)
        }
    }

    return (
        <>
            <PageHead eyebrow="SETTINGS" title="ตั้งค่าเว็บไซต์" description="จัดการข้อมูลร้าน โลโก้ ส่วนท้ายเว็บไซต์ และตำแหน่งร้าน" />

            <div className="admin-settings-stack">
                <section className="admin-settings-card">
                    <header className="admin-settings-card-head">
                        <div className="admin-settings-card-icon"><i className="bi bi-window" /></div>
                        <div>
                            <h2>ข้อมูลเว็บไซต์</h2>
                            <p>ข้อมูลหลักที่ลูกค้าจะเห็นบนเว็บไซต์และใบเสร็จ</p>
                        </div>
                    </header>

                    <div className="admin-settings-body">
                        <div className="admin-settings-section admin-settings-logo-row">
                            <div className="admin-settings-logo-preview">
                                {settings?.logoUrl ? (
                                    <img src={settings.logoUrl} alt="โลโก้เว็บไซต์" />
                                ) : (
                                    <i className="bi bi-image" />
                                )}
                            </div>
                            <div className="admin-settings-logo-copy">
                                <b>โลโก้เว็บไซต์</b>
                                <span>แนะนำไฟล์ PNG หรือ JPG ขนาด 200 × 200 พิกเซล</span>
                                <input type="file" accept="image/png, image/jpeg" id="logoUpload" onChange={uploadLogoFile} disabled={isUploadingLogo} hidden />
                                <label htmlFor="logoUpload" className={`admin-secondary admin-upload-button ${isUploadingLogo ? 'disabled' : ''}`} style={isUploadingLogo ? { opacity: 0.65, pointerEvents: 'none' } : {}}>
                                    {isUploadingLogo ? (
                                        <><i className="bi bi-arrow-repeat spin" /> กำลังอัปโหลดโลโก้...</>
                                    ) : (
                                        <><i className="bi bi-cloud-arrow-up" /> เปลี่ยนรูปโลโก้</>
                                    )}
                                </label>
                            </div>
                        </div>

                        <div className="admin-settings-section">
                            <div className="admin-settings-section-title">
                                <span><i className="bi bi-shop" /></span>
                                <div><b>ข้อมูลร้าน</b><small>ชื่อและช่องทางติดต่อหลัก</small></div>
                            </div>
                            <div className="admin-settings-grid admin-settings-grid--two">
                                <label className="admin-settings-field">
                                    <span>ชื่อเว็บไซต์ / ร้านอาหาร</span>
                                    <input placeholder="LimeLeaf Catering" value={tempSiteName} onChange={e => setTempSiteName(e.target.value)} />
                                </label>
                                <label className="admin-settings-field">
                                    <span>เบอร์โทรร้าน</span>
                                    <input placeholder="0812345678" value={tempPhone} onChange={e => setTempPhone(e.target.value)} />
                                </label>
                                <label className="admin-settings-field admin-settings-field--full">
                                    <span>ที่อยู่ร้าน</span>
                                    <textarea placeholder="เช่น 123 ถนนตัวอย่าง กรุงเทพมหานคร" value={tempAddress} onChange={e => setTempAddress(e.target.value)} />
                                    <small>ใช้แสดงบนใบเสร็จและข้อมูลติดต่อ</small>
                                </label>
                            </div>
                        </div>

                        <div className="admin-settings-section">
                            <div className="admin-settings-section-title">
                                <span><i className="bi bi-layout-text-window-reverse" /></span>
                                <div><b>ส่วนท้ายเว็บไซต์</b><small>ข้อความแนะนำร้านและลิขสิทธิ์</small></div>
                            </div>
                            <div className="admin-settings-grid">
                                <label className="admin-settings-field">
                                    <span>ข้อความโปรยส่วนท้ายเว็บ</span>
                                    <textarea placeholder="อาหารไทยและฟิวชั่น ทำสดทุกออเดอร์" value={tempFooterDesc} onChange={e => setTempFooterDesc(e.target.value)} />
                                </label>
                                <label className="admin-settings-field">
                                    <span>ข้อความลิขสิทธิ์</span>
                                    <input placeholder={`© ${new Date().getFullYear()} LimeLeaf Kitchen. All rights reserved.`} value={tempFooterCopyright} onChange={e => setTempFooterCopyright(e.target.value)} />
                                </label>
                            </div>
                        </div>
                    </div>

                    <footer className="admin-settings-actions">
                        <span><i className="bi bi-info-circle" /> ช่องทางโซเชียลจัดการได้จากเมนู “โซเชียล”</span>
                        <button type="button" className="admin-primary admin-settings-save" onClick={handleSaveGeneral} disabled={isSavingGeneral}>
                            {isSavingGeneral ? (
                                <><i className="bi bi-arrow-repeat spin" /> กำลังบันทึกข้อมูล...</>
                            ) : (
                                <><i className="bi bi-check2-circle" /> บันทึกข้อมูลเว็บไซต์</>
                            )}
                        </button>
                    </footer>
                </section>

                <WebSettingsThemeSection settings={settings} setSettings={setSettings} notify={notify} fail={fail} />
                <WebSettingsPointsSection settings={settings} setSettings={setSettings} notify={notify} fail={fail} />
                <WebSettingsMapSection settings={settings} setSettings={setSettings} notify={notify} fail={fail} />
            </div>
        </>
    )
}

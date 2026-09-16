import { useEffect, useState } from 'react'
import { useAuth } from '../lib/AuthContext'
import { settingsApi } from '../lib/database'
import { PageHead } from './AdminDashboard'

export function WebSettings({ notify, fail }) {
    const { settings, setSettings } = useAuth()
    const [tempMapProvider, setTempMapProvider] = useState('')
    const [tempApiKey, setTempApiKey] = useState('')
    const [tempSiteName, setTempSiteName] = useState('')
    const [tempAddress, setTempAddress] = useState('')
    const [tempPhone, setTempPhone] = useState('')
    const [tempDeliveryFee, setTempDeliveryFee] = useState('')
    const [tempFreeDeliveryThreshold, setTempFreeDeliveryThreshold] = useState('')
    const [tempLat, setTempLat] = useState('')
    const [tempLng, setTempLng] = useState('')

    useEffect(() => {
        if (settings) {
            setTempMapProvider(settings.mapProvider || 'leaflet')
            setTempApiKey(settings.googleMapsApiKey || '')
            setTempSiteName(settings.siteName || '')
            setTempAddress(settings.restaurantAddress || '')
            setTempPhone(settings.restaurantPhone || '')
            setTempDeliveryFee(settings.deliveryFee ?? '')
            setTempFreeDeliveryThreshold(settings.freeDeliveryThreshold ?? '')
            setTempLat(settings.restaurantLat ?? '')
            setTempLng(settings.restaurantLng ?? '')
        }
    }, [settings])

    const uploadLogoFile = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        try {
            notify('กำลังอัปโหลดโลโก้...')
            const result = await settingsApi.updateLogo(file)
            setSettings(prev => ({ ...prev, logoUrl: result.logoUrl }))
            notify('อัปโหลดโลโก้สำเร็จ')
        } catch (error) {
            fail(error)
        }
    }

    return <>
        <PageHead eyebrow="SETTINGS" title="ตั้งค่าเว็บไซต์" description="อัปโหลดโลโก้และตั้งค่าระบบ" />
        <section className="ad-panel" style={{ maxWidth: 600 }}>
            <div className="ad-panel-head"><div><h2>ข้อมูลเว็บไซต์</h2><p>ตั้งค่าชื่อเว็บและโลโก้ที่จะแสดงผลให้ลูกค้าเห็น</p></div></div>
            <div style={{ padding: 24, display: 'grid', gap: 20 }}>
                {/* Logo Section */}
                <div>
                    <label style={{ display: 'flex', gap: 6, fontSize: 13, fontWeight: 700, color: '#1a5c08', marginBottom: 12 }}>โลโก้เว็บไซต์ (แนะนำ 200x200px PNG)</label>
                    <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                        <div style={{ width: 80, height: 80, background: '#f4f6f2', borderRadius: 12, display: 'grid', placeItems: 'center', overflow: 'hidden' }}>
                            {settings?.logoUrl ? <img src={settings.logoUrl} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} alt="Logo" /> : <i className="bi bi-image text-muted" style={{ fontSize: 30, color: '#aab8ab' }}></i>}
                        </div>
                        <div style={{ flex: 1 }}>
                            <input type="file" accept="image/png, image/jpeg" style={{ display: 'none' }} id="logoUpload" onChange={uploadLogoFile} />
                            <label htmlFor="logoUpload" className="ad-secondary" style={{ display: 'inline-block', cursor: 'pointer', margin: 0, padding: '8px 16px', borderRadius: 8, border: '1px solid #d9e0d6' }}>
                                <i className="bi bi-upload"></i> อัปโหลดรูปภาพใหม่
                            </label>
                        </div>
                    </div>
                </div>

                <hr style={{ border: 0, borderTop: '1px solid #eee', margin: '4px 0' }} />

                {/* Site Name Section */}
                <label style={{ display: 'grid', gap: 6, fontSize: 13, fontWeight: 700, color: '#1a5c08' }}>
                    ชื่อเว็บไซต์ / ร้านอาหาร
                    <input
                        placeholder="LimeLeaf Catering"
                        style={{ padding: 12, borderRadius: 8, border: '1px solid #d7ddd4', fontFamily: 'inherit' }}
                        value={tempSiteName}
                        onChange={e => setTempSiteName(e.target.value)}
                    />
                </label>

                <hr style={{ border: 0, borderTop: '1px solid #eee', margin: '4px 0' }} />

                <label style={{ display: 'grid', gap: 6, fontSize: 13, fontWeight: 700, color: '#1a5c08' }}>
                    ที่อยู่ร้าน (สำหรับแสดงในใบเสร็จและติดต่อ)
                    <textarea
                        placeholder="เช่น: 123 บ้านตัวอย่าง ถนนบางกะปิ..."
                        style={{ padding: 12, borderRadius: 8, border: '1px solid #d7ddd4', fontFamily: 'inherit', resize: 'vertical', minHeight: 80 }}
                        value={tempAddress}
                        onChange={e => setTempAddress(e.target.value)}
                    />
                </label>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 15 }}>
                    <label style={{ display: 'grid', gap: 6, fontSize: 13, fontWeight: 700, color: '#1a5c08' }}>
                        เบอร์โทรร้าน
                        <input
                            placeholder="0812345678"
                            style={{ padding: 12, borderRadius: 8, border: '1px solid #d7ddd4', fontFamily: 'inherit' }}
                            value={tempPhone}
                            onChange={e => setTempPhone(e.target.value)}
                        />
                    </label>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                    <button
                        className="ad-primary"
                        style={{ padding: '10px 20px', fontSize: 14 }}
                        onClick={async () => {
                            try {
                                const siteName = tempSiteName.trim();
                                const restaurantAddress = tempAddress.trim();
                                const restaurantPhone = tempPhone.trim();
                                setSettings(prev => ({ ...prev, siteName, restaurantAddress, restaurantPhone }));
                                await settingsApi.update({ siteName, restaurantAddress, restaurantPhone });
                                document.title = siteName || 'LimeLeaf Catering';
                                notify('บันทึกข้อมูลทั่วไปสำเร็จ');
                            } catch (e) { fail(e) }
                        }}
                    >
                        บันทึกข้อมูลเว็บไซต์
                    </button>
                </div>
            </div>
        </section>

        <section className="ad-panel" style={{ maxWidth: 600, marginTop: 20 }}>
            <div className="ad-panel-head"><div><h2>แผนที่สำหรับการจัดส่ง</h2><p>เลือกผู้ให้บริการแผนที่ในหน้าจัดการที่อยู่</p></div></div>
            <div style={{ padding: 24, display: 'grid', gap: 15 }}>
                <label style={{ display: 'grid', gap: 6, fontSize: 13, fontWeight: 700, color: '#1a5c08' }}>
                    ผู้ให้บริการแผนที่ (Map Provider)
                    <select
                        style={{ padding: 12, borderRadius: 8, border: '1px solid #d7ddd4', fontFamily: 'inherit' }}
                        value={tempMapProvider}
                        onChange={e => setTempMapProvider(e.target.value)}>
                        <option value="leaflet">Leaflet (OpenStreetMap - ฟรี ไม่มีค่าใช้จ่าย)</option>
                        <option value="google">Google Maps (แม่นยำสูง - ต้องตั้งค่า API Key)</option>
                    </select>
                </label>
                {tempMapProvider === 'google' && (
                    <label style={{ display: 'grid', gap: 6, fontSize: 13, fontWeight: 700, color: '#1a5c08' }}>
                        Google Maps API Key
                        <input
                            placeholder="AIzaSy..."
                            style={{ padding: 12, borderRadius: 8, border: '1px solid #d7ddd4', fontFamily: 'inherit' }}
                            value={tempApiKey}
                            onChange={e => setTempApiKey(e.target.value)}
                        />
                        <small style={{ fontWeight: 'normal', color: '#6d756d', lineHeight: 1.5 }}>
                            คุณจำเป็นต้องเปิดให้บริการ Geocoding API และ Maps JavaScript API ในโปรเจกต์ของคุณ
                            <a href="https://console.cloud.google.com/google/maps-apis/api-list" target="_blank" rel="noreferrer" style={{ color: '#0f9e1e', marginLeft: 6, textDecoration: 'underline' }}>
                                รับสิทธิ์และ API Key ได้ที่นี่ <i className="bi bi-box-arrow-up-right" style={{ fontSize: 11 }}></i>
                            </a>
                        </small>
                    </label>
                )}

                <hr style={{ border: 0, borderTop: '1px solid #eee', margin: '4px 0' }} />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
                    <label style={{ display: 'grid', gap: 6, fontSize: 13, fontWeight: 700, color: '#1a5c08' }}>
                        ค่าจัดส่งพื้นฐาน (บาท)
                        <input
                            type="number"
                            placeholder="เช่น: 35"
                            style={{ padding: 12, borderRadius: 8, border: '1px solid #d7ddd4', fontFamily: 'inherit' }}
                            value={tempDeliveryFee}
                            onChange={e => setTempDeliveryFee(e.target.value)}
                        />
                    </label>
                    <label style={{ display: 'grid', gap: 6, fontSize: 13, fontWeight: 700, color: '#1a5c08' }}>
                        ยอดสั่งซื้อขั้นต่ำ ส่งฟรี (บาท)
                        <input
                            type="number"
                            placeholder="เช่น: 300"
                            style={{ padding: 12, borderRadius: 8, border: '1px solid #d7ddd4', fontFamily: 'inherit' }}
                            value={tempFreeDeliveryThreshold}
                            onChange={e => setTempFreeDeliveryThreshold(e.target.value)}
                        />
                    </label>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
                    <label style={{ display: 'grid', gap: 6, fontSize: 13, fontWeight: 700, color: '#1a5c08' }}>
                        พิกัดร้าน Latitude
                        <input
                            placeholder="เช่น: 13.7563"
                            style={{ padding: 12, borderRadius: 8, border: '1px solid #d7ddd4', fontFamily: 'inherit' }}
                            value={tempLat}
                            onChange={e => setTempLat(e.target.value)}
                        />
                    </label>
                    <label style={{ display: 'grid', gap: 6, fontSize: 13, fontWeight: 700, color: '#1a5c08' }}>
                        พิกัดร้าน Longitude
                        <input
                            placeholder="เช่น: 100.5018"
                            style={{ padding: 12, borderRadius: 8, border: '1px solid #d7ddd4', fontFamily: 'inherit' }}
                            value={tempLng}
                            onChange={e => setTempLng(e.target.value)}
                        />
                    </label>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                    <button
                        className="ad-primary"
                        style={{ padding: '12px 24px', fontSize: 14 }}
                        onClick={async () => {
                            try {
                                const mapProvider = tempMapProvider;
                                const googleMapsApiKey = tempApiKey.trim();
                                const deliveryFee = tempDeliveryFee;
                                const freeDeliveryThreshold = tempFreeDeliveryThreshold;
                                const restaurantLat = tempLat;
                                const restaurantLng = tempLng;

                                setSettings(prev => ({ ...prev, mapProvider, googleMapsApiKey, deliveryFee, freeDeliveryThreshold, restaurantLat, restaurantLng }));
                                await settingsApi.update({ mapProvider, googleMapsApiKey, deliveryFee, freeDeliveryThreshold, restaurantLat, restaurantLng });
                                notify('บันทึกการตั้งค่าแผนที่สำเร็จ');
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

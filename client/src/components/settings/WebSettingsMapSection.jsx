import { useState, useEffect } from 'react'
import { settingsApi } from '../../lib/database'
import { AdminMapPinPicker } from './AdminMapPinPicker'

export function WebSettingsMapSection({ settings, setSettings, notify, fail }) {
    const [tempMapProvider, setTempMapProvider] = useState('')
    const [tempApiKey, setTempApiKey] = useState('')
    const [tempDeliveryFee, setTempDeliveryFee] = useState('')
    const [tempFreeDeliveryThreshold, setTempFreeDeliveryThreshold] = useState('')
    const [tempLat, setTempLat] = useState('')
    const [tempLng, setTempLng] = useState('')
    const [tempAddress, setTempAddress] = useState('')
    const [tempPhone, setTempPhone] = useState('')
    const [tempStoreHours, setTempStoreHours] = useState('')
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (settings) {
            setTempMapProvider(settings.mapProvider || 'leaflet')
            setTempApiKey(settings.googleMapsApiKey || '')
            setTempDeliveryFee(settings.deliveryFee ?? '')
            setTempFreeDeliveryThreshold(settings.freeDeliveryThreshold ?? '')
            setTempLat(settings.restaurantLat ?? '13.7563')
            setTempLng(settings.restaurantLng ?? '100.5018')
            setTempAddress(settings.restaurantAddress || '')
            setTempPhone(settings.restaurantPhone || '')
            setTempStoreHours(settings.storeHours || 'เปิดบริการทุกวัน: 10:00 - 22:00 น.')
        }
    }, [settings])

    const handleGetCurrentLocation = () => {
        if (!navigator.geolocation) {
            alert('เบราว์เซอร์ของคุณไม่รองรับการระบุพิกัด GPS')
            return
        }
        notify('กำลังค้นหาพิกัดปัจจุบัน...')
        navigator.geolocation.getCurrentPosition(
            pos => {
                const lat = Number(pos.coords.latitude).toFixed(6)
                const lng = Number(pos.coords.longitude).toFixed(6)
                setTempLat(lat)
                setTempLng(lng)
                notify(`ตรวจพบพิกัดปัจจุบัน: ${lat}, ${lng}`)
            },
            err => {
                fail(new Error(`ไม่สามารถระบุพิกัดได้ (${err.message})`))
            },
            { enableHighAccuracy: true, timeout: 10000 }
        )
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            const mapProvider = tempMapProvider
            const googleMapsApiKey = tempApiKey.trim()
            const deliveryFee = tempDeliveryFee
            const freeDeliveryThreshold = tempFreeDeliveryThreshold
            const restaurantLat = tempLat
            const restaurantLng = tempLng
            const restaurantAddress = tempAddress.trim()
            const restaurantPhone = tempPhone.trim()
            const storeHours = tempStoreHours.trim()

            const updatePayload = {
                mapProvider,
                googleMapsApiKey,
                deliveryFee,
                freeDeliveryThreshold,
                restaurantLat,
                restaurantLng,
                restaurantAddress,
                restaurantPhone,
                storeHours
            }

            setSettings(prev => ({ ...prev, ...updatePayload }))
            await settingsApi.update(updatePayload)
            notify('บันทึกการตั้งค่าแผนที่และข้อมูลร้านสำเร็จ')
        } catch (e) {
            fail(e)
        } finally {
            setSaving(false)
        }
    }

    return (
        <section className="admin-settings-card admin-settings-map-card">
            <div className="admin-settings-card-head">
                <div className="admin-settings-card-icon"><i className="bi bi-geo-alt" /></div>
                <div>
                    <h2>แผนที่และที่อยู่ร้าน</h2>
                    <p>ตั้งค่าที่อยู่ร้าน ข้อมูลติดต่อ เวลาทำการ และพิกัดแผนที่สำหรับแสดงผลในหน้าเว็บ</p>
                </div>
            </div>
            <div className="admin-settings-body admin-settings-map-body">
                {/* Store Address & Contact */}
                <label style={{ display: 'grid', gap: 6, fontSize: 13, fontWeight: 700, color: 'var(--brand-primary-dark, #075c1b)' }}>
                    ที่อยู่หน้าร้าน (แสดงบนหน้าเว็บและในใบเสร็จ)
                    <textarea
                        placeholder="เช่น 128 ถนนสุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพฯ 10110"
                        style={{ padding: 12, borderRadius: 8, border: '1px solid #d8e7d2', fontFamily: 'inherit', resize: 'vertical', minHeight: 70 }}
                        value={tempAddress}
                        onChange={e => setTempAddress(e.target.value)}
                    />
                </label>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
                    <label style={{ display: 'grid', gap: 6, fontSize: 13, fontWeight: 700, color: 'var(--brand-primary-dark, #075c1b)' }}>
                        เบอร์โทรร้าน
                        <input
                            placeholder="02-123-4567"
                            style={{ padding: 12, borderRadius: 8, border: '1px solid #d8e7d2', fontFamily: 'inherit' }}
                            value={tempPhone}
                            onChange={e => setTempPhone(e.target.value)}
                        />
                    </label>
                    <label style={{ display: 'grid', gap: 6, fontSize: 13, fontWeight: 700, color: 'var(--brand-primary-dark, #075c1b)' }}>
                        เวลาทำการ
                        <input
                            placeholder="เช่น 10:00 - 22:00 น."
                            style={{ padding: 12, borderRadius: 8, border: '1px solid #d8e7d2', fontFamily: 'inherit' }}
                            value={tempStoreHours}
                            onChange={e => setTempStoreHours(e.target.value)}
                        />
                    </label>
                </div>

                <hr style={{ border: 0, borderTop: '1px solid #eee', margin: '2px 0' }} />

                {/* Map Provider */}
                <label style={{ display: 'grid', gap: 6, fontSize: 13, fontWeight: 700, color: 'var(--brand-primary-dark, #075c1b)' }}>
                    ผู้ให้บริการแผนที่ (Map Provider)
                    <select
                        style={{ padding: 12, borderRadius: 8, border: '1px solid #d8e7d2', fontFamily: 'inherit' }}
                        value={tempMapProvider}
                        onChange={e => setTempMapProvider(e.target.value)}
                    >
                        <option value="leaflet">Leaflet (OpenStreetMap - ฟรี ไม่มีค่าใช้จ่าย)</option>
                        <option value="google">Google Maps (แม่นยำสูง - ต้องตั้งค่า API Key)</option>
                    </select>
                </label>

                {tempMapProvider === 'google' && (
                    <label style={{ display: 'grid', gap: 6, fontSize: 13, fontWeight: 700, color: 'var(--brand-primary-dark, #075c1b)' }}>
                        Google Maps API Key
                        <input
                            placeholder="AIzaSy..."
                            style={{ padding: 12, borderRadius: 8, border: '1px solid #d8e7d2', fontFamily: 'inherit' }}
                            value={tempApiKey}
                            onChange={e => setTempApiKey(e.target.value)}
                        />
                    </label>
                )}

                {/* Coordinates */}
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--brand-primary-dark, #075c1b)' }}>พิกัดที่ตั้งร้านบนแผนที่</span>
                        <button
                            type="button"
                            className="admin-secondary"
                            style={{ padding: '6px 12px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                            onClick={handleGetCurrentLocation}
                        >
                            <i className="bi bi-crosshair"></i> ใช้ตำแหน่ง GPS ปัจจุบันของฉัน
                        </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
                        <label style={{ display: 'grid', gap: 4, fontSize: 12, fontWeight: 600, color: '#555' }}>
                            Latitude
                            <input
                                placeholder="13.7563"
                                style={{ padding: 10, borderRadius: 8, border: '1px solid #d8e7d2', fontFamily: 'inherit' }}
                                value={tempLat}
                                onChange={e => setTempLat(e.target.value)}
                            />
                        </label>
                        <label style={{ display: 'grid', gap: 4, fontSize: 12, fontWeight: 600, color: '#555' }}>
                            Longitude
                            <input
                                placeholder="100.5018"
                                style={{ padding: 10, borderRadius: 8, border: '1px solid #d8e7d2', fontFamily: 'inherit' }}
                                value={tempLng}
                                onChange={e => setTempLng(e.target.value)}
                            />
                        </label>
                    </div>

                    {/* Interactive Admin Map Pin Picker */}
                    <AdminMapPinPicker
                        lat={tempLat}
                        lng={tempLng}
                        onChange={(lat, lng) => {
                            setTempLat(lat)
                            setTempLng(lng)
                        }}
                    />
                </div>

                <hr style={{ border: 0, borderTop: '1px solid #eee', margin: '2px 0' }} />

                {/* Delivery Fees */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
                    <label style={{ display: 'grid', gap: 6, fontSize: 13, fontWeight: 700, color: 'var(--brand-primary-dark, #075c1b)' }}>
                        ค่าจัดส่งพื้นฐาน (บาท)
                        <input
                            type="number"
                            placeholder="เช่น: 35"
                            style={{ padding: 12, borderRadius: 8, border: '1px solid #d8e7d2', fontFamily: 'inherit' }}
                            value={tempDeliveryFee}
                            onChange={e => setTempDeliveryFee(e.target.value)}
                        />
                    </label>
                    <label style={{ display: 'grid', gap: 6, fontSize: 13, fontWeight: 700, color: 'var(--brand-primary-dark, #075c1b)' }}>
                        ยอดสั่งซื้อขั้นต่ำ ส่งฟรี (บาท)
                        <input
                            type="number"
                            placeholder="เช่น: 300"
                            style={{ padding: 12, borderRadius: 8, border: '1px solid #d8e7d2', fontFamily: 'inherit' }}
                            value={tempFreeDeliveryThreshold}
                            onChange={e => setTempFreeDeliveryThreshold(e.target.value)}
                        />
                    </label>
                </div>

                <div className="admin-settings-actions admin-settings-actions--end">
                    <button
                        className="admin-primary admin-settings-save"
                        style={{ padding: '12px 24px', fontSize: 14 }}
                        onClick={handleSave}
                        disabled={saving}
                    >
                        {saving ? (
                            <><i className="bi bi-arrow-repeat spin" /> กำลังบันทึกแผนที่...</>
                        ) : (
                            <><i className="bi bi-check2-circle" /> บันทึกแผนที่และการจัดส่ง</>
                        )}
                    </button>
                </div>
            </div>
        </section>
    )
}

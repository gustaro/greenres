import { useState, useEffect } from 'react'
import { settingsApi } from '../../lib/database'

export function WebSettingsPointsSection({ settings, setSettings, notify, fail }) {
    const [pointsEnabled, setPointsEnabled] = useState(true)
    const [pointsEarnRate, setPointsEarnRate] = useState(10)
    const [pointsRedeemRate, setPointsRedeemRate] = useState(10)
    const [pointsMinRedeem, setPointsMinRedeem] = useState(10)
    const [pointsMaxDiscountPercent, setPointsMaxDiscountPercent] = useState(100)
    const [saving, setSaving] = useState(false)

    // Interactive simulator states
    const [simSpend, setSimSpend] = useState(300)
    const [simPoints, setSimPoints] = useState(100)

    useEffect(() => {
        if (!settings) return
        setPointsEnabled(settings.pointsEnabled !== false)
        setPointsEarnRate(settings.pointsEarnRate !== undefined ? Number(settings.pointsEarnRate) : 10)
        setPointsRedeemRate(settings.pointsRedeemRate !== undefined ? Number(settings.pointsRedeemRate) : 10)
        setPointsMinRedeem(settings.pointsMinRedeem !== undefined ? Number(settings.pointsMinRedeem) : 10)
        setPointsMaxDiscountPercent(settings.pointsMaxDiscountPercent !== undefined ? Number(settings.pointsMaxDiscountPercent) : 100)
    }, [settings])

    const handleSave = async () => {
        setSaving(true)
        try {
            const earnRateNum = Math.max(1, Number(pointsEarnRate) || 10)
            const redeemRateNum = Math.max(1, Number(pointsRedeemRate) || 10)
            const minRedeemNum = Math.max(0, Number(pointsMinRedeem) || 0)
            const maxDiscPctNum = Math.min(100, Math.max(1, Number(pointsMaxDiscountPercent) || 100))

            const payload = {
                pointsEnabled,
                pointsEarnRate: earnRateNum,
                pointsRedeemRate: redeemRateNum,
                pointsMinRedeem: minRedeemNum,
                pointsMaxDiscountPercent: maxDiscPctNum,
            }

            const updated = await settingsApi.update(payload)
            setSettings(prev => ({ ...prev, ...updated }))
            notify('บันทึกการตั้งค่าระบบแต้มสะสมสำเร็จ')
        } catch (error) {
            fail(error)
        } finally {
            setSaving(false)
        }
    }

    // Calculations for live simulator
    const simEarnedPoints = Math.floor(Math.max(0, simSpend) / Math.max(1, Number(pointsEarnRate) || 10))
    const simDiscountValue = Math.floor(Math.max(0, simPoints) / Math.max(1, Number(pointsRedeemRate) || 10))

    return (
        <section className="admin-settings-card">
            <header className="admin-settings-card-head">
                <div className="admin-settings-card-icon" style={{ background: 'rgba(18, 133, 47, 0.12)', color: 'var(--brand-primary, #12852f)' }}>
                    <i className="bi bi-coin" />
                </div>
                <div>
                    <h2>ระบบแต้มสะสม (Loyalty Points Settings)</h2>
                    <p>กำหนดเงื่อนไขการให้แต้มสะสมแก่ลูกค้า และอัตราการแลกแต้มเป็นส่วนลดในตะกร้าสินค้า</p>
                </div>
            </header>

            <div className="admin-settings-body">
                {/* Enable/Disable Toggle */}
                <div className="admin-settings-section" style={{ background: pointsEnabled ? '#f3faf0' : '#fef2f2', border: `1px solid ${pointsEnabled ? '#b8ff35' : '#fecaca'}`, borderRadius: 8, padding: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                <b style={{ fontSize: 14, color: 'var(--brand-primary-dark, #075c1b)' }}>เปิดใช้งานระบบแต้มสะสม</b>
                                <span style={{
                                    fontSize: 11,
                                    fontWeight: 700,
                                    padding: '2px 8px',
                                    borderRadius: 12,
                                    background: pointsEnabled ? 'var(--brand-primary, #12852f)' : '#9ca3af',
                                    color: '#fff'
                                }}>
                                    {pointsEnabled ? 'เปิดใช้งาน (ACTIVE)' : 'ปิดใช้งาน (DISABLED)'}
                                </span>
                            </div>
                            <small style={{ color: '#4b5563', fontSize: 12 }}>
                                {pointsEnabled
                                    ? 'ลูกค้าสามารถสะสมแต้มจากทุกออเดอร์ และนำแต้มมากรอกใช้เป็นส่วนลดในหน้าตะกร้าได้'
                                    : 'ระบบจะไม่แสดงช่องแลกแต้มในตะกร้า และไม่ออกแต้มสะสมให้เมื่อสั่งซื้อ'}
                            </small>
                        </div>
                        <button
                            type="button"
                            onClick={() => setPointsEnabled(prev => !prev)}
                            style={{
                                border: 'none',
                                borderRadius: 20,
                                padding: '8px 18px',
                                fontWeight: 700,
                                fontSize: 13,
                                cursor: 'pointer',
                                background: pointsEnabled ? '#ef4444' : 'var(--brand-primary, #12852f)',
                                color: '#fff',
                                transition: 'all 0.15s'
                            }}
                        >
                            {pointsEnabled ? 'ปิดการใช้งานแต้ม' : 'เปิดการใช้งานแต้ม'}
                        </button>
                    </div>
                </div>

                {/* Earning Rules */}
                <div className="admin-settings-section">
                    <div className="admin-settings-section-title">
                        <span><i className="bi bi-gift" /></span>
                        <div>
                            <b>การสะสมแต้ม (Point Earning)</b>
                            <small>คำนวณและมอบแต้มให้ลูกค้าอัตโนมัติเมื่อออเดอร์เสร็จสิ้น (DELIVERED)</small>
                        </div>
                    </div>
                    <div className="admin-settings-grid admin-settings-grid--two">
                        <label className="admin-settings-field">
                            <span>ยอดซื้อทุกๆ กี่บาท ได้รับ 1 แต้ม (บาท / 1 แต้ม)</span>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="number"
                                    min="1"
                                    step="1"
                                    value={pointsEarnRate}
                                    onChange={e => setPointsEarnRate(e.target.value)}
                                    placeholder="10"
                                />
                                <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: '#888' }}>บาท</span>
                            </div>
                            <small>ค่าเริ่มต้น: 10 บาท = 1 แต้ม (ซื้อ 100 บาท ได้รับ 10 แต้ม)</small>
                        </label>
                    </div>
                </div>

                {/* Redemption Rules */}
                <div className="admin-settings-section">
                    <div className="admin-settings-section-title">
                        <span><i className="bi bi-tag" /></span>
                        <div>
                            <b>การแลกแต้มเป็นส่วนลด (Point Redemption)</b>
                            <small>กำหนดมูลค่าของแต้มเมื่อลูกค้านำมาใช้ลดราคาในตะกร้าสินค้า</small>
                        </div>
                    </div>
                    <div className="admin-settings-grid admin-settings-grid--two">
                        <label className="admin-settings-field">
                            <span>อัตราการแลกแต้ม (กี่แต้ม = ส่วนลด 1 บาท)</span>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="number"
                                    min="1"
                                    step="1"
                                    value={pointsRedeemRate}
                                    onChange={e => setPointsRedeemRate(e.target.value)}
                                    placeholder="10"
                                />
                                <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: '#888' }}>แต้ม = 1 บาท</span>
                            </div>
                            <small>ค่าเริ่มต้น: 10 แต้ม = 1 บาท (100 แต้ม = ส่วนลด 10 บาท)</small>
                        </label>

                        <label className="admin-settings-field">
                            <span>แต้มขั้นต่ำในการแลกต่อออเดอร์</span>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={pointsMinRedeem}
                                    onChange={e => setPointsMinRedeem(e.target.value)}
                                    placeholder="10"
                                />
                                <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: '#888' }}>แต้ม</span>
                            </div>
                            <small>ลูกค้าต้องระบุแต้มอย่างน้อยจำนวนนี้จึงจะใช้งานได้</small>
                        </label>

                        <label className="admin-settings-field">
                            <span>จำกัดส่วนลดสูงสุดจากแต้ม (% ของยอดสินค้า)</span>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="number"
                                    min="1"
                                    max="100"
                                    step="1"
                                    value={pointsMaxDiscountPercent}
                                    onChange={e => setPointsMaxDiscountPercent(e.target.value)}
                                    placeholder="100"
                                />
                                <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: '#888' }}>%</span>
                            </div>
                            <small>100% = สามารถใช้แต้มลดได้เต็มจำนวนยอดสินค้า</small>
                        </label>
                    </div>
                </div>

                {/* Interactive Simulator Card */}
                <div className="admin-settings-section" style={{ background: '#f8faf5', border: '1px dashed #72aa6e', borderRadius: 8, padding: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                        <i className="bi bi-calculator" style={{ fontSize: 16, color: 'var(--brand-primary, #12852f)' }} />
                        <b style={{ fontSize: 13, color: 'var(--brand-primary-dark, #075c1b)' }}>เครื่องมือคำนวณตัวอย่างจำลอง (Live Simulator)</b>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
                        <div style={{ background: '#fff', padding: 12, borderRadius: 6, border: '1px solid #e5e7eb' }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', marginBottom: 4 }}>จำลองการสะสมแต้ม (Earn)</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                <span style={{ fontSize: 12 }}>ยอดซื้อ:</span>
                                <input
                                    type="number"
                                    value={simSpend}
                                    onChange={e => setSimSpend(Number(e.target.value))}
                                    style={{ width: 85, padding: '4px 6px', fontSize: 12, border: '1px solid #ccc', borderRadius: 4 }}
                                />
                                <span style={{ fontSize: 12 }}>บาท</span>
                            </div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--brand-primary, #12852f)' }}>
                                ➜ ลูกค้าจะได้รับ: <span style={{ fontSize: 16 }}>{simEarnedPoints}</span> แต้ม
                            </div>
                        </div>

                        <div style={{ background: '#fff', padding: 12, borderRadius: 6, border: '1px solid #e5e7eb' }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', marginBottom: 4 }}>จำลองการแลกส่วนลด (Redeem)</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                <span style={{ fontSize: 12 }}>แต้มที่ใช้:</span>
                                <input
                                    type="number"
                                    value={simPoints}
                                    onChange={e => setSimPoints(Number(e.target.value))}
                                    style={{ width: 85, padding: '4px 6px', fontSize: 12, border: '1px solid #ccc', borderRadius: 4 }}
                                />
                                <span style={{ fontSize: 12 }}>แต้ม</span>
                            </div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--brand-primary, #12852f)' }}>
                                ➜ ส่วนลดที่ได้รับ: <span style={{ fontSize: 16 }}>฿{simDiscountValue}</span> บาท
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <footer className="admin-settings-actions">
                <span><i className="bi bi-info-circle" /> การแก้ไขจะมีผลกับคำสั่งซื้อใหม่และหน้าตะกร้าทันทีหลังบันทึก</span>
                <button type="button" className="admin-primary admin-settings-save" onClick={handleSave} disabled={saving}>
                    {saving ? (
                        <><i className="bi bi-arrow-repeat spin" /> กำลังบันทึกการตั้งค่าแต้ม...</>
                    ) : (
                        <><i className="bi bi-check2-circle" /> บันทึกการตั้งค่าแต้มสะสม</>
                    )}
                </button>
            </footer>
        </section>
    )
}

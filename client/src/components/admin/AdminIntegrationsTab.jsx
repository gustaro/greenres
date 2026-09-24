import { useState, useEffect } from 'react'
import { useAuth } from '../../lib/AuthContext'
import { settingsApi } from '../../lib/database'
import { PageHead } from './AdminShared'

export function AdminIntegrationsTab({ notify, fail }) {
    const { settings, setSettings } = useAuth()

    // ── Stripe State ──
    const [stripeMode, setStripeMode] = useState('test')
    const [captureMethod, setCaptureMethod] = useState('automatic')
    const [testPubKey, setTestPubKey] = useState('')
    const [testSecKey, setTestSecKey] = useState('')
    const [livePubKey, setLivePubKey] = useState('')
    const [liveSecKey, setLiveSecKey] = useState('')
    const [showTestSec, setShowTestSec] = useState(false)
    const [showLiveSec, setShowLiveSec] = useState(false)
    const [testingStripe, setTestingStripe] = useState(false)
    const [stripeTestResult, setStripeTestResult] = useState(null)
    const [savingStripe, setSavingStripe] = useState(false)

    // ── Cloudinary State ──
    const [cloudName, setCloudName] = useState('')
    const [apiKey, setApiKey] = useState('')
    const [apiSecret, setApiSecret] = useState('')
    const [showApiSecret, setShowApiSecret] = useState(false)
    const [testingCloudinary, setTestingCloudinary] = useState(false)
    const [cloudinaryTestResult, setCloudinaryTestResult] = useState(null)
    const [savingCloudinary, setSavingCloudinary] = useState(false)

    useEffect(() => {
        if (!settings) return
        setStripeMode(settings.stripeMode || 'test')
        setCaptureMethod(settings.stripeCaptureMethod || 'automatic')
        setTestPubKey(settings.stripeTestPublishableKey || '')
        setTestSecKey(settings.stripeTestSecretKey || '')
        setLivePubKey(settings.stripeLivePublishableKey || '')
        setLiveSecKey(settings.stripeLiveSecretKey || '')

        setCloudName(settings.cloudinaryCloudName || '')
        setApiKey(settings.cloudinaryApiKey || '')
        setApiSecret(settings.cloudinaryApiSecret || '')
    }, [settings])

    // ── Stripe Handlers ──
    const handleTestStripe = async () => {
        setTestingStripe(true)
        setStripeTestResult(null)
        try {
            const activeKey = stripeMode === 'live' ? liveSecKey : testSecKey
            const res = await settingsApi.testStripeConnection({
                mode: stripeMode,
                secretKey: activeKey,
            })
            setStripeTestResult(res)
            if (res.ok) {
                notify?.(res.message || 'เชื่อมต่อกับ Stripe สำเร็จ')
            } else {
                fail?.(new Error(res.message || 'การเชื่อมต่อ Stripe ล้มเหลว'))
            }
        } catch (error) {
            setStripeTestResult({ ok: false, message: error.message })
            fail?.(error)
        } finally {
            setTestingStripe(false)
        }
    }

    const handleSaveStripe = async () => {
        setSavingStripe(true)
        try {
            const payload = {
                stripeMode,
                stripeCaptureMethod: captureMethod,
                stripeTestPublishableKey: testPubKey.trim(),
                stripeTestSecretKey: testSecKey.trim(),
                stripeLivePublishableKey: livePubKey.trim(),
                stripeLiveSecretKey: liveSecKey.trim(),
            }
            const updated = await settingsApi.update(payload)
            setSettings?.(prev => ({ ...prev, ...updated }))
            notify?.(`บันทึกการตั้งค่า Stripe (${stripeMode === 'live' ? 'Live Mode' : 'Sandbox Mode'}) สำเร็จ`)
        } catch (error) {
            fail?.(error)
        } finally {
            setSavingStripe(false)
        }
    }

    // ── Cloudinary Handlers ──
    const handleTestCloudinary = async () => {
        setTestingCloudinary(true)
        setCloudinaryTestResult(null)
        try {
            const res = await settingsApi.testCloudinaryConnection({
                cloudName: cloudName.trim(),
                apiKey: apiKey.trim(),
                apiSecret: apiSecret.trim(),
            })
            setCloudinaryTestResult(res)
            if (res.ok) {
                notify?.(res.message || 'เชื่อมต่อกับ Cloudinary สำเร็จ')
            } else {
                fail?.(new Error(res.message || 'การเชื่อมต่อ Cloudinary ล้มเหลว'))
            }
        } catch (error) {
            setCloudinaryTestResult({ ok: false, message: error.message })
            fail?.(error)
        } finally {
            setTestingCloudinary(false)
        }
    }

    const handleSaveCloudinary = async () => {
        setSavingCloudinary(true)
        try {
            const payload = {
                cloudinaryCloudName: cloudName.trim(),
                cloudinaryApiKey: apiKey.trim(),
                cloudinaryApiSecret: apiSecret.trim(),
            }
            const updated = await settingsApi.update(payload)
            setSettings?.(prev => ({ ...prev, ...updated }))
            notify?.('บันทึกการตั้งค่า Cloudinary สำเร็จ')
        } catch (error) {
            fail?.(error)
        } finally {
            setSavingCloudinary(false)
        }
    }

    return (
        <>
            <PageHead
                eyebrow="INTEGRATIONS & APIS"
                title="บริการภายนอก & API"
                description="จัดการคีย์และการเชื่อมต่อระบบชำระเงิน Stripe และระบบจัดเก็บรูปภาพ Cloudinary พร้อมปุ่มทดสอบการเชื่อมต่อจริง"
            />

            <div className="admin-settings-stack">
                {/* ══════════════════════════════════════════════
                    1. STRIPE GATEWAY SECTION
                   ══════════════════════════════════════════════ */}
                <section className="admin-settings-card" id="stripe-integration">
                    <header className="admin-settings-card-head">
                        <div className="admin-settings-card-icon" style={{ background: 'rgba(99, 91, 255, 0.12)', color: '#635bff' }}>
                            <i className="bi bi-credit-card-2-front" />
                        </div>
                        <div>
                            <h2>ระบบชำระเงิน Stripe (Stripe Gateway)</h2>
                            <p>สลับโหมด Sandbox (ทดสอบ) กับ Live (รับเงินจริง) และจัดการคีย์การเชื่อมต่อสำหรับตัดบัตรและ PromptPay</p>
                        </div>
                        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{
                                fontSize: 11,
                                fontWeight: 800,
                                padding: '4px 10px',
                                borderRadius: 20,
                                background: stripeMode === 'live' ? '#dcfce7' : '#dbeafe',
                                color: stripeMode === 'live' ? '#15803d' : '#1d4ed8',
                                border: stripeMode === 'live' ? '1px solid #86efac' : '1px solid #93c5fd'
                            }}>
                                {stripeMode === 'live' ? 'โหมด: รับเงินจริง (LIVE)' : 'โหมด: ทดสอบ (SANDBOX)'}
                            </span>
                        </div>
                    </header>

                    <div className="admin-settings-body">
                        {/* Mode Selector */}
                        <div className="admin-settings-section">
                            <div className="admin-settings-section-title">
                                <span><i className="bi bi-toggles" /></span>
                                <div><b>โหมดการทำงานของ Stripe</b><small>เลือกสถานะการรับเงินของระบบ</small></div>
                            </div>

                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                                gap: 12,
                                marginTop: 10
                            }}>
                                <div
                                    onClick={() => setStripeMode('test')}
                                    style={{
                                        border: stripeMode === 'test' ? '2px solid #3b82f6' : '1px solid #d8e7d2',
                                        background: stripeMode === 'test' ? 'rgba(59, 130, 246, 0.06)' : '#fff',
                                        borderRadius: 12,
                                        padding: '16px',
                                        cursor: 'pointer',
                                        transition: 'all .2s ease',
                                        position: 'relative'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                                        <span style={{
                                            fontSize: 10,
                                            fontWeight: 800,
                                            letterSpacing: '0.5px',
                                            padding: '2px 8px',
                                            borderRadius: 999,
                                            background: '#dbeafe',
                                            color: '#1d4ed8'
                                        }}>
                                            <i className="bi bi-shield-check me-1" /> SANDBOX (TEST)
                                        </span>
                                        <input
                                            type="radio"
                                            name="stripe_mode_int"
                                            checked={stripeMode === 'test'}
                                            onChange={() => setStripeMode('test')}
                                        />
                                    </div>
                                    <b style={{ display: 'block', fontSize: 14, color: '#1e293b' }}>Sandbox Mode (ทดสอบ)</b>
                                    <small style={{ color: '#64748b', fontSize: 12, lineHeight: 1.4, display: 'block', marginTop: 4 }}>
                                        ใช้ทดสอบระบบ รองรับทั้งการจำลองสแกนจ่าย PromptPay QR และบัตรทดสอบ ไม่มีการตัดเงินจริง
                                    </small>
                                </div>

                                <div
                                    onClick={() => setStripeMode('live')}
                                    style={{
                                        border: stripeMode === 'live' ? '2px solid #16a34a' : '1px solid #d8e7d2',
                                        background: stripeMode === 'live' ? 'rgba(22, 163, 74, 0.06)' : '#fff',
                                        borderRadius: 12,
                                        padding: '16px',
                                        cursor: 'pointer',
                                        transition: 'all .2s ease',
                                        position: 'relative'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                                        <span style={{
                                            fontSize: 10,
                                            fontWeight: 800,
                                            letterSpacing: '0.5px',
                                            padding: '2px 8px',
                                            borderRadius: 999,
                                            background: '#dcfce7',
                                            color: '#15803d'
                                        }}>
                                            <i className="bi bi-lightning-charge me-1" /> PRODUCTION (LIVE)
                                        </span>
                                        <input
                                            type="radio"
                                            name="stripe_mode_int"
                                            checked={stripeMode === 'live'}
                                            onChange={() => setStripeMode('live')}
                                        />
                                    </div>
                                    <b style={{ display: 'block', fontSize: 14, color: '#1e293b' }}>Live Mode (รับเงินจริง)</b>
                                    <small style={{ color: '#64748b', fontSize: 12, lineHeight: 1.4, display: 'block', marginTop: 4 }}>
                                        เชื่อมต่อรับเงินจริงจากลูกค้า บัตรเครดิตจะถูกตัดยอดเข้าบัญชีธนาคารของร้าน
                                    </small>
                                </div>
                            </div>
                        </div>

                        {/* Capture Method */}
                        <div className="admin-settings-section">
                            <div className="admin-settings-section-title">
                                <span><i className="bi bi-clock-history" /></span>
                                <div><b>รูปแบบการตัดยอดเงิน (Capture Method)</b><small>กำหนดจังหวะการตัดเงินในบัตร</small></div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12, marginTop: 10 }}>
                                <label style={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: 10,
                                    padding: 12,
                                    borderRadius: 10,
                                    border: captureMethod === 'automatic' ? '2px solid var(--brand-primary, #12852f)' : '1px solid #d8e7d2',
                                    background: captureMethod === 'automatic' ? 'var(--brand-accent-soft, #effbdc)' : '#fff',
                                    cursor: 'pointer'
                                }}>
                                    <input
                                        type="radio"
                                        name="capture_method_int"
                                        checked={captureMethod === 'automatic'}
                                        onChange={() => setCaptureMethod('automatic')}
                                        style={{ marginTop: 3 }}
                                    />
                                    <div>
                                        <b style={{ fontSize: 13, display: 'block', color: 'var(--brand-text, #17351f)' }}>ตัดเงินทันที (Automatic Capture)</b>
                                        <small style={{ fontSize: 11.5, color: 'var(--brand-muted, #6d7b6e)', display: 'block', marginTop: 2 }}>
                                            ตัดยอดเงินในบัตรเครดิตทันทีเมื่อลูกค้าทำรายการสำเร็จ
                                        </small>
                                    </div>
                                </label>

                                <label style={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: 10,
                                    padding: 12,
                                    borderRadius: 10,
                                    border: captureMethod === 'manual' ? '2px solid var(--brand-primary, #12852f)' : '1px solid #d8e7d2',
                                    background: captureMethod === 'manual' ? 'var(--brand-accent-soft, #effbdc)' : '#fff',
                                    cursor: 'pointer'
                                }}>
                                    <input
                                        type="radio"
                                        name="capture_method_int"
                                        checked={captureMethod === 'manual'}
                                        onChange={() => setCaptureMethod('manual')}
                                        style={{ marginTop: 3 }}
                                    />
                                    <div>
                                        <b style={{ fontSize: 13, display: 'block', color: 'var(--brand-text, #17351f)' }}>จองการจ่าย / กันวงเงินไว้ก่อน (Hold / Manual Capture)</b>
                                        <small style={{ fontSize: 11.5, color: 'var(--brand-muted, #6d7b6e)', display: 'block', marginTop: 2 }}>
                                            กันวงเงินไว้ในบัตร แล้วตัดจริงเมื่อแอดมินกดอนุมัติออเดอร์ หากยกเลิกจะคืนเงินฟรีทันที
                                        </small>
                                    </div>
                                </label>
                            </div>
                        </div>

                        {/* API Keys */}
                        <div className="admin-settings-section">
                            <div className="admin-settings-section-title">
                                <span><i className="bi bi-key" /></span>
                                <div>
                                    <b>คีย์เชื่อมต่อ Stripe ({stripeMode === 'live' ? 'Live API Keys' : 'Sandbox Test Keys'})</b>
                                    <small>คีย์จาก Stripe Dashboard ของคุณ</small>
                                </div>
                            </div>

                            {stripeMode === 'test' ? (
                                <div className="admin-settings-grid admin-settings-grid--two">
                                    <label className="admin-settings-field">
                                        <span>Publishable Key (pk_test_...)</span>
                                        <input
                                            placeholder="pk_test_..."
                                            value={testPubKey}
                                            onChange={e => setTestPubKey(e.target.value)}
                                        />
                                        <small>ใช้ในฝั่งหน้าบ้าน (Client-side) สำหรับเรนเดอร์ฟอร์ม</small>
                                    </label>

                                    <label className="admin-settings-field">
                                        <span>Secret Key (sk_test_...)</span>
                                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                            <input
                                                type={showTestSec ? 'text' : 'password'}
                                                placeholder="sk_test_..."
                                                value={testSecKey}
                                                onChange={e => setTestSecKey(e.target.value)}
                                                style={{ width: '100%', paddingRight: 40 }}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowTestSec(!showTestSec)}
                                                style={{
                                                    position: 'absolute',
                                                    right: 8,
                                                    background: 'none',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    color: '#64748b'
                                                }}
                                                title={showTestSec ? 'ซ่อน' : 'แสดง'}
                                            >
                                                <i className={`bi ${showTestSec ? 'bi-eye-slash' : 'bi-eye'}`} />
                                            </button>
                                        </div>
                                        <small>ใช้ในฝั่งหลังบ้าน (Server-side) ปลอดภัย 100%</small>
                                    </label>
                                </div>
                            ) : (
                                <div className="admin-settings-grid admin-settings-grid--two">
                                    <label className="admin-settings-field">
                                        <span>Publishable Key (pk_live_...)</span>
                                        <input
                                            placeholder="pk_live_..."
                                            value={livePubKey}
                                            onChange={e => setLivePubKey(e.target.value)}
                                        />
                                        <small>ใช้ในฝั่งหน้าบ้าน (Live)</small>
                                    </label>

                                    <label className="admin-settings-field">
                                        <span>Secret Key (sk_live_...)</span>
                                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                            <input
                                                type={showLiveSec ? 'text' : 'password'}
                                                placeholder="sk_live_..."
                                                value={liveSecKey}
                                                onChange={e => setLiveSecKey(e.target.value)}
                                                style={{ width: '100%', paddingRight: 40 }}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowLiveSec(!showLiveSec)}
                                                style={{
                                                    position: 'absolute',
                                                    right: 8,
                                                    background: 'none',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    color: '#64748b'
                                                }}
                                                title={showLiveSec ? 'ซ่อน' : 'แสดง'}
                                            >
                                                <i className={`bi ${showLiveSec ? 'bi-eye-slash' : 'bi-eye'}`} />
                                            </button>
                                        </div>
                                        <small>คีย์ลับสำหรับตัดเงินจริง</small>
                                    </label>
                                </div>
                            )}
                        </div>

                        {/* Stripe Test Result */}
                        {stripeTestResult && (
                            <div style={{
                                padding: '12px 16px',
                                borderRadius: 10,
                                background: stripeTestResult.ok ? '#f0fdf4' : '#fef2f2',
                                border: stripeTestResult.ok ? '1px solid #bbf7d0' : '1px solid #fecaca',
                                color: stripeTestResult.ok ? '#15803d' : '#b91c1c',
                                fontSize: 13,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10
                            }}>
                                <i className={`bi ${stripeTestResult.ok ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill'}`} style={{ fontSize: 18 }} />
                                <div style={{ flex: 1 }}>
                                    <b>{stripeTestResult.message}</b>
                                    {stripeTestResult.accountId && (
                                        <small style={{ display: 'block', opacity: 0.85, marginTop: 2 }}>
                                            Account ID: {stripeTestResult.accountId} · สกุลเงิน: {String(stripeTestResult.defaultCurrency).toUpperCase()} · รับเงิน: {stripeTestResult.chargesEnabled ? 'เปิดใช้งานแล้ว' : 'โหมดทดสอบ'}
                                        </small>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Stripe Actions */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between', paddingTop: 8 }}>
                            <button
                                type="button"
                                onClick={handleTestStripe}
                                disabled={testingStripe}
                                style={{
                                    background: '#f1f5f9',
                                    color: '#1e293b',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: 8,
                                    padding: '8px 16px',
                                    fontWeight: 700,
                                    fontSize: 13,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    cursor: 'pointer'
                                }}
                            >
                                <i className={`bi ${testingStripe ? 'bi-arrow-repeat spin' : 'bi-broadcast'}`} />
                                {testingStripe ? 'กำลังตรวจสอบ...' : 'ทดสอบการเชื่อมต่อ Stripe (Test Connection)'}
                            </button>

                            <button
                                type="button"
                                onClick={handleSaveStripe}
                                disabled={savingStripe}
                                className="admin-primary"
                                style={{
                                    borderRadius: 8,
                                    padding: '8px 20px',
                                    fontWeight: 700,
                                    fontSize: 13,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 8
                                }}
                            >
                                <i className={`bi ${savingStripe ? 'bi-arrow-repeat spin' : 'bi-check-lg'}`} />
                                {savingStripe ? 'กำลังบันทึกการตั้งค่า...' : 'บันทึกการตั้งค่า Stripe'}
                            </button>
                        </div>
                    </div>
                </section>

                {/* ══════════════════════════════════════════════
                    2. CLOUDINARY MEDIA STORAGE SECTION
                   ══════════════════════════════════════════════ */}
                <section className="admin-settings-card" id="cloudinary-integration">
                    <header className="admin-settings-card-head">
                        <div className="admin-settings-card-icon" style={{ background: 'rgba(52, 144, 220, 0.12)', color: '#3490dc' }}>
                            <i className="bi bi-cloud-arrow-up" />
                        </div>
                        <div>
                            <h2>ระบบจัดเก็บรูปภาพ Cloudinary (Media Storage)</h2>
                            <p>เชื่อมต่อบริการคลาวด์สำหรับอัปโหลด จัดเก็บ และแปลงขนาดรูปภาพเมนูอาหาร โลโก้ และสลิปการโอนเงินโดยอัตโนมัติ</p>
                        </div>
                        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{
                                fontSize: 11,
                                fontWeight: 800,
                                padding: '4px 10px',
                                borderRadius: 20,
                                background: '#eff6ff',
                                color: '#2563eb',
                                border: '1px solid #bfdbfe'
                            }}>
                                <i className="bi bi-lightning-charge-fill me-1" /> Auto WebP & Resize
                            </span>
                        </div>
                    </header>

                    <div className="admin-settings-body">
                        {/* Information Callout */}
                        <div style={{
                            padding: '12px 16px',
                            borderRadius: 10,
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 12,
                            fontSize: 12.5,
                            color: '#475569',
                            lineHeight: 1.55
                        }}>
                            <i className="bi bi-info-circle-fill" style={{ color: '#3b82f6', fontSize: 16, marginTop: 2 }} />
                            <div>
                                <b style={{ color: '#1e293b' }}>Cloudinary ทำหน้าที่อะไรในระบบ?</b>
                                <div style={{ marginTop: 2 }}>
                                    ใช้ในการจัดเก็บรูปภาพสินค้า, รูปโลโก้ร้าน, สลิปโอนเงินของลูกค้า และรูปถ่ายหลักฐานการจัดส่งของไรเดอร์ โดยรูปทุกใบจะถูกปรับความละเอียดให้เหมาะสม (Auto Compression) และแปลงเป็นรูปแบบ WebP ความเร็วสูงโดยอัตโนมัติ
                                </div>
                            </div>
                        </div>

                        {/* Credentials Form */}
                        <div className="admin-settings-section">
                            <div className="admin-settings-section-title">
                                <span><i className="bi bi-shield-lock" /></span>
                                <div>
                                    <b>คีย์เชื่อมต่อ Cloudinary API</b>
                                    <small>รับได้จากหน้า Cloudinary Console Dashboard (https://cloudinary.com)</small>
                                </div>
                            </div>

                            <div className="admin-settings-grid admin-settings-grid--three">
                                <label className="admin-settings-field">
                                    <span>Cloud Name</span>
                                    <input
                                        placeholder="เช่น my-restaurant-cloud"
                                        value={cloudName}
                                        onChange={e => setCloudName(e.target.value)}
                                    />
                                    <small>ชื่อ Cloud ของบัญชีคุณ</small>
                                </label>

                                <label className="admin-settings-field">
                                    <span>API Key</span>
                                    <input
                                        placeholder="เช่น 144518242947899"
                                        value={apiKey}
                                        onChange={e => setApiKey(e.target.value)}
                                    />
                                    <small>API Key ตัวเลขจากแดชบอร์ด</small>
                                </label>

                                <label className="admin-settings-field">
                                    <span>API Secret</span>
                                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                        <input
                                            type={showApiSecret ? 'text' : 'password'}
                                            placeholder="เช่น 9jlEw25eF_AqZ..."
                                            value={apiSecret}
                                            onChange={e => setApiSecret(e.target.value)}
                                            style={{ width: '100%', paddingRight: 40 }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowApiSecret(!showApiSecret)}
                                            style={{
                                                position: 'absolute',
                                                right: 8,
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                color: '#64748b'
                                            }}
                                            title={showApiSecret ? 'ซ่อน' : 'แสดง'}
                                        >
                                            <i className={`bi ${showApiSecret ? 'bi-eye-slash' : 'bi-eye'}`} />
                                        </button>
                                    </div>
                                    <small>API Secret คีย์ลับความปลอดภัยสูง</small>
                                </label>
                            </div>
                        </div>

                        {/* Cloudinary Test Result */}
                        {cloudinaryTestResult && (
                            <div style={{
                                padding: '12px 16px',
                                borderRadius: 10,
                                background: cloudinaryTestResult.ok ? '#f0fdf4' : '#fef2f2',
                                border: cloudinaryTestResult.ok ? '1px solid #bbf7d0' : '1px solid #fecaca',
                                color: cloudinaryTestResult.ok ? '#15803d' : '#b91c1c',
                                fontSize: 13,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10
                            }}>
                                <i className={`bi ${cloudinaryTestResult.ok ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill'}`} style={{ fontSize: 18 }} />
                                <div style={{ flex: 1 }}>
                                    <b>{cloudinaryTestResult.message}</b>
                                    {cloudinaryTestResult.ok && (
                                        <small style={{ display: 'block', opacity: 0.85, marginTop: 2 }}>
                                            Cloud: {cloudinaryTestResult.cloudName} · สถานะ: {cloudinaryTestResult.status} · แพ็กเกจ: {cloudinaryTestResult.plan}
                                            {cloudinaryTestResult.objectsCount !== null && ` · จำนวนไฟล์: ${cloudinaryTestResult.objectsCount} รูป`}
                                            {cloudinaryTestResult.creditsUsed && ` · โควตาที่ใช้: ${cloudinaryTestResult.creditsUsed}`}
                                        </small>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Cloudinary Actions */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between', paddingTop: 8 }}>
                            <button
                                type="button"
                                onClick={handleTestCloudinary}
                                disabled={testingCloudinary}
                                style={{
                                    background: '#f1f5f9',
                                    color: '#1e293b',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: 8,
                                    padding: '8px 16px',
                                    fontWeight: 700,
                                    fontSize: 13,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    cursor: 'pointer'
                                }}
                            >
                                <i className={`bi ${testingCloudinary ? 'bi-arrow-repeat spin' : 'bi-broadcast'}`} />
                                {testingCloudinary ? 'กำลังตรวจสอบ...' : 'ทดสอบการเชื่อมต่อ Cloudinary (Test Connection)'}
                            </button>

                            <button
                                type="button"
                                onClick={handleSaveCloudinary}
                                disabled={savingCloudinary}
                                className="admin-primary"
                                style={{
                                    borderRadius: 8,
                                    padding: '8px 20px',
                                    fontWeight: 700,
                                    fontSize: 13,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 8
                                }}
                            >
                                <i className={`bi ${savingCloudinary ? 'bi-arrow-repeat spin' : 'bi-check-lg'}`} />
                                {savingCloudinary ? 'กำลังบันทึกการตั้งค่า...' : 'บันทึกการตั้งค่า Cloudinary'}
                            </button>
                        </div>
                    </div>
                </section>
            </div>
        </>
    )
}

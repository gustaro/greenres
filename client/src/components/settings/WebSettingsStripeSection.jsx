import { useState, useEffect } from 'react'
import { settingsApi } from '../../lib/database'

export function WebSettingsStripeSection({ settings, setSettings, notify, fail }) {
    const [stripeMode, setStripeMode] = useState('test')
    const [captureMethod, setCaptureMethod] = useState('automatic')
    const [testPubKey, setTestPubKey] = useState('')
    const [testSecKey, setTestSecKey] = useState('')
    const [livePubKey, setLivePubKey] = useState('')
    const [liveSecKey, setLiveSecKey] = useState('')
    const [showTestSec, setShowTestSec] = useState(false)
    const [showLiveSec, setShowLiveSec] = useState(false)
    const [testingConnection, setTestingConnection] = useState(false)
    const [testResult, setTestResult] = useState(null)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (!settings) return
        setStripeMode(settings.stripeMode || 'test')
        setCaptureMethod(settings.stripeCaptureMethod || 'automatic')
        setTestPubKey(settings.stripeTestPublishableKey || '')
        setTestSecKey(settings.stripeTestSecretKey || '')
        setLivePubKey(settings.stripeLivePublishableKey || '')
        setLiveSecKey(settings.stripeLiveSecretKey || '')
    }, [settings])

    const handleTestConnection = async () => {
        setTestingConnection(true)
        setTestResult(null)
        try {
            const activeKey = stripeMode === 'live' ? liveSecKey : testSecKey
            const res = await settingsApi.testStripeConnection({
                mode: stripeMode,
                secretKey: activeKey,
            })
            setTestResult(res)
            if (res.ok) {
                notify(res.message || 'เชื่อมต่อกับ Stripe สำเร็จ')
            } else {
                fail(new Error(res.message || 'การเชื่อมต่อล้มเหลว'))
            }
        } catch (error) {
            setTestResult({ ok: false, message: error.message })
            fail(error)
        } finally {
            setTestingConnection(false)
        }
    }

    const handleSave = async () => {
        setSaving(true)
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
            setSettings(prev => ({ ...prev, ...updated }))
            notify(`บันทึกการตั้งค่า Stripe (${stripeMode === 'live' ? 'Live Mode' : 'Sandbox Mode'}) สำเร็จ`)
        } catch (error) {
            fail(error)
        } finally {
            setSaving(false)
        }
    }

    return (
        <section className="admin-settings-card">
            <header className="admin-settings-card-head">
                <div className="admin-settings-card-icon" style={{ background: 'rgba(99, 91, 255, 0.12)', color: '#635bff' }}>
                    <i className="bi bi-credit-card-2-front" />
                </div>
                <div>
                    <h2>ระบบชำระเงิน Stripe (Stripe Gateway)</h2>
                    <p>สลับโหมด Sandbox (ทดสอบ) กับ Live (รับเงินจริง) และจัดการคีย์การเชื่อมต่อ</p>
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
                        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
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
                                    name="stripe_mode"
                                    checked={stripeMode === 'test'}
                                    onChange={() => setStripeMode('test')}
                                />
                            </div>
                            <b style={{ display: 'block', fontSize: 14, color: '#1e293b' }}>Sandbox Mode (ทดสอบ)</b>
                            <small style={{ color: '#64748b', fontSize: 12, lineHeight: 1.4, display: 'block', marginTop: 4 }}>
                                ใช้ทดสอบระบบและการจ่ายเงินด้วยบัตรทดสอบ ไม่มีการตัดเงินจริง
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
                                    name="stripe_mode"
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

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, marginTop: 10 }}>
                        <label style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 10,
                            padding: 12,
                            borderRadius: 10,
                            border: captureMethod === 'automatic' ? '2px solid var(--brand-primary)' : '1px solid #d8e7d2',
                            background: captureMethod === 'automatic' ? 'var(--brand-accent-soft)' : '#fff',
                            cursor: 'pointer'
                        }}>
                            <input
                                type="radio"
                                name="capture_method"
                                checked={captureMethod === 'automatic'}
                                onChange={() => setCaptureMethod('automatic')}
                                style={{ marginTop: 3 }}
                            />
                            <div>
                                <b style={{ fontSize: 13, display: 'block', color: 'var(--brand-text)' }}>ตัดเงินทันที (Automatic Capture)</b>
                                <small style={{ fontSize: 11.5, color: 'var(--brand-muted)', display: 'block', marginTop: 2 }}>
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
                            border: captureMethod === 'manual' ? '2px solid var(--brand-primary)' : '1px solid #d8e7d2',
                            background: captureMethod === 'manual' ? 'var(--brand-accent-soft)' : '#fff',
                            cursor: 'pointer'
                        }}>
                            <input
                                type="radio"
                                name="capture_method"
                                checked={captureMethod === 'manual'}
                                onChange={() => setCaptureMethod('manual')}
                                style={{ marginTop: 3 }}
                            />
                            <div>
                                <b style={{ fontSize: 13, display: 'block', color: 'var(--brand-text)' }}>จองการจ่าย / กันวงเงินไว้ก่อน (Hold / Manual Capture)</b>
                                <small style={{ fontSize: 11.5, color: 'var(--brand-muted)', display: 'block', marginTop: 2 }}>
                                    กันวงเงินไว้ในบัตร แล้วตัดจริงเมื่อแอดมินกดอนุมัติออเดอร์ หากยกเลิกจะคืนเงินฟรีทันที
                                </small>
                            </div>
                        </label>
                    </div>
                </div>

                {/* API Keys based on selected mode */}
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

                {/* Test Connection Result Box */}
                {testResult && (
                    <div style={{
                        padding: '12px 16px',
                        borderRadius: 10,
                        background: testResult.ok ? '#f0fdf4' : '#fef2f2',
                        border: testResult.ok ? '1px solid #bbf7d0' : '1px solid #fecaca',
                        color: testResult.ok ? '#15803d' : '#b91c1c',
                        fontSize: 13,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10
                    }}>
                        <i className={`bi ${testResult.ok ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill'}`} style={{ fontSize: 18 }} />
                        <div style={{ flex: 1 }}>
                            <b>{testResult.message}</b>
                            {testResult.accountId && (
                                <small style={{ display: 'block', opacity: 0.85, marginTop: 2 }}>
                                    Account ID: {testResult.accountId} · สกุลเงิน: {String(testResult.defaultCurrency).toUpperCase()} · รับเงิน: {testResult.chargesEnabled ? 'เปิดใช้งานแล้ว' : 'โหมดทดสอบ'}
                                </small>
                            )}
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between', paddingTop: 8 }}>
                    <button
                        type="button"
                        onClick={handleTestConnection}
                        disabled={testingConnection}
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
                        <i className={`bi ${testingConnection ? 'bi-arrow-repeat spin' : 'bi-broadcast'}`} />
                        {testingConnection ? 'กำลังตรวจสอบ...' : 'ทดสอบการเชื่อมต่อ (Test Connection)'}
                    </button>

                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
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
                        <i className="bi bi-check-lg" />
                        {saving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า Stripe'}
                    </button>
                </div>
            </div>
        </section>
    )
}

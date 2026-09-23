import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../../lib/AuthContext'

export function PromptPayQR({
    total = 0,
    reference = '',
    accountName = 'LimeLeaf Restaurant (ไลม์ลีฟ)',
    promptPayId = '081-999-8888',
    compact = false,
    onSimulateSuccess = null,
    isPaid = false,
    isSandbox = undefined,
}) {
    const { settings } = useAuth() || {}
    const isSandboxMode = isSandbox !== undefined ? isSandbox : (settings?.stripeMode !== 'live')

    const [copiedRef, setCopiedRef] = useState(false)
    const [copiedAmount, setCopiedAmount] = useState(false)
    const [timeLeft, setTimeLeft] = useState(900) // 15 minutes countdown
    const [imgLoaded, setImgLoaded] = useState(false)
    const [simulating, setSimulating] = useState(false)
    const [localPaid, setLocalPaid] = useState(false)

    const effectivePaid = isPaid || localPaid

    // Generate stable ref ONCE if not provided - prevents recalculation on 1-sec timer ticks
    const [stableRef] = useState(() => `LL-${Math.floor(100000 + Math.random() * 900000)}`)
    const refCode = reference || stableRef

    const formattedAmount = Number(total || 0).toLocaleString('th-TH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })

    // 15-min countdown (freezes when paid)
    useEffect(() => {
        if (effectivePaid) return
        const timer = setInterval(() => {
            setTimeLeft(prev => (prev > 0 ? prev - 1 : 900))
        }, 1000)
        return () => clearInterval(timer)
    }, [effectivePaid])

    const handleSimulatePayment = () => {
        if (effectivePaid || simulating) return
        setSimulating(true)
        setTimeout(() => {
            setSimulating(false)
            setLocalPaid(true)
            onSimulateSuccess?.({
                refCode,
                amount: total,
                method: 'QR_SIMULATED',
                timestamp: new Date().toISOString(),
            })
        }, 650)
    }

    const handleResetSimulation = () => {
        setLocalPaid(false)
    }

    const minutes = Math.floor(timeLeft / 60)
    const seconds = timeLeft % 60
    const timeDisplay = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`

    // Stable QR code url based on promptPayId, total, and refCode only
    const qrUrl = useMemo(() => {
        const qrData = encodeURIComponent(`PromptPay|${promptPayId}|${total}|${refCode}`)
        return `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=8&data=${qrData}`
    }, [promptPayId, total, refCode])

    const copyToClipboard = (text, type) => {
        navigator.clipboard?.writeText(text)
        if (type === 'ref') {
            setCopiedRef(true)
            setTimeout(() => setCopiedRef(false), 2000)
        } else {
            setCopiedAmount(true)
            setTimeout(() => setCopiedAmount(false), 2000)
        }
    }

    const downloadQR = async () => {
        try {
            const res = await fetch(qrUrl)
            const blob = await res.blob()
            const blobUrl = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = blobUrl
            a.download = `PromptPay-LimeLeaf-${refCode}.png`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(blobUrl)
        } catch {
            window.open(qrUrl, '_blank')
        }
    }

    return (
        <div style={{
            background: '#ffffff',
            borderRadius: 16,
            border: effectivePaid ? '2px solid #22c55e' : '2px solid #1a56be',
            overflow: 'hidden',
            boxShadow: effectivePaid ? '0 8px 24px rgba(34, 197, 94, 0.18)' : '0 8px 24px rgba(26, 86, 190, 0.12)',
            maxWidth: compact ? '100%' : 420,
            margin: '12px auto',
            fontFamily: 'inherit',
            transition: 'border-color 0.25s ease, box-shadow 0.25s ease',
        }}>
            {/* Sandbox Notice Banner */}
            {isSandboxMode && (
                <div style={{
                    background: effectivePaid
                        ? 'linear-gradient(90deg, #ecfdf5 0%, #d1fae5 100%)'
                        : 'linear-gradient(90deg, #fef3c7 0%, #fffbeb 100%)',
                    borderBottom: effectivePaid ? '1px solid #a7f3d0' : '1px solid #fde68a',
                    padding: '6px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: 11,
                    color: effectivePaid ? '#065f46' : '#92400e',
                    fontWeight: 700,
                }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <i className={`bi ${effectivePaid ? 'bi-patch-check-fill' : 'bi-cone-striped'}`} style={{ color: effectivePaid ? '#059669' : '#d97706' }} />
                        <span>{effectivePaid ? 'SANDBOX • จำลองสำเร็จ' : 'SANDBOX MODE • โหมดทดสอบ'}</span>
                    </span>
                    <span style={{
                        fontSize: 10,
                        background: effectivePaid ? '#a7f3d0' : '#fef3c7',
                        color: effectivePaid ? '#065f46' : '#92400e',
                        padding: '1px 6px',
                        borderRadius: 4,
                        border: effectivePaid ? '1px solid #6ee7b7' : '1px solid #fde68a',
                    }}>
                        {effectivePaid ? 'พร้อมบันทึก' : 'ไม่ต้องโอนเงินจริง'}
                    </span>
                </div>
            )}

            {/* Official Thai QR Payment Header */}
            <div style={{
                background: effectivePaid
                    ? 'linear-gradient(135deg, #064e3b 0%, #047857 100%)'
                    : 'linear-gradient(135deg, #002d62 0%, #004b99 100%)',
                color: '#fff',
                padding: compact ? '10px 14px' : '14px 18px',
                textAlign: 'center',
                position: 'relative',
                transition: 'background 0.3s ease',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 2 }}>
                    <div style={{
                        background: '#fff',
                        borderRadius: 6,
                        padding: '2px 6px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4
                    }}>
                        <i className="bi bi-qr-code-scan" style={{ color: effectivePaid ? '#047857' : '#002d62', fontSize: 16, fontWeight: 900 }} />
                        <span style={{ color: effectivePaid ? '#047857' : '#002d62', fontWeight: 900, fontSize: 11, letterSpacing: '0.5px' }}>THAI QR</span>
                    </div>
                    <span style={{ fontWeight: 800, fontSize: 14, letterSpacing: '0.5px' }}>PROMPTPAY พร้อมเพย์</span>
                </div>
                <div style={{ fontSize: 11, opacity: 0.9, fontWeight: 500 }}>
                    {effectivePaid ? 'ระบบได้รับการแจ้งยืนยันยอดเงินเรียบร้อยแล้ว' : 'สแกนจ่ายได้ด้วย Mobile Banking ทุกธนาคาร ฟรีค่าธรรมเนียม'}
                </div>
            </div>

            {/* Account & Amount Info */}
            <div style={{ padding: compact ? '14px 16px' : '18px 22px', textAlign: 'center' }}>
                <div style={{ fontSize: 13, color: '#4b5563', fontWeight: 600 }}>
                    {accountName}
                </div>
                <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                    พร้อมเพย์ ID: <strong style={{ color: '#1f2937' }}>{promptPayId}</strong>
                </div>

                {/* QR Code Container */}
                <div style={{
                    margin: '14px auto',
                    display: 'inline-block',
                    background: '#f9fafb',
                    padding: 12,
                    borderRadius: 16,
                    border: effectivePaid ? '2px solid #86efac' : '1.5px solid #e5e7eb',
                    position: 'relative',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
                }}>
                    {!imgLoaded && (
                        <div style={{
                            width: compact ? 180 : 220,
                            height: compact ? 180 : 220,
                            display: 'grid',
                            placeItems: 'center',
                            background: '#f3f4f6',
                            borderRadius: 12,
                            color: '#9ca3af',
                            fontSize: 12,
                        }}>
                            <span><i className="bi bi-arrow-repeat spin me-2" />กำลังสร้าง QR Code...</span>
                        </div>
                    )}
                    <img
                        src={qrUrl}
                        alt="PromptPay QR Code"
                        onLoad={() => setImgLoaded(true)}
                        style={{
                            width: compact ? 180 : 220,
                            height: compact ? 180 : 220,
                            display: imgLoaded ? 'block' : 'none',
                            borderRadius: 8,
                            filter: effectivePaid ? 'blur(2px) grayscale(40%)' : 'none',
                            transition: 'filter 0.3s ease',
                        }}
                    />

                    {/* Center Brand Badge (when not paid) */}
                    {imgLoaded && !effectivePaid && (
                        <div style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            background: '#fff',
                            borderRadius: '50%',
                            width: 38,
                            height: 38,
                            display: 'grid',
                            placeItems: 'center',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                            border: '2px solid #1a56be',
                        }}>
                            <i className="bi bi-cash" style={{ color: '#1a56be', fontSize: 18 }} />
                        </div>
                    )}

                    {/* Success Overlay when Paid / Simulated */}
                    {effectivePaid && (
                        <div style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'rgba(255, 255, 255, 0.94)',
                            borderRadius: 16,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 16,
                            animation: 'fadeIn 0.25s ease-out',
                            backdropFilter: 'blur(3px)',
                            border: '2px solid #22c55e',
                            boxShadow: 'inset 0 0 16px rgba(34, 197, 94, 0.1)',
                        }}>
                            <div style={{
                                width: 56,
                                height: 56,
                                borderRadius: '50%',
                                background: '#dcfce7',
                                color: '#15803d',
                                display: 'grid',
                                placeItems: 'center',
                                fontSize: 30,
                                marginBottom: 6,
                                boxShadow: '0 4px 14px rgba(34, 197, 94, 0.28)',
                                border: '2px solid #86efac',
                            }}>
                                <i className="bi bi-check2" />
                            </div>
                            <div style={{ fontWeight: 900, fontSize: 16, color: '#166534', lineHeight: 1.2 }}>
                                ได้รับการชำระเงินแล้ว
                            </div>
                            <div style={{ fontSize: 13, fontWeight: 800, color: '#047857', marginTop: 2 }}>
                                ฿{formattedAmount}
                            </div>
                            <div style={{
                                fontSize: 10,
                                color: '#15803d',
                                marginTop: 6,
                                fontWeight: 700,
                                background: '#dcfce7',
                                padding: '2px 8px',
                                borderRadius: 6,
                                border: '1px solid #bbf7d0',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                            }}>
                                <i className="bi bi-patch-check" /> จำลองการโอนสำเร็จ (Sandbox)
                            </div>
                        </div>
                    )}
                </div>

                {/* Amount Highlight */}
                <div style={{
                    background: effectivePaid ? '#ecfdf5' : '#f0f5ff',
                    border: effectivePaid ? '1.5px solid #a7f3d0' : '1.5px solid #bfdbfe',
                    borderRadius: 12,
                    padding: '10px 14px',
                    margin: '8px 0 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'all 0.25s ease',
                }}>
                    <div style={{ textAlign: 'left' }}>
                        <div style={{
                            fontSize: 11,
                            color: effectivePaid ? '#047857' : '#1e40af',
                            fontWeight: 700,
                            textTransform: 'uppercase'
                        }}>
                            {effectivePaid ? 'ยอดเงินที่ชำระแล้ว' : 'ยอดชำระสุทธิ'}
                        </div>
                        <div style={{
                            fontSize: 24,
                            fontWeight: 900,
                            color: effectivePaid ? '#065f46' : '#1e3a8a',
                            lineHeight: 1.2
                        }}>
                            ฿{formattedAmount}
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => copyToClipboard(String(total), 'amount')}
                        style={{
                            background: '#fff',
                            border: effectivePaid ? '1px solid #a7f3d0' : '1px solid #93c5fd',
                            color: effectivePaid ? '#047857' : '#1e40af',
                            padding: '6px 12px',
                            borderRadius: 8,
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                        }}
                    >
                        <i className={`bi ${copiedAmount ? 'bi-check2' : 'bi-clipboard'}`} />
                        {copiedAmount ? 'คัดลอกแล้ว' : 'คัดลอกยอด'}
                    </button>
                </div>

                {/* Simulation Button in Sandbox Mode */}
                {isSandboxMode && (
                    <div style={{ marginBottom: 12 }}>
                        <button
                            type="button"
                            onClick={handleSimulatePayment}
                            disabled={simulating || effectivePaid}
                            style={{
                                width: '100%',
                                padding: compact ? '10px 14px' : '12px 18px',
                                background: effectivePaid
                                    ? 'linear-gradient(135deg, #15803d 0%, #166534 100%)'
                                    : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                color: '#ffffff',
                                border: 0,
                                borderRadius: 12,
                                fontWeight: 800,
                                fontSize: compact ? 12.5 : 13.5,
                                cursor: effectivePaid || simulating ? 'default' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 8,
                                boxShadow: effectivePaid
                                    ? '0 4px 14px rgba(22, 101, 52, 0.25)'
                                    : '0 4px 14px rgba(217, 119, 6, 0.25)',
                                transition: 'all 0.2s ease',
                            }}
                        >
                            {simulating ? (
                                <>
                                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                                    <span>กำลังจำลองการสแกนจ่ายเงิน...</span>
                                </>
                            ) : effectivePaid ? (
                                <>
                                    <i className="bi bi-check-circle-fill" style={{ fontSize: 16 }} />
                                    <span>จำลองการชำระเงินสำเร็จแล้ว!</span>
                                </>
                            ) : (
                                <>
                                    <i className="bi bi-lightning-charge-fill" style={{ fontSize: 16 }} />
                                    <span>จำลองการสแกนจ่ายสำเร็จ (Simulate QR Payment)</span>
                                </>
                            )}
                        </button>

                        {/* Reset test button if in local simulated state */}
                        {effectivePaid && localPaid && (
                            <div style={{ textAlign: 'center', marginTop: 4 }}>
                                <button
                                    type="button"
                                    onClick={handleResetSimulation}
                                    style={{
                                        border: 0,
                                        background: 'transparent',
                                        color: '#6b7280',
                                        fontSize: 11,
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        textDecoration: 'underline',
                                        padding: '2px 8px',
                                    }}
                                >
                                    <i className="bi bi-arrow-counterclockwise me-1" />
                                    ยกเลิกการจำลอง / ทดสอบใหม่
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Reference & Countdown row */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: 12,
                    color: '#6b7280',
                    padding: '0 4px',
                    marginBottom: 14,
                }}>
                    <div>
                        <span>REF: </span>
                        <strong style={{ color: '#111827', letterSpacing: '0.5px' }}>{refCode}</strong>
                        <button
                            type="button"
                            onClick={() => copyToClipboard(refCode, 'ref')}
                            style={{
                                border: 0,
                                background: 'transparent',
                                color: '#1a56be',
                                cursor: 'pointer',
                                marginLeft: 4,
                                padding: 0,
                                fontSize: 12,
                            }}
                            title="คัดลอกรหัสอ้างอิง"
                        >
                            <i className={`bi ${copiedRef ? 'bi-check' : 'bi-copy'}`} />
                        </button>
                    </div>
                    {effectivePaid ? (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#16a34a', fontWeight: 700 }}>
                            <i className="bi bi-check-circle-fill" />
                            <span>ชำระเงินเรียบร้อยแล้ว</span>
                        </div>
                    ) : (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#dc2626', fontWeight: 700 }}>
                            <i className="bi bi-clock-history" />
                            <span>หมดอายุใน {timeDisplay}</span>
                        </div>
                    )}
                </div>

                {/* Save QR button */}
                <button
                    type="button"
                    onClick={downloadQR}
                    style={{
                        width: '100%',
                        padding: '10px 16px',
                        background: '#f8fafc',
                        border: '1.5px solid #cbd5e1',
                        borderRadius: 10,
                        color: '#334155',
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        transition: 'all 0.15s ease',
                    }}
                >
                    <i className="bi bi-download" />
                    <span>บันทึกรูปภาพ QR Code ลงเครื่อง</span>
                </button>

                {/* Instruction Steps */}
                <div style={{
                    marginTop: 14,
                    paddingTop: 12,
                    borderTop: '1px dashed #e5e7eb',
                    textAlign: 'left',
                    fontSize: 11,
                    color: '#6b7280',
                    lineHeight: 1.6,
                }}>
                    <div style={{ fontWeight: 700, color: '#374151', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <i className="bi bi-info-circle-fill text-primary" /> ขั้นตอนการชำระเงิน:
                    </div>
                    <ol style={{ margin: 0, paddingLeft: 16 }}>
                        <li>เปิดแอปธนาคารของท่าน (SCB, KBank, KTB, BBL, TTb ฯลฯ)</li>
                        <li>เลือกเมนู <strong>"สแกน / QR"</strong> แล้วสแกนรหัสด้านบน</li>
                        <li>ตรวจสอบยอดเงินให้ตรงกับ <strong>฿{formattedAmount}</strong> แล้วกดยืนยันในแอป</li>
                        <li>เมื่อโอนเงินเรียบร้อย ให้กดปุ่ม <strong>"ยืนยันการสั่งซื้อ"</strong> ด้านล่าง</li>
                    </ol>
                </div>
            </div>
        </div>
    )
}

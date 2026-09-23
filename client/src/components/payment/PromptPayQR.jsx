import { useState, useEffect } from 'react'

export function PromptPayQR({
    total = 0,
    reference = '',
    accountName = 'LimeLeaf Restaurant (ไลม์ลีฟ)',
    promptPayId = '081-999-8888',
    compact = false,
}) {
    const [copiedRef, setCopiedRef] = useState(false)
    const [copiedAmount, setCopiedAmount] = useState(false)
    const [timeLeft, setTimeLeft] = useState(900) // 15 minutes countdown
    const [imgLoaded, setImgLoaded] = useState(false)

    // Generate stable ref if not provided
    const refCode = reference || `LL-${Math.floor(100000 + Math.random() * 900000)}`
    const formattedAmount = Number(total || 0).toLocaleString('th-TH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })

    // 15-min countdown
    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft(prev => (prev > 0 ? prev - 1 : 900))
        }, 1000)
        return () => clearInterval(timer)
    }, [])

    const minutes = Math.floor(timeLeft / 60)
    const seconds = timeLeft % 60
    const timeDisplay = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`

    const qrData = encodeURIComponent(`PromptPay|${promptPayId}|${total}|${refCode}`)
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=8&data=${qrData}`

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
            border: '2px solid #1a56be',
            overflow: 'hidden',
            boxShadow: '0 8px 24px rgba(26, 86, 190, 0.12)',
            maxWidth: compact ? '100%' : 420,
            margin: '12px auto',
            fontFamily: 'inherit',
        }}>
            {/* Official Thai QR Payment Header */}
            <div style={{
                background: 'linear-gradient(135deg, #002d62 0%, #004b99 100%)',
                color: '#fff',
                padding: compact ? '10px 14px' : '14px 18px',
                textAlign: 'center',
                position: 'relative',
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
                        <i className="bi bi-qr-code-scan" style={{ color: '#002d62', fontSize: 16, fontWeight: 900 }} />
                        <span style={{ color: '#002d62', fontWeight: 900, fontSize: 11, letterSpacing: '0.5px' }}>THAI QR</span>
                    </div>
                    <span style={{ fontWeight: 800, fontSize: 14, letterSpacing: '0.5px' }}>PROMPTPAY พร้อมเพย์</span>
                </div>
                <div style={{ fontSize: 11, opacity: 0.85, fontWeight: 500 }}>
                    สแกนจ่ายได้ด้วย Mobile Banking ทุกธนาคาร ฟรีค่าธรรมเนียม
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
                    border: '1.5px solid #e5e7eb',
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
                        }}
                    />

                    {/* Center Brand Badge */}
                    {imgLoaded && (
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
                </div>

                {/* Amount Highlight */}
                <div style={{
                    background: '#f0f5ff',
                    border: '1.5px solid #bfdbfe',
                    borderRadius: 12,
                    padding: '10px 14px',
                    margin: '8px 0 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}>
                    <div style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: 11, color: '#1e40af', fontWeight: 700, textTransform: 'uppercase' }}>
                            ยอดชำระสุทธิ
                        </div>
                        <div style={{ fontSize: 24, fontWeight: 900, color: '#1e3a8a', lineHeight: 1.2 }}>
                            ฿{formattedAmount}
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => copyToClipboard(String(total), 'amount')}
                        style={{
                            background: '#fff',
                            border: '1px solid #93c5fd',
                            color: '#1e40af',
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
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#dc2626', fontWeight: 700 }}>
                        <i className="bi bi-clock-history" />
                        <span>หมดอายุใน {timeDisplay}</span>
                    </div>
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

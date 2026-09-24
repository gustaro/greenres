import { useState, useEffect } from 'react'

export function CreditCardForm({
    value = {},
    onChange,
    defaultName = '',
    compact = false,
}) {
    const [cardNumber, setCardNumber] = useState(value.cardNumber || '')
    const [cardHolder, setCardHolder] = useState(value.cardHolder || defaultName || '')
    const [expiry, setExpiry] = useState(value.expiry || '')
    const [cvv, setCvv] = useState(value.cvv || '')
    const [showCvv, setShowCvv] = useState(false)
    const [focusedField, setFocusedField] = useState(null)

    // Sync defaultName if cardHolder is empty
    useEffect(() => {
        if (!cardHolder && defaultName) {
            setCardHolder(defaultName.toUpperCase())
        }
    }, [defaultName])

    // Detect Card Brand
    const cleanNumber = cardNumber.replace(/\s+/g, '')
    let cardType = 'GENERIC'
    if (/^4/.test(cleanNumber)) cardType = 'VISA'
    else if (/^(5[1-5]|2[2-7])/.test(cleanNumber)) cardType = 'MASTERCARD'
    else if (/^35/.test(cleanNumber)) cardType = 'JCB'
    else if (/^62/.test(cleanNumber)) cardType = 'UNIONPAY'

    // Format Card Number (XXXX XXXX XXXX XXXX)
    const handleCardNumberChange = e => {
        const raw = e.target.value.replace(/\D/g, '').slice(0, 16)
        const parts = raw.match(/[\s\S]{1,4}/g) || []
        const formatted = parts.join(' ')
        setCardNumber(formatted)
    }

    // Format Expiry (MM / YY)
    const handleExpiryChange = e => {
        let raw = e.target.value.replace(/\D/g, '').slice(0, 4)
        if (raw.length >= 3) {
            const mm = raw.slice(0, 2)
            const yy = raw.slice(2, 4)
            raw = `${mm}/${yy}`
        } else if (raw.length === 2 && !expiry.includes('/')) {
            raw = `${raw}/`
        }
        setExpiry(raw)
    }

    // Format CVV (3-4 digits)
    const handleCvvChange = e => {
        const raw = e.target.value.replace(/\D/g, '').slice(0, 4)
        setCvv(raw)
    }

    // Validation
    const isNumberValid = cleanNumber.length >= 15
    const isNameValid = cardHolder.trim().length >= 2
    let isExpiryValid = false
    if (expiry.length === 5) {
        const [m, y] = expiry.split('/').map(Number)
        const currentYear = new Date().getFullYear() % 100
        const currentMonth = new Date().getMonth() + 1
        if (m >= 1 && m <= 12) {
            if (y > currentYear || (y === currentYear && m >= currentMonth)) {
                isExpiryValid = true
            }
        }
    }
    const isCvvValid = cvv.length >= 3
    const isValid = isNumberValid && isNameValid && isExpiryValid && isCvvValid

    const maskedCard = isNumberValid
        ? `${cardType} •••• ${cleanNumber.slice(-4)}`
        : ''

    useEffect(() => {
        onChange?.({
            cardNumber,
            cleanNumber,
            cardHolder,
            expiry,
            cvv,
            cardType,
            isValid,
            maskedCard,
        })
    }, [cardNumber, cardHolder, expiry, cvv, cardType, isValid, maskedCard])

    return (
        <div style={{
            background: '#ffffff',
            borderRadius: 16,
            border: '1.5px solid #d8e7d2',
            padding: compact ? '14px 16px' : '20px 24px',
            boxShadow: '0 6px 20px rgba(0, 0, 0, 0.05)',
            maxWidth: compact ? '100%' : 460,
            margin: '12px auto',
            fontFamily: 'inherit',
        }}>
            {/* Visual Credit Card Preview */}
            <div style={{
                position: 'relative',
                background: 'linear-gradient(135deg, var(--brand-primary-dark, #075c1b) 0%, var(--brand-primary, #16943a) 50%, var(--brand-primary-dark, #0d2818) 100%)',
                color: '#fff',
                borderRadius: 14,
                padding: compact ? '16px' : '20px',
                height: compact ? 170 : 190,
                boxShadow: '0 12px 24px -6px rgba(7, 92, 27, 0.45)',
                marginBottom: 20,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'transform 0.2s ease',
            }}>
                {/* Decorative background glow */}
                <div style={{
                    position: 'absolute',
                    top: -40,
                    right: -40,
                    width: 140,
                    height: 140,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, var(--brand-accent, rgba(184, 255, 53, 0.25)) 0%, transparent 70%)',
                    pointerEvents: 'none',
                }} />

                {/* Top Row: Chip, Contactless, and Brand */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {/* EMV Chip */}
                        <div style={{
                            width: 38,
                            height: 28,
                            background: 'linear-gradient(135deg, #fce072 0%, #d89f28 100%)',
                            borderRadius: 6,
                            position: 'relative',
                            border: '1px solid #b8860b',
                            boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.6)',
                        }}>
                            <div style={{
                                position: 'absolute',
                                inset: '5px 7px',
                                border: '1px solid rgba(0,0,0,0.2)',
                                borderRadius: 2,
                            }} />
                        </div>
                        {/* Contactless Wave */}
                        <i className="bi bi-wifi" style={{ transform: 'rotate(90deg)', fontSize: 18, opacity: 0.8 }} />
                    </div>

                    {/* Card Brand Badge */}
                    <div>
                        {cardType === 'VISA' && (
                            <span style={{ fontSize: 20, fontWeight: 900, fontStyle: 'italic', letterSpacing: '1px' }}>
                                VISA
                            </span>
                        )}
                        {cardType === 'MASTERCARD' && (
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#eb001b', opacity: 0.95 }} />
                                <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#f79e1b', marginLeft: -8, opacity: 0.95 }} />
                            </div>
                        )}
                        {cardType === 'JCB' && (
                            <span style={{
                                background: '#fff',
                                color: '#003a8c',
                                padding: '2px 8px',
                                borderRadius: 4,
                                fontWeight: 900,
                                fontSize: 13,
                                letterSpacing: '0.5px'
                            }}>
                                JCB
                            </span>
                        )}
                        {cardType === 'UNIONPAY' && (
                            <span style={{
                                background: '#c00',
                                color: '#fff',
                                padding: '2px 6px',
                                borderRadius: 4,
                                fontWeight: 900,
                                fontSize: 11
                            }}>
                                UnionPay
                            </span>
                        )}
                        {cardType === 'GENERIC' && (
                            <div style={{ display: 'flex', gap: 6, opacity: 0.7, fontSize: 18 }}>
                                <i className="bi bi-credit-card" />
                            </div>
                        )}
                    </div>
                </div>

                {/* Middle Row: Card Number */}
                <div style={{
                    fontSize: compact ? 16 : 19,
                    letterSpacing: compact ? '2px' : '3px',
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    textShadow: '0 1px 2px rgba(0,0,0,0.6)',
                }}>
                    {cardNumber ? cardNumber.padEnd(19, '•') : '•••• •••• •••• ••••'}
                </div>

                {/* Bottom Row: Cardholder Name & Expiry */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div>
                        <div style={{ fontSize: 9, opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Cardholder Name
                        </div>
                        <div style={{
                            fontSize: compact ? 11 : 13,
                            fontWeight: 700,
                            letterSpacing: '0.5px',
                            textTransform: 'uppercase',
                            maxWidth: 220,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                        }}>
                            {cardHolder || 'SOMCHAI JAIDEE'}
                        </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 9, opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Expires
                        </div>
                        <div style={{
                            fontSize: compact ? 11 : 13,
                            fontWeight: 700,
                            fontFamily: 'monospace',
                        }}>
                            {expiry || 'MM/YY'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Input Form Fields */}
            <div style={{ display: 'grid', gap: 14 }}>
                {/* 1. Card Number */}
                <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#17351f', marginBottom: 5 }}>
                        หมายเลขบัตร (Card Number) <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <div style={{
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                    }}>
                        <input
                            type="text"
                            inputMode="numeric"
                            value={cardNumber}
                            onChange={handleCardNumberChange}
                            onFocus={() => setFocusedField('number')}
                            onBlur={() => setFocusedField(null)}
                            placeholder="1234 5678 9012 3456"
                            maxLength={19}
                            style={{
                                width: '100%',
                                padding: '11px 44px 11px 14px',
                                borderRadius: 8,
                                border: focusedField === 'number'
                                    ? '2px solid var(--brand-primary, #12852f)'
                                    : '1.5px solid #d1d5db',
                                fontSize: 15,
                                fontFamily: 'monospace',
                                fontWeight: 600,
                                outline: 'none',
                                background: '#fdfdfd',
                            }}
                        />
                        <div style={{ position: 'absolute', right: 12, display: 'flex', alignItems: 'center' }}>
                            {cardType === 'VISA' && <span style={{ color: '#003a8c', fontWeight: 900, fontSize: 13, fontStyle: 'italic' }}>VISA</span>}
                            {cardType === 'MASTERCARD' && <span style={{ color: '#eb001b', fontWeight: 900, fontSize: 12 }}>MC</span>}
                            {cardType === 'JCB' && <span style={{ color: '#003a8c', fontWeight: 900, fontSize: 12 }}>JCB</span>}
                            {cardType === 'UNIONPAY' && <span style={{ color: '#c00', fontWeight: 900, fontSize: 11 }}>UnionPay</span>}
                            {cardType === 'GENERIC' && <i className="bi bi-credit-card text-muted" style={{ fontSize: 18 }} />}
                        </div>
                    </div>
                </div>

                {/* 2. Cardholder Name */}
                <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#17351f', marginBottom: 5 }}>
                        ชื่อภาษาอังกฤษบนหน้าบัตร (Cardholder Name) <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input
                        type="text"
                        value={cardHolder}
                        onChange={e => setCardHolder(e.target.value.toUpperCase())}
                        onFocus={() => setFocusedField('name')}
                        onBlur={() => setFocusedField(null)}
                        placeholder="SOMCHAI JAIDEE"
                        style={{
                            width: '100%',
                            padding: '11px 14px',
                            borderRadius: 8,
                            border: focusedField === 'name'
                                ? '2px solid var(--brand-primary, #12852f)'
                                : '1.5px solid #d1d5db',
                            fontSize: 14,
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            outline: 'none',
                            background: '#fdfdfd',
                        }}
                    />
                </div>

                {/* 3. Expiry & CVV 2-column row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#17351f', marginBottom: 5 }}>
                            วันหมดอายุ (MM/YY) <span style={{ color: '#dc2626' }}>*</span>
                        </label>
                        <input
                            type="text"
                            inputMode="numeric"
                            value={expiry}
                            onChange={handleExpiryChange}
                            onFocus={() => setFocusedField('expiry')}
                            onBlur={() => setFocusedField(null)}
                            placeholder="MM / YY"
                            maxLength={5}
                            style={{
                                width: '100%',
                                padding: '11px 14px',
                                borderRadius: 8,
                                border: focusedField === 'expiry'
                                    ? '2px solid var(--brand-primary, #12852f)'
                                    : '1.5px solid #d1d5db',
                                fontSize: 14,
                                fontFamily: 'monospace',
                                fontWeight: 600,
                                outline: 'none',
                                background: '#fdfdfd',
                            }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#17351f', marginBottom: 5 }}>
                            CVV / CVC <span style={{ color: '#dc2626' }}>*</span>
                        </label>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <input
                                type={showCvv ? 'text' : 'password'}
                                inputMode="numeric"
                                value={cvv}
                                onChange={handleCvvChange}
                                onFocus={() => setFocusedField('cvv')}
                                onBlur={() => setFocusedField(null)}
                                placeholder="123"
                                maxLength={4}
                                style={{
                                    width: '100%',
                                    padding: '11px 38px 11px 14px',
                                    borderRadius: 8,
                                    border: focusedField === 'cvv'
                                        ? '2px solid var(--brand-primary, #12852f)'
                                        : '1.5px solid #d1d5db',
                                    fontSize: 14,
                                    fontFamily: 'monospace',
                                    fontWeight: 600,
                                    outline: 'none',
                                    background: '#fdfdfd',
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowCvv(!showCvv)}
                                style={{
                                    position: 'absolute',
                                    right: 10,
                                    border: 0,
                                    background: 'transparent',
                                    color: '#6b7280',
                                    cursor: 'pointer',
                                    padding: 0,
                                    fontSize: 16,
                                }}
                                title={showCvv ? 'ซ่อน' : 'แสดงรหัส'}
                            >
                                <i className={`bi ${showCvv ? 'bi-eye-slash' : 'bi-eye'}`} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Security Guarantee & Accepted Cards Footer */}
            <div style={{
                marginTop: 16,
                paddingTop: 12,
                borderTop: '1px solid #f3f4f6',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                fontSize: 11,
                color: '#6b7280',
            }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--brand-primary-dark, #075c1b)', fontWeight: 600 }}>
                    <i className="bi bi-shield-check" style={{ fontSize: 16, color: 'var(--brand-primary, #12852f)' }} />
                    <span>256-Bit SSL Encrypted (ปลอดภัยระดับสากล)</span>
                </div>
                <div style={{ display: 'flex', gap: 6, fontSize: 14, color: '#4b5563' }}>
                    <i className="bi bi-shield-lock" title="PCI-DSS Compliant" />
                </div>
            </div>
        </div>
    )
}

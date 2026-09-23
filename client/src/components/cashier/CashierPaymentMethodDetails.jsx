import { money } from '../StaffShared'
import { PromptPayQR } from '../payment/PromptPayQR'
import { CreditCardForm } from '../payment/CreditCardForm'

export function CashierPaymentMethodDetails({
    selectedPaymentMethod,
    total,
    cashReceived,
    setCashReceived,
    isCashShort,
    change,
    onConfirm,
    orderId,
    orderCode = '',
    cardMode = 'edc',
    setCardMode,
    cardData = {},
    setCardData,
    isQrPaid = false,
    setIsQrPaid,
    qrData,
    setQrData,
}) {
    if (selectedPaymentMethod === 'CASH') {
        const cash = Number(cashReceived) || 0
        return (
            <div style={{ background: '#f6faf2', borderRadius: 12, padding: 16, border: '1px solid #d8e7d2', marginBottom: 20 }}>
                <label style={{ display: 'grid', gap: 6, fontSize: 13, fontWeight: 700, color: '#17351f' }}>
                    <span>จำนวนเงินสดที่รับมา (บาท):</span>
                    <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontWeight: 800, fontSize: 18, color: '#6d7b6e' }}>฿</span>
                        <input
                            type="number"
                            autoFocus
                            value={cashReceived}
                            onChange={e => setCashReceived(e.target.value)}
                            placeholder="0.00"
                            style={{ width: '100%', padding: '12px 14px 12px 36px', borderRadius: 10, border: isCashShort ? '2px solid #f59e0b' : '2px solid #12852f', fontSize: 20, fontWeight: 800, outline: 'none', background: '#fff' }}
                            onKeyDown={e => {
                                if (e.key === 'Enter' && !isCashShort) onConfirm()
                            }}
                        />
                    </div>
                </label>

                {/* Quick Cash Buttons */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                    <button
                        type="button"
                        onClick={() => setCashReceived(String(Math.ceil(total)))}
                        style={{ border: '1px solid #12852f', background: '#effbdc', color: '#075c1b', fontSize: 12, fontWeight: 800, padding: '5px 12px', borderRadius: 8, cursor: 'pointer' }}
                    >
                        ยอดพอดี ({money(total)})
                    </button>
                    {[100, 500, 1000].map(amt => (
                        <button
                            key={amt}
                            type="button"
                            onClick={() => setCashReceived(String(amt))}
                            style={{ border: '1px solid #d8e7d2', background: '#fff', color: '#17351f', fontSize: 12, fontWeight: 700, padding: '5px 10px', borderRadius: 8, cursor: 'pointer' }}
                        >
                            ฿{amt.toLocaleString()}
                        </button>
                    ))}
                    {total > 1000 && (
                        <button
                            type="button"
                            onClick={() => setCashReceived(String(Math.ceil(total / 500) * 500))}
                            style={{ border: '1px solid #d8e7d2', background: '#fff', color: '#17351f', fontSize: 12, fontWeight: 700, padding: '5px 10px', borderRadius: 8, cursor: 'pointer' }}
                        >
                            ฿{(Math.ceil(total / 500) * 500).toLocaleString()}
                        </button>
                    )}
                </div>

                {/* Change Calculation Box */}
                <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px dashed #d8e7d2' }}>
                    {!isCashShort ? (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#effbdc', padding: '10px 14px', borderRadius: 8, border: '1px solid #9fe51f' }}>
                            <span style={{ fontSize: 14, fontWeight: 800, color: '#075c1b' }}>เงินทอน (Change):</span>
                            <span style={{ fontSize: 22, fontWeight: 900, color: '#075c1b' }}>{money(change)}</span>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fffbeb', padding: '10px 14px', borderRadius: 8, border: '1px solid #fde68a' }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#92400e' }}>
                                <i className="bi bi-exclamation-triangle me-1"></i> จำนวนเงินยังไม่พอ
                            </span>
                            <span style={{ fontSize: 15, fontWeight: 800, color: '#b45309' }}>ขาดอีก {money(total - cash)}</span>
                        </div>
                    )}
                </div>
            </div>
        )
    }

    if (selectedPaymentMethod === 'QR') {
        return (
            <div style={{ marginBottom: 16 }}>
                <PromptPayQR
                    total={total}
                    reference={orderCode || `ORD-${orderId?.slice(-6) || '9999'}`}
                    compact={true}
                    onSimulateSuccess={(data) => {
                        setIsQrPaid?.(true)
                        setQrData?.(data)
                    }}
                    isPaid={isQrPaid}
                />
                {isQrPaid && (
                    <div style={{
                        marginTop: 10,
                        background: '#ecfdf5',
                        border: '1.5px solid #a7f3d0',
                        borderRadius: 12,
                        padding: '10px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        color: '#065f46',
                        fontSize: 13,
                        fontWeight: 700,
                        animation: 'fadeIn 0.2s ease-in-out',
                    }}>
                        <i className="bi bi-patch-check-fill" style={{ fontSize: 20, color: '#059669' }} />
                        <div style={{ flex: 1 }}>
                            <div>บันทึกการจำลองชำระเงิน QR เรียบร้อย</div>
                            <div style={{ fontSize: 11, fontWeight: 500, color: '#047857' }}>
                                กดยืนยันรับชำระเงินด้านล่างเพื่อปิดบิลออเดอร์นี้
                            </div>
                        </div>
                    </div>
                )}
            </div>
        )
    }

    if (selectedPaymentMethod === 'CARD') {
        return (
            <div style={{ marginBottom: 16 }}>
                {/* Mode Selector Toggle: EDC Terminal vs Manual Entry */}
                <div style={{
                    display: 'flex',
                    background: '#f1f5f9',
                    borderRadius: 10,
                    padding: 4,
                    marginBottom: 14,
                    gap: 4
                }}>
                    <button
                        type="button"
                        onClick={() => setCardMode?.('edc')}
                        style={{
                            flex: 1,
                            padding: '8px 12px',
                            borderRadius: 8,
                            border: 0,
                            background: cardMode === 'edc' ? '#fff' : 'transparent',
                            color: cardMode === 'edc' ? 'var(--brand-primary-dark, #075c1b)' : '#64748b',
                            fontWeight: cardMode === 'edc' ? 800 : 600,
                            fontSize: 12,
                            boxShadow: cardMode === 'edc' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                        }}
                    >
                        <i className="bi bi-credit-card-2-front" />
                        เครื่อง EDC (แตะ/เสียบ)
                    </button>
                    <button
                        type="button"
                        onClick={() => setCardMode?.('manual')}
                        style={{
                            flex: 1,
                            padding: '8px 12px',
                            borderRadius: 8,
                            border: 0,
                            background: cardMode === 'manual' ? '#fff' : 'transparent',
                            color: cardMode === 'manual' ? 'var(--brand-primary-dark, #075c1b)' : '#64748b',
                            fontWeight: cardMode === 'manual' ? 800 : 600,
                            fontSize: 12,
                            boxShadow: cardMode === 'manual' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                        }}
                    >
                        <i className="bi bi-keyboard" />
                        กรอกข้อมูลบัตร (Manual)
                    </button>
                </div>

                {cardMode === 'edc' ? (
                    <div style={{ background: '#f8fafc', borderRadius: 12, padding: 20, border: '1px solid #d8e7d2', textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, fontSize: 24, color: '#17351f', marginBottom: 10 }}>
                            <i className="bi bi-credit-card"></i>
                            <i className="bi bi-credit-card-2-front"></i>
                        </div>
                        <div style={{ fontSize: 15, fontWeight: 800, color: '#17351f' }}>
                            แตะบัตร (Tap to Pay) หรือเสียบบัตรที่เครื่อง EDC
                        </div>
                        <div style={{ fontSize: 24, fontWeight: 900, color: '#075c1b', margin: '6px 0' }}>
                            {money(total)}
                        </div>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#effbdc', color: '#075c1b', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#12852f', display: 'inline-block' }}></span>
                            เครื่อง EDC พร้อมทำรายการ
                        </div>
                        <p style={{ fontSize: 12, color: '#6d7b6e', margin: '10px 0 0' }}>
                            รองรับบัตรเครดิต และเดบิต Visa, Mastercard, JCB, UnionPay
                        </p>
                    </div>
                ) : (
                    <div>
                        <CreditCardForm
                            compact={true}
                            value={cardData}
                            onChange={setCardData}
                        />
                    </div>
                )}
            </div>
        )
    }

    return null
}

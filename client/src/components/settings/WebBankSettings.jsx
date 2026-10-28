import { useEffect, useState } from 'react'
import { useAuth } from '../../lib/AuthContext'
import { settingsApi } from '../../lib/database'
import { PageHead } from '../admin/AdminShared'
import { getShopBankAccounts } from '../../lib/bankAccounts'

const MAX_BANK_ACCOUNTS = 5
const newAccountId = () => `bank-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`

const POPULAR_BANKS = [
    { code: 'KBANK', name: 'ธนาคารกสิกรไทย (KBANK)', color: '#138f2d' },
    { code: 'SCB', name: 'ธนาคารไทยพาณิชย์ (SCB)', color: '#4e2a84' },
    { code: 'BBL', name: 'ธนาคารกรุงเทพ (BBL)', color: '#1e3799' },
    { code: 'KTB', name: 'ธนาคารกรุงไทย (KTB)', color: '#00a8e8' },
    { code: 'BAY', name: 'ธนาคารกรุงศรีอยุธยา (BAY)', color: '#f39c12' },
    { code: 'TTB', name: 'ธนาคารทหารไทยธนชาต (TTB)', color: '#002d62' },
    { code: 'GSB', name: 'ธนาคารออมสิน (GSB)', color: '#e84393' },
]

export function WebBankSettings({ notify, fail }) {
    const { settings, setSettings } = useAuth()
    const [accounts, setAccounts] = useState([])
    const [promptpayNumber, setPromptpayNumber] = useState('')
    const [promptpayQrUrl, setPromptpayQrUrl] = useState('')
    const [bankTransferNote, setBankTransferNote] = useState('')
    const [isSaving, setIsSaving] = useState(false)
    const [isUploadingQr, setIsUploadingQr] = useState(false)

    useEffect(() => {
        if (!settings) return
        setAccounts(getShopBankAccounts(settings).map(account => ({ ...account })))
        setPromptpayNumber(settings.promptpayNumber || '')
        setPromptpayQrUrl(settings.promptpayQrUrl || '')
        setBankTransferNote(settings.bankTransferNote || 'เมื่อโอนเงินเรียบร้อยแล้ว กรุณาแนบสลิปหลักฐานการโอนเงินเพื่อความรวดเร็วในการจัดเตรียมอาหาร')
    }, [settings])

    const handleUploadQr = async e => {
        const file = e.target.files?.[0]
        if (!file) return
        setIsUploadingQr(true)
        try {
            notify?.('กำลังอัปโหลดรูป QR Code...')
            const res = await settingsApi.updatePromptpayQr(file)
            const newQrUrl = res.promptpayQrUrl || ''
            setPromptpayQrUrl(newQrUrl)
            setSettings?.(prev => ({ ...prev, promptpayQrUrl: newQrUrl }))
            notify?.('อัปโหลดรูป QR Code สำเร็จ')
        } catch (err) {
            fail?.(err)
        } finally {
            setIsUploadingQr(false)
        }
    }

    const updateAccount = (id, field, value) => setAccounts(prev => prev.map(account => account.id === id ? { ...account, [field]: value } : account))
    const addAccount = () => setAccounts(prev => prev.length >= MAX_BANK_ACCOUNTS ? prev : [...prev, { id: newAccountId(), bankName: POPULAR_BANKS[0].name, accountNumber: '', accountName: '' }])
    const removeAccount = id => setAccounts(prev => prev.filter(account => account.id !== id))
    const moveAccountUp = id => setAccounts(prev => {
        const index = prev.findIndex(account => account.id === id)
        if (index <= 0) return prev
        const next = [...prev]
        ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
        return next
    })

    const handleSave = async e => {
        e?.preventDefault?.()
        const cleaned = accounts.map(account => ({
            id: account.id,
            bankName: account.bankName.trim(),
            accountNumber: account.accountNumber.trim(),
            accountName: account.accountName.trim(),
        }))
        if (cleaned.length === 0) return fail?.(new Error('กรุณาเพิ่มบัญชีธนาคารอย่างน้อย 1 บัญชี'))
        if (cleaned.some(account => !account.bankName || !account.accountNumber || !account.accountName)) {
            return fail?.(new Error('กรุณากรอกธนาคาร เลขที่บัญชี และชื่อบัญชีให้ครบทุกบัญชี'))
        }
        setIsSaving(true)
        try {
            const payload = {
                bankAccounts: cleaned,
                promptpayNumber: promptpayNumber.trim(),
                promptpayQrUrl: promptpayQrUrl.trim(),
                bankTransferNote: bankTransferNote.trim(),
            }
            setSettings?.(prev => ({ ...prev, ...payload }))
            await settingsApi.update(payload)
            notify?.('บันทึกข้อมูลบัญชีธนาคารร้านสำเร็จ')
        } catch (err) {
            fail?.(err)
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div className="admin-bank-settings">
            <PageHead
                eyebrow="BANK & PAYMENT"
                title="ตั้งค่าบัญชีธนาคารร้าน"
                description="จัดการข้อมูลบัญชีธนาคาร พร้อมเพย์ คิวอาร์โค้ดรับเงิน และคำแนะนำการโอน สำหรับให้ลูกค้าแนบสลิปสั่งซื้อ"
            />

            <div className="admin-settings-stack">
                <section className="admin-settings-card">
                    <header className="admin-settings-card-head">
                        <div className="admin-settings-card-icon" style={{ background: 'var(--brand-accent-soft, rgba(18, 133, 47, 0.12))', color: 'var(--brand-primary, #12852f)' }}>
                            <i className="bi bi-bank" />
                        </div>
                        <div>
                            <h2>ข้อมูลบัญชีธนาคารและพร้อมเพย์ของร้าน</h2>
                            <p>ข้อมูลนี้จะแสดงในขั้นตอนชำระเงิน (แนบสลิป) และหน้าประวัติคำสั่งซื้อของลูกค้า</p>
                        </div>
                    </header>

                    <div className="admin-settings-body">
                        {/* บัญชีธนาคารร้าน (หลายบัญชี) */}
                        <div className="admin-settings-section">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                                <label className="admin-settings-label" style={{ margin: 0 }}>บัญชีธนาคารของร้าน ({accounts.length}/{MAX_BANK_ACCOUNTS})</label>
                                <button type="button" className="admin-button admin-secondary" onClick={addAccount} disabled={accounts.length >= MAX_BANK_ACCOUNTS}>
                                    <i className="bi bi-plus-lg" /> เพิ่มบัญชี
                                </button>
                            </div>
                            <span className="admin-settings-help" style={{ display: 'block', marginBottom: 12 }}>ลูกค้าจะเห็นทุกบัญชีและกดคัดลอกเลขบัญชีได้ บัญชีแรกคือบัญชีหลัก</span>

                            <div style={{ display: 'grid', gap: 14 }}>
                                {accounts.map((account, index) => {
                                    const selectedBank = POPULAR_BANKS.find(bank => bank.name === account.bankName)
                                    return (
                                        <div key={account.id} style={{ border: '1px solid #e2e8f0', borderLeft: `4px solid ${selectedBank?.color || 'var(--brand-primary, #12852f)'}`, borderRadius: 10, padding: 14, background: '#fff' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 8 }}>
                                                <strong style={{ color: 'var(--brand-primary-dark, #0c4d1d)' }}>
                                                    บัญชีที่ {index + 1}{index === 0 && <span style={{ marginLeft: 8, fontSize: '0.75rem', background: 'var(--brand-accent-soft, #effbdc)', color: 'var(--brand-primary-dark, #075c1b)', padding: '2px 8px', borderRadius: 10 }}>บัญชีหลัก</span>}
                                                </strong>
                                                <div style={{ display: 'flex', gap: 6 }}>
                                                    {index > 0 && (
                                                        <button type="button" className="admin-button admin-secondary" onClick={() => moveAccountUp(account.id)} title="ย้ายขึ้น" style={{ padding: '4px 10px' }}>
                                                            <i className="bi bi-arrow-up" />
                                                        </button>
                                                    )}
                                                    <button type="button" className="admin-button admin-secondary" onClick={() => removeAccount(account.id)} disabled={accounts.length <= 1} title="ลบบัญชีนี้" style={{ padding: '4px 10px', color: '#ef4444' }}>
                                                        <i className="bi bi-trash" />
                                                    </button>
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                                                {POPULAR_BANKS.map(b => (
                                                    <button
                                                        type="button"
                                                        key={b.code}
                                                        onClick={() => updateAccount(account.id, 'bankName', b.name)}
                                                        style={{
                                                            padding: '4px 10px',
                                                            borderRadius: '20px',
                                                            fontSize: '0.78rem',
                                                            fontWeight: 600,
                                                            border: account.bankName === b.name ? `2px solid ${b.color}` : '1px solid #e2e8f0',
                                                            background: account.bankName === b.name ? `${b.color}15` : '#fff',
                                                            color: account.bankName === b.name ? b.color : '#475569',
                                                            cursor: 'pointer',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '6px',
                                                        }}
                                                    >
                                                        <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: b.color }} />
                                                        {b.code}
                                                    </button>
                                                ))}
                                            </div>

                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                                                <div>
                                                    <label className="admin-settings-label">ชื่อธนาคาร *</label>
                                                    <input type="text" className="admin-input" value={account.bankName} onChange={e => updateAccount(account.id, 'bankName', e.target.value)} placeholder="เช่น ธนาคารกสิกรไทย (KBANK)" />
                                                </div>
                                                <div>
                                                    <label className="admin-settings-label">เลขที่บัญชี *</label>
                                                    <input type="text" className="admin-input" value={account.accountNumber} onChange={e => updateAccount(account.id, 'accountNumber', e.target.value)} placeholder="เช่น 123-4-56789-0" />
                                                </div>
                                                <div>
                                                    <label className="admin-settings-label">ชื่อบัญชี *</label>
                                                    <input type="text" className="admin-input" value={account.accountName} onChange={e => updateAccount(account.id, 'accountName', e.target.value)} placeholder="ชื่อเจ้าของบัญชีตามสมุดบัญชี" />
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        {/* พร้อมเพย์ & รูป QR Code */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', marginBottom: '18px' }}>
                            <div>
                                <label className="admin-settings-label">หมายเลขพร้อมเพย์ (PromptPay)</label>
                                <input
                                    type="text"
                                    className="admin-input"
                                    value={promptpayNumber}
                                    onChange={e => setPromptpayNumber(e.target.value)}
                                    placeholder="เบอร์โทรศัพท์ หรือ เลขประจำตัวผู้เสียภาษี"
                                />
                                <span className="admin-settings-help">สำหรับลูกค้าที่ต้องการโอนผ่านพร้อมเพย์</span>

                                <div style={{ marginTop: '16px' }}>
                                    <label className="admin-settings-label">คำแนะนำการชำระเงินและแนบสลิป</label>
                                    <textarea
                                        rows={3}
                                        className="admin-input"
                                        value={bankTransferNote}
                                        onChange={e => setBankTransferNote(e.target.value)}
                                        placeholder="คำแนะนำเพิ่มเติมสำหรับลูกค้าเมื่อโอนเงิน..."
                                        style={{ resize: 'vertical' }}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="admin-settings-label">รูปภาพ QR Code พร้อมเพย์ / ธนาคาร</label>
                                <div style={{
                                    border: '2px dashed #cbd5e1',
                                    borderRadius: '12px',
                                    padding: '16px',
                                    textAlign: 'center',
                                    background: '#f8fafc',
                                }}>
                                    {promptpayQrUrl ? (
                                        <div style={{ marginBottom: '12px' }}>
                                            <img
                                                src={promptpayQrUrl}
                                                alt="PromptPay QR Code"
                                                style={{ maxWidth: '180px', maxHeight: '180px', objectFit: 'contain', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff' }}
                                            />
                                        </div>
                                    ) : (
                                        <div style={{ padding: '24px 0', color: '#94a3b8' }}>
                                            <i className="bi bi-qr-code" style={{ fontSize: '3rem', display: 'block', marginBottom: '8px' }} />
                                            <span>ยังไม่มีรูปภาพ QR Code</span>
                                        </div>
                                    )}

                                    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                                        <input
                                            type="file"
                                            id="promptpayQrUpload"
                                            accept="image/*"
                                            onChange={handleUploadQr}
                                            disabled={isUploadingQr}
                                            hidden
                                        />
                                        <label
                                            htmlFor="promptpayQrUpload"
                                            className="admin-button admin-secondary"
                                            style={{ cursor: isUploadingQr ? 'wait' : 'pointer' }}
                                        >
                                            {isUploadingQr ? (
                                                <><i className="bi bi-arrow-repeat spin" /> กำลังอัปโหลด...</>
                                            ) : (
                                                <><i className="bi bi-cloud-arrow-up" /> {promptpayQrUrl ? 'เปลี่ยนรูป QR Code' : 'อัปโหลด QR Code'}</>
                                            )}
                                        </label>
                                        {promptpayQrUrl && (
                                            <button
                                                type="button"
                                                className="admin-button admin-secondary"
                                                onClick={() => setPromptpayQrUrl('')}
                                                style={{ color: '#ef4444' }}
                                            >
                                                <i className="bi bi-trash" /> ลบรูป
                                            </button>
                                        )}
                                    </div>
                                    <div style={{ marginTop: '8px' }}>
                                        <input
                                            type="text"
                                            className="admin-input"
                                            value={promptpayQrUrl}
                                            onChange={e => setPromptpayQrUrl(e.target.value)}
                                            placeholder="หรือระบุ URL รูปภาพ QR Code"
                                            style={{ fontSize: '0.82rem' }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Customer Preview Box */}
                        <div style={{
                            marginTop: '20px',
                            padding: '16px 20px',
                            background: 'rgba(18, 133, 47, 0.04)',
                            border: '1px solid rgba(18, 133, 47, 0.2)',
                            borderRadius: '12px',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', color: 'var(--brand-primary-dark, #0c4d1d)', fontWeight: 700 }}>
                                <i className="bi bi-eye" />
                                <span>ตัวอย่างการแสดงผลสำหรับลูกค้า (ตอนสั่งซื้อ / ดูประวัติคำสั่งซื้อ)</span>
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center' }}>
                                {promptpayQrUrl && (
                                    <div style={{ background: '#fff', padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                        <img src={promptpayQrUrl} alt="QR Code" style={{ width: '100px', height: '100px', objectFit: 'contain' }} />
                                    </div>
                                )}
                                <div style={{ fontSize: '0.9rem', lineHeight: '1.6' }}>
                                    {accounts.map(account => (
                                        <div key={account.id} style={{ marginBottom: 4 }}>
                                            <strong>{account.bankName || 'ธนาคาร'}:</strong>{' '}
                                            <code style={{ background: '#fff', padding: '2px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontWeight: 'bold', color: 'var(--brand-primary, #12852f)' }}>{account.accountNumber || 'xxx-x-xxxxx-x'}</code>{' '}
                                            {account.accountName || 'LimeLeaf Kitchen'}
                                        </div>
                                    ))}
                                    {promptpayNumber && <div><strong>พร้อมเพย์:</strong> {promptpayNumber}</div>}
                                    <div style={{ marginTop: '6px', fontSize: '0.82rem', color: '#64748b' }}><i className="bi bi-info-circle me-1" />{bankTransferNote}</div>
                                </div>
                            </div>
                        </div>

                        {/* Action footer */}
                        <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
                            <button
                                type="button"
                                className="admin-button admin-primary"
                                onClick={handleSave}
                                disabled={isSaving}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 24px' }}
                            >
                                {isSaving ? (
                                    <><i className="bi bi-arrow-repeat spin" /> กำลังบันทึก...</>
                                ) : (
                                    <><i className="bi bi-check-lg" /> บันทึกการตั้งค่าบัญชี</>
                                )}
                            </button>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    )
}

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

    const bankMeta = name => POPULAR_BANKS.find(bank => bank.name === name)
    const bankColorOf = name => bankMeta(name)?.color || 'var(--brand-primary)'

    return (
        <div className="admin-bank-settings">
            <PageHead
                eyebrow="BANK & PAYMENT"
                title="ตั้งค่าบัญชีธนาคารร้าน"
                description="จัดการบัญชีธนาคาร พร้อมเพย์ คิวอาร์โค้ดรับเงิน และคำแนะนำการโอน สำหรับให้ลูกค้าแนบสลิปสั่งซื้อ"
            />

            <div className="admin-settings-stack">
                <section className="admin-settings-card">
                    <header className="admin-settings-card-head">
                        <div className="admin-settings-card-icon"><i className="bi bi-bank" /></div>
                        <div>
                            <h2>บัญชีธนาคารและพร้อมเพย์ของร้าน</h2>
                            <p>แสดงในขั้นตอนชำระเงิน (แนบสลิป) และหน้าประวัติคำสั่งซื้อของลูกค้า</p>
                        </div>
                    </header>

                    <div className="admin-settings-body">
                        {/* ── บัญชีธนาคาร ── */}
                        <div className="admin-settings-section">
                            <div className="admin-bank-section-head">
                                <div className="admin-settings-section-title" style={{ marginBottom: 0 }}>
                                    <span><i className="bi bi-credit-card-2-front" /></span>
                                    <div>
                                        <b>บัญชีธนาคารของร้าน</b>
                                        <small>ลูกค้าเห็นทุกบัญชีและกดคัดลอกเลขบัญชีได้ · บัญชีแรกคือบัญชีหลัก</small>
                                    </div>
                                </div>
                                <span className="admin-bank-count">{accounts.length}/{MAX_BANK_ACCOUNTS} บัญชี</span>
                            </div>

                            <div className="admin-bank-list">
                                {accounts.map((account, index) => {
                                    const color = bankColorOf(account.bankName)
                                    const code = bankMeta(account.bankName)?.code || 'BANK'
                                    return (
                                        <article key={account.id} className="admin-bank-account" style={{ '--bank-color': color }}>
                                            <header className="admin-bank-account-head">
                                                <div className="admin-bank-avatar">{code.slice(0, 2)}</div>
                                                <div className="admin-bank-account-title">
                                                    <b>บัญชีที่ {index + 1}</b>
                                                    {index === 0 ? <span className="admin-bank-primary-tag">บัญชีหลัก</span> : <small>{account.bankName || 'ยังไม่ได้เลือกธนาคาร'}</small>}
                                                </div>
                                                <div className="admin-bank-account-actions">
                                                    {index > 0 && (
                                                        <button type="button" className="admin-bank-icon-btn" onClick={() => moveAccountUp(account.id)} title="เลื่อนขึ้น" aria-label="เลื่อนขึ้น">
                                                            <i className="bi bi-arrow-up" />
                                                        </button>
                                                    )}
                                                    <button type="button" className="admin-bank-icon-btn is-danger" onClick={() => removeAccount(account.id)} disabled={accounts.length <= 1} title="ลบบัญชีนี้" aria-label="ลบบัญชีนี้">
                                                        <i className="bi bi-trash3" />
                                                    </button>
                                                </div>
                                            </header>

                                            <div className="admin-bank-chips" role="group" aria-label="เลือกธนาคาร">
                                                {POPULAR_BANKS.map(bank => (
                                                    <button
                                                        type="button"
                                                        key={bank.code}
                                                        className={`admin-bank-chip ${account.bankName === bank.name ? 'is-active' : ''}`}
                                                        style={{ '--chip-color': bank.color }}
                                                        onClick={() => updateAccount(account.id, 'bankName', bank.name)}
                                                    >
                                                        <span />{bank.code}
                                                    </button>
                                                ))}
                                            </div>

                                            <div className="admin-bank-fields">
                                                <label className="admin-settings-field">
                                                    ชื่อธนาคาร
                                                    <input type="text" value={account.bankName} onChange={e => updateAccount(account.id, 'bankName', e.target.value)} placeholder="เช่น ธนาคารกสิกรไทย (KBANK)" />
                                                </label>
                                                <label className="admin-settings-field">
                                                    เลขที่บัญชี
                                                    <input type="text" inputMode="numeric" value={account.accountNumber} onChange={e => updateAccount(account.id, 'accountNumber', e.target.value)} placeholder="เช่น 123-4-56789-0" />
                                                </label>
                                                <label className="admin-settings-field">
                                                    ชื่อบัญชี
                                                    <input type="text" value={account.accountName} onChange={e => updateAccount(account.id, 'accountName', e.target.value)} placeholder="ชื่อเจ้าของบัญชีตามสมุดบัญชี" />
                                                </label>
                                            </div>
                                        </article>
                                    )
                                })}

                                {accounts.length < MAX_BANK_ACCOUNTS && (
                                    <button type="button" className="admin-bank-add" onClick={addAccount}>
                                        <i className="bi bi-plus-circle" /> เพิ่มบัญชีธนาคาร
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* ── พร้อมเพย์ & QR ── */}
                        <div className="admin-settings-section">
                            <div className="admin-settings-section-title">
                                <span><i className="bi bi-qr-code-scan" /></span>
                                <div>
                                    <b>พร้อมเพย์และ QR Code</b>
                                    <small>สำหรับลูกค้าที่ต้องการสแกนจ่ายหรือโอนผ่านพร้อมเพย์</small>
                                </div>
                            </div>

                            <div className="admin-bank-promptpay">
                                <div className="admin-settings-grid">
                                    <label className="admin-settings-field">
                                        หมายเลขพร้อมเพย์
                                        <input type="text" value={promptpayNumber} onChange={e => setPromptpayNumber(e.target.value)} placeholder="เบอร์โทรศัพท์ หรือ เลขประจำตัวผู้เสียภาษี" />
                                        <small>เว้นว่างได้ถ้าไม่ใช้พร้อมเพย์</small>
                                    </label>
                                    <label className="admin-settings-field">
                                        คำแนะนำการชำระเงินและแนบสลิป
                                        <textarea rows={4} value={bankTransferNote} onChange={e => setBankTransferNote(e.target.value)} placeholder="คำแนะนำเพิ่มเติมสำหรับลูกค้าเมื่อโอนเงิน..." />
                                    </label>
                                </div>

                                <div className="admin-bank-qr">
                                    <div className="admin-bank-qr-preview">
                                        {promptpayQrUrl ? (
                                            <img src={promptpayQrUrl} alt="PromptPay QR Code" />
                                        ) : (
                                            <div className="admin-bank-qr-empty">
                                                <i className="bi bi-qr-code" />
                                                <span>ยังไม่มีรูป QR Code</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="admin-bank-qr-actions">
                                        <input type="file" id="promptpayQrUpload" accept="image/*" onChange={handleUploadQr} disabled={isUploadingQr} hidden />
                                        <label htmlFor="promptpayQrUpload" className="admin-secondary admin-bank-qr-btn" style={{ cursor: isUploadingQr ? 'wait' : 'pointer' }}>
                                            {isUploadingQr
                                                ? <><i className="bi bi-arrow-repeat spin" /> กำลังอัปโหลด...</>
                                                : <><i className="bi bi-cloud-arrow-up" /> {promptpayQrUrl ? 'เปลี่ยนรูป' : 'อัปโหลด QR Code'}</>}
                                        </label>
                                        {promptpayQrUrl && (
                                            <button type="button" className="admin-secondary admin-bank-qr-btn is-danger" onClick={() => setPromptpayQrUrl('')}>
                                                <i className="bi bi-trash3" /> ลบรูป
                                            </button>
                                        )}
                                    </div>
                                    <label className="admin-settings-field">
                                        <small style={{ fontWeight: 700 }}>หรือวาง URL รูป QR Code</small>
                                        <input type="text" value={promptpayQrUrl} onChange={e => setPromptpayQrUrl(e.target.value)} placeholder="https://..." />
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* ── ตัวอย่างที่ลูกค้าเห็น ── */}
                        <div className="admin-settings-section admin-bank-preview">
                            <div className="admin-settings-section-title">
                                <span><i className="bi bi-eye" /></span>
                                <div>
                                    <b>ตัวอย่างที่ลูกค้าเห็น</b>
                                    <small>หน้าชำระเงินและหน้าประวัติคำสั่งซื้อ</small>
                                </div>
                            </div>
                            <div className="admin-bank-preview-grid">
                                {accounts.map(account => (
                                    <div key={account.id} className="admin-bank-preview-card" style={{ '--bank-color': bankColorOf(account.bankName) }}>
                                        <small>{account.bankName || 'ธนาคาร'}</small>
                                        <strong>{account.accountNumber || 'xxx-x-xxxxx-x'}</strong>
                                        <span>{account.accountName || 'ชื่อบัญชี'}</span>
                                        <i className="bi bi-clipboard" aria-hidden="true" />
                                    </div>
                                ))}
                                {promptpayNumber && (
                                    <div className="admin-bank-preview-card" style={{ '--bank-color': '#0284c7' }}>
                                        <small>พร้อมเพย์</small>
                                        <strong>{promptpayNumber}</strong>
                                        <span>PromptPay</span>
                                        <i className="bi bi-clipboard" aria-hidden="true" />
                                    </div>
                                )}
                            </div>
                            {bankTransferNote && <p className="admin-bank-preview-note"><i className="bi bi-info-circle" /> {bankTransferNote}</p>}
                        </div>
                    </div>

                    <footer className="admin-settings-actions">
                        <span><i className="bi bi-shield-check" /> ตรวจเลขบัญชีให้ถูกต้องก่อนบันทึก</span>
                        <button type="button" className="admin-primary admin-settings-save" onClick={handleSave} disabled={isSaving}>
                            {isSaving
                                ? <><i className="bi bi-arrow-repeat spin" /> กำลังบันทึก...</>
                                : <><i className="bi bi-check2-circle" /> บันทึกการตั้งค่าบัญชี</>}
                        </button>
                    </footer>
                </section>
            </div>
        </div>
    )
}

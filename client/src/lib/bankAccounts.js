// Shop bank accounts shown to customers for bank transfer + slip upload.
// Demo accounts are used until the admin saves real ones in Settings > Bank.
export const DEMO_BANK_ACCOUNTS = [
    { id: 'bank-kbank', bankName: 'ธนาคารกสิกรไทย (KBANK)', accountNumber: '123-4-56789-0', accountName: 'LimeLeaf Kitchen' },
    { id: 'bank-scb', bankName: 'ธนาคารไทยพาณิชย์ (SCB)', accountNumber: '407-2-34567-8', accountName: 'บจก. ไลม์ลีฟ คิทเช่น' },
    { id: 'bank-ktb', bankName: 'ธนาคารกรุงไทย (KTB)', accountNumber: '982-0-11223-4', accountName: 'LimeLeaf Kitchen (สาขาราชเทวี)' },
]

export const BANK_COLORS = {
    KBANK: '#138f2d',
    SCB: '#4e2a84',
    BBL: '#1e3799',
    KTB: '#00a8e8',
    BAY: '#c98a0b',
    TTB: '#002d62',
    GSB: '#e84393',
}

export const bankColor = bankName => {
    const code = Object.keys(BANK_COLORS).find(key => String(bankName || '').toUpperCase().includes(key))
    return code ? BANK_COLORS[code] : 'var(--brand-primary, #12852f)'
}

export function getShopBankAccounts(settings) {
    if (Array.isArray(settings?.bankAccounts) && settings.bankAccounts.length > 0) {
        return settings.bankAccounts.filter(account => account?.bankName && account?.accountNumber)
    }
    // Older settings only have one account: keep it first and pad with the demo accounts.
    if (settings?.bankAccountNumber) {
        const legacy = { id: 'bank-legacy', bankName: settings.bankName || DEMO_BANK_ACCOUNTS[0].bankName, accountNumber: settings.bankAccountNumber, accountName: settings.bankAccountName || 'LimeLeaf Kitchen' }
        return [legacy, ...DEMO_BANK_ACCOUNTS.filter(account => account.accountNumber !== legacy.accountNumber)].slice(0, 3)
    }
    return DEMO_BANK_ACCOUNTS
}

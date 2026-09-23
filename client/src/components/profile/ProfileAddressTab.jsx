import { useState } from 'react'
import { useLanguage } from '../../lib/LanguageContext'
import { MapLocationPicker } from '../MapLocationPicker'

export function ProfileAddressTab({ addresses, removeAddress, onAddAddress }) {
    const { isEn, t } = useLanguage()
    const [label, setLabel] = useState('')
    const [phone, setPhone] = useState('')
    const [street, setStreet] = useState('')
    const [province, setProvince] = useState('')
    const [zip, setZip] = useState('')
    const [isAddingAddress, setIsAddingAddress] = useState(false)
    const [deletingId, setDeletingId] = useState(null)

    const handleAdd = async () => {
        if (!street.trim()) return
        setIsAddingAddress(true)
        try {
            const success = await onAddAddress({ label, phone, street, province, zip })
            if (success !== false) {
                setLabel('')
                setPhone('')
                setStreet('')
                setProvince('')
                setZip('')
            }
        } finally {
            setIsAddingAddress(false)
        }
    }

    const handleDelete = async (id, i) => {
        setDeletingId(id || i)
        try {
            await removeAddress(id, i)
        } finally {
            setDeletingId(null)
        }
    }

    return (
        <>
            <h2>{t('profileMyAddresses')}</h2>
            {addresses.length === 0 && <p style={{ color: '#aaa', fontSize: 13, marginBottom: 16 }}>{t('profileNoAddresses')}</p>}
            {addresses.map((addr, i) => (
                <div className="addr-card" key={addr.id || i}>
                    <span className="addr-card-copy">
                        <b><i className="bi bi-geo-alt-fill me-1 text-danger" /> {addr.label || t('profileMyAddresses')}</b>
                        <small>{[addr.street || addr, addr.city, addr.state, addr.zip].filter(Boolean).join(' ')}</small>
                        {addr.isDefault && <em>{isEn ? 'Default' : 'ค่าเริ่มต้น'}</em>}
                    </span>
                    <button className="addr-del" disabled={deletingId === (addr.id || i)} onClick={() => handleDelete(addr.id, i)}>
                        {deletingId === (addr.id || i) ? (
                            <><i className="bi bi-arrow-repeat spin me-1" />{isEn ? 'Deleting...' : 'กำลังลบ...'}</>
                        ) : (
                            <><i className="bi bi-trash me-1" />{t('profileDeleteAddress')}</>
                        )}
                    </button>
                </div>
            ))}
            <div style={{ marginTop: 25, display: 'grid', gap: 10 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{t('profileAddNewAddress')}</p>
                <MapLocationPicker onLocationSelect={(obj) => {
                    if (obj.street) setStreet(obj.street)
                    if (obj.province) setProvince(obj.province)
                    if (obj.zip) setZip(obj.zip)
                }} />
                <div className="ad-address-form">
                    <div className="ad-address-row">
                        <input
                            placeholder={t('profileAddressLabelPlaceholder')}
                            value={label}
                            onChange={e => setLabel(e.target.value)}
                        />
                        <input
                            placeholder={t('profileAddressPhonePlaceholder')}
                            value={phone}
                            onChange={e => setPhone(e.target.value)}
                        />
                    </div>
                    <textarea
                        placeholder={t('profileAddressStreetPlaceholder')}
                        value={street}
                        onChange={e => setStreet(e.target.value)}
                        rows={2}
                    />
                    <div className="ad-address-row">
                        <input placeholder={t('profileProvincePlaceholder')} value={province} onChange={e => setProvince(e.target.value)} />
                        <input placeholder={t('profileZipPlaceholder')} value={zip} onChange={e => setZip(e.target.value)} />
                    </div>
                    <button className="ad-address-submit" disabled={isAddingAddress || !street.trim()} onClick={handleAdd}>
                        {isAddingAddress ? <><i className="bi bi-arrow-repeat spin me-1" /> {isEn ? 'Saving Address...' : 'กำลังบันทึกที่อยู่...'}</> : t('profileSaveAddressBtn')}
                    </button>
                </div>
            </div>
        </>
    )
}

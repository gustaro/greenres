import { useLanguage } from '../../lib/LanguageContext'

export function ProfileInfoTab({
    name,
    setName,
    phone,
    setPhone,
    birthday,
    setBirthday,
    gender,
    setGender,
    email,
    avatarUrl,
    uploadingAvatar,
    onAvatarUpload,
    handleSave,
    saving,
}) {
    const { isEn, t } = useLanguage()
    const initial = (name || email || '?')[0].toUpperCase()

    return (
        <>
            <h2>{t('profilePersonalInfo')}</h2>

            {/* Profile Avatar Upload Card */}
            <div className="pf-avatar-card">
                <div className="pf-avatar-preview">
                    {avatarUrl ? (
                        <img src={avatarUrl} alt={name || 'User'} />
                    ) : (
                        <div className="pf-avatar-placeholder">{initial}</div>
                    )}
                </div>
                <div className="pf-avatar-controls">
                    <strong>{isEn ? 'Profile Photo' : 'รูปภาพโปรไฟล์'}</strong>
                    <p>{isEn ? 'JPG, PNG or WEBP (Max 5MB)' : 'รองรับไฟล์ JPG, PNG หรือ WEBP (ขนาดไม่เกิน 5MB)'}</p>
                    <label className="pf-avatar-btn">
                        <i className={`bi ${uploadingAvatar ? 'bi-arrow-repeat spin' : 'bi-camera-fill'} me-1`} />
                        {uploadingAvatar ? (isEn ? 'Uploading...' : 'กำลังอัพโหลด...') : (isEn ? 'Upload New Photo' : 'อัพโหลดรูปภาพใหม่')}
                        <input
                            type="file"
                            accept="image/*"
                            onChange={e => onAvatarUpload(e.target.files?.[0])}
                            disabled={uploadingAvatar}
                            style={{ display: 'none' }}
                        />
                    </label>
                </div>
            </div>

            <p className="pf-section-title">{t('profileFullName')}</p>
            <div className="pf-grid">
                <div className="pf-field">
                    <label>{t('profileNameHelp')}</label>
                    <input value={name} onChange={e => setName(e.target.value)} placeholder={t('profileNamePlaceholder')} />
                </div>
            </div>

            <p className="pf-section-title">{t('profileContactSection')}</p>
            <div className="pf-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div className="pf-field">
                    <label>{t('profileEmail')}</label>
                    <input value={email || ''} disabled style={{ backgroundColor: '#f6faf2', color: '#888' }} />
                </div>
                <div className="pf-field">
                    <label>{t('profilePhone')}</label>
                    <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="08x-xxx-xxxx" />
                </div>

                <div className="pf-field">
                    <label>{t('profileBirthday')}</label>
                    <input type="date" value={birthday} onChange={e => setBirthday(e.target.value)} />
                </div>
                <div className="pf-field">
                    <label>{t('profileGender')}</label>
                    <select value={gender} onChange={e => setGender(e.target.value)}>
                        <option value="">{t('genderUnspecified')}</option>
                        <option value="male">{t('genderMale')}</option>
                        <option value="female">{t('genderFemale')}</option>
                        <option value="other">{t('genderOther')}</option>
                    </select>
                </div>
            </div>

            <button className="pf-save-btn" onClick={handleSave} disabled={saving} style={{ marginTop: 24 }}>
                {saving ? <><i className="bi bi-arrow-repeat spin me-1" /> {t('profileSaving')}</> : t('profileSaveBtn')}
            </button>
        </>
    )
}

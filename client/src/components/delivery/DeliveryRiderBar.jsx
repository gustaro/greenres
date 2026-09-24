export function DeliveryRiderBar({ rider, session, profile, isAdmin, activeJobsCount = 0, toggleAvailability, setShowProfileModal }) {
    const avatar = rider?.user?.avatarUrl || profile?.avatarUrl
    const plate = rider?.vehiclePlate || rider?.licensePlate
    const hasActiveJobs = activeJobsCount > 0
    const isStuckBusy = rider?.status === 'BUSY' && !hasActiveJobs
    const effectiveStatus = isStuckBusy ? 'AVAILABLE' : (rider?.status || 'OFFLINE')

    return (
        <div
            className="staff-alert delivery-rider-bar"
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 12,
                background: 'var(--brand-accent-soft, #effbdc)',
                border: '1.5px solid var(--brand-accent, #9fe51f)',
                borderLeft: '5px solid var(--brand-primary, #12852f)',
                color: 'var(--brand-primary-dark, #075c1b)',
                borderRadius: 12,
                padding: '14px 18px',
                boxShadow: '0 2px 6px rgba(0, 193, 74, 0.1)'
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div
                    onClick={() => setShowProfileModal(true)}
                    title="คลิกเพื่อแก้ไขรูปโปรไฟล์และข้อมูลไรเดอร์"
                    style={{
                        width: 44,
                        height: 44,
                        borderRadius: '50%',
                        background: 'var(--brand-accent, #b8ff35)',
                        display: 'grid',
                        placeItems: 'center',
                        overflow: 'hidden',
                        border: '2px solid var(--brand-primary, #12852f)',
                        flexShrink: 0,
                        cursor: 'pointer',
                        boxShadow: '0 2px 6px rgba(0, 193, 74, 0.2)'
                    }}
                >
                    {avatar ? (
                        <img
                            src={avatar}
                            alt="Rider"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={e => {
                                e.currentTarget.style.display = 'none'
                                if (e.currentTarget.nextElementSibling) {
                                    e.currentTarget.nextElementSibling.style.display = 'block'
                                }
                            }}
                        />
                    ) : null}
                    <i
                        className="bi bi-person-fill"
                        style={{
                            fontSize: 24,
                            color: 'var(--brand-primary-dark, #075c1b)',
                            display: avatar ? 'none' : 'block'
                        }}
                    ></i>
                </div>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <b style={{ fontSize: 15 }}>{rider?.user?.name || session?.user?.name || 'Rider'}</b>
                        {isAdmin && (
                            <span style={{ fontSize: 10, background: '#fef08a', color: '#854d0e', padding: '2px 6px', borderRadius: 4, fontWeight: 800 }}>
                                ADMIN TEST
                            </span>
                        )}
                    </div>
                    <small style={{ color: '#6d7b6e', display: 'block', marginTop: 2 }}>
                        {rider?.vehicleType || 'มอเตอร์ไซค์'} {plate ? `· ทะเบียน: ${plate}` : ''}
                        {' · '}
                        {effectiveStatus === 'AVAILABLE' ? (
                            <span style={{ color: 'var(--brand-primary, #12852f)', display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 700 }}>
                                <i className="bi bi-circle-fill" style={{ fontSize: 8 }}></i> พร้อมรับงาน
                            </span>
                        ) : effectiveStatus === 'BUSY' ? (
                            <span style={{ color: '#d97706', display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 700 }}>
                                <i className="bi bi-circle-fill" style={{ fontSize: 8 }}></i> กำลังส่งงาน ({activeJobsCount} งาน)
                            </span>
                        ) : (
                            <span style={{ color: '#6d7b6e', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <i className="bi bi-circle-fill" style={{ fontSize: 8 }}></i> ออฟไลน์
                            </span>
                        )}
                    </small>
                </div>
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                {rider?.status === 'BUSY' && (
                    <button
                        type="button"
                        className="staff-secondary"
                        onClick={() => toggleAvailability('AVAILABLE')}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '6px 12px', color: 'var(--brand-primary, #12852f)', borderColor: 'var(--brand-primary, #12852f)', background: '#fff' }}
                        title="เคลียร์สถานะเป็นพร้อมรับงานทันที"
                    >
                        <i className="bi bi-arrow-repeat"></i> เคลียร์สถานะเป็นว่าง
                    </button>
                )}
                <button
                    type="button"
                    className="staff-secondary"
                    onClick={() => setShowProfileModal(true)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '6px 12px' }}
                >
                    <i className="bi bi-pencil-square"></i> แก้ไขข้อมูลไรเดอร์
                </button>
                <button
                    type="button"
                    className="staff-primary"
                    disabled={effectiveStatus === 'BUSY'}
                    onClick={() => toggleAvailability()}
                    style={{ fontSize: 12, padding: '6px 14px' }}
                >
                    {effectiveStatus === 'BUSY' ? 'กำลังส่งงาน' : effectiveStatus === 'AVAILABLE' ? 'ตั้งเป็น OFFLINE' : 'พร้อมรับงาน'}
                </button>
            </div>
        </div>
    )
}

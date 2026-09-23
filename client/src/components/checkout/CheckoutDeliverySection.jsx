import { useLanguage } from '../../lib/LanguageContext'
import { MapLocationPicker } from '../MapLocationPicker'

export function CheckoutDeliverySection({
    orderMode,
    setOrderMode,
    takeawayMethod,
    setTakeawayMethod,
    savedAddresses,
    addressId,
    setAddressId,
    newStreet,
    setNewStreet,
    newState,
    setNewState,
    newZip,
    setNewZip,
    newLabel,
    setNewLabel,
    setManualAddress,
    scheduleType,
    setScheduleType,
    reservationMode,
    setReservationMode,
    reservationSlot,
    setReservationSlot,
    customReservationTime,
    setCustomReservationTime,
    reservationGuests,
    setReservationGuests,
    dineInTable,
    setDineInTable,
}) {
    const { isEn, t } = useLanguage()

    return (
        <div className="chk-card">
            <h3 className="chk-title">{t('checkoutServiceType')}</h3>
            <div className="order-options" style={{ marginBottom: 20 }}>
                <label>
                    <input
                        type="radio"
                        name="orderMode"
                        checked={orderMode === 'takeaway'}
                        onChange={() => setOrderMode('takeaway')}
                    />{' '}
                    <i className="bi bi-bicycle me-1" /> {t('checkoutTakeawayDelivery')}
                </label>
                <label>
                    <input
                        type="radio"
                        name="orderMode"
                        checked={orderMode === 'dine-in'}
                        onChange={() => setOrderMode('dine-in')}
                    />{' '}
                    <i className="bi bi-shop me-1" /> {t('checkoutDineInTable')}
                </label>
            </div>

            {orderMode === 'takeaway' ? (
                <>
                    <div className="order-options" style={{ marginBottom: 20 }}>
                        <label>
                            <input
                                type="radio"
                                name="takeawayMethod"
                                checked={takeawayMethod === 'delivery'}
                                onChange={() => setTakeawayMethod('delivery')}
                            />{' '}
                            {t('checkoutHomeDelivery')}
                        </label>
                        <label>
                            <input
                                type="radio"
                                name="takeawayMethod"
                                checked={takeawayMethod === 'pickup'}
                                onChange={() => setTakeawayMethod('pickup')}
                            />{' '}
                            {t('checkoutSelfPickup')}
                        </label>
                    </div>

                    {takeawayMethod === 'delivery' && (
                        <div className="chk-grid">
                            {savedAddresses.length > 0 && (
                                <div className="chk-input-wrap" style={{ gridColumn: '1 / -1' }}>
                                    <label>{t('checkoutSelectSavedAddress')}</label>
                                    <select
                                        value={addressId}
                                        onChange={e => setAddressId(e.target.value)}
                                        style={{ padding: '12px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '14px', width: '100%', boxSizing: 'border-box' }}
                                    >
                                        {savedAddresses.map(a => (
                                            <option key={a.id} value={a.id}>
                                                {a.label || (isEn ? 'Address' : 'ที่อยู่')} - {a.street} {a.state} {a.zip}
                                            </option>
                                        ))}
                                        <option value="new">{t('checkoutAddNewAddressOption')}</option>
                                    </select>
                                </div>
                            )}

                            {addressId === 'new' && (
                                <div className="chk-input-wrap" style={{ gridColumn: '1 / -1', background: '#f6faf2', padding: 14, borderRadius: 8, border: '1px solid #dce4d9' }}>
                                    <label style={{ fontWeight: 700, color: 'var(--brand-primary-dark)' }}>{isEn ? 'Enter New Delivery Address' : 'ระบุที่อยู่จัดส่งใหม่'}</label>
                                    <div style={{ marginBottom: 12 }}>
                                        <MapLocationPicker onLocationSelect={(obj) => {
                                            if (obj.street) setNewStreet(obj.street)
                                            if (obj.province) setNewState(obj.province)
                                            if (obj.zip) setNewZip(obj.zip)
                                            const parts = [obj.street, obj.province, obj.zip].filter(Boolean)
                                            setManualAddress(parts.join(' '))
                                        }} />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                                        <div>
                                            <label style={{ fontSize: 12, color: '#555' }}>{t('checkoutAddressLabel')}</label>
                                            <input value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder={t('profileAddressLabelPlaceholder')} style={{ width: '100%', boxSizing: 'border-box' }} />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: 12, color: '#555' }}>{isEn ? 'Province / State' : 'จังหวัด / เขต'}</label>
                                            <input value={newState} onChange={e => setNewState(e.target.value)} placeholder={isEn ? 'Bangkok' : 'กรุงเทพมหานคร'} style={{ width: '100%', boxSizing: 'border-box' }} />
                                        </div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
                                        <div>
                                            <label style={{ fontSize: 12, color: '#555' }}>{isEn ? 'Street / Building' : 'บ้านเลขที่ / ซอย / ถนน'}</label>
                                            <input required value={newStreet} onChange={e => setNewStreet(e.target.value)} placeholder={t('profileAddressStreetPlaceholder')} style={{ width: '100%', boxSizing: 'border-box' }} />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: 12, color: '#555' }}>{isEn ? 'Postal Code' : 'รหัสไปรษณีย์'}</label>
                                            <input value={newZip} onChange={e => setNewZip(e.target.value)} placeholder="10110" style={{ width: '100%', boxSizing: 'border-box' }} />
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="chk-input-wrap">
                                <label>{t('checkoutDeliverySchedule')}</label>
                                <select
                                    value={scheduleType}
                                    onChange={event => setScheduleType(event.target.value)}
                                    style={{ padding: '12px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '14px', width: '100%', boxSizing: 'border-box' }}
                                >
                                    <option value="ทันที">{t('checkoutScheduleImmediate')}</option>
                                    <option value="ระบุเวลา">{t('checkoutScheduleSpecific')}</option>
                                </select>
                            </div>

                            {scheduleType === 'ระบุเวลา' && (
                                <div className="chk-input-wrap">
                                    <label>{isEn ? 'Date & Time' : 'วันที่และเวลา'}</label>
                                    <input name="scheduledAt" type="datetime-local" required />
                                </div>
                            )}
                        </div>
                    )}
                </>
            ) : (
                /* Table Reservation View */
                <div style={{ background: '#f6fbf4', padding: 16, borderRadius: 8, border: '1px solid #cce8c5', display: 'grid', gap: 14 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
                        <label className={`chk-payment-box ${reservationMode === 'now' ? 'active' : ''}`} style={{ margin: 0, padding: '10px 14px', cursor: 'pointer' }}>
                            <input type="radio" checked={reservationMode === 'now'} onChange={() => setReservationMode('now')} />
                            <span><i className="bi bi-lightning-charge-fill me-1 text-warning" /> {isEn ? 'Arrive Now (Walk-in)' : 'ทานตอนนี้ (Walk-in)'}</span>
                        </label>
                        <label className={`chk-payment-box ${reservationMode === 'slot' ? 'active' : ''}`} style={{ margin: 0, padding: '10px 14px', cursor: 'pointer' }}>
                            <input type="radio" checked={reservationMode === 'slot'} onChange={() => setReservationMode('slot')} />
                            <span><i className="bi bi-calendar-check me-1 text-primary" /> {t('checkoutReserveSlot')}</span>
                        </label>
                    </div>

                    {reservationMode === 'slot' && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div className="chk-input-wrap">
                                <label>{t('checkoutSelectSlot')}</label>
                                <select value={reservationSlot} onChange={e => setReservationSlot(e.target.value)} style={{ padding: '10px', borderRadius: 6, border: '1px solid #ccc' }}>
                                    <option value="11:00 - 12:30">11:00 - 12:30 ({isEn ? 'Noon' : 'เที่ยงวัน'})</option>
                                    <option value="12:30 - 14:00">12:30 - 14:00 ({isEn ? 'Early Afternoon' : 'บ่ายต้น'})</option>
                                    <option value="17:30 - 19:00">17:30 - 19:00 ({isEn ? 'Evening' : 'เย็น'})</option>
                                    <option value="19:00 - 20:30">19:00 - 20:30 ({isEn ? 'Night' : 'ค่ำ'})</option>
                                    <option value="custom">{isEn ? 'Custom Date & Time...' : 'ระบุวัน-เวลาเอง...'}</option>
                                </select>
                            </div>
                            {reservationSlot === 'custom' && (
                                <div className="chk-input-wrap">
                                    <label>{isEn ? 'Reservation Date & Time' : 'วันและเวลาจอง'}</label>
                                    <input type="datetime-local" value={customReservationTime} onChange={e => setCustomReservationTime(e.target.value)} required />
                                </div>
                            )}
                        </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div className="chk-input-wrap">
                            <label>{t('checkoutGuestCount')}</label>
                            <select value={reservationGuests} onChange={e => setReservationGuests(e.target.value)} style={{ padding: '10px', borderRadius: 6, border: '1px solid #ccc' }}>
                                <option value="1">1 {isEn ? 'Guest' : 'ท่าน'}</option>
                                <option value="2">2 {isEn ? 'Guests' : 'ท่าน'}</option>
                                <option value="3">3 {isEn ? 'Guests' : 'ท่าน'}</option>
                                <option value="4">4 {isEn ? 'Guests' : 'ท่าน'}</option>
                                <option value="5">5 {isEn ? 'Guests' : 'ท่าน'}</option>
                                <option value="6">6 {isEn ? 'Guests' : 'ท่าน'}</option>
                                <option value="8">8+ {isEn ? 'Guests (Large Group)' : 'ท่านขึ้นไป (กลุ่มใหญ่)'}</option>
                            </select>
                        </div>
                        <div className="chk-input-wrap">
                            <label>{t('checkoutTablePreference')}</label>
                            <input value={dineInTable} onChange={e => setDineInTable(e.target.value)} placeholder={t('checkoutTablePlaceholder')} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

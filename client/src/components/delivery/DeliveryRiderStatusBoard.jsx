export function DeliveryRiderStatusBoard({ riders = [], loading = false }) {
    return (
        <section className="delivery-rider-status-board" aria-labelledby="delivery-rider-status-title">
            <div className="delivery-rider-status-head">
                <div>
                    <small>RIDER TEAM</small>
                    <h2 id="delivery-rider-status-title">สถานะไรเดอร์</h2>
                </div>
                <span>{riders.length} คน</span>
            </div>

            {loading ? (
                <div className="delivery-rider-status-empty"><i className="bi bi-arrow-repeat spin" /> กำลังโหลดรายชื่อไรเดอร์...</div>
            ) : riders.length === 0 ? (
                <div className="delivery-rider-status-empty"><i className="bi bi-person-x" /> ยังไม่มีไรเดอร์ในระบบ</div>
            ) : (
                <div className="delivery-rider-status-grid">
                    {riders.map(rider => {
                        const isOnline = rider.status === 'AVAILABLE' || rider.status === 'BUSY'
                        const riderName = rider.user?.name || rider.user?.email || 'ไรเดอร์'
                        const licensePlate = rider.licensePlate || rider.vehiclePlate || '-'

                        return (
                            <article className="delivery-rider-status-card" key={rider.id}>
                                <div className="delivery-rider-status-avatar" aria-hidden="true">
                                    {riderName.charAt(0).toUpperCase()}
                                </div>
                                <div className="delivery-rider-status-info">
                                    <strong>{riderName}</strong>
                                    <small><i className="bi bi-bicycle" /> ทะเบียน: {licensePlate}</small>
                                </div>
                                <span
                                    className={`delivery-rider-status-dot ${isOnline ? 'is-online' : 'is-offline'}`}
                                    role="img"
                                    aria-label={isOnline ? 'ออนไลน์' : 'ออฟไลน์'}
                                />
                            </article>
                        )
                    })}
                </div>
            )}
        </section>
    )
}

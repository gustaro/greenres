// New-job alert settings on the rider page: sound, system notifications, keep screen on.
export function DeliveryAlertControls({ alerts }) {
    const { prefs, updatePrefs, audioState, notificationPermission, enableNotifications, keepAwakeSupported, keepAwakeActive, testAlert } = alerts
    const soundBlocked = prefs.sound && audioState === 'suspended'

    return (
        <div className="cashier-sound rider-alerts">
            {soundBlocked && (
                <button type="button" className="cashier-sound-unlock" onClick={testAlert}>
                    <i className="bi bi-volume-mute-fill" />
                    <span><b>เสียงแจ้งเตือนงานใหม่ยังไม่ทำงาน</b> — แตะที่นี่ 1 ครั้งเพื่อเปิดเสียง</span>
                </button>
            )}

            <div className="cashier-sound-bar">
                <button
                    type="button"
                    className={`cashier-sound-toggle ${prefs.sound ? 'is-on' : ''}`}
                    onClick={() => updatePrefs({ sound: !prefs.sound })}
                    aria-pressed={prefs.sound}
                >
                    <i className={`bi ${prefs.sound ? 'bi-volume-up-fill' : 'bi-volume-mute-fill'}`} />
                    {prefs.sound ? 'เสียง: เปิด' : 'เสียง: ปิด'}
                </button>

                {notificationPermission === 'granted' ? (
                    <span className="cashier-sound-toggle is-on" role="status">
                        <i className="bi bi-bell-fill" /> แจ้งเตือนบนมือถือ: เปิดแล้ว
                    </span>
                ) : notificationPermission === 'default' ? (
                    <button type="button" className="cashier-sound-toggle" onClick={enableNotifications}>
                        <i className="bi bi-bell" /> เปิดแจ้งเตือนบนมือถือ
                    </button>
                ) : (
                    <span className="cashier-sound-toggle" role="status" title={notificationPermission === 'denied' ? 'ไปที่ตั้งค่าเว็บไซต์ของเบราว์เซอร์ แล้วอนุญาตการแจ้งเตือน' : 'iPhone ต้องเพิ่มเว็บไปที่หน้าจอโฮมก่อน'}>
                        <i className="bi bi-bell-slash" /> {notificationPermission === 'denied' ? 'แจ้งเตือนถูกบล็อก (เปิดในตั้งค่าเบราว์เซอร์)' : 'เบราว์เซอร์นี้ไม่รองรับแจ้งเตือน'}
                    </span>
                )}

                {keepAwakeSupported && (
                    <button
                        type="button"
                        className={`cashier-sound-toggle ${prefs.keepAwake ? 'is-on' : ''}`}
                        onClick={() => updatePrefs({ keepAwake: !prefs.keepAwake })}
                        aria-pressed={prefs.keepAwake}
                        title="กันหน้าจอดับระหว่างรองาน (ใช้แบตมากขึ้น)"
                    >
                        <i className={`bi ${prefs.keepAwake ? 'bi-brightness-high-fill' : 'bi-brightness-low'}`} />
                        {prefs.keepAwake ? (keepAwakeActive ? 'จอไม่ดับ: เปิด' : 'จอไม่ดับ: รอเปิด') : 'จอไม่ดับ: ปิด'}
                    </button>
                )}

                <button type="button" className="cashier-sound-test" onClick={testAlert}>
                    <i className="bi bi-megaphone-fill" /> ทดสอบแจ้งเตือน
                </button>
            </div>
            <small className="rider-alerts-hint">
                <i className="bi bi-info-circle" /> แจ้งเตือนจะทำงานเมื่อเปิดหน้านี้ค้างไว้ · ถ้าล็อกจอหรือปิดเบราว์เซอร์จะไม่ได้รับแจ้งเตือน
            </small>
        </div>
    )
}

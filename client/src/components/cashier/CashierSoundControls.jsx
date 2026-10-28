// Kitchen alert sound settings for the cashier: on/off, test buttons, and a prompt
// when the browser is still blocking audio (needs one click per page load).
export function CashierSoundControls({ soundEnabled, setSoundEnabled, audioState, testSound }) {
    const isBlocked = soundEnabled && audioState === 'suspended'
    const isUnsupported = audioState === 'unsupported'

    return (
        <div className="cashier-sound">
            {isBlocked && (
                <button type="button" className="cashier-sound-unlock" onClick={() => testSound('serve')}>
                    <i className="bi bi-volume-mute-fill" />
                    <span><b>เสียงแจ้งเตือนยังไม่ทำงาน</b> — เบราว์เซอร์ต้องให้กดก่อน 1 ครั้ง แตะที่นี่เพื่อเปิดเสียง</span>
                </button>
            )}

            <div className="cashier-sound-bar">
                <button
                    type="button"
                    className={`cashier-sound-toggle ${soundEnabled ? 'is-on' : ''}`}
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    aria-pressed={soundEnabled}
                    disabled={isUnsupported}
                >
                    <i className={`bi ${soundEnabled ? 'bi-volume-up-fill' : 'bi-volume-mute-fill'}`} />
                    {isUnsupported ? 'เบราว์เซอร์นี้ไม่รองรับเสียง' : soundEnabled ? 'เสียงแจ้งเตือน: เปิด' : 'เสียงแจ้งเตือน: ปิด'}
                </button>
                {soundEnabled && !isUnsupported && (
                    <>
                        <button type="button" className="cashier-sound-test" onClick={() => testSound('serve')}>
                            <i className="bi bi-bell-fill" /> ทดสอบ: อาหารพร้อมเสิร์ฟ
                        </button>
                        <button type="button" className="cashier-sound-test" onClick={() => testSound('rider')}>
                            <i className="bi bi-bicycle" /> ทดสอบ: รอไรเดอร์
                        </button>
                    </>
                )}
            </div>
        </div>
    )
}

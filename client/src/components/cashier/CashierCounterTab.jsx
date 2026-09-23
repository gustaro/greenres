export function CashierCounterTab({
    counterSource,
    setCounterSource,
    counterTableNumber,
    setCounterTableNumber,
    counterCustomerName,
    setCounterCustomerName,
    counterCustomerPhone,
    setCounterCustomerPhone,
    counterReservationTime,
    setCounterReservationTime,
    counterReservationGuests,
    setCounterReservationGuests,
    counterCategory,
    setCounterCategory,
    counterGroups,
    visibleCounterGroups,
    counterCart,
    counterAdd,
    counterRemove,
    counterItems,
    counterTakeawayMap,
    setCounterTakeawayMap,
    counterTotal,
    counterNote,
    setCounterNote,
    counterLoading,
    submitCounterOrder,
}) {
    return (
        <section>
            <div className="staff-section-head">
                <div>
                    <h2>รับออเดอร์หน้าร้าน & จองโต๊ะ</h2>
                    <p>สร้างออเดอร์สำหรับลูกค้าทานที่ร้าน สั่งกลับบ้าน หรือโทรจองโต๊ะล่วงหน้า</p>
                </div>
            </div>
            <div className="counter-order-layout">
                <div className="counter-menu">
                    <div className="counter-source-bar">
                        <label className={counterSource === 'walkin' ? 'active' : ''} onClick={() => setCounterSource('walkin')}>
                            <input type="radio" name="source" value="walkin" checked={counterSource === 'walkin'} onChange={() => setCounterSource('walkin')} />
                            <i className="bi bi-shop me-1"></i> ทานที่ร้าน
                        </label>
                        <label className={counterSource === 'takeaway' ? 'active' : ''} onClick={() => { setCounterSource('takeaway'); setCounterTableNumber('') }}>
                            <input type="radio" name="source" value="takeaway" checked={counterSource === 'takeaway'} onChange={() => { setCounterSource('takeaway'); setCounterTableNumber('') }} />
                            <i className="bi bi-box2 me-1"></i> สั่งกลับบ้าน
                        </label>
                        <label className={counterSource === 'reservation' ? 'active' : ''} onClick={() => setCounterSource('reservation')}>
                            <input type="radio" name="source" value="reservation" checked={counterSource === 'reservation'} onChange={() => setCounterSource('reservation')} />
                            <i className="bi bi-calendar3 me-1"></i> จองโต๊ะ (โทรจอง)
                        </label>
                    </div>

                    <div className="counter-category-tabs">
                        <button className={counterCategory === 'all' ? 'active' : ''} onClick={() => setCounterCategory('all')}>ทั้งหมด</button>
                        {counterGroups.map(group => (
                            <button key={group.id} className={counterCategory === group.id ? 'active' : ''} onClick={() => setCounterCategory(group.id)}>{group.name}</button>
                        ))}
                    </div>

                    <div className="counter-category-list">
                        {visibleCounterGroups.map(group => (
                            <section className="counter-category-section" key={group.id}>
                                <div className="counter-category-heading"><h3>{group.name}</h3><span>{group.products.length} เมนู</span></div>
                                <div className="counter-products">
                                    {group.products.map(p => (
                                        <div className="counter-product" key={p.id}>
                                            <img src={p.img} alt={p.name} />
                                            <div><b>{p.name}</b><small>฿{p.price}</small></div>
                                            <div className="counter-qty">
                                                <button onClick={() => counterRemove(p)}>−</button>
                                                <span>{counterCart[p.id] || 0}</span>
                                                <button onClick={() => counterAdd(p)}>+</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        ))}
                        {visibleCounterGroups.length === 0 && <p className="counter-empty">ยังไม่มีเมนูในหมวดหมู่นี้</p>}
                    </div>
                </div>

                <aside className="counter-cart">
                    <h3>ข้อมูลออเดอร์</h3>
                    <div className="counter-customer-fields">
                        <label>
                            ชื่อลูกค้า <small>{counterSource === 'reservation' ? '(จำเป็น)' : '(ไม่บังคับ)'}</small>
                            <input value={counterCustomerName} onChange={event => setCounterCustomerName(event.target.value)} placeholder="เช่น คุณเอ" maxLength={80} />
                        </label>
                        <label>
                            เบอร์โทรติดต่อ
                            <input value={counterCustomerPhone} onChange={e => setCounterCustomerPhone(e.target.value)} placeholder="08x-xxx-xxxx" maxLength={20} />
                        </label>

                        {counterSource === 'walkin' && (
                            <label>
                                เบอร์โต๊ะ <b>*</b>
                                <input value={counterTableNumber} onChange={event => setCounterTableNumber(event.target.value)} placeholder="เช่น 12 หรือ A3" maxLength={20} />
                            </label>
                        )}

                        {counterSource === 'reservation' && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                <label>
                                    รอบเวลาจอง
                                    <select value={counterReservationTime} onChange={e => setCounterReservationTime(e.target.value)} style={{ padding: 8, borderRadius: 6, border: '1px solid #ccc' }}>
                                        <option value="11:00 - 12:30">11:00 - 12:30</option>
                                        <option value="12:30 - 14:00">12:30 - 14:00</option>
                                        <option value="17:30 - 19:00">17:30 - 19:00</option>
                                        <option value="19:00 - 20:30">19:00 - 20:30</option>
                                    </select>
                                </label>
                                <label>
                                    จำนวนที่นั่ง (ท่าน)
                                    <input type="number" min="1" max="20" value={counterReservationGuests} onChange={e => setCounterReservationGuests(e.target.value)} style={{ padding: 8, borderRadius: 6, border: '1px solid #ccc' }} />
                                </label>
                            </div>
                        )}
                    </div>

                    <h3 className="counter-cart-title" style={{ marginTop: 16 }}>รายการสั่ง</h3>
                    {counterItems.length === 0 ? (
                        <p className="counter-empty">ยังไม่มีรายการ</p>
                    ) : (
                        counterItems.map(p => {
                            const isTakeaway = Boolean(counterTakeawayMap[p.id])
                            return (
                                <div className="counter-cart-row" key={p.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 6, alignItems: 'center' }}>
                                    <div>
                                        <span>{p.name} × {counterCart[p.id]}</span>
                                        {counterSource === 'walkin' && (
                                            <div style={{ marginTop: 2 }}>
                                                <button
                                                    type="button"
                                                    onClick={() => setCounterTakeawayMap(prev => ({ ...prev, [p.id]: !prev[p.id] }))}
                                                    style={{
                                                        border: 0,
                                                        background: isTakeaway ? '#fef08a' : '#f6faf2',
                                                        color: isTakeaway ? '#854d0e' : '#6d7b6e',
                                                        fontSize: 10,
                                                        padding: '2px 8px',
                                                        borderRadius: 12,
                                                        cursor: 'pointer',
                                                        fontWeight: 700,
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: 4
                                                    }}
                                                >
                                                    {isTakeaway ? (
                                                        <><i className="bi bi-box2"></i> สั่งกลับบ้าน</>
                                                    ) : (
                                                        <><i className="bi bi-shop"></i> ทานที่ร้าน</>
                                                    )}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <b>฿{p.price * counterCart[p.id]}</b>
                                </div>
                            )
                        })
                    )}
                    <div className="counter-total"><span>ยอดรวม</span><b>฿{counterTotal}</b></div>
                    <textarea className="counter-note" value={counterNote} onChange={e => setCounterNote(e.target.value)} placeholder="หมายเหตุ (ถ้ามี)" rows={2} />
                    <button className="staff-primary counter-submit" onClick={submitCounterOrder} disabled={counterLoading || counterItems.length === 0}>
                        {counterLoading ? <><i className="bi bi-arrow-repeat spin me-1" /> กำลังส่งเข้าครัว...</> : <><i className="bi bi-send-check me-1"></i> ส่งเข้าครัว</>}
                    </button>
                </aside>
            </div>
        </section>
    )
}

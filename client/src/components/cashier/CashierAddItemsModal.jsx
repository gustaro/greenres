import { orderCode } from '../StaffShared'

export function CashierAddItemsModal({
    order,
    counterGroups = [],
    counterProducts = [],
    addItemsCart,
    setAddItemsCart,
    addItemsTakeawayMap,
    setAddItemsTakeawayMap,
    addItemsCategory,
    setAddItemsCategory,
    visibleAddItemsGroups,
    onSubmit,
    onCancel,
    loading,
}) {
    if (!order) return null

    const totalAddedCount = Object.values(addItemsCart).reduce((a, b) => a + b, 0)

    return (
        <div className="overlay" style={{ zIndex: 1200, display: 'grid', placeItems: 'center', background: 'rgba(0,0,0,0.5)' }}>
            <div style={{ background: '#fff', borderRadius: 12, padding: 24, width: '90%', maxWidth: 700, maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--brand-primary-dark)', display: 'flex', alignItems: 'center' }}>
                            <i className="bi bi-plus-circle me-2"></i> เพิ่มเมนูในออเดอร์ {orderCode(order)}
                        </h3>
                        <small style={{ color: '#666' }}>
                            {order.deliveryType} {order.tableNumber ? `(โต๊ะ ${order.tableNumber})` : ''}
                        </small>
                    </div>
                    <button onClick={onCancel} style={{ border: 0, background: 'transparent', fontSize: 24, cursor: 'pointer' }}>×</button>
                </div>

                {/* Dine-in vs Takeaway Batch Mode Quick Toggle */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f6faf2', padding: '10px 14px', borderRadius: 8, marginBottom: 14, border: '1px solid #d8e7d2', flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#075c1b', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <i className="bi bi-sliders" style={{ color: 'var(--brand-primary, #12852f)' }}></i>
                        <span>กำหนดประเภทรายการที่เพิ่ม:</span>
                    </div>
                    <div style={{ display: 'inline-flex', background: '#fff', borderRadius: 20, padding: 3, border: '1px solid #c2cdc1' }}>
                        <button
                            type="button"
                            onClick={() => {
                                setAddItemsTakeawayMap(prev => {
                                    const next = { ...prev }
                                    Object.keys(addItemsCart).forEach(pid => { next[pid] = false })
                                    return next
                                })
                            }}
                            style={{
                                border: 0,
                                background: Object.values(addItemsTakeawayMap).filter(Boolean).length === 0 ? '#effbdc' : 'transparent',
                                color: Object.values(addItemsTakeawayMap).filter(Boolean).length === 0 ? '#075c1b' : '#6d7b6e',
                                padding: '4px 12px',
                                borderRadius: 16,
                                fontSize: 12,
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5
                            }}
                        >
                            <i className="bi bi-shop"></i> ทานที่ร้านทั้งหมด
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setAddItemsTakeawayMap(prev => {
                                    const next = { ...prev }
                                    Object.keys(addItemsCart).forEach(pid => { next[pid] = true })
                                    return next
                                })
                            }}
                            style={{
                                border: 0,
                                background: Object.values(addItemsTakeawayMap).filter(Boolean).length > 0 && Object.values(addItemsTakeawayMap).filter(Boolean).length === Object.keys(addItemsCart).filter(pid => addItemsCart[pid] > 0).length ? '#fef3c7' : 'transparent',
                                color: Object.values(addItemsTakeawayMap).filter(Boolean).length > 0 ? '#92400e' : '#6d7b6e',
                                padding: '4px 12px',
                                borderRadius: 16,
                                fontSize: 12,
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5
                            }}
                        >
                            <i className="bi bi-box2"></i> สั่งกลับบ้านทั้งหมด
                        </button>
                    </div>
                </div>

                {/* Category filter */}
                <div className="counter-category-tabs" style={{ marginBottom: 14 }}>
                    <button className={addItemsCategory === 'all' ? 'active' : ''} onClick={() => setAddItemsCategory('all')}>ทั้งหมด</button>
                    {counterGroups.map(group => (
                        <button key={group.id} className={addItemsCategory === group.id ? 'active' : ''} onClick={() => setAddItemsCategory(group.id)}>{group.name}</button>
                    ))}
                </div>

                {/* Items to add */}
                <div style={{ display: 'grid', gap: 10, maxHeight: 300, overflowY: 'auto', paddingRight: 4 }}>
                    {visibleAddItemsGroups.flatMap(g => g.products).map(p => {
                        const qty = addItemsCart[p.id] || 0
                        const isTakeaway = Boolean(addItemsTakeawayMap[p.id])
                        return (
                            <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', border: '1px solid #d8e7d2', borderRadius: 8, background: qty > 0 ? '#effbdc' : '#fff' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <img src={p.img} alt={p.name} style={{ width: 44, height: 44, borderRadius: 6, objectFit: 'cover' }} />
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: 14 }}>{p.name}</div>
                                        <div style={{ fontSize: 12, color: '#12852f', fontWeight: 600 }}>฿{p.price}</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    {qty > 0 && (
                                        <div style={{ display: 'inline-flex', background: '#f6faf2', borderRadius: 20, padding: 2, border: '1px solid #d8e7d2' }}>
                                            <button
                                                type="button"
                                                onClick={() => setAddItemsTakeawayMap(prev => ({ ...prev, [p.id]: false }))}
                                                style={{
                                                    border: 0,
                                                    background: !isTakeaway ? '#effbdc' : 'transparent',
                                                    color: !isTakeaway ? '#075c1b' : '#6d7b6e',
                                                    padding: '4px 8px',
                                                    borderRadius: 18,
                                                    fontSize: 11,
                                                    fontWeight: !isTakeaway ? 800 : 600,
                                                    cursor: 'pointer',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: 4
                                                }}
                                            >
                                                <i className="bi bi-shop"></i> ทานร้าน
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setAddItemsTakeawayMap(prev => ({ ...prev, [p.id]: true }))}
                                                style={{
                                                    border: 0,
                                                    background: isTakeaway ? '#fef3c7' : 'transparent',
                                                    color: isTakeaway ? '#92400e' : '#6d7b6e',
                                                    padding: '4px 8px',
                                                    borderRadius: 18,
                                                    fontSize: 11,
                                                    fontWeight: isTakeaway ? 800 : 600,
                                                    cursor: 'pointer',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: 4
                                                }}
                                            >
                                                <i className="bi bi-box2"></i> กลับบ้าน
                                            </button>
                                        </div>
                                    )}
                                    <div className="counter-qty" style={{ margin: 0 }}>
                                        <button onClick={() => setAddItemsCart(prev => ({ ...prev, [p.id]: Math.max(0, (prev[p.id] || 0) - 1) }))}>−</button>
                                        <span>{qty}</span>
                                        <button onClick={() => setAddItemsCart(prev => ({ ...prev, [p.id]: (prev[p.id] || 0) + 1 }))}>+</button>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* Selected summary & Chips */}
                <div style={{ borderTop: '1px solid #eee', marginTop: 16, paddingTop: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                        <div>
                            <span style={{ fontSize: 13, color: '#666' }}>เมนูที่เพิ่ม: </span>
                            <strong style={{ fontSize: 15, color: '#075c1b' }}>
                                {totalAddedCount} รายการ
                            </strong>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button type="button" className="staff-secondary" onClick={onCancel} disabled={loading}>ยกเลิก</button>
                            <button type="button" className="staff-primary" onClick={onSubmit} disabled={loading || totalAddedCount === 0}>
                                {loading ? 'กำลังส่งเข้าครัว...' : <><i className="bi bi-send-check me-1"></i> ยืนยันและส่งเข้าครัว</>}
                            </button>
                        </div>
                    </div>
                    {/* Breakdown Chips */}
                    {Object.entries(addItemsCart).filter(([_, q]) => q > 0).length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, background: '#f6faf2', padding: '8px 10px', borderRadius: 8, border: '1px solid #f0f0f0' }}>
                            {Object.entries(addItemsCart).filter(([_, q]) => q > 0).map(([pid, qty]) => {
                                const prod = (counterProducts || []).find(p => p.id === pid)
                                const isT = Boolean(addItemsTakeawayMap[pid])
                                return (
                                    <span key={pid} style={{
                                        fontSize: 12,
                                        padding: '3px 8px',
                                        borderRadius: 6,
                                        background: isT ? '#fef3c7' : '#e0f2fe',
                                        color: isT ? '#92400e' : '#0369a1',
                                        fontWeight: 700,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 4
                                    }}>
                                        <i className={isT ? "bi bi-box2" : "bi bi-shop"}></i>
                                        {prod?.name || 'สินค้า'} {isT ? '(กลับบ้าน)' : '(ทานร้าน)'} × {qty}
                                    </span>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

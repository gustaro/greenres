import { money, orderCode } from '../StaffShared'
import { buildCartLines, productIdFromLineKey } from '../../lib/productOptions'
import { isProductSoldOut } from './useCashierCounter'

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
    addItemsAdd,
    addItemsRemove,
}) {
    if (!order) return null

    const totalAddedCount = Object.values(addItemsCart).reduce((a, b) => a + b, 0)
    const selectedLines = buildCartLines(addItemsCart, counterProducts)
    const addedTotal = selectedLines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0)
    const removeLine = lineKey => setAddItemsCart(prev => {
        const next = { ...prev }
        delete next[lineKey]
        return next
    })
    const setProductTakeaway = (productId, value) => setAddItemsTakeawayMap(prev => {
        const next = { ...prev }
        Object.keys(addItemsCart).filter(key => productIdFromLineKey(key) === productId).forEach(key => { next[key] = value })
        return next
    })

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

                {order.isPaid && (
                    <div style={{ background: 'var(--brand-accent-soft, #effbdc)', border: '1px solid var(--brand-accent, #9fe51f)', color: 'var(--brand-primary-dark, #075c1b)', borderRadius: 8, padding: '8px 12px', fontSize: 12, fontWeight: 700, marginBottom: 12 }}>
                        <i className="bi bi-info-circle me-1" /> ออเดอร์นี้ชำระแล้ว {money(order.paidAmount)} — เมนูที่สั่งเพิ่มจะเป็นยอดค้างชำระใหม่ เก็บเงินเฉพาะส่วนต่าง
                    </div>
                )}

                {/* Dine-in vs Takeaway Batch Mode Quick Toggle */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--brand-surface, #f6faf2)', padding: '10px 14px', borderRadius: 8, marginBottom: 14, border: '1px solid var(--brand-border, #d8e7d2)', flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--brand-primary-dark, #075c1b)', display: 'flex', alignItems: 'center', gap: 6 }}>
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
                                background: Object.values(addItemsTakeawayMap).filter(Boolean).length === 0 ? 'var(--brand-accent-soft, #effbdc)' : 'transparent',
                                color: Object.values(addItemsTakeawayMap).filter(Boolean).length === 0 ? 'var(--brand-primary-dark, #075c1b)' : '#6d7b6e',
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
                        const productLines = selectedLines.filter(line => line.productId === p.id)
                        const qty = productLines.reduce((sum, line) => sum + line.quantity, 0)
                        const isTakeaway = productLines.length > 0 && productLines.every(line => Boolean(addItemsTakeawayMap[line.lineKey]))
                        const soldOut = isProductSoldOut(p)
                        return (
                            <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '8px 12px', border: '1px solid var(--brand-border, #d8e7d2)', borderRadius: 8, background: soldOut ? '#f5f5f4' : qty > 0 ? 'var(--brand-accent-soft, #effbdc)' : '#fff', opacity: soldOut ? 0.65 : 1 }}>
                                <button
                                    type="button"
                                    onClick={() => addItemsAdd(p)}
                                    disabled={soldOut}
                                    title={soldOut ? 'สินค้าหมด' : 'กดเพื่อเพิ่มลงตะกร้า'}
                                    style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0, border: 0, background: 'transparent', padding: 0, textAlign: 'left', cursor: soldOut ? 'not-allowed' : 'pointer' }}
                                >
                                    <img src={p.img} alt={p.name} style={{ width: 44, height: 44, borderRadius: 6, objectFit: 'cover', filter: soldOut ? 'grayscale(1)' : 'none' }} />
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: 14 }}>{p.name}</div>
                                        <div style={{ fontSize: 12, color: 'var(--brand-primary, #12852f)', fontWeight: 600 }}>
                                            ฿{p.price}
                                            {soldOut && <span className="counter-soldout-badge" style={{ marginLeft: 6 }}>หมด</span>}
                                        </div>
                                    </div>
                                </button>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    {qty > 0 && (
                                        <div style={{ display: 'inline-flex', background: 'var(--brand-surface, #f6faf2)', borderRadius: 20, padding: 2, border: '1px solid var(--brand-border, #d8e7d2)' }}>
                                            <button
                                                type="button"
                                                onClick={() => setProductTakeaway(p.id, false)}
                                                style={{
                                                    border: 0,
                                                    background: !isTakeaway ? 'var(--brand-accent-soft, #effbdc)' : 'transparent',
                                                    color: !isTakeaway ? 'var(--brand-primary-dark, #075c1b)' : '#6d7b6e',
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
                                                onClick={() => setProductTakeaway(p.id, true)}
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
                                    {qty > 0 ? (
                                        <div className="counter-qty" style={{ margin: 0 }}>
                                            <button onClick={() => addItemsRemove(p)}>−</button>
                                            <span>{qty}</span>
                                            <button onClick={() => addItemsAdd(p)} disabled={soldOut}>+</button>
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            className="staff-primary"
                                            onClick={() => addItemsAdd(p)}
                                            disabled={soldOut}
                                            style={{ padding: '6px 12px', fontSize: 12, whiteSpace: 'nowrap' }}
                                        >
                                            {soldOut ? 'หมด' : <><i className="bi bi-cart-plus me-1" />เพิ่มลงตะกร้า</>}
                                        </button>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* Selected summary & Chips */}
                <div style={{ borderTop: '1px solid #eee', marginTop: 16, paddingTop: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                        <div>
                            <span style={{ fontSize: 13, color: '#666' }}><i className="bi bi-cart3 me-1" />ตะกร้าสั่งเพิ่ม: </span>
                            <strong style={{ fontSize: 15, color: 'var(--brand-primary-dark, #075c1b)' }}>
                                {totalAddedCount} รายการ · {money(addedTotal)}
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
                    {selectedLines.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, background: '#f6faf2', padding: '8px 10px', borderRadius: 8, border: '1px solid #f0f0f0' }}>
                            {selectedLines.map(line => {
                                const prod = line.product
                                const isT = Boolean(addItemsTakeawayMap[line.lineKey])
                                return (
                                    <span key={line.lineKey} style={{
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
                                        {prod?.name || 'สินค้า'}{line.selectedOptions.length ? ` — ${line.selectedOptions.map(option => option.name).join(', ')}` : ''} {isT ? '(กลับบ้าน)' : '(ทานร้าน)'} × {line.quantity}
                                        <button type="button" onClick={() => removeLine(line.lineKey)} aria-label="ลบออกจากตะกร้า" style={{ border: 0, background: 'transparent', color: 'inherit', cursor: 'pointer', padding: 0, marginLeft: 2, lineHeight: 1 }}>
                                            <i className="bi bi-x-circle-fill" />
                                        </button>
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

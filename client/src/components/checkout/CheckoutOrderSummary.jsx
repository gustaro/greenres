import { useLanguage } from '../../lib/LanguageContext'

export function CheckoutOrderSummary({ items, cart, orderMode, takeawayItemMap, itemNotes, subtotal, fee, discount, total }) {
    const { isEn, t } = useLanguage()
    return (
        <aside>
            <div className="chk-card" style={{ position: 'sticky', top: 30 }}>
                <h3 className="chk-title">{isEn ? 'Order Summary' : 'สรุปรายการคำสั่งซื้อ'}</h3>
                {items.map(product => {
                    const isItemTakeaway = orderMode === 'dine-in' && Boolean(takeawayItemMap[product.id])
                    const displayName = isEn && product.en ? product.en : product.name
                    return (
                        <div className="sum-row" key={product.id}>
                            <span>
                                {displayName}
                                {isItemTakeaway && (
                                    <span style={{ marginLeft: 6, fontSize: 10, background: '#effbdc', color: '#075c1b', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>
                                        <i className="bi bi-bag-check me-1" />{isEn ? 'Takeaway' : 'กลับบ้าน'}
                                    </span>
                                )}
                                <small style={{ display: 'block', color: '#888', fontSize: 11, marginTop: 4 }}>
                                    {cart[product.id]} × ฿{product.price}
                                    {itemNotes[product.id] ? ` · ${itemNotes[product.id]}` : ''}
                                </small>
                            </span>
                            <b style={{ fontWeight: 600 }}>฿{product.price * cart[product.id]}</b>
                        </div>
                    )
                })}

                <hr style={{ border: 0, borderTop: '1px solid #f0f0f0', margin: '20px 0' }} />

                <div className="sum-row" style={{ fontSize: 12 }}>
                    <span>{t('subtotal')}</span>
                    <span>฿{subtotal}</span>
                </div>
                <div className="sum-row" style={{ fontSize: 12 }}>
                    <span>{t('deliveryFee')}</span>
                    <span>{fee ? `฿${fee}` : (isEn ? 'FREE' : 'ฟรี')}</span>
                </div>
                <div className="sum-row" style={{ fontSize: 12 }}>
                    <span>{t('discount')}</span>
                    <span style={{ color: discount ? 'var(--brand-primary)' : 'inherit' }}>{discount ? `-฿${discount}` : '฿0'}</span>
                </div>

                <div className="sum-total" style={{ borderTop: 0, marginTop: 25, paddingTop: 0 }}>
                    <span style={{ fontSize: 18, fontWeight: 900, color: '#000' }}>{t('netTotal')}</span>
                    <b style={{ color: '#000', fontSize: 22, fontWeight: 900 }}>฿{total}</b>
                </div>
            </div>
        </aside>
    )
}

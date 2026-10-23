import { useLanguage } from '../../lib/LanguageContext'

export function CheckoutOrderSummary({ items, cart, orderMode, takeawayItemMap, itemNotes, subtotal, fee, discount, pointsToUse = 0, pointsDiscount = 0, total }) {
    const { isEn, t } = useLanguage()
    return (
        <aside>
            <div className="chk-card" style={{ position: 'sticky', top: 30 }}>
                <h3 className="chk-title">{isEn ? 'Order Summary' : 'สรุปรายการคำสั่งซื้อ'}</h3>
                {items.map(line => {
                    const product = line.product
                    const isItemTakeaway = orderMode === 'dine-in' && Boolean(takeawayItemMap[line.lineKey])
                    const displayName = isEn && product.en ? product.en : product.name
                    return (
                        <div className="sum-row" key={line.lineKey}>
                            <span>
                                {displayName}
                                {isItemTakeaway && (
                                    <span style={{ marginLeft: 6, fontSize: 10, background: 'var(--brand-accent-soft, #effbdc)', color: 'var(--brand-primary-dark, #075c1b)', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>
                                        <i className="bi bi-bag-check me-1" />{isEn ? 'Takeaway' : 'กลับบ้าน'}
                                    </span>
                                )}
                                <small style={{ display: 'block', color: '#888', fontSize: 11, marginTop: 4 }}>
                                    {line.quantity} × ฿{line.unitPrice}
                                    {itemNotes[line.lineKey] ? ` · ${itemNotes[line.lineKey]}` : ''}
                                </small>
                                {line.selectedOptions.length > 0 && <small style={{ display: 'block', color: 'var(--brand-primary-dark)', fontSize: 10, marginTop: 3 }}>{line.selectedOptions.map(option => isEn && option.nameEn ? option.nameEn : option.name).join(' · ')}</small>}
                            </span>
                            <b style={{ fontWeight: 600 }}>฿{line.unitPrice * line.quantity}</b>
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
                {discount > 0 && (
                    <div className="sum-row" style={{ fontSize: 12 }}>
                        <span>{isEn ? 'Promo Code Discount' : 'ส่วนลดโค้ดโปรโมชั่น'}</span>
                        <span style={{ color: 'var(--brand-primary)', fontWeight: 600 }}>-฿{discount}</span>
                    </div>
                )}
                {pointsDiscount > 0 && (
                    <div className="sum-row" style={{ fontSize: 12 }}>
                        <span>{t('checkoutPointsDiscount')} ({pointsToUse} {t('profilePointsUnit')})</span>
                        <span style={{ color: 'var(--brand-primary)', fontWeight: 600 }}>-฿{pointsDiscount}</span>
                    </div>
                )}
                {!discount && !pointsDiscount && (
                    <div className="sum-row" style={{ fontSize: 12 }}>
                        <span>{t('discount')}</span>
                        <span>฿0</span>
                    </div>
                )}

                <div className="sum-total" style={{ borderTop: 0, marginTop: 25, paddingTop: 0 }}>
                    <span style={{ fontSize: 18, fontWeight: 900, color: '#000' }}>{t('netTotal')}</span>
                    <b style={{ color: '#000', fontSize: 22, fontWeight: 900 }}>฿{total}</b>
                </div>
            </div>
        </aside>
    )
}

import { useState, useMemo } from 'react'
import { useLanguage } from '../../lib/LanguageContext'
import { useAuth } from '../../lib/AuthContext'

export function ProfilePointsTab({ profile, orders = [], money, onOrderMore }) {
    const { isEn, t } = useLanguage()
    const { settings } = useAuth()
    const [filter, setFilter] = useState('all') // 'all' | 'earned' | 'used'

    const earnRate = Number(settings?.pointsEarnRate || 10)
    const redeemRate = Number(settings?.pointsRedeemRate || 10)

    // Compute point transactions from orders and member bonus
    const transactions = useMemo(() => {
        const list = []
        let totalFromOrders = 0
        let totalPointsUsed = 0

        // Process orders
        for (const order of orders) {
            if (order.foodStatus === 'ยกเลิก' || order.status === 'CANCELLED') continue

            const total = Number(order.totalAmount || order.total || 0)
            const pts = Math.floor(total / earnRate)
            const isCompleted = ['จัดส่งเสร็จสิ้น', 'ทำเสร็จแล้ว', 'เสร็จสิ้น'].includes(order.foodStatus) || order.status === 'DELIVERED'

            // Check if points were used in this order
            const usedPts = Number(order.pointsUsed || order.meta?.pointsUsed || 0)
            if (usedPts > 0) {
                totalPointsUsed += usedPts
                list.push({
                    id: `order-used-${order.id}`,
                    type: 'used',
                    title: isEn ? `Redeemed for Order #${order.orderNumber || order.id?.slice(-6).toUpperCase()}` : `ใช้แต้มแลกส่วนลด ออเดอร์ #${order.orderNumber || order.id?.slice(-6).toUpperCase()}`,
                    desc: isEn ? `Discount value ฿${Math.floor(usedPts / redeemRate)}` : `แลกรับส่วนลดมูลค่า ฿${Math.floor(usedPts / redeemRate)}`,
                    points: usedPts,
                    date: order.createdAt || new Date().toISOString(),
                    status: 'completed',
                })
            }

            if (pts > 0) {
                if (isCompleted) totalFromOrders += pts

                list.push({
                    id: `order-${order.id}`,
                    type: 'earned',
                    title: isEn ? `Order #${order.orderNumber || order.id?.slice(-6).toUpperCase()}` : `สั่งซื้ออาหาร #${order.orderNumber || order.id?.slice(-6).toUpperCase()}`,
                    desc: `${t('profilePointsOrderDesc')} ${money ? money(total) : `฿${total}`}`,
                    points: pts,
                    date: order.createdAt || new Date().toISOString(),
                    status: isCompleted ? 'completed' : 'pending',
                })
            }
        }

        // Calculate member/welcome bonus if current points exceed orders
        const currentPoints = Number(profile?.points || 0)
        const bonusPoints = (currentPoints + totalPointsUsed) - totalFromOrders
        if (bonusPoints > 0) {
            list.push({
                id: 'member-welcome-bonus',
                type: 'earned',
                title: isEn ? 'Welcome & Member Bonus' : 'โบนัสต้อนรับและแต้มพิเศษสมาชิก',
                desc: isEn ? 'Special reward for LimeLeaf member' : 'สิทธิพิเศษสำหรับสมาชิกคนพิเศษ LimeLeaf',
                points: bonusPoints,
                date: profile?.createdAt || '2026-09-16T05:08:38.189Z',
                status: 'completed',
            })
        }

        // Sort descending by date
        return list.sort((a, b) => new Date(b.date) - new Date(a.date))
    }, [orders, profile?.points, profile?.createdAt, isEn, money, t, earnRate, redeemRate])

    const filteredList = useMemo(() => {
        if (filter === 'earned') return transactions.filter(t => t.type === 'earned')
        if (filter === 'used') return transactions.filter(t => t.type === 'used')
        return transactions
    }, [transactions, filter])

    const earnedCount = useMemo(() => transactions.filter(t => t.type === 'earned').length, [transactions])
    const usedCount = useMemo(() => transactions.filter(t => t.type === 'used').length, [transactions])

    const currentPoints = Number(profile?.points || 0)
    const discountValue = Math.floor(currentPoints / redeemRate)

    return (
        <div className="pf-points-tab">
            <div className="pf-content-head">
                <div>
                    <h2>{t('profilePointsTitle')}</h2>
                    <p>{t('profilePointsSubtitle')}</p>
                </div>
                <button onClick={onOrderMore}>{t('profileOrderMore')}</button>
            </div>

            {/* Current Balance Banner */}
            <div className="pf-points-balance-card">
                <div className="pf-points-balance-info">
                    <span className="pf-points-tag">
                        <i className="bi bi-patch-check-fill me-1" />
                        {isEn ? 'LimeLeaf Member' : 'สมาชิก LimeLeaf'}
                    </span>
                    <small>{t('profileCurrentPoints')}</small>
                    <div className="pf-points-number">
                        <i className="bi bi-star-fill text-warning me-2" />
                        <strong>{currentPoints.toLocaleString()}</strong>
                        <span>{t('profilePointsUnit')}</span>
                    </div>
                    <p className="pf-points-subnote">
                        <i className="bi bi-tag-fill me-1" />
                        {t('profilePointsValueDesc')}
                        {discountValue > 0 && ` (${isEn ? 'Value' : 'มูลค่า'} ≈ ฿${discountValue.toLocaleString()})`}
                    </p>
                </div>
                <div className="pf-points-balance-graphic">
                    <div className="pf-points-coin-glow">
                        <i className="bi bi-stars" />
                    </div>
                </div>
            </div>

            {/* Perks & Rules Grid */}
            <div className="pf-points-perks">
                <div className="pf-perk-item">
                    <div className="pf-perk-icon" style={{ color: 'var(--brand-primary, #12852f)', background: 'var(--brand-accent-soft, #effbdc)' }}>
                        <i className="bi bi-bag-heart-fill" />
                    </div>
                    <div>
                        <strong>{isEn ? `Spend ฿${earnRate} = 1 Pt` : `ทุก ${earnRate} บาท = 1 แต้ม`}</strong>
                        <p>{t('profileEarnRule1')}</p>
                    </div>
                </div>
                <div className="pf-perk-item">
                    <div className="pf-perk-icon" style={{ color: '#ca8a04', background: '#fef9c3' }}>
                        <i className="bi bi-gift-fill" />
                    </div>
                    <div>
                        <strong>{isEn ? 'Special Deals' : 'แลกส่วนลดสุดคุ้ม'}</strong>
                        <p>{t('profileEarnRule2')}</p>
                    </div>
                </div>
                <div className="pf-perk-item">
                    <div className="pf-perk-icon" style={{ color: '#2563eb', background: '#dbeafe' }}>
                        <i className="bi bi-shield-check" />
                    </div>
                    <div>
                        <strong>{isEn ? 'No Expiry' : 'ไม่มีวันหมดอายุ'}</strong>
                        <p>{t('profileEarnRule3')}</p>
                    </div>
                </div>
            </div>

            {/* Transaction Filter Header */}
            <div className="pf-points-filter-row">
                <h3>{t('profilePointsHistory')}</h3>
                <div className="pf-points-tabs">
                    <button
                        className={filter === 'all' ? 'active' : ''}
                        onClick={() => setFilter('all')}
                    >
                        {t('profilePointsFilterAll')} ({transactions.length})
                    </button>
                    <button
                        className={filter === 'earned' ? 'active' : ''}
                        onClick={() => setFilter('earned')}
                    >
                        {t('profilePointsFilterEarned')} ({earnedCount})
                    </button>
                    <button
                        className={filter === 'used' ? 'active' : ''}
                        onClick={() => setFilter('used')}
                    >
                        {t('profilePointsFilterUsed')} ({usedCount})
                    </button>
                </div>
            </div>

            {/* Transactions List */}
            {filteredList.length === 0 ? (
                <div className="pf-activity-empty">
                    <i className="bi bi-clock-history" style={{ fontSize: 32, display: 'block', marginBottom: 10, color: '#aaa' }} />
                    <p style={{ margin: '0 0 14px' }}>{t('profileNoPointsHistory')}</p>
                    <button className="pf-save-btn" style={{ margin: '0 auto' }} onClick={onOrderMore}>
                        {t('profileOrderMore')}
                    </button>
                </div>
            ) : (
                <div className="pf-points-history-list">
                    {filteredList.map(item => (
                        <article key={item.id} className="pf-points-history-item">
                            <div className={`pf-point-icon ${item.status === 'pending' ? 'pending' : item.type}`}>
                                <i className={`bi ${item.status === 'pending' ? 'bi-hourglass-split' : item.type === 'earned' ? 'bi-plus-lg' : 'bi-dash-lg'}`} />
                            </div>
                            <div className="pf-point-details">
                                <div className="pf-point-title-row">
                                    <strong>{item.title}</strong>
                                    {item.status === 'pending' && (
                                        <span className="pf-point-status-badge pending">
                                            {t('profilePointsPending')}
                                        </span>
                                    )}
                                </div>
                                <small>{item.desc}</small>
                                <span className="pf-point-date">
                                    <i className="bi bi-clock me-1" />
                                    {new Date(item.date).toLocaleString(isEn ? 'en-US' : 'th-TH')}
                                </span>
                            </div>
                            <div className="pf-point-amount">
                                <span className={item.status === 'pending' ? 'pending' : item.type}>
                                    {item.type === 'earned' ? `+${item.points}` : `-${item.points}`}
                                </span>
                                <small>{t('profilePointsUnit')}</small>
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </div>
    )
}

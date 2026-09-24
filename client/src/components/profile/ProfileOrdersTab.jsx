import { useMemo } from 'react'
import { useLanguage } from '../../lib/LanguageContext'

const statusTranslation = {
    'รอยืนยัน': 'Pending',
    'รอครัว': 'Queued',
    'กำลังทำ': 'Cooking',
    'รอไรเดอร์': 'Finding Rider',
    'พร้อมจัดส่ง': 'Ready',
    'กำลังจัดส่ง': 'Delivering',
    'ถึงปลายทาง': 'Arrived',
    'จัดส่งเสร็จสิ้น': 'Delivered',
    'ทำเสร็จแล้ว': 'Ready',
    'เสร็จสิ้น': 'Completed',
    'ยกเลิก': 'Cancelled',
}

export function ProfileOrdersTab({
    orders,
    activityLoading,
    orderSteps,
    money,
    cancelOrder,
    cancellingOrderId,
    onOrderMore,
}) {
    const { isEn, t } = useLanguage()

    const sortedOrders = useMemo(() => {
        return [...(orders || [])].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    }, [orders])

    const translateStep = (step) => isEn ? (statusTranslation[step] || step) : step

    const translateDeliveryType = (type) => {
        const map = {
            'ให้จัดส่ง': isEn ? 'Home Delivery' : 'ให้จัดส่ง',
            'ทานที่ร้าน': isEn ? 'Dine-In' : 'ทานที่ร้าน',
            'รับเองที่ร้าน': isEn ? 'Self Pickup' : 'รับเองที่ร้าน',
            'สั่งกลับบ้าน': isEn ? 'Takeaway' : 'สั่งกลับบ้าน',
        }
        return map[type] || type
    }

    return (
        <>
            <div className="pf-content-head">
                <div>
                    <h2>{t('profileOrderHistoryTitle')}</h2>
                    <p>{t('profileOrderHistoryDesc')}</p>
                </div>
                <button onClick={onOrderMore}>{t('profileOrderMore')}</button>
            </div>
            {activityLoading && <p className="pf-muted">{t('profileLoadingOrders')}</p>}
            {!activityLoading && sortedOrders.length === 0 && <div className="pf-activity-empty">{t('noOrdersYet')}</div>}
            <div className="pf-order-list">
                {sortedOrders.map(order => {
                    const steps = orderSteps(order)
                    const currentStep = steps.indexOf(order.foodStatus)
                    return (
                        <article key={order.id} className={order.foodStatus === 'ยกเลิก' ? 'cancelled' : ''}>
                            <header>
                                <div>
                                    <small>{new Date(order.createdAt).toLocaleString(isEn ? 'en-US' : 'th-TH')}</small>
                                    <h3>{order.orderNumber || order.id}</h3>
                                </div>
                                <div>
                                    <i>{translateStep(order.foodStatus)}</i>
                                    <strong>{money(order.totalAmount)}</strong>
                                </div>
                            </header>
                            <p>
                                {translateDeliveryType(order.deliveryType)}
                                {order.deliveryScheduleType === 'ระบุเวลา' && order.scheduledAt ? ` · ${new Date(order.scheduledAt).toLocaleString(isEn ? 'en-US' : 'th-TH')}` : ''}
                                {order.promotionCode ? ` · ${t('profileCodeLabel')} ${order.promotionCode}` : ''}
                            </p>
                            <ul>
                                {order.items.map(item => (
                                    <li key={item.id}>
                                        <span>{item.productName} × {item.quantity}</span>
                                        <b>{money(item.priceAtTime * item.quantity)}</b>
                                    </li>
                                ))}
                            </ul>
                            {order.foodStatus === 'ยกเลิก' ? (
                                <div className="pf-cancelled">{t('profileOrderCancelledNotice')}</div>
                            ) : (
                                <div className="pf-tracking">
                                    {steps.map((step, index) => (
                                        <div key={step} className={index <= currentStep ? 'done' : ''}>
                                            <span>{index < currentStep ? <i className="bi bi-check-lg" /> : index + 1}</span>
                                            <small>{translateStep(step)}</small>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {order.foodStatus === 'รอยืนยัน' && !order.isPaid && (
                                <button
                                    className="pf-cancel-order"
                                    disabled={cancellingOrderId === order.id}
                                    onClick={() => cancelOrder(order)}
                                >
                                    {cancellingOrderId === order.id ? (
                                        <><i className="bi bi-arrow-repeat spin me-1" />{isEn ? 'Cancelling...' : 'กำลังยกเลิก...'}</>
                                    ) : (
                                        t('profileCancelOrder')
                                    )}
                                </button>
                            )}
                        </article>
                    )
                })}
            </div>
        </>
    )
}

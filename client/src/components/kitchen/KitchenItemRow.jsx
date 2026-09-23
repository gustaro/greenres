export function KitchenItemRow({
    item,
    orderId,
    itemLoadingKey,
    onUpdateItemStatus,
}) {
    const isReady = item.itemStatus === 'READY' || item.itemStatus === 'SERVED'
    const isCooking = item.itemStatus === 'PREPARING'
    const isWaiting = !isReady && !isCooking
    const isLoading = itemLoadingKey === `${orderId}_${item.id}`

    return (
        <li
            className="kitchen-item-row"
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderRadius: 10,
                marginBottom: 8,
                background: isReady ? '#effbdc' : isCooking ? '#eff6ff' : '#fafaf9',
                border: isReady ? '1.5px solid #9fe51f' : isCooking ? '1.5px solid #93c5fd' : '1px solid #e7e5e4',
                opacity: isReady ? 0.85 : 1,
                transition: 'all 0.2s ease',
            }}
        >
            <div style={{ flex: 1, minWidth: 0, marginRight: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: isReady ? '#075c1b' : '#17351f' }}>
                        {item.productName || item.displayName || 'สินค้า'}
                    </span>
                    {item.isTakeaway && (
                        <span style={{ fontSize: 10, fontWeight: 800, background: '#fef3c7', color: '#92400e', padding: '1px 6px', borderRadius: 6 }}>
                            <i className="bi bi-bag me-1" />กลับบ้าน
                        </span>
                    )}
                    {item.isAddedLater && (
                        <span style={{ fontSize: 10, fontWeight: 800, background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5', padding: '1px 6px', borderRadius: 6 }}>
                            <i className="bi bi-fire me-1 text-danger" />สั่งเพิ่ม รอบ {item.roundNumber || 2}
                        </span>
                    )}
                </div>

                {item.cleanNote && (
                    <small style={{ color: '#b45309', fontWeight: 600, fontSize: 11, display: 'block', marginTop: 2 }}>
                        <i className="bi bi-chat-left-dots me-1"></i> {item.cleanNote}
                    </small>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: isReady ? '#075c1b' : isCooking ? '#1d4ed8' : '#b45309' }}>
                        {isReady ? <><i className="bi bi-check-circle-fill text-success me-1" />พร้อมเสิร์ฟแล้ว</> : isCooking ? <><i className="bi bi-fire text-primary me-1" />กำลังปรุง</> : <><i className="bi bi-hourglass-split me-1" />รอทำ</>}
                    </span>
                </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <span style={{
                    fontSize: 14,
                    fontWeight: 800,
                    background: isReady ? '#effbdc' : isCooking ? '#dbeafe' : '#f5f5f4',
                    color: isReady ? '#075c1b' : isCooking ? '#1e40af' : '#292524',
                    padding: '3px 10px',
                    borderRadius: 12,
                    minWidth: 38,
                    textAlign: 'center',
                }}>
                    ×{item.quantity}
                </span>

                {isWaiting && (
                    <div style={{ display: 'flex', gap: 4 }}>
                        <button
                            type="button"
                            disabled={isLoading}
                            onClick={() => onUpdateItemStatus(orderId, item.id, 'PREPARING')}
                            title="เริ่มทำเมนูนี้"
                            style={{
                                padding: '6px 10px',
                                fontSize: 11,
                                fontWeight: 700,
                                background: '#3b82f6',
                                color: '#fff',
                                border: 'none',
                                borderRadius: 6,
                                cursor: 'pointer',
                            }}
                        >
                            {isLoading ? <i className="bi bi-arrow-repeat spin" /> : <><i className="bi bi-fire"></i> ทำ</>}
                        </button>
                        <button
                            type="button"
                            disabled={isLoading}
                            onClick={() => onUpdateItemStatus(orderId, item.id, 'READY')}
                            title="เสร็จแล้ว กดส่งไปเสิร์ฟทันที"
                            style={{
                                padding: '6px 10px',
                                fontSize: 11,
                                fontWeight: 800,
                                background: 'var(--brand-primary, #12852f)',
                                color: '#fff',
                                border: 'none',
                                borderRadius: 6,
                                cursor: 'pointer',
                            }}
                        >
                            {isLoading ? <i className="bi bi-arrow-repeat spin" /> : <><i className="bi bi-send-fill"></i> กดส่ง</>}
                        </button>
                    </div>
                )}

                {isCooking && (
                    <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => onUpdateItemStatus(orderId, item.id, 'READY')}
                        title="เสร็จแล้ว กดส่งไปเสิร์ฟทันที"
                        style={{
                            padding: '6px 12px',
                            fontSize: 12,
                            fontWeight: 800,
                            background: 'var(--brand-primary, #12852f)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 6,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                        }}
                    >
                        {isLoading ? <><i className="bi bi-arrow-repeat spin" /> กำลังส่ง...</> : <><i className="bi bi-send-fill"></i> กดส่งรายการนี้</>}
                    </button>
                )}

                {isReady && (
                    <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => onUpdateItemStatus(orderId, item.id, 'PREPARING')}
                        title="คลิกเพื่อยกเลิกสถานะเสิร์ฟ (กลับไปทำใหม่)"
                        style={{
                            padding: '4px 8px',
                            fontSize: 10,
                            fontWeight: 600,
                            background: '#d8e7d2',
                            color: '#6d7b6e',
                            border: 'none',
                            borderRadius: 4,
                            cursor: 'pointer',
                        }}
                    >
                        {isLoading ? <i className="bi bi-arrow-repeat spin" /> : 'ย้อนกลับ'}
                    </button>
                )}
            </div>
        </li>
    )
}

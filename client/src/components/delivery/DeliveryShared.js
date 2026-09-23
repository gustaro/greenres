export const DELIVERY_FLOW = {
    PENDING: ['ASSIGNED', 'รับงาน', 'bi-clipboard-check'],
    ASSIGNED: ['PICKED_UP', 'รับอาหารแล้ว', 'bi-bag-check'],
    PICKED_UP: ['ON_THE_WAY', 'เริ่มเดินทาง', 'bi-bicycle'],
    ON_THE_WAY: ['ARRIVED', 'ถึงปลายทาง', 'bi-geo-alt'],
    ARRIVED: ['DELIVERED', 'ส่งมอบสำเร็จ', 'bi-house-check'],
}

export const DELIVERY_STATUS_LABEL = {
    PENDING: 'รอรับงาน',
    ASSIGNED: 'รับงานแล้ว',
    PICKED_UP: 'รับอาหารแล้ว',
    ON_THE_WAY: 'กำลังส่ง',
    ARRIVED: 'ถึงที่แล้ว',
    DELIVERED: 'ส่งสำเร็จ',
    FAILED: 'ส่งไม่สำเร็จ',
    CANCELLED: 'ยกเลิก',
}

export const DELIVERY_STATUS_CLASS = {
    PENDING: 'pending',
    ASSIGNED: 'pending',
    PICKED_UP: 'shipping',
    ON_THE_WAY: 'shipping',
    ARRIVED: 'shipping',
    DELIVERED: 'paid',
    FAILED: 'blocked',
    CANCELLED: 'blocked',
}

export const normalizeJob = raw => {
    const order = raw.order || {}
    return {
        id: raw.id,
        deliveryId: raw.id,
        orderId: raw.orderId ?? order.id,
        orderNumber: order.orderNumber ?? raw.orderNumber ?? raw.id,
        status: raw.status,
        serverDeliveryStatus: raw.status,
        foodStatus: DELIVERY_STATUS_LABEL[raw.status] ?? raw.status,
        deliveryAddress: raw.dropAddress ?? order.deliveryAddress ?? '',
        provider: raw.provider ?? 'INTERNAL',
        estimatedMinutes: raw.estimatedMinutes,
        totalAmount: order.totalAmount ?? raw.totalAmount ?? 0,
        paymentMethod: order.paymentMethod ?? raw.paymentMethod ?? '',
        isPaid: order.isPaid ?? raw.isPaid ?? false,
        customerName: order.user?.name ?? order.customerId ?? 'ลูกค้า',
        customerPhone: order.user?.phone ?? order.customerPhone ?? '',
        items: (order.items ?? []).map(item => ({
            id: item.id,
            productName: item.product?.name ?? item.productName ?? 'สินค้า',
            quantity: item.quantity,
            priceAtTime: item.priceAtTime ?? item.unitPrice ?? 0,
        })),
        riderName: raw.rider?.user?.name ?? '',
        riderPhone: raw.rider?.user?.phone ?? '',
        order,
    }
}

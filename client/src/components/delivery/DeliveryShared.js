import { extractCoordinates, cleanAddressText } from '../../lib/geo'

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
    const order = raw.order || raw || {}
    let meta = order.meta || {}
    if (!order.meta && order.notes && order.notes.includes('LIMELEAF_META:')) {
        try {
            meta = JSON.parse(order.notes.slice(order.notes.indexOf('LIMELEAF_META:') + 14))
        } catch (_) {}
    }

    const rawDeliveryAddress = raw.deliveryAddress || raw.dropAddress || meta.deliveryAddress || order.deliveryAddress || order.dropAddress || order.address?.street || ''
    const coords = extractCoordinates(rawDeliveryAddress, { ...order, ...raw, ...meta })
    const dropLat = raw.dropLat ?? order.dropLat ?? meta.dropLat ?? coords?.lat ?? null
    const dropLng = raw.dropLng ?? order.dropLng ?? meta.dropLng ?? coords?.lng ?? null
    const deliveryAddress = cleanAddressText(rawDeliveryAddress)
    const customerName = raw.customerName || order.customerName || meta.recipientName || order.user?.name || order.customerId || 'ลูกค้า'
    const customerPhone = raw.customerPhone || order.customerPhone || meta.recipientPhone || order.user?.phone || ''
    const rawItems = (raw.items && raw.items.length > 0) ? raw.items : (order.items && order.items.length > 0) ? order.items : []
    const isPaid = raw.isPaid ?? order.isPaid ?? (order.paymentStatus === 'PAID') ?? false
    const totalAmount = raw.totalAmount ?? order.totalAmount ?? order.total ?? raw.total ?? 0
    const paymentMethod = raw.paymentMethod ?? meta.paymentMethodDetail ?? meta.paymentMethod ?? order.paymentMethod ?? ''

    return {
        id: raw.id,
        deliveryId: raw.id,
        orderId: raw.orderId ?? order.id,
        orderNumber: order.orderNumber ?? raw.orderNumber ?? raw.id,
        status: raw.status,
        serverDeliveryStatus: raw.status,
        foodStatus: DELIVERY_STATUS_LABEL[raw.status] ?? raw.status,
        deliveryAddress,
        dropAddress: deliveryAddress,
        dropLat: dropLat != null ? Number(dropLat) : null,
        dropLng: dropLng != null ? Number(dropLng) : null,
        provider: raw.provider ?? 'INTERNAL',
        estimatedMinutes: raw.estimatedMinutes ?? order.estimatedMinutes,
        totalAmount,
        paymentMethod,
        isPaid,
        customerName,
        customerPhone,
        items: rawItems.map(item => ({
            id: item.id,
            productName: item.productName ?? item.product?.name ?? 'สินค้า',
            quantity: item.quantity,
            priceAtTime: item.priceAtTime ?? item.unitPrice ?? 0,
        })),
        riderName: raw.rider?.user?.name ?? raw.riderName ?? '',
        riderPhone: raw.rider?.user?.phone ?? raw.riderPhone ?? '',
        proofImageUrl: raw.proofImageUrl ?? order.proofImageUrl ?? meta.proofImageUrl ?? null,
        paymentProofUrl: raw.paymentProofUrl ?? order.paymentProofUrl ?? meta.paymentProofUrl ?? meta.slipUrl ?? null,
        order: { ...order, meta: { ...meta, ...order.meta } },
    }
}

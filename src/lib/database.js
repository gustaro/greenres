import { api, ApiError, hasSessionToken } from './api'

const roleMap = {
    CUSTOMER: 'customer',
    STAFF: 'cashier',
    KITCHEN: 'kitchen',
    RIDER: 'delivery',
    ADMIN: 'admin',
}

const serverRoleMap = {
    customer: 'CUSTOMER',
    cashier: 'STAFF',
    kitchen: 'KITCHEN',
    admin: 'ADMIN',
}

const PROMO_META_PREFIX = 'LIMELEAF_PROMO:'
const ORDER_META_PREFIX = 'LIMELEAF_META:'

const readJsonMeta = (value, prefix) => {
    if (!value?.startsWith(prefix)) return null
    try { return JSON.parse(value.slice(prefix.length)) } catch { return null }
}

const readOrderMeta = notes => readJsonMeta(notes, ORDER_META_PREFIX) || { note: notes || '' }

const normalizeAddress = address => {
    if (!address) return ''
    return [address.street, address.city, address.state, address.zip].filter(Boolean).join(', ')
}

const statusLabel = (status, deliveryType) => {
    if (status === 'PENDING') return 'รอยืนยัน'
    if (status === 'CONFIRMED') return 'รอครัว'
    if (status === 'PREPARING') return 'กำลังทำ'
    if (status === 'READY') return deliveryType === 'ให้จัดส่ง' ? 'พร้อมจัดส่ง' : 'ทำเสร็จแล้ว'
    if (status === 'DELIVERING') return 'กำลังจัดส่ง'
    if (status === 'DELIVERED') return deliveryType === 'ให้จัดส่ง' ? 'จัดส่งเสร็จสิ้น' : 'เสร็จสิ้น'
    if (status === 'CANCELLED') return 'ยกเลิก'
    return status || 'ไม่ทราบสถานะ'
}

const deliveryStatusLabel = status => ({
    PENDING: 'รอไรเดอร์',
    ASSIGNED: 'พร้อมจัดส่ง',
    PICKED_UP: 'กำลังจัดส่ง',
    ON_THE_WAY: 'กำลังจัดส่ง',
    ARRIVED: 'ถึงปลายทาง',
    DELIVERED: 'จัดส่งเสร็จสิ้น',
    FAILED: 'จัดส่งไม่สำเร็จ',
    CANCELLED: 'ยกเลิกการจัดส่ง',
})[status] || status || 'ไม่ทราบสถานะ'

const paymentLabel = (method, deliveryType) => {
    if (method === 'STRIPE') return 'บัตรเครดิต/เดบิต'
    if (deliveryType === 'ให้จัดส่ง') return 'ชำระเงินปลายทาง'
    if (deliveryType === 'ทานที่ร้าน') return 'ชำระที่ร้าน'
    return 'เงินสด'
}

export const mapUser = user => user ? ({
    ...user,
    role: roleMap[user.role] || String(user.role || '').toLowerCase(),
    serverRole: user.role,
    status: user.isActive ? 'active' : 'unable',
    points: Number(user.points || 0),
}) : null

export const mapCategory = row => ({
    ...row,
    sortOrder: Number(row.sortOrder || 0),
    sort_order: Number(row.sortOrder || 0),
})

export const mapProduct = row => ({
    id: row.id,
    categoryId: row.categoryId,
    name: row.name,
    en: row.description || '',
    price: Number(row.price),
    img: row.imageUrl || '/assets/basil-rice.png',
    imageUrl: row.imageUrl,
    status: !row.isActive ? 'หมด' : Number(row.stock) <= 0 ? 'หมด' : row.inventory && Number(row.inventory.quantity) <= 0 ? 'วัตถุดิ้ ไม่เพียงพอ' : Number(row.stock) <= (row.inventory?.lowThreshold || 10) ? 'เหลือน้อย' : 'มี',
    stock: Number(row.stock || 0),
    isActive: row.isActive,
    isFeatured: row.isFeatured,
    prepTime: row.prepTime,
})

const promoMetaFromRow = row => {
    if (row.metadata && typeof row.metadata === 'object') return row.metadata
    const meta = readJsonMeta(row.description, PROMO_META_PREFIX)
    if (meta) return meta
    return { title: row.code, description: row.description || '' }
}

export const mapPromotion = row => {
    const meta = promoMetaFromRow(row)
    return {
        id: row.id,
        code: row.code,
        title: meta.title || row.code,
        description: meta.description || '',
        discountType: row.discountType,
        discountValue: Number(row.discountValue),
        imageUrl: meta.imageUrl || '/assets/basil-rice.png',
        buttonLabel: meta.buttonLabel || 'ดูเมนู',
        buttonLink: meta.buttonLink || '/order',
        isActive: row.isActive,
        expiresAt: row.expiresAt,
        minOrderAmount: row.minOrderAmount == null ? null : Number(row.minOrderAmount),
        maxDiscount: row.maxDiscount == null ? null : Number(row.maxDiscount),
        usageLimit: row.usageLimit,
        usedCount: row.usedCount,
    }
}

const serializePromotion = data => {
    if (data instanceof FormData) return data
    const payload = { ...data }
    if (payload.discountType === 'PERCENTAGE') payload.discountType = 'PERCENT'
    return payload
}

export const mapOrder = row => {
    const notes = row.notes || ''
    // Extract orderSource from [tag] prefix (e.g. "[walkin] หมายเหตุ")
    const sourceMatch = notes.match(/^\[([a-z]+)\]/)
    const orderSource = sourceMatch ? sourceMatch[1] : 'online'
    const remainingNotes = notes.replace(/^\[[a-z]+\]\s*/, '')

    const meta = readJsonMeta(remainingNotes, ORDER_META_PREFIX) || readOrderMeta(remainingNotes)
    const deliveryType = meta.deliveryType || (row.address ? 'ให้จัดส่ง' : orderSource === 'walkin' ? 'ทานที่ร้าน' : orderSource === 'takeaway' ? 'สั่งกลับบ้าน' : 'รับเองที่ร้าน')
    const address = normalizeAddress(row.address) || meta.deliveryAddress || ''
    const foodStatus = statusLabel(row.status, deliveryType)

    return {
        id: row.id,
        orderNumber: `#${String(row.id).slice(-8).toUpperCase()}`,
        customerId: row.user?.name || row.user?.email || row.userId,
        userId: row.userId,
        items: (row.items || []).map(item => ({
            id: item.id,
            productId: item.productId,
            productName: item.product?.name || 'สินค้า',
            quantity: Number(item.quantity),
            priceAtTime: Number(item.unitPrice),
            note: item.note || '',
        })),
        subtotal: Number(row.subtotal || 0),
        discountAmount: Number(row.discount || 0),
        promotionCode: row.coupon?.code || meta.promotionCode || null,
        deliveryFee: Number(row.deliveryFee || 0),
        totalAmount: Number(row.total || 0),
        paymentMethod: paymentLabel(row.paymentMethod, deliveryType),
        serverPaymentMethod: row.paymentMethod,
        paymentStatus: row.paymentStatus,
        isPaid: row.paymentStatus === 'PAID',
        deliveryType,
        deliveryAddress: address,
        deliveryScheduleType: meta.deliveryScheduleType,
        scheduledAt: meta.scheduledAt,
        foodStatus,
        serverStatus: row.status,
        orderSource,
        paidAt: row.paymentStatus === 'PAID' ? row.updatedAt : null,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        notes: meta.note || '',
    }
}

export const mapDelivery = row => {
    const order = row.order || {}
    const mappedOrder = mapOrder({
        ...order,
        id: order.id || row.orderId,
        items: order.items || [],
        address: order.address,
    })

    return {
        ...mappedOrder,
        id: row.id,
        status: row.status,
        deliveryId: row.id,
        orderId: row.orderId || order.id,
        orderNumber: order.id ? `#${String(order.id).slice(-8).toUpperCase()}` : `#${String(row.orderId || row.id).slice(-8).toUpperCase()}`,
        deliveryAddress: row.dropAddress || mappedOrder.deliveryAddress,
        foodStatus: deliveryStatusLabel(row.status),
        serverDeliveryStatus: row.status,
        provider: row.provider,
        rider: row.rider,
        estimatedMinutes: row.estimatedMinutes,
        deliveryFee: Number(row.deliveryFee ?? mappedOrder.deliveryFee ?? 0),
    }
}

export async function fetchCatalog(includeInactive = false) {
    const productQuery = includeInactive ? '?isActive=all&limit=100' : '?limit=100'
    const categoryQuery = includeInactive ? '?includeInactive=true' : ''
    const [categories, productResult] = await Promise.all([
        api(`/categories${categoryQuery}`),
        api(`/products${productQuery}`),
    ])
    return {
        categories: categories.map(mapCategory),
        products: productResult.products.map(mapProduct),
    }
}

export async function fetchPopularProducts(limit = 4) {
    const result = await api(`/products/top?limit=${limit}`)
    return result.products.map(mapProduct)
}

export async function fetchNewProducts(limit = 4) {
    const result = await api(`/products?sortBy=createdAt&sortOrder=desc&limit=${limit}`)
    return result.products.map(mapProduct)
}

export async function fetchMarketing() {
    try {
        const [heroSlides, coupons] = await Promise.all([
            api('/settings/hero').catch(() => []),
            hasSessionToken() ? api('/coupons').catch(() => []) : Promise.resolve([])
        ])
        const activeHero = Array.isArray(heroSlides) ? heroSlides.filter(s => s.isActive !== false) : []
        const promotions = Array.isArray(coupons) ? coupons.filter(item => item.isActive).map(mapPromotion) : []
        return { heroSlides: activeHero, promotions }
    } catch {
        return { heroSlides: [], promotions: [] }
    }
}

export async function validatePromotion(code, subtotal) {
    const normalizedCode = code.trim().toUpperCase()
    if (!normalizedCode) throw new Error('กรุณากรอกโค้ดส่วนลด')
    const result = await api('/coupons/validate', {
        method: 'POST',
        body: JSON.stringify({ code: normalizedCode, orderAmount: subtotal }),
    })
    return { ...mapPromotion(result.coupon), discount: Number(result.discount) }
}

export async function fetchOrders() {
    if (!hasSessionToken()) return []
    const result = await api('/orders?limit=100')
    return result.orders.map(mapOrder)
}

export async function fetchOrderHistory() {
    const orders = await fetchOrders()
    const deliveryOrders = orders.filter(order => order.deliveryType === 'ให้จัดส่ง' && !['ยกเลิก', 'จัดส่งเสร็จสิ้น'].includes(order.foodStatus))

    await Promise.all(deliveryOrders.map(async order => {
        try {
            const delivery = await api(`/delivery/order/${order.id}`)
            order.deliveryId = delivery.id
            order.deliveryStatus = delivery.status
            order.foodStatus = deliveryStatusLabel(delivery.status)
            order.rider = delivery.rider
        } catch (error) {
            if (!(error instanceof ApiError) || error.status !== 404) throw error
        }
    })).catch(() => { })

    return orders
}

export async function placeOrder({ cart, paymentMethod, deliveryType, deliveryAddress, deliveryAddressId, deliveryScheduleType, scheduledAt, promotionCode, recipientName, recipientPhone, itemNotes }) {
    const overrideItems = Object.entries(cart)
        .filter(([_, q]) => Number(q) > 0)
        .map(([productId, quantity]) => ({ productId, quantity: Number(quantity) }))

    let addressId = deliveryAddressId || null
    if (deliveryType === 'ให้จัดส่ง' && !addressId) {
        const address = await api('/users/addresses', {
            method: 'POST',
            body: JSON.stringify({
                label: 'Delivery',
                street: deliveryAddress,
                city: 'Bangkok',
                state: 'Bangkok',
                zip: '00000',
            }),
        })
        addressId = address.id
    }

    const notes = `${ORDER_META_PREFIX}${JSON.stringify({
        deliveryType,
        deliveryAddress,
        deliveryScheduleType,
        scheduledAt,
        promotionCode,
        recipientName,
        recipientPhone,
    })}`

    const serverPaymentMethod = paymentMethod === 'บัตรเครดิต/เดบิต' ? 'STRIPE' : 'CASH'
    const order = await api('/orders', {
        method: 'POST',
        body: JSON.stringify({
            addressId,
            couponCode: promotionCode || null,
            notes,
            paymentMethod: serverPaymentMethod,
            itemNotes,
            overrideItems,
        }),
    })

    let payment = null
    if (serverPaymentMethod === 'STRIPE') {
        payment = await api('/payments/create-intent', {
            method: 'POST',
            body: JSON.stringify({ orderId: order.id }),
        })
    }

    return { order: mapOrder(order), payment }
}

export const markOrderPaid = id => api(`/orders/${id}/payment`, {
    method: 'PUT',
    body: JSON.stringify({ paymentMethod: 'CASH' }),
})

export const cancelOwnOrder = id => api(`/orders/${id}/cancel`, { method: 'PUT', body: JSON.stringify({}) })

export const confirmOrder = id =>
    api(`/orders/${id}/status`, { method: 'PUT', body: JSON.stringify({ status: 'CONFIRMED' }) })

// Cashier places walk-in or takeaway order directly from counter
export async function placeCounterOrder({ cart, orderSource, notes, products }) {
    // Instead of doing multiple cart updates, bypass cart completely
    const overrideItems = Object.entries(cart)
        .filter(([_, q]) => Number(q) > 0)
        .map(([productId, quantity]) => ({ productId, quantity: Number(quantity) }))

    if (overrideItems.length === 0) throw new Error("Cart is empty")

    const order = await api('/orders', {
        method: 'POST',
        body: JSON.stringify({
            paymentMethod: 'CASH',
            orderSource,
            notes: notes || '',
            overrideItems
        }),
    })
    return mapOrder(order)
}

export async function updateOrder(id, changes) {
    const status = changes.status || changes.serverStatus || ({
        'รอยืนยัน': 'PENDING',
        'รอครัว': 'CONFIRMED',
        'กำลังทำ': 'PREPARING',
        'ทำเสร็จแล้ว': 'READY',
        'พร้อมจัดส่ง': 'READY',
        'กำลังจัดส่ง': 'DELIVERING',
        'จัดส่งเสร็จสิ้น': 'DELIVERED',
        'ยกเลิก': 'CANCELLED',
    })[changes.foodStatus || changes.food_status]

    if (!status) throw new Error('Server รองรับการแก้ไขออเดอร์ผ่าน endpoint นี้เฉพาะสถานะ')
    return api(`/orders/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
    })
}

export async function ensureDeliveryForOrder(order) {
    if (!order || order.deliveryType !== 'ให้จัดส่ง' || !order.deliveryAddress) return null
    try {
        return await api(`/delivery/order/${order.id}`)
    } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 404) throw error
    }

    try {
        return await api('/delivery', {
            method: 'POST',
            body: JSON.stringify({
                orderId: order.id,
                dropAddress: order.deliveryAddress,
                provider: 'INTERNAL',
            }),
        })
    } catch (error) {
        // More than one staff browser can react to the same Realtime READY event.
        // If another browser created the unique delivery first, reuse that record.
        if (error instanceof ApiError && error.status === 409) {
            return api(`/delivery/order/${order.id}`)
        }
        throw error
    }
}

export const kitchenApi = {
    queue: async () => (await api('/kitchen/queue')).map(mapOrder),
    stats: () => api('/kitchen/stats'),
    start: id => updateOrder(id, { status: 'PREPARING' }),
    ready: id => updateOrder(id, { status: 'READY' }),
}

export const deliveryApi = {
    riderProfile: () => api('/delivery/rider/me'),
    riderDeliveries: async () => (await api('/delivery/rider/me/deliveries')).map(mapDelivery),
    setRiderStatus: status => api('/delivery/rider/me/status', { method: 'PUT', body: JSON.stringify({ status }) }),
    updateRiderLocation: (lat, lng) => api('/delivery/rider/me/location', { method: 'PUT', body: JSON.stringify({ lat, lng }) }),
    updateRiderDelivery: (id, status, extra = {}) => api(`/delivery/rider/deliveries/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status, ...extra }),
    }),
    list: async () => {
        const result = await api('/delivery?limit=100')
        return result.deliveries.map(mapDelivery)
    },
    updateStatus: (id, status, extra = {}) => api(`/delivery/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status, ...extra }),
    }),
    autoAssign: id => api(`/delivery/${id}/auto`, { method: 'POST', body: JSON.stringify({}) }),
}

export const adminApi = {
    users: async () => {
        const result = await api('/users?limit=100')
        return result.users.map(mapUser)
    },
    updateUserRole: (id, role) => {
        const serverRole = serverRoleMap[role] || role
        if (!['CUSTOMER', 'STAFF', 'KITCHEN', 'ADMIN'].includes(serverRole)) {
            throw new Error('Server ปัจจุบันไม่อนุญาตให้ Admin กำหนด role นี้ผ่าน API')
        }
        return api(`/users/${id}/role`, { method: 'PUT', body: JSON.stringify({ role: serverRole }) })
    },
    updateUserStatus: (id, isActive) => api(`/users/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ isActive: isActive === true || isActive === 'true' }),
    }),
    deleteUser: id => api(`/users/${id}`, { method: 'DELETE' }),
    createUser: data => api('/users', { method: 'POST', body: JSON.stringify(data) }),
    coupons: async () => (await api('/coupons')).map(mapPromotion),
    createCoupon: async data => mapPromotion(await api('/coupons', { method: 'POST', body: requestBody(serializePromotion(data)) })),
    updateCoupon: async (id, data) => mapPromotion(await api(`/coupons/${id}`, { method: 'PUT', body: requestBody(serializePromotion(data)) })),
    deleteCoupon: id => api(`/coupons/${id}`, { method: 'DELETE' }),
    inventory: () => api('/inventory'),
    updateInventory: (productId, data) => api(`/inventory/${productId}`, { method: 'PUT', body: JSON.stringify(data) }),
    overview: () => api('/dashboard/overview'),
    topProducts: () => api('/dashboard/top-products'),
}

const requestBody = data => data instanceof FormData ? data : JSON.stringify(data)

export const catalogApi = {
    createCategory: data => api('/categories', { method: 'POST', body: requestBody(data) }),
    updateCategory: (id, data) => api(`/categories/${id}`, { method: 'PUT', body: requestBody(data) }),
    deleteCategory: id => api(`/categories/${id}`, { method: 'DELETE' }),
    createProduct: data => api('/products', { method: 'POST', body: requestBody(data) }),
    updateProduct: (id, data) => api(`/products/${id}`, { method: 'PUT', body: requestBody(data) }),
    deleteProduct: id => api(`/products/${id}`, { method: 'DELETE' }),
}

export const settingsApi = {
    get: () => api('/settings'),
    update: payload => api('/settings', {
        method: 'PUT',
        body: JSON.stringify(payload)
    }),
    updateLogo: file => {
        const formData = new FormData()
        formData.append('image', file)
        return api('/settings/logo', {
            method: 'POST',
            body: formData,
        })
    }
}

export const heroApi = {
    list: () => api('/settings/hero'),
    create: payload => api('/settings/hero', { method: 'POST', body: JSON.stringify(payload) }),
    update: (id, payload) => api(`/settings/hero/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
    remove: id => api(`/settings/hero/${id}`, { method: 'DELETE' }),
}


export { api }

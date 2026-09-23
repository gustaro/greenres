import { useEffect, useMemo, useState } from 'react'
import { fetchCatalog, placeCounterOrder, addItemsToOrder } from '../../lib/database'

export function useCashierCounter(refreshOrders, setOrders, orders = []) {
    const [counterProducts, setCounterProducts] = useState([])
    const [counterCategories, setCounterCategories] = useState([])
    const [counterCategory, setCounterCategory] = useState('all')
    const [counterCart, setCounterCart] = useState({})
    const [counterTakeawayMap, setCounterTakeawayMap] = useState({})
    const [counterSource, setCounterSource] = useState('walkin')
    const [counterCustomerName, setCounterCustomerName] = useState('')
    const [counterCustomerPhone, setCounterCustomerPhone] = useState('')
    const [counterTableNumber, setCounterTableNumber] = useState('')
    const [counterReservationTime, setCounterReservationTime] = useState('11:00 - 12:30')
    const [counterReservationGuests, setCounterReservationGuests] = useState('2')
    const [counterNote, setCounterNote] = useState('')
    const [counterLoading, setCounterLoading] = useState(false)
    const [counterNotice, setCounterNotice] = useState('')

    useEffect(() => {
        fetchCatalog().then(result => {
            setCounterProducts(result.products || [])
            setCounterCategories(result.categories || [])
        }).catch(() => { })
    }, [])

    const counterAdd = p => setCounterCart(prev => ({ ...prev, [p.id]: (prev[p.id] || 0) + 1 }))
    const counterRemove = p => setCounterCart(prev => ({ ...prev, [p.id]: Math.max(0, (prev[p.id] || 0) - 1) }))
    const counterItems = counterProducts.filter(p => counterCart[p.id] > 0)
    const counterTotal = counterItems.reduce((s, p) => s + p.price * counterCart[p.id], 0)

    const counterGroups = useMemo(() => {
        const available = counterProducts.filter(product => product.status !== 'หมด')
        const categories = [...counterCategories].sort((a, b) => (a.sortOrder ?? a.sort_order ?? 0) - (b.sortOrder ?? b.sort_order ?? 0))
        const categoryIds = new Set(categories.map(category => category.id))
        const groups = categories.map(category => ({
            id: category.id,
            name: category.name,
            products: available.filter(product => product.categoryId === category.id),
        })).filter(group => group.products.length > 0)
        const otherProducts = available.filter(product => !categoryIds.has(product.categoryId))
        if (otherProducts.length > 0) groups.push({ id: 'other', name: 'อื่น ๆ', products: otherProducts })
        return groups
    }, [counterProducts, counterCategories])

    const visibleCounterGroups = counterCategory === 'all' ? counterGroups : counterGroups.filter(group => group.id === counterCategory)

    const submitCounterOrder = async () => {
        if (counterItems.length === 0) return window.alert('กรุณาเลือกสินค้าก่อน')
        if (counterSource === 'walkin' && !counterTableNumber.trim()) return window.alert('กรุณากรอกเบอร์โต๊ะสำหรับออเดอร์ทานที่ร้าน')
        if (counterSource === 'reservation' && !counterCustomerName.trim()) return window.alert('กรุณากรอกชื่อลูกค้าสำหรับการจองโต๊ะ')
        setCounterLoading(true)

        const itemNotes = {}
        counterItems.forEach(p => {
            if (counterTakeawayMap[p.id]) itemNotes[p.id] = '[กลับบ้าน]'
        })

        try {
            const tableNum = counterTableNumber.trim()
            // Check if this table already has an active order waiting for delivery or payment
            const existingTableOrder = counterSource === 'walkin' ? (orders || []).find(o =>
                o.deliveryType === 'ทานที่ร้าน' &&
                String(o.tableNumber || '').trim() === tableNum &&
                o.serverStatus !== 'CANCELLED' &&
                !o.isPaid
            ) : null

            if (existingTableOrder) {
                // Send ONLY the newly added items into the kitchen queue for this table
                const extraItems = Object.entries(counterCart)
                    .filter(([_, q]) => Number(q) > 0)
                    .map(([productId, quantity]) => ({ productId, quantity: Number(quantity) }))

                await addItemsToOrder(existingTableOrder.id, { items: extraItems, itemNotes })
                setCounterNotice(`ส่งเฉพาะเมนูสั่งเพิ่มเข้าครัว โต๊ะ ${tableNum} เรียบร้อย (รวมบิลเดิม)`)
            } else {
                const createdOrder = await placeCounterOrder({
                    cart: counterCart,
                    orderSource: counterSource === 'reservation' ? 'walkin' : counterSource,
                    notes: counterNote,
                    customerName: counterCustomerName,
                    tableNumber: counterTableNumber,
                    customerPhone: counterCustomerPhone,
                    reservationTime: counterSource === 'reservation' ? counterReservationTime : null,
                    reservationGuests: counterSource === 'reservation' ? Number(counterReservationGuests) : null,
                    itemNotes,
                })
                setOrders(current => [createdOrder, ...current.filter(order => order.id !== createdOrder.id)])
                setCounterNotice('ส่งออเดอร์เข้าครัวเรียบร้อย')
            }

            setCounterCart({})
            setCounterTakeawayMap({})
            setCounterCustomerName('')
            setCounterCustomerPhone('')
            setCounterTableNumber('')
            setCounterNote('')
            window.setTimeout(() => setCounterNotice(''), 3000)
            refreshOrders?.()
        } catch (error) {
            window.alert('เกิดข้อผิดพลาด: ' + error.message)
        } finally {
            setCounterLoading(false)
        }
    }

    return {
        counterProducts,
        counterCategory, setCounterCategory,
        counterCart, setCounterCart,
        counterTakeawayMap, setCounterTakeawayMap,
        counterSource, setCounterSource,
        counterCustomerName, setCounterCustomerName,
        counterCustomerPhone, setCounterCustomerPhone,
        counterTableNumber, setCounterTableNumber,
        counterReservationTime, setCounterReservationTime,
        counterReservationGuests, setCounterReservationGuests,
        counterNote, setCounterNote,
        counterLoading,
        counterNotice,
        counterAdd, counterRemove, counterItems, counterTotal,
        counterGroups, visibleCounterGroups,
        submitCounterOrder,
    }
}

import { useState } from 'react'
import { kitchenApi } from '../../lib/database'

export function useKitchenItemActions({ setQueue, setOrders, refreshData, addToast }) {
    const [itemLoadingKey, setItemLoadingKey] = useState(null)

    const updateItemStatus = async (orderId, itemId, status) => {
        const key = `${orderId}_${itemId}`
        setItemLoadingKey(key)

        // Optimistic UI update
        const applyOptimistic = list => list.map(order => {
            if (order.id !== orderId) return order
            const updatedItems = (order.items || []).map(item => {
                if (item.id !== itemId) return item
                return { ...item, itemStatus: status }
            })
            const allReady = updatedItems.length > 0 && updatedItems.every(i => i.itemStatus === 'READY' || i.itemStatus === 'SERVED')
            const anyPreparingOrReady = updatedItems.some(i => i.itemStatus === 'PREPARING' || i.itemStatus === 'READY' || i.itemStatus === 'SERVED')
            const nextServerStatus = allReady ? 'READY' : (anyPreparingOrReady && order.serverStatus === 'CONFIRMED' ? 'PREPARING' : order.serverStatus)

            return {
                ...order,
                serverStatus: nextServerStatus,
                foodStatus: allReady ? 'พร้อมเสิร์ฟ' : (nextServerStatus === 'PREPARING' ? 'กำลังทำ' : order.foodStatus),
                items: updatedItems,
            }
        })

        setQueue?.(applyOptimistic)
        setOrders?.(applyOptimistic)

        try {
            const updatedOrder = await kitchenApi.updateItemStatus(orderId, itemId, status)
            if (updatedOrder) {
                setQueue?.(list => list.map(o => o.id === orderId ? updatedOrder : o))
                setOrders?.(list => list.map(o => o.id === orderId ? updatedOrder : o))
            }
            if (status === 'READY') {
                const targetItem = updatedOrder?.items?.find(i => i.id === itemId)
                const itemName = targetItem?.productName || 'รายการอาหาร'
                const tableText = updatedOrder?.deliveryType === 'ทานที่ร้าน' && updatedOrder?.tableNumber ? `โต๊ะ ${updatedOrder.tableNumber}` : updatedOrder?.deliveryType || ''
                addToast?.({
                    type: 'success',
                    title: 'ส่งเมนูเรียบร้อย!',
                    meta: tableText,
                    message: `${itemName} ปรุงเสร็จแล้ว ส่งให้พนักงานนำไปเสิร์ฟ`,
                    duration: 3500,
                })
            }
            refreshData?.(true)
        } catch (error) {
            window.alert('เกิดข้อผิดพลาดในการอัปเดตสถานะเมนู: ' + error.message)
            refreshData?.(true)
        } finally {
            setItemLoadingKey(null)
        }
    }

    const dispatchAllRemaining = async (order) => {
        const activeItems = (order.items || []).filter(i => i.itemStatus !== 'READY' && i.itemStatus !== 'SERVED')
        if (activeItems.length === 0) return

        const orderId = order.id
        setItemLoadingKey(`${orderId}_all`)

        // Optimistic UI update
        const applyOptimistic = list => list.map(o => {
            if (o.id !== orderId) return o
            const updatedItems = (o.items || []).map(item => ({ ...item, itemStatus: 'READY' }))
            return {
                ...o,
                serverStatus: 'READY',
                foodStatus: o.deliveryType === 'ให้จัดส่ง' ? 'พร้อมจัดส่ง' : 'พร้อมเสิร์ฟ',
                items: updatedItems,
            }
        })

        setQueue?.(applyOptimistic)
        setOrders?.(applyOptimistic)

        try {
            const itemIds = activeItems.map(i => i.id)
            const updatedOrder = await kitchenApi.dispatchAllItems(orderId, itemIds)
            if (updatedOrder) {
                setQueue?.(list => list.map(o => o.id === orderId ? updatedOrder : o))
                setOrders?.(list => list.map(o => o.id === orderId ? updatedOrder : o))
            }
            const tableText = order.deliveryType === 'ทานที่ร้าน' && order.tableNumber ? `โต๊ะ ${order.tableNumber}` : order.deliveryType || ''
            addToast?.({
                type: 'success',
                title: 'ส่งครบทุกรายการแล้ว!',
                meta: tableText,
                message: `ออเดอร์พร้อมเสิร์ฟครบทุกรายการ (${activeItems.length} รายการที่เหลือ)`,
                duration: 4000,
            })
            refreshData?.(true)
        } catch (error) {
            window.alert('เกิดข้อผิดพลาดในการส่งทุกรายการ: ' + error.message)
            refreshData?.(true)
        } finally {
            setItemLoadingKey(null)
        }
    }

    return {
        itemLoadingKey,
        updateItemStatus,
        dispatchAllRemaining,
    }
}

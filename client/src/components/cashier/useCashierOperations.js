import { useState } from 'react'
import { updateOrderMeta, markOrderPaid, addItemsToOrder } from '../../lib/database'
import { money, orderCode } from '../StaffShared'
import { playNotificationChime } from '../ToastNotification'

export function useCashierOperations({ setOrders, refreshOrders, addToast, counterProducts }) {
    // Modal states
    const [moveTableOrder, setMoveTableOrder] = useState(null)
    const [newTableInput, setNewTableInput] = useState('')
    const [movingTableLoading, setMovingTableLoading] = useState(false)

    const [addItemsOrder, setAddItemsOrder] = useState(null)
    const [addItemsCart, setAddItemsCart] = useState({})
    const [addItemsTakeawayMap, setAddItemsTakeawayMap] = useState({})
    const [addItemsCategory, setAddItemsCategory] = useState('all')
    const [addingItemsLoading, setAddingItemsLoading] = useState(false)

    const [paymentModalOrder, setPaymentModalOrder] = useState(null)
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('CASH')
    const [cashReceived, setCashReceived] = useState('')
    const [paymentLoading, setPaymentLoading] = useState(false)

    const [switchDineInOrder, setSwitchDineInOrder] = useState(null)
    const [switchTableInput, setSwitchTableInput] = useState('')
    const [switchTableLoading, setSwitchTableLoading] = useState(false)

    const handleMoveTable = async () => {
        if (!moveTableOrder || !newTableInput.trim()) return
        setMovingTableLoading(true)
        try {
            const updatedTable = newTableInput.trim()
            await updateOrderMeta(moveTableOrder.id, moveTableOrder, { tableNumber: updatedTable })
            setOrders(prev => prev.map(o => o.id === moveTableOrder.id ? { ...o, tableNumber: updatedTable, meta: { ...o.meta, tableNumber: updatedTable } } : o))
            setMoveTableOrder(null)
            setNewTableInput('')
            refreshOrders?.()
        } catch (e) {
            window.alert('เกิดข้อผิดพลาดในการย้ายโต๊ะ: ' + e.message)
        } finally {
            setMovingTableLoading(false)
        }
    }

    const handleToggleTakeaway = async (order) => {
        const isCurrentTakeaway = order.deliveryType === 'สั่งกลับบ้าน' || order.orderSource === 'takeaway'
        if (isCurrentTakeaway) {
            setSwitchDineInOrder(order)
            setSwitchTableInput(order.tableNumber || '1')
            return
        }
        try {
            await updateOrderMeta(order.id, order, { deliveryType: 'สั่งกลับบ้าน', orderSource: 'takeaway', tableNumber: '' })
            setOrders(prev => prev.map(o => o.id === order.id ? {
                ...o,
                deliveryType: 'สั่งกลับบ้าน',
                orderSource: 'takeaway',
                tableNumber: '',
                meta: { ...o.meta, deliveryType: 'สั่งกลับบ้าน', orderSource: 'takeaway', tableNumber: '' }
            } : o))
            addToast({
                type: 'info',
                title: 'เปลี่ยนเป็นสั่งกลับบ้าน',
                orderCode: orderCode(order),
                message: 'เปลี่ยนสถานะออเดอร์เป็นสั่งกลับบ้านเรียบร้อยแล้ว',
                duration: 4000
            })
            refreshOrders?.()
        } catch (e) {
            window.alert('เกิดข้อผิดพลาด: ' + e.message)
        }
    }

    const handleConfirmSwitchDineIn = async () => {
        if (!switchDineInOrder || !switchTableInput.trim()) return
        setSwitchTableLoading(true)
        try {
            const tableNum = switchTableInput.trim()
            await updateOrderMeta(switchDineInOrder.id, switchDineInOrder, {
                deliveryType: 'ทานที่ร้าน',
                orderSource: 'walkin',
                tableNumber: tableNum
            })
            setOrders(prev => prev.map(o => o.id === switchDineInOrder.id ? {
                ...o,
                deliveryType: 'ทานที่ร้าน',
                orderSource: 'walkin',
                tableNumber: tableNum,
                meta: { ...o.meta, deliveryType: 'ทานที่ร้าน', orderSource: 'walkin', tableNumber: tableNum }
            } : o))
            addToast({
                type: 'success',
                title: 'เปลี่ยนเป็นทานที่ร้าน',
                orderCode: orderCode(switchDineInOrder),
                meta: `โต๊ะ ${tableNum}`,
                message: `ย้ายออเดอร์ไปนั่งทานที่ร้าน โต๊ะ ${tableNum} เรียบร้อยแล้ว`,
                duration: 4000
            })
            setSwitchDineInOrder(null)
            setSwitchTableInput('')
            refreshOrders?.()
        } catch (e) {
            window.alert('เกิดข้อผิดพลาด: ' + e.message)
        } finally {
            setSwitchTableLoading(false)
        }
    }

    const handleOpenPaymentModal = (order) => {
        setPaymentModalOrder(order)
        setSelectedPaymentMethod('CASH')
        setCashReceived(String(Math.ceil(order.totalAmount || 0)))
    }

    const handleConfirmPayment = async (details = {}) => {
        if (!paymentModalOrder) return
        const order = paymentModalOrder
        const total = Number(order.totalAmount) || 0

        let paymentDetail = details?.paymentDetail || 'เงินสด'
        if (selectedPaymentMethod === 'CARD') {
            if (details?.cardMode === 'manual' && details?.cardData?.maskedCard) {
                paymentDetail = `บัตรเครดิต (${details.cardData.maskedCard})`
            } else {
                paymentDetail = details?.paymentDetail || 'บัตรเครดิต (เครื่อง EDC)'
            }
        } else if (selectedPaymentMethod === 'QR') {
            paymentDetail = 'สแกนคิวอาร์ (PromptPay)'
        } else {
            paymentDetail = 'เงินสด'
            const cash = Number(cashReceived)
            if (isNaN(cash) || cash < total) {
                return window.alert(`จำนวนเงินสดที่รับมา (฿${cash || 0}) น้อยกว่ายอดที่ต้องชำระ (฿${total})`)
            }
        }

        setPaymentLoading(true)
        try {
            await markOrderPaid(order.id, selectedPaymentMethod, paymentDetail)
            setOrders(current => current.map(item => item.id === order.id ? {
                ...item,
                isPaid: true,
                paymentStatus: 'PAID',
                paymentMethod: paymentDetail,
                meta: { ...item.meta, paymentMethod: paymentDetail, paymentMethodDetail: paymentDetail }
            } : item))
            playNotificationChime()
            addToast({
                type: 'success',
                title: 'รับชำระเงินสำเร็จ!',
                orderCode: orderCode(order),
                meta: order.deliveryType === 'ทานที่ร้าน' ? `โต๊ะ ${order.tableNumber || '—'}` : order.deliveryType || 'สั่งกลับบ้าน',
                message: `รับชำระเงิน ${paymentDetail} ยอด ${money(order.totalAmount)} เรียบร้อยแล้ว`,
                duration: 6000,
            })
            setPaymentModalOrder(null)
            refreshOrders?.()
        } catch (error) {
            window.alert('เกิดข้อผิดพลาดในการชำระเงิน: ' + error.message)
        } finally {
            setPaymentLoading(false)
        }
    }

    const submitAddItems = async () => {
        if (!addItemsOrder) return
        const extraItems = Object.entries(addItemsCart)
            .filter(([_, q]) => Number(q) > 0)
            .map(([productId, quantity]) => ({ productId, quantity: Number(quantity) }))

        if (extraItems.length === 0) return window.alert('กรุณาเลือกเมนูที่ต้องการเพิ่มอย่างน้อย 1 รายการ')

        const extraNotes = {}
        extraItems.forEach(item => {
            if (addItemsTakeawayMap[item.productId]) extraNotes[item.productId] = '[กลับบ้าน]'
        })

        setAddingItemsLoading(true)
        try {
            const targetOrder = addItemsOrder
            await addItemsToOrder(targetOrder.id, { items: extraItems, itemNotes: extraNotes })
            const productLookup = new Map(counterProducts.map(p => [p.id, p]))
            const summaryList = extraItems.map(item => {
                const prod = productLookup.get(item.productId)
                const name = prod?.name || 'สินค้า'
                const isT = Boolean(addItemsTakeawayMap[item.productId])
                return `${name}${isT ? ' (กลับบ้าน)' : ''} ×${item.quantity}`
            })
            const totalAddedCount = extraItems.reduce((acc, it) => acc + it.quantity, 0)
            const code = orderCode(targetOrder)
            const metaInfo = targetOrder.deliveryType === 'ทานที่ร้าน' && targetOrder.tableNumber ? `โต๊ะ ${targetOrder.tableNumber}` : targetOrder.deliveryType || 'สั่งกลับบ้าน'

            setAddItemsOrder(null)
            setAddItemsCart({})
            setAddItemsTakeawayMap({})
            refreshOrders?.()

            playNotificationChime()
            addToast({
                type: 'new_order',
                title: 'ส่งเมนูเข้าครัวเรียบร้อย!',
                orderCode: code,
                meta: metaInfo,
                message: `เพิ่มสำเร็จ ${totalAddedCount} รายการ และส่งเข้าครัวเรียบร้อย`,
                itemsSummary: summaryList.join(', '),
                duration: 7000,
            })
        } catch (e) {
            playNotificationChime()
            addToast({
                type: 'info',
                title: 'เกิดข้อผิดพลาดในการเพิ่มเมนู',
                message: e.message,
                duration: 6000,
            })
        } finally {
            setAddingItemsLoading(false)
        }
    }

    return {
        moveTableOrder, setMoveTableOrder,
        newTableInput, setNewTableInput,
        movingTableLoading, handleMoveTable,
        addItemsOrder, setAddItemsOrder,
        addItemsCart, setAddItemsCart,
        addItemsTakeawayMap, setAddItemsTakeawayMap,
        addItemsCategory, setAddItemsCategory,
        addingItemsLoading, submitAddItems,
        paymentModalOrder, setPaymentModalOrder,
        selectedPaymentMethod, setSelectedPaymentMethod,
        cashReceived, setCashReceived,
        paymentLoading, handleOpenPaymentModal, handleConfirmPayment,
        switchDineInOrder, setSwitchDineInOrder,
        switchTableInput, setSwitchTableInput,
        switchTableLoading, handleToggleTakeaway, handleConfirmSwitchDineIn,
    }
}

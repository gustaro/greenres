import { useRef, useState } from 'react'
import { updateOrderMeta, markOrderPaid, addItemsToOrder, confirmOrder, cancelOrder, deliveryApi } from '../../lib/database'
import { money, orderCode } from '../StaffShared'
import { playNotificationChime } from '../ToastNotification'
import { selectableOptionGroups, buildCartLines, makeCartLineKey, optionIdsFromLineKey, productIdFromLineKey } from '../../lib/productOptions'
import { isProductSoldOut } from './useCashierCounter'

// Amount the cashier still has to collect (only the new balance when items were added after payment).
export const orderAmountDue = order => order.isPaid ? 0 : Number(order.amountDue ?? order.totalAmount) || 0

export function useCashierOperations({ setOrders, refreshOrders, addToast, counterProducts, refreshCounterCatalog }) {
    const paymentRequestRef = useRef(false)
    const actionRequestRef = useRef(false)
    // Modal states
    const [moveTableOrder, setMoveTableOrder] = useState(null)
    const [newTableInput, setNewTableInput] = useState('')
    const [movingTableLoading, setMovingTableLoading] = useState(false)

    const [addItemsOrder, setAddItemsOrder] = useState(null)
    const [addItemsCart, setAddItemsCart] = useState({})
    const [addItemsTakeawayMap, setAddItemsTakeawayMap] = useState({})
    const [addItemsCategory, setAddItemsCategory] = useState('all')
    const [addingItemsLoading, setAddingItemsLoading] = useState(false)
    const [addItemsOptionProduct, setAddItemsOptionProduct] = useState(null)

    const [paymentModalOrder, setPaymentModalOrder] = useState(null)
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('CASH')
    const [cashReceived, setCashReceived] = useState('')
    const [paymentLoading, setPaymentLoading] = useState(false)

    const [switchDineInOrder, setSwitchDineInOrder] = useState(null)
    const [switchTableInput, setSwitchTableInput] = useState('')
    const [switchTableLoading, setSwitchTableLoading] = useState(false)

    const [cancelModalOrder, setCancelModalOrder] = useState(null)
    const [cancelLoading, setCancelLoading] = useState(false)
    const [actionLoadingId, setActionLoadingId] = useState(null)

    // Wraps one-click order actions so double clicks never send two requests.
    const runOrderAction = async (order, action) => {
        if (actionRequestRef.current) return
        actionRequestRef.current = true
        setActionLoadingId(order.id)
        try {
            await action()
        } catch (error) {
            window.alert('เกิดข้อผิดพลาด: ' + error.message)
        } finally {
            actionRequestRef.current = false
            setActionLoadingId(null)
        }
    }

    const handleConfirmOrder = order => runOrderAction(order, async () => {
        await confirmOrder(order.id)
        setOrders(prev => prev.map(o => o.id === order.id ? { ...o, serverStatus: 'CONFIRMED', foodStatus: 'รอครัว' } : o))
        playNotificationChime()
        addToast({
            type: 'success',
            title: 'ยืนยันออเดอร์แล้ว',
            orderCode: orderCode(order),
            message: 'ส่งออเดอร์เข้าคิวครัวเรียบร้อย',
            duration: 4000,
        })
        refreshOrders?.()
    })

    // Cashier confirms the rider has collected the food; the card's button then turns grey.
    const handleRiderHandoff = order => runOrderAction(order, async () => {
        if (!order.deliveryId) throw new Error('ยังไม่มีรายการจัดส่งสำหรับออเดอร์นี้')
        await deliveryApi.updateStatus(order.deliveryId, 'PICKED_UP')
        setOrders(prev => prev.map(o => o.id === order.id ? { ...o, deliveryStatus: 'PICKED_UP', serverStatus: 'DELIVERING', foodStatus: 'กำลังจัดส่ง' } : o))
        addToast({
            type: 'success',
            title: 'ไรเดอร์รับอาหารแล้ว',
            orderCode: orderCode(order),
            message: `${order.riderName || 'ไรเดอร์'} รับออเดอร์ไปจัดส่งแล้ว`,
            duration: 4000,
        })
        refreshOrders?.()
    })

    const handleConfirmCancel = async ({ reason, refundMethod }) => {
        if (!cancelModalOrder || cancelLoading) return
        const order = cancelModalOrder
        setCancelLoading(true)
        try {
            const result = await cancelOrder(order.id, { reason, refundMethod })
            setOrders(prev => prev.map(o => o.id === order.id ? {
                ...o,
                serverStatus: 'CANCELLED',
                foodStatus: 'ยกเลิก',
                ...(result?.refund ? { isPaid: false, isRefunded: true, paymentStatus: 'REFUNDED', refund: result.refund } : {}),
            } : o))
            addToast({
                type: 'info',
                title: result?.refund ? 'ยกเลิกและคืนเงินแล้ว' : 'ยกเลิกออเดอร์แล้ว',
                orderCode: orderCode(order),
                message: result?.refund ? `${result.refund.label} ${money(result.refund.amount)} เรียบร้อย` : 'ยกเลิกออเดอร์เรียบร้อย',
                duration: 5000,
            })
            setCancelModalOrder(null)
            refreshOrders?.()
            refreshCounterCatalog?.()
        } catch (error) {
            window.alert('ยกเลิกออเดอร์ไม่สำเร็จ: ' + error.message)
        } finally {
            setCancelLoading(false)
        }
    }

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
        setCashReceived(String(Math.ceil(orderAmountDue(order))))
    }

    const handleConfirmPayment = async (details = {}) => {
        if (!paymentModalOrder || paymentRequestRef.current) return
        const order = paymentModalOrder
        const total = orderAmountDue(order)

        let paymentDetail = details?.paymentDetail || 'เงินสด'
        let stripePaymentId = null

        if (selectedPaymentMethod === 'CARD') {
            if (details?.cardMode === 'manual' && details?.cardData?.maskedCard) {
                paymentDetail = `บัตรเครดิต (${details.cardData.maskedCard})`
                stripePaymentId = details.cardData.stripePaymentId || null
            } else {
                paymentDetail = details?.paymentDetail || 'บัตรเครดิต (เครื่อง EDC)'
            }
        } else if (selectedPaymentMethod === 'QR') {
            stripePaymentId = details?.qrData?.paymentIntentId || null
            paymentDetail = details?.paymentDetail || (stripePaymentId ? `สแกนคิวอาร์ (PromptPay • Stripe ${stripePaymentId.slice(-8)})` : 'สแกนคิวอาร์ (PromptPay)')
        } else {
            paymentDetail = 'เงินสด'
            const cash = Number(cashReceived)
            if (isNaN(cash) || cash < total) {
                return window.alert(`จำนวนเงินสดที่รับมา (฿${cash || 0}) น้อยกว่ายอดที่ต้องชำระ (฿${total})`)
            }
        }

        paymentRequestRef.current = true
        setPaymentLoading(true)
        try {
            await markOrderPaid(order.id, selectedPaymentMethod, paymentDetail, stripePaymentId)
            setOrders(current => current.map(item => item.id === order.id ? {
                ...item,
                isPaid: true,
                paymentStatus: 'PAID',
                paidAmount: item.totalAmount,
                amountDue: 0,
                paymentMethod: paymentDetail,
                stripePaymentId: stripePaymentId || item.stripePaymentId,
                meta: { ...item.meta, paymentMethod: paymentDetail, paymentMethodDetail: paymentDetail, stripePaymentId: stripePaymentId || item.meta?.stripePaymentId }
            } : item))
            playNotificationChime()
            addToast({
                type: 'success',
                title: 'รับชำระเงินสำเร็จ!',
                orderCode: orderCode(order),
                meta: order.deliveryType === 'ทานที่ร้าน' ? `โต๊ะ ${order.tableNumber || '—'}` : order.deliveryType || 'สั่งกลับบ้าน',
                message: `รับชำระเงิน ${paymentDetail} ยอด ${money(total)} เรียบร้อยแล้ว`,
                duration: 6000,
            })
            setPaymentModalOrder(null)
            refreshOrders?.()
        } catch (error) {
            window.alert('เกิดข้อผิดพลาดในการชำระเงิน: ' + error.message)
        } finally {
            paymentRequestRef.current = false
            setPaymentLoading(false)
        }
    }

    const addItemsAdd = product => {
        if (isProductSoldOut(product)) return
        if (selectableOptionGroups(product).length) return setAddItemsOptionProduct(product)
        setAddItemsCart(prev => ({ ...prev, [product.id]: (prev[product.id] || 0) + 1 }))
    }

    const addItemsConfirmOption = selection => {
        if (!addItemsOptionProduct) return
        const lineKey = makeCartLineKey(addItemsOptionProduct.id, selection)
        setAddItemsCart(prev => ({ ...prev, [lineKey]: (prev[lineKey] || 0) + 1 }))
        setAddItemsOptionProduct(null)
    }

    const addItemsRemove = product => setAddItemsCart(prev => {
        const lineKey = Object.keys(prev).reverse().find(key => productIdFromLineKey(key) === product.id && Number(prev[key]) > 0)
        return lineKey ? { ...prev, [lineKey]: Math.max(0, Number(prev[lineKey]) - 1) } : prev
    })

    const submitAddItems = async () => {
        if (!addItemsOrder) return
        const extraItems = Object.entries(addItemsCart)
            .filter(([_, q]) => Number(q) > 0)
            .map(([lineKey, quantity]) => ({ lineKey, productId: productIdFromLineKey(lineKey), quantity: Number(quantity), selectedOptionIds: optionIdsFromLineKey(lineKey) }))

        if (extraItems.length === 0) return window.alert('กรุณาเลือกเมนูที่ต้องการเพิ่มอย่างน้อย 1 รายการ')

        const extraNotes = {}
        extraItems.forEach(item => {
            if (addItemsTakeawayMap[item.lineKey]) extraNotes[item.lineKey] = '[กลับบ้าน]'
        })

        setAddingItemsLoading(true)
        try {
            const targetOrder = addItemsOrder
            await addItemsToOrder(targetOrder.id, { items: extraItems, itemNotes: extraNotes })
            const productLookup = new Map(counterProducts.map(p => [p.id, p]))
            const summaryList = extraItems.map(item => {
                const prod = productLookup.get(item.productId)
                const name = prod?.name || 'สินค้า'
                const isT = Boolean(addItemsTakeawayMap[item.lineKey])
                const line = buildCartLines({ [item.lineKey]: item.quantity }, counterProducts)[0]
                const options = line?.selectedOptions?.length ? ` — ${line.selectedOptions.map(option => option.name).join(', ')}` : ''
                return `${name}${options}${isT ? ' (กลับบ้าน)' : ''} ×${item.quantity}`
            })
            const totalAddedCount = extraItems.reduce((acc, it) => acc + it.quantity, 0)
            const code = orderCode(targetOrder)
            const metaInfo = targetOrder.deliveryType === 'ทานที่ร้าน' && targetOrder.tableNumber ? `โต๊ะ ${targetOrder.tableNumber}` : targetOrder.deliveryType || 'สั่งกลับบ้าน'

            setAddItemsOrder(null)
            setAddItemsCart({})
            setAddItemsTakeawayMap({})
            refreshOrders?.()
            refreshCounterCatalog?.()

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
        addItemsOptionProduct, setAddItemsOptionProduct, addItemsAdd, addItemsRemove, addItemsConfirmOption,
        paymentModalOrder, setPaymentModalOrder,
        selectedPaymentMethod, setSelectedPaymentMethod,
        cashReceived, setCashReceived,
        paymentLoading, handleOpenPaymentModal, handleConfirmPayment,
        switchDineInOrder, setSwitchDineInOrder,
        switchTableInput, setSwitchTableInput,
        switchTableLoading, handleToggleTakeaway, handleConfirmSwitchDineIn,
        cancelModalOrder, setCancelModalOrder, cancelLoading, handleConfirmCancel,
        actionLoadingId, handleConfirmOrder, handleRiderHandoff,
    }
}

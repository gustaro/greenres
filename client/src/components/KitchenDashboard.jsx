import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api, kitchenApi } from '../lib/database'
import { StaffShell, orderCode, groupOrderItems } from './StaffShared'
import { SERVER_CHANGE_EVENT, SERVER_SYNC_KEY } from '../lib/api'
import { attachRealtimeFallback, subscribeDatabaseChanges } from '../lib/realtime'
import { ToastContainer, playNotificationChime } from './ToastNotification'
import { KitchenQueueTab } from './kitchen/KitchenQueueTab'
import { KitchenOrdersStatusTab } from './kitchen/KitchenOrdersStatusTab'
import { KitchenInventoryTab } from './kitchen/KitchenInventoryTab'
import { KitchenRecipesTab } from './kitchen/KitchenRecipesTab'

export function KitchenDashboard({ setOrders }) {
    const [tab, setTab] = useState('orders')
    const [statusFilter, setStatusFilter] = useState('active')
    const [queue, setQueue] = useState([])
    const [inventory, setInventory] = useState([])
    const [stats, setStats] = useState(null)
    const [loading, setLoading] = useState(true)
    const [actionLoadingId, setActionLoadingId] = useState(null)
    const [toasts, setToasts] = useState([])

    const loadRequestRef = useRef(null)
    const pendingTransitionsRef = useRef(new Map())
    const knownOrderIdsRef = useRef(new Map())
    const isInitialLoadRef = useRef(true)

    const dismissToast = id => setToasts(prev => prev.filter(t => t.id !== id))
    const addToast = toast => setToasts(prev => [...prev, { id: 'toast-' + Date.now() + '-' + Math.random(), ...toast }])

    const loadKitchenData = useCallback(async (silent = false) => {
        if (loadRequestRef.current) return loadRequestRef.current
        if (!silent) setLoading(true)

        const request = Promise.all([
            kitchenApi.queue(),
            kitchenApi.stats(),
        ]).then(([queueResult, statsResult]) => {
            if (!queueResult) return null

            const nonDelivered = queueResult.filter(order => order.status !== 'DELIVERED' && order.serverStatus !== 'DELIVERED')

            const reconciled = nonDelivered.map(order => {
                if (pendingTransitionsRef.current.has(order.id)) {
                    const target = pendingTransitionsRef.current.get(order.id)
                    if (target === 'DELIVERED') return null
                    return {
                        ...order,
                        serverStatus: target,
                        foodStatus: target === 'CONFIRMED' ? 'รอครัว' : target === 'PREPARING' ? 'กำลังทำ' : target === 'READY' ? (order.deliveryType === 'ให้จัดส่ง' ? 'พร้อมจัดส่ง' : 'พร้อมเสิร์ฟ') : 'ยกเลิก',
                    }
                }
                return order
            }).filter(Boolean)

            if (isInitialLoadRef.current) {
                reconciled.forEach(o => {
                    const totalQty = (o.items || []).reduce((sum, it) => sum + Number(it.quantity || 1), 0)
                    knownOrderIdsRef.current.set(o.id, totalQty)
                })
                isInitialLoadRef.current = false
            } else {
                reconciled.forEach(order => {
                    const totalQty = (order.items || []).reduce((sum, it) => sum + Number(it.quantity || 1), 0)
                    const prevQty = knownOrderIdsRef.current.get(order.id)

                    if (prevQty === undefined) {
                        knownOrderIdsRef.current.set(order.id, totalQty)
                        if (order.serverStatus === 'CONFIRMED' || order.serverStatus === 'PREPARING') {
                            const grouped = groupOrderItems(order.items)
                            const itemsSummary = grouped.map(i => `${i.displayName} ×${i.quantity}`).join(', ')
                            const metaText = order.deliveryType === 'ทานที่ร้าน' ? `โต๊ะ ${order.tableNumber || '—'}` : order.deliveryType || 'สั่งกลับบ้าน'
                            setToasts(prev => [
                                ...prev,
                                {
                                    id: 'toast-' + order.id + '-' + Date.now(),
                                    type: 'new_order',
                                    title: 'ออเดอร์ใหม่เข้าครัว!',
                                    orderCode: orderCode(order),
                                    meta: metaText,
                                    itemsSummary: itemsSummary || 'มีรายการสั่งซื้อใหม่',
                                    duration: 6500,
                                }
                            ])
                            playNotificationChime()
                        }
                    } else if (totalQty > prevQty) {
                        knownOrderIdsRef.current.set(order.id, totalQty)
                        const grouped = groupOrderItems(order.items)
                        const itemsSummary = grouped.map(i => `${i.displayName} ×${i.quantity}`).join(', ')
                        const metaText = order.deliveryType === 'ทานที่ร้าน' ? `โต๊ะ ${order.tableNumber || '—'}` : order.deliveryType || 'สั่งกลับบ้าน'
                        setToasts(prev => [
                            ...prev,
                            {
                                id: 'toast-add-' + order.id + '-' + Date.now(),
                                type: 'new_order',
                                title: 'มีเมนูสั่งเพิ่มเข้าครัว!',
                                orderCode: orderCode(order),
                                meta: metaText,
                                itemsSummary: `สั่งเพิ่ม (+${totalQty - prevQty}): ${itemsSummary}`,
                                duration: 7500,
                            }
                        ])
                        playNotificationChime()
                    }
                })
            }

            setQueue(reconciled)
            setStats(statsResult)
            return reconciled
        }).catch(error => {
            if (!silent) console.warn('โหลดข้อมูลครัวไม่สำเร็จ:', error.message)
            return null
        }).finally(() => {
            loadRequestRef.current = null
            if (!silent) setLoading(false)
        })

        loadRequestRef.current = request
        return request
    }, [])

    useEffect(() => {
        api('/inventory').then(result => setInventory(result.map(item => ({
            id: item.id,
            ingredientName: item.name || 'วัตถุดิบทั่วไป',
            ingredientNameEn: item.nameEn || '',
            categoryId: item.categoryId,
            categoryName: item.category?.name || 'อื่น ๆ',
            categorySortOrder: Number(item.category?.sortOrder || 999),
            quantity: Number(item.quantity),
            unit: item.unit || 'ชิ้น',
            lowThreshold: Number(item.lowThreshold || 0),
            recipeCount: item.recipeItems?.length || 0,
        })))).catch(() => { })

        const refresh = () => loadKitchenData(true)
        const onServerChange = event => {
            const path = event.detail?.path || ''
            if (path.startsWith('/orders') || path.startsWith('/kitchen')) refresh()
        }
        const onStorage = event => {
            if (event.key !== SERVER_SYNC_KEY || !event.newValue) return
            try {
                const change = JSON.parse(event.newValue)
                if (change.path?.startsWith('/orders') || change.path?.startsWith('/kitchen')) refresh()
            } catch { /* ignore malformed sync payload */ }
        }

        loadKitchenData()

        const unsubscribeRealtime = subscribeDatabaseChanges({
            channelName: 'limeleaf-kitchen',
            tables: ['orders', 'order_items'],
            onChange: refresh,
            onStatus: (status, error) => {
                if (status === 'SUBSCRIBED') console.info('[Realtime] Kitchen connected')
                if (error) console.warn('[Realtime] Kitchen connection error', error)
            },
        })
        const detachFallback = attachRealtimeFallback({ refresh, pollMs: 30000 })

        window.addEventListener(SERVER_CHANGE_EVENT, onServerChange)
        window.addEventListener('storage', onStorage)

        return () => {
            unsubscribeRealtime()
            detachFallback()
            window.removeEventListener(SERVER_CHANGE_EVENT, onServerChange)
            window.removeEventListener('storage', onStorage)
        }
    }, [loadKitchenData])

    const startOrder = async order => {
        setActionLoadingId(order.id)
        pendingTransitionsRef.current.set(order.id, 'PREPARING')

        setOrders(current => current.map(item => item.id === order.id ? { ...item, foodStatus: 'กำลังทำ', serverStatus: 'PREPARING' } : item))
        setQueue(current => current.map(item => item.id === order.id ? { ...item, foodStatus: 'กำลังทำ', serverStatus: 'PREPARING' } : item))

        try {
            await kitchenApi.start(order.id)
            setTimeout(() => pendingTransitionsRef.current.delete(order.id), 800)
            loadKitchenData(true)
        } catch (error) {
            pendingTransitionsRef.current.delete(order.id)
            window.alert('เกิดข้อผิดพลาดในการเริ่มทำอาหาร: ' + error.message)
            loadKitchenData(true)
        } finally {
            setActionLoadingId(null)
        }
    }

    const finishOrder = async order => {
        setActionLoadingId(order.id)
        pendingTransitionsRef.current.set(order.id, 'READY')

        const readyLabel = order.deliveryType === 'ให้จัดส่ง' ? 'พร้อมจัดส่ง' : 'พร้อมเสิร์ฟ'
        setOrders(current => current.map(item => item.id === order.id ? { ...item, foodStatus: readyLabel, serverStatus: 'READY' } : item))
        setQueue(current => current.map(item => item.id === order.id ? { ...item, foodStatus: readyLabel, serverStatus: 'READY' } : item))

        try {
            await kitchenApi.ready(order.id)
            setTimeout(() => pendingTransitionsRef.current.delete(order.id), 800)
            loadKitchenData(true)
        } catch (error) {
            pendingTransitionsRef.current.delete(order.id)
            window.alert('เกิดข้อผิดพลาดในการเปลี่ยนสถานะ: ' + error.message)
            loadKitchenData(true)
        } finally {
            setActionLoadingId(null)
        }
    }

    const cancelKitchenOrder = async order => {
        if (!window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการยกเลิกออเดอร์ ${orderCode(order)}?`)) return

        setActionLoadingId(order.id)
        pendingTransitionsRef.current.set(order.id, 'CANCELLED')

        setOrders(current => current.map(item => item.id === order.id ? { ...item, foodStatus: 'ยกเลิก', serverStatus: 'CANCELLED' } : item))
        setQueue(current => current.map(item => item.id === order.id ? { ...item, foodStatus: 'ยกเลิก', serverStatus: 'CANCELLED' } : item))

        try {
            await kitchenApi.cancel(order.id)
            setTimeout(() => pendingTransitionsRef.current.delete(order.id), 800)
            loadKitchenData(true)
        } catch (error) {
            pendingTransitionsRef.current.delete(order.id)
            window.alert('เกิดข้อผิดพลาดในการยกเลิกออเดอร์: ' + error.message)
            loadKitchenData(true)
        } finally {
            setActionLoadingId(null)
        }
    }

    const waiting = queue.filter(order => order.serverStatus === 'CONFIRMED')
    const preparing = queue.filter(order => order.serverStatus === 'PREPARING')
    const ready = queue.filter(order => order.serverStatus === 'READY')
    const cancelled = queue.filter(order => order.serverStatus === 'CANCELLED')

    const displayedOrders = useMemo(() => {
        if (statusFilter === 'CONFIRMED') return waiting
        if (statusFilter === 'PREPARING') return preparing
        if (statusFilter === 'READY') return ready
        if (statusFilter === 'CANCELLED') return cancelled
        return queue.filter(order => ['CONFIRMED', 'PREPARING', 'READY'].includes(order.serverStatus))
    }, [queue, statusFilter, waiting, preparing, ready, cancelled])

    return (
        <StaffShell
            role="kitchen"
            title="ศูนย์จัดการครัว (Kitchen Station)"
            subtitle="ติดตามคิวทำอาหารแบบเรียลไทม์และจัดการสถานะออเดอร์"
            active={tab}
            onTab={setTab}
            tabs={[
                { key: 'orders', label: 'คิวทำอาหาร', icon: 'bi-grid-1x2', count: waiting.length + preparing.length },
                { key: 'order-status', label: 'สถานะออร์เดอร์', icon: 'bi-clipboard2-check' },
                { key: 'inventory', label: 'สต๊อกวัตถุดิบ', icon: 'bi-list-check' },
                { key: 'recipes', label: 'สูตรเมนูอาหาร', icon: 'bi-journal-text' },
            ]}
        >
            {tab === 'orders' && (
                <KitchenQueueTab
                    statusFilter={statusFilter}
                    setStatusFilter={setStatusFilter}
                    waiting={waiting}
                    preparing={preparing}
                    ready={ready}
                    cancelled={cancelled}
                    queue={queue}
                    setQueue={setQueue}
                    setOrders={setOrders}
                    loadKitchenData={loadKitchenData}
                    addToast={addToast}
                    stats={stats}
                    loading={loading}
                    displayedOrders={displayedOrders}
                    actionLoadingId={actionLoadingId}
                    startOrder={startOrder}
                    finishOrder={finishOrder}
                    cancelKitchenOrder={cancelKitchenOrder}
                />
            )}

            {tab === 'order-status' && <KitchenOrdersStatusTab />}

            {tab === 'inventory' && (
                <KitchenInventoryTab
                    inventory={inventory}
                    setInventory={setInventory}
                />
            )}

            {tab === 'recipes' && (
                <KitchenRecipesTab
                    inventory={inventory}
                    setInventory={setInventory}
                />
            )}

            <ToastContainer toasts={toasts} onDismiss={dismissToast} />
        </StaffShell>
    )
}

import { useEffect, useMemo, useRef, useState } from 'react'
import { updateOrder, kitchenApi } from '../../lib/database'
import { orderCode, formatCashierPaymentMethod, formatPaymentOverview } from '../StaffShared'
import { playNotificationChime } from '../ToastNotification'
import { useCashierCounter } from './useCashierCounter'
import { useCashierOperations } from './useCashierOperations'
import { exportPdf, PDF_BASE_CSS } from '../../lib/exportPdf'

export function useCashierDashboard(orders, setOrders, refreshOrders) {
    const [tab, setTab] = useState('ready')
    const [receipt, setReceipt] = useState(null)
    const [search, setSearch] = useState('')
    const [searchField, setSearchField] = useState('all')
    const [period, setPeriod] = useState('today')

    // Toast notifications
    const [toasts, setToasts] = useState([])
    const addToast = toast => {
        const id = Date.now() + Math.random().toString(36).slice(2, 7)
        setToasts(prev => [...prev, { ...toast, id }])
    }
    const dismissToast = id => setToasts(prev => prev.filter(t => t.id !== id))

    const counter = useCashierCounter(refreshOrders, setOrders, orders)
    const ops = useCashierOperations({
        setOrders,
        refreshOrders,
        addToast,
        counterProducts: counter.counterProducts
    })

    const visibleAddItemsGroups = ops.addItemsCategory === 'all'
        ? counter.counterGroups
        : counter.counterGroups.filter(group => group.id === ops.addItemsCategory)

    const customerLabel = order => order.customerName || (order.orderSource === 'online' ? order.customerId : '') || 'ลูกค้าทั่วไป'

    const validOrders = orders.filter(order => order.foodStatus !== 'ยกเลิก')
    const unpaidOrders = validOrders.filter(order => !order.isPaid).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    const paidOrders = validOrders.filter(order => order.isPaid).sort((a, b) => new Date(b.paidAt || b.createdAt) - new Date(a.paidAt || a.createdAt))

    // An order is in readyOrders if the whole order is READY or if ANY item has been marked READY or SERVED (item-by-item dispatch from kitchen)
    const readyOrders = validOrders.filter(order => {
        if (order.deliveryType === 'ให้จัดส่ง') return false
        if (order.serverStatus === 'DELIVERED' || order.status === 'DELIVERED' || order.foodStatus === 'เสร็จสิ้น') return false

        const isOverallReady = order.serverStatus === 'READY' || order.foodStatus === 'พร้อมเสิร์ฟ' || order.foodStatus === 'ทำเสร็จแล้ว' || order.foodStatus === 'พร้อมจัดส่ง'
        const hasReadyOrServedItems = (order.items || []).some(item => item.itemStatus === 'READY' || item.itemStatus === 'SERVED')

        return isOverallReady || hasReadyOrServedItems
    }).sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))

    const serveItem = async (order, itemId) => {
        try {
            setOrders(current => current.map(item => {
                if (item.id !== order.id) return item
                return {
                    ...item,
                    items: (item.items || []).map(it => it.id === itemId ? { ...it, itemStatus: 'SERVED' } : it)
                }
            }))
            await kitchenApi.updateItemStatus(order.id, itemId, 'SERVED')
            refreshOrders?.()
        } catch (error) {
            console.error('Error marking item as served:', error)
        }
    }

    const serveAllReadyItems = async order => {
        try {
            const readyItems = (order.items || []).filter(i => i.itemStatus === 'READY')
            if (readyItems.length === 0) return
            const readyIds = readyItems.map(i => i.id)

            setOrders(current => current.map(item => {
                if (item.id !== order.id) return item
                return {
                    ...item,
                    items: (item.items || []).map(it => readyIds.includes(it.id) ? { ...it, itemStatus: 'SERVED' } : it)
                }
            }))

            const itemStatuses = {}
            readyIds.forEach(id => { itemStatuses[id] = 'SERVED' })
            await kitchenApi.batchUpdateItemStatus(order.id, itemStatuses)
            refreshOrders?.()
        } catch (error) {
            console.error('Error marking ready items as served:', error)
        }
    }

    const completeCounterOrder = async order => {
        try {
            setOrders(current => current.map(item => item.id === order.id ? { ...item, serverStatus: 'DELIVERED', status: 'DELIVERED', foodStatus: 'เสร็จสิ้น' } : item))
            const code = orderCode(order)
            setToasts(prev => prev.filter(t => t.orderNumber !== (order.orderNumber || code)))
            await updateOrder(order.id, { status: 'DELIVERED' })
            refreshOrders?.()
        } catch (error) {
            window.alert('เกิดข้อผิดพลาดในการส่งมอบ: ' + error.message)
        }
    }

    const knownReadyOrderIdsRef = useRef(null)
    useEffect(() => {
        const currentReadyIds = new Set(readyOrders.map(o => o.id))
        if (knownReadyOrderIdsRef.current === null) {
            knownReadyOrderIdsRef.current = currentReadyIds
            return
        }

        readyOrders.forEach(order => {
            if (!knownReadyOrderIdsRef.current.has(order.id)) {
                knownReadyOrderIdsRef.current.add(order.id)
                playNotificationChime()
                const code = orderCode(order)
                const tableText = order.deliveryType === 'ทานที่ร้าน' && order.tableNumber ? `โต๊ะ ${order.tableNumber}` : order.deliveryType || 'สั่งกลับบ้าน'
                addToast({
                    type: 'food_ready',
                    title: 'อาหารพร้อมเสิร์ฟ!',
                    message: `${code} · ${tableText} (${customerLabel(order)})`,
                    orderNumber: order.orderNumber || code,
                    tableNumber: order.tableNumber,
                    actionLabel: 'ส่งมอบแล้ว',
                    onAction: () => completeCounterOrder(order),
                    duration: 8000
                })
            }
        })
    }, [readyOrders])

    const normalizedSearch = search.trim().toLowerCase()
    const matchesSearch = order => {
        if (!normalizedSearch) return true
        const code = String(orderCode(order)).toLowerCase()
        const customer = String(customerLabel(order)).toLowerCase()
        const time = new Date(order.paidAt || order.createdAt).toLocaleString('th-TH').toLowerCase()
        const cashierMethod = formatCashierPaymentMethod(order.paymentMethod, order).toLowerCase()
        const overviewMethod = formatPaymentOverview(order.paymentMethod).toLowerCase()
        const channel = (String(order.paymentMethod || '') + ' ' + cashierMethod + ' ' + overviewMethod + ' ' + String(order.deliveryType || '')).toLowerCase()
        const amount = String(order.totalAmount || '')
        const table = String(order.tableNumber || '').toLowerCase()

        if (searchField === 'order') return code.includes(normalizedSearch)
        if (searchField === 'customer') return customer.includes(normalizedSearch) || table.includes(normalizedSearch)
        if (searchField === 'time') return time.includes(normalizedSearch)
        if (searchField === 'channel') return channel.includes(normalizedSearch)
        if (searchField === 'amount') return amount.includes(normalizedSearch)

        return code.includes(normalizedSearch) || customer.includes(normalizedSearch) || time.includes(normalizedSearch) || channel.includes(normalizedSearch) || amount.includes(normalizedSearch) || table.includes(normalizedSearch)
    }

    const filteredUnpaid = unpaidOrders.filter(matchesSearch)
    const filteredPaid = paidOrders.filter(matchesSearch)
    const filteredReady = readyOrders.filter(matchesSearch)

    const periodStart = new Date()
    if (period === 'today') periodStart.setHours(0, 0, 0, 0)
    if (period === '7days') { periodStart.setDate(periodStart.getDate() - 6); periodStart.setHours(0, 0, 0, 0) }
    const periodOrders = paidOrders.filter(order => period === 'all' || new Date(order.paidAt || order.updatedAt || order.createdAt) >= periodStart)
    const revenue = periodOrders.reduce((sum, order) => sum + order.totalAmount, 0)
    const paymentMethods = useMemo(() => Object.entries(periodOrders.reduce((result, order) => {
        const key = formatPaymentOverview(order.paymentMethod)
        result[key] ||= []
        result[key].push(order)
        return result
    }, {})).map(([method, methodOrders]) => ({ method, orders: methodOrders })), [periodOrders])
    const productSales = useMemo(() => {
        const result = {}
        periodOrders.forEach(order => order.items.forEach(item => {
            const name = item.productName || 'สินค้า'
            result[name] ||= { name, quantity: 0, amount: 0 }
            result[name].quantity += item.quantity
            result[name].amount += item.priceAtTime * item.quantity
        }))
        return Object.values(result).sort((a, b) => b.quantity - a.quantity)
    }, [periodOrders])

    const exportSales = () => {
        const fmt = value => `"${String(value ?? '').replaceAll('"', '""')}"`
        const row = (...cols) => cols.map(fmt).join(',')
        const blank = () => ''
        const periodLabel = period === 'today' ? 'วันนี้' : period === '7days' ? '7 วันล่าสุด' : 'ทั้งหมด'
        const exportedAt = new Date().toLocaleString('th-TH')

        const sections = []

        // ── Section 1: Header info ─────────────────────────────
        sections.push(
            row('LimeLeaf Kitchen — รายงานยอดขายแคชเชียร์'),
            row('ช่วงเวลา', periodLabel, 'ส่งออกเมื่อ', exportedAt),
            row('จำนวนบิลทั้งหมด', periodOrders.length, 'ยอดขายสุทธิ', revenue),
            blank(),
        )

        // ── Section 2: Summary by payment method ──────────────
        sections.push(
            row('── สรุปยอดแยกช่องทางชำระเงิน ──'),
            row('ช่องทาง', 'จำนวนบิล', 'ยอดรวม (บาท)'),
            ...paymentMethods.map(pm =>
                row(pm.method, pm.orders.length, pm.orders.reduce((s, o) => s + o.totalAmount, 0))
            ),
            blank(),
        )

        // ── Section 3: Top products ────────────────────────────
        sections.push(
            row('── สินค้าขายดี ──'),
            row('สินค้า', 'จำนวน (ชิ้น)', 'ยอดขาย (บาท)'),
            ...productSales.map(p => row(p.name, p.quantity, p.amount)),
            blank(),
        )

        // ── Section 4: Order details with line items ───────────
        sections.push(
            row('── รายละเอียดออเดอร์ ──'),
            row('เลขออเดอร์', 'วันที่-เวลา', 'ลูกค้า', 'โต๊ะ', 'ประเภท', 'ช่องทางชำระ', 'รายการ', 'จำนวน', 'ราคา/ชิ้น', 'ยอดย่อย', 'ยอดสุทธิออเดอร์'),
        )
        periodOrders.forEach(order => {
            const code = orderCode(order)
            const date = new Date(order.paidAt || order.createdAt).toLocaleString('th-TH')
            const customer = customerLabel(order)
            const table = order.deliveryType === 'ทานที่ร้าน' ? (order.tableNumber || '') : ''
            const items = order.items || []

            if (items.length === 0) {
                sections.push(row(code, date, customer, table, order.deliveryType, formatCashierPaymentMethod(order.paymentMethod, order), '', '', '', '', order.totalAmount))
            } else {
                items.forEach((item, index) => {
                    const itemTotal = (item.priceAtTime || 0) * (item.quantity || 1)
                    if (index === 0) {
                        sections.push(row(code, date, customer, table, order.deliveryType, formatCashierPaymentMethod(order.paymentMethod, order), item.productName || '', item.quantity, item.priceAtTime ?? '', itemTotal, order.totalAmount))
                    } else {
                        sections.push(row('', '', '', '', '', '', item.productName || '', item.quantity, item.priceAtTime ?? '', itemTotal, ''))
                    }
                })
            }
        })

        const csv = '\uFEFF' + sections.join('\n')
        const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
        const link = document.createElement('a')
        link.href = url
        link.download = `cashier-sales-${period}-${new Date().toISOString().slice(0, 10)}.csv`
        link.click()
        URL.revokeObjectURL(url)
    }

    const exportSalesPdf = () => {
        const periodLabel = period === 'today' ? 'วันนี้' : period === '7days' ? '7 วันล่าสุด' : 'ทั้งหมด'
        const exportedAt = new Date().toLocaleString('th-TH')
        const avgOrder = periodOrders.length ? Math.round(revenue / periodOrders.length) : 0

        const paymentRows = paymentMethods.map(pm => {
            const total = pm.orders.reduce((s, o) => s + o.totalAmount, 0)
            return `<tr><td>${pm.method}</td><td style="text-align:center">${pm.orders.length}</td><td class="amount">${total.toLocaleString('th-TH')} ฿</td></tr>`
        }).join('')

        const productRows = productSales.slice(0, 10).map(p =>
            `<tr><td>${p.name}</td><td style="text-align:center">${p.quantity}</td><td class="amount">${p.amount.toLocaleString('th-TH')} ฿</td></tr>`
        ).join('')

        const orderRows = periodOrders.map(order => {
            const code = orderCode(order)
            const date = new Date(order.paidAt || order.createdAt).toLocaleString('th-TH')
            const customer = customerLabel(order)
            const table = order.deliveryType === 'ทานที่ร้าน' ? (order.tableNumber ? ` (โต๊ะ ${order.tableNumber})` : '') : ''
            const cashierMethod = formatCashierPaymentMethod(order.paymentMethod, order)
            const items = (order.items || [])
            let rows = ''
            if (items.length === 0) {
                rows = `<tr><td><b>${code}</b></td><td>${date}</td><td>${customer}${table}</td><td>${order.deliveryType || ''}</td><td>${cashierMethod}</td><td></td><td class="amount">${order.totalAmount.toLocaleString('th-TH')} ฿</td></tr>`
            } else {
                items.forEach((item, i) => {
                    const itemTotal = ((item.priceAtTime || 0) * (item.quantity || 1)).toLocaleString('th-TH')
                    if (i === 0) {
                        rows += `<tr><td><b>${code}</b></td><td>${date}</td><td>${customer}${table}</td><td>${order.deliveryType || ''}</td><td>${cashierMethod}</td><td>${item.productName || ''} ×${item.quantity} (${itemTotal} ฿)</td><td class="amount">${order.totalAmount.toLocaleString('th-TH')} ฿</td></tr>`
                    } else {
                        rows += `<tr class="continuation"><td></td><td></td><td></td><td></td><td></td><td>${item.productName || ''} ×${item.quantity} (${itemTotal} ฿)</td><td></td></tr>`
                    }
                })
            }
            return rows
        }).join('')

        const html = `<!DOCTYPE html><html lang="th"><head><meta charset="utf-8">
        <title>LimeLeaf Cashier Report ${new Date().toISOString().slice(0, 10)}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;700;900&display=swap" rel="stylesheet">
        <style>${PDF_BASE_CSS}</style></head><body>
        <div class="header">
            <div class="header-brand">
                <span class="brand-dot"></span>
                <div><span class="brand-name">LimeLeaf Kitchen</span><span class="brand-sub">CASHIER REPORT · ${periodLabel.toUpperCase()}</span></div>
            </div>
            <div class="header-meta">
                <div>ส่งออกเมื่อ: ${exportedAt}</div>
                <div>ช่วงเวลา: ${periodLabel} · ${periodOrders.length} บิล</div>
            </div>
        </div>
        <div class="stat-row">
            <div class="stat-box"><small>ยอดขายสุทธิ</small><strong>${revenue.toLocaleString('th-TH')} ฿</strong></div>
            <div class="stat-box"><small>จำนวนบิล</small><strong>${periodOrders.length}</strong></div>
            <div class="stat-box"><small>ยอดเฉลี่ยต่อบิล</small><strong>${avgOrder.toLocaleString('th-TH')} ฿</strong></div>
        </div>
        <div class="summary-table">
            <div>
                <div class="section-title">ช่องทางชำระเงิน</div>
                <table><thead><tr><th>ช่องทาง</th><th>บิล</th><th>ยอดรวม</th></tr></thead>
                <tbody>${paymentRows}</tbody></table>
            </div>
            <div>
                <div class="section-title">สินค้าขายดี (Top 10)</div>
                <table><thead><tr><th>สินค้า</th><th>จำนวน</th><th>ยอดขาย</th></tr></thead>
                <tbody>${productRows}</tbody></table>
            </div>
        </div>
        <h2>รายละเอียดออเดอร์ (${periodOrders.length} รายการ)</h2>
        <table><thead><tr><th>เลขออเดอร์</th><th>วันที่-เวลา</th><th>ลูกค้า</th><th>ประเภท</th><th>ช่องทางชำระ</th><th>รายการ</th><th>ยอด</th></tr></thead>
        <tbody>${orderRows}</tbody></table>
        <div class="footer">LimeLeaf Kitchen · Cashier Report · ${periodLabel} · ${exportedAt}</div>
        </body></html>`

        exportPdf(html)
    }

    return {
        tab, setTab,
        receipt, setReceipt,
        search, setSearch,
        searchField, setSearchField,
        period, setPeriod,
        toasts, dismissToast,
        ...counter,
        ...ops,
        visibleAddItemsGroups,
        completeCounterOrder, customerLabel,
        serveItem, serveAllReadyItems,
        filteredUnpaid, filteredPaid, filteredReady,
        revenue, periodOrders, paymentMethods, productSales, exportSales, exportSalesPdf,
    }
}

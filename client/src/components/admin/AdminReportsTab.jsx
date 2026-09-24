import { useMemo } from 'react'
import { PageHead, money, formatPaymentOverview, formatCashierPaymentMethod } from './AdminShared'
import { exportPdf, PDF_BASE_CSS } from '../../lib/exportPdf'

export function AdminReportsTab({ orders, paidOrders, revenue, averageOrder, productSales, products, notify }) {
    const maxSold = Math.max(...productSales.map(product => product.sold), 1)

    // Group payment methods into clean overview categories (e.g. "จ่ายด้วย QR", "เงินสด", etc.)
    const paymentMethodsSummary = useMemo(() => {
        const map = {}
        orders.forEach(order => {
            const method = formatPaymentOverview(order.paymentMethod)
            map[method] = (map[method] || 0) + 1
        })
        const total = Math.max(orders.length, 1)
        return Object.entries(map).map(([method, count]) => ({
            method,
            count,
            percent: (count / total) * 100,
        })).sort((a, b) => b.count - a.count)
    }, [orders])

    // Weekly sales: group paid orders by weekday for the current week
    const DAYS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']
    const weeklyRevenue = [0, 0, 0, 0, 0, 0, 0]
    const weeklyCount = [0, 0, 0, 0, 0, 0, 0]
    const now = new Date()
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay()) // Sunday
    startOfWeek.setHours(0, 0, 0, 0)
    paidOrders.forEach(order => {
        const d = new Date(order.createdAt)
        if (d >= startOfWeek) {
            const dow = d.getDay()
            weeklyRevenue[dow] += order.totalAmount
            weeklyCount[dow]++
        }
    })
    const maxWeekly = Math.max(...weeklyRevenue, 1)
    const totalWeek = weeklyRevenue.reduce((s, v) => s + v, 0)

    const exportReport = () => {
        const sourceLabel = s => s === 'online' ? 'ออนไลน์' : s === 'walkin' ? 'ทานที่ร้าน' : s === 'takeaway' ? 'สั่งกลับบ้าน' : s || '-'
        const fmt = v => `"${String(v ?? '').replaceAll('"', '""')}"`

        const header = [
            'เลขออเดอร์', 'วันที่', 'เวลา',
            'ช่องทางการสั่ง', 'ลูกค้า',
            'รายการสินค้า', 'จำนวนรายการ',
            'วิธีชำระเงิน', 'โค้ดส่วนลด', 'ส่วนลด (฿)',
            'ยอดรวม (฿)', 'ชำระแล้ว',
            'สถานะอาหาร', 'ประเภทจัดส่ง',
        ]

        const dataRows = orders.map(order => {
            const d = new Date(order.createdAt)
            const date = d.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' })
            const time = d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
            const itemsSummary = (order.items || []).map(item => {
                const name = item.productName || products.find(p => p.id === String(item.productId))?.name || item.productId
                return `${name} ×${item.quantity}`
            }).join(', ')
            const itemCount = (order.items || []).reduce((s, i) => s + i.quantity, 0)
            return [
                order.orderNumber || order.id, date, time,
                sourceLabel(order.orderSource), order.customerId || '-',
                itemsSummary, itemCount,
                formatCashierPaymentMethod(order.paymentMethod, order) || '-', order.couponCode || '-', order.discountAmount || 0,
                order.totalAmount, order.isPaid ? 'ชำระแล้ว' : 'ยังไม่ชำระ',
                order.foodStatus, order.deliveryType || '-',
            ]
        })

        // Summary trailer
        const totalRevenue = paidOrders.reduce((s, o) => s + o.totalAmount, 0)
        const totalDiscount = paidOrders.reduce((s, o) => s + (o.discountAmount || 0), 0)
        const trailer = [
            [], ['', '', '', '', '', '', '', '', '', '', '', '', '', ''],
            ['สรุปรายงาน', '', '', '', '', '', '', '', '', '', '', '', '', ''],
            ['ยอดขายสุทธิ (ชำระแล้ว)', '', '', '', '', '', '', '', '', '', totalRevenue, '', '', ''],
            ['จำนวนออเดอร์ทั้งหมด', '', '', '', '', '', '', '', '', '', orders.length, '', '', ''],
            ['จำนวนบิลที่ชำระแล้ว', '', '', '', '', '', '', '', '', '', paidOrders.length, '', '', ''],
            ['ส่วนลดรวม', '', '', '', '', '', '', '', '', '', totalDiscount, '', '', ''],
            ['ยอดเฉลี่ยต่อบิล', '', '', '', '', '', '', '', '', '', paidOrders.length ? (totalRevenue / paidOrders.length).toFixed(2) : 0, '', '', ''],
            ['วันที่ออกรายงาน', new Date().toLocaleDateString('th-TH'), new Date().toLocaleTimeString('th-TH'), '', '', '', '', '', '', '', '', '', '', ''],
        ]

        const allRows = [header, ...dataRows, ...trailer]
        const csv = '\uFEFF' + allRows.map(row => row.map(fmt).join(',')).join('\n')
        const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
        const link = document.createElement('a')
        link.href = url
        link.download = `limeleaf-report-${new Date().toISOString().slice(0, 10)}.csv`
        link.click()
        URL.revokeObjectURL(url)
        notify('ดาวน์โหลดรีพอร์ตแล้ว')
    }

    const exportReportPdf = () => {
        const totalRevenue = paidOrders.reduce((s, o) => s + o.totalAmount, 0)
        const totalDiscount = paidOrders.reduce((s, o) => s + (o.discountAmount || 0), 0)
        const exportedAt = new Date().toLocaleString('th-TH')
        const sourceLabel = s => s === 'online' ? 'ออนไลน์' : s === 'walkin' ? 'ทานที่ร้าน' : s === 'takeaway' ? 'สั่งกลับบ้าน' : s || '-'

        // Payment breakdown
        const paymentMap = {}
        paidOrders.forEach(o => {
            const k = formatPaymentOverview(o.paymentMethod)
            paymentMap[k] = (paymentMap[k] || { count: 0, total: 0 })
            paymentMap[k].count++
            paymentMap[k].total += o.totalAmount
        })

        const paymentRows = Object.entries(paymentMap).map(([method, { count, total }]) =>
            `<tr><td>${method}</td><td style="text-align:center">${count}</td><td class="amount">${total.toLocaleString('th-TH')} ฿</td></tr>`
        ).join('')

        const productRows = productSales.slice(0, 10).map(p =>
            `<tr><td>${p.name}</td><td style="text-align:center">${p.sold}</td><td class="amount">${p.revenue ? p.revenue.toLocaleString('th-TH') + ' ฿' : '—'}</td></tr>`
        ).join('')

        const orderRows = orders.slice(0, 200).map(order => {
            const d = new Date(order.createdAt)
            const itemsSummary = (order.items || []).map(i => `${i.productName || i.productId} ×${i.quantity}`).join(', ')
            return `<tr>
                <td><b>${order.orderNumber || order.id}</b></td>
                <td>${d.toLocaleDateString('th-TH')}</td>
                <td>${sourceLabel(order.orderSource)}</td>
                <td>${order.customerId || 'ลูกค้าทั่วไป'}</td>
                <td>${itemsSummary || '—'}</td>
                <td>${formatCashierPaymentMethod(order.paymentMethod, order) || '—'}</td>
                <td class="amount">${(order.totalAmount || 0).toLocaleString('th-TH')} ฿</td>
                <td>${order.isPaid ? '✓' : '—'}</td>
            </tr>`
        }).join('')

        const html = `<!DOCTYPE html><html lang="th"><head><meta charset="utf-8">
        <title>LimeLeaf Report ${new Date().toISOString().slice(0, 10)}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;700;900&display=swap" rel="stylesheet">
        <style>${PDF_BASE_CSS}</style></head><body>
        <div class="header">
            <div class="header-brand">
                <span class="brand-dot"></span>
                <div><span class="brand-name">LimeLeaf Kitchen</span><span class="brand-sub">SALES REPORT</span></div>
            </div>
            <div class="header-meta">
                <div>วันที่ออกรายงาน: ${exportedAt}</div>
                <div>ออเดอร์ทั้งหมด: ${orders.length} รายการ</div>
            </div>
        </div>
        <div class="stat-row">
            <div class="stat-box"><small>ยอดขายสุทธิ</small><strong>${totalRevenue.toLocaleString('th-TH')} ฿</strong></div>
            <div class="stat-box"><small>บิลที่ชำระแล้ว</small><strong>${paidOrders.length}</strong></div>
            <div class="stat-box"><small>ยอดเฉลี่ยต่อบิล</small><strong>${paidOrders.length ? Math.round(totalRevenue / paidOrders.length).toLocaleString('th-TH') : 0} ฿</strong></div>
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
        <h2>รายละเอียดออเดอร์ (แสดงสูงสุด 200 รายการ)</h2>
        <table><thead><tr><th>เลขออเดอร์</th><th>วันที่</th><th>ช่องทาง</th><th>ลูกค้า</th><th>รายการสินค้า</th><th>ชำระ</th><th>ยอด</th><th>สถานะ</th></tr></thead>
        <tbody>${orderRows}</tbody></table>
        <div class="footer">LimeLeaf Kitchen · รายงานนี้สร้างโดยระบบอัตโนมัติ · ${exportedAt} · ยอดส่วนลดรวม ${totalDiscount.toLocaleString('th-TH')} ฿</div>
        </body></html>`

        exportPdf(html)
        notify('เปิดหน้าต่างพิมพ์ PDF แล้ว')
    }

    return (
        <>
            <PageHead eyebrow="REPORTS" title="รีพอร์ตและสรุปการขาย" description="วิเคราะห์ยอดขายและดาวน์โหลดข้อมูลเพื่อนำไปใช้งานต่อ">
                <button className="admin-secondary" onClick={exportReport}><i className="bi bi-file-earmark-arrow-down me-1"></i> CSV</button>
                <button className="admin-primary" onClick={exportReportPdf}><i className="bi bi-file-earmark-pdf me-1"></i> ดาวน์โหลด PDF</button>
            </PageHead>
            <div className="admin-stats report">
                <article><small>ยอดขายสุทธิ</small><strong>{money(revenue)}</strong></article>
                <article><small>จำนวนบิล</small><strong>{paidOrders.length}</strong></article>
                <article><small>ยอดเฉลี่ย</small><strong>{money(averageOrder)}</strong></article>
            </div>
            <section className="admin-panel" style={{ marginBottom: 20 }}>
                <div className="admin-panel-head">
                    <div>
                        <h2>ยอดขายรายสัปดาห์</h2>
                        <p>สัปดาห์นี้ · รวม {money(totalWeek)} จาก {weeklyCount.reduce((s, v) => s + v, 0)} บิล</p>
                    </div>
                </div>
                <div style={{ padding: '20px 24px 14px', overflowX: 'auto' }}>
                    <div style={{ display: 'flex', alignItems: 'end', gap: 10, height: 200 }}>
                        {DAYS.map((day, i) => (
                            <div key={day} style={{ flex: 1, display: 'grid', gap: 6, justifyItems: 'center', alignItems: 'end' }}>
                                <b style={{ fontSize: 10, color: '#12852f', fontWeight: 800 }}>{weeklyRevenue[i] > 0 ? `฿${(weeklyRevenue[i] / 1000).toFixed(1)}k` : ''}</b>
                                <div
                                    style={{
                                        width: '100%',
                                        background: i === now.getDay() ? '#12852f' : '#b8ff35',
                                        borderRadius: '5px 5px 0 0',
                                        minHeight: 4,
                                        height: `${Math.max((weeklyRevenue[i] / maxWeekly) * 160, weeklyRevenue[i] > 0 ? 8 : 4)}px`,
                                        transition: 'height .4s ease'
                                    }}
                                    title={money(weeklyRevenue[i])}
                                />
                                <small style={{ fontSize: 11, color: i === now.getDay() ? '#12852f' : '#869088', fontWeight: i === now.getDay() ? 900 : 500 }}>{day}</small>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
            <div className="admin-report-grid">
                <section className="admin-panel">
                    <div className="admin-panel-head">
                        <div>
                            <h2>ยอดขายตามสินค้า</h2>
                            <p>จำนวนสินค้าที่ขายได้ทั้งหมด</p>
                        </div>
                    </div>
                    <div className="admin-bars">
                        {productSales.slice(0, 6).map(product => (
                            <div key={product.id}>
                                <span>{product.name}</span>
                                <div><i style={{ width: `${Math.max((product.sold / maxSold) * 100, 3)}%` }} /></div>
                                <b>{product.sold}</b>
                            </div>
                        ))}
                    </div>
                </section>
                <section className="admin-panel">
                    <div className="admin-panel-head">
                        <div>
                            <h2>ช่องทางชำระเงิน</h2>
                            <p>สัดส่วนจากออเดอร์ทั้งหมด</p>
                        </div>
                    </div>
                    <div className="admin-payment-list">
                        {paymentMethodsSummary.map(({ method, count, percent }) => (
                            <div key={method}>
                                <span>{method}</span>
                                <b>{count} ออเดอร์</b>
                                <i style={{ width: `${percent}%` }} />
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </>
    )
}

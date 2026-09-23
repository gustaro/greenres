import { money } from '../StaffShared'

export function CashierSummaryTab({
    period,
    setPeriod,
    revenue,
    periodOrders,
    unpaidOrdersCount,
    paymentMethods,
    productSales,
    exportSales,
    exportSalesPdf,
}) {
    return (
        <section>
            <div className="staff-section-head cashier-section-head">
                <div><h2>สรุปยอดขาย</h2><p>คำนวณจากธุรกรรมที่ Server ระบุว่าชำระสำเร็จแล้ว</p></div>
                <div className="cashier-report-actions">
                    <select value={period} onChange={event => setPeriod(event.target.value)}>
                        <option value="today">วันนี้</option>
                        <option value="7days">7 วันล่าสุด</option>
                        <option value="all">ทั้งหมด</option>
                    </select>
                    <button className="staff-secondary" onClick={exportSales}>
                        <i className="bi bi-file-earmark-arrow-down me-1"></i> CSV
                    </button>
                    <button className="staff-primary" style={{ fontSize: 12 }} onClick={exportSalesPdf}>
                        <i className="bi bi-file-earmark-pdf me-1"></i> PDF
                    </button>
                </div>
            </div>
            <div className="staff-metrics">
                <article><small>ยอดขายสุทธิ</small><strong>{money(revenue)}</strong></article>
                <article><small>จำนวนบิล</small><strong>{periodOrders.length}</strong></article>
                <article><small>ยอดเฉลี่ยต่อบิล</small><strong>{money(periodOrders.length ? revenue / periodOrders.length : 0)}</strong></article>
                <article><small>รายการรอชำระ</small><strong>{unpaidOrdersCount}</strong></article>
            </div>
            <div className="cashier-summary-grid">
                <section className="staff-table">
                    <div className="cashier-panel-title"><h3>ยอดตามช่องทางชำระเงิน</h3></div>
                    <table>
                        <thead><tr><th>ช่องทาง</th><th>จำนวนบิล</th><th>ยอดรวม</th></tr></thead>
                        <tbody>
                            {paymentMethods.map(item => (
                                <tr key={item.method}>
                                    <td><b>{item.method}</b></td>
                                    <td>{item.orders.length}</td>
                                    <td><strong>{money(item.orders.reduce((sum, order) => sum + order.totalAmount, 0))}</strong></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </section>
                <section className="staff-table">
                    <div className="cashier-panel-title"><h3>สินค้าขายดี</h3></div>
                    <table>
                        <thead><tr><th>สินค้า</th><th>จำนวน</th><th>ยอดขาย</th></tr></thead>
                        <tbody>
                            {productSales.slice(0, 8).map(item => (
                                <tr key={item.name}>
                                    <td><b>{item.name}</b></td>
                                    <td>{item.quantity}</td>
                                    <td><strong>{money(item.amount)}</strong></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </section>
            </div>
        </section>
    )
}

import { Empty, money, orderCode, formatCashierPaymentMethod } from '../StaffShared'

export function CashierHistoryTab({
    paidOrders,
    searchField,
    setSearchField,
    search,
    setSearch,
    customerLabel,
    onViewReceipt,
}) {
    return (
        <section>
            <div className="staff-section-head cashier-section-head" style={{ alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div>
                    <h2>ประวัติการชำระเงิน / คืนเงิน</h2>
                    <p>รายการที่ชำระแล้ว และออเดอร์ที่ยกเลิกพร้อมคืนเงิน</p>
                </div>
                <div className="cashier-search-bar" style={{ display: 'flex', gap: 8, alignItems: 'center', marginLeft: 'auto' }}>
                    <select
                        className="cashier-search-selector"
                        value={searchField}
                        onChange={e => setSearchField(e.target.value)}
                        style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #c2cdc1', background: '#fff', fontSize: 13, fontWeight: 600 }}
                    >
                        <option value="all">ทั้งหมด</option>
                        <option value="order">เลขออเดอร์</option>
                        <option value="customer">ลูกค้า / เบอร์โต๊ะ</option>
                        <option value="time">เวลาชำระ</option>
                        <option value="channel">ช่องทาง / ประเภท</option>
                        <option value="amount">ยอดเงิน</option>
                    </select>
                    <input
                        className="cashier-search"
                        value={search}
                        onChange={event => setSearch(event.target.value)}
                        placeholder="ค้นหารายการย้อนหลัง..."
                        style={{ width: 220 }}
                    />
                </div>
            </div>

            <div className="staff-table cashier-history">
                <table>
                    <thead>
                        <tr>
                            <th>ออเดอร์</th>
                            <th>เวลาชำระ</th>
                            <th>ลูกค้า</th>
                            <th>ช่องทาง</th>
                            <th>ยอดสุทธิ</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {paidOrders.map(order => (
                            <tr key={order.id}>
                                <td data-label="ออเดอร์">
                                    <b>{orderCode(order)}</b>
                                    <small>{order.deliveryType}{order.deliveryType === 'ทานที่ร้าน' && order.tableNumber ? ` · โต๊ะ ${order.tableNumber}` : ''}</small>
                                </td>
                                <td data-label="เวลาชำระ">{new Date((order.isRefunded && order.refund?.at) || order.paidAt || order.createdAt).toLocaleString('th-TH')}</td>
                                <td data-label="ลูกค้า">{customerLabel(order)}</td>
                                <td data-label="ช่องทาง">
                                    {order.isRefunded ? (
                                        <>
                                            <i className="status cancelled"><i className="bi bi-arrow-counterclockwise me-1" />ยกเลิก · {order.refund?.label || 'คืนเงินแล้ว'}</i>
                                            {order.cancelReason && <small style={{ display: 'block', color: '#7a271a' }}>{order.cancelReason}</small>}
                                        </>
                                    ) : (
                                        <i className="status paid">{formatCashierPaymentMethod(order.paymentMethod, order)}</i>
                                    )}
                                </td>
                                <td data-label="ยอดสุทธิ">
                                    {order.isRefunded
                                        ? <strong style={{ color: '#b42318' }}>−{money(order.refund?.amount ?? order.totalAmount)}</strong>
                                        : <strong>{money(order.totalAmount)}</strong>}
                                </td>
                                <td className="cashier-history-action">
                                    <button className="staff-link" onClick={() => onViewReceipt(order)}>
                                        <i className="bi bi-printer me-1"></i> พิมพ์ใบเสร็จ
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {paidOrders.length === 0 && <Empty text="ยังไม่มีประวัติการชำระเงิน" />}
            </div>
        </section>
    )
}

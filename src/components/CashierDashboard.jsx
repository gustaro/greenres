import { StaffShell } from './StaffShared'
import { useAuth } from '../lib/AuthContext'
import { ToastContainer } from './ToastNotification'
import { useCashierDashboard } from './cashier/useCashierDashboard'
import { CashierMoveTableModal } from './cashier/CashierMoveTableModal'
import { CashierSwitchDineInModal } from './cashier/CashierSwitchDineInModal'
import { CashierAddItemsModal } from './cashier/CashierAddItemsModal'
import { CashierPaymentModal } from './cashier/CashierPaymentModal'
import { CashierReceiptModal } from './cashier/CashierReceiptModal'
import { CashierCounterTab } from './cashier/CashierCounterTab'
import { CashierReadyTab } from './cashier/CashierReadyTab'
import { CashierPaymentsTab } from './cashier/CashierPaymentsTab'
import { CashierHistoryTab } from './cashier/CashierHistoryTab'
import { CashierSummaryTab } from './cashier/CashierSummaryTab'

export function CashierDashboard({ orders = [], setOrders, refreshOrders }) {
    const { settings } = useAuth()
    const {
        tab, setTab,
        receipt, setReceipt,
        search, setSearch,
        searchField, setSearchField,
        period, setPeriod,
        toasts, dismissToast,
        counterProducts,
        counterSource, setCounterSource,
        counterTableNumber, setCounterTableNumber,
        counterCustomerName, setCounterCustomerName,
        counterCustomerPhone, setCounterCustomerPhone,
        counterReservationTime, setCounterReservationTime,
        counterReservationGuests, setCounterReservationGuests,
        counterCategory, setCounterCategory,
        counterGroups, visibleCounterGroups,
        counterCart, counterAdd, counterRemove, counterItems,
        counterTakeawayMap, setCounterTakeawayMap,
        counterTotal, counterNote, setCounterNote,
        counterLoading, counterNotice, submitCounterOrder,
        moveTableOrder, setMoveTableOrder,
        newTableInput, setNewTableInput,
        movingTableLoading, handleMoveTable,
        addItemsOrder, setAddItemsOrder,
        addItemsCart, setAddItemsCart,
        addItemsTakeawayMap, setAddItemsTakeawayMap,
        addItemsCategory, setAddItemsCategory,
        visibleAddItemsGroups, addingItemsLoading, submitAddItems,
        paymentModalOrder, setPaymentModalOrder,
        selectedPaymentMethod, setSelectedPaymentMethod,
        cashReceived, setCashReceived,
        paymentLoading, handleOpenPaymentModal, handleConfirmPayment,
        switchDineInOrder, setSwitchDineInOrder,
        switchTableInput, setSwitchTableInput,
        switchTableLoading, handleToggleTakeaway, handleConfirmSwitchDineIn,
        completeCounterOrder, customerLabel,
        serveItem, serveAllReadyItems,
        filteredUnpaid, filteredPaid, filteredReady,
        revenue, periodOrders, paymentMethods, productSales, exportSales, exportSalesPdf,
    } = useCashierDashboard(orders, setOrders, refreshOrders)

    return (
        <StaffShell
            role="cashier"
            title="ระบบแคชเชียร์"
            subtitle="จัดการรับออเดอร์หน้าร้าน ย้ายโต๊ะ เพิ่มเมนู และชำระเงิน"
            active={tab}
            onTab={setTab}
            tabs={[
                { key: 'counter', label: 'รับออเดอร์/จองโต๊ะ', icon: 'bi-pencil-square', count: 0 },
                { key: 'ready', label: 'พร้อมส่งมอบ', icon: 'bi-bell-fill', count: filteredReady.length },
                { key: 'payments', label: 'รอชำระเงิน', icon: 'bi-wallet2', count: filteredUnpaid.length },
                { key: 'history', label: 'ประวัติและใบเสร็จ', icon: 'bi-receipt', count: 0 },
                { key: 'summary', label: 'สรุปยอดขาย', icon: 'bi-graph-up-arrow', count: 0 }
            ]}
        >
            <ToastContainer toasts={toasts} onDismiss={dismissToast} />
            {tab === 'payments' && <div className="staff-alert">กด "ชำระเงินแล้ว" เมื่อลูกค้าชำระเงินสดหรือสแกนจ่ายเรียบร้อย</div>}
            {tab === 'ready' && <div className="staff-alert">ตรวจสอบรายการที่พร้อมเสิร์ฟ นำไปเสิร์ฟที่โต๊ะ และกด "ส่งมอบแล้ว"</div>}
            {counterNotice && <div className="staff-alert" style={{ borderColor: '#12852f', color: '#12852f' }}><i className="bi bi-check-circle-fill me-2" />{counterNotice}</div>}

            {tab === 'counter' && (
                <CashierCounterTab
                    counterSource={counterSource}
                    setCounterSource={setCounterSource}
                    counterTableNumber={counterTableNumber}
                    setCounterTableNumber={setCounterTableNumber}
                    counterCustomerName={counterCustomerName}
                    setCounterCustomerName={setCounterCustomerName}
                    counterCustomerPhone={counterCustomerPhone}
                    setCounterCustomerPhone={setCounterCustomerPhone}
                    counterReservationTime={counterReservationTime}
                    setCounterReservationTime={setCounterReservationTime}
                    counterReservationGuests={counterReservationGuests}
                    setCounterReservationGuests={setCounterReservationGuests}
                    counterCategory={counterCategory}
                    setCounterCategory={setCounterCategory}
                    counterGroups={counterGroups}
                    visibleCounterGroups={visibleCounterGroups}
                    counterCart={counterCart}
                    counterAdd={counterAdd}
                    counterRemove={counterRemove}
                    counterItems={counterItems}
                    counterTakeawayMap={counterTakeawayMap}
                    setCounterTakeawayMap={setCounterTakeawayMap}
                    counterTotal={counterTotal}
                    counterNote={counterNote}
                    setCounterNote={setCounterNote}
                    counterLoading={counterLoading}
                    submitCounterOrder={submitCounterOrder}
                />
            )}

            {tab === 'ready' && (
                <CashierReadyTab
                    readyOrders={filteredReady}
                    searchField={searchField}
                    setSearchField={setSearchField}
                    search={search}
                    setSearch={setSearch}
                    customerLabel={customerLabel}
                    onViewReceipt={setReceipt}
                    onCompleteOrder={completeCounterOrder}
                    onServeItem={serveItem}
                    onServeAllReadyItems={serveAllReadyItems}
                    onAddItems={order => {
                        setAddItemsOrder(order)
                        setAddItemsCart({})
                        setAddItemsTakeawayMap({})
                    }}
                />
            )}

            {tab === 'payments' && (
                <CashierPaymentsTab
                    unpaidOrders={filteredUnpaid}
                    searchField={searchField}
                    setSearchField={setSearchField}
                    search={search}
                    setSearch={setSearch}
                    customerLabel={customerLabel}
                    onMoveTable={order => {
                        setMoveTableOrder(order)
                        setNewTableInput(order.tableNumber || '')
                    }}
                    onToggleTakeaway={handleToggleTakeaway}
                    onAddItems={order => {
                        setAddItemsOrder(order)
                        setAddItemsCart({})
                        setAddItemsTakeawayMap({})
                    }}
                    onViewReceipt={setReceipt}
                    onOpenPaymentModal={handleOpenPaymentModal}
                />
            )}

            {tab === 'history' && (
                <CashierHistoryTab
                    paidOrders={filteredPaid}
                    searchField={searchField}
                    setSearchField={setSearchField}
                    search={search}
                    setSearch={setSearch}
                    customerLabel={customerLabel}
                    onViewReceipt={setReceipt}
                />
            )}

            {tab === 'summary' && (
                <CashierSummaryTab
                    period={period}
                    setPeriod={setPeriod}
                    revenue={revenue}
                    periodOrders={periodOrders}
                    unpaidOrdersCount={filteredUnpaid.length}
                    paymentMethods={paymentMethods}
                    productSales={productSales}
                    exportSales={exportSales}
                    exportSalesPdf={exportSalesPdf}
                />
            )}

            <CashierMoveTableModal
                order={moveTableOrder}
                newTableInput={newTableInput}
                setNewTableInput={setNewTableInput}
                onConfirm={handleMoveTable}
                onCancel={() => setMoveTableOrder(null)}
                loading={movingTableLoading}
            />

            <CashierSwitchDineInModal
                order={switchDineInOrder}
                customerLabel={customerLabel}
                switchTableInput={switchTableInput}
                setSwitchTableInput={setSwitchTableInput}
                onConfirm={handleConfirmSwitchDineIn}
                onCancel={() => setSwitchDineInOrder(null)}
                loading={switchTableLoading}
            />

            <CashierAddItemsModal
                order={addItemsOrder}
                counterGroups={counterGroups}
                counterProducts={counterProducts}
                addItemsCart={addItemsCart}
                setAddItemsCart={setAddItemsCart}
                addItemsTakeawayMap={addItemsTakeawayMap}
                setAddItemsTakeawayMap={setAddItemsTakeawayMap}
                addItemsCategory={addItemsCategory}
                setAddItemsCategory={setAddItemsCategory}
                visibleAddItemsGroups={visibleAddItemsGroups}
                onSubmit={submitAddItems}
                onCancel={() => setAddItemsOrder(null)}
                loading={addingItemsLoading}
            />

            <CashierPaymentModal
                order={paymentModalOrder}
                customerLabel={customerLabel}
                selectedPaymentMethod={selectedPaymentMethod}
                setSelectedPaymentMethod={setSelectedPaymentMethod}
                cashReceived={cashReceived}
                setCashReceived={setCashReceived}
                onConfirm={handleConfirmPayment}
                onCancel={() => setPaymentModalOrder(null)}
                loading={paymentLoading}
            />

            <CashierReceiptModal
                receipt={receipt}
                settings={settings}
                customerLabel={customerLabel}
                onClose={() => setReceipt(null)}
            />

            <ToastContainer toasts={toasts} onDismiss={dismissToast} />
        </StaffShell>
    )
}

import { DeliveryCompleteModal } from './DeliveryCompleteModal'

export function DeliveryCashModal({ cashConfirm, setCashConfirm, cashConfirming, confirmCashPayment }) {
    if (!cashConfirm) return null

    return (
        <DeliveryCompleteModal
            job={cashConfirm}
            onClose={() => setCashConfirm(null)}
            onConfirm={confirmCashPayment}
            isSubmitting={cashConfirming}
        />
    )
}

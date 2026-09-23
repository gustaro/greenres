import { KitchenOuterCard } from './KitchenOuterCard'

export function KitchenOrderCard({
    order,
    itemLoadingKey,
    actionLoadingId,
    onUpdateItemStatus,
    onDispatchAll,
    startOrder,
    finishOrder,
    cancelKitchenOrder,
}) {
    return (
        <KitchenOuterCard
            order={order}
            itemLoadingKey={itemLoadingKey}
            actionLoadingId={actionLoadingId}
            onUpdateItemStatus={onUpdateItemStatus}
            onDispatchAll={onDispatchAll}
            startOrder={startOrder}
            finishOrder={finishOrder}
            cancelKitchenOrder={cancelKitchenOrder}
        />
    )
}


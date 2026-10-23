export const activeOptionGroups = product => (product?.optionGroups || [])
    .filter(group => group.isActive !== false && group.options?.some(option => option.isActive !== false))
    .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0))
    .map(group => ({
        ...group,
        options: group.options
            .filter(option => option.isActive !== false)
            .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0)),
    }))

export const selectableOptionGroups = product => activeOptionGroups(product)
    .map(group => ({ ...group, options: group.options.filter(option => option.isAvailable !== false) }))
    .filter(group => group.options.length > 0)

export const defaultOptionSelection = product => Object.fromEntries(selectableOptionGroups(product).map(group => {
    const defaults = group.options.filter(option => option.isDefault).map(option => option.id)
    return [group.id, group.selectionType === 'MULTIPLE' ? defaults.slice(0, Number(group.maxSelections || defaults.length || 1)) : defaults.slice(0, 1)]
}))

export const selectedOptionIds = selection => Object.values(selection || {}).flat().filter(Boolean).sort()

export const makeCartLineKey = (productId, selection = {}) => {
    const ids = selectedOptionIds(selection)
    return ids.length ? `${productId}::${ids.join(',')}` : productId
}

export const productIdFromLineKey = lineKey => String(lineKey || '').split('::')[0]

export const optionIdsFromLineKey = lineKey => {
    const optionPart = String(lineKey || '').split('::')[1] || ''
    return optionPart ? optionPart.split(',').filter(Boolean) : []
}

export const buildCartLines = (cart = {}, products = []) => {
    const productMap = new Map(products.map(product => [product.id, product]))
    return Object.entries(cart).flatMap(([lineKey, rawQuantity]) => {
        const quantity = Number(rawQuantity || 0)
        const productId = productIdFromLineKey(lineKey)
        const product = productMap.get(productId)
        if (!product || quantity <= 0) return []
        const ids = new Set(optionIdsFromLineKey(lineKey))
        const selectedOptions = activeOptionGroups(product).flatMap(group => group.options
            .filter(option => ids.has(option.id))
            .map(option => ({ ...option, groupId: group.id, groupName: group.name, groupNameEn: group.nameEn || '' })))
        const optionPrice = selectedOptions.reduce((sum, option) => sum + Number(option.priceAdjustment || 0), 0)
        return [{ lineKey, productId, product, quantity, selectedOptions, optionPrice, unitPrice: Number(product.price) + optionPrice }]
    })
}

export const selectionIsValid = (product, selection = {}) => selectableOptionGroups(product).every(group => {
    const count = (selection[group.id] || []).length
    const minimum = group.isRequired ? Math.max(1, Number(group.minSelections || 1)) : Number(group.minSelections || 0)
    const maximum = group.selectionType === 'SINGLE' ? 1 : Math.max(1, Number(group.maxSelections || group.options.length))
    return count >= minimum && count <= maximum
})

export const orderItemOptionLabel = item => (Array.isArray(item?.selectedOptions) ? item.selectedOptions : [])
    .map(option => option?.name)
    .filter(Boolean)
    .join(' · ')

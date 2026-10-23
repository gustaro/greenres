import { useEffect, useMemo, useState } from 'react'
import { useLanguage } from '../lib/LanguageContext'
import { activeOptionGroups, defaultOptionSelection, selectionIsValid } from '../lib/productOptions'
import './ProductOptionsModal.css'

export function ProductOptionsModal({ product, onConfirm, onClose, title, showNote = true }) {
    const { isEn } = useLanguage()
    const groups = useMemo(() => activeOptionGroups(product), [product])
    const [selection, setSelection] = useState(() => defaultOptionSelection(product))
    const [expandedGroups, setExpandedGroups] = useState({})
    const [quantity, setQuantity] = useState(1)
    const [note, setNote] = useState('')

    useEffect(() => {
        setSelection(defaultOptionSelection(product))
        setExpandedGroups(Object.fromEntries(activeOptionGroups(product).map(group => [group.id, true])))
        setQuantity(1)
        setNote('')
    }, [product])

    if (!product) return null

    const choose = (group, option) => {
        if (option.isAvailable === false) return
        setSelection(current => {
            const selected = current[group.id] || []
            if (group.selectionType !== 'MULTIPLE') return { ...current, [group.id]: [option.id] }
            if (selected.includes(option.id)) return { ...current, [group.id]: selected.filter(id => id !== option.id) }
            if (selected.length >= Number(group.maxSelections || group.options.length)) return current
            return { ...current, [group.id]: [...selected, option.id] }
        })
    }

    const selectedOptions = groups.flatMap(group => group.options.filter(option => (selection[group.id] || []).includes(option.id)))
    const optionTotal = selectedOptions.reduce((sum, option) => sum + Number(option.priceAdjustment || 0), 0)
    const unitPrice = Number(product.price) + optionTotal
    const totalPrice = unitPrice * quantity
    const valid = selectionIsValid(product, selection)

    const groupRule = group => {
        if (group.selectionType !== 'MULTIPLE') return isEn ? 'Choose 1 option' : 'กรุณาเลือก 1 ข้อ'
        const maximum = Number(group.maxSelections || group.options.length)
        return isEn ? `Choose up to ${maximum}` : `เลือกได้สูงสุด ${maximum} ข้อ`
    }

    return (
        <div className="product-options-backdrop" onMouseDown={event => event.target === event.currentTarget && onClose()}>
            <section className="product-options-modal" role="dialog" aria-modal="true" aria-label={title || product.name}>
                <div className="product-options-hero">
                    <img src={product.img || '/assets/basil-rice.png'} alt={isEn && product.en ? product.en : product.name} />
                    <button type="button" className="product-options-close" onClick={onClose} aria-label={isEn ? 'Close' : 'ปิด'}>
                        <i className="bi bi-x-lg" />
                    </button>
                </div>

                <div className="product-options-heading">
                    {title && <small>{title}</small>}
                    <h3>{isEn && product.en ? product.en : product.name}</h3>
                    {product.description && <p>{product.description}</p>}
                    <strong>฿{Number(product.price).toLocaleString()}</strong>
                </div>

                <div className="product-options-body">
                    {groups.map(group => {
                        const selected = selection[group.id] || []
                        const expanded = expandedGroups[group.id] !== false
                        return (
                            <fieldset className="product-option-group" key={group.id}>
                                <button
                                    type="button"
                                    className="product-option-group-head"
                                    onClick={() => setExpandedGroups(current => ({ ...current, [group.id]: !expanded }))}
                                    aria-expanded={expanded}
                                >
                                    <span>
                                        <b>{isEn && group.nameEn ? group.nameEn : group.name}</b>
                                        <small>{groupRule(group)}</small>
                                    </span>
                                    <span className="product-option-group-meta">
                                        {group.isRequired && <em>{isEn ? 'Required' : 'ต้องระบุ'}</em>}
                                        <i className={`bi bi-chevron-${expanded ? 'up' : 'down'}`} />
                                    </span>
                                </button>

                                {expanded && (
                                    <div className="product-option-list">
                                        {group.options.map(option => {
                                            const checked = selected.includes(option.id)
                                            const unavailable = option.isAvailable === false
                                            return (
                                                <label className={`${checked ? 'selected' : ''} ${unavailable ? 'unavailable' : ''}`} key={option.id}>
                                                    <input
                                                        type={group.selectionType === 'MULTIPLE' ? 'checkbox' : 'radio'}
                                                        name={`option-${group.id}`}
                                                        checked={checked}
                                                        disabled={unavailable}
                                                        onChange={() => choose(group, option)}
                                                    />
                                                    <span>
                                                        <b>{isEn && option.nameEn ? option.nameEn : option.name}</b>
                                                        {unavailable && <small>{isEn ? 'Unavailable' : 'สินค้าหมด'}</small>}
                                                    </span>
                                                    <strong>
                                                        {unavailable
                                                            ? (isEn ? 'Sold out' : 'หมด')
                                                            : Number(option.priceAdjustment) > 0
                                                                ? `+฿${Number(option.priceAdjustment).toLocaleString()}`
                                                                : '฿0'}
                                                    </strong>
                                                </label>
                                            )
                                        })}
                                    </div>
                                )}
                            </fieldset>
                        )
                    })}

                    {showNote && (
                        <label className="product-options-note">
                            <b>{isEn ? 'Additional details' : 'รายละเอียดเพิ่มเติม'}</b>
                            <textarea
                                value={note}
                                onChange={event => setNote(event.target.value)}
                                placeholder={isEn ? 'For example: no vegetables' : 'เช่น ไม่เอาผัก'}
                                rows="3"
                                maxLength="250"
                            />
                        </label>
                    )}
                </div>

                <footer className="product-options-footer">
                    <div className="product-options-quantity" aria-label={isEn ? 'Quantity' : 'จำนวน'}>
                        <button type="button" onClick={() => setQuantity(current => Math.max(1, current - 1))} disabled={quantity <= 1}>−</button>
                        <strong>{quantity}</strong>
                        <button type="button" onClick={() => setQuantity(current => Math.min(99, current + 1))}>+</button>
                    </div>
                    <button
                        type="button"
                        className="product-options-submit"
                        onClick={() => valid && onConfirm(selection, { quantity, note: note.trim() })}
                        disabled={!valid}
                    >
                        <span><i className="bi bi-cart-plus" /> {isEn ? 'Add to cart' : 'ใส่ตะกร้า'}</span>
                        <strong>฿{totalPrice.toLocaleString()}</strong>
                    </button>
                </footer>
            </section>
        </div>
    )
}

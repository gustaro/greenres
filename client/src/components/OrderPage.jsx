import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { OrderNavbar } from './OrderNavbar'
import { CartSidebar } from './Cart'
import { useLanguage } from '../lib/LanguageContext'
import { categoryNameTranslations } from '../locales/translations'
import './OrderPage.css'
import { ProductOptionsModal } from './ProductOptionsModal'
import { selectableOptionGroups, buildCartLines, makeCartLineKey } from '../lib/productOptions'

export function OrderPage({ onHome, user, onAuth, onLogout, onCart, products, categories, cart, setCart, itemNotes, setItemNotes, onCheckout, pointsToUse, setPointsToUse }) {
    const { lang, isEn, t } = useLanguage()
    const [searchParams] = useSearchParams()
    const handledProductRef = useRef(null)
    const [query, setQuery] = useState('')
    const [cat, setCat] = useState('promo')
    const [optionProduct, setOptionProduct] = useState(null)
    const [highlightedProductId, setHighlightedProductId] = useState(null)
    const targetProductId = searchParams.get('product')

    useEffect(() => {
        const promoCode = searchParams.get('promo')
        if (promoCode) sessionStorage.setItem('limeleaf_pending_promo', promoCode)
    }, [searchParams])

    useEffect(() => {
        if (!targetProductId || handledProductRef.current === targetProductId || !products.length) return
        const product = products.find(item => String(item.id) === targetProductId)
        if (!product) return
        handledProductRef.current = targetProductId
        setHighlightedProductId(targetProductId)
        setCat(product.categoryId || 'promo')
        window.setTimeout(() => {
            const card = document.querySelector(`[data-product-id="${CSS.escape(targetProductId)}"]`)
            card?.scrollIntoView({ behavior: 'smooth', block: 'center' })
            card?.focus({ preventScroll: true })
        }, 100)
    }, [products, targetProductId])

    useEffect(() => {
        if (!highlightedProductId) return undefined
        const timer = window.setTimeout(() => {
            setHighlightedProductId(null)
            document.querySelector(`[data-product-id="${CSS.escape(highlightedProductId)}"]`)?.blur()
        }, 2200)
        return () => window.clearTimeout(timer)
    }, [highlightedProductId])

    const addLine = (product, selection = {}, details = {}) => {
        const lineKey = makeCartLineKey(product.id, selection)
        const quantity = Math.max(1, Number(details.quantity || 1))
        setCart(prev => ({ ...prev, [lineKey]: (prev[lineKey] || 0) + quantity }))
        if (details.note) setItemNotes(prev => ({ ...prev, [lineKey]: details.note }))
        setOptionProduct(null)
    }
    const add = product => selectableOptionGroups(product).length ? setOptionProduct(product) : addLine(product)

    const getCategoryLabel = (name, catObj) => {
        if (!name && !catObj) return ''
        if (isEn && catObj?.nameEn) return catObj.nameEn
        if (isEn && categoryNameTranslations[name]?.en) return categoryNameTranslations[name].en
        return name
    }

    const list = products.filter(p => {
        const matchCat = cat === 'promo' || p.categoryId === cat
        const matchQ = `${p.name} ${p.en || ''} ${p.description || ''}`.toLowerCase().includes(query.toLowerCase())
        return matchCat && matchQ
    })

    const cartLines = buildCartLines(cart, products)
    const count = cartLines.reduce((sum, line) => sum + line.quantity, 0)

    const promoTabLabel = isEn ? 'New & Promos' : 'เมนูและโปรโมชั่นใหม่'

    const activeCatObj = categories.find(category => category.id === cat)
    const currentCategoryTitle = cat === 'promo' 
        ? promoTabLabel 
        : (activeCatObj ? getCategoryLabel(activeCatObj.name, activeCatObj) : (isEn ? 'All Menu' : 'เมนูทั้งหมด'))
    const currentCategorySubTitle = cat === 'promo'
        ? (isEn ? 'Signature & Limited Deals' : 'เมนูแนะนำและโปรโมชั่นพิเศษ')
        : (activeCatObj ? (isEn ? activeCatObj.name : (activeCatObj.nameEn || categoryNameTranslations[activeCatObj.name]?.en || '')) : '')

    return (
        <div className="op-page">
            <OrderNavbar
                categories={[
                    { id: 'promo', label: promoTabLabel },
                    ...categories.map(category => ({
                        id: category.id,
                        label: getCategoryLabel(category.name, category)
                    }))
                ]}
                activeCategory={cat}
                onCategoryChange={setCat}
                user={user}
                onAuth={onAuth}
                onLogout={onLogout}
                cartCount={count}
                onCheckout={onCart || onCheckout}
                onHome={onHome}
            />

            {/* Main layout */}
            <div className="op-body">
                <main className="op-main">

                    {/* Search row */}
                    <div className="op-search-row">
                        <div className="op-section-heading">
                            <h2 className="op-section-title">
                                {currentCategoryTitle}
                            </h2>
                            {currentCategorySubTitle && (
                                <span className="op-section-subtitle">
                                    {currentCategorySubTitle}
                                </span>
                            )}
                        </div>
                        <div className="op-search-bar">
                            <div className="op-search-input">
                                <i className="bi bi-search text-muted"></i>
                                <input
                                    value={query}
                                    onChange={e => setQuery(e.target.value)}
                                    placeholder={t('searchPlaceholder')}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Menu grid */}
                    <div className="op-menu-grid">
                        {list.map(p => {
                            const mainName = isEn && p.en ? p.en : p.name
                            const subName = isEn && p.en ? p.name : (p.en || '')
                            return (
                                <article className={`op-card ${String(p.id) === highlightedProductId ? 'op-card-target' : ''}`} key={p.id} data-product-id={p.id} tabIndex={String(p.id) === highlightedProductId ? -1 : undefined}>
                                    <div className="op-card-img">
                                        <img src={p.img} alt={mainName} />
                                    </div>
                                    <div className="op-card-body">
                                        <h3>{mainName}</h3>
                                        {subName && <small style={{ color: '#888', fontSize: '11px', display: 'block', marginTop: '-2px', marginBottom: '4px' }}>{subName}</small>}
                                        {p.description && (
                                            <p className="op-card-desc" style={{ fontSize: '11.5px', color: '#68776b', margin: '2px 0 6px', lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                {p.description}
                                            </p>
                                        )}
                                        {selectableOptionGroups(p).length > 0 && <span className="op-option-badge"><i className="bi bi-ui-radios" /> {isEn ? 'Customizable' : 'มีตัวเลือก'}</span>}
                                        <span className="op-card-label">{isEn ? 'Price' : 'ราคา'}</span>
                                        <div className="op-card-footer">
                                            <span className="op-price">฿{p.price}</span>
                                            <button
                                                className="op-add-btn"
                                                disabled={['หมด', 'วัตถุดิบไม่เพียงพอ'].includes(p.status)}
                                                onClick={() => add(p)}
                                            >
                                                {p.status === 'หมด' ? t('outOfStock') : p.status === 'วัตถุดิบไม่เพียงพอ' ? (isEn ? 'Out of Stock' : 'วัตถุดิบไม่พอ') : (isEn ? 'Add' : 'สั่งซื้อ')}
                                            </button>
                                        </div>
                                    </div>
                                </article>
                            )
                        })}
                        {list.length === 0 && (
                            <div className="op-empty">{t('noProductsFound')}</div>
                        )}
                    </div>
                </main>

                {/* Cart sidebar */}
                <CartSidebar
                    cart={cart}
                    setCart={setCart}
                    products={products}
                    itemNotes={itemNotes}
                    setItemNotes={setItemNotes}
                    onCheckout={onCheckout}
                    onAuth={onAuth}
                    pointsToUse={pointsToUse}
                    setPointsToUse={setPointsToUse}
                />
            </div>
            {optionProduct && <ProductOptionsModal product={optionProduct} onConfirm={(selection, details) => addLine(optionProduct, selection, details)} onClose={() => setOptionProduct(null)} />}
        </div>
    )
}

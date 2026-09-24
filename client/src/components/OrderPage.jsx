import { useMemo, useState } from 'react'
import { OrderNavbar } from './OrderNavbar'
import { CartSidebar } from './Cart'
import { useLanguage } from '../lib/LanguageContext'
import { categoryNameTranslations } from '../locales/translations'
import './OrderPage.css'

export function OrderPage({ onHome, user, onAuth, onLogout, products, categories, cart, setCart, itemNotes, setItemNotes, onCheckout, pointsToUse, setPointsToUse }) {
    const { lang, isEn, t } = useLanguage()
    const [query, setQuery] = useState('')
    const [cat, setCat] = useState('promo')

    const add = (p) => setCart(prev => ({ ...prev, [p.id]: (prev[p.id] || 0) + 1 }))
    const remove = (p) => setCart(prev => ({ ...prev, [p.id]: Math.max(0, (prev[p.id] || 0) - 1) }))

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

    const cartItems = products.filter(p => cart[p.id])
    const total = cartItems.reduce((s, p) => s + p.price * cart[p.id], 0)
    const count = cartItems.reduce((s, p) => s + cart[p.id], 0)

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
                onCheckout={onCheckout}
                onHome={onHome}
            />

            {/* Main layout */}
            <div className="op-body">
                <main className="op-main">

                    {/* Search row */}
                    <div className="op-search-row">
                        <div>
                            <h2 className="op-section-title">
                                {currentCategoryTitle}
                            </h2>
                            {currentCategorySubTitle && (
                                <span className="op-section-subtitle" style={{ fontSize: '13px', color: '#68776b', fontWeight: 600, display: 'block', marginTop: '2px' }}>
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
                                <article className="op-card" key={p.id}>
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
        </div>
    )
}

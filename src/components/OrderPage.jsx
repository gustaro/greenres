import { useMemo, useState } from 'react'
import { OrderNavbar } from './OrderNavbar'
import { CartSidebar } from './Cart'
import './OrderPage.css'

export function OrderPage({ onHome, user, onAuth, onLogout, products, categories, cart, setCart, itemNotes, setItemNotes, onCheckout }) {
    const [query, setQuery] = useState('')
    const [cat, setCat] = useState('promo')

    const add = (p) => setCart(prev => ({ ...prev, [p.id]: (prev[p.id] || 0) + 1 }))
    const remove = (p) => setCart(prev => ({ ...prev, [p.id]: Math.max(0, (prev[p.id] || 0) - 1) }))

    const list = products.filter(p => {
        const matchCat = cat === 'promo' || p.categoryId === cat
        const matchQ = `${p.name} ${p.en}`.toLowerCase().includes(query.toLowerCase())
        return matchCat && matchQ
    })

    const cartItems = products.filter(p => cart[p.id])
    const total = cartItems.reduce((s, p) => s + p.price * cart[p.id], 0)
    const count = cartItems.reduce((s, p) => s + cart[p.id], 0)
    return (
        <div className="op-page">
            <OrderNavbar
                categories={[{ id: 'promo', label: 'เมนูและโปรโมชั่นใหม่' }, ...categories.map(category => ({ id: category.id, label: category.name }))]}
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
                        <h2 className="op-section-title">
                            {cat === 'promo' ? 'เมนูและโปรโมชั่นใหม่' : categories.find(category => category.id === cat)?.name || 'เมนูทั้งหมด'}
                        </h2>
                        <div className="op-search-bar">
                            <div className="op-search-input">
                                <i className="bi bi-search text-muted"></i>
                                <input
                                    value={query}
                                    onChange={e => setQuery(e.target.value)}
                                    placeholder="ค้นหาเมนู"
                                />
                            </div>
                            <button className="op-fav-btn"><i className="bi bi-heart"></i> เมนูโปรด</button>
                        </div>
                    </div>

                    {/* Menu grid */}
                    <div className="op-menu-grid">
                        {list.map(p => (
                            <article className="op-card" key={p.id}>
                                <div className="op-card-img">
                                    <img src={p.img} alt={p.name} />
                                </div>
                                <div className="op-card-body">
                                    <h3>{p.name}</h3>
                                    <span className="op-card-label">ราคา</span>
                                    <div className="op-card-footer">
                                        <span className="op-price">฿{p.price}</span>
                                        <button className="op-add-btn" disabled={['หมด', 'วัตถุดิบไม่เพียงพอ'].includes(p.status)} onClick={() => add(p)}>{p.status === 'หมด' ? 'สินค้าหมด' : p.status === 'วัตถุดิบไม่เพียงพอ' ? 'วัตถุดิบไม่พอ' : 'สั่งซื้อ'}</button>
                                    </div>
                                </div>
                            </article>
                        ))}
                        {list.length === 0 && (
                            <div className="op-empty">ไม่พบเมนูที่ค้นหา</div>
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
                />
            </div>
        </div>
    )
}

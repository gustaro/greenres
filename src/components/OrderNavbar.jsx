import { Navbar } from './Navbar'

export function OrderNavbar({ categories, activeCategory, onCategoryChange, user, onAuth, onLogout, cartCount, onCheckout }) {
    return (
        <header className="on-header">
            {/* ── Row 1: original Navbar (same as home page) ── */}
            <Navbar
                onOrder={() => { }}
                user={user}
                onAuth={onAuth}
                onLogout={onLogout}
                cartCount={cartCount}
                onCart={onCheckout}
            />

            {/* ── Row 2: green category tabs ── */}
            <nav className="on-cattabs">
                <div className="on-cattabs-inner">
                    {categories.map(c => (
                        <button
                            key={c.id}
                            className={activeCategory === c.id ? 'active' : ''}
                            onClick={() => onCategoryChange(c.id)}
                        >
                            {c.label}
                        </button>
                    ))}
                </div>
            </nav>
        </header>
    )
}


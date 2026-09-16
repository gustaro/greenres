import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import './Navbar.css'

const nav = ['หน้าแรก', 'สั่งอาหาร', 'โปรโมชั่น', 'เมนูแนะนำ', 'แผนที่ร้าน']

export function Brand({ compact = false }) {
    const navigate = useNavigate()
    const { settings } = useAuth()
    const goHome = () => {
        navigate('/')
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }
    return (
        <button
            className={`brand ${compact ? 'compact' : ''}`}
            onClick={goHome}
            aria-label={`${settings?.siteName || 'LimeLeaf'} home`}
        >
            {settings?.logoUrl ? <img src={settings.logoUrl} alt="Logo" style={{ width: 44, height: 44, objectFit: 'contain', borderRadius: 8 }} /> : <span className="brand-mark"><i /><i /></span>}
            {!compact && <span className="brand-name"><b>{settings?.siteName || 'LimeLeaf'}</b><small>KITCHEN</small></span>}
        </button>
    )
}

export function Navbar({ onOrder, user, onAuth, onLogout, cartCount, onCart, breadcrumbs, transparent }) {
    const navigate = useNavigate()
    const [menuOpen, setMenuOpen] = useState(false)
    const [scrolled, setScrolled] = useState(false)

    useEffect(() => {
        const closeMenu = event => {
            if (event.key === 'Escape') setMenuOpen(false)
        }
        const handleScroll = () => {
            setScrolled(window.scrollY > 10)
        }
        window.addEventListener('keydown', closeMenu)
        window.addEventListener('scroll', handleScroll, { passive: true })
        // Trigger initial check
        handleScroll()

        return () => {
            window.removeEventListener('keydown', closeMenu)
            window.removeEventListener('scroll', handleScroll)
        }
    }, [])

    const handleNav = (index) => {
        setMenuOpen(false)
        if (index === 0) { // หน้าแรก
            if (window.location.pathname !== '/') {
                navigate('/')
            } else {
                window.scrollTo({ top: 0, behavior: 'smooth' })
            }
        } else if (index === 1) { // สั่งอาหาร
            onOrder()
        } else if (index === 2) { // โปรโมชั่น
            if (window.location.pathname !== '/') navigate('/')
            setTimeout(() => document.getElementById('promotions')?.scrollIntoView({ behavior: 'smooth' }), 100)
        } else if (index === 3) { // เมนูแนะนำ
            if (window.location.pathname !== '/') navigate('/')
            setTimeout(() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' }), 100)
        } else if (index === 4) { // แผนที่ร้าน
            // currently there is no map section, but we can scroll to footer or open a link
            window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
        }
    }

    return (
        <header className={`floating-header${transparent ? ' transparent' : ''}${breadcrumbs ? ' has-breadcrumb' : ''}${menuOpen ? ' menu-open' : ''}`}>
            <div className="nav-shell">
                <Brand compact />
                <button
                    className="menu-toggle"
                    type="button"
                    aria-label={menuOpen ? 'ปิดเมนู' : 'เปิดเมนู'}
                    aria-expanded={menuOpen}
                    aria-controls="responsive-navigation"
                    onClick={() => setMenuOpen(open => !open)}
                >
                    <span />
                    <span />
                    <span />
                </button>
                <nav className="main-nav">
                    {nav.map((x, i) => (
                        <button
                            key={x}
                            onClick={() => handleNav(i)}
                        >
                            {x}
                        </button>
                    ))}
                </nav>
                <button className="lang">ENG <i className="bi bi-arrow-down-short"></i></button>
                <button className="profile" onClick={user ? () => navigate('/profile') : onAuth} title={user ? 'โปรไฟล์' : 'เข้าสู่ระบบ'}>
                    <i className="bi bi-person-circle" style={{ fontSize: 24 }}></i>
                    {user && <span className="logged-dot" />}
                </button>
                <button className="cart-head" onClick={onCart} title="Cart">
                    <i className="bi bi-cart" style={{ fontSize: 24 }}></i>
                    {cartCount > 0 && <b>{cartCount}</b>}
                </button>
                {user?.points > 0 && <div className="points-badge" title="แต้มสะสม" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: '#0f9e1e', fontWeight: 700 }}><i className="bi bi-star-fill" style={{ color: '#ffc107' }}></i>{user.points}</div>}
            </div>

            <nav id="responsive-navigation" className="responsive-nav" aria-hidden={!menuOpen}>
                <div className="responsive-nav-links">
                    {nav.map((item, index) => (
                        <button key={item} onClick={() => handleNav(index)}>{item}</button>
                    ))}
                </div>
                <button className="responsive-lang" onClick={() => setMenuOpen(false)}>Language: ENG</button>
            </nav>
            {menuOpen && <button className="nav-backdrop" aria-label="ปิดเมนู" onClick={() => setMenuOpen(false)} />}

            {breadcrumbs && (
                <nav className="breadcrumb-bar">
                    <button className="breadcrumb-item" onClick={() => navigate('/')}>
                        <i className="bi bi-house-door-fill" style={{ fontSize: 16, color: '#fff', verticalAlign: 'middle' }}></i>
                    </button>
                    {breadcrumbs.map((crumb, i) => (
                        <span key={i} className="breadcrumb-item">
                            <span className="breadcrumb-sep">&rsaquo;</span>
                            {crumb.to
                                ? <button onClick={() => navigate(crumb.to)}>{crumb.label}</button>
                                : <span className="breadcrumb-current">{crumb.label}</span>
                            }
                        </span>
                    ))}
                </nav>
            )}
        </header>
    )
}

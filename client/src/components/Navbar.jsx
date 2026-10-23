import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { useLanguage } from '../lib/LanguageContext'
import { normalizeRole } from '../lib/database'
import './Navbar.css'

const navItems = [
    { key: 'navHome', index: 0 },
    { key: 'navPromotions', index: 2 },
    { key: 'navRecommended', index: 3 },
    { key: 'navOrder', index: 1 },
    { key: 'navMap', index: 4 },
]

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
    const { profile, session } = useAuth()
    const { lang, t, toggleLang } = useLanguage()
    const [menuOpen, setMenuOpen] = useState(false)
    const [scrolled, setScrolled] = useState(false)
    const menuToggleRef = useRef(null)

    const closeMenu = () => {
        menuToggleRef.current?.focus({ preventScroll: true })
        setMenuOpen(false)
    }

    const currentUser = user || profile || (session ? { name: session.user?.email } : null)
    const avatarUrl = user?.avatarUrl || profile?.avatarUrl
    const userRole = normalizeRole(profile?.role || user?.role || session?.user?.role)
    const isOperational = ['admin', 'cashier', 'kitchen', 'delivery'].includes(userRole)

    const roleConfigs = {
        admin: {
            path: '/admin',
            title: lang === 'th' ? 'พอร์ทัลแอดมิน' : 'Admin Portal',
            shortTitle: lang === 'th' ? 'แอดมิน' : 'Admin',
            icon: 'bi bi-speedometer2',
        },
        cashier: {
            path: '/cashier',
            title: lang === 'th' ? 'พอร์ทัลแคชเชียร์' : 'Cashier Portal',
            shortTitle: lang === 'th' ? 'แคชเชียร์' : 'Cashier',
            icon: 'bi bi-cash-coin',
        },
        kitchen: {
            path: '/kitchen',
            title: lang === 'th' ? 'พอร์ทัลห้องครัว' : 'Kitchen Portal',
            shortTitle: lang === 'th' ? 'ห้องครัว' : 'Kitchen',
            icon: 'bi bi-fire',
        },
        delivery: {
            path: '/delivery',
            title: lang === 'th' ? 'พอร์ทัลไรเดอร์' : 'Rider Portal',
            shortTitle: lang === 'th' ? 'ไรเดอร์' : 'Rider',
            icon: 'bi bi-bicycle',
        },
    }

    useEffect(() => {
        const handleKeydown = event => {
            if (event.key === 'Escape') closeMenu()
        }
        const handleScroll = () => {
            setScrolled(window.scrollY > 10)
        }
        window.addEventListener('keydown', handleKeydown)
        window.addEventListener('scroll', handleScroll, { passive: true })
        // Trigger initial check
        handleScroll()

        return () => {
            window.removeEventListener('keydown', handleKeydown)
            window.removeEventListener('scroll', handleScroll)
        }
    }, [])

    const handleNav = (index) => {
        closeMenu()
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
            navigate('/map')
        }
    }

    return (
        <header className={`floating-header${transparent ? ' transparent' : ''}${breadcrumbs ? ' has-breadcrumb' : ''}${menuOpen ? ' menu-open' : ''}${scrolled ? ' is-scrolled' : ''}`}>
            <div className="nav-shell">
                <Brand compact />
                <button
                    ref={menuToggleRef}
                    className="menu-toggle"
                    type="button"
                    aria-label={menuOpen ? t('navCloseMenu') : t('navOpenMenu')}
                    aria-expanded={menuOpen}
                    aria-controls="responsive-navigation"
                    onClick={() => menuOpen ? closeMenu() : setMenuOpen(true)}
                >
                    <span />
                    <span />
                    <span />
                </button>
                <nav className="main-nav">
                    {navItems.map((item) => (
                        <button
                            type="button"
                            key={item.key}
                            onClick={() => handleNav(item.index)}
                        >
                            {t(item.key)}
                        </button>
                    ))}
                    {isOperational && roleConfigs[userRole] && (
                        <button
                            type="button"
                            className="nav-role-badge"
                            onClick={() => navigate(roleConfigs[userRole].path)}
                            title={roleConfigs[userRole].title}
                        >
                            <i className={roleConfigs[userRole].icon} />
                            <span>{roleConfigs[userRole].shortTitle}</span>
                        </button>
                    )}
                </nav>
                <button
                    type="button"
                    className="lang"
                    onClick={toggleLang}
                    title={lang === 'th' ? 'Switch to English' : 'เปลี่ยนเป็นภาษาไทย'}
                    aria-label={t('currentLangLabel')}
                >
                    <i className="bi bi-globe2" style={{ fontSize: 13, marginRight: 4 }}></i>
                    {lang === 'th' ? 'ENG' : 'ไทย'}
                </button>
                <button type="button" className="profile" onClick={currentUser ? () => navigate('/profile') : onAuth} title={currentUser ? t('navProfile') : t('navLogin')}>
                    {avatarUrl ? (
                        <img src={avatarUrl} alt={currentUser?.name || 'User'} className="nav-avatar-img" />
                    ) : (
                        <i className="bi bi-person-circle" style={{ fontSize: 24 }}></i>
                    )}
                    {currentUser && <span className="logged-dot" />}
                </button>
                <button type="button" className="cart-head" onClick={onCart} title={t('navCart')}>
                    <i className="bi bi-cart" style={{ fontSize: 24 }}></i>
                    {cartCount > 0 && <b>{cartCount}</b>}
                </button>
            </div>

            <nav id="responsive-navigation" className="responsive-nav" aria-hidden={!menuOpen}>
                <div className="responsive-nav-links">
                    {isOperational && roleConfigs[userRole] && (
                        <div className="responsive-role-section">
                            <button
                                type="button"
                                className="responsive-role-btn main-role"
                                onClick={() => { closeMenu(); navigate(roleConfigs[userRole].path); }}
                            >
                                <i className={roleConfigs[userRole].icon} />
                                <span>{roleConfigs[userRole].title}</span>
                                <small className="role-tag">{userRole.toUpperCase()}</small>
                            </button>
                            {userRole === 'admin' && (
                                <div className="responsive-sub-roles">
                                    <button type="button" onClick={() => { closeMenu(); navigate('/cashier'); }}>
                                        <i className="bi bi-cash-coin" /> แคชเชียร์
                                    </button>
                                    <button type="button" onClick={() => { closeMenu(); navigate('/kitchen'); }}>
                                        <i className="bi bi-fire" /> ครัว
                                    </button>
                                    <button type="button" onClick={() => { closeMenu(); navigate('/delivery'); }}>
                                        <i className="bi bi-bicycle" /> ไรเดอร์
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                    {navItems.map((item) => (
                        <button type="button" key={item.key} onClick={() => handleNav(item.index)}>{t(item.key)}</button>
                    ))}
                </div>
                <button type="button" className="responsive-lang" onClick={() => { closeMenu(); toggleLang(); }}>
                    <i className="bi bi-globe2" style={{ marginRight: 6 }}></i>
                    {lang === 'th' ? 'Language: Switch to English (ENG)' : 'ภาษา: เปลี่ยนเป็นภาษาไทย (TH)'}
                </button>
            </nav>
            {menuOpen && <button type="button" className="nav-backdrop" aria-label="ปิดเมนู" onClick={closeMenu} />}

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

import { useNavigate } from 'react-router-dom'
import { Brand } from './Navbar'
import { useAuth } from '../lib/AuthContext'
import { useLanguage } from '../lib/LanguageContext'

export const Footer = () => {
    const { settings } = useAuth()
    const { isEn, t } = useLanguage()
    const navigate = useNavigate()

    // Navigate to a route or scroll to an anchor on the homepage
    const goTo = (to, anchor) => {
        if (anchor) {
            if (window.location.pathname !== '/') {
                navigate('/')
                setTimeout(() => document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth' }), 150)
            } else {
                document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth' })
            }
        } else if (to) {
            navigate(to)
            window.scrollTo({ top: 0, behavior: 'smooth' })
        }
    }

    // Mapped footer links: { label, to?, anchor? }
    // to    = react-router path
    // anchor = element id to scrollIntoView on the homepage
    const footerSections = [
        {
            heading: isEn ? 'Explore' : 'สำรวจ',
            links: [
                { label: isEn ? 'Home' : 'หน้าแรก',          to: '/' },
                { label: isEn ? 'Order Food' : 'สั่งอาหาร',   to: '/order' },
                { label: isEn ? 'Promotions' : 'โปรโมชั่น',   anchor: 'promotions' },
                { label: isEn ? 'Popular Menu' : 'เมนูยอดนิยม', anchor: 'about' },
            ],
        },
        {
            heading: isEn ? 'Services' : 'บริการ',
            links: [
                { label: isEn ? 'Store Map' : 'แผนที่ร้าน',    to: '/map' },
                { label: isEn ? 'My Profile' : 'โปรไฟล์',      to: '/profile' },
                { label: isEn ? 'Order History' : 'ประวัติสั่งซื้อ', to: '/profile' },
                { label: isEn ? 'Points & Rewards' : 'แต้มสะสม',  to: '/profile' },
            ],
        },
        {
            heading: isEn ? 'Info' : 'ข้อมูลร้าน',
            links: [
                { label: isEn ? 'Contact Us' : 'ติดต่อร้าน',    to: '/map' },
                { label: isEn ? 'Delivery Info' : 'ข้อมูลจัดส่ง',  anchor: 'promotions' },
                { label: isEn ? 'Catering' : 'จัดเลี้ยง / Catering', to: '/order' },
                { label: isEn ? 'Opening Hours' : 'เวลาทำการ',    to: '/map' },
            ],
        },
    ]

    return (
        <footer className="site-footer">
            <div className="footer-inner">
                <div className="footer-brand">
                    <Brand />
                    <p style={{ marginBottom: 12, whiteSpace: 'pre-line' }}>
                        {settings?.footerDescription || t('footerAbout')}
                    </p>
                    <div style={{ fontSize: 13, opacity: 0.8, lineHeight: 1.6, marginBottom: 16 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}><i className="bi bi-geo-alt-fill"></i> <span>{settings?.restaurantAddress || 'กรุงเทพมหานคร'}</span></div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}><i className="bi bi-telephone-fill"></i> <a href={`tel:${settings?.restaurantPhone}`} style={{ color: 'inherit', textDecoration: 'none' }}>{settings?.restaurantPhone || '02-123-4567'}</a></div>
                    </div>
                    <div className="footer-socials">
                        {settings?.facebookUrl && <a href={settings.facebookUrl} target="_blank" rel="noopener noreferrer" aria-label="Facebook" style={{ display: 'inline-flex', width: 32, height: 32, overflow: 'hidden', borderRadius: 4 }}><img src="/assets/social/facebook.png" alt="Facebook" style={{ width: 52, height: 52, margin: '-10px' }} /></a>}
                        {settings?.instagramUrl && <a href={settings.instagramUrl} target="_blank" rel="noopener noreferrer" aria-label="Instagram"><img src="/assets/social/instagram.png" alt="Instagram" style={{ width: 32, height: 32 }} /></a>}
                        {settings?.lineUrl && <a href={settings.lineUrl} target="_blank" rel="noopener noreferrer" aria-label="LINE"><img src="/assets/social/line.png" alt="LINE" style={{ width: 32, height: 32 }} /></a>}
                    </div>
                </div>

                <div className="footer-links">
                    {footerSections.map(section => (
                        <div key={section.heading} className="footer-col">
                            <h4>{section.heading}</h4>
                            <ul>
                                {section.links.map(link => (
                                    <li key={link.label}>
                                        <button
                                            onClick={() => goTo(link.to, link.anchor)}
                                            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: 'inherit' }}
                                        >
                                            {link.label}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </div>

            <div className="footer-bottom">
                <small>{settings?.footerCopyright || `© ${new Date().getFullYear()} ${settings?.siteName || 'LimeLeaf'} Kitchen. All rights reserved.`}</small>
                <small>Made with <i className="bi bi-heart-fill" style={{ color: '#ef4444', margin: '0 4px', fontSize: 11 }} /> in Thailand</small>
            </div>
        </footer>
    )
}

import { Link } from 'react-router-dom'
import { Brand } from './Navbar'
import { useAuth } from '../lib/AuthContext'

const footerLinks = {
    'เมนู': ['Delivery', 'Catering', 'Party Box', 'DIY Workshop'],
    'บริการ': ['Store Location', 'Delivery Area', 'Multi-Function Room', 'News'],
    'บริษัท': ['About Us', 'Careers', 'Privacy Policy', 'Terms of Use'],
}

export const Footer = () => {
    const { settings } = useAuth()

    return (
        <footer className="site-footer">
            <div className="footer-inner">
                <div className="footer-brand">
                    <Brand />
                    <p style={{ marginBottom: 12 }}>อาหารไทยและฟิวชั่น ทำสดทุกออเดอร์<br />ส่งตรงถึงบ้านทุกวัน</p>
                    <div style={{ fontSize: 13, opacity: 0.8, lineHeight: 1.6, marginBottom: 16 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}><i className="bi bi-geo-alt-fill"></i> <span>{settings?.restaurantAddress}</span></div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}><i className="bi bi-telephone-fill"></i> <a href={`tel:${settings?.restaurantPhone}`} style={{ color: 'inherit', textDecoration: 'none' }}>{settings?.restaurantPhone}</a></div>
                    </div>
                    <div className="footer-socials">
                        {settings?.facebookUrl && <a href={settings.facebookUrl} target="_blank" rel="noopener noreferrer" aria-label="Facebook" style={{ display: 'inline-flex', width: 32, height: 32, overflow: 'hidden', borderRadius: 4 }}><img src="/assets/social/facebook.png" alt="Facebook" style={{ width: 52, height: 52, margin: '-10px' }} /></a>}
                        {settings?.instagramUrl && <a href={settings.instagramUrl} target="_blank" rel="noopener noreferrer" aria-label="Instagram"><img src="/assets/social/instagram.png" alt="Instagram" style={{ width: 32, height: 32 }} /></a>}
                        {settings?.lineUrl && <a href={settings.lineUrl} target="_blank" rel="noopener noreferrer" aria-label="LINE"><img src="/assets/social/line.png" alt="LINE" style={{ width: 32, height: 32 }} /></a>}
                    </div>
                </div>

                <div className="footer-links">
                    {Object.entries(footerLinks).map(([group, items]) => (
                        <div key={group} className="footer-col">
                            <h4>{group}</h4>
                            <ul>
                                {items.map(item => <li key={item}><a href="#">{item}</a></li>)}
                            </ul>
                        </div>
                    ))}
                </div>
            </div>

            <div className="footer-bottom">
                <small>© {new Date().getFullYear()} {settings?.siteName || 'LimeLeaf'} Kitchen. All rights reserved.</small>
                <small>Made with 🌿 in Thailand</small>
            </div>
        </footer>
    )
}

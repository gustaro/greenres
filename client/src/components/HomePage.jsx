import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Navbar } from './Navbar'
import { Footer } from './Footer'
import { fetchMarketing, fetchPopularProducts, fetchNewProducts } from '../lib/database'
import { useLanguage } from '../lib/LanguageContext'
import './HomePage.css'

const fallbackProducts = [
    { id: 1, name: 'ข้าวกะเพราไก่กรอบ', en: 'Crispy Basil Chicken Rice', price: 119, img: '/assets/basil-rice.png' },
    { id: 2, name: 'สปาเกตตีต้มยำกุ้ง', en: 'Tom Yum Prawn Spaghetti', price: 159, img: '/assets/pad-thai.png' },
    { id: 3, name: 'ข้าวแกงเขียวหวานไก่ย่าง', en: 'Green Curry Grilled Chicken', price: 145, img: '/assets/green-curry.png' },
    { id: 4, name: 'ลาบไก่ควินัวโบวล์', en: 'Larb Quinoa Bowl', price: 169, img: '/assets/larb.png' },
    { id: 5, name: 'ชีสเค้กข้าวเหนียวมะม่วง', en: 'Mango Sticky Rice Cheesecake', price: 109, img: '/assets/mango-sticky-rice.png' },
    { id: 6, name: 'ชาไทยมะนาวโซดา', en: 'Thai Tea Lemon Soda', price: 79, img: '/assets/lemon-tea.png' },
]

const fallbackSlides = [
    { id: 'default-1', eyebrow: 'LIMELEAF CATERING', eyebrowEn: 'LIMELEAF CATERING', title: 'สดใหม่ทุกโอกาส', titleEn: 'Fresh for Every Occasion', description: 'บริการจัดเลี้ยงอาหารไทยและฟิวชั่น สำหรับประชุม งานเลี้ยง และอีเวนต์', descriptionEn: 'Thai & fusion catering service for meetings, parties, and events', buttonLabel: 'สั่งเลย', buttonLabelEn: 'Order Now', buttonLink: '/order', imageUrl: '/assets/hero-food.png', backgroundColor: '#b8ff35' },
    { id: 'default-2', eyebrow: 'FRESH FUSION', eyebrowEn: 'FRESH FUSION', title: 'อร่อยง่าย ได้ทุกวัน', titleEn: 'Simply Delicious Every Day', description: 'เมนูจานเดียว ของทานเล่น และเครื่องดื่ม ส่งตรงถึงบ้าน', descriptionEn: 'Single dishes, appetizers, and beverages delivered to your doorstep', buttonLabel: 'ดูเมนู', buttonLabelEn: 'View Menu', buttonLink: '/order', imageUrl: '/assets/pad-thai.png', backgroundColor: '#b8ff35' },
    { id: 'default-3', eyebrow: 'PARTY BOX', eyebrowEn: 'PARTY BOX', title: 'ครบอร่อยในกล่องเดียว', titleEn: 'Complete Flavor in One Box', description: 'เลือกเมนูได้หลายแบบ เหมาะกับทีมเล็กหรือปาร์ตี้ใหญ่', descriptionEn: 'Various set options, ideal for small teams or large parties', buttonLabel: 'เลือกชุดอาหาร', buttonLabelEn: 'Choose Sets', buttonLink: '/order', imageUrl: '/assets/green-curry.png', backgroundColor: '#b8ff35' },
]

const fallbackPromotions = [
    { id: 'promo-1', code: 'LIME20', title: 'สมาชิกใหม่ลดทันที', titleEn: 'New Member Instant Discount', description: 'รับส่วนลด 20% สำหรับออเดอร์แรก', descriptionEn: 'Get 20% off on your first order', discountValue: 20, imageUrl: '/assets/basil-rice.png', buttonLabel: 'รับโปรนี้', buttonLabelEn: 'Claim Deal', buttonLink: '/order' },
    { id: 'promo-2', code: 'FRESH SET', title: 'เซตอิ่มคุ้มทุกวัน', titleEn: 'Daily Value Meal Set', description: 'จับคู่เมนูจานหลักและเครื่องดื่มในราคาพิเศษ', descriptionEn: 'Pair main dishes and drinks at a special price', discountValue: 15, imageUrl: '/assets/pad-thai.png', buttonLabel: 'ดูเซตสุดคุ้ม', buttonLabelEn: 'View Set', buttonLink: '/order' },
    { id: 'promo-3', code: 'MEMBER', title: 'สะสมแต้ม แลกความอร่อย', titleEn: 'Earn Points for Rewards', description: 'ทุกยอดสั่งซื้อรับคะแนนสมาชิกสำหรับครั้งถัดไป', descriptionEn: 'Earn member points on every order for your next meal', discountValue: 10, imageUrl: '/assets/mango-sticky-rice.png', buttonLabel: 'เริ่มสะสมแต้ม', buttonLabelEn: 'Start Earning', buttonLink: '/order' },
]


export function HomePage({ onOrder, user, onAuth, onLogout, cartCount, onCart }) {
    const navigate = useNavigate()
    const { lang, isEn, t } = useLanguage()
    const [slide, setSlide] = useState(0)
    const [heroSlides, setHeroSlides] = useState(fallbackSlides)
    const [promotions, setPromotions] = useState([])
    const [popularProducts, setPopularProducts] = useState([])
    const [newProducts, setNewProducts] = useState([])
    const [marketingLoading, setMarketingLoading] = useState(true)
    const [popularLoading, setPopularLoading] = useState(true)
    const [newLoading, setNewLoading] = useState(true)
    const [manualPause, setManualPause] = useState(false)
    const [interactionPause, setInteractionPause] = useState(false)
    const [reducedMotion, setReducedMotion] = useState(false)

    useEffect(() => {
        let active = true
        const loadMarketing = () => fetchMarketing().then(data => {
            if (!active) return
            if (data.heroSlides?.length) setHeroSlides(data.heroSlides)
            else setHeroSlides(fallbackSlides)

            if (data.promotions?.length) setPromotions(data.promotions)
            else setPromotions(fallbackPromotions)
        }).catch(error => {
            if (!active) return
            console.error('[Marketing]', error)
            setHeroSlides(fallbackSlides)
            setPromotions(fallbackPromotions)
        }).finally(() => { if (active) setMarketingLoading(false) })

        const loadProducts = () => {
            const p1 = fetchPopularProducts(4).then(data => {
                if (!active) return
                if (data?.length) setPopularProducts(data)
                else setPopularProducts(fallbackProducts.slice(0, 4))
            }).catch(() => { if (active) setPopularProducts(fallbackProducts.slice(0, 4)) })
                .finally(() => { if (active) setPopularLoading(false) })

            const p2 = fetchNewProducts(4).then(data => {
                if (!active) return
                if (data?.length) setNewProducts(data)
                else setNewProducts(fallbackProducts.slice(0, 4))
            }).catch(() => { if (active) setNewProducts(fallbackProducts.slice(0, 4)) })
                .finally(() => { if (active) setNewLoading(false) })

            return Promise.all([p1, p2])
        }

        loadMarketing()
        loadProducts()

        const timer = window.setInterval(loadMarketing, 30000)
        return () => {
            active = false
            window.clearInterval(timer)
        }
    }, [])

    useEffect(() => {
        const media = window.matchMedia('(prefers-reduced-motion: reduce)')
        const updatePreference = () => setReducedMotion(media.matches)
        updatePreference()
        media.addEventListener?.('change', updatePreference)
        return () => media.removeEventListener?.('change', updatePreference)
    }, [])

    useEffect(() => {
        if (slide >= heroSlides.length) setSlide(0)
    }, [heroSlides.length, slide])

    useEffect(() => {
        if (heroSlides.length < 2 || manualPause || interactionPause || reducedMotion) return undefined
        const timer = window.setInterval(() => setSlide(current => (current + 1) % heroSlides.length), 6000)
        return () => window.clearInterval(timer)
    }, [heroSlides.length, interactionPause, manualPause, reducedMotion])

    const goTo = link => {
        if (!link || link === '/order') return onOrder()
        if (link.startsWith('http')) return window.open(link, '_blank', 'noopener,noreferrer')
        navigate(link)
    }

    const goToProduct = product => navigate(`/order?product=${encodeURIComponent(product.id)}`)
    const claimPromotion = promotion => {
        if (promotion.code) sessionStorage.setItem('limeleaf_pending_promo', promotion.code)
        const link = promotion.buttonLink || '/order'
        if (link === '/order') navigate(`/order?promo=${encodeURIComponent(promotion.code || '')}`)
        else goTo(link)
    }
    const formatExpiry = value => value
        ? new Intl.DateTimeFormat(isEn ? 'en-GB' : 'th-TH', { dateStyle: 'medium' }).format(new Date(value))
        : ''
    const renderProductSkeletons = prefix => Array.from({ length: 4 }, (_, index) => (
        <article className="home-product-skeleton" key={`${prefix}-${index}`} aria-hidden="true">
            <span className="home-skeleton-image home-skeleton" />
            <div><span className="home-skeleton line wide" /><span className="home-skeleton line" /><span className="home-skeleton button" /></div>
        </article>
    ))

    const currentSlide = heroSlides[slide] || fallbackSlides[0]
    const isAltTone = slide % 2 === 1
    return <>
        <Navbar onOrder={onOrder} user={user} onAuth={onAuth} onLogout={onLogout} cartCount={cartCount} onCart={onCart} transparent />
        <main className="home-page">
            <section
                className={`hero-home ${isAltTone ? 'hero-tone-highlight' : 'hero-tone-accent'}`}
                aria-roledescription="carousel"
                aria-label={t('promotionsTitle')}
                onFocusCapture={() => setInteractionPause(true)}
                onBlurCapture={event => {
                    if (!event.currentTarget.contains(event.relatedTarget)) setInteractionPause(false)
                }}
            >
                <div className="hero-slide" key={currentSlide.id}>
                    <div className="hero-copy">
                        <span>{(isEn && currentSlide.eyebrowEn) ? currentSlide.eyebrowEn : currentSlide.eyebrow}</span>
                        <h1>{(isEn && currentSlide.titleEn) ? currentSlide.titleEn : currentSlide.title}</h1>
                        <p>{(isEn && currentSlide.descriptionEn) ? currentSlide.descriptionEn : currentSlide.description}</p>
                        <button onClick={() => goTo(currentSlide.buttonLink)}>
                            {(isEn && currentSlide.buttonLabelEn) ? currentSlide.buttonLabelEn : (currentSlide.buttonLabel || (isEn ? 'Order Now' : 'สั่งเลย'))} <i className="bi bi-arrow-right ms-2" />
                        </button>
                    </div>
                    <div className="hero-picture">
                        <span className="hero-picture-glow" />
                        <div className="hero-picture-frame">
                            <img src={currentSlide.imageUrl || '/assets/hero-food.png'} alt={(isEn && currentSlide.titleEn) ? currentSlide.titleEn : currentSlide.title} width="896" height="560" decoding="async" fetchPriority="high" />
                        </div>
                    </div>
                </div>
                {heroSlides.length > 1 && (
                    <div className="hero-dots" aria-label={isEn ? 'Choose slide' : 'เลือกสไลด์'}>
                        {heroSlides.map((item, index) => (
                            <button
                                key={item.id}
                                className={slide === index ? 'active' : ''}
                                onClick={() => setSlide(index)}
                                aria-label={isEn ? `Slide ${index + 1}` : `สไลด์ ${index + 1}`}
                                aria-current={slide === index}
                            />
                        ))}
                        {!reducedMotion && <button
                            className="hero-pause"
                            onClick={() => setManualPause(value => !value)}
                            aria-pressed={manualPause}
                            aria-label={manualPause ? (isEn ? 'Play slides' : 'เล่นสไลด์') : (isEn ? 'Pause slides' : 'หยุดสไลด์ชั่วคราว')}
                        ><i className={`bi ${manualPause ? 'bi-play-fill' : 'bi-pause-fill'}`} /></button>}
                    </div>
                )}
            </section>

            <section className="promotion-section" id="promotions">
                <div className="promotion-heading"><div><small>LIMELEAF DEALS</small><h2>{t('promotionsTitle')}</h2></div></div>
                <div className="promotion-grid">
                    {marketingLoading && Array.from({ length: 3 }, (_, index) => <article className="promotion-skeleton" key={index} aria-hidden="true"><span className="home-skeleton line wide" /><span className="home-skeleton promo" /></article>)}
                    {promotions.map(promotion => {
                        const promoTitle = (isEn && promotion.titleEn) ? promotion.titleEn : promotion.title
                        const promoDesc = (isEn && promotion.descriptionEn) ? promotion.descriptionEn : promotion.description
                        const promoBtn = (isEn && promotion.buttonLabelEn) ? promotion.buttonLabelEn : (promotion.buttonLabel || t('claimOffer'))
                        return (
                            <article key={promotion.id}>
                                <h3>{promoTitle}</h3>
                                <div className="promotion-mini-card">
                                    <div className="promotion-image"><img src={promotion.imageUrl || '/assets/hero-food.png'} alt={promoTitle} width="420" height="280" loading="lazy" decoding="async" /><span>{promotion.discountType === 'FIXED' ? `฿${promotion.discountValue}` : (promotion.discountValue ? `${promotion.discountValue}%` : promotion.code)}</span></div>
                                    <div className="promotion-copy">
                                        <small>{promotion.code}</small><p>{promoDesc}</p>
                                        <div className="promotion-meta">
                                            {promotion.minOrderAmount > 0 && <span>{isEn ? `Min. ฿${promotion.minOrderAmount}` : `ขั้นต่ำ ฿${promotion.minOrderAmount}`}</span>}
                                            {promotion.expiresAt && <span>{isEn ? 'Until' : 'ถึง'} {formatExpiry(promotion.expiresAt)}</span>}
                                        </div>
                                        <button onClick={() => claimPromotion(promotion)}>{promoBtn}</button>
                                    </div>
                                </div>
                            </article>
                        )
                    })}
                </div>
            </section>

            <section className="home-service-strip" id="delivery-info" aria-label={isEn ? 'Ordering services' : 'บริการสั่งอาหาร'}>
                <article><i className="bi bi-bicycle" /><div><strong>{isEn ? 'Delivery' : 'จัดส่งถึงบ้าน'}</strong><span>{isEn ? 'Track every order from kitchen to your door' : 'ติดตามออเดอร์ตั้งแต่ครัวจนถึงหน้าบ้าน'}</span></div></article>
                <article><i className="bi bi-bag-check" /><div><strong>{isEn ? 'Store Pickup' : 'รับเองที่ร้าน'}</strong><span>{isEn ? 'Order ahead and collect when ready' : 'สั่งล่วงหน้าแล้วมารับเมื่อพร้อม'}</span></div></article>
                <article><i className="bi bi-people" /><div><strong>{isEn ? 'Catering' : 'จัดเลี้ยง'}</strong><span>{isEn ? 'Flexible sets for meetings and events' : 'เลือกชุดอาหารได้ตามขนาดงาน'}</span></div></article>
            </section>

            <section className="food-preview menu-frame" id="about">
                <div className="preview-head">
                    <div className="preview-title-frame">
                        <span className="preview-title-icon" aria-hidden="true"><i className="bi bi-star-fill" /></span>
                        <div><small>{t('popularEyebrow')}</small><h2>{t('popularMenu')}</h2></div>
                    </div>
                    <button onClick={onOrder}>{t('viewAllMenu')} <i className="bi bi-arrow-right" /></button>
                </div>
                <div className="preview-grid">
                    {popularLoading && renderProductSkeletons('popular')}
                    {popularProducts.map(product => {
                        const mainTitle = isEn && product.en ? product.en : product.name
                        const subTitle = isEn && product.en ? product.name : (product.en || '')
                        return (
                            <article key={`pop-${product.id}`}>
                                <img src={product.img || '/assets/basil-rice.png'} alt={mainTitle} width="400" height="300" loading="lazy" decoding="async" />
                                <div>
                                    <h3>{mainTitle}</h3>
                                    <small className="preview-product-subtitle">{subTitle}</small>
                                    {product.description && <p className="preview-product-description">{product.description}</p>}
                                    <strong>฿{product.price}</strong>
                                    <button onClick={() => goToProduct(product)}>{t('orderNow')}</button>
                                </div>
                            </article>
                        )
                    })}
                </div>
            </section>

            <section className="food-preview menu-frame menu-frame-new">
                <div className="preview-head">
                    <div className="preview-title-frame">
                        <span className="preview-title-icon" aria-hidden="true"><i className="bi bi-stars" /></span>
                        <div><small>{t('newReleasesEyebrow')}</small><h2>{t('newReleases')}</h2></div>
                    </div>
                    <button onClick={onOrder}>{t('viewAllMenu')} <i className="bi bi-arrow-right" /></button>
                </div>
                <div className="preview-grid">
                    {newLoading && renderProductSkeletons('new')}
                    {newProducts.map(product => {
                        const mainTitle = isEn && product.en ? product.en : product.name
                        const subTitle = isEn && product.en ? product.name : (product.en || '')
                        return (
                            <article key={`new-${product.id}`}>
                                <img src={product.img || '/assets/basil-rice.png'} alt={mainTitle} width="400" height="300" loading="lazy" decoding="async" />
                                <div>
                                    <h3>{mainTitle}</h3>
                                    <small className="preview-product-subtitle">{subTitle}</small>
                                    {product.description && <p className="preview-product-description">{product.description}</p>}
                                    <strong>฿{product.price}</strong>
                                    <button onClick={() => goToProduct(product)}>{t('orderNow')}</button>
                                </div>
                            </article>
                        )
                    })}
                </div>
            </section>
        </main>
        <Footer />
    </>
}

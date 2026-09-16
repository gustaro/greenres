import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Navbar } from './Navbar'
import { Footer } from './Footer'
import { fetchMarketing, fetchPopularProducts, fetchNewProducts } from '../lib/database'
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
    { id: 'default-1', eyebrow: 'LIMELEAF CATERING', title: 'สดใหม่ทุกโอกาส', description: 'บริการจัดเลี้ยงอาหารไทยและฟิวชั่น สำหรับประชุม งานเลี้ยง และอีเวนต์', buttonLabel: 'สั่งเลย', buttonLink: '/order', imageUrl: '/assets/hero-food.png', backgroundColor: '#b8ff35' },
    { id: 'default-2', eyebrow: 'FRESH FUSION', title: 'อร่อยง่าย ได้ทุกวัน', description: 'เมนูจานเดียว ของทานเล่น และเครื่องดื่ม ส่งตรงถึงบ้าน', buttonLabel: 'ดูเมนู', buttonLink: '/order', imageUrl: '/assets/pad-thai.png', backgroundColor: '#b8ff35' },
    { id: 'default-3', eyebrow: 'PARTY BOX', title: 'ครบอร่อยในกล่องเดียว', description: 'เลือกเมนูได้หลายแบบ เหมาะกับทีมเล็กหรือปาร์ตี้ใหญ่', buttonLabel: 'เลือกชุดอาหาร', buttonLink: '/order', imageUrl: '/assets/green-curry.png', backgroundColor: '#b8ff35' },
]

const fallbackPromotions = [
    { id: 'promo-1', code: 'LIME20', title: 'สมาชิกใหม่ลดทันที', description: 'รับส่วนลด 20% สำหรับออเดอร์แรก', discountValue: 20, imageUrl: '/assets/basil-rice.png', buttonLabel: 'รับโปรนี้', buttonLink: '/order' },
    { id: 'promo-2', code: 'FRESH SET', title: 'เซตอิ่มคุ้มทุกวัน', description: 'จับคู่เมนูจานหลักและเครื่องดื่มในราคาพิเศษ', discountValue: 15, imageUrl: '/assets/pad-thai.png', buttonLabel: 'ดูเซตสุดคุ้ม', buttonLink: '/order' },
    { id: 'promo-3', code: 'MEMBER', title: 'สะสมแต้ม แลกความอร่อย', description: 'ทุกยอดสั่งซื้อรับคะแนนสมาชิกสำหรับครั้งถัดไป', discountValue: 10, imageUrl: '/assets/mango-sticky-rice.png', buttonLabel: 'เริ่มสะสมแต้ม', buttonLink: '/order' },
]

export function HomePage({ onOrder, user, onAuth, onLogout, cartCount, onCart }) {
    const navigate = useNavigate()
    const [slide, setSlide] = useState(0)
    const [heroSlides, setHeroSlides] = useState(fallbackSlides)
    const [promotions, setPromotions] = useState(fallbackPromotions)
    const [popularProducts, setPopularProducts] = useState(fallbackProducts.slice(0, 4))
    const [newProducts, setNewProducts] = useState(fallbackProducts.slice(0, 4))

    useEffect(() => {
        const loadMarketing = () => fetchMarketing().then(data => {
            if (data.heroSlides.length) setHeroSlides(data.heroSlides)
            if (data.promotions.length) setPromotions(data.promotions)
        }).catch(error => console.error('[Marketing]', error))

        const loadProducts = () => {
            fetchPopularProducts(4).then(data => { if (data.length) setPopularProducts(data) }).catch(console.error)
            fetchNewProducts(4).then(data => { if (data.length) setNewProducts(data) }).catch(console.error)
        }

        loadMarketing()
        loadProducts()
        const timer = window.setInterval(loadMarketing, 30000)
        return () => window.clearInterval(timer)
    }, [])

    useEffect(() => {
        if (slide >= heroSlides.length) setSlide(0)
    }, [heroSlides.length, slide])

    useEffect(() => {
        if (heroSlides.length < 2) return undefined
        const timer = window.setInterval(() => setSlide(current => (current + 1) % heroSlides.length), 6000)
        return () => window.clearInterval(timer)
    }, [heroSlides.length])

    const goTo = link => {
        if (!link || link === '/order') return onOrder()
        if (link.startsWith('http')) return window.open(link, '_blank', 'noopener,noreferrer')
        navigate(link)
    }
    const currentSlide = heroSlides[slide] || fallbackSlides[0]
    const changeSlide = direction => setSlide(current => (current + direction + heroSlides.length) % heroSlides.length)

    return <>
        <Navbar onOrder={onOrder} user={user} onAuth={onAuth} onLogout={onLogout} cartCount={cartCount} onCart={onCart} transparent />
        <main className="home-page">
            <section className="hero-home" style={{ '--slide-color': currentSlide.backgroundColor || '#b8ff35' }} aria-roledescription="carousel" aria-label="โปรโมชั่นแนะนำ">
                <div className="hero-slide" key={currentSlide.id}>
                    <div className="hero-copy">
                        <span>{currentSlide.eyebrow}</span>
                        <h1>{currentSlide.title}</h1>
                        <p>{currentSlide.description}</p>
                        <button onClick={() => goTo(currentSlide.buttonLink)}>{currentSlide.buttonLabel || 'ดูเพิ่มเติม'} <b>→</b></button>
                    </div>
                    <div className="hero-picture">
                        <span className="hero-picture-glow" />
                        <img src={currentSlide.imageUrl || '/assets/hero-food.png'} alt={currentSlide.title} />
                    </div>
                </div>
                {heroSlides.length > 1 && <>
                    <div className="hero-dots">
                        {heroSlides.map((item, index) => <button key={item.id} className={slide === index ? 'active' : ''} onClick={() => setSlide(index)} aria-label={`ไปยังสไลด์ ${index + 1}`} aria-current={slide === index} />)}
                    </div>
                </>}
            </section>

            <section className="promotion-section" id="promotions">
                <div className="promotion-heading"><div><small>LIMELEAF DEALS</small><h2>โปรโมชั่นและสิทธิพิเศษ</h2></div></div>
                <div className="promotion-grid">
                    {promotions.map(promotion => <article key={promotion.id}>
                        <h3>{promotion.title}</h3>
                        <div className="promotion-mini-card">
                            <div className="promotion-image"><img src={promotion.imageUrl || '/assets/hero-food.png'} alt={promotion.title} /><span>{promotion.discountValue ? `${promotion.discountValue}%` : promotion.code}</span></div>
                            <div className="promotion-copy"><small>{promotion.code}</small><p>{promotion.description}</p><button onClick={() => goTo(promotion.buttonLink)}>{promotion.buttonLabel || 'ดูรายละเอียด'} →</button></div>
                        </div>
                    </article>)}
                </div>
            </section>

            <section className="food-preview" id="about">
                <div className="preview-head"><div><small>OUR FOOD</small><h2>เมนูยอดนิยม</h2></div><button onClick={onOrder}>ดูเมนูทั้งหมด →</button></div>
                <div className="preview-grid">
                    {popularProducts.map(product => <article key={`pop-${product.id}`}><img src={product.img || '/assets/basil-rice.png'} alt={product.name} /><div><h3>{product.name}</h3><small>{product.en}</small><strong>฿{product.price}</strong><button onClick={onOrder}>สั่งเลย</button></div></article>)}
                </div>
            </section>

            <section className="food-preview" style={{ paddingBottom: '70px', paddingTop: '0px' }}>
                <div className="preview-head"><div><small>NEW RELEASES</small><h2>เมนูมาใหม่</h2></div><button onClick={onOrder}>ดูเมนูทั้งหมด →</button></div>
                <div className="preview-grid">
                    {newProducts.map(product => <article key={`new-${product.id}`}><img src={product.img || '/assets/basil-rice.png'} alt={product.name} /><div><h3>{product.name}</h3><small>{product.en}</small><strong>฿{product.price}</strong><button onClick={onOrder}>สั่งเลย</button></div></article>)}
                </div>
            </section>
        </main>
        <Footer />
    </>
}

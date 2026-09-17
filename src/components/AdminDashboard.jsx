import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../lib/AuthContext'
import { mapCategory, mapProduct, updateOrder, confirmOrder, adminApi, catalogApi, settingsApi, heroApi } from '../lib/database'
import { WebSettings } from './WebSettings'
import { WebSocial } from './WebSocial'
import './AdminDashboard.css'

const menuItems = [
    ['overview', 'ภาพรวม', 'bi-grid-1x2'], ['orders', 'ยืนยันคำสั่งซื้อ', 'bi-check-circle'],
    ['hero', 'หน้าแรก (Hero)', 'bi-image'],
    ['categories', 'ประเภทสินค้า', 'bi-tags'], ['products', 'สินค้า', 'bi-box-seam'],
    ['promotions', 'โปรโมชั่น', 'bi-percent'], ['users', 'ผู้ใช้งาน', 'bi-people'],
    ['inventory', 'สต๊อกสินค้า', 'bi-boxes'], ['reports', 'รีพอร์ตและยอดขาย', 'bi-graph-up'],
    ['settings', 'ตั้งค่าเว็บไซต์', 'bi-gear'], ['social', 'โซเชียล', 'bi-share']
]
const money = value => new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(value || 0)
const roleNames = { customer: 'ลูกค้า', cashier: 'แคชเชียร์ / STAFF', kitchen: 'ครัว', admin: 'แอดมิน', delivery: 'ไรเดอร์ (แก้ role ผ่าน Server ไม่ได้)' }

export function PageHead({ eyebrow, title, description, children }) {
    return <div className="admin-page-head"><div><span>{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{children && <div className="admin-page-actions">{children}</div>}</div>
}
function Empty({ children }) { return <div className="admin-empty"><i className="bi bi-circle"></i><p>{children}</p></div> }

export function AdminDashboard({ orders, setOrders, products, setProducts, categories, setCategories }) {
    const { profile, settings, setSettings } = useAuth()
    const adminName = profile?.name || profile?.email || 'Admin'
    const adminInitials = adminName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    const [active, setActive] = useState('overview')
    const [heroSlides, setHeroSlides] = useState([])
    const [promotions, setPromotions] = useState([])
    const [users, setUsers] = useState([])
    const [inventory, setInventory] = useState([])
    const [notice, setNotice] = useState('')
    const [editingHero, setEditingHero] = useState(null)
    const [editingPromotion, setEditingPromotion] = useState(null)

    const paidOrders = orders.filter(order => order.isPaid && order.foodStatus !== 'ยกเลิก')
    const pendingOrders = orders.filter(order => order.serverStatus === 'PENDING' && order.orderSource === 'online')
    const revenue = paidOrders.reduce((sum, order) => sum + order.totalAmount, 0)
    const averageOrder = paidOrders.length ? revenue / paidOrders.length : 0
    const lowStock = inventory.filter(item => item.quantity <= 10)
    const productSales = useMemo(() => {
        const quantities = {}
        orders.forEach(order => order.items.forEach(item => { quantities[item.productId] = (quantities[item.productId] || 0) + item.quantity }))
        return products.map(product => ({ ...product, sold: quantities[product.id] || 0 })).sort((a, b) => b.sold - a.sold)
    }, [orders, products])

    const notify = message => { setNotice(message); window.setTimeout(() => setNotice(''), 2400) }
    const fail = error => { console.error('[API Admin]', error); notify(`เกิดข้อผิดพลาด: ${error.message}`) }

    useEffect(() => {
        Promise.all([
            adminApi.coupons().catch(() => []),
            adminApi.users().catch(() => []),
            adminApi.inventory().catch(() => []),
            heroApi.list().catch(() => []),
        ]).then(([couponResult, userResult, inventoryResult, heroResult]) => {
            setHeroSlides(Array.isArray(heroResult) ? heroResult : [])
            setPromotions(couponResult)
            setUsers(userResult)
            setInventory(inventoryResult.map(item => ({ id: item.id, ingredientName: item.product?.name || 'วัตถุดิบทั่วไป', quantity: Number(item.quantity), unit: 'ชิ้น', expiration: null, productId: item.productId })))
        }).catch(fail)
    }, [])


    const approveOrder = async id => {
        const approvedAt = new Date().toISOString()
        try { await confirmOrder(id); setOrders(current => current.map(order => order.id === id ? { ...order, foodStatus: 'รอครัว', serverStatus: 'CONFIRMED', approvedAt } : order)); notify('อนุมัติออเดอร์ออนไลน์และส่งเข้าคิวครัวแล้ว') } catch (error) { fail(error) }
    }
    const cancelOrder = async id => {
        try { await updateOrder(id, { status: 'CANCELLED' }); setOrders(current => current.map(order => order.id === id ? { ...order, foodStatus: 'ยกเลิก', serverStatus: 'CANCELLED' } : order)); notify('ยกเลิกออเดอร์แล้ว') } catch (error) { fail(error) }
    }
    const deleteCategory = async id => {
        if (products.some(product => product.categoryId === id)) return notify('ลบไม่ได้ เนื่องจากยังมีสินค้าในประเภทนี้')
        try {
            await catalogApi.deleteCategory(id)
            setCategories(current => current.filter(category => category.id !== id)); notify('ลบประเภทสินค้าแล้ว')
        } catch (error) { fail(error) }
    }
    const serverCanCreateSlug = name => /[a-z0-9]/i.test(name)
    const addCategory = async event => {
        event.preventDefault(); const form = new FormData(event.currentTarget); const name = form.get('name').trim(); if (!name) return
        if (!serverCanCreateSlug(name)) return notify('Server สร้าง slug จาก A-Z/0-9 เท่านั้น กรุณาใส่ตัวอักษรอังกฤษในชื่อประเภทด้วย')
        try {
            const data = await catalogApi.createCategory({ name, sortOrder: categories.length })
            setCategories(current => [...current, mapCategory(data)]); event.currentTarget.reset(); notify('เพิ่มประเภทสินค้าแล้ว')
        } catch (error) { fail(error) }
    }
    const updateCategory = async (id, changes) => {
        if (changes.name && !serverCanCreateSlug(changes.name)) return notify('ชื่อประเภทต้องมี A-Z/0-9 อย่างน้อย 1 ตัว เนื่องจาก Server สร้าง slug อัตโนมัติ')
        try {
            const data = await catalogApi.updateCategory(id, changes)
            setCategories(current => current.map(category => category.id === id ? { ...category, ...changes } : category)); notify('อัปเดตสเตตัสแล้ว')
        } catch (error) { fail(error) }
    }

    const uploadLogoFile = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        try {
            notify('กำลังอัปโหลดโลโก้...')
            const result = await settingsApi.updateLogo(file)
            setSettings(prev => ({ ...prev, logoUrl: result.logoUrl }))
            notify('อัปโหลดโลโก้สำเร็จ')
        } catch (error) {
            fail(error)
        }
    }
    const addProduct = async event => {
        event.preventDefault()
        const formElement = event.currentTarget
        const form = new FormData(formElement)
        const name = String(form.get('name') || '').trim()
        const requestedStock = Math.max(0, Number(form.get('stock') || 0))
        if (!serverCanCreateSlug(name)) return notify('ชื่อสินค้าต้องมี A-Z/0-9 อย่างน้อย 1 ตัว เนื่องจาก Server สร้าง slug อัตโนมัติ')
        try {
            const payload = new FormData()
            payload.append('name', name)
            payload.append('description', String(form.get('description') || '').trim())
            payload.append('categoryId', String(form.get('categoryId') || ''))
            payload.append('price', String(Number(form.get('price') || 0)))
            // Server ใช้ `parseInt(stock) || 999` ตอน create จึงส่ง 1 ก่อน แล้วแก้เป็น 0 ภายหลังเมื่อผู้ใช้เลือก 0
            payload.append('stock', String(requestedStock === 0 ? 1 : requestedStock))
            const image = form.get('image')
            if (image instanceof File && image.size > 0) payload.append('image', image)
            let data = await catalogApi.createProduct(payload)
            if (requestedStock === 0) data = await catalogApi.updateProduct(data.id, { stock: 0, isActive: false })
            setProducts(current => [...current, mapProduct(data)])
            formElement.reset(); notify('เพิ่มสินค้าแล้ว')
        } catch (error) { fail(error) }
    }
    const updateProduct = async (id, changes) => {
        if (changes.name && !serverCanCreateSlug(changes.name)) return notify('ชื่อสินค้าต้องมี A-Z/0-9 อย่างน้อย 1 ตัว เนื่องจาก Server สร้าง slug อัตโนมัติ')
        const payload = {}
        if ('categoryId' in changes) payload.categoryId = changes.categoryId
        if ('en' in changes) payload.description = changes.en
        if ('stock' in changes) { payload.stock = changes.stock; payload.isActive = Number(changes.stock) > 0 }
        if ('name' in changes) payload.name = changes.name
        if ('price' in changes) payload.price = changes.price
        if ('status' in changes) payload.isActive = !['หมด', 'วัตถุดิบไม่เพียงพอ'].includes(changes.status)
        let body = payload
        if (changes.imageFile instanceof File) {
            body = new FormData()
            Object.entries(payload).forEach(([key, value]) => body.append(key, String(value)))
            body.append('image', changes.imageFile)
        }
        try {
            const data = await catalogApi.updateProduct(id, body)
            setProducts(current => current.map(product => product.id === id ? mapProduct(data) : product)); notify('อัปเดตสินค้าแล้ว')
        } catch (error) { fail(error) }
    }
    const deleteProduct = async id => { try { await catalogApi.deleteProduct(id); setProducts(current => current.filter(item => item.id !== id)); notify('ลบสินค้าแล้ว') } catch (error) { fail(error) } }

    const uploadMarketingImage = async (file, folder) => {
        return window.prompt('ระบบอัปโหลดรูปยังไม่พร้อมสำหรับ Backend Node.js กรุณาใส่ URL แทนครับ:', 'https://...') || ''
    }
    const addHero = async event => {
        event.preventDefault()
        const form = new FormData(event.currentTarget)
        const payload = {
            eyebrow: form.get('eyebrow')?.trim() || '',
            title: form.get('title')?.trim() || '',
            description: form.get('description')?.trim() || '',
            buttonLabel: form.get('buttonLabel')?.trim() || 'สั่งเลย',
            buttonLink: form.get('buttonLink')?.trim() || '/order',
            backgroundColor: form.get('backgroundColor') || '#b8ff35',
            sortOrder: Number(form.get('sortOrder') || heroSlides.length + 1),
            imageUrl: form.get('imageUrl')?.trim() || '/assets/hero-food.png',
        }
        if (!payload.title) return notify('กรุณาใส่หัวข้อหลัก')
        try {
            const data = await heroApi.create(payload)
            setHeroSlides(current => [...current, data].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)))
            event.currentTarget.reset()
            notify('เพิ่ม Hero Slide แล้ว')
        } catch (error) { fail(error) }
    }
    const saveHero = async (event, hero) => {
        event.preventDefault()
        const form = new FormData(event.currentTarget)
        const payload = {
            eyebrow: form.get('eyebrow')?.trim() || '',
            title: form.get('title')?.trim() || '',
            description: form.get('description')?.trim() || '',
            buttonLabel: form.get('buttonLabel')?.trim() || 'สั่งเลย',
            buttonLink: form.get('buttonLink')?.trim() || '/order',
            backgroundColor: form.get('backgroundColor') || '#b8ff35',
            sortOrder: Number(form.get('sortOrder') || hero.sortOrder),
            imageUrl: form.get('imageUrl')?.trim() || hero.imageUrl,
        }
        try {
            const data = await heroApi.update(hero.id, payload)
            setHeroSlides(current => current.map(s => s.id === hero.id ? data : s).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)))
            setEditingHero(null)
            notify('บันทึก Hero Slide แล้ว')
        } catch (error) { fail(error) }
    }
    const toggleHero = async hero => {
        try {
            const data = await heroApi.update(hero.id, { isActive: !hero.isActive })
            setHeroSlides(current => current.map(s => s.id === hero.id ? { ...s, isActive: !hero.isActive } : s))
        } catch (error) { fail(error) }
    }
    const deleteHero = async id => {
        if (!window.confirm('ลบ Hero Slide นี้?')) return
        try {
            await heroApi.remove(id)
            setHeroSlides(current => current.filter(s => s.id !== id))
            notify('ลบ Hero Slide แล้ว')
        } catch (error) { fail(error) }
    }
    const addPromotion = async event => {
        event.preventDefault(); const formElement = event.currentTarget; const form = new FormData(formElement)
        try {
            const minAmt = Number(form.get('minOrderAmount') || 0)
            const payload = { code: form.get('code').trim().toUpperCase(), title: form.get('title').trim(), description: form.get('description').trim(), discountType: form.get('discountType') || 'PERCENT', discountValue: Number(form.get('value')), buttonLabel: form.get('buttonLabel').trim() || 'ดูเมนู', buttonLink: form.get('buttonLink').trim() || '/order', ...(minAmt > 0 ? { minOrderAmount: minAmt } : {}) }

            const imageFile = form.get('imageFile')
            let body = payload
            if (imageFile instanceof File && imageFile.size > 0) {
                body = new FormData()
                Object.entries(payload).forEach(([key, value]) => body.append(key, String(value)))
                body.append('image', imageFile)
            }
            const data = await adminApi.createCoupon(body)
            setPromotions(current => [data, ...current]); formElement.reset(); notify('สร้างโปรโมชั่นแล้ว')
        } catch (error) { fail(error) }
    }
    const togglePromotion = async promotion => { try { await adminApi.updateCoupon(promotion.id, { isActive: !promotion.isActive }); setPromotions(current => current.map(item => item.id === promotion.id ? { ...item, isActive: !item.isActive } : item)) } catch (error) { fail(error) } }
    const savePromotion = async (event, promotion) => {
        event.preventDefault(); const form = new FormData(event.currentTarget)
        try {
            const minAmt = Number(form.get('minOrderAmount') || 0)
            const payload = { code: form.get('code').trim().toUpperCase(), title: form.get('title').trim(), description: form.get('description').trim(), discountType: form.get('discountType') || 'PERCENT', discountValue: Number(form.get('value')), buttonLabel: form.get('buttonLabel').trim() || 'ดูเมนู', buttonLink: form.get('buttonLink').trim() || '/order', minOrderAmount: minAmt > 0 ? minAmt : null }
            const imageFile = form.get('imageFile')
            let body = payload
            if (imageFile instanceof File && imageFile.size > 0) {
                body = new FormData()
                Object.entries(payload).forEach(([key, value]) => body.append(key, String(value)))
                body.append('image', imageFile)
            }
            const data = await adminApi.updateCoupon(promotion.id, body)
            setPromotions(current => current.map(item => item.id === promotion.id ? data : item)); setEditingPromotion(null); notify('บันทึกโปรโมชั่นแล้ว')
        } catch (error) { fail(error) }
    }
    const deletePromotion = async id => { try { await adminApi.deleteCoupon(id); setPromotions(current => current.filter(item => item.id !== id)); notify('ลบโปรโมชั่นแล้ว') } catch (error) { fail(error) } }

    const updateUserRole = async (id, role) => { try { const data = await adminApi.updateUserRole(id, role); setUsers(current => current.map(item => item.id === id ? { ...item, role } : item)); notify('อัปเดตบทบาทผู้ใช้งานแล้ว') } catch (error) { fail(error) } }
    const updateUserStatus = async (id, isActive) => { try { await adminApi.updateUserStatus(id, isActive); setUsers(current => current.map(item => item.id === id ? { ...item, isActive } : item)); notify('อัปเดตสถานะผู้ใช้งานแล้ว') } catch (error) { fail(error) } }
    const addUser = async event => {
        event.preventDefault(); const formElement = event.currentTarget; const form = new FormData(formElement)
        const email = form.get('email').trim(); const password = form.get('password'); const name = form.get('name').trim(); const role = form.get('role')
        if (!email || !password) return notify('กรุณากรอกอีเมลและรหัสผ่าน')
        try {
            const data = await adminApi.createUser({ email, name, password, role })
            const serverRoleDisplayMap = { CUSTOMER: 'customer', STAFF: 'cashier', KITCHEN: 'kitchen', ADMIN: 'admin' }
            setUsers(current => [...current, { id: data.id, email: data.email, name: data.name, role: serverRoleDisplayMap[data.role] || data.role, isActive: true, points: 0 }])
            formElement.reset(); notify('เพิ่มผู้ใช้งานใหม่แล้ว')
        } catch (error) { fail(error) }
    }

    const addInventory = async event => {
        event.preventDefault(); window.alert('Backend ไม่รองรับการเพิ่มวัตถุดิบแยกต่างหาก โปรดผูกวัตถุดิบกับสินค้าใหม่')
    }
    const updateInventory = async (id, changes) => {
        try {
            const target = inventory.find(i => i.id === id)
            if (target && target.productId) {
                await adminApi.updateInventory(target.productId, { quantity: changes.quantity })
                await catalogApi.updateProduct(target.productId, { isActive: Number(changes.quantity) > 0 })
                setInventory(current => current.map(item => item.id === id ? { ...item, ...changes } : item))
            }
        } catch (error) { fail(error) }
    }
    const deleteInventory = async id => { window.alert('ไม่สามารถลบวัตถุดิบได้จากหน้านี้') }
    const exportReport = () => {
        const sourceLabel = s => s === 'online' ? 'ออนไลน์' : s === 'walkin' ? 'ทานที่ร้าน' : s === 'takeaway' ? 'สั่งกลับบ้าน' : s || '-'
        const fmt = v => `"${String(v ?? '').replaceAll('"', '""')}"`

        const header = [
            'เลขออเดอร์', 'วันที่', 'เวลา',
            'ช่องทางการสั่ง', 'ลูกค้า',
            'รายการสินค้า', 'จำนวนรายการ',
            'วิธีชำระเงิน', 'โค้ดส่วนลด', 'ส่วนลด (฿)',
            'ยอดรวม (฿)', 'ชำระแล้ว',
            'สถานะอาหาร', 'ประเภทจัดส่ง',
        ]

        const dataRows = orders.map(order => {
            const d = new Date(order.createdAt)
            const date = d.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' })
            const time = d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
            const itemsSummary = (order.items || []).map(item => {
                const name = item.productName || products.find(p => p.id === String(item.productId))?.name || item.productId
                return `${name} ×${item.quantity}`
            }).join(', ')
            const itemCount = (order.items || []).reduce((s, i) => s + i.quantity, 0)
            return [
                order.orderNumber || order.id, date, time,
                sourceLabel(order.orderSource), order.customerId || '-',
                itemsSummary, itemCount,
                order.paymentMethod || '-', order.couponCode || '-', order.discountAmount || 0,
                order.totalAmount, order.isPaid ? 'ชำระแล้ว' : 'ยังไม่ชำระ',
                order.foodStatus, order.deliveryType || '-',
            ]
        })

        // Summary trailer
        const totalRevenue = paidOrders.reduce((s, o) => s + o.totalAmount, 0)
        const totalDiscount = paidOrders.reduce((s, o) => s + (o.discountAmount || 0), 0)
        const trailer = [
            [], ['', '', '', '', '', '', '', '', '', '', '', '', '', ''],
            ['สรุปรายงาน', '', '', '', '', '', '', '', '', '', '', '', '', ''],
            ['ยอดขายสุทธิ (ชำระแล้ว)', '', '', '', '', '', '', '', '', '', totalRevenue, '', '', ''],
            ['จำนวนออเดอร์ทั้งหมด', '', '', '', '', '', '', '', '', '', orders.length, '', '', ''],
            ['จำนวนบิลที่ชำระแล้ว', '', '', '', '', '', '', '', '', '', paidOrders.length, '', '', ''],
            ['ส่วนลดรวม', '', '', '', '', '', '', '', '', '', totalDiscount, '', '', ''],
            ['ยอดเฉลี่ยต่อบิล', '', '', '', '', '', '', '', '', '', paidOrders.length ? (totalRevenue / paidOrders.length).toFixed(2) : 0, '', '', ''],
            ['วันที่ออกรายงาน', new Date().toLocaleDateString('th-TH'), new Date().toLocaleTimeString('th-TH'), '', '', '', '', '', '', '', '', '', '', ''],
        ]

        const allRows = [header, ...dataRows, ...trailer]
        const csv = '\uFEFF' + allRows.map(row => row.map(fmt).join(',')).join('\n')
        const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
        const link = document.createElement('a')
        link.href = url; link.download = `limeleaf-report-${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(url)
        notify('ดาวน์โหลดรีพอร์ตแล้ว')
    }


    const renderOverview = () => <>
        <PageHead eyebrow="ADMIN DASHBOARD" title="ภาพรวมร้านวันนี้" description="ติดตามยอดขาย ออเดอร์ และสิ่งที่ต้องจัดการจากจุดเดียว" />
        <div className="admin-stats">
            <article><span className="green">฿</span><small>ยอดขายรวม</small><strong>{money(revenue)}</strong><em>จากรายการที่ชำระแล้ว</em></article>
            <article><span className="lime">#</span><small>ออเดอร์ทั้งหมด</small><strong>{orders.length}</strong><em>{pendingOrders.length} รายการรอยืนยัน</em></article>
            <article><span className="blue">↗</span><small>ยอดเฉลี่ยต่อบิล</small><strong>{money(averageOrder)}</strong><em>{paidOrders.length} บิลที่ชำระแล้ว</em></article>
            <article><span className="orange">!</span><small>สต๊อกใกล้หมด</small><strong>{lowStock.length}</strong><em>ควรเติมวัตถุดิบ</em></article>
        </div>
        <div className="admin-overview-grid">
            <section className="admin-panel"><div className="admin-panel-head"><div><h2>คำสั่งซื้อล่าสุด</h2><p>สถานะออเดอร์ในระบบ</p></div><button className="admin-link" onClick={() => setActive('orders')}>ดูทั้งหมด →</button></div>
                <div className="admin-order-list">{orders.slice(-5).reverse().map(order => <div key={order.id}><span className="admin-order-icon">▣</span><div><b>{order.orderNumber || order.id}</b><small>{order.customerId} · {order.items.length} รายการ</small></div><strong>{money(order.totalAmount)}</strong><i className={`admin-badge ${order.foodStatus === 'รอยืนยัน' ? 'pending' : ''}`}>{order.foodStatus}</i></div>)}</div>
            </section>
            <section className="admin-panel"><div className="admin-panel-head"><div><h2>เมนูขายดี</h2><p>เรียงตามจำนวนที่ขาย</p></div></div><div className="admin-top-products">{productSales.slice(0, 5).map((product, index) => <div key={product.id}><b>{index + 1}</b><img src={product.img} alt="" /><span>{product.name}<small>{product.sold} ชิ้น</small></span><strong>{money(product.price * product.sold)}</strong></div>)}</div></section>
        </div>
    </>

    const renderOrders = () => <>
        <PageHead eyebrow="ORDER APPROVAL" title="อนุมัติออเดอร์ออนไลน์" description="ออเดอร์ออนไลน์จากลูกค้า — ต้องอนุมัติก่อนส่งเข้าครัว (ออเดอร์หน้าร้านไม่ต้องอนุมัติ)" />
        <div className="admin-order-cards">{pendingOrders.length === 0 ? <Empty>ไม่มีออเดอร์ออนไลน์ที่รออนุมัติ</Empty> : pendingOrders.map(order => <article key={order.id} className="admin-order-card">
            <header><div><span>🌐 ออเดอร์ออนไลน์ — รออนุมัติ</span><h3>{order.orderNumber || order.id}</h3></div><strong>{money(order.totalAmount)}</strong></header><p>ลูกค้า: {order.customerId} · {order.deliveryType}{order.deliveryScheduleType === 'ระบุเวลา' && order.scheduledAt ? ` (${new Date(order.scheduledAt).toLocaleString('th-TH')})` : order.deliveryType === 'ให้จัดส่ง' ? ' (ทันที)' : ''} · {order.paymentMethod}</p>
            <ul>{order.items.map(item => <li key={item.id}><span>{item.productName || products.find(product => product.id === String(item.productId))?.name || item.productId} × {item.quantity}</span><b>{money(item.priceAtTime * item.quantity)}</b></li>)}</ul>
            <footer><button className="admin-danger" onClick={() => cancelOrder(order.id)}>ยกเลิกออเดอร์</button><button className="admin-primary" onClick={() => approveOrder(order.id)}>✅ อนุมัติ → ส่งเข้าครัว</button></footer>
        </article>)}</div>
        <section className="admin-panel admin-history"><div className="admin-panel-head"><div><h2>ประวัติคำสั่งซื้อ</h2><p>รายการที่ผ่านการตรวจสอบแล้ว</p></div></div><div className="admin-table-wrap"><table><thead><tr><th>เลขออเดอร์</th><th>ลูกค้า</th><th>ช่องทาง</th><th>ยอดรวม</th><th>สถานะ</th></tr></thead><tbody>{orders.filter(order => order.serverStatus !== 'PENDING').map(order => <tr key={order.id}><td><b>{order.orderNumber || order.id}</b></td><td>{order.customerId}</td><td><i className={`admin-badge ${order.orderSource === 'online' ? '' : 'pending'}`}>{order.orderSource === 'walkin' ? 'ทานที่ร้าน' : order.orderSource === 'takeaway' ? 'สั่งกลับบ้าน' : 'ออนไลน์'}</i></td><td>{money(order.totalAmount)}</td><td><i className="admin-badge">{order.foodStatus}</i></td></tr>)}</tbody></table></div></section>
    </>

    const renderCategories = () => <>
        <PageHead eyebrow="CATALOG" title="จัดการประเภทสินค้า" description="จัดหมวดหมู่เพื่อให้ลูกค้าค้นหาเมนูได้ง่ายขึ้น" />
        <form className="admin-inline-form" onSubmit={addCategory}><label>ชื่อประเภทสินค้า<input name="name" required placeholder="เช่น อาหารทานเล่น" /></label><button className="admin-primary">+ เพิ่มประเภท</button></form>
        <section className="admin-panel"><div className="admin-table-wrap"><table><thead><tr><th>ประเภท</th><th>ลำดับ</th><th>จำนวนสินค้า</th><th>การจัดการ</th></tr></thead><tbody>{categories.map(category => <tr key={category.id}><td><input className="admin-text-input" defaultValue={category.name} onBlur={event => event.target.value.trim() !== category.name && updateCategory(category.id, { name: event.target.value.trim() })} /></td><td><input className="admin-number-input" type="number" min="0" defaultValue={category.sort_order} onBlur={event => Number(event.target.value) !== category.sort_order && updateCategory(category.id, { sortOrder: Number(event.target.value) })} /></td><td>{products.filter(product => product.categoryId === category.id).length} รายการ</td><td><button className="admin-text-danger" onClick={() => deleteCategory(category.id)}>ลบ</button></td></tr>)}</tbody></table></div></section>
    </>

    const renderProducts = () => <>
        <PageHead eyebrow="PRODUCTS" title="จัดการสินค้า" description="เพิ่มสินค้า ปรับราคา หมวดหมู่ และสถานะการขาย" />
        <form className="admin-grid-form products" onSubmit={addProduct}><label>ชื่อสินค้า (ต้องมี A-Z/0-9)<input name="name" required placeholder="เช่น Pad Kra Pao / เมนู A1" /></label><label>รายละเอียด<input name="description" placeholder="รายละเอียดสินค้า" /></label><label>ประเภท<select name="categoryId" required>{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label>ราคา<input name="price" required type="number" min="0.01" step="0.01" /></label><label>สต๊อกเริ่มต้น<input name="stock" required type="number" min="0" /></label><label>รูปสินค้า<label className="admin-file-label"><input name="image" type="file" accept="image/*" className="admin-file-input" /><span><i className="bi bi-folder-fill text-warning" style={{ marginRight: 4 }}></i>เลือกรูปภาพ</span></label></label><button className="admin-primary">+ เพิ่มสินค้า</button></form>
        <section className="admin-panel"><div className="admin-table-wrap"><table><thead><tr><th>สินค้า</th><th>เปลี่ยนรูป</th><th>ประเภท</th><th>ราคา</th><th>สต๊อก</th><th>สถานะ</th><th></th></tr></thead><tbody>{products.map(product => <tr key={product.id}><td><div className="admin-product-cell"><img src={product.img} alt="" /><span><input className="admin-text-input" defaultValue={product.name} onBlur={event => event.target.value.trim() !== product.name && updateProduct(product.id, { name: event.target.value.trim() })} /><input className="admin-text-input small" defaultValue={product.en} placeholder="รายละเอียด" onBlur={event => event.target.value.trim() !== product.en && updateProduct(product.id, { en: event.target.value.trim() })} /></span></div></td><td><label className="admin-file-label"><input className="admin-file-input" type="file" accept="image/*" onChange={event => event.target.files?.[0] && updateProduct(product.id, { imageFile: event.target.files[0] })} /><span><i className="bi bi-folder-fill text-warning" style={{ marginRight: 4 }}></i>เปลี่ยนรูป</span></label></td><td><select value={product.categoryId || ''} onChange={event => updateProduct(product.id, { categoryId: event.target.value })}>{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></td><td><input className="admin-number-input" type="number" min="0.01" step="0.01" defaultValue={product.price} onBlur={event => Number(event.target.value) !== product.price && updateProduct(product.id, { price: Number(event.target.value) })} /></td><td><input className="admin-number-input" type="number" min="0" defaultValue={product.stock} onBlur={event => Number(event.target.value) !== product.stock && updateProduct(product.id, { stock: Math.max(0, Number(event.target.value)) })} /></td><td><i className={`admin-badge ${product.status === 'หมด' ? 'blocked' : product.status === 'เหลือน้อย' ? 'pending' : ''}`}>{product.status}</i></td><td><button className="admin-text-danger" onClick={() => deleteProduct(product.id)}>ลบ</button></td></tr>)}</tbody></table></div></section>
    </>

    const renderHero = () => <>
        <PageHead eyebrow="HOMEPAGE HERO" title="จัดการ Hero หน้าแรก" description="เพิ่ม แก้ไข เรียงลำดับ และเลือกสไลด์ที่แสดงบนหน้าเว็บ" />
        <form className="admin-marketing-form" onSubmit={addHero}>
            <label>ข้อความกำกับ<input name="eyebrow" required placeholder="LIMELEAF CATERING" /></label>
            <label>หัวข้อหลัก<input name="title" required placeholder="สดใหม่ทุกโอกาส" /></label>
            <label className="wide">รายละเอียด<textarea name="description" required placeholder="รายละเอียดสั้น ๆ ของแคมเปญ" /></label>
            <label>ข้อความบนปุ่ม<input name="buttonLabel" required defaultValue="สั่งเลย" /></label>
            <label>ลิงก์ปุ่ม<input name="buttonLink" defaultValue="/order" /></label>
            <label>สีพื้นหลัง<input name="backgroundColor" type="color" defaultValue="#b8ff35" /></label>
            <label>ลำดับ<input name="sortOrder" type="number" min="0" defaultValue={heroSlides.length + 1} /></label>
            <label className="wide">URL รูปภาพ<input name="imageUrl" placeholder="/assets/hero-food.png หรือ https://..." /></label>
            <label className="wide">หรืออัปโหลดรูป (ไม่เกิน 5 MB)<input name="image" type="file" accept="image/*" /></label>
            <button className="admin-primary">+ เพิ่ม Hero slide</button>
        </form>
        <div className="admin-hero-list">{heroSlides.length === 0 ? <Empty>Server ปัจจุบันไม่มี endpoint สำหรับ Hero slide</Empty> : heroSlides.map(hero => <article key={hero.id} className={!hero.isActive ? 'inactive' : ''}>
            <div className="admin-hero-preview" style={{ background: hero.backgroundColor }}><img src={hero.imageUrl} alt="" /><span>ลำดับ {hero.sortOrder}</span></div>
            {editingHero === hero.id ? <form className="admin-edit-form" onSubmit={event => saveHero(event, hero)}>
                <label>ข้อความกำกับ<input name="eyebrow" required defaultValue={hero.eyebrow} /></label><label>หัวข้อ<input name="title" required defaultValue={hero.title} /></label>
                <label className="wide">รายละเอียด<textarea name="description" required defaultValue={hero.description} /></label>
                <label>ข้อความบนปุ่ม<input name="buttonLabel" required defaultValue={hero.buttonLabel} /></label><label>ลิงก์ปุ่ม<input name="buttonLink" defaultValue={hero.buttonLink} /></label>
                <label>สีพื้นหลัง<input name="backgroundColor" type="color" defaultValue={hero.backgroundColor} /></label><label>ลำดับ<input name="sortOrder" type="number" min="0" defaultValue={hero.sortOrder} /></label>
                <label className="wide">URL รูปภาพ<input name="imageUrl" defaultValue={hero.imageUrl} /></label><label className="wide">เปลี่ยนรูป<input name="image" type="file" accept="image/*" /></label>
                <div className="admin-form-actions"><button type="button" onClick={() => setEditingHero(null)}>ยกเลิก</button><button className="admin-primary">บันทึก</button></div>
            </form> : <div className="admin-hero-info"><small>{hero.eyebrow}</small><h2>{hero.title}</h2><p>{hero.description}</p><b>{hero.buttonLabel} → {hero.buttonLink}</b></div>}
            {editingHero !== hero.id && <footer><button onClick={() => setEditingHero(hero.id)}>แก้ไข</button><button onClick={() => toggleHero(hero)}>{hero.isActive ? 'ปิดการแสดง' : 'เปิดการแสดง'}</button><button className="admin-text-danger" onClick={() => deleteHero(hero.id)}>ลบ</button></footer>}
        </article>)}</div>
    </>

    const renderPromotions = () => <>
        <PageHead eyebrow="MARKETING" title="จัดการโปรโมชั่น" description="จัดการคูปองตาม Coupon API ของ Server (รายการคูปองฝั่งลูกค้าเป็นสิทธิ์ที่ Server จำกัดไว้)" />
        <form className="admin-marketing-form promotion" onSubmit={addPromotion}>
            <label>โค้ด<input name="code" required placeholder="LIME20" /></label><label>หัวข้อโปรโมชั่น<input name="title" required placeholder="สมาชิกใหม่ลดทันที" /></label>
            <label className="wide">รายละเอียด<textarea name="description" required placeholder="รับส่วนลดสำหรับออเดอร์แรก" /></label>
            <label>ประเภทส่วนลด<select name="discountType" defaultValue="PERCENT"><option value="PERCENT">เปอร์เซ็นต์ (%)</option><option value="FIXED">จำนวนเงิน (฿)</option></select></label><label>มูลค่าส่วนลด<input name="value" required type="number" min="1" step="0.01" /></label><label>ยอดสั่งขั้นต่ำ (฿)<input name="minOrderAmount" type="number" min="0" step="0.01" placeholder="0 = ไม่จำกัด" /></label><label>ข้อความบนปุ่ม<input name="buttonLabel" defaultValue="ดูเมนู" /></label><label>ลิงก์ปุ่ม<input name="buttonLink" defaultValue="/order" /></label>
            <label className="wide">อัปโหลดรูปภาพ (ไม่บังคับ)<input type="file" name="imageFile" accept="image/png, image/jpeg, image/webp" /></label>
            <button className="admin-primary">+ สร้างโปรโมชั่น</button>
        </form>
        <div className="admin-promo-grid">{promotions.map(promotion => <article key={promotion.id} className={!promotion.isActive ? 'inactive' : ''}>
            <img className="admin-promo-image" src={promotion.imageUrl || '/assets/basil-rice.png'} alt="" />
            {editingPromotion === promotion.id ? <form className="admin-edit-form" onSubmit={event => savePromotion(event, promotion)}>
                <label>โค้ด<input name="code" required defaultValue={promotion.code} /></label><label>หัวข้อ<input name="title" required defaultValue={promotion.title} /></label>
                <label className="wide">รายละเอียด<textarea name="description" required defaultValue={promotion.description} /></label>
                <label>ประเภทส่วนลด<select name="discountType" defaultValue={promotion.discountType}><option value="PERCENT">เปอร์เซ็นต์ (%)</option><option value="FIXED">จำนวนเงิน (฿)</option></select></label>
                <label>มูลค่าส่วนลด<input name="value" type="number" min="1" step="0.01" required defaultValue={promotion.discountValue} /></label>
                <label className="wide">ยอดสั่งซื้อขั้นต่ำ (0 = ไม่มีขั้นต่ำ)<input name="minOrderAmount" type="number" min="0" step="1" defaultValue={promotion.minOrderAmount || ''} /></label>
                <label>ข้อความบนปุ่ม<input name="buttonLabel" defaultValue={promotion.buttonLabel} /></label><label>ลิงก์ปุ่ม<input name="buttonLink" defaultValue={promotion.buttonLink} /></label>
                <label className="wide">อัปโหลดรูปภาพใหม่<input type="file" name="imageFile" accept="image/png, image/jpeg, image/webp" /></label>
                <div className="admin-form-actions"><button type="button" onClick={() => setEditingPromotion(null)}>ยกเลิก</button><button className="admin-primary">บันทึก</button></div>
            </form> : <><div className="admin-promo-badge">{promotion.isActive ? <i className="bi bi-circle-fill text-success" /> : <i className="bi bi-circle-fill text-muted" />}{promotion.isActive ? 'ใช้งานอยู่' : 'ปิดใช้งาน'}</div><div className="admin-promo-content"><div className="admin-promo-title-row"><span className="code">{promotion.code}</span></div><h2>{promotion.title}</h2><p>{promotion.description}</p><div className="admin-promo-discount"><strong>{promotion.discountType === 'PERCENT' ? `ลด ${promotion.discountValue}%` : `ลด ${money(promotion.discountValue)}`}</strong></div></div></>}
            {editingPromotion !== promotion.id && <footer><button onClick={() => setEditingPromotion(promotion.id)}>แก้ไข</button><button onClick={() => togglePromotion(promotion)}>{promotion.isActive ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}</button><button className="admin-text-danger" onClick={() => deletePromotion(promotion.id)}>ลบ</button></footer>}
        </article>)}</div>
    </>


    const renderUsers = () => <>
        <PageHead eyebrow="USERS & ACCESS" title="จัดการผู้ใช้งานทั้งหมด" description="กำหนดบทบาทและเปิด/ปิดใช้งานผู้ใช้ผ่าน API" />
        <form className="admin-grid-form users" onSubmit={addUser}>
            <label>อีเมล<input name="email" type="email" required placeholder="user@example.com" /></label>
            <label>ชื่อ<input name="name" placeholder="ชื่อผู้ใช้งาน" /></label>
            <label>รหัสผ่าน<input name="password" type="password" required placeholder="อย่างน้อย 6 ตัว" /></label>
            <label>บทบาท<select name="role" defaultValue="CUSTOMER"><option value="CUSTOMER">ลูกค้า</option><option value="STAFF">แคชเชียร์</option><option value="KITCHEN">ครัว</option><option value="DELIVERY">เดลิเวอรี่ / ไรเดอร์</option><option value="ADMIN">แอดมิน</option></select></label>
            <button className="admin-primary" style={{ alignSelf: 'end' }}>+ เพิ่มผู้ใช้</button>
        </form>
        <section className="admin-panel"><div className="admin-table-wrap"><table><thead><tr><th>ผู้ใช้งาน</th><th>บทบาท</th><th>สถานะ</th><th>หมายเหตุ</th></tr></thead><tbody>{users.map(user => <tr key={user.id}><td><div className="admin-user-cell"><span>{(user.name || user.email || '?').charAt(0)}</span><div><b>{user.name || 'ยังไม่ได้ตั้งชื่อ'}</b><small>{user.email}</small></div></div></td><td><select value={user.role} onChange={event => updateUserRole(user.id, event.target.value)}>{Object.entries(roleNames).map(([value, label]) => <option key={value} value={value} disabled={value === 'delivery'}>{label}</option>)}</select></td><td><button className={user.isActive ? "admin-primary" : "admin-text-danger"} style={{ fontSize: 12, padding: '4px 12px', borderRadius: 6 }} onClick={() => updateUserStatus(user.id, !user.isActive)}>{user.isActive ? 'เปิดใช้งานแล้ว' : 'ปิดใช้งาน'}</button></td><td><small>{user.role === 'delivery' ? 'ผู้ใช้ที่เป็นตัวแทนในระบบเท่านั้น' : ''}</small></td></tr>)}</tbody></table></div></section>
    </>

    const renderInventory = () => <>
        <PageHead eyebrow="INVENTORY" title="จัดการสต๊อกสินค้า" description="อัปเดตวัตถุดิบและตรวจรายการที่ใกล้หมด" />
        <form className="admin-grid-form stock" onSubmit={addInventory}><label>วัตถุดิบ<input name="name" required placeholder="ชื่อวัตถุดิบ" /></label><label>จำนวน<input name="quantity" required type="number" min="0" /></label><label>หน่วย<input name="unit" required placeholder="kg / ชิ้น" /></label><button className="admin-primary">+ เพิ่มวัตถุดิบ</button></form>
        <section className="admin-panel"><div className="admin-table-wrap"><table><thead><tr><th>วัตถุดิบ</th><th>คงเหลือ</th><th>สถานะสต๊อก</th><th>ปรับจำนวน</th><th></th></tr></thead><tbody>{inventory.map(item => <tr key={item.id}><td><b>{item.ingredientName}</b></td><td><strong>{item.quantity} {item.unit}</strong></td><td><select value={item.status || 'ยังคงเหลือ'} onChange={event => updateInventory(item.id, { status: event.target.value })}><option>ยังคงเหลือ</option><option>หมดอายุ</option></select></td><td><div className="admin-stepper"><button onClick={() => updateInventory(item.id, { quantity: Math.max(0, item.quantity - 1) })}>−</button><span>{item.quantity}</span><button onClick={() => updateInventory(item.id, { quantity: item.quantity + 1 })}>+</button></div></td><td><button className="admin-text-danger" onClick={() => deleteInventory(item.id)}>ลบ</button></td></tr>)}</tbody></table></div></section>
    </>

    const renderReports = () => {
        const maxSold = Math.max(...productSales.map(product => product.sold), 1)

        // Weekly sales: group paid orders by weekday for the current week
        const DAYS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']
        const weeklyRevenue = [0, 0, 0, 0, 0, 0, 0]
        const weeklyCount = [0, 0, 0, 0, 0, 0, 0]
        const now = new Date()
        const startOfWeek = new Date(now)
        startOfWeek.setDate(now.getDate() - now.getDay()) // Sunday
        startOfWeek.setHours(0, 0, 0, 0)
        paidOrders.forEach(order => {
            const d = new Date(order.createdAt)
            if (d >= startOfWeek) {
                const dow = d.getDay()
                weeklyRevenue[dow] += order.totalAmount
                weeklyCount[dow]++
            }
        })
        const maxWeekly = Math.max(...weeklyRevenue, 1)
        const totalWeek = weeklyRevenue.reduce((s, v) => s + v, 0)

        return <><PageHead eyebrow="REPORTS" title="รีพอร์ตและสรุปการขาย" description="วิเคราะห์ยอดขายและดาวน์โหลดข้อมูลเพื่อนำไปใช้งานต่อ"><button className="admin-primary" onClick={exportReport}>↓ ดาวน์โหลด CSV</button></PageHead>
            <div className="admin-stats report"><article><small>ยอดขายสุทธิ</small><strong>{money(revenue)}</strong></article><article><small>จำนวนบิล</small><strong>{paidOrders.length}</strong></article><article><small>ยอดเฉลี่ย</small><strong>{money(averageOrder)}</strong></article></div>
            <section className="admin-panel" style={{ marginBottom: 20 }}>
                <div className="admin-panel-head"><div><h2>ยอดขายรายสัปดาห์</h2><p>สัปดาห์นี้ · รวม {money(totalWeek)} จาก {weeklyCount.reduce((s, v) => s + v, 0)} บิล</p></div></div>
                <div style={{ padding: '20px 24px 14px', overflowX: 'auto' }}>
                    <div style={{ display: 'flex', alignItems: 'end', gap: 10, height: 200 }}>
                        {DAYS.map((day, i) => <div key={day} style={{ flex: 1, display: 'grid', gap: 6, justifyItems: 'center', alignItems: 'end' }}>
                            <b style={{ fontSize: 10, color: '#0f9e1e', fontWeight: 800 }}>{weeklyRevenue[i] > 0 ? `฿${(weeklyRevenue[i] / 1000).toFixed(1)}k` : ''}</b>
                            <div style={{ width: '100%', background: i === now.getDay() ? '#0f9e1e' : '#b8ff35', borderRadius: '5px 5px 0 0', minHeight: 4, height: `${Math.max((weeklyRevenue[i] / maxWeekly) * 160, weeklyRevenue[i] > 0 ? 8 : 4)}px`, transition: 'height .4s ease' }} title={money(weeklyRevenue[i])} />
                            <small style={{ fontSize: 11, color: i === now.getDay() ? '#0f9e1e' : '#869088', fontWeight: i === now.getDay() ? 900 : 500 }}>{day}</small>
                        </div>)}
                    </div>
                </div>
            </section>
            <div className="admin-report-grid"><section className="admin-panel"><div className="admin-panel-head"><div><h2>ยอดขายตามสินค้า</h2><p>จำนวนสินค้าที่ขายได้ทั้งหมด</p></div></div><div className="admin-bars">{productSales.slice(0, 6).map(product => <div key={product.id}><span>{product.name}</span><div><i style={{ width: `${Math.max((product.sold / maxSold) * 100, 3)}%` }} /></div><b>{product.sold}</b></div>)}</div></section><section className="admin-panel"><div className="admin-panel-head"><div><h2>ช่องทางชำระเงิน</h2><p>สัดส่วนจากออเดอร์ทั้งหมด</p></div></div><div className="admin-payment-list">{[...new Set(orders.map(order => order.paymentMethod))].map(method => { const count = orders.filter(order => order.paymentMethod === method).length; return <div key={method}><span>{method}</span><b>{count} ออเดอร์</b><i style={{ width: `${(count / Math.max(orders.length, 1)) * 100}%` }} /></div> })}</div></section></div>
        </>
    }

    const renderSettings = () => <WebSettings notify={notify} fail={fail} />
    const renderSocial = () => <WebSocial notify={notify} fail={fail} />

    const pages = { overview: renderOverview, orders: renderOrders, hero: renderHero, categories: renderCategories, products: renderProducts, promotions: renderPromotions, users: renderUsers, inventory: renderInventory, reports: renderReports, settings: renderSettings, social: renderSocial }
    return <div className="admin-layout"><aside className="admin-sidebar"><button className="admin-brand" onClick={() => setActive('overview')}>{settings?.logoUrl ? <img src={settings.logoUrl} alt="Logo" style={{ width: 36, height: 36, objectFit: 'contain', borderRadius: 6 }} /> : <span>LL</span>}<div><b>{settings?.siteName || 'LimeLeaf'}</b><small>ADMIN CONSOLE</small></div></button><nav>{menuItems.map(([key, label, icon]) => <button key={key} className={active === key ? 'active' : ''} onClick={() => setActive(key)}><i className={`bi ${icon}`}></i><span>{label}</span>{key === 'orders' && pendingOrders.length > 0 && <b>{pendingOrders.length}</b>}</button>)}</nav><div className="admin-admin-card"><span>{adminInitials}</span><div><b>{adminName}</b><small>ผู้ดูแลระบบ</small></div></div></aside>
        <main className="admin-main"><div className="admin-mobile-top"><button className="admin-brand" onClick={() => setActive('overview')}>{settings?.logoUrl ? <img src={settings.logoUrl} alt="Logo" style={{ width: 32, height: 32, objectFit: 'contain', borderRadius: 6 }} /> : <span>LL</span>}<div><b>{settings?.siteName || 'LimeLeaf'}</b><small>ADMIN</small></div></button><strong>{menuItems.find(item => item[0] === active)?.[1]}</strong></div><div className="admin-content">{pages[active]()}</div></main>{notice && <div className="admin-toast"><i className="bi bi-check2-circle"></i> {notice}</div>}</div>
}




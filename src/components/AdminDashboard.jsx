import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../lib/AuthContext'
import { adminApi, heroApi } from '../lib/database'
import { WebSettings } from './WebSettings'
import { WebSocial } from './WebSocial'
import { AdminOverviewTab } from './admin/AdminOverviewTab'
import { AdminOrdersTab } from './admin/AdminOrdersTab'
import { AdminHeroTab } from './admin/AdminHeroTab'
import { AdminCategoriesTab } from './admin/AdminCategoriesTab'
import { AdminProductsTab } from './admin/AdminProductsTab'
import { AdminPromotionsTab } from './admin/AdminPromotionsTab'
import { AdminUsersTab } from './admin/AdminUsersTab'
import { AdminInventoryTab } from './admin/AdminInventoryTab'
import { AdminReportsTab } from './admin/AdminReportsTab'
import './AdminDashboard.css'

export { PageHead, Empty, PAGE_LINK_OPTIONS, roleNames, money } from './admin/AdminShared'

const menuItems = [
    ['overview', 'ภาพรวม', 'bi-grid-1x2'],
    ['orders', 'ยืนยันคำสั่งซื้อ', 'bi-check-circle'],
    ['hero', 'หน้าแรก (Hero)', 'bi-image'],
    ['categories', 'ประเภทสินค้า', 'bi-tags'],
    ['products', 'สินค้า', 'bi-box-seam'],
    ['promotions', 'โปรโมชั่น', 'bi-percent'],
    ['users', 'ผู้ใช้งาน', 'bi-people'],
    ['inventory', 'วัตถุดิบและสูตร', 'bi-boxes'],
    ['reports', 'รีพอร์ตและยอดขาย', 'bi-graph-up'],
    ['settings', 'ตั้งค่าเว็บไซต์', 'bi-gear'],
    ['social', 'โซเชียล', 'bi-share'],
]

export function AdminDashboard({ orders = [], setOrders, products = [], setProducts, categories = [], setCategories }) {
    const { profile, settings } = useAuth()
    const adminName = profile?.name || profile?.email || 'Admin'
    const adminInitials = adminName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    const [active, setActive] = useState('overview')
    const [heroSlides, setHeroSlides] = useState([])
    const [promotions, setPromotions] = useState([])
    const [users, setUsers] = useState([])
    const [inventory, setInventory] = useState([])
    const [notice, setNotice] = useState('')

    const safeOrders = Array.isArray(orders) ? orders : []
    const paidOrders = safeOrders.filter(order => order?.isPaid && order?.foodStatus !== 'ยกเลิก')
    const pendingOrders = safeOrders.filter(order => order?.serverStatus === 'PENDING' && order?.orderSource === 'online')
    const revenue = paidOrders.reduce((sum, order) => sum + (order?.totalAmount || 0), 0)
    const averageOrder = paidOrders.length ? revenue / paidOrders.length : 0
    const lowStock = (inventory || []).filter(item => (item?.quantity || 0) <= Number(item?.lowThreshold || 0))
    const productSales = useMemo(() => {
        const quantities = {}
        safeOrders.forEach(order => (order?.items || []).forEach(item => {
            if (item?.productId) {
                quantities[item.productId] = (quantities[item.productId] || 0) + (item.quantity || 0)
            }
        }))
        return (products || []).map(product => ({
            ...product,
            sold: quantities[product.id] || 0
        })).sort((a, b) => b.sold - a.sold)
    }, [safeOrders, products])

    const notify = message => {
        setNotice(message)
        window.setTimeout(() => setNotice(''), 2400)
    }
    const fail = error => {
        console.error('[API Admin]', error)
        notify(`เกิดข้อผิดพลาด: ${error.message}`)
    }

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
            setInventory(inventoryResult.map(item => ({
                id: item.id,
                ingredientName: item.name || 'วัตถุดิบทั่วไป',
                ingredientNameEn: item.nameEn || '',
                categoryId: item.categoryId,
                categoryName: item.category?.name || 'อื่น ๆ',
                categorySortOrder: Number(item.category?.sortOrder || 999),
                quantity: Number(item.quantity),
                unit: item.unit || 'ชิ้น',
                lowThreshold: Number(item.lowThreshold || 0),
                expiration: item.expiresAt || null,
                recipeCount: item.recipeItems?.length || 0,
            })))
        }).catch(fail)
    }, [])

    return (
        <div className="admin-layout">
            <aside className="admin-sidebar">
                <button className="admin-brand" onClick={() => setActive('overview')}>
                    {settings?.logoUrl ? (
                        <img src={settings.logoUrl} alt="Logo" style={{ width: 36, height: 36, objectFit: 'contain', borderRadius: 6 }} />
                    ) : (
                        <span>LL</span>
                    )}
                    <div>
                        <b>{settings?.siteName || 'LimeLeaf'}</b>
                        <small>ADMIN CONSOLE</small>
                    </div>
                </button>
                <nav>
                    {menuItems.map(([key, label, icon]) => (
                        <button key={key} className={active === key ? 'active' : ''} onClick={() => setActive(key)}>
                            <i className={`bi ${icon}`}></i>
                            <span>{label}</span>
                            {key === 'orders' && pendingOrders.length > 0 && <b>{pendingOrders.length}</b>}
                        </button>
                    ))}
                </nav>
                <div className="admin-admin-card">
                    <span>{adminInitials}</span>
                    <div>
                        <b>{adminName}</b>
                        <small>ผู้ดูแลระบบ</small>
                    </div>
                </div>
            </aside>

            <main className="admin-main">
                <div className="admin-mobile-top">
                    <button className="admin-brand" onClick={() => setActive('overview')}>
                        {settings?.logoUrl ? (
                            <img src={settings.logoUrl} alt="Logo" style={{ width: 32, height: 32, objectFit: 'contain', borderRadius: 6 }} />
                        ) : (
                            <span>LL</span>
                        )}
                        <div>
                            <b>{settings?.siteName || 'LimeLeaf'}</b>
                            <small>ADMIN</small>
                        </div>
                    </button>
                    <strong>{menuItems.find(item => item[0] === active)?.[1]}</strong>
                </div>

                <div className="admin-content">
                    {active === 'overview' && (
                        <AdminOverviewTab
                            revenue={revenue}
                            orders={safeOrders}
                            pendingOrders={pendingOrders}
                            averageOrder={averageOrder}
                            paidOrders={paidOrders}
                            lowStock={lowStock}
                            productSales={productSales}
                            setActive={setActive}
                            setActiveTab={setActive}
                        />
                    )}
                    {active === 'orders' && (
                        <AdminOrdersTab
                            orders={orders}
                            setOrders={setOrders}
                            pendingOrders={pendingOrders}
                            products={products}
                            notify={notify}
                            fail={fail}
                        />
                    )}
                    {active === 'hero' && (
                        <AdminHeroTab
                            heroSlides={heroSlides}
                            setHeroSlides={setHeroSlides}
                            notify={notify}
                            fail={fail}
                        />
                    )}
                    {active === 'categories' && (
                        <AdminCategoriesTab
                            categories={categories}
                            setCategories={setCategories}
                            products={products}
                            notify={notify}
                            fail={fail}
                        />
                    )}
                    {active === 'products' && (
                        <AdminProductsTab
                            products={products}
                            setProducts={setProducts}
                            categories={categories}
                            notify={notify}
                            fail={fail}
                        />
                    )}
                    {active === 'promotions' && (
                        <AdminPromotionsTab
                            promotions={promotions}
                            setPromotions={setPromotions}
                            adminName={adminName}
                            notify={notify}
                            fail={fail}
                        />
                    )}
                    {active === 'users' && (
                        <AdminUsersTab
                            users={users}
                            setUsers={setUsers}
                            notify={notify}
                            fail={fail}
                        />
                    )}
                    {active === 'inventory' && (
                        <AdminInventoryTab
                            inventory={inventory}
                            setInventory={setInventory}
                            products={products}
                            fail={fail}
                        />
                    )}
                    {active === 'reports' && (
                        <AdminReportsTab
                            orders={orders}
                            paidOrders={paidOrders}
                            revenue={revenue}
                            averageOrder={averageOrder}
                            productSales={productSales}
                            products={products}
                            notify={notify}
                        />
                    )}
                    {active === 'settings' && <WebSettings notify={notify} fail={fail} />}
                    {active === 'social' && <WebSocial notify={notify} fail={fail} />}
                </div>
            </main>
            {notice && <div className="admin-toast"><i className="bi bi-check2-circle"></i> {notice}</div>}
        </div>
    )
}

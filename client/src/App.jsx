import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import { OrderPage } from './components/OrderPage'
import { HomePage } from './components/HomePage'
import { ProfilePage } from './components/ProfilePage'
import { StoreMapPage } from './components/StoreMapPage'
import { KitchenDashboard } from './components/KitchenDashboard'
import { DeliveryDashboard } from './components/DeliveryDashboard'
import { CashierDashboard } from './components/CashierDashboard'
import { AdminDashboard } from './components/AdminDashboard'
import { AuthProvider, useAuth } from './lib/AuthContext'
import { LanguageProvider, useLanguage } from './lib/LanguageContext'
import { deliveryApi, ensureDeliveryForOrder, fetchCatalog, fetchOrders, placeOrder } from './lib/database'
import { SERVER_CHANGE_EVENT, SERVER_SYNC_KEY } from './lib/api'
import { attachRealtimeFallback, subscribeDatabaseChanges } from './lib/realtime'
import { CartDrawer } from './components/Cart'
import { CheckoutModal } from './components/Checkout'
import { ScrollToTop } from './components/ScrollToTop'
import { AuthModal } from './components/auth/AuthModal'
import { RoleRoute } from './components/auth/RoleRoute'

function Success({ onHome }) {
  const { t } = useLanguage()
  return (
    <div className="success-screen">
      <div>
        <span><i className="bi bi-check2-circle" /></span>
        <h1>{t('orderSuccess')}</h1>
        <p>{t('orderSuccessDesc')}</p>
        <button className="primary" onClick={onHome}>{t('backToHome')}</button>
      </div>
    </div>
  )
}

function MainApp() {
  const navigate = useNavigate()
  const { session, profile, loading, signOut, refreshProfile } = useAuth()
  const [cart, setCart] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('lime-cart')) || {}
    } catch {
      return {}
    }
  })
  const [itemNotes, setItemNotes] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('lime-cart-notes')) || {}
    } catch {
      return {}
    }
  })
  const [orders, setOrders] = useState([])
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [auth, setAuth] = useState(false)
  const [drawer, setDrawer] = useState(false)
  const [checkout, setCheckout] = useState(false)
  const [pointsToUse, setPointsToUse] = useState(0)
  const ordersRequestRef = useRef(null)
  const deliverySetupRef = useRef(new Map())

  const refreshOrders = useCallback(async () => {
    if (!session) {
      setOrders([])
      return []
    }
    if (ordersRequestRef.current) return ordersRequestRef.current

    const request = fetchOrders()
      .then(data => {
        setOrders(data)
        return data
      })
      .catch(error => {
        console.error('[API] โหลดออเดอร์ไม่สำเร็จ', error.message)
        return null
      })
      .finally(() => {
        ordersRequestRef.current = null
      })

    ordersRequestRef.current = request
    return request
  }, [session])

  useEffect(() => localStorage.setItem('lime-cart', JSON.stringify(cart)), [cart])
  useEffect(() => localStorage.setItem('lime-cart-notes', JSON.stringify(itemNotes)), [itemNotes])
  useEffect(() => {
    fetchCatalog().then(data => {
      setProducts(data.products)
      setCategories(data.categories)
    }).catch(error => console.error('[API] โหลดสินค้าไม่สำเร็จ', error.message))
  }, [])
  useEffect(() => {
    refreshOrders()
  }, [refreshOrders])

  useEffect(() => {
    if (!session) return undefined

    const refresh = () => refreshOrders()
    const onServerChange = () => refresh()
    const onStorage = event => {
      if (event.key === SERVER_SYNC_KEY) refresh()
    }

    const unsubscribeRealtime = subscribeDatabaseChanges({
      channelName: `limeleaf-orders-${profile?.role || 'user'}`,
      tables: ['orders', 'order_items', 'deliveries', 'tracking_events'],
      onChange: refresh,
      onStatus: (status, error) => {
        if (status === 'SUBSCRIBED') console.info('[Realtime] Orders connected')
        if (error) console.warn('[Realtime] Orders connection error', error)
      },
    })

    const detachFallback = attachRealtimeFallback({
      refresh,
      pollMs: 30000,
    })

    window.addEventListener(SERVER_CHANGE_EVENT, onServerChange)
    window.addEventListener('storage', onStorage)

    return () => {
      unsubscribeRealtime()
      detachFallback()
      window.removeEventListener(SERVER_CHANGE_EVENT, onServerChange)
      window.removeEventListener('storage', onStorage)
    }
  }, [session, profile?.role, refreshOrders])

  useEffect(() => {
    if (!session || !['cashier', 'admin'].includes(profile?.role)) return undefined

    const now = Date.now()
    const ready = orders.filter(order =>
      order.deliveryType === 'ให้จัดส่ง' &&
      order.serverStatus === 'READY' &&
      order.deliveryAddress
    )
    const readyIds = new Set(ready.map(order => order.id))

    for (const id of deliverySetupRef.current.keys()) {
      if (!readyIds.has(id)) deliverySetupRef.current.delete(id)
    }

    let cancelled = false
    const prepareDeliveries = async () => {
      for (const order of ready) {
        if (cancelled) return

        const lastAttempt = deliverySetupRef.current.get(order.id) || 0
        if (lastAttempt === Infinity || now - lastAttempt < 4000) continue
        deliverySetupRef.current.set(order.id, now)

        try {
          const delivery = await ensureDeliveryForOrder(order)
          if (!delivery || cancelled) continue

          if (delivery.status === 'PENDING') {
            const assigned = await deliveryApi.autoAssign(delivery.id).catch(() => null)
            if (assigned) deliverySetupRef.current.set(order.id, Infinity)
          } else {
            deliverySetupRef.current.set(order.id, Infinity)
          }
        } catch (error) {
          console.warn('[Delivery setup]', error.message)
        }
      }
    }

    prepareDeliveries()
    return () => { cancelled = true }
  }, [session, profile?.role, orders])

  const count = useMemo(() => products.reduce((sum, product) => sum + (cart[product.id] || 0), 0), [cart, products])

  const openCheckout = () => {
    if (!count) return setDrawer(true)
    if (!session) {
      setDrawer(false)
      setAuth(true)
      return
    }
    setDrawer(false)
    setCheckout(true)
  }

  const handlePlaceOrder = async details => {
    try {
      const validCart = Object.fromEntries(products.filter(product => cart[product.id] > 0).map(product => [product.id, cart[product.id]]))
      await placeOrder({ cart: validCart, ...details, itemNotes, pointsUsed: details.pointsUsed !== undefined ? details.pointsUsed : pointsToUse })
      await refreshProfile()
      await refreshOrders()
      const catalog = await fetchCatalog()
      setProducts(catalog.products)
      setCheckout(false)
      setCart({})
      setPointsToUse(0)
      navigate('/success')
    } catch (error) {
      console.error('[API] สร้างออเดอร์ไม่สำเร็จ', error)
      window.alert(`ไม่สามารถสร้างออเดอร์ได้: ${error.message}`)
    }
  }

  const handleLoginSuccess = user => {
    const role = (user?.role || '').toLowerCase()
    if (role === 'admin') navigate('/admin')
    else if (role === 'cashier' || role === 'staff') navigate('/cashier')
    else if (role === 'kitchen') navigate('/kitchen')
    else if (role === 'delivery') navigate('/delivery')
  }

  const navProps = {
    user: profile ?? (session ? { name: session.user.email } : null),
    onAuth: () => setAuth(true),
    onLogout: signOut,
    cartCount: count,
    onCart: () => setDrawer(true)
  }

  return (
    <>
      <Routes>
        <Route path="/" element={<HomePage onOrder={() => navigate('/order')} {...navProps} />} />
        <Route path="/order" element={<OrderPage onHome={() => navigate('/')} {...navProps} products={products} categories={categories} cart={cart} setCart={setCart} itemNotes={itemNotes} setItemNotes={setItemNotes} onCheckout={openCheckout} pointsToUse={pointsToUse} setPointsToUse={setPointsToUse} />} />
        <Route path="/map" element={<StoreMapPage {...navProps} onHome={() => navigate('/')} onOrder={() => navigate('/order')} />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/success" element={<Success onHome={() => navigate('/')} />} />
        <Route path="/kitchen" element={<RoleRoute session={session} profile={profile} loading={loading} roles={['kitchen', 'admin']} onAuth={() => setAuth(true)}><KitchenDashboard orders={orders} setOrders={setOrders} /></RoleRoute>} />
        <Route path="/delivery" element={<RoleRoute session={session} profile={profile} loading={loading} roles={['delivery', 'admin']} onAuth={() => setAuth(true)}><DeliveryDashboard orders={orders} setOrders={setOrders} /></RoleRoute>} />
        <Route path="/cashier" element={<RoleRoute session={session} profile={profile} loading={loading} roles={['cashier', 'admin']} onAuth={() => setAuth(true)}><CashierDashboard orders={orders} setOrders={setOrders} refreshOrders={refreshOrders} /></RoleRoute>} />
        <Route path="/admin" element={<RoleRoute session={session} profile={profile} loading={loading} roles={['admin']} onAuth={() => setAuth(true)}><AdminDashboard orders={orders} setOrders={setOrders} products={products} setProducts={setProducts} categories={categories} setCategories={setCategories} /></RoleRoute>} />
      </Routes>
      {auth && <AuthModal onClose={() => setAuth(false)} onSuccess={handleLoginSuccess} />}
      {drawer && <CartDrawer cart={cart} setCart={setCart} products={products} itemNotes={itemNotes} setItemNotes={setItemNotes} onClose={() => setDrawer(false)} onCheckout={openCheckout} pointsToUse={pointsToUse} setPointsToUse={setPointsToUse} onAuth={() => { setDrawer(false); setAuth(true); }} />}
      {checkout && <CheckoutModal cart={cart} products={products} itemNotes={itemNotes} onClose={() => setCheckout(false)} onDone={handlePlaceOrder} pointsToUse={pointsToUse} setPointsToUse={setPointsToUse} />}
      <ScrollToTop />
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <BrowserRouter>
          <MainApp />
        </BrowserRouter>
      </LanguageProvider>
    </AuthProvider>
  )
}

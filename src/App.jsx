import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import { Brand } from './components/Navbar'
import { OrderPage } from './components/OrderPage'
import { HomePage } from './components/HomePage'
import { ProfilePage } from './components/ProfilePage'
import { KitchenDashboard } from './components/KitchenDashboard'
import { DeliveryDashboard } from './components/DeliveryDashboard'
import { CashierDashboard } from './components/CashierDashboard'
import { AdminDashboard } from './components/AdminDashboard'
import { AuthProvider, useAuth } from './lib/AuthContext'
import { deliveryApi, ensureDeliveryForOrder, fetchCatalog, fetchOrders, placeOrder, validatePromotion } from './lib/database'
import { SERVER_CHANGE_EVENT, SERVER_SYNC_KEY } from './lib/api'
import { attachRealtimeFallback, subscribeDatabaseChanges } from './lib/realtime'
import { CartDrawer } from './components/Cart'
import { CheckoutModal } from './components/Checkout'
const money = value => new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(value || 0)

// ─── Auth Modal ─────────────────────────────────────────────────────────────
function AuthModal({ onClose }) {
  const { signIn, signUp } = useAuth()
  const [tab, setTab] = useState('login') // 'login' | 'register'
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  const handle = async (e) => {
    e.preventDefault()
    setErr(''); setLoading(true)
    const f = new FormData(e.currentTarget)
    const email = f.get('email'), password = f.get('password')

    let result
    if (tab === 'login') {
      result = await signIn({ email, password })
    } else {
      result = await signUp({ email, password, name: f.get('name') })
    }
    setLoading(false)
    if (result.error) { setErr(result.error.message); return }
    onClose()
  }

  return (
    <div className="overlay" onMouseDown={onClose}>
      <div className="auth-modal" onMouseDown={e => e.stopPropagation()}>
        <button className="x" onClick={onClose}>×</button>
        <Brand />

        {/* Tab Toggle */}
        <div style={{ display: 'flex', gap: 8, margin: '16px 0 20px' }}>
          {['login', 'register'].map(t => (
            <button key={t} onClick={() => { setTab(t); setErr('') }}
              style={{
                flex: 1, padding: '9px', border: '0', borderRadius: 8, fontWeight: 800, fontSize: 13, cursor: 'pointer',
                background: tab === t ? '#0f9e1e' : '#f0f4ec',
                color: tab === t ? '#b8ff35' : '#555'
              }}>
              {t === 'login' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}
            </button>
          ))}
        </div>

        <form onSubmit={handle}>
          {tab === 'register' && (
            <label>ชื่อ
              <input name="name" required placeholder="ชื่อ-นามสกุล" />
            </label>
          )}
          <label>อีเมล
            <input name="email" type="email" required placeholder="you@example.com" />
          </label>
          <label>รหัสผ่าน
            <input name="password" type="password" required placeholder="อย่างน้อย 6 ตัวอักษร" minLength={6} />
          </label>
          {err && <p style={{ color: '#cc2222', fontSize: 12, margin: '6px 0' }}>{err}</p>}
          <button className="primary" disabled={loading}>
            {loading ? 'กำลังดำเนินการ...' : tab === 'login' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}
          </button>
        </form>
      </div>
    </div>
  )
}


function Success({ onHome }) { return <div className="success-screen"><div><span>✓</span><h1>สั่งอาหารสำเร็จ</h1><p>คำสั่งซื้อถูกบันทึกใน Server แล้ว</p><button className="primary" onClick={onHome}>กลับหน้าหลัก</button></div></div> }

function RoleRoute({ session, profile, loading, roles, onAuth, children }) {
  if (loading) return <div className="app-loading" role="status" aria-label="กำลังโหลด"><div className="app-loading-mark"><i /><i /></div><span className="app-loading-spinner" /></div>

  // If not logged in at all
  if (!session) {
    return <div className="success-screen"><div>
      <span>🔒</span>
      <h1>ต้องเข้าสู่ระบบ</h1>
      <p>กรุณาเข้าสู่ระบบเพื่อใช้งานส่วนนี้</p>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 20 }}>
        <button className="secondary" onClick={() => window.location.assign('/')}>กลับหน้าหลัก</button>
        <button className="primary" onClick={onAuth}>เข้าสู่ระบบ</button>
      </div>
    </div></div>
  }

  // If logged in but wrong role
  if (!profile || profile.status !== 'active' || !roles.includes(profile.role)) return <div className="success-screen"><div><span>!</span><h1>ไม่มีสิทธิ์เข้าถึง</h1><p>บัญชีนี้ไม่ได้รับอนุญาตให้ใช้งานส่วนดังกล่าว</p><button className="primary" onClick={() => window.location.assign('/')}>กลับหน้าหลัก</button></div></div>

  return children
}

// ─── Main App ───────────────────────────────────────────────────────────────
function MainApp() {
  const navigate = useNavigate()
  const { session, profile, loading, signOut } = useAuth()
  const [cart, setCart] = useState(() => { try { return JSON.parse(localStorage.getItem('lime-cart')) || {} } catch { return {} } })
  const [itemNotes, setItemNotes] = useState(() => { try { return JSON.parse(localStorage.getItem('lime-cart-notes')) || {} } catch { return {} } })
  const [orders, setOrders] = useState([])
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [auth, setAuth] = useState(false)
  const [drawer, setDrawer] = useState(false)
  const [checkout, setCheckout] = useState(false)
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
    fetchCatalog().then(data => { setProducts(data.products); setCategories(data.categories) }).catch(error => console.error('[API] โหลดสินค้าไม่สำเร็จ', error.message))
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

    // Supabase Realtime is the primary sync path. We refetch through our Server API
    // instead of trusting database rows directly, so existing auth/mapping stays intact.
    const unsubscribeRealtime = subscribeDatabaseChanges({
      channelName: `limeleaf-orders-${profile?.role || 'user'}`,
      tables: ['orders', 'order_items', 'deliveries', 'tracking_events'],
      onChange: refresh,
      onStatus: (status, error) => {
        if (status === 'SUBSCRIBED') console.info('[Realtime] Orders connected')
        if (error) console.warn('[Realtime] Orders connection error', error)
      },
    })

    // Keep a slow fallback in case WebSocket is blocked or temporarily disconnected.
    const detachFallback = attachRealtimeFallback({
      refresh,
      pollMs: 30000,
    })

    // Same-browser / same-origin mutations still refresh instantly even before
    // the database Realtime event arrives.
    window.addEventListener(SERVER_CHANGE_EVENT, onServerChange)
    window.addEventListener('storage', onStorage)

    return () => {
      unsubscribeRealtime()
      detachFallback()
      window.removeEventListener(SERVER_CHANGE_EVENT, onServerChange)
      window.removeEventListener('storage', onStorage)
    }
  }, [session, profile?.role, refreshOrders])

  // Frontend-only compatibility for the current Server: READY delivery orders still
  // need a staff browser to ensure a Delivery exists. Keeping this at MainApp level
  // means it continues working even if Admin/Cashier navigates to another staff page.
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
    if (!session) { setDrawer(false); setAuth(true); return }
    setDrawer(false); setCheckout(true)
  }

  const handlePlaceOrder = async details => {
    try {
      const validCart = Object.fromEntries(products.filter(product => cart[product.id] > 0).map(product => [product.id, cart[product.id]]))
      await placeOrder({ cart: validCart, ...details, itemNotes })
      await refreshOrders()
      const catalog = await fetchCatalog()
      setProducts(catalog.products)
      setCheckout(false); setCart({}); navigate('/success')
    } catch (error) {
      console.error('[API] สร้างออเดอร์ไม่สำเร็จ', error)
      window.alert(`ไม่สามารถสร้างออเดอร์ได้: ${error.message}`)
    }
  }

  // Shared props for pages that need nav
  const navProps = {
    user: profile ?? (session ? { name: session.user.email } : null),
    onAuth: () => setAuth(true),
    onLogout: signOut,
    cartCount: count,
    onCart: () => setDrawer(true)
  }

  return <>
    <Routes>
      <Route path="/" element={<HomePage onOrder={() => navigate('/order')} {...navProps} />} />
      <Route path="/order" element={<OrderPage onHome={() => navigate('/')} {...navProps} products={products} categories={categories} cart={cart} setCart={setCart} itemNotes={itemNotes} setItemNotes={setItemNotes} onCheckout={openCheckout} />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/success" element={<Success onHome={() => navigate('/')} />} />
      <Route path="/kitchen" element={<RoleRoute session={session} profile={profile} loading={loading} roles={['kitchen', 'admin']} onAuth={() => setAuth(true)}><KitchenDashboard orders={orders} setOrders={setOrders} /></RoleRoute>} />
      <Route path="/delivery" element={<RoleRoute session={session} profile={profile} loading={loading} roles={['delivery', 'admin']} onAuth={() => setAuth(true)}><DeliveryDashboard orders={orders} setOrders={setOrders} /></RoleRoute>} />
      <Route path="/cashier" element={<RoleRoute session={session} profile={profile} loading={loading} roles={['cashier', 'admin']} onAuth={() => setAuth(true)}><CashierDashboard orders={orders} setOrders={setOrders} refreshOrders={refreshOrders} /></RoleRoute>} />
      <Route path="/admin" element={<RoleRoute session={session} profile={profile} loading={loading} roles={['admin']} onAuth={() => setAuth(true)}><AdminDashboard orders={orders} setOrders={setOrders} products={products} setProducts={setProducts} categories={categories} setCategories={setCategories} /></RoleRoute>} />
    </Routes>
    {auth && <AuthModal onClose={() => setAuth(false)} />}
    {drawer && <CartDrawer cart={cart} setCart={setCart} products={products} itemNotes={itemNotes} setItemNotes={setItemNotes} onClose={() => setDrawer(false)} onCheckout={openCheckout} />}
    {checkout && <CheckoutModal cart={cart} products={products} itemNotes={itemNotes} onClose={() => setCheckout(false)} onDone={handlePlaceOrder} />}
  </>
}

// ─── Root ───────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <MainApp />
      </BrowserRouter>
    </AuthProvider>
  )
}

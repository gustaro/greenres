import { normalizeRole, getRoleDashboardPath } from '../../lib/database'

export function RoleRoute({ session, profile, loading, roles, onAuth, children }) {
  if (loading) {
    return (
      <div className="app-loading" role="status" aria-label="กำลังโหลด">
        <div className="app-loading-mark"><i /><i /></div>
        <span className="app-loading-spinner" />
      </div>
    )
  }

  // If not logged in at all
  if (!session) {
    return (
      <div className="success-screen">
        <div>
          <span><i className="bi bi-shield-lock" /></span>
          <h1>ต้องเข้าสู่ระบบ</h1>
          <p>กรุณาเข้าสู่ระบบเพื่อใช้งานส่วนนี้</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 20 }}>
            <button className="secondary" onClick={() => window.location.assign('/')}>กลับหน้าหลัก</button>
            <button className="primary" onClick={onAuth}>เข้าสู่ระบบ</button>
          </div>
        </div>
      </div>
    )
  }

  // If logged in but wrong role
  const userRole = normalizeRole(profile?.role)
  const allowed = (roles || []).map(normalizeRole)
  const hasAccess = userRole === 'admin' || allowed.includes(userRole)

  if (!profile || profile.status !== 'active' || !hasAccess) {
    const ownDashboard = getRoleDashboardPath(userRole)
    return (
      <div className="success-screen">
        <div>
          <span><i className="bi bi-exclamation-triangle" /></span>
          <h1>ไม่มีสิทธิ์เข้าถึง</h1>
          <p>บัญชีนี้ ({profile?.email || 'ของคุณ'}) ไม่ได้รับอนุญาตให้ใช้งานส่วนดังกล่าว</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 20 }}>
            <button className="secondary" onClick={() => window.location.assign('/')}>กลับหน้าหลัก</button>
            {ownDashboard && ownDashboard !== '/' && (
              <button className="primary" onClick={() => window.location.assign(ownDashboard)}>ไปยังหน้าตามบทบาทของคุณ</button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return children
}

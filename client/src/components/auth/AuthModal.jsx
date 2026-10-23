import { useState } from 'react'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/AuthContext'
import { useLanguage } from '../../lib/LanguageContext'
import { Brand } from '../Navbar'

export function AuthModal({ onClose, onSuccess }) {
  const { signIn, signUp } = useAuth()
  const { t } = useLanguage()
  const [tab, setTab] = useState('login')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState('')

  const switchTo = (mode) => { setTab(mode); setErr(''); setNotice('') }
  const linkStyle = { background: 'none', border: 0, padding: 0, color: 'var(--brand-primary-dark, #0b5a1f)', fontWeight: 800, fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }

  const handle = async (e) => {
    e.preventDefault()
    setErr('')
    setNotice('')
    setLoading(true)
    const f = new FormData(e.currentTarget)
    const email = f.get('email')
    const password = f.get('password')

    if (tab === 'reset') {
      try {
        await api('/auth/reset-password', {
          method: 'POST',
          body: JSON.stringify({ email, name: f.get('name'), newPassword: f.get('newPassword') })
        })
        setLoading(false)
        setTab('login')
        setNotice(t('authResetDone'))
      } catch (error) {
        setLoading(false)
        setErr(error.message)
      }
      return
    }

    let result
    if (tab === 'login') {
      result = await signIn({ email, password })
    } else {
      result = await signUp({ email, password, name: f.get('name') })
    }
    setLoading(false)
    if (result.error) {
      setErr(result.error.message)
      return
    }
    const loggedInUser = result.data?.user
    if (onSuccess && loggedInUser) {
      onSuccess(loggedInUser)
    }
    onClose()
  }

  return (
    <div className="overlay" onMouseDown={onClose}>
      <div className="auth-modal" onMouseDown={e => e.stopPropagation()}>
        <button className="x" onClick={onClose}>×</button>
        <Brand />

        {/* Tab Toggle */}
        {tab === 'reset' ? (
          <div style={{ margin: '16px 0 12px' }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{t('authResetTitle')}</h3>
            <p style={{ fontSize: 12, color: '#555', margin: '6px 0 0' }}>{t('authResetHint')}</p>
          </div>
        ) : (
        <div style={{ display: 'flex', gap: 8, margin: '16px 0 20px' }}>
          {['login', 'register'].map(mode => (
            <button
              key={mode}
              onClick={() => switchTo(mode)}
              style={{
                flex: 1,
                padding: '9px',
                border: '0',
                borderRadius: 8,
                fontWeight: 800,
                fontSize: 13,
                cursor: 'pointer',
                background: tab === mode ? 'var(--brand-primary, #12852f)' : 'var(--brand-surface, #f0f4ec)',
                color: tab === mode ? 'var(--brand-accent, #b8ff35)' : '#555'
              }}
            >
              {mode === 'login' ? t('authSignIn') : t('authSignUp')}
            </button>
          ))}
        </div>
        )}

        <form onSubmit={handle}>
          {(tab === 'register' || tab === 'reset') && (
            <label>
              {t('authName')}
              <input name="name" required placeholder={t('authNamePlaceholder')} />
            </label>
          )}
          <label>
            {t('authEmail')}
            <input name="email" type="email" required placeholder="you@example.com" />
          </label>
          {tab === 'reset' ? (
            <label>
              {t('authNewPassword')}
              <input name="newPassword" type="password" required placeholder={t('authPasswordPlaceholder')} minLength={6} />
            </label>
          ) : (
            <label>
              {t('authPassword')}
              <input name="password" type="password" required placeholder={t('authPasswordPlaceholder')} minLength={6} />
            </label>
          )}
          {tab === 'login' && (
            <div style={{ textAlign: 'right', margin: '4px 0' }}>
              <button type="button" style={linkStyle} onClick={() => switchTo('reset')}>{t('authForgot')}</button>
            </div>
          )}
          {notice && <p style={{ color: '#0b5a1f', fontSize: 12, margin: '6px 0', fontWeight: 700 }}>{notice}</p>}
          {err && <p style={{ color: '#cc2222', fontSize: 12, margin: '6px 0' }}>{err}</p>}
          <button className="primary" disabled={loading}>
            {loading ? <><i className="bi bi-arrow-repeat spin me-1" /> {t('authProcessing')}</> : tab === 'login' ? t('authSignIn') : tab === 'register' ? t('authSignUp') : t('authResetSubmit')}
          </button>
          <div style={{ textAlign: 'center', marginTop: 12, fontSize: 13, color: '#555' }}>
            {tab === 'login' && <>{t('authNotMember')} <button type="button" style={linkStyle} onClick={() => switchTo('register')}>{t('authSignUp')}</button></>}
            {tab === 'register' && <button type="button" style={linkStyle} onClick={() => switchTo('login')}>{t('authHaveAccount')}</button>}
            {tab === 'reset' && <button type="button" style={linkStyle} onClick={() => switchTo('login')}>{t('authBackToLogin')}</button>}
          </div>
        </form>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { useAuth } from '../../lib/AuthContext'
import { useLanguage } from '../../lib/LanguageContext'
import { Brand } from '../Navbar'

export function AuthModal({ onClose, onSuccess }) {
  const { signIn, signUp } = useAuth()
  const { t } = useLanguage()
  const [tab, setTab] = useState('login')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  const handle = async (e) => {
    e.preventDefault()
    setErr('')
    setLoading(true)
    const f = new FormData(e.currentTarget)
    const email = f.get('email')
    const password = f.get('password')

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
        <div style={{ display: 'flex', gap: 8, margin: '16px 0 20px' }}>
          {['login', 'register'].map(mode => (
            <button
              key={mode}
              onClick={() => { setTab(mode); setErr('') }}
              style={{
                flex: 1,
                padding: '9px',
                border: '0',
                borderRadius: 8,
                fontWeight: 800,
                fontSize: 13,
                cursor: 'pointer',
                background: tab === mode ? '#12852f' : '#f0f4ec',
                color: tab === mode ? '#b8ff35' : '#555'
              }}
            >
              {mode === 'login' ? t('authSignIn') : t('authSignUp')}
            </button>
          ))}
        </div>

        <form onSubmit={handle}>
          {tab === 'register' && (
            <label>
              {t('authName')}
              <input name="name" required placeholder={t('authNamePlaceholder')} />
            </label>
          )}
          <label>
            {t('authEmail')}
            <input name="email" type="email" required placeholder="you@example.com" />
          </label>
          <label>
            {t('authPassword')}
            <input name="password" type="password" required placeholder={t('authPasswordPlaceholder')} minLength={6} />
          </label>
          {err && <p style={{ color: '#cc2222', fontSize: 12, margin: '6px 0' }}>{err}</p>}
          <button className="primary" disabled={loading}>
            {loading ? t('authProcessing') : tab === 'login' ? t('authSignIn') : t('authSignUp')}
          </button>
        </form>
      </div>
    </div>
  )
}

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
  const [fieldErrs, setFieldErrs] = useState({})

  const switchTo = (mode) => { setTab(mode); setErr(''); setNotice(''); setFieldErrs({}) }
  const linkStyle = { background: 'none', border: 0, padding: 0, color: 'var(--brand-primary-dark, #0b5a1f)', fontWeight: 800, fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }
  const clearFieldErr = (key) => setFieldErrs(prev => (prev[key] ? { ...prev, [key]: '' } : prev))
  const inputStyle = (key) => (fieldErrs[key] ? (isRequiredErr(key) ? { borderColor: '#d62828' } : { borderColor: 'var(--brand-accent-strong, #9fe51f)', boxShadow: '0 0 0 3px color-mix(in srgb, var(--brand-accent-strong, #9fe51f) 30%, transparent)' }) : undefined)
  const isRequiredErr = (key) => fieldErrs[key] === t('authErrRequired')
  const Req = ({ name }) => isRequiredErr(name) ? <span role="alert" aria-label={t('authErrRequired')} style={{ color: '#d62828', fontWeight: 900, fontSize: 15, marginLeft: 3 }}>*</span> : null
  const FieldError = ({ name }) => fieldErrs[name] && !isRequiredErr(name) ? (
    <span role="alert" style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5, padding: '6px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700, color: 'var(--brand-primary-dark, #075c1b)', background: 'var(--brand-accent-soft, #effbdc)', borderLeft: '4px solid var(--brand-accent-strong, #9fe51f)' }}>
      <i className="bi bi-exclamation-circle-fill" style={{ color: 'var(--brand-primary, #12852f)' }} />
      {fieldErrs[name]}
    </span>
  ) : null

  const validate = (f) => {
    const errs = {}
    const email = String(f.get('email') || '').trim()
    if (!email) errs.email = t('authErrRequired')
    else if (!/^\S+@\S+\.\S+$/.test(email)) errs.email = t('authErrEmail')
    if ((tab === 'register' || tab === 'reset') && !String(f.get('name') || '').trim()) errs.name = t('authErrRequired')
    const pwKey = tab === 'reset' ? 'newPassword' : 'password'
    const pw = String(f.get(pwKey) || '')
    if (!pw) errs[pwKey] = t('authErrRequired')
    else if (pw.length < 6) errs[pwKey] = t('authErrPassword')
    return errs
  }

  const handle = async (e) => {
    e.preventDefault()
    setErr('')
    setNotice('')
    const errs = validate(new FormData(e.currentTarget))
    setFieldErrs(errs)
    if (Object.keys(errs).length) return
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

        <form onSubmit={handle} noValidate>
          {(tab === 'register' || tab === 'reset') && (
            <label>
              {t('authName')}<Req name="name" />
              <input name="name" placeholder={t('authNamePlaceholder')} style={inputStyle('name')} onChange={() => clearFieldErr('name')} />
              <FieldError name="name" />
            </label>
          )}
          <label>
            {t('authEmail')}<Req name="email" />
            <input name="email" type="email" placeholder="you@example.com" style={inputStyle('email')} onChange={() => clearFieldErr('email')} />
            <FieldError name="email" />
          </label>
          {tab === 'reset' ? (
            <label>
              {t('authNewPassword')}<Req name="newPassword" />
              <input name="newPassword" type="password" placeholder={t('authPasswordPlaceholder')} style={inputStyle('newPassword')} onChange={() => clearFieldErr('newPassword')} />
              <FieldError name="newPassword" />
            </label>
          ) : (
            <label>
              {t('authPassword')}<Req name="password" />
              <input name="password" type="password" placeholder={t('authPasswordPlaceholder')} style={inputStyle('password')} onChange={() => clearFieldErr('password')} />
              <FieldError name="password" />
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

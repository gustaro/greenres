import { createContext, useContext, useEffect, useState } from 'react'
import { api, clearTokens, hasSessionToken, saveTokens } from './api'
import { mapUser } from './database'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [session, setSession] = useState(null)
    const [profile, setProfile] = useState(null)
    const [loading, setLoading] = useState(true)
    const [settings, setSettings] = useState({ logoUrl: null })

    const setAuthenticatedUser = user => {
        const mapped = mapUser(user)
        setProfile(mapped)
        setSession(mapped ? { user: mapped } : null)
        return mapped
    }

    useEffect(() => {
        api('/settings').then(res => {
            setSettings(res)
            document.title = (res?.siteName || 'LimeLeaf Catering')
        }).catch(() => { })

        let active = true
        const load = async () => {
            if (!hasSessionToken()) { setLoading(false); return }
            try {
                const user = await api('/auth/me')
                if (active) setAuthenticatedUser(user)
            } catch {
                clearTokens()
                if (active) setAuthenticatedUser(null)
            } finally {
                if (active) setLoading(false)
            }
        }
        load()
        return () => { active = false }
    }, [])

    const authenticate = async (path, payload) => {
        try {
            const result = await api(path, { method: 'POST', body: JSON.stringify(payload) })
            saveTokens(result)
            setAuthenticatedUser(result.user)
            return { data: result }
        } catch (error) { return { error } }
    }

    const signUp = ({ email, password, name, phone }) => authenticate('/auth/register', { email, password, name, phone })
    const signIn = ({ email, password }) => authenticate('/auth/login', { email, password })

    const signOut = async () => {
        try { if (hasSessionToken()) await api('/auth/logout', { method: 'POST' }) } catch { /* local logout still applies */ }
        clearTokens()
        setAuthenticatedUser(null)
    }

    const updateProfile = async updates => {
        if (!session) return { error: new Error('กรุณาเข้าสู่ระบบ') }
        try {
            const user = await api('/users/profile', {
                method: 'PUT', body: JSON.stringify({ name: updates.name, phone: updates.phone }),
            })
            setAuthenticatedUser({ ...profile, ...user, role: user.role || profile.serverRole })
            return { data: user }
        } catch (error) { return { error } }
    }

    const uploadAvatar = async () => ({ error: new Error('Server ยังไม่มี API สำหรับรูปโปรไฟล์') })

    return <AuthContext.Provider value={{ session, profile, loading, settings, setSettings, signUp, signIn, signOut, updateProfile, uploadAvatar }}>
        {children}
    </AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)

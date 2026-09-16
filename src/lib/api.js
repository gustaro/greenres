const API_BASE = (import.meta.env.VITE_API_URL || '/api').trim().replace(/\/+$/, '')
const ACCESS_TOKEN_KEY = 'limeleaf-access-token'
const REFRESH_TOKEN_KEY = 'limeleaf-refresh-token'

const getAccessToken = () => localStorage.getItem(ACCESS_TOKEN_KEY)
const getRefreshToken = () => localStorage.getItem(REFRESH_TOKEN_KEY)

export class ApiError extends Error {
    constructor(message, status, data = null) {
        super(message)
        this.name = 'ApiError'
        this.status = status
        this.data = data
    }
}

export const saveTokens = ({ accessToken, refreshToken }) => {
    if (accessToken) localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
    if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
}

export const clearTokens = () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
}

async function parseResponse(response) {
    if (response.status === 204) return null

    const contentType = response.headers.get('content-type') || ''
    let data = null
    if (contentType.includes('application/json')) {
        data = await response.json().catch(() => null)
    } else {
        const text = await response.text().catch(() => '')
        data = text ? { message: text } : null
    }

    if (!response.ok) {
        throw new ApiError(data?.message || `API error ${response.status}`, response.status, data)
    }
    return data
}

async function refreshAccessToken() {
    const refreshToken = getRefreshToken()
    if (!refreshToken) return false

    const response = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
    })

    if (!response.ok) {
        clearTokens()
        return false
    }

    const tokens = await response.json().catch(() => null)
    if (!tokens?.accessToken) {
        clearTokens()
        return false
    }
    saveTokens(tokens)
    return true
}

export async function api(path, options = {}, retry = true) {
    const headers = new Headers(options.headers || {})
    const token = getAccessToken()
    if (token) headers.set('Authorization', `Bearer ${token}`)

    if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json')
    }

    let response
    try {
        response = await fetch(`${API_BASE}${path}`, { ...options, headers })
    } catch (error) {
        throw new ApiError(`เชื่อมต่อ Server ไม่สำเร็จ (${error.message})`, 0)
    }

    if (response.status === 401 && retry && path !== '/auth/refresh' && await refreshAccessToken()) {
        return api(path, options, false)
    }
    if (response.status === 401) clearTokens()

    return parseResponse(response)
}

export const hasSessionToken = () => Boolean(getAccessToken() || getRefreshToken())
export const getApiBase = () => API_BASE

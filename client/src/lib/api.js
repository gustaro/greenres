const API_BASE = (import.meta.env.VITE_API_URL || '/api').trim().replace(/\/+$/, '')
const ACCESS_TOKEN_KEY = 'limeleaf-access-token'
const REFRESH_TOKEN_KEY = 'limeleaf-refresh-token'

export const SERVER_CHANGE_EVENT = 'limeleaf:server-change'
export const SERVER_SYNC_KEY = 'limeleaf-server-sync'

// In-flight request deduplication & memory cache
const inFlightRequests = new Map()
const memoryCache = new Map()
const CACHE_TTL_MS = 20 * 1000 // 20 seconds

export const clearApiCache = () => {
    memoryCache.clear()
}

// Invalidate cache when server change happens or across tabs
if (typeof window !== 'undefined') {
    window.addEventListener(SERVER_CHANGE_EVENT, clearApiCache)
    window.addEventListener('storage', (e) => {
        if (e.key === SERVER_SYNC_KEY) clearApiCache()
    })
}

const isPublicCacheablePath = (path) => {
    const cleanPath = path.split('?')[0]
    return (
        cleanPath.startsWith('/categories') ||
        cleanPath.startsWith('/products')
    )
}

const shouldBroadcastMutation = path => (
    path.startsWith('/orders') || path.startsWith('/kitchen') || path.startsWith('/delivery') ||
    path.startsWith('/products') || path.startsWith('/categories') || path.startsWith('/settings')
)

const broadcastServerChange = (path, method) => {
    if (typeof window === 'undefined') return
    const detail = { path, method, at: Date.now() }
    window.dispatchEvent(new CustomEvent(SERVER_CHANGE_EVENT, { detail }))
    try { localStorage.setItem(SERVER_SYNC_KEY, JSON.stringify(detail)) } catch { /* ignore storage errors */ }
}

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
    clearApiCache()
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
    const method = String(options.method || 'GET').toUpperCase()
    const isGet = method === 'GET'
    const isCacheable = isGet && !options.skipCache && isPublicCacheablePath(path)

    // Check memory cache
    if (isCacheable) {
        const cached = memoryCache.get(path)
        if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
            return cached.data
        }
        // Deduplicate in-flight requests
        if (inFlightRequests.has(path)) {
            return inFlightRequests.get(path)
        }
    }

    const executeRequest = async () => {
        const headers = new Headers(options.headers || {})
        const token = getAccessToken()
        if (token) headers.set('Authorization', `Bearer ${token}`)

        if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
            headers.set('Content-Type', 'application/json')
        }

        const fetchOptions = { ...options, headers }
        let requestPath = path

        if (isGet) {
            if (isCacheable) {
                // Allow browser / CDN caching for public read data
                fetchOptions.cache = 'default'
            } else {
                // Prevent aggressive browser caching for user/dynamic real-time data
                fetchOptions.cache = 'no-store'
                headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
                headers.set('Pragma', 'no-cache')
                requestPath += (requestPath.includes('?') ? '&' : '?') + `_t=${Date.now()}`
            }
        }

        let response
        try {
            response = await fetch(`${API_BASE}${requestPath}`, fetchOptions)
        } catch (error) {
            throw new ApiError(`เชื่อมต่อ Server ไม่สำเร็จ (${error.message})`, 0)
        }

        if (response.status === 401 && retry && path !== '/auth/refresh' && await refreshAccessToken()) {
            return api(path, options, false)
        }
        if (response.status === 401) clearTokens()

        const data = await parseResponse(response)

        if (isCacheable && response.ok) {
            memoryCache.set(path, { data, timestamp: Date.now() })
        }

        if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
            clearApiCache()
            if (shouldBroadcastMutation(path)) {
                broadcastServerChange(path, method)
            }
        }

        return data
    }

    if (isCacheable) {
        const promise = executeRequest().finally(() => {
            inFlightRequests.delete(path)
        })
        inFlightRequests.set(path, promise)
        return promise
    }

    return executeRequest()
}

export const hasSessionToken = () => Boolean(getAccessToken() || getRefreshToken())
export const getApiBase = () => API_BASE


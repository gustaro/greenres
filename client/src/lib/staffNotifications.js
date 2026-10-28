// System notifications, vibration and screen wake lock for staff pages that stay open
// (e.g. the rider page). Works only while the page is open; nothing is stored on the server.

let registrationPromise = null

export function getNotificationSupport() {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
    return Notification.permission // 'default' | 'granted' | 'denied'
}

function registerWorker() {
    if (!('serviceWorker' in navigator)) return Promise.resolve(null)
    registrationPromise ||= navigator.serviceWorker.register('/sw.js').catch(() => null)
    return registrationPromise
}

// Must be called from a click: browsers only show the permission prompt after a user gesture.
export async function requestNotificationPermission() {
    if (getNotificationSupport() === 'unsupported') return 'unsupported'
    registerWorker()
    try {
        return await Notification.requestPermission()
    } catch {
        return getNotificationSupport()
    }
}

export async function showSystemNotification(title, { body = '', tag, url = '/' } = {}) {
    if (getNotificationSupport() !== 'granted') return false
    const options = { body, tag, renotify: Boolean(tag), requireInteraction: true, vibrate: [300, 150, 300, 150, 300], data: { url } }
    const registration = await registerWorker()
    if (registration?.showNotification) {
        await registration.showNotification(title, options)
        return true
    }
    try {
        // Desktop fallback; mobile Chrome rejects this constructor.
        new Notification(title, options)
        return true
    } catch {
        return false
    }
}

export function vibrate(pattern = [300, 150, 300, 150, 300]) {
    try { return navigator.vibrate?.(pattern) || false } catch { return false }
}

// ── Screen wake lock (keeps the phone screen on while waiting for jobs) ──
let wakeLock = null
let wakeLockWanted = false

export const isWakeLockSupported = () => typeof navigator !== 'undefined' && 'wakeLock' in navigator

async function acquireWakeLock() {
    if (!wakeLockWanted || !isWakeLockSupported() || document.visibilityState !== 'visible') return
    try {
        wakeLock = await navigator.wakeLock.request('screen')
        wakeLock.addEventListener('release', () => { wakeLock = null })
    } catch {
        wakeLock = null
    }
}

// The browser drops the lock whenever the tab is hidden, so take it again when we come back.
const onVisibility = () => { if (wakeLockWanted && !wakeLock) acquireWakeLock() }

export async function setScreenWakeLock(enabled) {
    wakeLockWanted = enabled
    if (enabled) {
        document.addEventListener('visibilitychange', onVisibility)
        await acquireWakeLock()
        return Boolean(wakeLock)
    }
    document.removeEventListener('visibilitychange', onVisibility)
    if (wakeLock) {
        try { await wakeLock.release() } catch { /* already released */ }
        wakeLock = null
    }
    return false
}

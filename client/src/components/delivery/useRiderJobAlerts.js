import { useEffect, useRef, useState } from 'react'
import { playAlert, unlockAudio, getAudioState, onAudioStateChange } from '../../lib/alertSounds'
import { getNotificationSupport, requestNotificationPermission, showSystemNotification, vibrate, isWakeLockSupported, setScreenWakeLock } from '../../lib/staffNotifications'
import { orderCode } from '../StaffShared'

const PREF_KEY = 'rider-alert-prefs'
// Jobs load right after the page opens; what is already there is known, not "new".
const ALERT_WARMUP_MS = 4000
const WAITING_STATUSES = ['PENDING', 'ASSIGNED']

const readPrefs = () => {
    try { return { sound: true, keepAwake: false, ...JSON.parse(localStorage.getItem(PREF_KEY) || '{}') } } catch { return { sound: true, keepAwake: false } }
}

// Alerts a rider about new jobs while the rider page is open: sound, vibration, an in-page
// toast, and a system notification when the browser is in the background.
export function useRiderJobAlerts({ jobs, rider, isAdmin }) {
    const [prefs, setPrefs] = useState(readPrefs)
    const [audioState, setAudioState] = useState(getAudioState)
    const [notificationPermission, setNotificationPermission] = useState(getNotificationSupport)
    const [keepAwakeActive, setKeepAwakeActive] = useState(false)
    const [toasts, setToasts] = useState([])
    const prefsRef = useRef(prefs)
    prefsRef.current = prefs

    const updatePrefs = changes => setPrefs(current => {
        const next = { ...current, ...changes }
        try { localStorage.setItem(PREF_KEY, JSON.stringify(next)) } catch { /* private mode */ }
        return next
    })

    const dismissToast = id => setToasts(current => current.filter(toast => toast.id !== id))

    useEffect(() => {
        const stopListening = onAudioStateChange(setAudioState)
        const unlock = () => { unlockAudio() }
        document.addEventListener('pointerdown', unlock)
        document.addEventListener('keydown', unlock)
        return () => {
            stopListening()
            document.removeEventListener('pointerdown', unlock)
            document.removeEventListener('keydown', unlock)
        }
    }, [])

    useEffect(() => {
        let cancelled = false
        setScreenWakeLock(prefs.keepAwake).then(active => { if (!cancelled) setKeepAwakeActive(active) })
        return () => { cancelled = true }
    }, [prefs.keepAwake])
    useEffect(() => () => { setScreenWakeLock(false) }, [])

    const enableNotifications = async () => {
        unlockAudio()
        setNotificationPermission(await requestNotificationPermission())
    }

    const testAlert = async () => {
        await unlockAudio()
        playAlert('rider')
        vibrate()
        await showSystemNotification('ทดสอบการแจ้งเตือน', { body: 'ถ้าเห็นข้อความนี้ แปลว่าการแจ้งเตือนงานใหม่พร้อมใช้งาน', tag: 'rider-test', url: '/delivery' })
    }

    // A job concerns this rider when it is assigned to them, or open while they are "พร้อมรับงาน".
    const relevantJobs = isAdmin || !rider ? [] : jobs.filter(job => WAITING_STATUSES.includes(job.status)
        && (job.riderId === rider.id || (!job.riderId && rider.status === 'AVAILABLE')))
    const signature = relevantJobs.map(job => job.id).join('|')

    const mountedAtRef = useRef(Date.now())
    const knownRef = useRef(null)
    useEffect(() => {
        const ids = relevantJobs.map(job => job.id)
        if (!knownRef.current || Date.now() - mountedAtRef.current < ALERT_WARMUP_MS) {
            knownRef.current = new Set([...(knownRef.current || []), ...ids])
            return
        }
        const newJobs = relevantJobs.filter(job => !knownRef.current.has(job.id))
        if (newJobs.length === 0) return
        newJobs.forEach(job => knownRef.current.add(job.id))

        if (prefsRef.current.sound) playAlert('rider')
        vibrate()

        newJobs.forEach(job => {
            const mine = job.riderId === rider.id
            const title = mine ? 'มีงานจัดส่งมอบหมายให้คุณ' : 'มีงานจัดส่งใหม่รอรับ'
            const itemCount = (job.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0)
            const body = `${orderCode(job)} · ${job.deliveryAddress || 'ดูที่อยู่ในแอป'}${itemCount ? ` · ${itemCount} รายการ` : ''}`
            setToasts(current => [...current, {
                id: `${job.id}-${Date.now()}`,
                type: 'new_order',
                title,
                message: body,
                meta: job.isPaid ? 'ชำระแล้ว' : `เก็บเงินปลายทาง ฿${Number(job.totalAmount || 0).toLocaleString('th-TH')}`,
                duration: 10000,
            }])
            // The page is already in front of the rider when visible; the system notification is for the background.
            if (document.visibilityState !== 'visible') {
                showSystemNotification(title, { body, tag: `delivery-${job.id}`, url: '/delivery' })
            }
        })
    }, [signature])

    return {
        prefs, updatePrefs,
        audioState,
        notificationPermission, enableNotifications,
        keepAwakeSupported: isWakeLockSupported(), keepAwakeActive,
        testAlert,
        toasts, dismissToast,
    }
}

import { isSupabaseConfigured, supabase } from './supabase'

const DEFAULT_SCHEMA = 'public'
const FALLBACK_POLL_MS = 30000

const unique = values => [...new Set(values.filter(Boolean))]

export function subscribeDatabaseChanges({
    channelName = 'limeleaf-realtime',
    tables = [],
    onChange,
    onStatus,
    debounceMs = 120,
} = {}) {
    if (!isSupabaseConfigured || !supabase || tables.length === 0) {
        onStatus?.('DISABLED')
        return () => { }
    }

    let active = true
    let debounceTimer = null
    const normalizedTables = unique(tables)
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const channel = supabase.channel(`${channelName}-${suffix}`)

    const emit = payload => {
        if (!active) return
        if (debounceTimer) window.clearTimeout(debounceTimer)
        debounceTimer = window.setTimeout(() => {
            debounceTimer = null
            if (active) onChange?.(payload)
        }, debounceMs)
    }

    normalizedTables.forEach(table => {
        channel.on(
            'postgres_changes',
            { event: '*', schema: DEFAULT_SCHEMA, table },
            payload => emit({ ...payload, table })
        )
    })

    channel.subscribe((status, error) => {
        onStatus?.(status, error)
        if (error) console.error('[Realtime]', error)
    })

    return () => {
        active = false
        if (debounceTimer) window.clearTimeout(debounceTimer)
        supabase.removeChannel(channel).catch(() => { })
    }
}

export function attachRealtimeFallback({
    refresh,
    pollMs = FALLBACK_POLL_MS,
    enabled = true,
} = {}) {
    if (!enabled || typeof window === 'undefined' || typeof refresh !== 'function') return () => { }

    const refreshIfVisible = () => {
        if (document.visibilityState === 'visible') refresh()
    }
    const onFocus = () => refresh()
    const onVisibility = () => {
        if (document.visibilityState === 'visible') refresh()
    }
    const onOnline = () => refresh()

    const timer = window.setInterval(refreshIfVisible, pollMs)
    window.addEventListener('focus', onFocus)
    window.addEventListener('online', onOnline)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
        window.clearInterval(timer)
        window.removeEventListener('focus', onFocus)
        window.removeEventListener('online', onOnline)
        document.removeEventListener('visibilitychange', onVisibility)
    }
}

export { FALLBACK_POLL_MS }

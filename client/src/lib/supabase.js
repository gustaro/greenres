import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()

export const isSupabaseConfigured = Boolean(
    url && key && !url.includes('YOUR_PROJECT') && !key.includes('YOUR_')
)

if (!isSupabaseConfigured) {
    console.warn('[Supabase] Realtime disabled: กรุณาตั้งค่า VITE_SUPABASE_URL และ VITE_SUPABASE_PUBLISHABLE_KEY ใน .env.local')
}

export const supabase = isSupabaseConfigured
    ? createClient(url, key, {
        realtime: {
            params: { eventsPerSecond: 20 },
        },
    })
    : null

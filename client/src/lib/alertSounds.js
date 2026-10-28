// Alert sounds for staff screens. One shared AudioContext: browsers keep it "suspended"
// until the user interacts with the page, so callers can show an "enable sound" prompt.
let ctx = null
const listeners = new Set()

const notify = () => listeners.forEach(listener => listener(getAudioState()))

function getContext() {
    if (ctx) return ctx
    const AudioContextClass = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)
    if (!AudioContextClass) return null
    ctx = new AudioContextClass()
    ctx.onstatechange = notify
    return ctx
}

export function getAudioState() {
    const context = getContext()
    return context ? context.state : 'unsupported'
}

export function onAudioStateChange(listener) {
    listeners.add(listener)
    return () => listeners.delete(listener)
}

export async function unlockAudio() {
    const context = getContext()
    if (context && context.state !== 'running') {
        try { await context.resume() } catch { /* still blocked */ }
    }
    notify()
    return getAudioState()
}

// [frequency Hz, start offset s, duration s]
const PATTERNS = {
    // Food ready to serve: bright "ding-dong", played twice.
    serve: { type: 'sine', volume: 0.4, notes: [[880, 0, 0.35], [659.25, 0.3, 0.55], [880, 1.0, 0.35], [659.25, 1.3, 0.55]] },
    // Food waiting for the rider: quick rising triple beep, played twice.
    rider: { type: 'triangle', volume: 0.38, notes: [[523.25, 0, 0.14], [659.25, 0.16, 0.14], [783.99, 0.32, 0.24], [523.25, 0.8, 0.14], [659.25, 0.96, 0.14], [783.99, 1.12, 0.24]] },
}

function schedule(context, pattern) {
    const base = context.currentTime + 0.02
    pattern.notes.forEach(([frequency, offset, duration]) => {
        const start = base + offset
        const osc = context.createOscillator()
        const gain = context.createGain()
        osc.type = pattern.type
        osc.frequency.setValueAtTime(frequency, start)
        gain.gain.setValueAtTime(0.0001, start)
        gain.gain.exponentialRampToValueAtTime(pattern.volume, start + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
        osc.connect(gain)
        gain.connect(context.destination)
        osc.start(start)
        osc.stop(start + duration + 0.05)
    })
}

// Returns false when the browser is still blocking audio (nothing was heard).
export function playAlert(kind = 'serve') {
    const context = getContext()
    const pattern = PATTERNS[kind] || PATTERNS.serve
    if (!context) return false
    if (context.state === 'running') {
        schedule(context, pattern)
        return true
    }
    // Try to resume; skip the sound if it only unlocks much later, so stale alerts don't play.
    const requestedAt = Date.now()
    context.resume()
        .then(() => { if (context.state === 'running' && Date.now() - requestedAt < 1500) schedule(context, pattern) })
        .catch(() => { })
    return false
}

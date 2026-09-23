import React, { useEffect, useState } from 'react'
import './ToastNotification.css'

// Audio chime utility using Web Audio API (gentle pleasant double-beep)
export function playNotificationChime() {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext
        if (!AudioContext) return
        const ctx = new AudioContext()

        // First tone
        const osc1 = ctx.createOscillator()
        const gain1 = ctx.createGain()
        osc1.type = 'sine'
        osc1.frequency.setValueAtTime(587.33, ctx.currentTime) // D5
        gain1.gain.setValueAtTime(0.12, ctx.currentTime)
        gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25)
        osc1.connect(gain1)
        gain1.connect(ctx.destination)
        osc1.start(ctx.currentTime)
        osc1.stop(ctx.currentTime + 0.25)

        // Second higher tone
        const osc2 = ctx.createOscillator()
        const gain2 = ctx.createGain()
        osc2.type = 'sine'
        osc2.frequency.setValueAtTime(880.00, ctx.currentTime + 0.12) // A5
        gain2.gain.setValueAtTime(0.15, ctx.currentTime + 0.12)
        gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45)
        osc2.connect(gain2)
        gain2.connect(ctx.destination)
        osc2.start(ctx.currentTime + 0.12)
        osc2.stop(ctx.currentTime + 0.45)
    } catch {
        // Audio might be blocked before first user interaction; ignore silently
    }
}

export function ToastContainer({ toasts, onDismiss }) {
    if (!toasts || toasts.length === 0) return null

    return (
        <div className="toast-portal-container" aria-live="polite">
            {toasts.map(toast => (
                <ToastItem key={toast.id} toast={toast} onDismiss={() => onDismiss(toast.id)} />
            ))}
        </div>
    )
}

function ToastItem({ toast, onDismiss }) {
    const duration = toast.duration || 6000
    const [progress, setProgress] = useState(100)
    const [isClosing, setIsClosing] = useState(false)

    useEffect(() => {
        const startTime = Date.now()
        const interval = setInterval(() => {
            const elapsed = Date.now() - startTime
            const remaining = Math.max(0, 100 - (elapsed / duration) * 100)
            setProgress(remaining)
            if (remaining <= 0) {
                clearInterval(interval)
                handleClose()
            }
        }, 50)

        return () => clearInterval(interval)
    }, [duration])

    const handleClose = () => {
        setIsClosing(true)
        setTimeout(() => {
            onDismiss()
        }, 250)
    }

    const typeConfig = {
        new_order: {
            icon: 'bi-bell-fill',
            badgeClass: 'badge-new-order',
            barClass: 'bar-new-order',
            title: toast.title || 'ออเดอร์ใหม่เข้าครัว!',
        },
        food_ready: {
            icon: 'bi-check-circle-fill',
            badgeClass: 'badge-food-ready',
            barClass: 'bar-food-ready',
            title: toast.title || 'อาหารพร้อมเสิร์ฟแล้ว!',
        },
        info: {
            icon: 'bi-info-circle-fill',
            badgeClass: 'badge-info',
            barClass: 'bar-info',
            title: toast.title || 'แจ้งเตือนระบบ',
        }
    }

    const cfg = typeConfig[toast.type] || typeConfig.info

    return (
        <div className={`countdown-toast-card ${cfg.badgeClass} ${isClosing ? 'slide-out' : 'slide-in'}`}>
            <div className="toast-card-body">
                <div className="toast-icon-wrap">
                    <i className={`bi ${cfg.icon}`}></i>
                </div>
                <div className="toast-content-wrap">
                    <div className="toast-header-row">
                        <strong className="toast-title">{cfg.title}</strong>
                        <button type="button" className="toast-close-btn" onClick={handleClose} aria-label="ปิด">
                            <i className="bi bi-x-lg"></i>
                        </button>
                    </div>

                    {toast.orderCode && (
                        <div className="toast-order-code">
                            <span>#{toast.orderCode}</span>
                            {toast.meta && <small className="toast-order-meta">{toast.meta}</small>}
                        </div>
                    )}

                    {toast.message && <p className="toast-message">{toast.message}</p>}

                    {toast.itemsSummary && (
                        <div className="toast-items-summary">
                            <i className="bi bi-card-list"></i>
                            <span>{toast.itemsSummary}</span>
                        </div>
                    )}

                    {(toast.action || toast.onAction) && (
                        <div className="toast-action-row">
                            <button
                                type="button"
                                className="toast-action-btn"
                                onClick={() => {
                                    if (toast.action?.onClick) toast.action.onClick()
                                    else if (toast.onAction) toast.onAction()
                                    handleClose()
                                }}
                            >
                                <i className={`bi ${toast.action?.icon || toast.actionIcon || 'bi-check2'}`}></i>
                                {toast.action?.label || toast.actionLabel || 'ตกลง'}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Countdown Progress Bar */}
            <div className="toast-progress-track">
                <div
                    className={`toast-progress-bar ${cfg.barClass}`}
                    style={{ width: `${progress}%` }}
                />
            </div>
        </div>
    )
}

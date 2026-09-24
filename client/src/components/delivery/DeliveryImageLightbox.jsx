import { useEffect } from 'react'

export function DeliveryImageLightbox({ image, title = 'หลักฐานการจัดส่ง', subtitle = '', onClose }) {
    useEffect(() => {
        const onKeyDown = e => {
            if (e.key === 'Escape') onClose?.()
        }
        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [onClose])

    if (!image) return null

    return (
        <div
            className="receipt-overlay"
            style={{ zIndex: 9999, background: 'rgba(5, 20, 10, 0.85)', backdropFilter: 'blur(6px)' }}
            onClick={onClose}
        >
            <div
                className="delivery-lightbox-content"
                onClick={e => e.stopPropagation()}
                style={{
                    background: '#ffffff',
                    borderRadius: 18,
                    overflow: 'hidden',
                    maxWidth: 540,
                    width: '92%',
                    boxShadow: '0 24px 60px rgba(0,0,0,0.35)',
                    animation: 'scaleUp 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
            >
                <header
                    style={{
                        padding: '14px 18px',
                        background: 'linear-gradient(135deg, #12852f 0%, #0d6323 100%)',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}
                >
                    <div>
                        <b style={{ fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <i className="bi bi-image" />
                            {title}
                        </b>
                        {subtitle && <small style={{ opacity: 0.85, fontSize: 12, display: 'block', marginTop: 2 }}>{subtitle}</small>}
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'rgba(255,255,255,0.2)',
                            border: 'none',
                            color: '#ffffff',
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'background 0.2s',
                        }}
                    >
                        <i className="bi bi-x-lg" />
                    </button>
                </header>

                <div style={{ padding: 16, textAlign: 'center', background: '#0a1a0f' }}>
                    <img
                        src={image}
                        alt={title}
                        style={{
                            maxWidth: '100%',
                            maxHeight: '65vh',
                            objectFit: 'contain',
                            borderRadius: 10,
                            display: 'block',
                            margin: '0 auto',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                        }}
                    />
                </div>

                <footer
                    style={{
                        padding: '12px 18px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: '#f8faf7',
                        borderTop: '1px solid #e5ebe3',
                    }}
                >
                    <a
                        href={image}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            fontSize: 13,
                            color: '#12852f',
                            fontWeight: 700,
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                        }}
                    >
                        <i className="bi bi-box-arrow-up-right" /> เปิดรูปภาพขนาดเต็ม
                    </a>
                    <button
                        onClick={onClose}
                        className="staff-primary"
                        style={{ padding: '8px 20px', borderRadius: 8, fontWeight: 700 }}
                    >
                        ปิดหน้าต่าง
                    </button>
                </footer>
            </div>
        </div>
    )
}

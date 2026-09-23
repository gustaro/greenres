import React from 'react'
import { useLanguage } from '../../lib/LanguageContext'

export function StoreInfoCard({ settings }) {
    const { t } = useLanguage()
    const address = settings?.restaurantAddress || '128 ถนนสุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพฯ 10110'
    const phone = settings?.restaurantPhone || '02-123-4567'
    const hours = settings?.storeHours || 'เปิดบริการทุกวัน: 10:00 - 22:00 น.'
    const lineUrl = settings?.lineUrl && settings.lineUrl !== '#' ? settings.lineUrl : 'https://line.me'
    const facebookUrl = settings?.facebookUrl && settings.facebookUrl !== '#' ? settings.facebookUrl : null
    const instagramUrl = settings?.instagramUrl && settings.instagramUrl !== '#' ? settings.instagramUrl : null

    const cleanPhone = phone.replace(/[^0-9]/g, '')

    return (
        <div className="store-card">
            <div className="store-card-header">
                <h2>
                    <i className="bi bi-shop"></i>
                    <span>{t('storeInfoTitle')}</span>
                </h2>
            </div>
            <div className="store-card-body">
                <div className="store-info-list">
                    <div className="store-info-item">
                        <div className="store-info-icon">
                            <i className="bi bi-geo-alt-fill"></i>
                        </div>
                        <div className="store-info-text">
                            <h4>{t('storeAddressLabel')}</h4>
                            <p>{address}</p>
                        </div>
                    </div>

                    <div className="store-info-item">
                        <div className="store-info-icon">
                            <i className="bi bi-telephone-fill"></i>
                        </div>
                        <div className="store-info-text">
                            <h4>{t('storePhoneLabel')}</h4>
                            <p>{phone}</p>
                        </div>
                    </div>

                    <div className="store-info-item">
                        <div className="store-info-icon">
                            <i className="bi bi-clock-fill"></i>
                        </div>
                        <div className="store-info-text">
                            <h4>{t('storeHoursLabel')}</h4>
                            <p>{hours}</p>
                        </div>
                    </div>
                </div>

                <div className="store-quick-actions">
                    <a
                        href={`tel:${cleanPhone}`}
                        className="btn-quick-action btn-quick-call"
                    >
                        <i className="bi bi-telephone-outbound-fill"></i>
                        <span>{t('callStore')}</span>
                    </a>
                    <a
                        href={lineUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-quick-action btn-quick-line"
                    >
                        <i className="bi bi-chat-dots-fill"></i>
                        <span>{t('chatLine')}</span>
                    </a>
                </div>

                {(facebookUrl || instagramUrl) && (
                    <div style={{ marginTop: 24, paddingTop: 18, borderTop: '1px solid #f0f4ef', display: 'flex', gap: 12, alignItems: 'center' }}>
                        <span style={{ fontSize: 13, color: '#778877', fontWeight: 600 }}>Follow us:</span>
                        {facebookUrl && (
                            <a
                                href={facebookUrl}
                                target="_blank"
                                rel="noreferrer"
                                style={{ color: '#1877f2', fontSize: 18, display: 'inline-flex' }}
                                title="Facebook"
                            >
                                <i className="bi bi-facebook"></i>
                            </a>
                        )}
                        {instagramUrl && (
                            <a
                                href={instagramUrl}
                                target="_blank"
                                rel="noreferrer"
                                style={{ color: '#e4405f', fontSize: 18, display: 'inline-flex' }}
                                title="Instagram"
                            >
                                <i className="bi bi-instagram"></i>
                            </a>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

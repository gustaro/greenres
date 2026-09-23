import React from 'react'
import { Navbar } from './Navbar'
import { Footer } from './Footer'
import { useAuth } from '../lib/AuthContext'
import { useLanguage } from '../lib/LanguageContext'
import { StoreMapViewer } from './map/StoreMapViewer'
import { StoreInfoCard } from './map/StoreInfoCard'
import { StoreContactForm } from './map/StoreContactForm'
import './map/storeMap.css'

export function StoreMapPage(props) {
    const { settings } = useAuth()
    const { t } = useLanguage()

    return (
        <div className="store-map-page">
            <Navbar
                {...props}
                transparent
            />

            <section className="store-map-hero">
                <div className="store-map-hero-inner">
                    <div className="store-map-badge">
                        <span className="store-map-badge-dot"></span>
                        <span>{t('storeOpenBadge')}</span>
                    </div>
                    <h1>{t('mapPageTitle')}</h1>
                    <p>{t('mapPageSubtitle')}</p>
                </div>
            </section>

            <main className="store-map-content">
                <div className="store-map-col-left">
                    <StoreMapViewer settings={settings} />
                    <StoreInfoCard settings={settings} />
                </div>
                <div className="store-map-col-right">
                    <StoreContactForm />
                </div>
            </main>

            <Footer />
        </div>
    )
}

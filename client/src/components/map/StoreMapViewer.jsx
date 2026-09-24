import React, { useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import { GoogleMap, Marker as GoogleMarker, useJsApiLoader } from '@react-google-maps/api'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import icon from 'leaflet/dist/images/marker-icon.png'
import iconShadow from 'leaflet/dist/images/marker-shadow.png'
import { useLanguage } from '../../lib/LanguageContext'

const DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34]
})
L.Marker.prototype.options.icon = DefaultIcon

function LeafletViewer({ lat, lng, storeName, storeAddress }) {
    const position = useMemo(() => [lat, lng], [lat, lng])

    return (
        <div className="store-map-viewer-wrapper">
            <MapContainer
                center={position}
                zoom={16}
                scrollWheelZoom={false}
                style={{ height: '100%', width: '100%' }}
                key={`${lat}-${lng}`}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={position}>
                    <Popup>
                        <div style={{ padding: 4 }}>
                            <strong style={{ color: 'var(--brand-primary-dark, #075c1b)', fontSize: 14, display: 'block', marginBottom: 4 }}>
                                {storeName}
                            </strong>
                            <span style={{ fontSize: 12, color: '#444' }}>
                                {storeAddress}
                            </span>
                        </div>
                    </Popup>
                </Marker>
            </MapContainer>
        </div>
    )
}

function GoogleViewer({ apiKey, lat, lng, storeName }) {
    const { isLoaded, loadError } = useJsApiLoader({
        id: 'google-map-store-view',
        googleMapsApiKey: apiKey
    })
    const position = useMemo(() => ({ lat, lng }), [lat, lng])

    if (loadError) return <div style={{ height: 380, display: 'grid', placeItems: 'center', background: 'var(--brand-surface, #f6faf2)', color: '#888' }}>Error loading Google Maps</div>
    if (!isLoaded) return <div style={{ height: 380, display: 'grid', placeItems: 'center', background: 'var(--brand-surface, #f6faf2)', color: '#888' }}>Loading Map...</div>

    return (
        <div className="store-map-viewer-wrapper">
            <GoogleMap
                mapContainerStyle={{ width: '100%', height: '100%' }}
                center={position}
                zoom={16}
            >
                <GoogleMarker position={position} title={storeName} />
            </GoogleMap>
        </div>
    )
}

export function StoreMapViewer({ settings }) {
    const { t } = useLanguage()
    const lat = parseFloat(settings?.restaurantLat) || 13.7563
    const lng = parseFloat(settings?.restaurantLng) || 100.5018
    const storeName = settings?.siteName || 'LimeLeaf Kitchen'
    const storeAddress = settings?.restaurantAddress || 'กรุงเทพมหานคร'

    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`

    return (
        <div className="store-card" style={{ marginBottom: 24 }}>
            <div className="store-card-header">
                <h2>
                    <i className="bi bi-geo-alt-fill"></i>
                    <span>{storeName}</span>
                </h2>
                <span style={{ fontSize: 12, color: '#6d756d', fontWeight: 600 }}>
                    {lat.toFixed(4)}, {lng.toFixed(4)}
                </span>
            </div>

            {settings?.mapProvider === 'google' && settings?.googleMapsApiKey ? (
                <GoogleViewer apiKey={settings.googleMapsApiKey} lat={lat} lng={lng} storeName={storeName} />
            ) : (
                <LeafletViewer lat={lat} lng={lng} storeName={storeName} storeAddress={storeAddress} />
            )}

            <div className="store-map-actions-bar">
                <span style={{ fontSize: 13, color: '#556b57', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <i className="bi bi-pin-map"></i>
                    <span>{t('storeDirectionsDesc')}</span>
                </span>
                <a
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="store-gmaps-link"
                >
                    <i className="bi bi-box-arrow-up-right"></i>
                    <span>{t('openGoogleMaps')}</span>
                </a>
            </div>
        </div>
    )
}

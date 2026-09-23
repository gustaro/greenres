import React, { useRef } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import icon from 'leaflet/dist/images/marker-icon.png'
import iconShadow from 'leaflet/dist/images/marker-shadow.png'

const DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
})
L.Marker.prototype.options.icon = DefaultIcon

function PinMarker({ position, setPosition }) {
    const markerRef = useRef(null)

    useMapEvents({
        click(e) {
            setPosition([e.latlng.lat, e.latlng.lng])
        }
    })

    return (
        <Marker
            draggable={true}
            position={position}
            ref={markerRef}
            eventHandlers={{
                dragend() {
                    const marker = markerRef.current
                    if (marker) {
                        setPosition([marker.getLatLng().lat, marker.getLatLng().lng])
                    }
                }
            }}
        />
    )
}

export function AdminMapPinPicker({ lat, lng, onChange }) {
    const validLat = parseFloat(lat) || 13.7563
    const validLng = parseFloat(lng) || 100.5018
    const position = [validLat, validLng]

    const handleSetPosition = newPos => {
        onChange(Number(newPos[0]).toFixed(6), Number(newPos[1]).toFixed(6))
    }

    return (
        <div style={{
            height: '240px',
            width: '100%',
            borderRadius: '10px',
            overflow: 'hidden',
            border: '1px solid #d8e7d2',
            position: 'relative',
            zIndex: 1,
            marginTop: 8
        }}>
            <MapContainer
                center={position}
                zoom={14}
                scrollWheelZoom={false}
                style={{ height: '100%', width: '100%' }}
                key={`${validLat}-${validLng}`}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <PinMarker position={position} setPosition={handleSetPosition} />
            </MapContainer>
            <div style={{
                position: 'absolute',
                bottom: 8,
                left: 8,
                right: 8,
                background: 'rgba(255, 255, 255, 0.92)',
                padding: '6px 10px',
                borderRadius: 6,
                fontSize: 12,
                color: '#12852f',
                fontWeight: 600,
                zIndex: 1000,
                boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
                display: 'flex',
                alignItems: 'center',
                gap: 6
            }}>
                <i className="bi bi-info-circle-fill"></i>
                <span>คลิกบนแผนที่หรือลากหมุดเพื่อปรับพิกัดร้านได้ทันที</span>
            </div>
        </div>
    )
}

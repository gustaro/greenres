import React, { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import { GoogleMap, Marker as GoogleMarker, useJsApiLoader } from '@react-google-maps/api'
import { useAuth } from '../lib/AuthContext'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Fix default icon issue with Leaflet in React Vite environments
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const defaultCenter = [13.7563, 100.5018]; // Bangkok

function LocationMarker({ position, setPosition, onLocationSelect }) {
    const markerRef = useRef(null)

    useMapEvents({
        click(e) {
            const newPos = [e.latlng.lat, e.latlng.lng];
            setPosition(newPos);
            reverseGeocode(newPos);
        }
    })

    const reverseGeocode = async (pos) => {
        try {
            // Nominatim OpenStreetMap Reverse Geocoding API
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${pos[0]}&lon=${pos[1]}&accept-language=th`)
            const data = await res.json()
            if (data && data.address) {
                const a = data.address;
                const road = a.road || '';
                const suburb = a.suburb || a.village || a.neighbourhood || '';
                const district = a.city_district || a.county || '';

                const streetStr = [road, suburb, district].filter(Boolean).join(' ');

                const addressObj = {
                    street: streetStr || data.display_name.split(',').slice(0, 2).join(' '),
                    province: a.state || a.city || a.province || '',
                    zip: a.postcode || ''
                };

                onLocationSelect(addressObj, pos)
            }
        } catch (e) {
            console.error(e)
        }
    }

    const eventHandlers = {
        dragend() {
            const marker = markerRef.current
            if (marker != null) {
                const newPos = [marker.getLatLng().lat, marker.getLatLng().lng]
                setPosition(newPos)
                reverseGeocode(newPos)
            }
        },
    }

    return (
        <Marker
            draggable={true}
            eventHandlers={eventHandlers}
            position={position}
            ref={markerRef}
        />
    )
}

function LeafletMapComponent({ onLocationSelect }) {
    const [position, setPosition] = useState(defaultCenter)
    const [positioned, setPositioned] = useState(false)

    useEffect(() => {
        if (!positioned && navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    setPosition([pos.coords.latitude, pos.coords.longitude]);
                    setPositioned(true);
                },
                () => { setPositioned(true) }
            )
        }
    }, [positioned])

    return (
        <div style={{ height: '300px', width: '100%', borderRadius: '8px', overflow: 'hidden', border: '1px solid #d9d9d9', boxSizing: 'border-box' }}>
            <MapContainer center={position} zoom={15} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <LocationMarker position={position} setPosition={setPosition} onLocationSelect={onLocationSelect} />
            </MapContainer>
        </div>
    )
}

function GoogleMapComponent({ apiKey, onLocationSelect }) {
    const { isLoaded, loadError } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: apiKey
    })
    const [position, setPosition] = useState({ lat: defaultCenter[0], lng: defaultCenter[1] })
    const [positioned, setPositioned] = useState(false)

    useEffect(() => {
        if (!positioned && navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                    setPositioned(true);
                },
                () => { setPositioned(true) }
            )
        }
    }, [positioned])

    const geocode = async (lat, lng) => {
        if (!window.google) return;
        const geocoder = new window.google.maps.Geocoder();
        try {
            const resp = await geocoder.geocode({ location: { lat, lng } });
            if (resp.results && resp.results.length > 0) {
                const addressComponents = resp.results[0].address_components;

                let street = resp.results[0].formatted_address.split(',')[0];
                let province = '';
                let zip = '';

                addressComponents.forEach(comp => {
                    if (comp.types.includes('administrative_area_level_1')) province = comp.long_name;
                    if (comp.types.includes('postal_code')) zip = comp.long_name;
                });

                onLocationSelect({ street, province, zip }, [lat, lng]);
            }
        } catch (e) {
            console.error("Geocoder failed due to: " + e)
        }
    }

    if (loadError) return <div style={{ height: 300, background: '#eee', display: 'grid', placeItems: 'center', color: '#888' }}>Error loading Google Maps (Invalid API key?)</div>
    if (!isLoaded) return <div style={{ height: 300, background: '#f5f5f5', display: 'grid', placeItems: 'center', color: '#aaa' }}>Loading Google Maps...</div>

    return (
        <div style={{ height: '300px', width: '100%', borderRadius: '8px', overflow: 'hidden', border: '1px solid #d9d9d9', boxSizing: 'border-box' }}>
            <GoogleMap
                mapContainerStyle={{ width: '100%', height: '100%' }}
                center={position}
                zoom={15}
                onClick={e => {
                    setPosition({ lat: e.latLng.lat(), lng: e.latLng.lng() })
                    geocode(e.latLng.lat(), e.latLng.lng())
                }}
            >
                <GoogleMarker
                    position={position}
                    draggable={true}
                    onDragEnd={e => {
                        setPosition({ lat: e.latLng.lat(), lng: e.latLng.lng() })
                        geocode(e.latLng.lat(), e.latLng.lng())
                    }}
                />
            </GoogleMap>
        </div>
    )
}

export function MapLocationPicker({ onLocationSelect }) {
    const { settings } = useAuth();

    if (settings?.mapProvider === 'google' && settings?.googleMapsApiKey) {
        return <GoogleMapComponent apiKey={settings.googleMapsApiKey} onLocationSelect={onLocationSelect} />
    }

    return <LeafletMapComponent onLocationSelect={onLocationSelect} />
}

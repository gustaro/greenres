// Geo and Navigation helper functions for LimeLeaf

const GEO_REGEX = /(?:<!--geo:([0-9.-]+),([0-9.-]+)-->|\[geo:([0-9.-]+),([0-9.-]+)\])/

/**
 * Extracts coordinates from an address string or metadata object
 * @param {string} addressStr
 * @param {object} meta
 * @returns {{ lat: number, lng: number } | null}
 */
export function extractCoordinates(addressStr, meta = {}) {
    // 1. Direct dropLat / dropLng or lat / lng in meta
    const dropLat = meta?.dropLat ?? meta?.lat ?? meta?.drop_lat
    const dropLng = meta?.dropLng ?? meta?.lng ?? meta?.drop_lng
    if (dropLat != null && dropLng != null && !isNaN(Number(dropLat)) && !isNaN(Number(dropLng))) {
        return { lat: Number(dropLat), lng: Number(dropLng) }
    }

    // 2. Check address object inside meta (e.g. order.address)
    if (meta?.address) {
        const addrCoords = extractCoordinates(meta.address.street, meta.address)
        if (addrCoords) return addrCoords
    }

    // 3. Check localStorage cache by addressId
    const addrId = meta?.addressId || meta?.id
    if (addrId && typeof window !== 'undefined' && window.localStorage) {
        try {
            const cached = localStorage.getItem(`limeleaf_geo_${addrId}`)
            if (cached) {
                const parsed = JSON.parse(cached)
                if (parsed?.lat && parsed?.lng && !isNaN(Number(parsed.lat)) && !isNaN(Number(parsed.lng))) {
                    return { lat: Number(parsed.lat), lng: Number(parsed.lng) }
                }
            }
        } catch (_) {}
    }

    // 4. Regex search in address string
    if (typeof addressStr === 'string' && addressStr) {
        const match = addressStr.match(GEO_REGEX)
        if (match) {
            const lat = match[1] || match[3]
            const lng = match[2] || match[4]
            if (lat && lng && !isNaN(Number(lat)) && !isNaN(Number(lng))) {
                return { lat: parseFloat(lat), lng: parseFloat(lng) }
            }
        }

        // 5. Try "lat,lng" raw string format (e.g. "13.7563, 100.5018")
        const rawCoords = addressStr.match(/^([+-]?\d+(?:\.\d+)?)\s*,\s*([+-]?\d+(?:\.\d+)?)$/)
        if (rawCoords) {
            return { lat: parseFloat(rawCoords[1]), lng: parseFloat(rawCoords[2]) }
        }
    }

    return null
}

/**
 * Strips hidden geo metadata and coordinate strings from user-facing address text
 * @param {string} addressStr
 * @returns {string}
 */
export function cleanAddressText(addressStr) {
    if (!addressStr || typeof addressStr !== 'string') return ''
    return addressStr
        .replace(/<!--geo:[^>]+-->/gi, '')
        .replace(/\[geo:[^\]]+\]/gi, '')
        .replace(/<!--[^>]*-->/g, '')
        .replace(/\(?(?:พิกัด(?:แผนที่| GPS)?|GPS|lat|latitude)\s*:?\s*[+-]?\d+(?:\.\d+)?[,\s]+(?:lng|longitude|lon)?\s*[+-]?\d+(?:\.\d+)?\)?/gi, '')
        .replace(/\([+-]?\d{1,3}\.\d{2,}[,\s]+[+-]?\d{1,3}\.\d{2,}\)/g, '')
        .replace(/(?:^|\s)[+-]?\d{1,3}\.\d{3,}[,\s]+[+-]?\d{1,3}\.\d{3,}(?:\s|$)/g, ' ')
        .replace(/\(?พิกัด(?:แผนที่| GPS)?\)?/gi, '')
        .replace(/\s{2,}/g, ' ')
        .trim()
}

/**
 * Embeds coordinates into address string invisibly using HTML comment tag
 * @param {string} street
 * @param {{ lat: number, lng: number }} coords
 * @returns {string}
 */
export function embedCoordinates(street, coords) {
    if (!street) street = ''
    const clean = cleanAddressText(street)
    if (!coords || coords.lat == null || coords.lng == null) return clean
    return `${clean} <!--geo:${coords.lat},${coords.lng}-->`
}

/**
 * Caches coordinates in localStorage for a given address ID
 * @param {string} addressId
 * @param {{ lat: number, lng: number }} coords
 */
export function cacheAddressCoordinates(addressId, coords) {
    if (!addressId || !coords || typeof window === 'undefined') return
    try {
        localStorage.setItem(`limeleaf_geo_${addressId}`, JSON.stringify({
            lat: Number(coords.lat),
            lng: Number(coords.lng),
            updatedAt: Date.now()
        }))
    } catch (_) {}
}

/**
 * Builds Google Maps URL with exact coordinates as destination (or address fallback)
 * @param {{ lat?: number, lng?: number, address?: string }} options
 * @returns {string}
 */
export function buildGoogleMapsNavUrl({ lat, lng, address }) {
    if (lat != null && lng != null && !isNaN(Number(lat)) && !isNaN(Number(lng))) {
        return `https://www.google.com/maps/dir/?api=1&destination=${Number(lat)},${Number(lng)}`
    }
    const clean = cleanAddressText(address || '')
    if (clean) {
        return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(clean)}`
    }
    return 'https://www.google.com/maps'
}

import { getDistance } from '../utils/location';

const OVERPASS_API = 'https://overpass-api.de/api/interpreter';
const NOMINATIM_API = 'https://nominatim.openstreetmap.org';

// Cache to avoid hammering the API on every location update
let lastQueryCoords = null;
let lastQueryTime = 0;
let cachedStops = [];
const QUERY_COOLDOWN_MS = 15000; // 15 seconds between Overpass queries
const QUERY_MOVE_THRESHOLD_M = 200; // Re-query if user moved > 200m

/**
 * Fetch bus stops near a given lat/lon using Overpass API.
 * Returns an array of { name, lat, lon, distance } sorted by distance.
 */
export const fetchNearbyBusStops = async (lat, lon, radiusMeters = 1000) => {
    // Throttle: skip if we queried recently and haven't moved much
    if (lastQueryCoords && lastQueryTime) {
        const elapsed = Date.now() - lastQueryTime;
        const moved = getDistance(lat, lon, lastQueryCoords.lat, lastQueryCoords.lon);
        if (elapsed < QUERY_COOLDOWN_MS && moved < QUERY_MOVE_THRESHOLD_M) {
            // Return cached stops but recalculate distances
            return recalcDistances(cachedStops, lat, lon);
        }
    }

    const query = `
    [out:json][timeout:10];
    (
      node["highway"="bus_stop"](around:${radiusMeters},${lat},${lon});
      node["public_transport"="platform"]["bus"="yes"](around:${radiusMeters},${lat},${lon});
      node["amenity"="bus_station"](around:${radiusMeters},${lat},${lon});
    );
    out body;
  `;

    try {
        const response = await fetch(OVERPASS_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `data=${encodeURIComponent(query)}`,
        });

        if (!response.ok) {
            console.warn('Overpass API error:', response.status);
            return recalcDistances(cachedStops, lat, lon);
        }

        const data = await response.json();
        const stops = (data.elements || [])
            .filter(el => el.tags && (el.tags.name || el.tags['name:en']))
            .map(el => ({
                id: el.id,
                name: el.tags.name || el.tags['name:en'] || 'Unknown Stop',
                lat: el.lat,
                lon: el.lon,
                distance: getDistance(lat, lon, el.lat, el.lon),
            }))
            .sort((a, b) => a.distance - b.distance);

        // Update cache
        lastQueryCoords = { lat, lon };
        lastQueryTime = Date.now();
        cachedStops = stops;

        return stops;
    } catch (error) {
        console.error('Error fetching bus stops:', error);
        return recalcDistances(cachedStops, lat, lon);
    }
};

/**
 * Recalculate distances for cached stops from a new position.
 */
const recalcDistances = (stops, lat, lon) => {
    return stops
        .map(s => ({ ...s, distance: getDistance(lat, lon, s.lat, s.lon) }))
        .sort((a, b) => a.distance - b.distance);
};

/**
 * Get the nearest bus stop and the next one after it.
 * Returns { nearest: { name, distance, lat, lon } | null, next: { ... } | null }
 */
export const getNearestAndNextStop = async (lat, lon) => {
    const stops = await fetchNearbyBusStops(lat, lon, 1500);

    if (stops.length === 0) {
        return { nearest: null, next: null };
    }

    return {
        nearest: stops[0] || null,
        next: stops[1] || null,
    };
};

/**
 * Search for bus stops by name using Nominatim API.
 * Returns array of { name, lat, lon, displayName }
 */
export const searchBusStopByName = async (query) => {
    if (!query || query.trim().length < 2) {
        return [];
    }

    try {
        const url = `${NOMINATIM_API}/search?q=${encodeURIComponent(query + ' bus stop')}&format=json&limit=10&addressdetails=1`;
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'DistanceAlarmApp/1.0 (contact@distancealarm.com)',
            },
        });

        if (!response.ok) {
            console.warn('Nominatim API error:', response.status);
            return [];
        }

        const data = await response.json();
        return data.map(item => ({
            name: item.display_name.split(',')[0],
            displayName: item.display_name,
            lat: parseFloat(item.lat),
            lon: parseFloat(item.lon),
        }));
    } catch (error) {
        console.error('Error searching bus stops:', error);
        return [];
    }
};

/**
 * Reset the bus stop cache (e.g., when tracking stops).
 */
export const resetBusStopCache = () => {
    lastQueryCoords = null;
    lastQueryTime = 0;
    cachedStops = [];
};

export default {
    fetchNearbyBusStops,
    getNearestAndNextStop,
    searchBusStopByName,
    resetBusStopCache,
};

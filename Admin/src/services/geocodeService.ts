import { db } from './firebase';
import { doc, updateDoc } from 'firebase/firestore';

const CACHE_STORAGE_KEY = 'agy_admin_geocode_cache_v1';
const memoryCache = new Map<string, string>();
const inFlightRequests = new Map<string, Promise<string>>();
const syncedDocIds = new Set<string>();

// Load localStorage cache on initialization
try {
  const stored = localStorage.getItem(CACHE_STORAGE_KEY);
  if (stored) {
    const parsed = JSON.parse(stored);
    Object.entries(parsed).forEach(([k, v]) => {
      if (typeof v === 'string') memoryCache.set(k, v);
    });
  }
} catch {
  // Ignore storage read errors
}

function saveCacheToStorage() {
  try {
    // Limit to latest 300 entries to preserve storage space
    const obj: Record<string, string> = {};
    const entries = Array.from(memoryCache.entries()).slice(-300);
    entries.forEach(([k, v]) => {
      obj[k] = v;
    });
    localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(obj));
  } catch {
    // Ignore storage write errors
  }
}

/**
 * Checks if an address string is an unhelpful placeholder
 * like "Location Shared (BG)", "Location Shared (FG)", "Unknown Location", etc.
 */
export function isPlaceholderLocation(location?: string | null): boolean {
  if (!location) return true;
  const trimmed = location.trim().toLowerCase();
  return (
    trimmed === '' ||
    trimmed.includes('location shared') ||
    trimmed.includes('unknown location') ||
    trimmed === 'unknown' ||
    trimmed === 'not set' ||
    trimmed === 'n/a' ||
    trimmed === '-' ||
    trimmed === 'undefined' ||
    trimmed === 'null' ||
    trimmed === 'unknown location coordinates'
  );
}

/**
 * Synchronous check for cached reverse geocode
 */
export function getCachedAddress(lat: number, lng: number): string | null {
  if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) {
    return null;
  }
  const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  return memoryCache.get(cacheKey) || null;
}

/**
 * Reverse geocode latitude and longitude to an exact street/area address.
 * 1. Checks memory & localStorage cache.
 * 2. Uses window.google.maps.Geocoder (most accurate).
 * 3. Falls back to OpenStreetMap Nominatim reverse geocode.
 * 4. Falls back to Google Maps Geocoding REST API.
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) {
    return 'Unknown Location';
  }

  // Cache key with 4 decimal places (~11 meters precision)
  const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;

  if (memoryCache.has(cacheKey)) {
    return memoryCache.get(cacheKey)!;
  }

  if (inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey)!;
  }

  const promise = (async () => {
    // Strategy 1: Google Maps JS Geocoder
    if (window.google?.maps?.Geocoder) {
      try {
        const googlePromise = new Promise<string>((resolve, reject) => {
          const geocoder = new window.google.maps.Geocoder();
          geocoder.geocode({ location: { lat, lng } }, (results: any, status: any) => {
            if (status === 'OK' && results && results.length > 0) {
              const best = results[0].formatted_address;
              if (best) return resolve(best);
            }
            reject(new Error(status || 'Google geocode failed'));
          });
        });

        // 3-second timeout for Google Geocoder
        const timeoutPromise = new Promise<string>((_, reject) =>
          setTimeout(() => reject(new Error('Google geocode timeout')), 3000)
        );

        const addr = await Promise.race([googlePromise, timeoutPromise]);
        if (addr && !isPlaceholderLocation(addr)) {
          memoryCache.set(cacheKey, addr);
          saveCacheToStorage();
          return addr;
        }
      } catch (err) {
        console.warn('[Geocode] Google Maps JS Geocoder failed, trying fallbacks:', err);
      }
    }

    // Strategy 2: OpenStreetMap Nominatim (Free, reliable, CORS enabled)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
        {
          headers: { Accept: 'application/json' },
          signal: controller.signal
        }
      );
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data && data.display_name) {
          const addr = data.display_name;
          memoryCache.set(cacheKey, addr);
          saveCacheToStorage();
          return addr;
        }
      }
    } catch (err) {
      console.warn('[Geocode] Nominatim geocode failed:', err);
    }

    // Strategy 3: Google Maps REST API fallback
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (apiKey) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);
        const res = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`,
          { signal: controller.signal }
        );
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          if (data.status === 'OK' && data.results?.[0]?.formatted_address) {
            const addr = data.results[0].formatted_address;
            memoryCache.set(cacheKey, addr);
            saveCacheToStorage();
            return addr;
          }
        }
      } catch (err) {
        console.warn('[Geocode] Google REST API failed:', err);
      }
    }

    // Fallback: If all network queries failed, show formatted coordinates
    const fallbackCoord = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    return fallbackCoord;
  })();

  inFlightRequests.set(cacheKey, promise);

  try {
    const result = await promise;
    return result;
  } finally {
    inFlightRequests.delete(cacheKey);
  }
}

/**
 * Syncs the resolved physical address to the Firestore attendance document
 * so other views and future sessions have the exact address directly.
 */
export async function syncResolvedAddressToFirestore(docId: string, address: string) {
  if (!docId || !address || isPlaceholderLocation(address) || syncedDocIds.has(docId)) {
    return;
  }

  try {
    syncedDocIds.add(docId);
    const attRef = doc(db, 'attendance', docId);
    await updateDoc(attRef, {
      currentLocation: address
    });
  } catch (err) {
    // Non-fatal error; UI already shows resolved address
    console.warn(`[Geocode] Could not sync address to Firestore for doc ${docId}:`, err);
  }
}

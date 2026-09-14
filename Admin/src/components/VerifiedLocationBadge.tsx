import { useState, useEffect } from 'react';
import { MapPin, RefreshCcw } from 'lucide-react';
import { 
  isPlaceholderLocation, 
  reverseGeocode, 
  getCachedAddress, 
  syncResolvedAddressToFirestore 
} from '../services/geocodeService';

interface VerifiedLocationBadgeProps {
  location?: string | null;
  lat?: number | null;
  lng?: number | null;
  docId?: string;
  className?: string;
  truncateClass?: string;
  iconSize?: number;
}

export default function VerifiedLocationBadge({
  location,
  lat,
  lng,
  docId,
  className = 'flex items-center gap-1.5 text-xs text-gray-600',
  truncateClass = 'max-w-[220px] truncate',
  iconSize = 13
}: VerifiedLocationBadgeProps) {
  const numLat = typeof lat === 'number' && !isNaN(lat) ? lat : Number(lat || 0);
  const numLng = typeof lng === 'number' && !isNaN(lng) ? lng : Number(lng || 0);
  const hasCoords = Boolean(numLat && numLng);

  const [address, setAddress] = useState<string>(() => {
    if (!isPlaceholderLocation(location)) return location || '';
    if (hasCoords) {
      const cached = getCachedAddress(numLat, numLng);
      if (cached) return cached;
    }
    return location || '-';
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // If we already have a full verified address that isn't a placeholder, keep it
    if (!isPlaceholderLocation(location)) {
      setAddress(location || '');
      setLoading(false);
      return;
    }

    if (hasCoords) {
      const cached = getCachedAddress(numLat, numLng);
      if (cached) {
        setAddress(cached);
        setLoading(false);
        if (docId) syncResolvedAddressToFirestore(docId, cached);
        return;
      }

      setLoading(true);
      reverseGeocode(numLat, numLng)
        .then(resolved => {
          if (resolved && !isPlaceholderLocation(resolved)) {
            setAddress(resolved);
            if (docId) syncResolvedAddressToFirestore(docId, resolved);
          } else {
            setAddress(`${numLat.toFixed(4)}, ${numLng.toFixed(4)}`);
          }
        })
        .catch(() => {
          setAddress(`${numLat.toFixed(4)}, ${numLng.toFixed(4)}`);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setAddress(location || '-');
      setLoading(false);
    }
  }, [location, numLat, numLng, docId, hasCoords]);

  return (
    <div className={className} title={address}>
      {loading ? (
        <RefreshCcw size={iconSize} className="text-blue-500 animate-spin shrink-0" />
      ) : (
        <MapPin size={iconSize} className="text-gray-400 shrink-0" />
      )}
      <span className={truncateClass}>
        {loading ? 'Resolving address...' : address}
      </span>
    </div>
  );
}

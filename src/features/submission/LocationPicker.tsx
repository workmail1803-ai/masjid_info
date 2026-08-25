'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

interface LocationPickerProps {
  defaultLat?: number;
  defaultLng?: number;
}

/**
 * A lightweight location picker using an embedded Google Maps iframe.
 * Users can also paste a Google Maps link to auto-extract coordinates.
 * No API key required — uses the public embed URL.
 */
export function LocationPicker({ defaultLat, defaultLng }: LocationPickerProps) {
  const [lat, setLat] = useState(defaultLat?.toString() || '');
  const [lng, setLng] = useState(defaultLng?.toString() || '');
  const [mapsUrl, setMapsUrl] = useState('');
  const [showMap, setShowMap] = useState(false);
  const [locating, setLocating] = useState(false);

  // Build the iframe embed URL when lat/lng are set
  const embedUrl = lat && lng
    ? `https://maps.google.com/maps?q=${lat},${lng}&z=16&output=embed`
    : `https://maps.google.com/maps?q=23.8103,90.4125&z=8&output=embed`;

  // Extract lat/lng from a Google Maps URL
  const extractFromUrl = useCallback((url: string) => {
    // Pattern: @lat,lng or q=lat,lng or ll=lat,lng
    const patterns = [
      /@(-?\d+\.?\d*),(-?\d+\.?\d*)/,           // @23.8103,90.4125
      /[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/,       // ?q=23.8103,90.4125
      /[?&]ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/,       // ?ll=23.8103,90.4125
      /place\/.*?\/(-?\d+\.?\d*),(-?\d+\.?\d*)/,  // /place/Name/23.8103,90.4125
    ];

    for (const regex of patterns) {
      const match = url.match(regex);
      if (match) {
        setLat(match[1]);
        setLng(match[2]);
        setShowMap(true);
        return true;
      }
    }
    return false;
  }, []);

  const handleUrlPaste = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setMapsUrl(url);
    if (url.includes('google.com/maps') || url.includes('goo.gl/maps') || url.includes('maps.app.goo.gl')) {
      extractFromUrl(url);
    }
  }, [extractFromUrl]);

  // Use device GPS
  const useMyLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
        setShowMap(true);
        setLocating(false);
      },
      () => {
        setLocating(false);
        alert('অবস্থান পাওয়া যায়নি। ব্রাউজারে লোকেশন অনুমতি দিন।');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  return (
    <div className="space-y-3">
      {/* Google Maps Link paste */}
      <div>
        <label className="block text-xs text-ink-muted mb-1">
          গুগল ম্যাপ লিংক পেস্ট করুন
        </label>
        <input
          type="url"
          value={mapsUrl}
          onChange={handleUrlPaste}
          className="input w-full"
          placeholder="https://maps.google.com/maps?q=... বা গুগল ম্যাপ থেকে শেয়ার লিংক"
          style={{ fontFamily: 'var(--font-latin)' }}
        />
      </div>

      {/* GPS button */}
      <button
        type="button"
        onClick={useMyLocation}
        disabled={locating}
        className="btn btn-ghost btn-sm"
      >
        {locating ? '📍 অবস্থান নির্ণয় হচ্ছে...' : '📍 আমার বর্তমান অবস্থান ব্যবহার করুন'}
      </button>

      {/* Manual lat/lng */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="latitude" className="block text-xs text-ink-muted mb-1">অক্ষাংশ (Latitude)</label>
          <input
            id="latitude"
            name="latitude"
            type="number"
            step="any"
            value={lat}
            onChange={(e) => { setLat(e.target.value); setShowMap(true); }}
            className="input w-full"
            placeholder="23.8103"
            style={{ fontFamily: 'var(--font-latin)' }}
          />
        </div>
        <div>
          <label htmlFor="longitude" className="block text-xs text-ink-muted mb-1">দ্রাঘিমাংশ (Longitude)</label>
          <input
            id="longitude"
            name="longitude"
            type="number"
            step="any"
            value={lng}
            onChange={(e) => { setLng(e.target.value); setShowMap(true); }}
            className="input w-full"
            placeholder="90.4125"
            style={{ fontFamily: 'var(--font-latin)' }}
          />
        </div>
      </div>

      {/* Map Preview */}
      {showMap && lat && lng && (
        <div className="rounded-lg overflow-hidden border border-border" style={{ height: 220 }}>
          <iframe
            src={embedUrl}
            width="100%"
            height="100%"
            style={{ border: 0 }}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="মসজিদের অবস্থান"
          />
        </div>
      )}
    </div>
  );
}

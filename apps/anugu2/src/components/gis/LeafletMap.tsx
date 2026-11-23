/**
 * LeafletMap — OpenStreetMap-based cadastral map using Leaflet.
 * Styled with ANAGU high-contrast government land administration design.
 * 
 * Features:
 * - OpenStreetMap tile layer (free, compliant, no key needed)
 * - Polygon drawing for parcel boundary definition
 * - Parcel markers with popup info
 * - GPS location tracking
 * - Clean white-dominant GIS aesthetic
 */
import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, Trash2, CheckCircle2, AlertTriangle } from 'lucide-react';

export interface LatLng { lat: number; lng: number; }

export interface LeafletMapProps {
  /** Initial center — defaults to Lagos Island, Nigeria */
  center?:         LatLng;
  zoom?:           number;
  /** Existing parcels to display */
  parcels?:        { id: string; title: string; coords: LatLng[]; color?: string }[];
  /** Enable polygon drawing mode */
  drawMode?:       boolean;
  /** Called when a polygon is complete (3+ points) */
  onPolygonChange?: (coords: LatLng[]) => void;
  /** Height class */
  height?:         string;
  readOnly?:       boolean;
}

// Default to Lagos Island, Nigeria
const DEFAULT_CENTER: LatLng = { lat: 6.4541, lng: 3.3947 };
const DEFAULT_ZOOM   = 15;

export const LeafletMap: React.FC<LeafletMapProps> = ({
  center       = DEFAULT_CENTER,
  zoom         = DEFAULT_ZOOM,
  parcels      = [],
  drawMode     = false,
  onPolygonChange,
  height       = 'h-96',
  readOnly     = false,
}) => {
  const mapRef      = useRef<HTMLDivElement>(null);
  const leafletRef  = useRef<any>(null);
  const polyRef     = useRef<any>(null);
  const markersRef  = useRef<any[]>([]);
  const [points,    setPoints]   = useState<LatLng[]>([]);
  const [tracking,  setTracking] = useState(false);
  const [gpsError,  setGpsError] = useState<string | null>(null);

  // Dynamically load Leaflet (SSR-safe)
  useEffect(() => {
    if (!mapRef.current) return;
    let map: any;

    const initLeaflet = async () => {
      const L = (await import('leaflet')).default;
      
      // Fix default marker icons for bundlers
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      // Create map
      map = L.map(mapRef.current!, { center: [center.lat, center.lng], zoom });
      leafletRef.current = map;

      // OpenStreetMap tile layer — no API key needed
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      // Add existing parcels
      parcels.forEach(parcel => {
        const color = parcel.color ?? '#245C43';
        const polygon = L.polygon(
          parcel.coords.map(c => [c.lat, c.lng] as [number, number]),
          { color, fillColor: color, fillOpacity: 0.18, weight: 2 }
        ).addTo(map);
        polygon.bindPopup(`
          <div style="font-family: inherit; font-size: 12px; min-width: 160px; padding: 2px;">
            <b style="color: #245C43; font-size: 13px;">${parcel.title}</b><br/>
            <span style="color: #4A524D; font-size: 11px;">ID: ${parcel.id.slice(0, 10)}…</span>
          </div>
        `);
      });

      // Draw mode — click to add polygon vertices
      if (drawMode && !readOnly) {
        const drawnPoints: LatLng[] = [];
        const drawnMarkers: any[]   = [];

        const updatePolygon = () => {
          if (polyRef.current) { map.removeLayer(polyRef.current); polyRef.current = null; }
          if (drawnPoints.length >= 3) {
            polyRef.current = L.polygon(
              drawnPoints.map(p => [p.lat, p.lng] as [number, number]),
              { color: '#245C43', fillColor: '#245C43', fillOpacity: 0.22, weight: 2.5, dashArray: '6 4' }
            ).addTo(map);
          }
        };

        map.on('click', (e: any) => {
          const pt = { lat: e.latlng.lat, lng: e.latlng.lng };
          drawnPoints.push(pt);

          // Add beacon marker
          const markerIcon = L.divIcon({
            html: `<div style="width:12px;height:12px;background:#245C43;border:2px solid #FFFFFF;border-radius:50%;box-shadow:0 0 6px rgba(36,92,67,0.6)"></div>`,
            iconSize: [12, 12],
            iconAnchor: [6, 6],
            className: '',
          });
          const marker = L.marker([pt.lat, pt.lng], { icon: markerIcon })
            .addTo(map)
            .bindTooltip(`BC-0${drawnPoints.length} (${pt.lat.toFixed(5)}°N, ${pt.lng.toFixed(5)}°E)`);
          drawnMarkers.push(marker);

          setPoints([...drawnPoints]);
          updatePolygon();
          onPolygonChange?.([...drawnPoints]);
        });

        markersRef.current = drawnMarkers;
      }
    };

    initLeaflet();

    return () => {
      if (leafletRef.current) {
        leafletRef.current.remove();
        leafletRef.current = null;
      }
    };
  }, []);

  // GPS tracking
  const startTracking = () => {
    setGpsError(null);
    setTracking(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        leafletRef.current?.flyTo([latitude, longitude], 17, { animate: true, duration: 1 });
        setTracking(false);
      },
      (err) => {
        setGpsError('GPS unavailable: ' + err.message);
        setTracking(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const clearPoints = async () => {
    if (!leafletRef.current) return;
    markersRef.current.forEach(m => leafletRef.current?.removeLayer(m));
    markersRef.current = [];
    if (polyRef.current) { leafletRef.current.removeLayer(polyRef.current); polyRef.current = null; }
    setPoints([]);
    onPolygonChange?.([]);
  };

  return (
    <div className="relative w-full">
      {/* Map container — Leaflet CSS overrides for clean light theme */}
      <style>{`
        @import url('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css');
        .leaflet-container { background: #F5F6F3; font-family: inherit; }
        .leaflet-popup-content-wrapper { background: #FFFFFF; color: #252B28; border: 1px solid #E5E8E5; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
        .leaflet-popup-tip { background: #FFFFFF; }
        .leaflet-control-zoom a { background: #FFFFFF !important; color: #252B28 !important; border-color: #CBD0C8 !important; }
        .leaflet-control-zoom a:hover { background: #F7F8F7 !important; color: #245C43 !important; }
        .leaflet-control-attribution { background: rgba(255,255,255,0.9) !important; color: #4A524D !important; font-size: 10px; border-top-left-radius: 4px; }
        .leaflet-control-attribution a { color: #245C43 !important; text-decoration: underline; }
      `}</style>

      <div ref={mapRef} className={`w-full ${height} rounded-xl border border-[#E5E8E5] overflow-hidden z-10`} />

      {/* Controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-20">
        {/* GPS button */}
        <button
          onClick={startTracking}
          disabled={tracking}
          className="p-2.5 rounded-lg bg-white border border-[#CBD0C8] text-[#252B28] hover:text-[#245C43] hover:border-[#245C43] transition-colors shadow-md disabled:opacity-50"
          title="Go to my location"
        >
          <Navigation className={`w-4 h-4 ${tracking ? 'animate-spin text-[#245C43]' : ''}`} />
        </button>

        {/* Clear points (draw mode) */}
        {drawMode && points.length > 0 && (
          <button
            onClick={clearPoints}
            className="p-2.5 rounded-lg bg-white border border-rose-300 text-rose-700 hover:bg-rose-50 transition-colors shadow-md"
            title="Clear drawn polygon"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Point counter / status */}
      {drawMode && (
        <div className="absolute top-3 left-3 z-20 bg-white border border-[#CBD0C8] rounded-lg px-3 py-2 text-xs font-mono shadow-sm">
          {points.length === 0 && (
            <span className="text-[#4A524D]">Click map to place boundary beacons</span>
          )}
          {points.length > 0 && points.length < 3 && (
            <span className="text-amber-800 font-semibold flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 inline text-amber-700" />
              {points.length} beacon{points.length > 1 ? 's' : ''} placed — need {3 - points.length} more
            </span>
          )}
          {points.length >= 3 && (
            <span className="text-emerald-800 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 inline text-emerald-700" />
              {points.length} beacons — polygon valid
            </span>
          )}
        </div>
      )}

      {/* GPS error */}
      {gpsError && (
        <div className="absolute top-3 right-3 z-20 bg-rose-50 border border-rose-300 rounded-lg px-3 py-2 text-xs text-rose-800 flex items-center gap-1.5 shadow-sm">
          <AlertTriangle className="w-3.5 h-3.5 text-rose-700" />
          {gpsError}
        </div>
      )}
    </div>
  );
};

/**
 * LeafletMap — OpenStreetMap-based cadastral map using Leaflet.
 *
 * Features:
 * - OpenStreetMap tile layer
 * - Parcel boundary display
 * - Interactive boundary drawing
 * - GPS location tracking
 * - Dynamic parcel and drawing-mode updates
 */

import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, Trash2, CheckCircle2, AlertTriangle } from 'lucide-react';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface LeafletMapProps {
  center?: LatLng;
  zoom?: number;
  parcels?: {
    id: string;
    title: string;
    coords: LatLng[];
    color?: string;
  }[];
  drawMode?: boolean;
  onPolygonChange?: (coords: LatLng[]) => void;
  height?: string;
  readOnly?: boolean;
}

const DEFAULT_CENTER: LatLng = { lat: 6.4541, lng: 3.3947 };
const DEFAULT_ZOOM = 15;

export const LeafletMap: React.FC<LeafletMapProps> = ({
  center = DEFAULT_CENTER,
  zoom = DEFAULT_ZOOM,
  parcels = [],
  drawMode = false,
  onPolygonChange,
  height = 'h-96',
  readOnly = false,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletRef = useRef<any>(null);
  const leafletLibRef = useRef<any>(null);

  const parcelLayerRef = useRef<any>(null);
  const polyRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const drawnPointsRef = useRef<LatLng[]>([]);
  const drawHandlerRef = useRef<any>(null);
  const onPolygonChangeRef = useRef(onPolygonChange);

  const [points, setPoints] = useState<LatLng[]>([]);
  const [tracking, setTracking] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // Always use the latest callback without rebuilding the map.
  onPolygonChangeRef.current = onPolygonChange;

  // Initialize the Leaflet map once.
  useEffect(() => {
    let cancelled = false;
    let createdMap: any = null;

    const initializeMap = async () => {
      try {
        const L = (await import('leaflet')).default;

        // The component may have unmounted while Leaflet was loading.
        if (cancelled || !mapRef.current) return;

        delete (L.Icon.Default.prototype as any)._getIconUrl;

        L.Icon.Default.mergeOptions({
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        });

        createdMap = L.map(mapRef.current, {
          center: [DEFAULT_CENTER.lat, DEFAULT_CENTER.lng],
          zoom: DEFAULT_ZOOM,
        });

        leafletRef.current = createdMap;
        leafletLibRef.current = L;

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }).addTo(createdMap);

        parcelLayerRef.current = L.layerGroup().addTo(createdMap);

        setMapReady(true);
      } catch (error) {
        console.error('Unable to initialize Leaflet map:', error);
      }
    };

    initializeMap();

    return () => {
      cancelled = true;

      if (createdMap) {
        createdMap.remove();
      }

      leafletRef.current = null;
      leafletLibRef.current = null;
      parcelLayerRef.current = null;
      polyRef.current = null;
      markersRef.current = [];
      drawHandlerRef.current = null;
      setMapReady(false);
    };
  }, []);

  // Refresh map position, parcel boundaries and drawing mode when props change.
  useEffect(() => {
    const map = leafletRef.current;
    const L = leafletLibRef.current;
    const parcelLayer = parcelLayerRef.current;

    if (!mapReady || !map || !L || !parcelLayer) return;

    // Keep the map centered on the current requested location.
    map.setView([center.lat, center.lng], zoom);

    // Refresh existing parcel boundaries.
    parcelLayer.clearLayers();

    parcels.forEach((parcel) => {
      // Do not draw incomplete or invalid parcel coordinates.
      if (
        parcel.coords.length < 3 ||
        !parcel.coords.every(
          (point) =>
            Number.isFinite(point.lat) &&
            Number.isFinite(point.lng) &&
            Math.abs(point.lat) <= 90 &&
            Math.abs(point.lng) <= 180
        )
      ) {
        return;
      }

      const color = parcel.color ?? '#245C43';

      const polygon = L.polygon(
        parcel.coords.map((point: LatLng) => [point.lat, point.lng]),
        {
          color,
          fillColor: color,
          fillOpacity: 0.18,
          weight: 2,
        }
      ).addTo(parcelLayer);

      // Use a DOM element instead of inserting parcel data into HTML.
      const popup = document.createElement('div');
      popup.style.fontSize = '12px';
      popup.style.minWidth = '160px';

      const title = document.createElement('strong');
      title.style.color = '#245C43';
      title.textContent = parcel.title;

      const identifier = document.createElement('div');
      identifier.style.color = '#4A524D';
      identifier.style.fontSize = '11px';
      identifier.textContent = `ID: ${parcel.id.slice(0, 10)}…`;

      popup.appendChild(title);
      popup.appendChild(document.createElement('br'));
      popup.appendChild(identifier);

      polygon.bindPopup(popup);
    });

    // Remove the previous drawing event before installing the current one.
    if (drawHandlerRef.current) {
      map.off('click', drawHandlerRef.current);
      drawHandlerRef.current = null;
    }

    if (drawMode && !readOnly) {
      const handleMapClick = (event: any) => {
        const point: LatLng = {
          lat: event.latlng.lat,
          lng: event.latlng.lng,
        };

        drawnPointsRef.current = [...drawnPointsRef.current, point];

        const markerIcon = L.divIcon({
          html: '<div style="width:12px;height:12px;background:#245C43;border:2px solid #FFFFFF;border-radius:50%;box-shadow:0 0 6px rgba(36,92,67,0.6)"></div>',
          iconSize: [12, 12],
          iconAnchor: [6, 6],
          className: '',
        });

        const marker = L.marker([point.lat, point.lng], {
          icon: markerIcon,
        })
          .addTo(map)
          .bindTooltip(
            `BC-${String(drawnPointsRef.current.length).padStart(2, '0')} (${point.lat.toFixed(5)}°N, ${point.lng.toFixed(5)}°E)`
          );

        markersRef.current.push(marker);

        setPoints([...drawnPointsRef.current]);

        // Remove the previous temporary polygon.
        if (polyRef.current) {
          map.removeLayer(polyRef.current);
          polyRef.current = null;
        }

        // Display a boundary preview after three points.
        if (drawnPointsRef.current.length >= 3) {
          polyRef.current = L.polygon(
            drawnPointsRef.current.map((item: LatLng) => [
              item.lat,
              item.lng,
            ]),
            {
              color: '#245C43',
              fillColor: '#245C43',
              fillOpacity: 0.22,
              weight: 2.5,
              dashArray: '6 4',
            }
          ).addTo(map);
        }

        onPolygonChangeRef.current?.([...drawnPointsRef.current]);
      };

      drawHandlerRef.current = handleMapClick;
      map.on('click', handleMapClick);
    }

    return () => {
      if (drawHandlerRef.current) {
        map.off('click', drawHandlerRef.current);
        drawHandlerRef.current = null;
      }
    };
  }, [
    mapReady,
    parcels,
    drawMode,
    readOnly,
    center.lat,
    center.lng,
    zoom,
  ]);

  // Navigate to the user's current GPS location.
  const startTracking = () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by this browser.');
      return;
    }

    setGpsError(null);
    setTracking(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;

        leafletRef.current?.flyTo(
          [latitude, longitude],
          17,
          { animate: true, duration: 1 }
        );

        setTracking(false);
      },
      (error) => {
        setGpsError('GPS unavailable: ' + error.message);
        setTracking(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      }
    );
  };

  // Clear all manually drawn boundary points.
  const clearPoints = () => {
    const map = leafletRef.current;

    if (!map) return;

    markersRef.current.forEach((marker) => {
      map.removeLayer(marker);
    });

    markersRef.current = [];
    drawnPointsRef.current = [];

    if (polyRef.current) {
      map.removeLayer(polyRef.current);
      polyRef.current = null;
    }

    setPoints([]);
    onPolygonChangeRef.current?.([]);
  };

  return (
    <div className="relative w-full">
      <style>{`
        @import url('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css');

        .leaflet-container {
          background: #F5F6F3;
          font-family: inherit;
        }

        .leaflet-popup-content-wrapper {
          background: #FFFFFF;
          color: #252B28;
          border: 1px solid #E5E8E5;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        }

        .leaflet-popup-tip {
          background: #FFFFFF;
        }

        .leaflet-control-zoom a {
          background: #FFFFFF !important;
          color: #252B28 !important;
          border-color: #CBD0C8 !important;
        }

        .leaflet-control-zoom a:hover {
          background: #F7F8F7 !important;
          color: #245C43 !important;
        }

        .leaflet-control-attribution {
          background: rgba(255,255,255,0.9) !important;
          color: #4A524D !important;
          font-size: 10px;
          border-top-left-radius: 4px;
        }

        .leaflet-control-attribution a {
          color: #245C43 !important;
          text-decoration: underline;
        }
      `}</style>

      <div
        ref={mapRef}
        className={`w-full ${height} rounded-xl border border-[#E5E8E5] overflow-hidden z-10`}
      />

      {/* Map controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-20">
        <button
          onClick={startTracking}
          disabled={tracking}
          className="p-2.5 rounded-lg bg-white border border-[#CBD0C8] text-[#252B28] hover:text-[#245C43] hover:border-[#245C43] transition-colors shadow-md disabled:opacity-50"
          title="Go to my location"
        >
          <Navigation
            className={`w-4 h-4 ${tracking ? 'animate-spin text-[#245C43]' : ''}`}
          />
        </button>

        {drawMode && points.length > 0 && (
          <button
            onClick={clearPoints}
            className="p-2.5 rounded-lg bg-white border border-rose-300 text-rose-700 hover:bg-rose-50 transition-colors shadow-md"
            title="Clear drawn boundary"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Drawing status */}
      {drawMode && (
        <div className="absolute top-3 left-3 z-20 bg-white border border-[#CBD0C8] rounded-lg px-3 py-2 text-xs font-mono shadow-sm">
          {points.length === 0 && (
            <span className="text-[#4A524D]">
              Click map to place boundary beacons
            </span>
          )}

          {points.length > 0 && points.length < 3 && (
            <span className="text-amber-800 font-semibold flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 inline text-amber-700" />
              {points.length} beacon{points.length > 1 ? 's' : ''} placed —
              need {3 - points.length} more
            </span>
          )}

          {points.length >= 3 && (
            <span className="text-emerald-800 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 inline text-emerald-700" />
              {points.length} beacons — ready for verification
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

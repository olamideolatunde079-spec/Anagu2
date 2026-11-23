"use client";
/**
 * ParcelMap — Leaflet map for drawing and reviewing land parcel polygons.
 * Uses react-leaflet. Leaflet CSS is imported in globals.css.
 */
import { useEffect, useRef, useState } from "react";

interface ParcelMapProps {
  onCoordinatesChange?: (coordinates: [number, number][]) => void;
  readOnly?: boolean;
  existingCoordinates?: [number, number][];
}

export function ParcelMap({
  onCoordinatesChange,
  readOnly = false,
  existingCoordinates,
}: ParcelMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<[number, number][]>(existingCoordinates ?? []);

  // Dynamic import — Leaflet requires browser context
  useEffect(() => {
    if (typeof window === "undefined" || !mapRef.current) return;

    let map: any;
    let polygon: any;

    const init = async () => {
      const L = (await import("leaflet")).default;

      // Fix Leaflet default marker icon path issue with webpack
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      // Lagos Island as default centre
      map = L.map(mapRef.current!).setView([6.454, 3.396], 15);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 20,
      }).addTo(map);

      // Draw existing polygon
      if (existingCoordinates?.length) {
        polygon = L.polygon(existingCoordinates.map(([lng, lat]) => [lat, lng]))
          .addTo(map)
          .bindPopup("Land Parcel");
        map.fitBounds(polygon.getBounds());
      }

      // Click to add vertices (if not read-only)
      if (!readOnly) {
        const points: [number, number][] = [];
        const markers: any[] = [];

        map.on("click", (e: any) => {
          const { lat, lng } = e.latlng;
          points.push([lng, lat]);
          markers.push(L.marker([lat, lng]).addTo(map));

          if (polygon) map.removeLayer(polygon);
          if (points.length >= 3) {
            polygon = L.polygon(points.map(([lo, la]) => [la, lo]), {
              color: "#1B4F72",
              fillOpacity: 0.2,
            }).addTo(map);
          }

          setCoords([...points]);
          onCoordinatesChange?.([...points]);
        });
      }
    };

    init();

    return () => {
      map?.remove();
    };
  }, []);

  return (
    <div className="space-y-2">
      <div
        ref={mapRef}
        className="w-full h-80 rounded-xl border border-gray-200 shadow-sm"
        aria-label="Land parcel map"
      />
      {!readOnly && (
        <p className="text-xs text-gray-500">
          Click on the map to add polygon vertices. You need at least 3 points.
          Current vertices: {coords.length}
        </p>
      )}
      {coords.length >= 3 && (
        <p className="text-xs text-green-600 font-medium">
          ✓ Polygon ready ({coords.length} points)
        </p>
      )}
    </div>
  );
}

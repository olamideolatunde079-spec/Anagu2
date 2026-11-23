"use client";
/**
 * GISMap — Leaflet map component for parcel boundary drawing and verification.
 * Dynamically imported to prevent SSR issues.
 */
import { useEffect, useRef } from "react";
import type { SpatialValidationResult } from "@/types";

type Coordinate = [number, number];

interface GISMapProps {
  mode:                "view" | "draw";
  coordinates:         Coordinate[];
  onAddCoordinate:     (coord: Coordinate) => void;
  verificationResult?: SpatialValidationResult | null;
}

// Taraba State, Nigeria — Jalingo as default center
const DEFAULT_CENTER: [number, number] = [8.8956, 11.3719];
const DEFAULT_ZOOM = 13;

export default function GISMap({
  mode,
  coordinates,
  onAddCoordinate,
  verificationResult,
}: GISMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<unknown>(null);
  const polygonRef   = useRef<unknown>(null);
  const markersRef   = useRef<unknown[]>([]);
  const drawModeRef  = useRef(mode === "draw");

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Leaflet must be imported dynamically in browser
    import("leaflet").then((L) => {
      // Fix default icon URLs
      delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(containerRef.current!, {
        center:          DEFAULT_CENTER,
        zoom:            DEFAULT_ZOOM,
        zoomControl:     false,
        attributionControl: false,
      });

      // Dark satellite tile layer
      L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        { attribution: "Esri, Maxar, GeoEye", maxZoom: 19 }
      ).addTo(map);

      // Custom zoom control
      L.control.zoom({ position: "bottomright" }).addTo(map);

      map.on("click", (e) => {
        if (drawModeRef.current) {
          onAddCoordinate([e.latlng.lat, e.latlng.lng]);
        }
      });

      (mapRef.current as unknown) = map;
    });

    return () => {
      if (mapRef.current) {
        (mapRef.current as { remove: () => void }).remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update draw mode
  useEffect(() => {
    drawModeRef.current = mode === "draw";
    if (!mapRef.current) return;
    const container = (mapRef.current as { getContainer: () => HTMLElement }).getContainer?.();
    if (container) {
      container.style.cursor = mode === "draw" ? "crosshair" : "";
    }
  }, [mode]);

  // Redraw polygon when coordinates change
  useEffect(() => {
    if (!mapRef.current) return;
    import("leaflet").then((L) => {
      const map = mapRef.current as L.Map;

      // Remove old markers
      (markersRef.current as L.Marker[]).forEach((m) => m.remove());
      markersRef.current = [];

      // Remove old polygon
      if (polygonRef.current) {
        (polygonRef.current as L.Polygon).remove();
        polygonRef.current = null;
      }

      if (coordinates.length === 0) return;

      // Add vertex markers
      coordinates.forEach(([lat, lng], i) => {
        const marker = L.circleMarker([lat, lng], {
          radius: 6,
          color: "#6338F5",
          fillColor: "#6338F5",
          fillOpacity: 1,
          weight: 2,
        }).bindTooltip(`${i + 1}`).addTo(map);
        (markersRef.current as L.CircleMarker[]).push(marker);
      });

      // Draw polygon if 3+ points
      if (coordinates.length >= 3) {
        const color = verificationResult
          ? verificationResult.valid ? "#13C98A" : "#EF4444"
          : "#6338F5";

        const polygon = L.polygon(coordinates as L.LatLngTuple[], {
          color,
          fillColor: color,
          fillOpacity: 0.15,
          weight: 2,
          dashArray: verificationResult ? undefined : "6 4",
        }).addTo(map);

        polygonRef.current = polygon;
        map.fitBounds(polygon.getBounds(), { padding: [30, 30] });
      }
    });
  }, [coordinates, verificationResult]);

  return (
    <div className="w-full h-full relative">
      <div ref={containerRef} className="w-full h-full" />
      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-[1000] rounded-xl bg-[#111832]/90 border border-[#29345A] px-3 py-2 text-xs space-y-1">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-[#6338F5]/30 border border-[#6338F5]" />
          <span className="text-[#AAB4CC]">Drawing</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-[#13C98A]/30 border border-[#13C98A]" />
          <span className="text-[#AAB4CC]">Valid</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-[#EF4444]/30 border border-[#EF4444]" />
          <span className="text-[#AAB4CC]">Invalid / Overlap</span>
        </div>
      </div>
    </div>
  );
}

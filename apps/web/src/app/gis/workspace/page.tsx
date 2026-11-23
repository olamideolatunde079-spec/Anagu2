"use client";
/**
 * G01+G02+G03+G04 — GIS Workspace
 * Full interactive GIS map with polygon drawing and spatial verification.
 */
import dynamic from "next/dynamic";
import { useState, useCallback } from "react";
import {
  MousePointer, Trash2, ChevronRight, AlertCircle, CheckCircle2,
  Loader2, MapPin, Layers, ZoomIn, ZoomOut, RotateCcw
} from "lucide-react";
import { clsx } from "clsx";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { api } from "@/lib/api";
import type { SpatialValidationResult } from "@/types";

// Dynamic import of map to disable SSR
const GISMap = dynamic(() => import("@/components/gis/GISMap"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-[#111832] rounded-2xl">
      <div className="text-center">
        <Loader2 size={32} className="text-[#6338F5] animate-spin mx-auto mb-2" />
        <p className="text-sm text-[#AAB4CC]">Loading map…</p>
      </div>
    </div>
  ),
});

type Coordinate = [number, number];

export default function GISWorkspacePage() {
  const [coordinates, setCoordinates] = useState<Coordinate[]>([]);
  const [verifying,   setVerifying]   = useState(false);
  const [result,      setResult]      = useState<SpatialValidationResult | null>(null);
  const [mode,        setMode]        = useState<"view" | "draw">("view");

  const addCoord = useCallback((coord: Coordinate) => {
    setCoordinates((prev) => [...prev, coord]);
    setResult(null);
  }, []);

  const clearCoords = () => {
    setCoordinates([]);
    setResult(null);
  };

  const verify = async () => {
    if (coordinates.length < 3) return;
    setVerifying(true);
    try {
      const res = await api.post("/gis/verify", { coordinates });
      setResult(res.data as SpatialValidationResult);
    } catch {
      setResult({ valid: false, diagnosticMessage: "GIS service temporarily unavailable." });
    } finally {
      setVerifying(false);
    }
  };

  const area = coordinates.length >= 3 ? estimateArea(coordinates) : null;

  return (
    <AppLayout pageTitle="GIS Workspace">
      <PageHeader
        title="GIS Workspace"
        description="Draw, validate and inspect land parcel boundaries"
        breadcrumbs={[{ label: "GIS Workspace" }]}
      />

      <div className="flex flex-col lg:flex-row gap-5 h-[calc(100vh-220px)] min-h-[500px]">
        {/* ── Left toolbar ──────────────────────────────────────────── */}
        <div className="lg:w-72 shrink-0 flex flex-col gap-4">
          {/* Tools */}
          <div className="card p-3">
            <p className="text-xs font-semibold text-[#AAB4CC] uppercase tracking-wider mb-3 px-1">Map Tools</p>
            <div className="grid grid-cols-2 gap-1">
              {[
                { label: "Select",    icon: <MousePointer size={15} />, value: "view" as const },
                { label: "Draw",      icon: <MapPin       size={15} />, value: "draw" as const },
              ].map((t) => (
                <button
                  key={t.value}
                  onClick={() => setMode(t.value)}
                  className={clsx(
                    "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors",
                    mode === t.value ? "bg-[#6338F5] text-white" : "text-[#AAB4CC] hover:bg-white/5 hover:text-white"
                  )}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Coordinates */}
          <div className="card flex-1 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-[#AAB4CC] uppercase tracking-wider">
                Vertices ({coordinates.length})
              </p>
              {coordinates.length > 0 && (
                <button onClick={clearCoords} className="btn-ghost text-xs py-1 px-2 text-[#EF4444] hover:text-[#EF4444]">
                  <Trash2 size={12} /> Clear
                </button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto space-y-1">
              {coordinates.length === 0 ? (
                <p className="text-xs text-[#29345A] text-center py-4">
                  Click &ldquo;Draw&rdquo; and click on the map to add vertices
                </p>
              ) : coordinates.map(([lat, lng], i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-[#111832] text-xs"
                >
                  <span className="w-5 h-5 rounded-full bg-[#6338F5]/20 text-[#6338F5] flex items-center justify-center font-bold shrink-0">
                    {i + 1}
                  </span>
                  <span className="font-mono text-[#AAB4CC] truncate">
                    {lat.toFixed(5)}, {lng.toFixed(5)}
                  </span>
                </div>
              ))}
            </div>

            {area && (
              <div className="mt-3 pt-3 border-t border-[#29345A]">
                <p className="text-xs text-[#AAB4CC]">
                  Estimated area: <span className="text-white font-medium">{area.toFixed(2)} m²</span>
                </p>
              </div>
            )}
          </div>

          {/* Verify button */}
          <button
            onClick={verify}
            disabled={verifying || coordinates.length < 3}
            className="btn-primary w-full py-3 justify-center"
          >
            {verifying
              ? <><Loader2 size={16} className="animate-spin" /> Verifying…</>
              : <><Layers size={16} /> Verify Parcel</>}
          </button>

          {/* Result */}
          {verifying && (
            <div className="card bg-[#6338F5]/10 border-[#6338F5]/30">
              <div className="flex items-center gap-2 mb-3">
                <Loader2 size={16} className="text-[#6338F5] animate-spin" />
                <p className="text-sm font-medium text-white">Spatial Validation Running…</p>
              </div>
              <ul className="space-y-1">
                {["Checking geometry validity", "Checking for overlaps", "Calculating spatial hash"].map((c) => (
                  <li key={c} className="text-xs text-[#AAB4CC] flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#6338F5] animate-pulse" />
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result && !verifying && (
            <div className={clsx(
              "card",
              result.valid
                ? "bg-[#13C98A]/10 border-[#13C98A]/30"
                : "bg-[#EF4444]/10 border-[#EF4444]/30"
            )}>
              <div className="flex items-center gap-2 mb-2">
                {result.valid
                  ? <CheckCircle2 size={18} className="text-[#13C98A]" />
                  : <AlertCircle  size={18} className="text-[#EF4444]" />}
                <p className={`text-sm font-semibold ${result.valid ? "text-[#13C98A]" : "text-[#EF4444]"}`}>
                  {result.valid ? "Verification Passed" : "Verification Failed"}
                </p>
              </div>
              <p className="text-xs text-[#AAB4CC]">{result.diagnosticMessage}</p>
              {result.overlappingParcelId && (
                <p className="text-xs text-[#EF4444] mt-1">
                  Overlaps parcel: <span className="font-mono">{result.overlappingParcelId.slice(0, 12)}…</span>
                </p>
              )}
              {result.spatialHash && (
                <p className="text-xs text-[#AAB4CC] mt-2">
                  Spatial hash: <span className="font-mono text-[#168BFF]">{result.spatialHash.slice(0, 16)}…</span>
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── Map ───────────────────────────────────────────────────── */}
        <div className="flex-1 rounded-2xl overflow-hidden border border-[#29345A]">
          <GISMap
            mode={mode}
            coordinates={coordinates}
            onAddCoordinate={addCoord}
            verificationResult={result}
          />
        </div>
      </div>
    </AppLayout>
  );
}

/** Rough area estimate via shoelace formula (Cartesian, not geodesic). */
function estimateArea(coords: Coordinate[]): number {
  let area = 0;
  const n = coords.length;
  for (let i = 0; i < n; i++) {
    const [x1, y1] = coords[i];
    const [x2, y2] = coords[(i + 1) % n];
    area += x1 * y2 - x2 * y1;
  }
  return Math.abs(area / 2) * 1e10; // rough scale to m²
}

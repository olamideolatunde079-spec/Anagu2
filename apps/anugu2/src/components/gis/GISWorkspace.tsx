import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import {
  Layers,
  MapPin,
  ZoomIn,
  ZoomOut,
  RefreshCw,
  Plus,
  Trash2,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  FileCheck,
  Compass,
  Satellite
} from 'lucide-react';
import { BackButton } from '../common/BackButton';
import { LeafletMap } from './LeafletMap';
import { apiRequest } from '../../lib/api';

interface DrawnPoint {
  x: number;
  y: number;
  lat: number;
  lng: number;
  name: string;
}

export const GISWorkspace: React.FC = () => {
  const { parcels, submitSurveyReport, setSelectedCertificateParcel, addNotification } = useApp();

  const [activeTab, setActiveTab] = useState<'inspect' | 'draw' | 'coords' | 'verify' | 'compare'>('inspect');
  const [mapEngine, setMapEngine] = useState<'google' | 'svg'>('google');
  const [selectedParcelId, setSelectedParcelId] = useState<string>(parcels[0]?.id || '');
  const selectedParcel = parcels.find(p => p.id === selectedParcelId) || parcels[0];
  const [zoom, setZoom] = useState(1);
  const [showZoning, setShowZoning] = useState(true);
  const [showBeacons, setShowBeacons] = useState(true);
  const [showOverlaps, setShowOverlaps] = useState(false);
  const [geodesicMetrics] = useState<{
    areaSqm: number;
    hectares: number;
    perimeterM: number;
  } | null>(null);

  // Drawing mode state
  const [drawnPoints, setDrawnPoints] = useState<DrawnPoint[]>([]);

  // Coordinate entry input state
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');
  const [manualBeacon, setManualBeacon] = useState('');

  // Topological Verification state
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    status: 'passed' | 'overlap_detected' | 'invalid_geometry' | 'error';
    overlapAreaSqm: number;
    encroachingVertices: string[];
    sqlQuery: string;
    latencyMs: number;
    message: string;
  } | null>(null);

  // Survey Submission Modal / Form state
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [surveyPlanNumber, setSurveyPlanNumber] = useState('');
  const [surveyNotes, setSurveyNotes] = useState('');

  const svgRef = useRef<SVGSVGElement>(null);

  const handleAddManualPoint = (e: React.FormEvent) => {
    e.preventDefault();
    const latNum = parseFloat(manualLat);
    const lngNum = parseFloat(manualLng);
    if (isNaN(latNum) || isNaN(lngNum)) return;

    const x = Math.round((lngNum - 3.465) / 0.00003);
    const y = Math.round(500 - (latNum - 6.435) / 0.00003);

    setDrawnPoints(prev => [
      ...prev,
      {
        x: Math.max(50, Math.min(650, x)),
        y: Math.max(50, Math.min(450, y)),
        lat: latNum,
        lng: lngNum,
        name: manualBeacon || `BC-0${drawnPoints.length + 1}`
      }
    ]);
    setManualLat('');
    setManualLng('');
    setManualBeacon('');
  };

  const runTopologicalVerification = async () => {
    setIsVerifying(true);
    const startedAt = performance.now();
    try {
      const result = await apiRequest<{
        valid: boolean;
        reason?: 'INVALID_GEOMETRY' | 'OVERLAPPING_PARCEL' | 'INSUFFICIENT_COORDINATES';
        overlappingParcelId?: string;
        diagnosticMessage?: string;
        spatialHash?: string;
        wkt?: string;
      }>('/gis/verify', {
        method: 'POST',
        body: JSON.stringify({
          coordinates: drawnPoints.map(({ lng, lat }) => [lng, lat]),
        }),
      });

      const status = result.valid
        ? 'passed'
        : result.reason === 'OVERLAPPING_PARCEL'
          ? 'overlap_detected'
          : 'invalid_geometry';
      setVerificationResult({
        status,
        overlapAreaSqm: 0,
        encroachingVertices: [],
        sqlQuery: result.spatialHash
          ? `PostGIS validation passed; keccak256 spatial hash: ${result.spatialHash}`
          : `PostGIS rejected the polygon: ${result.reason ?? 'unknown validation error'}`,
        latencyMs: Math.round(performance.now() - startedAt),
        message: result.diagnosticMessage
          ?? (result.valid
            ? 'Geometry is valid and does not overlap any registered parcel.'
            : `Spatial verification failed: ${result.reason ?? 'Unknown reason'}.`),
      });
      setShowOverlaps(status === 'overlap_detected');
    } catch (error) {
      setVerificationResult({
        status: 'error',
        overlapAreaSqm: 0,
        encroachingVertices: [],
        sqlQuery: 'No database result was returned.',
        latencyMs: Math.round(performance.now() - startedAt),
        message: error instanceof Error ? error.message : 'Spatial verification failed.',
      });
      setShowOverlaps(false);
    } finally {
      setIsVerifying(false);
    }
  };

  // Calculate approximate ground area and perimeter from WGS-84 coordinates.
  const calculateMetrics = () => {
    if (drawnPoints.length < 3) {
      return { areaSqm: 0, hectares: 0, perimeterM: 0 };
    }

    const earthRadius = 6371008.8;
    const toRadians = (degrees: number) => degrees * Math.PI / 180;

    // Calculate distance between two geographic points using the Haversine formula.
    const distanceBetween = (a: DrawnPoint, b: DrawnPoint) => {
      const lat1 = toRadians(a.lat);
      const lat2 = toRadians(b.lat);
      const deltaLat = lat2 - lat1;
      const deltaLng = toRadians(b.lng - a.lng);

      const h =
        Math.sin(deltaLat / 2) ** 2 +
        Math.cos(lat1) * Math.cos(lat2) *
        Math.sin(deltaLng / 2) ** 2;

      return 2 * earthRadius * Math.asin(Math.sqrt(Math.min(1, h)));
    };

    // Calculate polygon area on a spherical Earth.
    let areaTotal = 0;
    let perimeter = 0;

    for (let i = 0; i < drawnPoints.length; i++) {
      const current = drawnPoints[i];
      const next = drawnPoints[(i + 1) % drawnPoints.length];

      const currentLat = toRadians(current.lat);
      const nextLat = toRadians(next.lat);
      const deltaLng = toRadians(next.lng - current.lng);

      areaTotal += deltaLng * (
        2 + Math.sin(currentLat) + Math.sin(nextLat)
      );

      perimeter += distanceBetween(current, next);
    }

    const areaSqm = Math.abs(areaTotal * earthRadius * earthRadius / 2);

    return {
      areaSqm: Math.round(areaSqm),
      hectares: Number((areaSqm / 10000).toFixed(4)),
      perimeterM: Math.round(perimeter)
    };
  };

  const svgMetrics = calculateMetrics();
  const metrics = geodesicMetrics && drawnPoints.length >= 3 ? geodesicMetrics : svgMetrics;

  // Handle lodging survey submission
  const handleSubmitSurvey = (e: React.FormEvent) => {
    e.preventDefault();
    submitSurveyReport('job-101', surveyNotes, drawnPoints.length, surveyPlanNumber);
    setShowSubmitModal(false);
    addNotification({
      title: 'Survey Plan Lodged',
      message: `Survey Plan ${surveyPlanNumber} successfully lodged and topological hash registered!`,
      type: 'success'
    });
  };

  if (!selectedParcel) {
    return (
      <div className="space-y-4 rounded-xl border border-[#E5E8E5] bg-white p-6 text-[#252B28]">
        <h1 className="text-lg font-bold text-[#252B28]">GIS Workspace</h1>
        <p className="text-sm text-[#4A524D]">No parcel records are available to inspect yet.</p>
        <Link to="/portal/register-land" className="inline-flex rounded-lg bg-[#245C43] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1B4733] transition-colors">
          Register a parcel
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F8F7] text-[#252B28] flex flex-col">
      {/* GIS Control Header */}
      <div className="bg-white border-b border-[#E5E8E5] px-4 sm:px-6 py-3.5 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <BackButton to="/portal/dashboard" label="Dashboard" />
            <div className="p-2 rounded-lg bg-[#245C43]/10 border border-[#245C43]/20 text-[#245C43]">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-[#252B28]">GIS Spatial Cadastre Workspace</h1>
                <span className="hidden sm:inline-block text-xs font-mono font-medium px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                  WGS-84 Zone 31N
                </span>
              </div>
              <div className="text-xs text-[#4A524D]">
                Interactive geodetic boundary drawing, topological overlap detection & beacon management
              </div>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center gap-1 p-1 bg-[#F7F8F7] rounded-lg border border-[#E5E8E5] overflow-x-auto max-w-full">
            <button
              onClick={() => setActiveTab('inspect')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'inspect' ? 'bg-[#245C43] text-white shadow-sm' : 'text-[#4A524D] hover:text-[#252B28]'
              }`}
            >
              Inspect Parcels
            </button>
            <button
              onClick={() => setActiveTab('draw')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'draw' ? 'bg-[#245C43] text-white shadow-sm' : 'text-[#4A524D] hover:text-[#252B28]'
              }`}
            >
              Draw Boundary
            </button>
            <button
              onClick={() => setActiveTab('coords')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'coords' ? 'bg-[#245C43] text-white shadow-sm' : 'text-[#4A524D] hover:text-[#252B28]'
              }`}
            >
              Coordinate Entry
            </button>
            <button
              onClick={() => {
                setActiveTab('verify');
                runTopologicalVerification();
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'verify' ? 'bg-[#245C43] text-white shadow-sm' : 'text-[#4A524D] hover:text-[#252B28]'
              }`}
            >
              Spatial Verification
            </button>
            <button
              onClick={() => setActiveTab('compare')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'compare' ? 'bg-[#245C43] text-white shadow-sm' : 'text-[#4A524D] hover:text-[#252B28]'
              }`}
            >
              Compare Overlay
            </button>
          </div>
        </div>
      </div>

      {/* Main Workspace Layout: Canvas on Left, Tool Panel on Right */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: GIS Interactive Map Viewport (2 Cols) */}
        <div className="lg:col-span-2 flex flex-col bg-white rounded-xl border border-[#E5E8E5] overflow-hidden shadow-sm relative min-h-[520px]">
          {/* Map Toolbar Controls */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-[#F7F8F7] border-b border-[#E5E8E5] text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setMapEngine('google')}
                className={`px-2.5 py-1 rounded-md font-semibold flex items-center gap-1.5 transition-colors ${
                  mapEngine === 'google' ? 'bg-[#245C43] text-white shadow-sm' : 'text-[#4A524D] hover:text-[#252B28] bg-white border border-[#E5E8E5]'
                }`}
              >
                <Satellite className="w-3.5 h-3.5" />
                <span>Live Map View</span>
              </button>
              <button
                type="button"
                onClick={() => setMapEngine('svg')}
                className={`px-2.5 py-1 rounded-md font-semibold flex items-center gap-1.5 transition-colors ${
                  mapEngine === 'svg' ? 'bg-[#245C43] text-white shadow-sm' : 'text-[#4A524D] hover:text-[#252B28] bg-white border border-[#E5E8E5]'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Cadastral Plan</span>
              </button>

              {mapEngine === 'svg' && (
                <>
                  <span className="text-[#E5E8E5] px-1">|</span>
                  <button
                    onClick={() => setZoom(prev => Math.min(2, prev + 0.2))}
                    className="p-1.5 rounded hover:bg-[#E5E8E5] text-[#4A524D] hover:text-[#252B28]"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setZoom(prev => Math.max(0.6, prev - 0.2))}
                    className="p-1.5 rounded hover:bg-[#E5E8E5] text-[#4A524D] hover:text-[#252B28]"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setZoom(1)}
                    className="p-1.5 rounded hover:bg-[#E5E8E5] text-[#4A524D] hover:text-[#252B28]"
                    title="Reset View"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                  <label className="flex items-center gap-1.5 cursor-pointer text-[#4A524D] px-1 font-medium">
                    <input
                      type="checkbox"
                      checked={showZoning}
                      onChange={e => setShowZoning(e.target.checked)}
                      className="rounded accent-[#245C43]"
                    />
                    <span>Zoning</span>
                  </label>
                </>
              )}

              <label className="flex items-center gap-1.5 cursor-pointer text-[#4A524D] px-2 font-medium">
                <input
                  type="checkbox"
                  checked={showBeacons}
                  onChange={e => setShowBeacons(e.target.checked)}
                  className="rounded accent-[#245C43]"
                />
                <span>Beacons</span>
              </label>
            </div>

            {/* Quick Parcel Focus Selector */}
            <div className="flex items-center gap-1.5 overflow-x-auto max-w-full">
              {parcels.slice(0, 5).map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedParcelId(p.id)}
                  className={`px-2 py-1 rounded text-xs font-mono whitespace-nowrap border transition-colors ${
                    selectedParcel.id === p.id
                      ? 'bg-[#245C43]/10 border-[#245C43] text-[#245C43] font-bold'
                      : 'bg-white border-[#CBD0C8] text-[#4A524D] hover:text-[#252B28]'
                  }`}
                >
                  {p.state}: {p.titleNumber.split('-').slice(-1)[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Map Viewport (OpenStreetMap / Leaflet) */}
          <div className="flex-1 w-full bg-white relative">
            <LeafletMap
              parcels={parcels.map(p => ({
                id: p.id,
                title: p.titleNumber,
                coords: p.coordinates?.map((c: { lat: number; lng: number }) => ({ lat: c.lat, lng: c.lng })) ?? [{ lat: 6.4541, lng: 3.3947 }],
              }))}
              drawMode={activeTab === 'draw'}
              onPolygonChange={(coords) => {
                setDrawnPoints(coords.map((c, i) => ({ x: 0, y: 0, lat: c.lat, lng: c.lng, name: `BC-0${i+1}` })));
              }}
              height="h-[520px]"
            />
          </div>

          {/* Bottom Coordinates & Scale Status Bar */}
          <div className="bg-[#F7F8F7] border-t border-[#E5E8E5] px-4 py-2.5 flex flex-wrap items-center justify-between text-xs font-mono text-[#4A524D]">
            <div className="flex items-center gap-4">
              <span>Projection: EPSG:4326 (WGS 84)</span>
              <span>District: {selectedParcel.district}, {selectedParcel.state}</span>
            </div>
            <div className="flex items-center gap-3">
              <span>{mapEngine === 'google' ? 'Engine: OpenStreetMap Geospatial' : `Zoom: ${Math.round(zoom * 100)}%`}</span>
              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block"></span>
                Spatial Engine Nominal
              </span>
            </div>
          </div>
        </div>

        {/* Right: GIS Contextual Tool Panel */}
        <div className="flex flex-col bg-white rounded-xl border border-[#E5E8E5] p-5 space-y-5 shadow-sm">
          {/* TAB 1: INSPECT PARCEL */}
          {activeTab === 'inspect' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#E5E8E5]">
                <h3 className="text-sm font-bold text-[#252B28] flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#245C43]" />
                  Selected Cadastral Parcel
                </h3>
                <span className="text-xs uppercase font-mono font-bold px-2 py-0.5 rounded bg-[#245C43]/10 text-[#245C43]">
                  {selectedParcel.status}
                </span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div>
                  <span className="text-[#4A524D] block text-xs font-medium">Title Number</span>
                  <span className="text-[#252B28] font-mono font-bold">{selectedParcel.titleNumber}</span>
                </div>
                <div>
                  <span className="text-[#4A524D] block text-xs font-medium">Registered Owner</span>
                  <span className="text-[#252B28] font-medium">{selectedParcel.ownerName}</span>
                </div>
                <div>
                  <span className="text-[#4A524D] block text-xs font-medium">National Identity (NIN)</span>
                  <span className="text-[#245C43] font-mono font-semibold">{selectedParcel.ownerNationalId}</span>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="p-2.5 rounded-lg bg-[#F7F8F7] border border-[#E5E8E5]">
                    <span className="text-[#4A524D] block text-xs uppercase font-semibold">Cadastral Area</span>
                    <span className="text-[#252B28] font-bold text-sm">{selectedParcel.sizeSqm.toLocaleString()} m²</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#F7F8F7] border border-[#E5E8E5]">
                    <span className="text-[#4A524D] block text-xs uppercase font-semibold">Hectares</span>
                    <span className="text-[#252B28] font-bold text-sm">{selectedParcel.sizeHectares} Ha</span>
                  </div>
                </div>
                <div>
                  <span className="text-[#4A524D] block text-xs font-medium">Survey Plan Ref</span>
                  <span className="text-[#252B28] font-mono font-semibold">{selectedParcel.surveyPlanNumber}</span>
                </div>
                <div>
                  <span className="text-[#4A524D] block text-xs font-medium">Surveyor In Charge</span>
                  <span className="text-[#252B28] font-medium">{selectedParcel.surveyorName}</span>
                </div>
              </div>

              {selectedParcel.certificateIssued && (
                <button
                  onClick={() => setSelectedCertificateParcel(selectedParcel)}
                  className="w-full py-2.5 rounded-lg bg-[#245C43] hover:bg-[#1B4733] text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors shadow-sm"
                >
                  <FileCheck className="w-4 h-4" />
                  <span>View C of O Certificate</span>
                </button>
              )}
            </div>
          )}

          {/* TAB 2: DRAW BOUNDARY */}
          {activeTab === 'draw' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#E5E8E5]">
                <h3 className="text-sm font-bold text-[#252B28] flex items-center gap-2">
                  <Compass className="w-4 h-4 text-[#245C43]" />
                  Boundary Drawing Mode
                </h3>
                <button
                  onClick={() => setDrawnPoints([])}
                  className="text-xs text-rose-700 hover:underline flex items-center gap-1 font-semibold"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear</span>
                </button>
              </div>

              <p className="text-xs text-[#4A524D] leading-relaxed">
                Click anywhere on the map viewport to place geodetic boundary vertices. Real-time perimeter and enclosed area are calculated automatically.
              </p>

              <div className="p-3.5 bg-[#F7F8F7] rounded-lg border border-[#E5E8E5] space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-[#4A524D] font-medium">Total Boundary Vertices:</span>
                  <span className="font-mono font-bold text-[#252B28]">{drawnPoints.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#4A524D] font-medium">Calculated Area:</span>
                  <span className="font-mono font-bold text-emerald-800">{metrics.areaSqm.toLocaleString()} m²</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#4A524D] font-medium">Hectares:</span>
                  <span className="font-mono font-bold text-emerald-800">{metrics.hectares} Ha</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#4A524D] font-medium">Estimated Perimeter:</span>
                  <span className="font-mono text-[#252B28] font-medium">{metrics.perimeterM} meters</span>
                </div>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => {
                    setActiveTab('verify');
                    runTopologicalVerification();
                  }}
                  className="w-full py-2.5 rounded-lg bg-[#245C43] hover:bg-[#1B4733] text-white font-bold text-xs uppercase tracking-wider transition-colors shadow-sm flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Run Spatial Verification</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: COORDINATE ENTRY */}
          {activeTab === 'coords' && (
            <div className="space-y-4">
              <div className="pb-3 border-b border-[#E5E8E5]">
                <h3 className="text-sm font-bold text-[#252B28]">Manual Coordinate Plotter</h3>
                <p className="text-xs text-[#4A524D] mt-1">
                  Enter official surveyor GPS field log coordinates (Latitude/Longitude in WGS-84 decimal degrees).
                </p>
              </div>

              <form onSubmit={handleAddManualPoint} className="space-y-3 text-xs">
                <div>
                  <label className="text-[#4A524D] block mb-1 font-medium">Beacon Pillar Reference</label>
                  <input
                    type="text"
                    value={manualBeacon}
                    onChange={e => setManualBeacon(e.target.value)}
                    placeholder="e.g. SC/ET/095"
                    className="w-full bg-white border border-[#CBD0C8] rounded-lg px-3 py-2 text-[#252B28] font-mono focus:border-[#245C43] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[#4A524D] block mb-1 font-medium">Latitude (°N)</label>
                  <input
                    type="text"
                    value={manualLat}
                    onChange={e => setManualLat(e.target.value)}
                    placeholder="6.435000"
                    className="w-full bg-white border border-[#CBD0C8] rounded-lg px-3 py-2 text-[#252B28] font-mono focus:border-[#245C43] focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-[#4A524D] block mb-1 font-medium">Longitude (°E)</label>
                  <input
                    type="text"
                    value={manualLng}
                    onChange={e => setManualLng(e.target.value)}
                    placeholder="3.465000"
                    className="w-full bg-white border border-[#CBD0C8] rounded-lg px-3 py-2 text-[#252B28] font-mono focus:border-[#245C43] focus:outline-none"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-lg bg-[#245C43] hover:bg-[#1B4733] text-white font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Beacon to Polygon</span>
                </button>
              </form>
            </div>
          )}

          {/* TAB 4: SPATIAL VERIFICATION */}
          {activeTab === 'verify' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#E5E8E5]">
                <h3 className="text-sm font-bold text-[#252B28] flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#245C43]" />
                  Spatial Verification Engine
                </h3>
                <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                  EPSG:4326 · 0.5m Buffer
                </span>
              </div>

              <p className="text-xs text-[#4A524D]">
                Submits the polygon to the topological verification engine to validate geometry and identify overlaps.
              </p>

              {isVerifying ? (
                <div className="py-8 text-center space-y-3">
                  <RefreshCw className="w-8 h-8 text-[#245C43] animate-spin mx-auto" />
                  <p className="text-xs text-[#4A524D]">
                    Executing PostGIS geometry and overlap validation…
                  </p>
                </div>
              ) : verificationResult ? (
                <div className="space-y-3">
                  <div
                    className={`p-4 rounded-xl border text-xs space-y-2.5 ${
                      verificationResult.status === 'overlap_detected'
                        ? 'bg-rose-50 border-rose-200 text-rose-900'
                        : verificationResult.status === 'invalid_geometry' || verificationResult.status === 'error'
                        ? 'bg-amber-50 border-amber-200 text-amber-900'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold">
                      <div className="flex items-center gap-2">
                        {verificationResult.status === 'overlap_detected' ? (
                          <>
                            <AlertTriangle className="w-4 h-4 text-rose-700" />
                            <span>OVERLAPPING PARCEL DETECTED</span>
                          </>
                        ) : verificationResult.status === 'invalid_geometry' || verificationResult.status === 'error' ? (
                          <>
                            <AlertTriangle className="w-4 h-4 text-amber-700" />
                            <span>
                              {verificationResult.status === 'error'
                                ? 'VERIFICATION SERVICE UNAVAILABLE'
                                : 'INVALID GEOMETRY (ST_IsValid=FALSE)'}
                            </span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                            <span>VALID & NON-OVERLAPPING</span>
                          </>
                        )}
                      </div>
                      <span className="text-xs font-mono text-[#4A524D]">
                        t_gis: {verificationResult.latencyMs}ms
                      </span>
                    </div>

                    <p className="leading-relaxed">{verificationResult.message}</p>

                    {verificationResult.overlapAreaSqm > 0 && (
                      <div className="font-mono text-xs text-rose-800 flex items-center justify-between pt-1 border-t border-rose-200">
                        <span>Encroachment Area: {verificationResult.overlapAreaSqm} m²</span>
                        <span>Vertices: {verificationResult.encroachingVertices.join(', ')}</span>
                      </div>
                    )}

                    {/* Execution Details */}
                    <div className="pt-2 border-t border-current/10">
                      <div className="text-xs text-[#4A524D] uppercase font-mono mb-0.5">Spatial Query Record:</div>
                      <div className="p-2 rounded bg-white font-mono text-xs text-[#252B28] border border-[#CBD0C8] break-all leading-tight">
                        {verificationResult.sqlQuery}
                      </div>
                    </div>
                  </div>

                  {/* Submission Action */}
                  {verificationResult.status === 'passed' && (
                    <button
                      onClick={() => setShowSubmitModal(true)}
                      className="w-full py-2.5 rounded-lg bg-[#245C43] hover:bg-[#1B4733] text-white font-bold text-xs uppercase tracking-wider transition-colors shadow-sm flex items-center justify-center gap-2"
                    >
                      <FileCheck className="w-4 h-4" />
                      <span>Lodge Cadastral Survey Plan</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="py-4 text-center text-xs text-[#4A524D]">
                  Click 'Run Spatial Verification' to execute automated topological checking against registered parcels.
                </div>
              )}
            </div>
          )}

          {/* TAB 5: COMPARE OVERLAY */}
          {activeTab === 'compare' && (
            <div className="space-y-4">
              <div className="pb-3 border-b border-[#E5E8E5]">
                <h3 className="text-sm font-bold text-[#252B28]">Cadastral Plan Comparison</h3>
                <p className="text-xs text-[#4A524D] mt-1">
                  Side-by-side comparison of historical title coordinates vs newly surveyed beacons.
                </p>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-lg bg-[#F7F8F7] border border-[#E5E8E5]">
                  <div className="font-bold text-[#252B28] mb-1">Historical Gazetted Plan</div>
                  <div className="text-xs text-[#4A524D] font-mono">LA/SRV/2026/0149 (1,250 m²)</div>
                  <div className="text-xs text-[#245C43] font-medium mt-1">4 Beacons Confirmed (1978 Survey Act)</div>
                </div>

                <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200">
                  <div className="font-bold text-emerald-900 mb-1">Proposed Field Re-establishment</div>
                  <div className="text-xs text-emerald-800 font-mono">GPS-RTK Traverse (1,248.8 m²)</div>
                  <div className="text-xs text-emerald-700 font-medium mt-1">Variance: -1.2 m² (Well within allowable ±0.5% tolerance)</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Survey Submission Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white border border-[#E5E8E5] rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E8E5]">
              <h3 className="text-base font-bold text-[#252B28] flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-[#245C43]" />
                Lodge Cadastral Survey Plan
              </h3>
              <button
                onClick={() => setShowSubmitModal(false)}
                className="text-[#4A524D] hover:text-[#252B28] text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitSurvey} className="space-y-4 text-xs">
              <div>
                <label className="text-[#252B28] font-medium block mb-1">Cadastral Plan Reference Number</label>
                <input
                  type="text"
                  value={surveyPlanNumber}
                  onChange={e => setSurveyPlanNumber(e.target.value)}
                  placeholder="e.g. LA/SURV/2026/089"
                  className="w-full bg-white border border-[#CBD0C8] rounded-lg px-3 py-2 text-[#252B28] font-mono focus:border-[#245C43] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-[#252B28] font-medium block mb-1">Field Reconnaissance & Pillar Notes</label>
                <textarea
                  value={surveyNotes}
                  onChange={e => setSurveyNotes(e.target.value)}
                  rows={3}
                  placeholder="Enter observation notes, beacon integrity confirmations..."
                  className="w-full bg-white border border-[#CBD0C8] rounded-lg px-3 py-2 text-[#252B28] focus:border-[#245C43] focus:outline-none"
                  required
                />
              </div>

              <div className="p-3.5 bg-[#F7F8F7] rounded-lg border border-[#E5E8E5] text-xs space-y-1.5 font-mono text-[#4A524D]">
                <div>Beacons to Register: <span className="font-bold text-[#252B28]">{drawnPoints.length} Concrete Pillars</span></div>
                <div>Calculated Area: <span className="font-bold text-[#252B28]">{metrics.areaSqm.toLocaleString()} m² ({metrics.hectares} Ha)</span></div>
                <div>Signing Surveyor: <span className="font-bold text-[#252B28]">Surv. Amina Bello, FNIS</span></div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  className="px-4 py-2 rounded-lg bg-white border border-[#CBD0C8] text-[#4A524D] hover:text-[#252B28] font-semibold text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[#245C43] text-white font-bold text-xs hover:bg-[#1B4733] transition-colors shadow-sm"
                >
                  Confirm & Commit Survey Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

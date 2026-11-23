"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { applicationsApi, gisApi } from "@/lib/api";
import { Navbar } from "@/components/layout/Navbar";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

// Leaflet must be loaded client-side only
const ParcelMap = dynamic(
  () => import("@/components/gis/ParcelMap").then((m) => m.ParcelMap),
  { ssr: false, loading: () => <div className="h-80 bg-gray-100 rounded-xl animate-pulse" /> }
);

const schema = z.object({
  ownerName:          z.string().min(2, "Enter the owner's full name"),
  nationalId:         z.string().min(3, "Enter a National ID (NIN)"),
  surveyPlanNumber:   z.string().optional(),
  lga:                z.string().min(2, "Enter a Local Government Area"),
  state:              z.string().min(2, "Enter a state"),
  addressDesc:        z.string().optional(),
  legalClearanceHash: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export default function NewApplicationPage() {
  const router = useRouter();
  const [coordinates, setCoordinates] = useState<[number, number][]>([]);
  const [spatialResult, setSpatialResult] = useState<any>(null);
  const [verifying, setVerifying] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  // ── Step 1: Verify parcel geometry ─────────────────────────────────
  const handleVerify = async () => {
    if (coordinates.length < 3) {
      setError("Draw at least 3 points on the map to define your parcel.");
      return;
    }
    setVerifying(true);
    setError(null);
    try {
      const res = await gisApi.verify(coordinates);
      setSpatialResult(res.data);
      if (res.data.valid) {
        setStep(2);
      } else {
        setError(`Spatial verification failed: ${res.data.diagnosticMessage}`);
      }
    } catch (e: any) {
      setError(e.response?.data?.message ?? "Verification request failed.");
    } finally {
      setVerifying(false);
    }
  };

  // ── Step 3: Submit full application ────────────────────────────────
  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await applicationsApi.submit({
        ...data,
        coordinates,
        communityWitnesses: [],
      });
      router.push(`/applications/${res.data.applicationId}`);
    } catch (e: any) {
      setError(e.response?.data?.message ?? "Submission failed. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">New Land Registration</h1>
          <p className="text-gray-500 text-sm mt-1">
            Submit a land parcel for registration. The application goes through spatial
            verification, ownership verification, legal review, and registrar approval
            before an NFT title is issued.
          </p>
        </div>

        {/* Progress stepper */}
        <div className="flex items-center gap-2 mb-8">
          {[
            { n: 1, label: "Draw Parcel" },
            { n: 2, label: "Owner Details" },
            { n: 3, label: "Review & Submit" },
          ].map(({ n, label }) => (
            <div key={n} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                  ${step >= n ? "bg-primary text-white" : "bg-gray-200 text-gray-500"}`}
              >
                {n}
              </div>
              <span className={`text-sm ${step >= n ? "text-primary font-medium" : "text-gray-400"}`}>
                {label}
              </span>
              {n < 3 && <div className={`w-8 h-px ${step > n ? "bg-primary" : "bg-gray-200"}`} />}
            </div>
          ))}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-red-700 text-sm">
            ⚠️ {error}
          </div>
        )}

        {/* ── Step 1: Draw parcel ──────────────────────────────────────── */}
        {step === 1 && (
          <div className="card">
            <h2 className="text-lg font-semibold mb-2">Draw your land parcel</h2>
            <p className="text-sm text-gray-500 mb-4">
              Click on the map to place polygon vertices. You need at least 3 points.
              Coordinates are in WGS 84 (EPSG:4326).
            </p>
            <ParcelMap onCoordinatesChange={setCoordinates} />
            <button
              onClick={handleVerify}
              disabled={verifying || coordinates.length < 3}
              className="btn-primary mt-6 flex items-center gap-2"
            >
              {verifying && <LoadingSpinner size="sm" />}
              {verifying ? "Verifying geometry…" : "Verify Parcel →"}
            </button>
          </div>
        )}

        {/* ── Step 2: Owner details ────────────────────────────────────── */}
        {step === 2 && (
          <div className="card">
            <h2 className="text-lg font-semibold mb-1">Owner &amp; Parcel Details</h2>
            {spatialResult?.valid && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 text-green-700 text-sm">
                ✓ Parcel geometry verified. No boundary overlaps detected.
              </div>
            )}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Owner Full Name *</label>
                  <input {...register("ownerName")} className="input-field" placeholder="Adewale Okonkwo" />
                  {errors.ownerName && <p className="text-red-500 text-xs mt-1">{errors.ownerName.message}</p>}
                </div>
                <div>
                  <label className="label">National ID (NIN) *</label>
                  <input {...register("nationalId")} className="input-field" placeholder="NIN-VALID-001" />
                  {errors.nationalId && <p className="text-red-500 text-xs mt-1">{errors.nationalId.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Survey Plan Number</label>
                  <input {...register("surveyPlanNumber")} className="input-field" placeholder="SP-001" />
                </div>
                <div>
                  <label className="label">Legal Clearance Hash</label>
                  <input {...register("legalClearanceHash")} className="input-field" placeholder="0xabc..." />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Local Government Area *</label>
                  <input {...register("lga")} className="input-field" placeholder="Lagos Island" />
                  {errors.lga && <p className="text-red-500 text-xs mt-1">{errors.lga.message}</p>}
                </div>
                <div>
                  <label className="label">State *</label>
                  <input {...register("state")} className="input-field" placeholder="Lagos" />
                  {errors.state && <p className="text-red-500 text-xs mt-1">{errors.state.message}</p>}
                </div>
              </div>

              <div>
                <label className="label">Address Description</label>
                <input {...register("addressDesc")} className="input-field" placeholder="Plot 1, Broad Street" />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setStep(1)} className="btn-secondary">
                  ← Back
                </button>
                <button type="submit" disabled={submitting} className="btn-primary flex items-center gap-2">
                  {submitting && <LoadingSpinner size="sm" />}
                  {submitting ? "Submitting…" : "Submit Application →"}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}

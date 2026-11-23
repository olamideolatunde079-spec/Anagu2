"use client";
/**
 * C04-C07 — New Land Application (multi-step)
 * Step 1: Land information
 * Step 2: Parcel location
 * Step 3: Documents
 * Step 4: Review and submit
 */
import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  MapPin, FileText, Eye, Send, ChevronRight, ChevronLeft,
  Loader2, CheckCircle2, AlertCircle
} from "lucide-react";
import { clsx } from "clsx";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { FileUpload, type UploadedFile } from "@/components/ui/FileUpload";
import { useToast } from "@/components/ui/Toast";
import { supabase } from "@/lib/supabase";
import { api, documentsApi } from "@/lib/api";
import { useUser } from "@/hooks/useUser";

// ── Step schemas ──────────────────────────────────────────────────────────────
const stepOneSchema = z.object({
  ownerName:         z.string().min(2, "Owner name is required"),
  nationalId:        z.string().min(5, "NIN is required"),
  surveyPlanNumber:  z.string().optional(),
  lga:               z.string().min(2, "LGA is required"),
  state:             z.string().min(2, "State is required"),
  landUse:           z.string().min(2, "Land use is required"),
});

type StepOneData = z.infer<typeof stepOneSchema>;

const NIGERIAN_STATES = [
  "Abia","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue","Borno",
  "Cross River","Delta","Ebonyi","Edo","Ekiti","Enugu","FCT","Gombe","Imo",
  "Jigawa","Kaduna","Kano","Katsina","Kebbi","Kogi","Kwara","Lagos","Nasarawa",
  "Niger","Ogun","Ondo","Osun","Oyo","Plateau","Rivers","Sokoto","Taraba",
  "Yobe","Zamfara",
];

const STEPS = [
  { num: 1, label: "Land Information", icon: <FileText   size={16} /> },
  { num: 2, label: "Parcel Location",  icon: <MapPin     size={16} /> },
  { num: 3, label: "Documents",        icon: <FileText   size={16} /> },
  { num: 4, label: "Review & Submit",  icon: <Eye        size={16} /> },
];

// ── Coordinate state ──────────────────────────────────────────────────────────
type Coordinate = { lat: number; lng: number };

const GISMap = dynamic(() => import("@/components/gis/GISMap"), {
  ssr: false,
  loading: () => (
    <div className="h-64 rounded-xl bg-[#111832] border border-[#29345A] flex items-center justify-center text-sm text-[#AAB4CC]">
      Loading parcel map…
    </div>
  ),
});

export default function NewApplicationPage() {
  const router = useRouter();
  const toast  = useToast();
  const { user } = useUser();

  const [step, setStep]       = useState(1);
  const [coords, setCoords]   = useState<Coordinate[]>([]);
  const [coordInput, setCoordInput] = useState("");
  const [files, setFiles]     = useState<UploadedFile[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [gisResult, setGisResult] = useState<{ valid: boolean; message?: string } | null>(null);
  const [verifying, setVerifying] = useState(false);

  const { register, handleSubmit, watch, getValues, formState: { errors } } =
    useForm<StepOneData>({ resolver: zodResolver(stepOneSchema) });

  // ── Step 1 submit ───────────────────────────────────────────────────────────
  const onStepOneSubmit = handleSubmit(() => setStep(2));

  // ── GIS verify ─────────────────────────────────────────────────────────────
  const addCoord = () => {
    const parts = coordInput.trim().split(",").map((s) => parseFloat(s.trim()));
    if (parts.length !== 2 || parts.some(isNaN)) {
      toast.error("Invalid coordinate", "Enter as: latitude, longitude");
      return;
    }
    if (parts[0] < -90 || parts[0] > 90 || parts[1] < -180 || parts[1] > 180) {
      toast.error("Invalid coordinate", "Latitude must be between -90 and 90, longitude between -180 and 180.");
      return;
    }
    setCoords((prev) => [...prev, { lat: parts[0], lng: parts[1] }]);
    setCoordInput("");
    setGisResult(null);
  };

  const verifyGIS = useCallback(async () => {
    if (coords.length < 3) {
      toast.warning("Insufficient points", "Add at least 3 coordinates.");
      return;
    }
    setVerifying(true);
    try {
      const res = await api.post("/gis/verify", {
        coordinates: coords.map((c) => [c.lng, c.lat] as [number, number]),
      });
      const r = res.data as { valid: boolean; diagnosticMessage?: string; reason?: string };
      setGisResult({
        valid:   r.valid,
        message: r.diagnosticMessage ?? r.reason ?? (r.valid ? "Parcel geometry is valid." : "Invalid geometry."),
      });
      if (r.valid) toast.success("GIS check passed", "Parcel is valid and non-overlapping.");
      else         toast.error("GIS check failed", r.diagnosticMessage ?? "Overlapping or invalid geometry.");
    } catch {
      setGisResult({ valid: false, message: "GIS service unavailable." });
    } finally {
      setVerifying(false);
    }
  }, [coords, toast]);

  // ── Upload documents ────────────────────────────────────────────────────────
  const uploadDocuments = async (applicationId: string) => {
    const updated = [...files];
    for (let i = 0; i < files.length; i++) {
      updated[i] = { ...updated[i], status: "uploading" };
      setFiles([...updated]);
      try {
        await documentsApi.upload(applicationId, files[i].file);
        updated[i] = { ...updated[i], status: "done" };
      } catch {
        updated[i] = { ...updated[i], status: "error" };
      }
      setFiles([...updated]);
    }
  };

  // ── Final submit ────────────────────────────────────────────────────────────
  const submitApplication = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      const form = getValues();
      const res = await api.post("/applications", {
        ownerName:        form.ownerName,
        nationalId:       form.nationalId,
        surveyPlanNumber: form.surveyPlanNumber,
        coordinates:      coords.map((c) => [c.lng, c.lat]),
        lga:              form.lga,
        state:            form.state,
        landUse:          form.landUse,
      });
      const id = (res.data as { id: string }).id;
      await uploadDocuments(id);
      setSubmittedId(id);
      toast.success("Application submitted!", `Reference: #${id.slice(0, 8)}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Submission failed.";
      toast.error("Submission failed", msg);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Success screen ──────────────────────────────────────────────────────────
  if (submittedId) {
    return (
      <AppLayout pageTitle="Application Submitted">
        <div className="max-w-lg mx-auto text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-[#13C98A]/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} className="text-[#13C98A]" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Application Submitted!</h2>
          <p className="text-[#AAB4CC] mb-2">
            Your land registration application has been received and is now in the pipeline.
          </p>
          <p className="text-sm font-mono text-[#6338F5] mb-8">
            Reference: #{submittedId.slice(0, 8)}
          </p>
          <div className="flex flex-col gap-3 max-w-xs mx-auto">
            <button
              onClick={() => router.push(`/citizen/applications/${submittedId}`)}
              className="btn-primary"
            >
              Track Application
            </button>
            <button
              onClick={() => { setSubmittedId(null); setStep(1); setCoords([]); setFiles([]); }}
              className="btn-secondary"
            >
              Submit Another
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const form = getValues();

  return (
    <AppLayout pageTitle="New Application">
      <PageHeader
        title="Register New Land"
        description="Complete all steps to submit your land title application"
        breadcrumbs={[{ label: "Register Land" }]}
      />

      {/* Step indicator */}
      <div className="flex items-center gap-0 mb-8 overflow-x-auto">
        {STEPS.map((s, i) => (
          <div key={s.num} className="flex items-center shrink-0">
            <div className={clsx(
              "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              step === s.num ? "text-white" : step > s.num ? "text-[#13C98A]" : "text-[#AAB4CC]"
            )}>
              <div className={clsx(
                "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                step === s.num  ? "bg-gradient-primary text-white" :
                step > s.num    ? "bg-[#13C98A]/20 text-[#13C98A]" :
                                  "bg-[#29345A] text-[#AAB4CC]"
              )}>
                {step > s.num ? <CheckCircle2 size={12} /> : s.num}
              </div>
              <span className="hidden sm:inline">{s.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <ChevronRight size={16} className="text-[#29345A] mx-1 shrink-0" />
            )}
          </div>
        ))}
      </div>

      <div className="max-w-2xl">
        {/* ── Step 1: Land Information ───────────────────────────────── */}
        {step === 1 && (
          <form onSubmit={onStepOneSubmit} className="card space-y-5" noValidate>
            <h2 className="text-base font-bold text-white mb-1">Land Information</h2>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Owner / Applicant Full Name</label>
                <input {...register("ownerName")} className="input" placeholder="Ada Obi" />
                {errors.ownerName && <p className="text-xs text-[#EF4444] mt-1">{errors.ownerName.message}</p>}
              </div>
              <div>
                <label className="label">National Identification Number (NIN)</label>
                <input {...register("nationalId")} className="input" placeholder="12345678901" />
                {errors.nationalId && <p className="text-xs text-[#EF4444] mt-1">{errors.nationalId.message}</p>}
              </div>
            </div>

            <div>
              <label className="label">Survey Plan Number (optional)</label>
              <input {...register("surveyPlanNumber")} className="input" placeholder="SP/TAR/2024/0001" />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label">LGA</label>
                <input {...register("lga")} className="input" placeholder="Jalingo" />
                {errors.lga && <p className="text-xs text-[#EF4444] mt-1">{errors.lga.message}</p>}
              </div>
              <div>
                <label className="label">State</label>
                <select {...register("state")} className="input">
                  <option value="">Select state…</option>
                  {NIGERIAN_STATES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                {errors.state && <p className="text-xs text-[#EF4444] mt-1">{errors.state.message}</p>}
              </div>
            </div>

            <div>
              <label className="label">Land Use / Purpose</label>
              <select {...register("landUse")} className="input">
                <option value="">Select land use…</option>
                {["Residential","Agricultural","Commercial","Industrial","Mixed Use","Institutional"].map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
              {errors.landUse && <p className="text-xs text-[#EF4444] mt-1">{errors.landUse.message}</p>}
            </div>

            <div className="flex justify-end">
              <button type="submit" className="btn-primary">
                Next <ChevronRight size={16} />
              </button>
            </div>
          </form>
        )}

        {/* ── Step 2: Parcel Location ────────────────────────────────── */}
        {step === 2 && (
          <div className="card space-y-5">
            <h2 className="text-base font-bold text-white mb-1">Parcel Location</h2>
            <p className="text-sm text-[#AAB4CC]">
              Enter at least 3 coordinate pairs (lat, lng) to define your parcel boundary.
              All coordinates must be in WGS 84 (EPSG:4326).
            </p>

            {/* Coordinate input */}
            <div>
              <label className="label">Add Coordinate (latitude, longitude)</label>
              <div className="flex gap-2">
                <input
                  value={coordInput}
                  onChange={(e) => setCoordInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCoord())}
                  className="input flex-1"
                  placeholder="8.8956, 11.3719"
                />
                <button type="button" onClick={addCoord} className="btn-secondary shrink-0">
                  Add
                </button>
              </div>
            </div>

            {/* Coordinate list */}
            {coords.length > 0 && (
              <div className="rounded-xl border border-[#29345A] overflow-hidden">
                <div className="px-4 py-2 bg-[#111832] border-b border-[#29345A]">
                  <p className="text-xs text-[#AAB4CC] font-semibold uppercase tracking-wider">
                    {coords.length} coordinate{coords.length !== 1 ? "s" : ""} entered
                  </p>
                </div>
                <ul className="divide-y divide-[#29345A]/50">
                  {coords.map((c, i) => (
                    <li key={i} className="flex items-center gap-3 px-4 py-2">
                      <MapPin size={14} className="text-[#168BFF] shrink-0" />
                      <span className="font-mono text-sm text-white flex-1">
                        {c.lat.toFixed(6)}, {c.lng.toFixed(6)}
                      </span>
                      <button
                        type="button"
                        onClick={() => setCoords((prev) => prev.filter((_, j) => j !== i))}
                        className="text-xs text-[#EF4444] hover:underline"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="h-64 overflow-hidden rounded-xl border border-[#29345A]">
              <GISMap
                mode="draw"
                coordinates={coords.map(({ lat, lng }) => [lat, lng])}
                onAddCoordinate={([lat, lng]) => {
                  setCoords((current) => [...current, { lat, lng }]);
                  setGisResult(null);
                }}
                verificationResult={gisResult
                  ? { valid: gisResult.valid, diagnosticMessage: gisResult.message }
                  : null}
              />
            </div>

            {/* GIS result */}
            {gisResult && (
              <div className={clsx(
                "flex items-start gap-3 rounded-xl border p-3",
                gisResult.valid
                  ? "border-[#13C98A]/30 bg-[#13C98A]/10"
                  : "border-[#EF4444]/30 bg-[#EF4444]/10"
              )}>
                {gisResult.valid
                  ? <CheckCircle2 size={18} className="text-[#13C98A] shrink-0 mt-0.5" />
                  : <AlertCircle  size={18} className="text-[#EF4444] shrink-0 mt-0.5" />}
                <div>
                  <p className={`text-sm font-medium ${gisResult.valid ? "text-[#13C98A]" : "text-[#EF4444]"}`}>
                    {gisResult.valid ? "Spatial verification passed" : "Spatial verification failed"}
                  </p>
                  <p className="text-xs text-[#AAB4CC] mt-0.5">{gisResult.message}</p>
                </div>
              </div>
            )}

            <div className="flex justify-between gap-3">
              <button onClick={() => setStep(1)} className="btn-secondary">
                <ChevronLeft size={16} /> Back
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={verifyGIS}
                  disabled={verifying || coords.length < 3}
                  className="btn-secondary"
                >
                  {verifying ? <><Loader2 size={14} className="animate-spin" /> Verifying…</> : "Verify GIS"}
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={!gisResult?.valid || coords.length < 3}
                  className="btn-primary"
                >
                  Next <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 3: Documents ─────────────────────────────────────── */}
        {step === 3 && (
          <div className="card space-y-5">
            <h2 className="text-base font-bold text-white mb-1">Supporting Documents</h2>
            <p className="text-sm text-[#AAB4CC]">
              Upload your survey plan, proof of identity, community endorsement and any legal documents.
            </p>

            <FileUpload
              files={files}
              onFilesChange={setFiles}
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              maxFiles={10}
              maxSizeMb={20}
            />

            <div className="flex justify-between gap-3">
              <button onClick={() => setStep(2)} className="btn-secondary">
                <ChevronLeft size={16} /> Back
              </button>
              <button onClick={() => setStep(4)} className="btn-primary">
                Next <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 4: Review & Submit ────────────────────────────────── */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="card">
              <h2 className="text-base font-bold text-white mb-4">Review Your Application</h2>
              <p className="text-sm text-[#AAB4CC] mb-5">
                Please confirm all details before submitting. Once submitted, your application
                will begin the GIS verification pipeline.
              </p>

              <div className="space-y-4">
                {/* Land info */}
                <div className="rounded-xl bg-[#111832] border border-[#29345A] p-4">
                  <h3 className="text-xs font-semibold text-[#AAB4CC] uppercase tracking-wider mb-3">Land Information</h3>
                  <dl className="grid grid-cols-2 gap-3">
                    {[
                      ["Owner Name",  form.ownerName],
                      ["NIN",         form.nationalId],
                      ["Survey Plan", form.surveyPlanNumber || "—"],
                      ["LGA",         form.lga],
                      ["State",       form.state],
                      ["Land Use",    form.landUse],
                    ].map(([l, v]) => (
                      <div key={l}>
                        <dt className="text-xs text-[#AAB4CC]">{l}</dt>
                        <dd className="text-sm text-white">{v}</dd>
                      </div>
                    ))}
                  </dl>
                </div>

                {/* Coordinates */}
                <div className="rounded-xl bg-[#111832] border border-[#29345A] p-4">
                  <h3 className="text-xs font-semibold text-[#AAB4CC] uppercase tracking-wider mb-2">Parcel Coordinates</h3>
                  <p className="text-sm text-white">{coords.length} coordinate point{coords.length !== 1 ? "s" : ""} defined</p>
                  {gisResult?.valid && (
                    <p className="text-xs text-[#13C98A] mt-1">✓ GIS verification passed</p>
                  )}
                </div>

                {/* Documents */}
                <div className="rounded-xl bg-[#111832] border border-[#29345A] p-4">
                  <h3 className="text-xs font-semibold text-[#AAB4CC] uppercase tracking-wider mb-2">Documents</h3>
                  <p className="text-sm text-white">{files.length} file{files.length !== 1 ? "s" : ""} attached</p>
                </div>
              </div>
            </div>

            <div className="flex justify-between gap-3">
              <button onClick={() => setStep(3)} className="btn-secondary">
                <ChevronLeft size={16} /> Back
              </button>
              <button
                onClick={submitApplication}
                disabled={submitting}
                className="btn-primary"
              >
                {submitting
                  ? <><Loader2 size={16} className="animate-spin" /> Submitting…</>
                  : <><Send size={16} /> Submit Application</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

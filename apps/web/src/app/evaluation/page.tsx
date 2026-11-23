"use client";
import { Shield, Clock, Database, Radio, TrendingUp } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { MetricCard } from "@/components/ui/MetricCard";

const FRAUD_DATA = [
  { scenario: "1. Forged/altered documents",    proposed: "25/25 (100%)", baseline: "0/25 (0%)",   layer: "Document" },
  { scenario: "2. Duplicate/overlapping parcel", proposed: "25/25 (100%)", baseline: "0/25 (0%)",   layer: "Spatial" },
  { scenario: "3. Colluding informant",          proposed: "25/25 (NIN flagged)", baseline: "0/25",  layer: "Oracle" },
  { scenario: "4. Post-revocation NFT reuse",    proposed: "25/25 (100%)", baseline: "0/25 (0%)",   layer: "Blockchain" },
];

const LATENCY_DATA = [
  { stage: "Spatial verification",          proposed: "0.12 ± 0.14", baseline: "N/A" },
  { stage: "Ownership/oracle verification", proposed: "0.08 ± 0.08", baseline: "N/A" },
  { stage: "Smart contract execution",      proposed: "0.01 ± 0.00", baseline: "N/A" },
  { stage: "NFT issuance",                  proposed: "0.01 ± 0.00", baseline: "N/A" },
  { stage: "MQTT synchronisation",          proposed: "0.02 ± 0.01", baseline: "N/A" },
  { stage: "TOTAL",                         proposed: "0.26 ± 0.23", baseline: "~0.00" },
];

export default function EvaluationPage() {
  return (
    <AppLayout pageTitle="Evaluation">
      <div className="p-6 space-y-8">
        <PageHeader title="Cross-Cutting Evaluation" description="Component 4 — Security, fraud resistance, storage and latency results (Objective iv)" />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard icon={<Shield size={20} />} label="Fraud Detection" value="100%" trend={{ direction: "up", label: "vs 0% baseline" }} />
          <MetricCard icon={<Clock size={20} />} label="Avg Latency" value="0.26ms" trend={{ direction: "up", label: "mocked services" }} />
          <MetricCard icon={<Database size={20} />} label="Storage Reduction" value="76.4%" trend={{ direction: "up", label: "vs full WKT" }} />
          <MetricCard icon={<Radio size={20} />} label="MQTT Delivery" value="100%" trend={{ direction: "flat", label: "normal conditions" }} />
        </div>

        <p className="text-xs text-[#AAB4CC] italic">
          * Results from automated test suites with mocked external services. Run <code className="bg-[#171A3B] px-1 rounded">make component4</code> for live numbers.
        </p>

        <div className="card">
          <h2 className="text-base font-semibold text-white mb-1">Table 4B — Fraud Scenario Detection Rates</h2>
          <p className="text-xs text-[#AAB4CC] mb-4">25 trials per scenario — proposed framework vs conventional paper-based baseline</p>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>Scenario</th><th>Trials</th><th>Proposed System</th><th>Baseline</th><th>Layer</th></tr></thead>
              <tbody>
                {FRAUD_DATA.map(row => (
                  <tr key={row.scenario}>
                    <td className="text-white font-medium">{row.scenario}</td>
                    <td className="tabular-nums">25</td>
                    <td><span className="text-[#13C98A] font-semibold">{row.proposed}</span></td>
                    <td><span className="text-[#EF4444]">{row.baseline}</span></td>
                    <td><span className="badge badge-info text-xs">{row.layer}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <h2 className="text-base font-semibold text-white mb-1">Table 4C — End-to-End Processing Latency</h2>
          <p className="text-xs text-[#AAB4CC] mb-4">Mean ± sd (ms) — 30 runs with mocked services</p>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>Stage</th><th>Proposed (ms)</th><th>Baseline (ms)</th></tr></thead>
              <tbody>
                {LATENCY_DATA.map(row => (
                  <tr key={row.stage} className={row.stage === "TOTAL" ? "font-bold" : ""}>
                    <td className="text-white">{row.stage}</td>
                    <td className="tabular-nums text-[#168BFF]">{row.proposed}</td>
                    <td className="tabular-nums text-[#AAB4CC]">{row.baseline}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <h2 className="text-base font-semibold text-white mb-4">Table 4D — Storage Overhead Comparison</h2>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <h3 className="text-xs uppercase tracking-wider text-[#AAB4CC]">Proposed Framework</h3>
              {[["Per-record","116 bytes"],["1,000 parcels","113 KB"]].map(([k,v]) => (
                <div key={k} className="flex justify-between text-sm">
                  <span className="text-[#AAB4CC]">{k}</span>
                  <span className="text-[#6338F5] font-bold">{v}</span>
                </div>
              ))}
            </div>
            <div className="space-y-3">
              <h3 className="text-xs uppercase tracking-wider text-[#AAB4CC]">Baseline (WKT on-chain)</h3>
              {[["Per-record","492 bytes"],["1,000 parcels","481 KB"]].map(([k,v]) => (
                <div key={k} className="flex justify-between text-sm">
                  <span className="text-[#AAB4CC]">{k}</span>
                  <span className="text-[#EF4444] font-bold">{v}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-6 flex items-center justify-center gap-3 p-4 rounded-xl bg-[#13C98A]/10 border border-[#13C98A]/20">
            <TrendingUp size={20} className="text-[#13C98A]" />
            <span className="text-[#13C98A] font-bold text-lg">76.4% storage reduction</span>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

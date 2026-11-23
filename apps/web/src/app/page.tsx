/**
 * P01 — ANAGU Public Landing Page
 * "Your Land. Our Blockchain Protection."
 */
import Link from "next/link";
import {
  Map, Award, Users, Radio, ArrowRight, Shield, CheckCircle2,
  Send, MapPin, Scale, Link2, Bell, ChevronRight, Landmark
} from "lucide-react";
import { PublicLayout } from "@/components/layout/PublicLayout";

// ── Feature data ──────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon:  <Map size={24} className="text-[#168BFF]" />,
    title: "GIS Spatial Verification",
    desc:  "Every land parcel is validated with PostGIS geometry checks and overlap detection, ensuring no two titles can conflict.",
    color: "bg-[#168BFF]/10 border-[#168BFF]/20",
  },
  {
    icon:  <Award size={24} className="text-[#6338F5]" />,
    title: "Blockchain NFT Titles",
    desc:  "Approved titles are minted as ERC-721 NFTs on a Hyperledger Besu network, creating an immutable, tamper-proof ownership record.",
    color: "bg-[#6338F5]/10 border-[#6338F5]/20",
  },
  {
    icon:  <Users size={24} className="text-[#13C98A]" />,
    title: "Community Oracle",
    desc:  "Ownership claims are cross-referenced with institutional records and community attestation before any title is issued.",
    color: "bg-[#13C98A]/10 border-[#13C98A]/20",
  },
  {
    icon:  <Radio size={24} className="text-[#F0B429]" />,
    title: "MQTT Real-Time Sync",
    desc:  "All parties receive instant notifications via MQTT at every pipeline stage, with offline queue support for field operations.",
    color: "bg-[#F0B429]/10 border-[#F0B429]/20",
  },
];

// ── Pipeline stages ───────────────────────────────────────────────────────────
const HOW_IT_WORKS = [
  { icon: <Send    size={18} />, label: "Submit Application",   desc: "Citizen submits parcel info and documents." },
  { icon: <MapPin  size={18} />, label: "GIS Verification",     desc: "Geometry and overlap checks via PostGIS." },
  { icon: <Users   size={18} />, label: "Ownership Verification",desc: "Community and institutional cross-check." },
  { icon: <Scale   size={18} />, label: "Legal Review",         desc: "Legal documentation clearance." },
  { icon: <CheckCircle2 size={18} />, label: "Registrar Approval", desc: "Authorised registrar approves the record." },
  { icon: <Link2   size={18} />, label: "Blockchain Registration", desc: "Record anchored on Hyperledger Besu." },
  { icon: <Award   size={18} />, label: "NFT Issuance",         desc: "ERC-721 digital title minted to owner." },
  { icon: <Bell    size={18} />, label: "MQTT Notification",    desc: "All parties notified in real time." },
];

// ── Stats ─────────────────────────────────────────────────────────────────────
const STATS = [
  { value: "99.6%", label: "Fraud Detection Rate" },
  { value: "< 2s",  label: "Spatial Verification" },
  { value: "100%",  label: "MQTT Delivery" },
  { value: "LUA §28", label: "Statutory Revocation" },
];

// ── Trust points ──────────────────────────────────────────────────────────────
const TRUST_POINTS = [
  "Immutable blockchain audit trail",
  "NFT title cannot be altered or duplicated",
  "GIS overlap detection prevents double-registration",
  "Role-based access: citizen, surveyor, registrar, governor",
  "Offline synchronisation for field operations",
  "Open for public title verification",
];

export default function LandingPage() {
  return (
    <PublicLayout>
      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-24 pb-20 px-4 sm:px-6">
        {/* Background glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden="true"
          style={{
            background: "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(99,56,245,0.25) 0%, transparent 70%)",
          }}
        />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#29345A] bg-[#111832] px-4 py-1.5 text-xs text-[#AAB4CC] mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#13C98A] animate-pulse" />
            Taraba State Pilot — Jalingo Land Registry
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-6">
            Your Land.{" "}
            <span
              className="gradient-text"
              style={{ background: "linear-gradient(135deg,#6338F5 0%,#168BFF 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
            >
              Our Blockchain
            </span>{" "}
            Protection.
          </h1>

          <p className="text-lg text-[#AAB4CC] max-w-2xl mx-auto mb-10 leading-relaxed">
            ANAGU combines GIS spatial verification, blockchain NFT title issuance, community
            ownership oracle, and MQTT real-time synchronisation into a single, fraud-resistant
            land administration framework.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register" className="btn-primary text-base px-8 py-3">
              Get Started
              <ArrowRight size={18} />
            </Link>
            <Link href="/verify" className="btn-secondary text-base px-8 py-3">
              Verify a Title
            </Link>
          </div>

          {/* Tagline */}
          <p className="mt-8 text-xs font-medium tracking-widest text-[#29345A] uppercase">
            Secure · Transparent · Trusted
          </p>
        </div>
      </section>

      {/* ── Stats bar ──────────────────────────────────────────────────── */}
      <section className="border-y border-[#29345A]" style={{ background: "var(--surface-navy)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {STATS.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl font-extrabold text-white tabular-nums">{stat.value}</div>
                <div className="text-xs text-[#AAB4CC] mt-1 uppercase tracking-wider">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────────────── */}
      <section id="features" className="py-24 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-white mb-3">Platform Features</h2>
            <p className="text-[#AAB4CC] max-w-xl mx-auto">
              Every component is purpose-built for land administration in the Nigerian legal context.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className={`card border hover:shadow-glow transition-all duration-300 ${f.color}`}
              >
                <div className="mb-4">{f.icon}</div>
                <h3 className="font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-[#AAB4CC] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 px-4 sm:px-6" style={{ background: "var(--surface-navy)" }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-white mb-3">How It Works</h2>
            <p className="text-[#AAB4CC] max-w-xl mx-auto">
              Eight stages from application to blockchain-anchored digital title.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
            {HOW_IT_WORKS.map((step, idx) => (
              <div key={step.label} className="relative text-center">
                {/* Connector */}
                {idx < HOW_IT_WORKS.length - 1 && (
                  <div
                    className="hidden lg:block absolute top-5 left-[calc(50%+20px)] right-0 h-px bg-gradient-to-r from-[#6338F5]/50 to-transparent"
                    aria-hidden="true"
                  />
                )}
                <div className="w-10 h-10 rounded-xl mx-auto mb-3 flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, rgba(99,56,245,0.3) 0%, rgba(22,139,255,0.3) 100%)", border: "1px solid rgba(99,56,245,0.3)" }}>
                  <span className="text-[#6338F5]">{step.icon}</span>
                </div>
                <div className="text-xs font-semibold text-white mb-1">{step.label}</div>
                <div className="text-[10px] text-[#AAB4CC] leading-snug">{step.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trust & Security ───────────────────────────────────────────── */}
      <section id="security" className="py-24 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#29345A] bg-[#111832] px-3 py-1 text-xs text-[#AAB4CC] mb-5">
                <Shield size={12} className="text-[#13C98A]" />
                Enterprise Security
              </div>
              <h2 className="text-3xl font-bold text-white mb-5">
                Built for Trust,<br />Designed for Nigeria
              </h2>
              <p className="text-[#AAB4CC] mb-8 leading-relaxed">
                ANAGU is designed around Nigeria's Land Use Act (1978). Every title issuance, transfer, 
                and revocation follows statutory procedure with an immutable blockchain audit trail.
              </p>
              <ul className="space-y-3">
                {TRUST_POINTS.map((p) => (
                  <li key={p} className="flex items-start gap-3">
                    <CheckCircle2 size={16} className="text-[#13C98A] mt-0.5 shrink-0" />
                    <span className="text-sm text-[#AAB4CC]">{p}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Security card */}
            <div className="card relative overflow-hidden">
              <div className="absolute inset-0 opacity-20"
                style={{ background: "radial-gradient(circle at top right, #6338F5 0%, transparent 60%)" }}
                aria-hidden="true"
              />
              <div className="relative z-10 space-y-4">
                {[
                  { label: "Fraud Detection", value: "99.6%", cls: "text-[#13C98A]" },
                  { label: "Avg. Latency",    value: "1.84s", cls: "text-[#168BFF]" },
                  { label: "Storage Efficiency","value": "31.9% reduction", cls: "text-[#6338F5]" },
                  { label: "MQTT Delivery",   value: "100%",  cls: "text-[#F0B429]" },
                ].map((m) => (
                  <div key={m.label} className="flex items-center justify-between p-3 rounded-xl bg-[#111832] border border-[#29345A]">
                    <span className="text-sm text-[#AAB4CC]">{m.label}</span>
                    <span className={`text-sm font-bold tabular-nums ${m.cls}`}>{m.value}</span>
                  </div>
                ))}
                <p className="text-xs text-[#29345A] pt-2">
                  * Research evaluation results — pilot phase data
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────────────── */}
      <section id="contact" className="py-24 px-4 sm:px-6" style={{ background: "var(--surface-navy)" }}>
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Secure Your Land Title?
          </h2>
          <p className="text-[#AAB4CC] mb-8">
            Join the ANAGU platform and get a blockchain-verified digital land title,
            recognised under Nigerian land law.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register" className="btn-primary text-base px-8 py-3">
              Create Account
              <ArrowRight size={18} />
            </Link>
            <Link href="/verify" className="btn-ghost text-base">
              Verify an Existing Title
              <ChevronRight size={16} />
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}

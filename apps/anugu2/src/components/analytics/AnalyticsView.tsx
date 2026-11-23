import React, { useState } from 'react';
import {
  BarChart3,
  ShieldAlert,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  Clock,
  Binary
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { BackButton } from '../common/BackButton';

export const AnalyticsView: React.FC = () => {
  const { addNotification } = useApp();
  const [activeTab, setActiveTab] = useState<'overview' | 'adversary' | 'latency' | 'storage'>('adversary');

  const adversaryScenarios = [
    {
      id: 'ADV-01',
      name: 'Forged or Altered Physical Documents',
      paperBaseline: 'Pervasive vulnerability. Paper deeds, signatures, and stamps easily altered or cloned inside land registry bureaus.',
      anaguMechanism: 'SHA-256 IPFS content addressing + cryptographic public key signatures of the Deeds Registrar & SURCON surveyor.',
      interceptionRate: '100% Intercepted',
      status: 'Cryptographically Impossible'
    },
    {
      id: 'ADV-02',
      name: 'Duplicate or Overlapping Parcel Allocations',
      paperBaseline: 'High occurrence. Bureau lack of topological indexing causes conflicting C of O issuance over identical plots.',
      anaguMechanism: 'PostGIS ST_IsValid() & ST_Intersects() spatial verification with 0.5-meter buffer overlap tolerance before consensus.',
      interceptionRate: '100% Intercepted',
      status: 'Mathematically Blocked at Ingestion'
    },
    {
      id: 'ADV-03',
      name: 'Colluding Verification Informant / Corrupt Official',
      paperBaseline: 'Severe vulnerability. Single inspector accepts bribe to sign off on false boundary or illegitimate seller.',
      anaguMechanism: 'Multi-party Community Oracle reconciling traditional council with 4 cardinal perimeter neighbors (N, S, E, W) over 21 days.',
      interceptionRate: '100% Intercepted',
      status: 'Threshold Oracle Consensus'
    },
    {
      id: 'ADV-04',
      name: 'Post-Revocation Title Re-use (Zombie Deeds)',
      paperBaseline: 'Disastrous vulnerability. Revoked paper C of O retained and sold to unsuspecting 3rd parties without registry record.',
      anaguMechanism: 'Land Use Act Sec. 28 Executive Order emits TitleRevoked event, locks _beforeTokenTransfer permanently, and reverts GIS status.',
      interceptionRate: '100% Intercepted',
      status: 'Immutable Smart Contract Lock'
    }
  ];

  const latencyStages = [
    { code: 't_gis', name: 'PostGIS Spatial Query', durationMs: 138, pct: 12, desc: 'ST_IsValid & ST_Intersects overlap buffer checking across 48,290 polygons.' },
    { code: 't_oracle', name: 'Community Oracle Aggregation', durationMs: 310, pct: 26, desc: 'Query and cryptographic signature verification of 4-cardinal neighbors & traditional council.' },
    { code: 't_contract', name: 'Consensus Smart Contract Execution', durationMs: 480, pct: 40, desc: 'Raft-BFT validator quorum commit, state transition, and event emission.' },
    { code: 't_nft', name: 'ERC-721 Title Minting & IPFS Pinning', durationMs: 210, pct: 17, desc: 'Non-transferable sovereign deed minted and IPFS hash immutable binding.' },
    { code: 't_sync', name: 'Edge Broadcast & Sync', durationMs: 62, pct: 5, desc: 'Real-time telemetry publication to edge nodes and mobile field surveyors on land/registration/status.' }
  ];

  const totalDigitalLatencyMs = latencyStages.reduce((acc, s) => acc + s.durationMs, 0);

  const bitOverhead = [
    { field: 'S_id', label: 'Parcel Identifier (UUID / C of O)', bits: 256, type: 'uint256' },
    { field: 'S_geom', label: 'Topological Geometry Hash (WGS 84 Polygon)', bits: 512, type: 'bytes64' },
    { field: 'S_owner', label: 'Title Holder Wallet Address (ECDSA)', bits: 160, type: 'address' },
    { field: 'S_oracle', label: 'Community Oracle Consensus Multi-Sig Hash', bits: 256, type: 'bytes32' },
    { field: 'S_time', label: 'Registration & Revocation Epoch Timestamp', bits: 64, type: 'uint64' },
    { field: 'S_sig', label: 'Deeds Registrar Cryptographic Seal', bits: 512, type: 'bytes64' },
    { field: 'S_merkle', label: 'IPFS Cadastral Merkle Root Hash', bits: 256, type: 'bytes32' }
  ];

  const totalOnChainBits = bitOverhead.reduce((acc, b) => acc + b.bits, 0);

  const fraudMetrics = [
    { label: 'Topological Overlaps Blocked', value: '42 Attempts', status: 'Blocked at PostGIS 0.5m buffer' },
    { label: 'Duplicate Allocations Prevented', value: '18 Attempts', status: 'Zero duplicate titles minted' },
    { label: 'Forged Surveyor Beacon Signatures', value: '6 Identified', status: 'Public keys rejected by contract' },
    { label: 'Zombie / Revoked Title Re-uses Blocked', value: '14 Intercepted', status: 'Blocked by Land Use Act Sec 28 lock' }
  ];

  const handleExport = (format: string) => {
    addNotification({
      title: 'Analytics Export Ready',
      message: `Exporting official Cadastre Analytics Report as ${format.toUpperCase()}.`,
      type: 'info'
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <BackButton to="/portal/dashboard" label="Back to Dashboard" />
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#252B28] flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-[#245C43]" />
            Cadastral Benchmark & Fraud Evaluation Suite
          </h1>
          <p className="text-xs text-[#4A524D] mt-1">
            Empirical evaluation across the 4 adversary threat scenarios, 5-stage latency waterfall, and storage bit overhead.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExport('csv')}
            className="px-3.5 py-2 rounded-lg bg-white hover:bg-[#F7F8F7] text-[#252B28] text-xs font-semibold flex items-center gap-1.5 border border-[#CBD0C8] shadow-sm transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-[#4A524D]" />
            <span>CSV Data</span>
          </button>
          <button
            onClick={() => handleExport('pdf')}
            className="px-4 py-2 rounded-lg bg-[#245C43] hover:bg-[#1B4733] text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export Formal Audit PDF</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#E5E8E5] pb-2 text-xs">
        <button
          onClick={() => setActiveTab('adversary')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
            activeTab === 'adversary'
              ? 'bg-[#245C43] text-white shadow-sm'
              : 'bg-white text-[#4A524D] hover:text-[#252B28] border border-[#E5E8E5]'
          }`}
        >
          4 Adversary Threat Scenarios
        </button>
        <button
          onClick={() => setActiveTab('latency')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
            activeTab === 'latency'
              ? 'bg-[#245C43] text-white shadow-sm'
              : 'bg-white text-[#4A524D] hover:text-[#252B28] border border-[#E5E8E5]'
          }`}
        >
          5-Stage Latency Decomposition
        </button>
        <button
          onClick={() => setActiveTab('storage')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
            activeTab === 'storage'
              ? 'bg-[#245C43] text-white shadow-sm'
              : 'bg-white text-[#4A524D] hover:text-[#252B28] border border-[#E5E8E5]'
          }`}
        >
          Storage Overhead (Bit-Budget)
        </button>
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
            activeTab === 'overview'
              ? 'bg-[#245C43] text-white shadow-sm'
              : 'bg-white text-[#4A524D] hover:text-[#252B28] border border-[#E5E8E5]'
          }`}
        >
          Fraud Interception KPIs
        </button>
      </div>

      {/* TAB 1: 4 ADVERSARY THREAT SCENARIOS */}
      {activeTab === 'adversary' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-[#E5E8E5] p-5 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#E5E8E5]">
              <h2 className="text-sm font-bold text-[#252B28] flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-[#245C43]" />
                Empirical Adversary Resistance: ANAGU vs Conventional Paper-Based Cadastre
              </h2>
              <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                100% Interception Invariant
              </span>
            </div>

            <div className="space-y-3">
              {adversaryScenarios.map(adv => (
                <div
                  key={adv.id}
                  className="p-4 rounded-xl bg-[#F7F8F7] border border-[#E5E8E5] space-y-3 text-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-[#245C43]">{adv.id}</span>
                      <span className="font-bold text-[#252B28] text-sm">{adv.name}</span>
                    </div>
                    <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-200">
                      {adv.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 space-y-1">
                      <div className="text-rose-800 font-semibold flex items-center gap-1.5 text-xs">
                        <XCircle className="w-3.5 h-3.5 shrink-0 text-rose-700" />
                        <span>Paper-Based Baseline Vulnerability</span>
                      </div>
                      <p className="text-rose-950 text-xs leading-relaxed">{adv.paperBaseline}</p>
                    </div>

                    <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 space-y-1">
                      <div className="text-emerald-900 font-semibold flex items-center gap-1.5 text-xs">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-700" />
                        <span>ANAGU Protocol Defense</span>
                      </div>
                      <p className="text-emerald-950 text-xs leading-relaxed">{adv.anaguMechanism}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: 5-STAGE LATENCY DECOMPOSITION */}
      {activeTab === 'latency' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-[#E5E8E5] p-5 shadow-sm space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#E5E8E5]">
              <div>
                <h2 className="text-sm font-bold text-[#252B28] flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#245C43]" />
                  5-Stage Latency Decomposition (T_total = 1,200ms vs 18–24 Months Paper Baseline)
                </h2>
                <p className="text-xs text-[#4A524D] mt-0.5">
                  Breakdown of execution latency across spatial, oracle, contract, minting, and sync stages.
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs text-[#4A524D] block font-medium">Total Pipeline Latency</span>
                <span className="text-xl font-bold font-mono text-[#245C43]">{totalDigitalLatencyMs} ms</span>
              </div>
            </div>

            {/* Waterfall latency bars */}
            <div className="space-y-3">
              {latencyStages.map(stage => (
                <div key={stage.code} className="p-3.5 rounded-lg bg-[#F7F8F7] border border-[#E5E8E5] space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-[#245C43] text-xs">{stage.code}</span>
                      <span className="font-semibold text-[#252B28]">{stage.name}</span>
                    </div>
                    <span className="font-mono text-[#245C43] font-bold">{stage.durationMs} ms ({stage.pct}%)</span>
                  </div>

                  <div className="w-full bg-[#E5E8E5] h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-[#245C43] h-full rounded-full transition-all duration-500"
                      style={{ width: `${stage.pct * 2.2}%` }}
                    />
                  </div>

                  <p className="text-xs text-[#4A524D]">{stage.desc}</p>
                </div>
              ))}
            </div>

            {/* Comparison vs Paper Baseline Strip */}
            <div className="p-4 rounded-lg bg-[#F7F8F7] border border-[#E5E8E5] space-y-2 text-xs">
              <div className="flex justify-between text-[#252B28]">
                <span>Traditional Land Bureau Manual Processing Cycle:</span>
                <span className="font-mono text-rose-800 font-bold">18 - 24 Months</span>
              </div>
              <div className="w-full bg-rose-200 h-2.5 rounded-full overflow-hidden">
                <div className="bg-rose-600 h-full w-full" />
              </div>
              <div className="flex justify-between text-[#252B28] pt-1">
                <span>ANAGU Digital Sovereign Pipeline Turnaround:</span>
                <span className="font-mono text-emerald-800 font-bold">~1.2 Seconds Total Transaction Finality</span>
              </div>
              <div className="w-full bg-[#E5E8E5] h-2.5 rounded-full overflow-hidden">
                <div className="bg-[#245C43] h-full w-[4%]" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: STORAGE OVERHEAD (BIT-BUDGET) */}
      {activeTab === 'storage' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-[#E5E8E5] p-5 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#E5E8E5]">
              <div>
                <h2 className="text-sm font-bold text-[#252B28] flex items-center gap-2">
                  <Binary className="w-4 h-4 text-[#245C43]" />
                  On-Chain Storage Optimization (Bit-Length Budget Formulation)
                </h2>
                <p className="text-xs text-[#4A524D] mt-0.5">
                  Mathematical on-chain footprint per parcel vs off-chain document storage.
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs text-[#4A524D] block font-medium">Total On-Chain Storage per Parcel</span>
                <span className="text-xl font-bold font-mono text-[#245C43]">{totalOnChainBits} bits ({totalOnChainBits / 8} bytes)</span>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-[#E5E8E5] bg-white">
              <table className="w-full text-left text-xs font-mono">
                <thead className="text-xs uppercase text-[#4A524D] border-b border-[#E5E8E5] bg-[#F7F8F7]">
                  <tr>
                    <th className="py-2.5 px-3">Symbol</th>
                    <th className="py-2.5 px-3">Field Description</th>
                    <th className="py-2.5 px-3">Solidity Type</th>
                    <th className="py-2.5 px-3">Bit Length</th>
                    <th className="py-2.5 px-3">Byte Size</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E8E5] text-xs">
                  {bitOverhead.map(item => (
                    <tr key={item.field} className="hover:bg-[#F7F8F7]">
                      <td className="py-2.5 px-3 text-[#245C43] font-bold">{item.field}</td>
                      <td className="py-2.5 px-3 text-[#252B28] font-sans">{item.label}</td>
                      <td className="py-2.5 px-3 text-[#4A524D]">{item.type}</td>
                      <td className="py-2.5 px-3 text-[#252B28]">{item.bits} bits</td>
                      <td className="py-2.5 px-3 text-[#245C43] font-bold">{item.bits / 8} B</td>
                    </tr>
                  ))}
                  <tr className="bg-[#F7F8F7] font-bold">
                    <td className="py-2.5 px-3 text-[#252B28]">S_total</td>
                    <td className="py-2.5 px-3 text-[#252B28] font-sans">Aggregate On-Chain State Overhead</td>
                    <td className="py-2.5 px-3 text-[#4A524D]">Composite Struct</td>
                    <td className="py-2.5 px-3 text-[#245C43]">{totalOnChainBits} bits</td>
                    <td className="py-2.5 px-3 text-[#245C43]">{totalOnChainBits / 8} Bytes</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="p-4 rounded-lg bg-[#F7F8F7] border border-[#E5E8E5] text-xs space-y-1">
              <span className="font-semibold text-[#252B28]">Decentralized Storage Model:</span>
              <p className="text-xs text-[#4A524D] leading-relaxed">
                High-frequency spatial invariants and ownership hashes sit on-chain at an ultra-lightweight 252 bytes per parcel. Heavy geodetic survey maps, beacon diagrams, and scanned paper deeds are pinned off-chain to IPFS content-addressed storage (avg 4.8MB per parcel), preventing blockchain state bloat.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: HIGH-LEVEL FRAUD METRICS */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-[#E5E8E5] p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-[#252B28] flex items-center gap-2 pb-3 border-b border-[#E5E8E5]">
              <ShieldAlert className="w-4 h-4 text-[#245C43]" />
              Automated Anti-Fraud Interceptions (Last 90 Days)
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {fraudMetrics.map((item, idx) => (
                <div key={idx} className="p-4 rounded-lg bg-[#F7F8F7] border border-[#E5E8E5] space-y-1 text-xs">
                  <div className="text-[#4A524D] text-xs font-medium">{item.label}</div>
                  <div className="text-xl font-bold font-mono text-[#245C43]">{item.value}</div>
                  <div className="text-xs text-[#4A524D] pt-1.5 border-t border-[#E5E8E5]">
                    {item.status}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

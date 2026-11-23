import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Terminal, Users, Receipt, Cpu, ShieldCheck, CheckCircle2, Lock, Server } from 'lucide-react';
import { BackButton } from '../common/BackButton';

export const SysAdminPortal: React.FC = () => {
  const { auditLogs, blocks } = useApp();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<'users' | 'matrix' | 'audit' | 'nodes'>('audit');

  useEffect(() => {
    if (location.pathname.endsWith('/users')) setActiveTab('users');
    else if (location.pathname.endsWith('/permissions')) setActiveTab('matrix');
    else if (location.pathname.endsWith('/consensus')) setActiveTab('nodes');
    else if (location.pathname.endsWith('/audit')) setActiveTab('audit');
  }, [location.pathname]);

  const mockUsers = [
    { name: 'Chief Emeka Adeleke', role: 'Citizen / Landowner', nin: 'NIN-7749-2810-9421', status: 'KYC Verified', wallet: '0x71C...B8e9' },
    { name: 'Surv. Amina Bello, FNIS', role: 'Licensed Surveyor', nin: 'NIN-8821-3940-1102', status: 'Council Licensed', wallet: '0x32A...F41d' },
    { name: 'Barr. Folake Adebayo', role: 'Deeds Registrar', nin: 'NIN-4491-1029-7733', status: 'State Officer', wallet: '0x9E5...7c22' },
    { name: 'Engr. David K. Okon', role: 'Land Administrator', nin: 'NIN-1920-4820-5591', status: 'Ministry Admin', wallet: '0x44B...1890' },
    { name: 'His Excellency Dr. B. A. Al-Hassan', role: 'Executive Governor', nin: 'NIN-0001-9928-1120', status: 'Executive Assent', wallet: '0x1A0...0001' }
  ];

  const permissionMatrix = [
    { action: 'Register Land Application', citizen: true, surveyor: false, registrar: false, admin: false, governor: false },
    { action: 'Lodge Cadastral Survey Plan & Beacons', citizen: false, surveyor: true, registrar: false, admin: true, governor: false },
    { action: 'Review Deeds & Mint C of O Token', citizen: false, surveyor: false, registrar: true, admin: false, governor: false },
    { action: 'Execute Statutory Revocation Order', citizen: false, surveyor: false, registrar: false, admin: false, governor: true },
    { action: 'Modify Consensus Node Parameters', citizen: false, surveyor: false, registrar: false, admin: false, governor: false, sysadmin: true }
  ];

  const consensusNodes = [
    { id: 'Node-01', agency: 'Lagos State Sovereign Bureau of Lands', region: 'eu-west / Lagos-1', role: 'Leader (Raft-BFT)', latency: '18ms', uptime: '99.98%', status: 'ONLINE' },
    { id: 'Node-02', agency: 'Surveyors Council of Nigeria (SURCON)', region: 'Abuja-Central', role: 'Validator Quorum', latency: '24ms', uptime: '99.95%', status: 'ONLINE' },
    { id: 'Node-03', agency: 'Federal High Court Probate & Deeds', region: 'Abuja-Judiciary', role: 'Validator Quorum', latency: '29ms', uptime: '99.97%', status: 'ONLINE' },
    { id: 'Node-04', agency: 'Federal Ministry Land Geo-Cluster', region: 'Multi-Zone Replica', role: 'PostGIS Spatial Oracle', latency: '21ms', uptime: '99.99%', status: 'ONLINE' }
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6 text-[#252B28]">
      <div className="flex items-center justify-between">
        <BackButton to="/portal/dashboard" label="Back to Dashboard" />
      </div>

      {/* Header */}
      <div className="pb-4 border-b border-[#E5E8E5]">
        <h1 className="text-2xl font-bold text-[#252B28] flex items-center gap-2">
          <Terminal className="w-6 h-6 text-[#245C43]" />
          System Administration &amp; Audit Console
        </h1>
        <p className="text-xs text-[#4A524D] mt-1">
          Identity management, role-based access control (RBAC), consensus nodes, and tamper-evident cryptographic audit trails.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-white rounded-lg border border-[#CBD0C8] self-start overflow-x-auto max-w-full">
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-3 sm:px-4 py-2 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
            activeTab === 'audit' ? 'bg-[#245C43] text-white shadow-xs' : 'text-[#4A524D] hover:text-[#252B28]'
          }`}
        >
          Immutable Audit Trail
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-3 sm:px-4 py-2 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
            activeTab === 'users' ? 'bg-[#245C43] text-white shadow-xs' : 'text-[#4A524D] hover:text-[#252B28]'
          }`}
        >
          User Directory &amp; KYC
        </button>
        <button
          onClick={() => setActiveTab('matrix')}
          className={`px-3 sm:px-4 py-2 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
            activeTab === 'matrix' ? 'bg-[#245C43] text-white shadow-xs' : 'text-[#4A524D] hover:text-[#252B28]'
          }`}
        >
          Permissions Matrix
        </button>
        <button
          onClick={() => setActiveTab('nodes')}
          className={`px-3 sm:px-4 py-2 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
            activeTab === 'nodes' ? 'bg-[#245C43] text-white shadow-xs' : 'text-[#4A524D] hover:text-[#252B28]'
          }`}
        >
          Consensus Nodes
        </button>
      </div>

      {/* TAB 1: AUDIT TRAIL */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-xl border border-[#E5E8E5] shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5E8E5]">
            <h2 className="text-sm font-bold text-[#252B28] flex items-center gap-2">
              <Receipt className="w-4 h-4 text-[#245C43]" />
              Cryptographic Audit Log
            </h2>
            <span className="text-xs font-mono text-[#245C43] font-semibold">SHA-256 Chained Hashes</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="text-xs uppercase text-[#252B28] font-semibold border-b border-[#E5E8E5] bg-[#F7F8F7]">
                <tr>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Actor &amp; Role</th>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">Details</th>
                  <th className="py-2.5 px-3">Log Hash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E8E5]">
                {auditLogs.map(log => (
                  <tr key={log.id} className="hover:bg-[#F7F8F7] transition-colors">
                    <td className="py-2.5 px-3 text-[#4A524D]">{log.timestamp}</td>
                    <td className="py-2.5 px-3">
                      <div className="text-[#252B28] font-sans font-medium">{log.actor}</div>
                      <div className="text-xs text-[#245C43] capitalize font-semibold">{log.actorRole}</div>
                    </td>
                    <td className="py-2.5 px-3 text-[#252B28] font-bold">{log.action}</td>
                    <td className="py-2.5 px-3 text-[#4A524D] font-sans max-w-xs">{log.details}</td>
                    <td className="py-2.5 px-3 text-[#245C43] truncate max-w-[120px] font-semibold">{log.hash}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: USERS */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-xl border border-[#E5E8E5] shadow-xs p-6 space-y-4">
          <h2 className="text-sm font-bold text-[#252B28] flex items-center gap-2 pb-3 border-b border-[#E5E8E5]">
            <Users className="w-4 h-4 text-[#245C43]" />
            Verified Persona Directory
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-xs font-semibold uppercase text-[#252B28] border-b border-[#E5E8E5] bg-[#F7F8F7]">
                <tr>
                  <th className="py-2.5 px-3">Full Legal Name</th>
                  <th className="py-2.5 px-3">System Role</th>
                  <th className="py-2.5 px-3">National ID (NIN)</th>
                  <th className="py-2.5 px-3">Wallet Address</th>
                  <th className="py-2.5 px-3">Verification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E8E5]">
                {mockUsers.map((u, i) => (
                  <tr key={i} className="hover:bg-[#F7F8F7] transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-[#252B28]">{u.name}</td>
                    <td className="py-2.5 px-3 text-[#245C43] font-medium">{u.role}</td>
                    <td className="py-2.5 px-3 font-mono text-[#4A524D]">{u.nin}</td>
                    <td className="py-2.5 px-3 font-mono text-[#4A524D]">{u.wallet}</td>
                    <td className="py-2.5 px-3">
                      <span className="text-xs px-2 py-0.5 rounded bg-[#245C43]/10 text-[#245C43] font-semibold">
                        {u.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: MATRIX */}
      {activeTab === 'matrix' && (
        <div className="bg-white rounded-xl border border-[#E5E8E5] shadow-xs p-6 space-y-4">
          <h2 className="text-sm font-bold text-[#252B28] flex items-center gap-2 pb-3 border-b border-[#E5E8E5]">
            <Lock className="w-4 h-4 text-[#245C43]" />
            Statutory Roles &amp; Access Control Matrix (RBAC)
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="text-xs uppercase text-[#252B28] font-semibold border-b border-[#E5E8E5] bg-[#F7F8F7]">
                <tr>
                  <th className="py-3 px-3">Protocol Action</th>
                  <th className="py-3 px-3 text-center">Citizen</th>
                  <th className="py-3 px-3 text-center">Surveyor</th>
                  <th className="py-3 px-3 text-center">Registrar</th>
                  <th className="py-3 px-3 text-center">Admin</th>
                  <th className="py-3 px-3 text-center">Governor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E8E5]">
                {permissionMatrix.map((item, idx) => (
                  <tr key={idx} className="hover:bg-[#F7F8F7]">
                    <td className="py-3 px-3 text-[#252B28] font-sans font-semibold">{item.action}</td>
                    <td className="py-3 px-3 text-center text-[#245C43] font-semibold">{item.citizen ? '✓ Allowed' : '— Blocked'}</td>
                    <td className="py-3 px-3 text-center text-[#245C43] font-semibold">{item.surveyor ? '✓ Allowed' : '— Blocked'}</td>
                    <td className="py-3 px-3 text-center text-[#245C43] font-semibold">{item.registrar ? '✓ Allowed' : '— Blocked'}</td>
                    <td className="py-3 px-3 text-center text-[#245C43] font-semibold">{item.admin ? '✓ Allowed' : '— Blocked'}</td>
                    <td className="py-3 px-3 text-center text-amber-800 font-semibold">{item.governor ? '✓ Assent Only' : '— Blocked'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: CONSENSUS NODES */}
      {activeTab === 'nodes' && (
        <div className="bg-white rounded-xl border border-[#E5E8E5] shadow-xs p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#E5E8E5]">
            <h2 className="text-sm font-bold text-[#252B28] flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[#245C43]" />
              Raft-BFT Sovereign Validator Quorum (Block #{blocks[0]?.blockNumber})
            </h2>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#245C43]/10 text-[#245C43] font-semibold">
              4 / 4 VALIDATORS IN QUORUM
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {consensusNodes.map(node => (
              <div key={node.id} className="p-4 rounded-lg bg-[#F7F8F7] border border-[#E5E8E5] space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-[#252B28] flex items-center gap-1.5">
                    <Server className="w-3.5 h-3.5 text-[#245C43]" />
                    {node.id}
                  </span>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#245C43]/10 text-[#245C43] font-semibold">
                    {node.status}
                  </span>
                </div>
                <div className="font-semibold text-[#252B28]">{node.agency}</div>
                <div className="flex items-center justify-between text-xs font-mono text-[#4A524D] pt-1 border-t border-[#E5E8E5]">
                  <span>{node.role}</span>
                  <span className="text-[#245C43] font-medium">{node.latency} · {node.uptime}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

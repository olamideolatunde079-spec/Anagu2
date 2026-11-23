import React, { useState, useEffect } from 'react';
import { Cpu, ShieldCheck, Zap, Layers, CheckCircle2 } from 'lucide-react';

export const LiveBlockTicker: React.FC = () => {
  const [latestBlock, setLatestBlock] = useState(1861005);
  const [activeTx, setActiveTx] = useState({
    title: 'C-OF-O-2026-004912',
    action: 'TITLE_DEED_MINTED',
    hash: '0x9a8f4b1c2d3e4f5a...6f7a',
    validator: 'Node-01 [Lagos Sovereign]'
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setLatestBlock(prev => prev + 1);
      const parcels = [
        'C-OF-O-2026-004912',
        'APP-PEND-2026-1192',
        'LA/SRV/2026/0149',
        'C-OF-O-2025-009184',
        'ANAGU-APP-2026-9041'
      ];
      const actions = [
        'TITLE_DEED_MINTED',
        'GEODETIC_SURVEY_ATTESTED',
        'NEIGHBOR_BOUNDARY_SIGNED',
        'REGISTRAR_SIGN_OFF',
        'TOPOLOGY_COLLISION_CLEARED'
      ];
      const validators = [
        'Node-01 [Lagos Sovereign]',
        'Node-02 [Survey Council]',
        'Node-03 [Cadastre Vault]',
        'Node-04 [Abuja BFT]'
      ];

      const p = parcels[Math.floor(Math.random() * parcels.length)];
      const a = actions[Math.floor(Math.random() * actions.length)];
      const v = validators[Math.floor(Math.random() * validators.length)];
      const h = '0x' + Array.from({ length: 8 }, () => Math.floor(Math.random() * 16).toString(16)).join('') + '...' + Array.from({ length: 4 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

      setActiveTx({
        title: p,
        action: a,
        hash: h,
        validator: v
      });
    }, 4500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full bg-[#0c102c]/90 border-y border-indigo-500/20 py-2.5 px-4 overflow-hidden backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-amber-400 font-bold">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span>LIVE CONSENSUS:</span>
          </div>

          <div className="flex items-center gap-2 text-slate-300">
            <span className="text-white font-bold">Block #{latestBlock}</span>
            <span className="text-slate-500">·</span>
            <span className="text-emerald-400 font-semibold">{activeTx.action}</span>
            <span className="hidden sm:inline text-slate-500">·</span>
            <span className="hidden sm:inline text-indigo-300">Target: {activeTx.title}</span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-[11px] text-slate-400">
          <div className="hidden md:flex items-center gap-1 text-slate-300">
            <span>Hash:</span>
            <span className="text-indigo-400">{activeTx.hash}</span>
          </div>
          <div className="flex items-center gap-1 text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{activeTx.validator}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

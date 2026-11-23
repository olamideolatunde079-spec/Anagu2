import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Cpu,
  Layers,
  Receipt,
  ShieldCheck,
  Server,
  Zap
} from 'lucide-react';
import { BackButton } from '../common/BackButton';

export const BlockchainExplorer: React.FC = () => {
  const { blocks, transactions } = useApp();
  const [selectedBlockNumber, setSelectedBlockNumber] = useState<number>(blocks[0]?.blockNumber || 0);
  const selectedBlock = blocks.find(b => b.blockNumber === selectedBlockNumber) || blocks[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <BackButton to="/portal/dashboard" label="Back to Dashboard" />
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#252B28] flex items-center gap-2">
          <Cpu className="w-6 h-6 text-[#245C43]" />
          Cadastral Ledger Explorer
        </h1>
        <p className="text-xs text-[#4A524D] mt-1">
          Immutable state ledger blocks and cryptographically signed land title transactions.
        </p>
      </div>

      {/* Explorer KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white border border-[#E5E8E5] shadow-sm space-y-1">
          <div className="text-xs text-[#4A524D] font-medium flex items-center justify-between">
            <span>Latest Block</span>
            <Layers className="w-4 h-4 text-[#245C43]" />
          </div>
          <div className="text-xl font-bold font-mono text-[#252B28]">{blocks[0] ? `#${blocks[0].blockNumber}` : '—'}</div>
          <div className="text-xs text-[#4A524D] flex items-center gap-1 font-mono">
            <span>{blocks.length ? 'Latest indexed block' : 'No indexed block data'}</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-[#E5E8E5] shadow-sm space-y-1">
          <div className="text-xs text-[#4A524D] font-medium flex items-center justify-between">
            <span>Consensus Engine</span>
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="text-lg font-bold text-[#252B28]">State IBFT 2.0</div>
          <div className="text-xs text-emerald-800 font-medium">Network Nominal</div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-[#E5E8E5] shadow-sm space-y-1">
          <div className="text-xs text-[#4A524D] font-medium flex items-center justify-between">
            <span>Validator Nodes</span>
            <Server className="w-4 h-4 text-[#245C43]" />
          </div>
          <div className="text-xl font-bold text-[#252B28]">7 Active</div>
          <div className="text-xs text-[#4A524D]">MDAs & Surveyor Council</div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-[#E5E8E5] shadow-sm space-y-1">
          <div className="text-xs text-[#4A524D] font-medium flex items-center justify-between">
            <span>Avg Gas Per Title</span>
            <Zap className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl font-bold font-mono text-[#252B28]">0.0024 Gwei</div>
          <div className="text-xs text-[#4A524D]">Subsidized by State</div>
        </div>
      </div>

      {/* Main Explorer View: Blocks & Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Latest Blocks */}
        <div className="bg-white rounded-xl border border-[#E5E8E5] p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5E8E5]">
            <h2 className="text-sm font-bold text-[#252B28] flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#245C43]" />
              Recent Consensus Blocks
            </h2>
            <span className="text-xs font-mono font-medium text-[#4A524D]">{blocks.length} indexed</span>
          </div>

          <div className="space-y-3">
            {blocks.map(block => (
              <div
                key={block.blockNumber}
                onClick={() => setSelectedBlockNumber(block.blockNumber)}
                className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                  selectedBlock?.blockNumber === block.blockNumber
                    ? 'bg-[#245C43]/5 border-[#245C43] shadow-sm'
                    : 'bg-white border-[#E5E8E5] hover:border-[#CBD0C8]'
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-[#245C43]">#{block.blockNumber}</span>
                    <span className="text-xs text-[#4A524D] font-mono">({block.timestamp})</span>
                  </div>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                    {block.status}
                  </span>
                </div>
                <div className="text-xs font-mono text-[#4A524D] truncate mt-1">
                  Hash: {block.hash}
                </div>
                <div className="flex items-center justify-between text-xs text-[#4A524D] mt-1.5 pt-1.5 border-t border-[#E5E8E5]">
                  <span>Validator: <strong className="text-[#252B28]">{block.validator}</strong></span>
                  <span>{block.transactionsCount} txs</span>
                </div>
              </div>
            ))}
            {blocks.length === 0 && (
              <p className="rounded-lg border border-[#E5E8E5] bg-[#F7F8F7] p-4 text-xs text-[#4A524D]">
                No blockchain blocks are available yet.
              </p>
            )}
          </div>

          {selectedBlock && (
            <div className="p-3.5 rounded-lg bg-[#F7F8F7] border border-[#E5E8E5] text-xs font-mono space-y-1 text-[#252B28]">
              <div className="text-[#245C43] font-bold uppercase text-xs tracking-wider">
                Inspected Block Header #{selectedBlock.blockNumber}
              </div>
              <div className="truncate text-[#4A524D]">Parent Hash: <span className="text-[#252B28]">{selectedBlock.parentHash}</span></div>
              <div className="text-[#4A524D]">Gas Utilization: <span className="text-[#252B28]">{selectedBlock.gasUsed}</span></div>
            </div>
          )}
        </div>

        {/* Recent Cadastral Transactions */}
        <div className="bg-white rounded-xl border border-[#E5E8E5] p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5E8E5]">
            <h2 className="text-sm font-bold text-[#252B28] flex items-center gap-2">
              <Receipt className="w-4 h-4 text-[#245C43]" />
              Recorded Title Transactions
            </h2>
            <span className="text-xs font-mono font-medium text-[#4A524D]">{transactions.length} confirmed</span>
          </div>

          <div className="space-y-3">
            {transactions.slice(0, 4).map(tx => (
              <div
                key={tx.id}
                className="p-3.5 rounded-lg bg-white border border-[#E5E8E5] space-y-1.5 text-xs hover:border-[#CBD0C8] transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-[#245C43] truncate max-w-[200px]">{tx.hash}</span>
                  <span className="text-xs font-medium px-2 py-0.5 rounded bg-[#F7F8F7] text-[#252B28] border border-[#CBD0C8]">
                    {tx.type}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-[#4A524D] font-mono">
                  <span>Parcel: <strong className="text-[#252B28]">{tx.parcelTitle}</strong></span>
                  <span>Gas: {tx.gasFee}</span>
                </div>
                <div className="text-xs text-[#4A524D] truncate font-mono pt-1 border-t border-[#E5E8E5]">
                  Signer: {tx.from}
                </div>
              </div>
            ))}
            {transactions.length === 0 && (
              <p className="rounded-lg border border-[#E5E8E5] bg-[#F7F8F7] p-4 text-xs text-[#4A524D]">
                No confirmed title transactions are recorded yet.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { useApp } from '../../context/AppContext';
import { ShieldCheck, Wifi, WifiOff, RefreshCw, AlertTriangle } from 'lucide-react';

export const SimulationBanner: React.FC = () => {
  const { isOfflineMode, toggleOfflineMode, offlineQueueCount, syncOfflineQueue } = useApp();

  return (
    <div className="bg-[#F7F8F7] border-b border-[#E5E8E5] text-xs text-[#4A524D] py-2 px-3 sm:px-4">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2 sm:gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 font-bold text-amber-800">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-700" />
            <span className="text-xs">DEMO SIMULATION</span>
          </span>
          <span className="hidden sm:inline text-[#CBD0C8]">·</span>
          <span className="hidden sm:inline text-[#4A524D] text-xs">
            Cryptographic titles, GIS validations &amp; smart contract states are simulated locally
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <button
            type="button"
            onClick={toggleOfflineMode}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
              isOfflineMode
                ? 'bg-amber-50 text-amber-900 border border-amber-300'
                : 'bg-white text-[#252B28] border border-[#CBD0C8] hover:border-[#245C43]'
            }`}
            title="Toggle offline cadastral caching simulation"
          >
            {isOfflineMode ? (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-700" />
                <span>Offline ({offlineQueueCount} queued)</span>
              </>
            ) : (
              <>
                <Wifi className="w-3.5 h-3.5 text-[#245C43]" />
                <span>MQTT Online</span>
              </>
            )}
          </button>

          {isOfflineMode && offlineQueueCount > 0 && (
            <button
              type="button"
              onClick={syncOfflineQueue}
              className="flex items-center gap-1 text-xs text-[#245C43] hover:underline font-bold"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Flush</span>
            </button>
          )}

          <div className="hidden md:flex items-center gap-1.5 text-[#4A524D] font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-[#245C43]" />
            <span>Raft-BFT (4 Nodes)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

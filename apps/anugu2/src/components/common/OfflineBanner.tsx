import React, { useEffect, useState } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

export const OfflineBanner: React.FC = () => {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnected(true);
      const timer = setTimeout(() => setShowReconnected(false), 4000);
      return () => clearTimeout(timer);
    };
    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOnline) {
    return (
      <div role="status" className="bg-amber-600 text-white px-4 py-2 text-xs font-semibold flex items-center justify-center gap-2 shadow-sm sticky top-0 z-50">
        <WifiOff className="w-4 h-4 animate-pulse" />
        <span>Offline Mode Active — Field Survey cache and local storage are maintaining full operational capability.</span>
      </div>
    );
  }

  if (showReconnected) {
    return (
      <div role="status" className="bg-[#245C43] text-white px-4 py-2 text-xs font-semibold flex items-center justify-center gap-2 shadow-sm sticky top-0 z-50">
        <Wifi className="w-4 h-4" />
        <span>Network reconnected — Syncing queued field transactions to consensus nodes.</span>
      </div>
    );
  }

  return null;
};

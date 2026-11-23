import React, { useState } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { Download } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        onClick={() => void install()}
        className="inline-flex items-center gap-1.5 rounded-lg bg-[#245C43] hover:bg-[#1B4733] px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition-colors"
        title="Install ANAGU App for Offline Field Surveys"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Install App</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#CBD0C8] px-3 py-1.5 text-xs font-semibold text-[#252B28] hover:bg-[#F7F8F7] transition-colors"
        >
          <Download className="w-3.5 h-3.5 text-[#245C43]" />
          <span>Install on iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl space-y-4 text-xs text-[#252B28]">
              <h3 className="text-sm font-bold text-[#252B28]">Install ANAGU on iPhone / iPad</h3>
              <p className="text-[#4A524D] leading-relaxed">
                1. Tap the <strong>Share</strong> button in Safari toolbar.<br />
                2. Scroll down and tap <strong>Add to Home Screen</strong> to enable offline field surveys.
              </p>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full rounded-lg bg-[#245C43] py-2 text-xs font-semibold text-white hover:bg-[#1B4733] transition-colors"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};

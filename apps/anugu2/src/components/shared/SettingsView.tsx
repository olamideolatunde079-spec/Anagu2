import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Settings, Shield, Key, Bell, Smartphone } from 'lucide-react';
import { BackButton } from '../common/BackButton';

export const SettingsView: React.FC = () => {
  const { addNotification } = useApp();
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(false);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <BackButton to="/portal/dashboard" label="Back to Dashboard" />
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#252B28] flex items-center gap-2">
          <Settings className="w-6 h-6 text-[#245C43]" />
          Account & Cadastre Security Settings
        </h1>
        <p className="text-xs text-[#4A524D] mt-1">
          Cryptographic security keys, multi-factor authorization, and alert preferences.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-[#E5E8E5] p-6 shadow-sm space-y-6">
        {/* Security Section */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-[#252B28] flex items-center gap-2 pb-3 border-b border-[#E5E8E5]">
            <Shield className="w-4 h-4 text-[#245C43]" />
            Cryptographic Authentication
          </h2>

          <div className="flex items-center justify-between p-4 rounded-lg bg-[#F7F8F7] border border-[#E5E8E5] text-xs">
            <div>
              <div className="font-semibold text-[#252B28] flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-[#245C43]" />
                Two-Factor Authentication (2FA TOTP)
              </div>
              <p className="text-[#4A524D] mt-0.5">
                Required when lodging land applications, signing neighbor attestations, or executing conveyances.
              </p>
            </div>
            <button
              onClick={() => setTwoFactorEnabled(!twoFactorEnabled)}
              className={`px-3 py-1.5 rounded-md font-semibold text-xs transition-colors ${
                twoFactorEnabled
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-white border border-[#CBD0C8] text-[#4A524D]'
              }`}
            >
              {twoFactorEnabled ? 'Enabled' : 'Disabled'}
            </button>
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg bg-[#F7F8F7] border border-[#E5E8E5] text-xs">
            <div>
              <div className="font-semibold text-[#252B28] flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-700" />
                Hardware Security Key (FIDO2 / WebAuthn)
              </div>
              <p className="text-[#4A524D] mt-0.5">
                YubiKey or biometric TouchID hardware token registered for high-value title operations.
              </p>
            </div>
            <button
              onClick={() =>
                addNotification({
                  title: 'Hardware Token Pairing',
                  message: 'FIDO2 / WebAuthn biometric security key successfully paired.',
                  type: 'success'
                })
              }
              className="px-3.5 py-1.5 rounded-md bg-[#245C43] text-white hover:bg-[#1B4733] font-semibold text-xs transition-colors shadow-sm"
            >
              Configure Key
            </button>
          </div>
        </div>

        {/* Notifications Section */}
        <div className="space-y-4 pt-4 border-t border-[#E5E8E5]">
          <h2 className="text-sm font-bold text-[#252B28] flex items-center gap-2 pb-3 border-b border-[#E5E8E5]">
            <Bell className="w-4 h-4 text-[#245C43]" />
            Cadastral Notification Preferences
          </h2>

          <div className="space-y-3 text-xs">
            <label className="flex items-center justify-between p-3.5 rounded-lg bg-[#F7F8F7] border border-[#E5E8E5] cursor-pointer">
              <span className="text-[#252B28] font-medium">Email notifications on title state transitions and official approvals</span>
              <input
                type="checkbox"
                checked={emailAlerts}
                onChange={e => setEmailAlerts(e.target.checked)}
                className="accent-[#245C43] w-4 h-4 rounded"
              />
            </label>

            <label className="flex items-center justify-between p-3.5 rounded-lg bg-[#F7F8F7] border border-[#E5E8E5] cursor-pointer">
              <span className="text-[#252B28] font-medium">SMS alerts for neighbor boundary attestation window opening</span>
              <input
                type="checkbox"
                checked={smsAlerts}
                onChange={e => setSmsAlerts(e.target.checked)}
                className="accent-[#245C43] w-4 h-4 rounded"
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

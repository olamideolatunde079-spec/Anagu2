import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Bell, CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export const NotificationDrawer: React.FC = () => {
  const { notifications, markNotificationRead } = useApp();
  const [isOpen, setIsOpen] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 min-w-[40px] min-h-[40px] rounded-xl bg-white border border-[#CBD0C8] text-[#252B28] hover:text-[#245C43] hover:border-[#245C43] transition-colors shadow-xs flex items-center justify-center"
        title="View system and cadastral notifications"
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#245C43] text-white text-xs font-bold flex items-center justify-center shadow-xs">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-[#CBD0C8] rounded-2xl shadow-lg p-3.5 z-50">
            <div className="flex items-center justify-between pb-2.5 border-b border-[#E5E8E5] mb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-[#252B28]">Cadastral &amp; Ledger Alerts</span>
                {unreadCount > 0 && (
                  <span className="text-xs font-mono text-[#245C43] font-bold">({unreadCount} new)</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-[#4A524D] hover:text-[#252B28] p-1.5 rounded-lg hover:bg-[#F7F8F7]"
                aria-label="Close notifications"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
              {notifications.length === 0 ? (
                <div className="py-8 text-center text-sm text-[#4A524D]">
                  No notifications recorded.
                </div>
              ) : (
                notifications.map(notif => (
                  <div
                    key={notif.id}
                    onClick={() => markNotificationRead(notif.id)}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-colors ${
                      notif.read
                        ? 'bg-[#F7F8F7] border-[#E5E8E5] text-[#4A524D]'
                        : 'bg-white border-[#245C43]/40 text-[#252B28] hover:border-[#245C43]'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      {notif.type === 'success' && <CheckCircle2 className="w-4 h-4 text-[#245C43] mt-0.5 shrink-0" />}
                      {notif.type === 'warning' && <AlertCircle className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />}
                      {notif.type === 'info' && <Info className="w-4 h-4 text-[#245C43] mt-0.5 shrink-0" />}
                      {notif.type === 'error' && <AlertCircle className="w-4 h-4 text-red-700 mt-0.5 shrink-0" />}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-[#252B28] truncate">{notif.title}</span>
                          <span className="text-xs text-[#545B56] font-mono shrink-0">{notif.timestamp}</span>
                        </div>
                        <p className="text-xs text-[#4A524D] mt-1 leading-relaxed">{notif.message}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

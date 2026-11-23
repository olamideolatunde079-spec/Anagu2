"use client";
/**
 * Toast & ToastProvider — notification toasts for ANAGU.
 * Usage: const { toast } = useToast(); toast.success("Saved!");
 */
import {
  createContext, useCallback, useContext, useRef, useState
} from "react";
import { X, CheckCircle2, AlertTriangle, XCircle, Info } from "lucide-react";
import { clsx } from "clsx";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id:      string;
  type:    ToastType;
  title:   string;
  message?: string;
}

interface ToastContextValue {
  toasts: ToastItem[];
  addToast: (item: Omit<ToastItem, "id">) => void;
  removeToast: (id: string) => void;
  success: (title: string, message?: string) => void;
  error:   (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info:    (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const ICON_MAP: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2  size={18} className="text-[#13C98A]" />,
  error:   <XCircle       size={18} className="text-[#EF4444]" />,
  warning: <AlertTriangle size={18} className="text-[#F0B429]" />,
  info:    <Info          size={18} className="text-[#168BFF]" />,
};

const BORDER_MAP: Record<ToastType, string> = {
  success: "border-l-[#13C98A]",
  error:   "border-l-[#EF4444]",
  warning: "border-l-[#F0B429]",
  info:    "border-l-[#168BFF]",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timerMap = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timerMap.current.get(id);
    if (timer) { clearTimeout(timer); timerMap.current.delete(id); }
  }, []);

  const addToast = useCallback((item: Omit<ToastItem, "id">) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { ...item, id }]);
    timerMap.current.set(id, setTimeout(() => removeToast(id), 5000));
  }, [removeToast]);

  const success = useCallback((title: string, message?: string) => addToast({ type: "success", title, message }), [addToast]);
  const error   = useCallback((title: string, message?: string) => addToast({ type: "error",   title, message }), [addToast]);
  const warning = useCallback((title: string, message?: string) => addToast({ type: "warning", title, message }), [addToast]);
  const info    = useCallback((title: string, message?: string) => addToast({ type: "info",    title, message }), [addToast]);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, warning, info }}>
      {children}
      {/* Toast container */}
      <div
        aria-live="assertive"
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)]"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={clsx(
              "flex items-start gap-3 rounded-xl border border-[#29345A] border-l-4 bg-[#171A3B] p-4 shadow-card animate-slide-up",
              BORDER_MAP[toast.type]
            )}
            role="alert"
          >
            <span className="mt-0.5 shrink-0">{ICON_MAP[toast.type]}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">{toast.title}</p>
              {toast.message && (
                <p className="mt-0.5 text-xs text-[#AAB4CC]">{toast.message}</p>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="shrink-0 text-[#AAB4CC] hover:text-white transition-colors"
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

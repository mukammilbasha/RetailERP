"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
  id: number;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastContextValue {
  showToast: (type: ToastType, title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let toastId = 0;

const icons: Record<ToastType, string> = {
  success: "\u2713",
  error: "\u2717",
  info: "\u2139",
  warning: "\u26A0",
};

const bgColors: Record<ToastType, string> = {
  success: "bg-green-50 border-green-200 dark:bg-green-950/40 dark:border-green-800",
  error: "bg-red-50 border-red-200 dark:bg-red-950/40 dark:border-red-800",
  info: "bg-blue-50 border-blue-200 dark:bg-blue-950/40 dark:border-blue-800",
  warning: "bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800",
};

const iconColors: Record<ToastType, string> = {
  success: "bg-green-500 text-white",
  error: "bg-red-500 text-white",
  info: "bg-blue-500 text-white",
  warning: "bg-amber-500 text-white",
};

const titleColors: Record<ToastType, string> = {
  success: "text-green-800 dark:text-green-200",
  error: "text-red-800 dark:text-red-200",
  info: "text-blue-800 dark:text-blue-200",
  warning: "text-amber-800 dark:text-amber-200",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((type: ToastType, title: string, message?: string) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Toast container - top right */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none max-w-sm w-full">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg animate-in slide-in-from-right-5 fade-in duration-300 ${bgColors[toast.type]}`}
            role="alert"
          >
            <span
              className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${iconColors[toast.type]}`}
            >
              {icons[toast.type]}
            </span>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold ${titleColors[toast.type]}`}>{toast.title}</p>
              {toast.message && (
                <p className="text-xs text-muted-foreground mt-0.5">{toast.message}</p>
              )}
            </div>
            <button
              onClick={() => dismiss(toast.id)}
              className="flex-shrink-0 text-muted-foreground/60 hover:text-muted-foreground text-lg leading-none p-0.5"
            >
              &times;
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "default";
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function ConfirmDialogProvider({ children }: { children: React.ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [resolver, setResolver] = useState<((value: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setOptions(opts);
      setResolver(() => resolve);
    });
  }, []);

  const handleConfirm = () => {
    resolver?.(true);
    setOptions(null);
    setResolver(null);
  };

  const handleCancel = () => {
    resolver?.(false);
    setOptions(null);
    setResolver(null);
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}

      {options && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleCancel} />

          {/* Dialog */}
          <div className="relative bg-background rounded-xl border shadow-2xl p-6 max-w-sm w-full mx-4 animate-in fade-in zoom-in-95 duration-200">
            {/* Icon */}
            <div className="flex justify-center mb-4">
              <div
                className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl ${
                  options.variant === "danger"
                    ? "bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400"
                    : "bg-blue-100 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400"
                }`}
              >
                {options.variant === "danger" ? "\u26A0" : "\u2753"}
              </div>
            </div>

            <h3 className="text-lg font-semibold text-center mb-2">{options.title}</h3>
            <p className="text-sm text-muted-foreground text-center mb-6">{options.message}</p>

            <div className="flex gap-3">
              <button
                onClick={handleCancel}
                className="flex-1 px-4 py-2.5 text-sm border rounded-lg hover:bg-muted font-medium"
              >
                {options.cancelLabel || "Cancel"}
              </button>
              <button
                onClick={handleConfirm}
                className={`flex-1 px-4 py-2.5 text-sm rounded-lg font-medium text-white ${
                  options.variant === "danger"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-primary hover:bg-primary/90"
                }`}
              >
                {options.confirmLabel || "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within <ConfirmDialogProvider>");
  return ctx;
}

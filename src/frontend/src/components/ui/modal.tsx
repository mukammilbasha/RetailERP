"use client";

import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}

export function Modal({ isOpen, onClose, title, subtitle, children, size = "md" }: ModalProps) {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: "sm:max-w-sm",
    md: "sm:max-w-lg",
    lg: "sm:max-w-2xl",
    xl: "sm:max-w-4xl",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className={[
          "relative bg-card shadow-xl w-full flex flex-col",
          // Mobile: full screen, no rounded corners
          "h-full max-h-full rounded-none",
          // Tablet (sm): 90% width, auto height, rounded corners
          "sm:h-auto sm:max-h-[90vh] sm:w-[90%] sm:rounded-2xl sm:mx-4",
          // Desktop (lg): centered with max-width based on size
          `lg:w-full ${sizeClasses[size]} lg:mx-4`,
        ].join(" ")}
      >
        {/* Header: sticky on mobile for scrollable content */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-4 sm:p-6 pb-3 sm:pb-4 bg-card rounded-t-none sm:rounded-t-2xl border-b sm:border-b-0 shrink-0">
          <div className="min-w-0 flex-1">
            <h2 className="text-base sm:text-lg font-semibold truncate">{title}</h2>
            {subtitle && <p className="text-xs sm:text-sm text-muted-foreground truncate">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors shrink-0 ml-3">
            <X size={18} />
          </button>
        </div>

        {/* Body: scrollable */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-4 sm:pb-6">
          {children}
        </div>
      </div>
    </div>
  );
}

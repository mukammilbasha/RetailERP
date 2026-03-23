"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/* --------------------------------------------------------------------------
   Constants
   -------------------------------------------------------------------------- */

const DISMISS_KEY = "retailerp-pwa-install-dismissed";
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/* --------------------------------------------------------------------------
   Types
   -------------------------------------------------------------------------- */

/**
 * The `beforeinstallprompt` event is not yet in the standard TS DOM types.
 * We declare a minimal interface for it here.
 */
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt(): Promise<void>;
}

/* --------------------------------------------------------------------------
   Hook: usePwaInstall
   -------------------------------------------------------------------------- */

function usePwaInstall() {
  const [canInstall, setCanInstall] = useState(false);
  const [isDismissed, setIsDismissed] = useState(true); // Start hidden
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);

  // Check localStorage for a previous dismissal
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DISMISS_KEY);
      if (raw) {
        const dismissedAt = Number(raw);
        if (Date.now() - dismissedAt < DISMISS_DURATION_MS) {
          setIsDismissed(true);
          return;
        }
        // Dismissal expired -- clear it
        localStorage.removeItem(DISMISS_KEY);
      }
      setIsDismissed(false);
    } catch {
      // localStorage unavailable -- show the banner anyway
      setIsDismissed(false);
    }
  }, []);

  // Listen for the `beforeinstallprompt` event
  useEffect(() => {
    const handler = (e: Event) => {
      // Prevent the default mini-infobar in Chrome
      e.preventDefault();
      deferredPromptRef.current = e as BeforeInstallPromptEvent;
      setCanInstall(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // If the app is already installed, hide the prompt
    const installedHandler = () => {
      setCanInstall(false);
      deferredPromptRef.current = null;
    };
    window.addEventListener("appinstalled", installedHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  const install = useCallback(async () => {
    const prompt = deferredPromptRef.current;
    if (!prompt) return;

    await prompt.prompt();
    const choice = await prompt.userChoice;

    if (choice.outcome === "accepted") {
      setCanInstall(false);
    }

    deferredPromptRef.current = null;
  }, []);

  const dismiss = useCallback(() => {
    setIsDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // Silently fail if localStorage is unavailable
    }
  }, []);

  return {
    showPrompt: canInstall && !isDismissed,
    install,
    dismiss,
  };
}

/* --------------------------------------------------------------------------
   Component: InstallPrompt
   -------------------------------------------------------------------------- */

export function InstallPrompt() {
  const { showPrompt, install, dismiss } = usePwaInstall();
  const [isVisible, setIsVisible] = useState(false);

  // Delay entrance to avoid flash during initial page load
  useEffect(() => {
    if (!showPrompt) {
      setIsVisible(false);
      return;
    }

    const timer = setTimeout(() => setIsVisible(true), 2000);
    return () => clearTimeout(timer);
  }, [showPrompt]);

  // Animate out before unmounting
  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    // Wait for the slide-out animation to complete before actually dismissing
    setTimeout(dismiss, 300);
  }, [dismiss]);

  const handleInstall = useCallback(async () => {
    await install();
    setIsVisible(false);
  }, [install]);

  if (!showPrompt && !isVisible) {
    return null;
  }

  return (
    <div
      role="complementary"
      aria-label="Install application"
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50",
        "transition-all duration-300 ease-in-out",
        isVisible
          ? "translate-y-0 opacity-100"
          : "translate-y-full opacity-0"
      )}
    >
      {/* Backdrop blur strip */}
      <div
        className={cn(
          "mx-auto max-w-screen-xl px-4 pb-4 md:px-6 md:pb-6"
        )}
      >
        <div
          className={cn(
            "flex items-center justify-between gap-4",
            "rounded-xl border border-[hsl(var(--sidebar-border))]",
            "bg-[hsl(var(--sidebar))]/95 backdrop-blur-md",
            "px-4 py-3 md:px-6 md:py-4",
            "shadow-lg"
          )}
        >
          {/* Icon + Text */}
          <div className="flex items-center gap-3 min-w-0">
            {/* Small EC logo */}
            <div
              className={cn(
                "hidden sm:flex items-center justify-center",
                "h-10 w-10 shrink-0 rounded-lg",
                "bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600",
                "shadow-md shadow-orange-500/20"
              )}
            >
              <span className="text-sm font-extrabold text-white leading-none tracking-tight">
                EC
              </span>
            </div>

            <div className="min-w-0">
              <p className="text-sm font-semibold text-[hsl(var(--sidebar-foreground))] truncate">
                Install RetailERP
              </p>
              <p className="text-xs text-[hsl(var(--sidebar-foreground))]/60 truncate hidden sm:block">
                Add to your home screen for quick access and offline support
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleDismiss}
              className={cn(
                "px-3 py-1.5 text-sm font-medium rounded-lg",
                "text-[hsl(var(--sidebar-foreground))]/60",
                "hover:text-[hsl(var(--sidebar-foreground))]/90",
                "hover:bg-white/5",
                "transition-colors duration-150",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--sidebar))]"
              )}
              aria-label="Dismiss install prompt"
            >
              Not now
            </button>

            <button
              onClick={handleInstall}
              className={cn(
                "px-4 py-1.5 text-sm font-semibold rounded-lg",
                "bg-gradient-to-r from-orange-500 to-orange-600",
                "text-white",
                "hover:from-orange-400 hover:to-orange-500",
                "active:from-orange-600 active:to-orange-700",
                "shadow-md shadow-orange-500/25",
                "transition-all duration-150",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--sidebar))]"
              )}
            >
              Install
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

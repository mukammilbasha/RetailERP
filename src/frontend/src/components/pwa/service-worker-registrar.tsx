"use client";

import { useEffect } from "react";

/**
 * Registers the service worker for PWA support.
 * Rendered as a client component in the root layout.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        // Service worker registration failed — non-critical, do not block the app
        console.warn("SW registration failed:", err);
      });
    }
  }, []);

  return null;
}

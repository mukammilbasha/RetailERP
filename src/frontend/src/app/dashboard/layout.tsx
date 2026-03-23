"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { useThemeStore } from "@/store/theme-store";
import {
  Sidebar,
  SidebarProvider,
  useSidebar,
} from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { LicenseBanner } from "@/components/layout/license-banner";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { cn } from "@/lib/utils";

/* =============================================================
   Loading Skeleton — shown during auth check
   ============================================================= */

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar skeleton */}
      <div className="hidden md:flex flex-col w-[260px] bg-[hsl(var(--sidebar))] border-r border-[hsl(var(--sidebar-border))]">
        {/* Logo area */}
        <div className="px-5 py-4 h-[64px] border-b border-[hsl(var(--sidebar-border))] flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-white/10 animate-pulse" />
          <div className="space-y-1.5">
            <div className="h-3 w-16 rounded bg-white/10 animate-pulse" />
            <div className="h-2 w-24 rounded bg-white/5 animate-pulse" />
          </div>
        </div>
        {/* Nav skeleton */}
        <div className="flex-1 px-3 py-4 space-y-2">
          {[80, 68, 95, 72, 85, 64, 90, 76].map((w, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-3 py-2.5"
              style={{ opacity: 1 - i * 0.08 }}
            >
              <div className="w-5 h-5 rounded bg-white/10 animate-pulse" />
              <div
                className="h-3 rounded bg-white/10 animate-pulse"
                style={{ width: `${w}px` }}
              />
            </div>
          ))}
        </div>
        {/* Footer skeleton */}
        <div className="p-3 border-t border-[hsl(var(--sidebar-border))]">
          <div className="flex items-center gap-3 px-3 py-2.5">
            <div className="w-8 h-8 rounded-full bg-white/10 animate-pulse" />
            <div className="space-y-1.5">
              <div className="h-3 w-20 rounded bg-white/10 animate-pulse" />
              <div className="h-2 w-14 rounded bg-white/5 animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      {/* Main area skeleton */}
      <div className="flex-1 flex flex-col">
        {/* Header skeleton */}
        <div className="h-14 border-b border-border bg-card/80 flex items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="h-3 w-20 rounded bg-muted animate-pulse" />
            <div className="h-3 w-2 rounded bg-muted/50 animate-pulse" />
            <div className="h-3 w-16 rounded bg-muted animate-pulse" />
          </div>
          <div className="flex items-center gap-3">
            <div className="h-8 w-48 rounded-lg bg-muted animate-pulse" />
            <div className="w-8 h-8 rounded-lg bg-muted animate-pulse" />
            <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
          </div>
        </div>

        {/* Content skeleton */}
        <div className="flex-1 p-6">
          <div className="space-y-6">
            {/* Title row */}
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-6 w-48 rounded bg-muted animate-pulse" />
                <div className="h-3 w-72 rounded bg-muted/60 animate-pulse" />
              </div>
              <div className="h-9 w-32 rounded-lg bg-muted animate-pulse" />
            </div>

            {/* Cards row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-28 rounded-xl border border-border bg-card animate-pulse"
                />
              ))}
            </div>

            {/* Table skeleton */}
            <div className="rounded-xl border border-border bg-card">
              <div className="h-12 border-b border-border px-4 flex items-center gap-4">
                <div className="h-3 w-24 rounded bg-muted animate-pulse" />
                <div className="h-3 w-20 rounded bg-muted animate-pulse" />
                <div className="h-3 w-28 rounded bg-muted animate-pulse" />
              </div>
              {[[160, 110], [130, 95], [145, 115], [175, 85], [120, 130]].map(([w1, w2], i) => (
                <div
                  key={i}
                  className="h-12 border-b border-border/50 px-4 flex items-center gap-4"
                >
                  <div className="h-3 w-8 rounded bg-muted/60 animate-pulse" />
                  <div
                    className="h-3 rounded bg-muted/60 animate-pulse"
                    style={{ width: `${w1}px` }}
                  />
                  <div
                    className="h-3 rounded bg-muted/60 animate-pulse"
                    style={{ width: `${w2}px` }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =============================================================
   Inner Layout — uses SidebarContext
   ============================================================= */

function DashboardInner({ children }: { children: React.ReactNode }) {
  const { isCollapsed } = useSidebar();

  return (
    <div className="h-screen overflow-hidden bg-background flex">
      {/* Sidebar */}
      <Sidebar />

      {/* Main column — fills remaining width, clips overflow */}
      <div
        className={cn(
          "flex-1 flex flex-col min-w-0 h-screen overflow-hidden",
          "transition-[margin-left] duration-300 ease-in-out",
          "md:ml-0"
        )}
      >
        {/* Header — always visible at top, no page scroll */}
        <Header />

        {/* License validity banner — shown on every page */}
        <LicenseBanner />

        {/* Scrollable content area */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6">
          <div className="animate-fadeIn">{children}</div>
        </main>
      </div>

      {/* PWA install prompt */}
      <InstallPrompt />
    </div>
  );
}

/* =============================================================
   Dashboard Layout (exported)
   ============================================================= */

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { checkAuth, isAuthenticated, isLoading } = useAuthStore();
  const { initTheme } = useThemeStore();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  // Initialize theme on mount
  useEffect(() => {
    initTheme();
    setMounted(true);
  }, [initTheme]);

  // Check authentication
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  // Show loading skeleton during auth check or before mount
  if (isLoading || !mounted) {
    return <LoadingSkeleton />;
  }

  // Don't render content if not authenticated (redirecting)
  if (!isAuthenticated) {
    return <LoadingSkeleton />;
  }

  return (
    <SidebarProvider>
      <DashboardInner>{children}</DashboardInner>
    </SidebarProvider>
  );
}

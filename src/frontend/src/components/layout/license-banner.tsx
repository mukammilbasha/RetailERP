"use client";

import { useEffect } from "react";
import { Shield, AlertTriangle, Clock } from "lucide-react";
import { useLicenseStore } from "@/store/license-store";
import { useAuthStore } from "@/store/auth-store";
import { cn } from "@/lib/utils";
import Link from "next/link";

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export function LicenseBanner() {
  const { daysRemaining, validUntil, plan, status, isLoaded, fetchLicense } =
    useLicenseStore();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated && !isLoaded) {
      fetchLicense();
    }
  }, [isAuthenticated, isLoaded, fetchLicense]);

  if (!isLoaded || daysRemaining === null) return null;

  const isExpired = status === "Expired" || daysRemaining === 0;
  const isCritical = daysRemaining <= 14 && !isExpired;
  const isWarning = daysRemaining > 14 && daysRemaining <= 30 && !isExpired;
  const isHealthy = !isExpired && !isCritical && !isWarning;

  return (
    <div
      className={cn(
        "shrink-0 flex items-center justify-between gap-4",
        "px-4 md:px-6 py-1.5 text-xs font-medium border-b",
        isExpired
          ? "bg-red-600 text-white border-red-700"
          : isCritical
          ? "bg-orange-500 text-white border-orange-600"
          : isWarning
          ? "bg-yellow-400 text-yellow-900 border-yellow-500"
          : "bg-green-500/10 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900"
      )}
    >
      {/* Left: icon + message */}
      <div className="flex items-center gap-2 min-w-0">
        {isExpired || isCritical ? (
          <AlertTriangle size={13} className="shrink-0" />
        ) : isWarning ? (
          <Clock size={13} className="shrink-0" />
        ) : (
          <Shield size={13} className="shrink-0" />
        )}
        <span className="truncate">
          {isExpired ? (
            <>License Expired — Application access restricted. Contact your administrator.</>
          ) : (
            <>
              <span className="font-semibold">{plan || "RetailERP"} License</span>
              {" · "}
              Valid until{" "}
              <span className={cn("font-semibold", isCritical && "underline")}>
                {formatDate(validUntil)}
              </span>
              {" · "}
              <span
                className={cn(
                  "font-semibold",
                  isCritical
                    ? "text-white"
                    : isWarning
                    ? "text-yellow-900"
                    : "text-green-700 dark:text-green-400"
                )}
              >
                {daysRemaining} {daysRemaining === 1 ? "day" : "days"} remaining
              </span>
            </>
          )}
        </span>
      </div>

      {/* Right: action */}
      {(isExpired || isCritical || isWarning) && (
        <Link
          href="/dashboard/admin/license"
          className={cn(
            "shrink-0 whitespace-nowrap underline underline-offset-2 hover:no-underline transition-opacity",
            "opacity-90 hover:opacity-100"
          )}
        >
          {isExpired ? "Renew License" : "Manage License"}
        </Link>
      )}

      {isHealthy && (
        <span
          className={cn(
            "shrink-0 whitespace-nowrap font-semibold",
            "text-green-600 dark:text-green-400"
          )}
        >
          Active
        </span>
      )}
    </div>
  );
}

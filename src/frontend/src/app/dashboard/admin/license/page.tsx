"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import api, { type ApiResponse } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import { useLicenseStore } from "@/store/license-store";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Key,
  Shield,
  Check,
  Copy,
  Users,
  Calendar,
  Package,
  Eye,
  EyeOff,
  AlertCircle,
  Lock,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ================================================================
   Types
   ================================================================ */

interface LicenseInfo {
  licenseKey: string;
  plan: string;
  status: string;
  validFrom: string;
  validUntil: string;
  usersAllowed: number;
  usersActive: number;
  modulesEnabled: string[];
}

interface ActivationRecord {
  date: string;
  licenseKey: string;
  plan: string;
  status: string;
  activatedBy: string;
  expires: string;
}

const ALL_MODULES = [
  "Inventory Management",
  "Point of Sale",
  "Order Management",
  "Billing & Invoicing",
  "Customer Management",
  "Supplier Management",
  "Reports & Analytics",
  "Multi-Warehouse",
];

const PLANS: { name: string; description: string; color: string }[] = [
  { name: "Starter",      description: "Up to 5 users",          color: "border-slate-300 bg-slate-50 dark:bg-slate-900/40" },
  { name: "Professional", description: "Up to 25 users",         color: "border-blue-300 bg-blue-50 dark:bg-blue-900/20" },
  { name: "Enterprise",   description: "Unlimited users",        color: "border-purple-300 bg-purple-50 dark:bg-purple-900/20" },
];

const DURATIONS = [
  { label: "1 Month",  value: 1  },
  { label: "3 Months", value: 3  },
  { label: "6 Months", value: 6  },
  { label: "1 Year",   value: 12 },
];

const USER_LIMITS = [
  { label: "5 Users",    value: 5  },
  { label: "10 Users",   value: 10 },
  { label: "25 Users",   value: 25 },
  { label: "50 Users",   value: 50 },
  { label: "Unlimited",  value: 0  },
];

const SUPER_ADMIN_ROLES = ["superadmin", "super_admin", "admin"];

function isSuperAdmin(role?: string) {
  if (!role) return false;
  return SUPER_ADMIN_ROLES.includes(role.toLowerCase());
}

/* ================================================================
   License Key Generator
   ================================================================ */

function generateLicenseKey(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from({ length: 5 }, () =>
    Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join("")
  ).join("-");
}

function maskLicenseKey(key: string): string {
  if (!key) return "";
  const parts = key.split("-");
  return parts.map(() => "XXXXX").join("-");
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "---";
  try {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

/* ================================================================
   Component
   ================================================================ */

export default function LicenseManagementPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { fetchLicense: refreshBannerLicense } = useLicenseStore();

  const [license, setLicense]               = useState<LicenseInfo | null>(null);
  const [history, setHistory]               = useState<ActivationRecord[]>([]);
  const [loading, setLoading]               = useState(true);
  const [keyVisible, setKeyVisible]         = useState(false);
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [copiedKey, setCopiedKey]           = useState(false);

  // Generate form state
  const [genPlan, setGenPlan]               = useState("Professional");
  const [genDuration, setGenDuration]       = useState(12);
  const [genMaxUsers, setGenMaxUsers]       = useState(25);
  const [genModules, setGenModules]         = useState<string[]>([...ALL_MODULES]);
  const [generatedKey, setGeneratedKey]     = useState("");
  const [saving, setSaving]                 = useState(false);
  const [saveError, setSaveError]           = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess]       = useState(false);

  /* ── Role guard: redirect non-super-admins ── */
  useEffect(() => {
    if (user && !isSuperAdmin(user.role)) {
      router.replace("/dashboard");
    }
  }, [user, router]);

  /* ── Fetch license data ── */
  const fetchLicense = useCallback(async () => {
    setLoading(true);
    try {
      const [licenseRes, historyRes] = await Promise.all([
        api.get<ApiResponse<LicenseInfo>>("/api/auth/tenant/license"),
        api.get<ApiResponse<ActivationRecord[]>>("/api/auth/tenant/license/history"),
      ]);
      if (licenseRes.data.success && licenseRes.data.data) {
        const d = licenseRes.data.data as any;
        setLicense({
          licenseKey: d.licenseKey ?? d.key ?? "---",
          plan: d.plan ?? d.planName ?? "Enterprise",
          status: d.status ?? "Active",
          validFrom: d.validFrom ?? d.startDate ?? "",
          validUntil: d.validUntil ?? d.expiryDate ?? d.endDate ?? "",
          usersAllowed: d.usersAllowed ?? d.maxUsers ?? d.userLimit ?? 0,
          usersActive: d.usersActive ?? d.activeUsers ?? d.currentUsers ?? 0,
          modulesEnabled: d.modulesEnabled ?? d.modules ?? ALL_MODULES,
        });
      }
      if (historyRes.data.success && historyRes.data.data) setHistory(historyRes.data.data);
    } catch {
      // silently handle — fallback to empty
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLicense(); }, [fetchLicense]);

  /* ── Days remaining ── */
  const getDaysRemaining = (): number => {
    if (!license?.validUntil) return 0;
    return Math.max(0, Math.ceil(
      (new Date(license.validUntil).getTime() - Date.now()) / 86400000
    ));
  };
  const getTotalDays = (): number => {
    if (!license?.validFrom || !license?.validUntil) return 365;
    return Math.max(1, Math.ceil(
      (new Date(license.validUntil).getTime() - new Date(license.validFrom).getTime()) / 86400000
    ));
  };

  const daysRemaining = getDaysRemaining();
  const totalDays = getTotalDays();
  const progressPct = Math.max(0, Math.min(100, ((totalDays - daysRemaining) / totalDays) * 100));

  /* ── Generate key ── */
  const handleGenerateKey = () => {
    setGeneratedKey(generateLicenseKey());
    setSaveError(null);
    setSaveSuccess(false);
  };

  /* ── Activate & save to DB ── */
  const handleActivateLicense = async () => {
    if (!generatedKey) return;
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      const validFrom = new Date();
      const validUntil = new Date();
      validUntil.setMonth(validUntil.getMonth() + genDuration);

      await api.post("/api/auth/tenant/license/activate", {
        licenseKey:     generatedKey,
        plan:           genPlan,
        durationMonths: genDuration,
        maxUsers:       genMaxUsers,
        modules:        genModules,
        validFrom:      validFrom.toISOString(),
        validUntil:     validUntil.toISOString(),
      });

      setSaveSuccess(true);
      // Refresh the license display & banner
      await fetchLicense();
      // Invalidate banner store so it re-fetches
      useLicenseStore.setState({ isLoaded: false });
      await refreshBannerLicense();

      setTimeout(() => {
        setGenerateModalOpen(false);
        resetGenerateForm();
      }, 1800);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setSaveError(e.response?.data?.message || "Failed to activate license. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleCopyKey = async (key: string) => {
    try {
      await navigator.clipboard.writeText(key);
    } catch {
      const input = document.createElement("input");
      input.value = key;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
    }
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const toggleModule = (mod: string) => {
    setGenModules((prev) =>
      prev.includes(mod) ? prev.filter((m) => m !== mod) : [...prev, mod]
    );
  };

  const resetGenerateForm = () => {
    setGenPlan("Professional");
    setGenDuration(12);
    setGenMaxUsers(25);
    setGenModules([...ALL_MODULES]);
    setGeneratedKey("");
    setCopiedKey(false);
    setSaveError(null);
    setSaveSuccess(false);
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "Active":  return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
      case "Expired": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      case "Trial":   return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
      default:        return "bg-muted text-muted-foreground";
    }
  };

  /* ── Access denied (still rendering while redirect fires) ── */
  if (user && !isSuperAdmin(user.role)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
          <Lock size={28} className="text-destructive" />
        </div>
        <h2 className="text-lg font-semibold">Access Restricted</h2>
        <p className="text-sm text-muted-foreground text-center max-w-sm">
          License management is only accessible to Super Admin users.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-64" />
          <div className="h-4 bg-muted rounded w-96" />
          <div className="h-64 bg-muted rounded-2xl" />
          <div className="h-48 bg-muted rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">

      {/* ─── Page Header ─── */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
            <Key size={20} className="text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">License Management</h1>
            <p className="text-sm text-muted-foreground">
              Generate, activate and manage RetailERP licenses
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchLicense}
            className="p-2 rounded-lg border border-border hover:bg-muted transition-colors text-muted-foreground"
            title="Refresh"
          >
            <RefreshCw size={15} />
          </button>
          <button
            onClick={() => { resetGenerateForm(); setGenerateModalOpen(true); }}
            className="px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors flex items-center gap-2"
          >
            <Key size={15} />
            Generate New License
          </button>
        </div>
      </div>

      {/* ─── Current License Card ─── */}
      <div className="bg-card rounded-2xl border border-border shadow-sm mb-6">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-base font-semibold">Current License</h2>
          {license?.status && (
            <span className={cn("inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold", statusColor(license.status))}>
              {license.status}
            </span>
          )}
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* License key row */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">
              License Key
            </label>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-4 py-2.5 bg-muted/50 rounded-xl font-mono text-sm tracking-widest truncate">
                {keyVisible
                  ? (license?.licenseKey || "No active license")
                  : maskLicenseKey(license?.licenseKey || "")}
              </code>
              <button
                onClick={() => setKeyVisible(!keyVisible)}
                className="p-2.5 border border-input rounded-lg hover:bg-muted transition-colors shrink-0"
                title={keyVisible ? "Hide key" : "Reveal key"}
              >
                {keyVisible ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
              <button
                onClick={() => license?.licenseKey && handleCopyKey(license.licenseKey)}
                className="p-2.5 border border-input rounded-lg hover:bg-muted transition-colors shrink-0"
                title="Copy to clipboard"
              >
                {copiedKey
                  ? <Check size={15} className="text-green-500" />
                  : <Copy size={15} />}
              </button>
            </div>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <InfoCard icon={Package}  label="Plan"         value={license?.plan || "---"} />
            <InfoCard icon={Calendar} label="Valid Until"  value={license ? formatDate(license.validUntil) : "---"} />
            <InfoCard icon={Users}    label="Users"        value={license ? `${license.usersActive} / ${license.usersAllowed === 0 ? "∞" : license.usersAllowed}` : "---"} />
            <InfoCard icon={Shield}   label="Modules"      value={license ? `${license.modulesEnabled.length} / ${ALL_MODULES.length}` : "---"} />
          </div>

          {/* Days remaining bar */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">License Validity</span>
              <span className={cn(
                "text-sm font-semibold",
                daysRemaining <= 30 ? "text-red-500" : daysRemaining <= 90 ? "text-yellow-600" : "text-green-600"
              )}>
                {daysRemaining} {daysRemaining === 1 ? "day" : "days"} remaining
              </span>
            </div>
            <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  daysRemaining <= 30 ? "bg-red-500" : daysRemaining <= 90 ? "bg-yellow-500" : "bg-green-500"
                )}
                style={{ width: `${100 - progressPct}%` }}
              />
            </div>
            {license && (
              <p className="text-xs text-muted-foreground mt-1.5">
                {formatDate(license.validFrom)} → {formatDate(license.validUntil)}
              </p>
            )}
          </div>

          {/* Modules list */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
              Enabled Modules
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
              {ALL_MODULES.map((mod) => {
                const enabled = license?.modulesEnabled.includes(mod);
                return (
                  <div
                    key={mod}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg text-sm",
                      enabled
                        ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                        : "bg-muted/50 text-muted-foreground line-through"
                    )}
                  >
                    {enabled
                      ? <Check size={13} className="text-green-500 shrink-0" />
                      : <span className="w-3.5 h-3.5 border border-muted-foreground/30 rounded shrink-0" />}
                    <span className="truncate">{mod}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Activation History ─── */}
      <div className="bg-card rounded-2xl border border-border shadow-sm">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-base font-semibold">Activation History</h2>
          <p className="text-sm text-muted-foreground">Previous license activations and changes</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Date</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">License Key</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Plan</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Activated By</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Expires</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground text-sm">
                    No activation history found
                  </td>
                </tr>
              ) : (
                history.map((record, i) => (
                  <tr key={i} className="border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-3 whitespace-nowrap">{formatDate(record.date)}</td>
                    <td className="px-6 py-3 font-mono text-xs whitespace-nowrap">{maskLicenseKey(record.licenseKey)}</td>
                    <td className="px-6 py-3 whitespace-nowrap">{record.plan}</td>
                    <td className="px-6 py-3 whitespace-nowrap"><StatusBadge status={record.status} /></td>
                    <td className="px-6 py-3 whitespace-nowrap">{record.activatedBy}</td>
                    <td className="px-6 py-3 whitespace-nowrap">{formatDate(record.expires)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Generate & Activate Modal ─── */}
      <Modal
        isOpen={generateModalOpen}
        onClose={() => setGenerateModalOpen(false)}
        title="Generate & Activate License"
        subtitle="Create a new license key and activate it for this tenant"
        size="lg"
      >
        <div className="space-y-5">

          {/* Plan selection */}
          <div>
            <label className="block text-sm font-medium mb-2">Plan</label>
            <div className="grid grid-cols-3 gap-3">
              {PLANS.map((plan) => (
                <button
                  key={plan.name}
                  onClick={() => setGenPlan(plan.name)}
                  className={cn(
                    "px-4 py-3 border-2 rounded-xl text-left transition-all",
                    genPlan === plan.name
                      ? "border-primary bg-primary/10"
                      : cn("border-border hover:border-primary/40", plan.color)
                  )}
                >
                  <div className="text-sm font-semibold">{plan.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{plan.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium mb-2">Duration</label>
            <div className="grid grid-cols-4 gap-2">
              {DURATIONS.map((d) => (
                <button
                  key={d.value}
                  onClick={() => setGenDuration(d.value)}
                  className={cn(
                    "px-3 py-2 border rounded-lg text-sm font-medium transition-all",
                    genDuration === d.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-input hover:border-primary/50"
                  )}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Max Users */}
          <div>
            <label className="block text-sm font-medium mb-2">Max Users</label>
            <div className="grid grid-cols-5 gap-2">
              {USER_LIMITS.map((u) => (
                <button
                  key={u.value}
                  onClick={() => setGenMaxUsers(u.value)}
                  className={cn(
                    "px-3 py-2 border rounded-lg text-xs font-medium transition-all",
                    genMaxUsers === u.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-input hover:border-primary/50"
                  )}
                >
                  {u.label}
                </button>
              ))}
            </div>
          </div>

          {/* Modules */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium">Modules to Enable</label>
              <button
                onClick={() =>
                  setGenModules(
                    genModules.length === ALL_MODULES.length ? [] : [...ALL_MODULES]
                  )
                }
                className="text-xs text-primary hover:underline"
              >
                {genModules.length === ALL_MODULES.length ? "Deselect all" : "Select all"}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {ALL_MODULES.map((mod) => (
                <label
                  key={mod}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer text-sm transition-all",
                    genModules.includes(mod)
                      ? "border-primary bg-primary/5"
                      : "border-input hover:border-primary/30"
                  )}
                >
                  <div
                    className={cn(
                      "w-4 h-4 rounded border-2 flex items-center justify-center transition-colors shrink-0",
                      genModules.includes(mod)
                        ? "bg-primary border-primary"
                        : "border-muted-foreground/30"
                    )}
                  >
                    {genModules.includes(mod) && <Check size={10} className="text-white" />}
                  </div>
                  <input
                    type="checkbox"
                    checked={genModules.includes(mod)}
                    onChange={() => toggleModule(mod)}
                    className="hidden"
                  />
                  <span>{mod}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Generated key display */}
          {generatedKey && (
            <div className="bg-muted/50 rounded-xl p-4 border border-border">
              <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                Generated License Key
              </label>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-4 py-3 bg-background border border-input rounded-lg font-mono text-base tracking-widest text-center font-semibold">
                  {generatedKey}
                </code>
                <button
                  onClick={() => handleCopyKey(generatedKey)}
                  className="p-2.5 border border-input rounded-lg hover:bg-muted transition-colors shrink-0"
                  title="Copy key"
                >
                  {copiedKey ? <Check size={15} className="text-green-500" /> : <Copy size={15} />}
                </button>
              </div>
            </div>
          )}

          {/* Error / Success feedback */}
          {saveError && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              <AlertCircle size={14} className="shrink-0" />
              {saveError}
            </div>
          )}
          {saveSuccess && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm dark:bg-green-900/20 dark:border-green-800 dark:text-green-400">
              <Check size={14} className="shrink-0" />
              License activated successfully! Redirecting...
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <button
              onClick={() => setGenerateModalOpen(false)}
              className="px-4 py-2 text-sm border border-input rounded-lg hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={handleGenerateKey}
                className="px-4 py-2 text-sm border border-primary text-primary rounded-lg hover:bg-primary/5 font-medium transition-colors flex items-center gap-2"
              >
                <Key size={14} />
                {generatedKey ? "Re-generate" : "Generate Key"}
              </button>
              <button
                onClick={handleActivateLicense}
                disabled={!generatedKey || saving || saveSuccess}
                className={cn(
                  "px-5 py-2 text-sm rounded-lg font-medium transition-colors flex items-center gap-2",
                  !generatedKey || saving || saveSuccess
                    ? "bg-primary/40 text-primary-foreground/60 cursor-not-allowed"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                )}
              >
                {saving ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    Activating...
                  </>
                ) : saveSuccess ? (
                  <>
                    <Check size={14} />
                    Activated!
                  </>
                ) : (
                  <>
                    <Shield size={14} />
                    Activate License
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ================================================================
   Sub-Components
   ================================================================ */

function InfoCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-muted/30 rounded-xl p-4">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon size={13} className="text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p className="text-sm font-semibold truncate">{value}</p>
    </div>
  );
}

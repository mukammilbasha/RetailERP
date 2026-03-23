"use client";

import { useState, useEffect, useCallback } from "react";
import api, { type ApiResponse } from "@/lib/api";
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
  ChevronRight,
  Eye,
  EyeOff,
} from "lucide-react";

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

const PLANS: { name: string; description: string }[] = [
  { name: "Starter", description: "For small businesses" },
  { name: "Professional", description: "For growing teams" },
  { name: "Enterprise", description: "For large organizations" },
];

const DURATIONS = [
  { label: "1 Month", value: 1 },
  { label: "3 Months", value: 3 },
  { label: "6 Months", value: 6 },
  { label: "1 Year", value: 12 },
];

const USER_LIMITS = [
  { label: "5 Users", value: 5 },
  { label: "10 Users", value: 10 },
  { label: "25 Users", value: 25 },
  { label: "50 Users", value: 50 },
  { label: "Unlimited", value: 0 },
];

/* ================================================================
   License Key Generator
   ================================================================ */

function generateLicenseKey(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const segments = 4;
  const segLen = 4;
  return Array.from({ length: segments }, () =>
    Array.from({ length: segLen }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join("")
  ).join("-");
}

function maskLicenseKey(key: string): string {
  if (!key) return "";
  const parts = key.split("-");
  return parts.map((p) => "XXXX").join("-");
}

/* ================================================================
   Component
   ================================================================ */

export default function LicenseManagementPage() {
  const [license, setLicense] = useState<LicenseInfo | null>(null);
  const [history, setHistory] = useState<ActivationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyVisible, setKeyVisible] = useState(false);
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  // Generate form state
  const [genPlan, setGenPlan] = useState("Professional");
  const [genDuration, setGenDuration] = useState(12);
  const [genMaxUsers, setGenMaxUsers] = useState(25);
  const [genModules, setGenModules] = useState<string[]>([...ALL_MODULES]);
  const [generatedKey, setGeneratedKey] = useState("");

  const fetchLicense = useCallback(async () => {
    setLoading(true);
    try {
      const [licenseRes, historyRes] = await Promise.all([
        api.get<ApiResponse<LicenseInfo>>("/api/auth/tenant/license"),
        api.get<ApiResponse<ActivationRecord[]>>("/api/auth/tenant/license/history"),
      ]);

      if (licenseRes.data.success && licenseRes.data.data) {
        setLicense(licenseRes.data.data);
      }
      if (historyRes.data.success && historyRes.data.data) {
        setHistory(historyRes.data.data);
      }
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLicense(); }, [fetchLicense]);

  /* Days remaining */
  const getDaysRemaining = (): number => {
    if (!license?.validUntil) return 0;
    const diff = new Date(license.validUntil).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const getTotalDays = (): number => {
    if (!license?.validFrom || !license?.validUntil) return 365;
    const diff = new Date(license.validUntil).getTime() - new Date(license.validFrom).getTime();
    return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const daysRemaining = getDaysRemaining();
  const totalDays = getTotalDays();
  const progressPct = Math.max(0, Math.min(100, ((totalDays - daysRemaining) / totalDays) * 100));

  /* Generate key */
  const handleGenerateKey = () => {
    setGeneratedKey(generateLicenseKey());
  };

  const handleCopyKey = async (key: string) => {
    try {
      await navigator.clipboard.writeText(key);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    } catch {
      // fallback
      const input = document.createElement("input");
      input.value = key;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
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
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "Active": return "bg-green-100 text-green-700";
      case "Expired": return "bg-red-100 text-red-700";
      case "Trial": return "bg-yellow-100 text-yellow-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
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
    <div className="p-6 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <Key size={20} className="text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">License Management</h1>
            <p className="text-sm text-muted-foreground">
              View and manage your RetailERP license
            </p>
          </div>
        </div>
        <button
          onClick={() => { resetGenerateForm(); setGenerateModalOpen(true); }}
          className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors flex items-center gap-2"
        >
          <Key size={16} />
          Generate New Key
        </button>
      </div>

      {/* ─── Current License Card ─── */}
      <div className="bg-card rounded-2xl border border-border shadow-sm mb-8">
        <div className="p-6 pb-4 border-b border-border">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Current License</h2>
            {license?.status && (
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${statusColor(license.status)}`}>
                {license.status}
              </span>
            )}
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* License key row */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">
              License Key
            </label>
            <div className="flex items-center gap-3">
              <code className="flex-1 px-4 py-3 bg-muted/50 rounded-xl font-mono text-base tracking-widest">
                {keyVisible ? license?.licenseKey : maskLicenseKey(license?.licenseKey || "")}
              </code>
              <button
                onClick={() => setKeyVisible(!keyVisible)}
                className="p-2.5 border border-input rounded-lg hover:bg-muted transition-colors"
                title={keyVisible ? "Hide key" : "Reveal key"}
              >
                {keyVisible ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
              <button
                onClick={() => license?.licenseKey && handleCopyKey(license.licenseKey)}
                className="p-2.5 border border-input rounded-lg hover:bg-muted transition-colors"
                title="Copy to clipboard"
              >
                {copiedKey ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
              </button>
            </div>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <InfoCard
              icon={Package}
              label="Plan"
              value={license?.plan || "---"}
            />
            <InfoCard
              icon={Calendar}
              label="Valid Period"
              value={license ? `${formatDate(license.validFrom)} - ${formatDate(license.validUntil)}` : "---"}
            />
            <InfoCard
              icon={Users}
              label="Users"
              value={license ? `${license.usersActive} / ${license.usersAllowed === 0 ? "Unlimited" : license.usersAllowed}` : "---"}
            />
            <InfoCard
              icon={Shield}
              label="Modules"
              value={license ? `${license.modulesEnabled.length} of ${ALL_MODULES.length}` : "---"}
            />
          </div>

          {/* Days remaining */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Days Remaining</span>
              <span className={`text-sm font-semibold ${daysRemaining <= 30 ? "text-red-500" : daysRemaining <= 90 ? "text-yellow-600" : "text-green-600"}`}>
                {daysRemaining} days
              </span>
            </div>
            <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  daysRemaining <= 30 ? "bg-red-500" : daysRemaining <= 90 ? "bg-yellow-500" : "bg-green-500"
                }`}
                style={{ width: `${100 - progressPct}%` }}
              />
            </div>
          </div>

          {/* Modules list */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
              Modules Enabled
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
              {ALL_MODULES.map((mod) => {
                const enabled = license?.modulesEnabled.includes(mod);
                return (
                  <div
                    key={mod}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                      enabled ? "bg-green-50 text-green-700" : "bg-muted/50 text-muted-foreground line-through"
                    }`}
                  >
                    {enabled ? (
                      <Check size={14} className="text-green-500 shrink-0" />
                    ) : (
                      <span className="w-3.5 h-3.5 border border-muted-foreground/30 rounded shrink-0" />
                    )}
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
        <div className="p-6 pb-4 border-b border-border">
          <h2 className="text-lg font-semibold">Activation History</h2>
          <p className="text-sm text-muted-foreground">Previous license activations and changes</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-6 py-3 font-medium text-muted-foreground">Date</th>
                <th className="text-left px-6 py-3 font-medium text-muted-foreground">License Key</th>
                <th className="text-left px-6 py-3 font-medium text-muted-foreground">Plan</th>
                <th className="text-left px-6 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-6 py-3 font-medium text-muted-foreground">Activated By</th>
                <th className="text-left px-6 py-3 font-medium text-muted-foreground">Expires</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    No activation history found
                  </td>
                </tr>
              ) : (
                history.map((record, i) => (
                  <tr key={i} className="border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-3 whitespace-nowrap">{formatDate(record.date)}</td>
                    <td className="px-6 py-3 font-mono text-xs whitespace-nowrap">
                      {maskLicenseKey(record.licenseKey)}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap">{record.plan}</td>
                    <td className="px-6 py-3 whitespace-nowrap">
                      <StatusBadge status={record.status} />
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap">{record.activatedBy}</td>
                    <td className="px-6 py-3 whitespace-nowrap">{formatDate(record.expires)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Generate Key Modal ─── */}
      <Modal
        isOpen={generateModalOpen}
        onClose={() => setGenerateModalOpen(false)}
        title="Generate License Key"
        subtitle="Create a new license key for a tenant"
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
                  className={`px-4 py-3 border rounded-xl text-left transition-all ${
                    genPlan === plan.name
                      ? "border-primary bg-primary/10"
                      : "border-input hover:border-primary/50"
                  }`}
                >
                  <div className="text-sm font-semibold">{plan.name}</div>
                  <div className="text-xs text-muted-foreground">{plan.description}</div>
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
                  className={`px-3 py-2 border rounded-lg text-sm font-medium transition-all ${
                    genDuration === d.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-input hover:border-primary/50"
                  }`}
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
                  className={`px-3 py-2 border rounded-lg text-xs font-medium transition-all ${
                    genMaxUsers === u.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-input hover:border-primary/50"
                  }`}
                >
                  {u.label}
                </button>
              ))}
            </div>
          </div>

          {/* Modules */}
          <div>
            <label className="block text-sm font-medium mb-2">Modules to Include</label>
            <div className="grid grid-cols-2 gap-2">
              {ALL_MODULES.map((mod) => (
                <label
                  key={mod}
                  className={`flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer text-sm transition-all ${
                    genModules.includes(mod)
                      ? "border-primary bg-primary/5"
                      : "border-input hover:border-primary/30"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                      genModules.includes(mod)
                        ? "bg-primary border-primary"
                        : "border-muted-foreground/30"
                    }`}
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
            <div className="bg-muted/50 rounded-xl p-4">
              <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                Generated License Key
              </label>
              <div className="flex items-center gap-3">
                <code className="flex-1 px-4 py-3 bg-background border border-input rounded-lg font-mono text-lg tracking-widest text-center font-semibold">
                  {generatedKey}
                </code>
                <button
                  onClick={() => handleCopyKey(generatedKey)}
                  className="px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 text-sm font-medium"
                >
                  {copiedKey ? <Check size={16} /> : <Copy size={16} />}
                  {copiedKey ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setGenerateModalOpen(false)}
              className="px-4 py-2 text-sm border border-input rounded-lg hover:bg-muted transition-colors"
            >
              Close
            </button>
            <button
              onClick={handleGenerateKey}
              className="px-6 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium transition-colors flex items-center gap-2"
            >
              <Key size={14} />
              Generate Key
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ================================================================
   Reusable Sub-Components
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
      <div className="flex items-center gap-2 mb-1">
        <Icon size={14} className="text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "---";
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

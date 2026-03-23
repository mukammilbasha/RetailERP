"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import api, { type ApiResponse } from "@/lib/api";
import {
  Building,
  Upload,
  Shield,
  Check,
  Users,
  Calendar,
  Package,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Key,
} from "lucide-react";

/* ================================================================
   Types
   ================================================================ */

interface SetupData {
  // Step 1 - Company
  companyName: string;
  tradeName: string;
  logoFile: File | null;
  logoPreview: string;
  gstin: string;
  pan: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string;

  // Step 2 - Business Config
  industry: string;
  segments: string[];
  defaultUom: string;
  currency: string;
  financialYearStart: string;

  // Step 3 - Users
  adminName: string;
  adminEmail: string;
  additionalUsers: { name: string; email: string; role: string }[];

  // Step 4 - License
  licenseKey: string;
  licenseActivated: boolean;
  licensePlan: string;
  licenseUsers: number;
  licenseValidUntil: string;
  licenseModules: string[];
}

const defaultSetup: SetupData = {
  companyName: "",
  tradeName: "",
  logoFile: null,
  logoPreview: "",
  gstin: "",
  pan: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  pincode: "",
  phone: "",
  email: "",
  industry: "Footwear",
  segments: ["Footwear"],
  defaultUom: "PAIRS",
  currency: "INR",
  financialYearStart: "April-March",
  adminName: "",
  adminEmail: "",
  additionalUsers: [],
  licenseKey: "",
  licenseActivated: false,
  licensePlan: "",
  licenseUsers: 0,
  licenseValidUntil: "",
  licenseModules: [],
};

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
];

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

const SEGMENT_OPTIONS = ["Footwear", "Leather Goods", "Accessories"];

const STEPS = [
  { label: "Company Details", icon: Building },
  { label: "Business Config", icon: Package },
  { label: "User Setup", icon: Users },
  { label: "License", icon: Key },
];

/* ================================================================
   Component
   ================================================================ */

export default function SetupWizardPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<SetupData>(defaultSetup);
  const [submitting, setSubmitting] = useState(false);
  const [setupComplete, setSetupComplete] = useState(false);
  const [activatingLicense, setActivatingLicense] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateField = <K extends keyof SetupData>(key: K, value: SetupData[K]) => {
    setData((prev) => ({ ...prev, [key]: value }));
  };

  /* Logo */
  const handleLogoSelect = (file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      alert("Logo file must be under 2MB");
      return;
    }
    const validTypes = ["image/png", "image/jpeg", "image/svg+xml"];
    if (!validTypes.includes(file.type)) {
      alert("Please upload a PNG, JPG, or SVG file");
      return;
    }
    updateField("logoFile", file);
    const reader = new FileReader();
    reader.onload = (e) => updateField("logoPreview", e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleLogoSelect(file);
  };

  /* Segments toggle */
  const toggleSegment = (seg: string) => {
    setData((prev) => ({
      ...prev,
      segments: prev.segments.includes(seg)
        ? prev.segments.filter((s) => s !== seg)
        : [...prev.segments, seg],
    }));
  };

  /* Additional users */
  const addUser = () => {
    setData((prev) => ({
      ...prev,
      additionalUsers: [...prev.additionalUsers, { name: "", email: "", role: "Staff" }],
    }));
  };

  const updateUser = (index: number, field: string, value: string) => {
    setData((prev) => {
      const users = [...prev.additionalUsers];
      users[index] = { ...users[index], [field]: value };
      return { ...prev, additionalUsers: users };
    });
  };

  const removeUser = (index: number) => {
    setData((prev) => ({
      ...prev,
      additionalUsers: prev.additionalUsers.filter((_, i) => i !== index),
    }));
  };

  /* License activation */
  const activateLicense = async () => {
    if (!data.licenseKey.trim()) return;
    setActivatingLicense(true);
    try {
      const { data: res } = await api.post<ApiResponse<{
        plan: string;
        usersAllowed: number;
        validUntil: string;
        modules: string[];
      }>>("/api/auth/tenant/activate-license", { licenseKey: data.licenseKey });

      if (res.success && res.data) {
        setData((prev) => ({
          ...prev,
          licenseActivated: true,
          licensePlan: res.data!.plan,
          licenseUsers: res.data!.usersAllowed,
          licenseValidUntil: res.data!.validUntil,
          licenseModules: res.data!.modules,
        }));
      }
    } catch (err: any) {
      alert(err.response?.data?.message || "Invalid license key");
    } finally {
      setActivatingLicense(false);
    }
  };

  const requestTrial = async () => {
    setActivatingLicense(true);
    try {
      const { data: res } = await api.post<ApiResponse<{
        plan: string;
        usersAllowed: number;
        validUntil: string;
        modules: string[];
        licenseKey: string;
      }>>("/api/auth/tenant/request-trial");

      if (res.success && res.data) {
        setData((prev) => ({
          ...prev,
          licenseKey: res.data!.licenseKey,
          licenseActivated: true,
          licensePlan: res.data!.plan,
          licenseUsers: res.data!.usersAllowed,
          licenseValidUntil: res.data!.validUntil,
          licenseModules: res.data!.modules,
        }));
      }
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to request trial");
    } finally {
      setActivatingLicense(false);
    }
  };

  /* Final submit */
  const handleComplete = async () => {
    setSubmitting(true);
    try {
      const formData = new FormData();
      if (data.logoFile) formData.append("logo", data.logoFile);

      const payload = { ...data, logoFile: undefined, logoPreview: undefined };
      formData.append("setupData", JSON.stringify(payload));

      await api.post("/api/auth/tenant/setup", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setSetupComplete(true);
    } catch (err: any) {
      alert(err.response?.data?.message || "Setup failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  /* Skip license (14-day trial) */
  const skipLicense = () => {
    setData((prev) => ({
      ...prev,
      licenseActivated: true,
      licensePlan: "Trial",
      licenseUsers: 5,
      licenseValidUntil: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      licenseModules: ALL_MODULES,
    }));
  };

  /* ─── Setup Complete Screen ─── */
  if (setupComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10">
        <div className="text-center max-w-md mx-auto px-6">
          {/* Confetti-style decoration */}
          <div className="relative mb-8">
            <div className="w-24 h-24 bg-green-100 rounded-full mx-auto flex items-center justify-center animate-bounce">
              <Check size={48} className="text-green-600" />
            </div>
            <div className="absolute -top-4 -left-4 w-3 h-3 bg-primary rounded-full animate-ping" />
            <div className="absolute -top-2 right-8 w-2 h-2 bg-yellow-400 rounded-full animate-ping" style={{ animationDelay: "0.2s" }} />
            <div className="absolute top-12 -right-2 w-2.5 h-2.5 bg-green-400 rounded-full animate-ping" style={{ animationDelay: "0.4s" }} />
            <div className="absolute bottom-0 left-4 w-2 h-2 bg-blue-400 rounded-full animate-ping" style={{ animationDelay: "0.6s" }} />
            <div className="absolute -bottom-2 right-12 w-3 h-3 bg-purple-400 rounded-full animate-ping" style={{ animationDelay: "0.3s" }} />
            <div className="absolute top-2 left-12 w-1.5 h-1.5 bg-red-400 rounded-full animate-ping" style={{ animationDelay: "0.5s" }} />
          </div>

          <h1 className="text-3xl font-bold tracking-tight mb-2">Setup Complete!</h1>
          <p className="text-muted-foreground mb-8">
            Your RetailERP workspace is ready. You can start managing your business right away.
          </p>

          <button
            onClick={() => router.push("/dashboard")}
            className="px-8 py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-base hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  /* ─── Wizard Layout ─── */
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center shadow-md">
              <span className="text-white font-bold text-sm">EC</span>
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Welcome to RetailERP</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Let&apos;s set up your business in a few simple steps
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="max-w-3xl mx-auto w-full px-6 mb-8">
        <div className="flex items-center justify-between">
          {STEPS.map((s, i) => {
            const stepNum = i + 1;
            const isActive = step === stepNum;
            const isCompleted = step > stepNum;
            const Icon = s.icon;

            return (
              <div key={s.label} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                      isCompleted
                        ? "bg-green-500 text-white"
                        : isActive
                          ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {isCompleted ? <Check size={18} /> : <Icon size={18} />}
                  </div>
                  <span
                    className={`text-xs mt-1.5 font-medium whitespace-nowrap ${
                      isActive ? "text-primary" : isCompleted ? "text-green-600" : "text-muted-foreground"
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className="flex-1 mx-3 mt-[-18px]">
                    <div className="h-[2px] bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 transition-all duration-500"
                        style={{ width: isCompleted ? "100%" : "0%" }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="flex-1 max-w-3xl mx-auto w-full px-6 pb-8">
        <div className="bg-card rounded-2xl border border-border shadow-sm p-8">
          {/* ─── Step 1: Company Details ─── */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold mb-1">Company Details</h2>
                <p className="text-sm text-muted-foreground">Basic information about your company</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <WizardField
                  label="Company Name"
                  value={data.companyName}
                  onChange={(v) => updateField("companyName", v)}
                  placeholder="Your company name"
                  required
                />
                <WizardField
                  label="Trade Name"
                  value={data.tradeName}
                  onChange={(v) => updateField("tradeName", v)}
                  placeholder="Trade / export name"
                />
              </div>

              {/* Logo */}
              <div>
                <label className="block text-sm font-medium mb-2">Company Logo</label>
                <div
                  className={`border-2 border-dashed rounded-xl p-4 text-center transition-colors cursor-pointer ${
                    dragOver ? "border-primary bg-primary/5" : "border-input hover:border-primary/50"
                  }`}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".png,.jpg,.jpeg,.svg"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLogoSelect(f); }}
                    className="hidden"
                  />
                  {data.logoPreview ? (
                    <img src={data.logoPreview} alt="Logo" className="max-h-16 max-w-32 object-contain mx-auto" />
                  ) : (
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-2">
                      <Upload size={16} />
                      <span>Drag and drop or click to upload (PNG, JPG, SVG. Max 2MB)</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <WizardField
                  label="GSTIN"
                  value={data.gstin}
                  onChange={(v) => updateField("gstin", v)}
                  placeholder="22AAAAA0000A1Z5"
                />
                <WizardField
                  label="PAN"
                  value={data.pan}
                  onChange={(v) => updateField("pan", v)}
                  placeholder="AAAAA0000A"
                />
              </div>

              <WizardField
                label="Address"
                value={data.addressLine1}
                onChange={(v) => updateField("addressLine1", v)}
                placeholder="Street address"
                required
              />
              <WizardField
                label="Address Line 2"
                value={data.addressLine2}
                onChange={(v) => updateField("addressLine2", v)}
                placeholder="Area / Locality"
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <WizardField
                  label="City"
                  value={data.city}
                  onChange={(v) => updateField("city", v)}
                  placeholder="City"
                  required
                />
                <div>
                  <label className="block text-sm font-medium mb-1.5">State *</label>
                  <select
                    value={data.state}
                    onChange={(e) => updateField("state", e.target.value)}
                    className="w-full px-4 py-2.5 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background text-sm"
                  >
                    <option value="">Select State</option>
                    {INDIAN_STATES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <WizardField
                  label="Pincode"
                  value={data.pincode}
                  onChange={(v) => updateField("pincode", v)}
                  placeholder="000000"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <WizardField
                  label="Phone"
                  value={data.phone}
                  onChange={(v) => updateField("phone", v)}
                  placeholder="+91 XXXXX XXXXX"
                  required
                />
                <WizardField
                  label="Email"
                  value={data.email}
                  onChange={(v) => updateField("email", v)}
                  placeholder="info@company.com"
                  type="email"
                  required
                />
              </div>
            </div>
          )}

          {/* ─── Step 2: Business Configuration ─── */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold mb-1">Business Configuration</h2>
                <p className="text-sm text-muted-foreground">Configure your industry and business preferences</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Industry</label>
                <div className="grid grid-cols-3 gap-3">
                  {["Footwear", "Leather Goods", "Both"].map((opt) => (
                    <button
                      key={opt}
                      onClick={() => updateField("industry", opt)}
                      className={`px-4 py-3 border rounded-xl text-sm font-medium transition-all ${
                        data.industry === opt
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-input hover:border-primary/50 text-foreground"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Segments to Enable</label>
                <div className="space-y-2">
                  {SEGMENT_OPTIONS.map((seg) => (
                    <label
                      key={seg}
                      className={`flex items-center gap-3 px-4 py-3 border rounded-xl cursor-pointer transition-all ${
                        data.segments.includes(seg)
                          ? "border-primary bg-primary/5"
                          : "border-input hover:border-primary/30"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                          data.segments.includes(seg)
                            ? "bg-primary border-primary"
                            : "border-muted-foreground/30"
                        }`}
                      >
                        {data.segments.includes(seg) && <Check size={12} className="text-white" />}
                      </div>
                      <input
                        type="checkbox"
                        checked={data.segments.includes(seg)}
                        onChange={() => toggleSegment(seg)}
                        className="hidden"
                      />
                      <span className="text-sm font-medium">{seg}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Default UOM</label>
                  <select
                    value={data.defaultUom}
                    onChange={(e) => updateField("defaultUom", e.target.value)}
                    className="w-full px-4 py-2.5 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background text-sm"
                  >
                    <option value="PAIRS">PAIRS</option>
                    <option value="NOS">NOS</option>
                    <option value="PCS">PCS</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Currency</label>
                  <select
                    value={data.currency}
                    onChange={(e) => updateField("currency", e.target.value)}
                    className="w-full px-4 py-2.5 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background text-sm"
                  >
                    <option value="INR">INR - Indian Rupee</option>
                    <option value="USD">USD - US Dollar</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="GBP">GBP - British Pound</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Financial Year</label>
                <select
                  value={data.financialYearStart}
                  onChange={(e) => updateField("financialYearStart", e.target.value)}
                  className="w-full px-4 py-2.5 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background text-sm"
                >
                  <option value="April-March">April - March (Default)</option>
                  <option value="January-December">January - December</option>
                  <option value="July-June">July - June</option>
                </select>
              </div>
            </div>
          )}

          {/* ─── Step 3: User Setup ─── */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold mb-1">User Setup</h2>
                <p className="text-sm text-muted-foreground">Configure admin account and invite team members</p>
              </div>

              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Shield size={16} className="text-primary" />
                  <span className="text-sm font-semibold text-primary">Admin Account</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <WizardField
                    label="Admin Name"
                    value={data.adminName}
                    onChange={(v) => updateField("adminName", v)}
                    placeholder="Admin full name"
                    required
                  />
                  <WizardField
                    label="Admin Email"
                    value={data.adminEmail}
                    onChange={(v) => updateField("adminEmail", v)}
                    placeholder="admin@company.com"
                    type="email"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-semibold">Additional Users</h3>
                    <p className="text-xs text-muted-foreground">Optionally invite team members now</p>
                  </div>
                  <button
                    onClick={addUser}
                    className="px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-1"
                  >
                    + Add User
                  </button>
                </div>

                {data.additionalUsers.length === 0 && (
                  <div className="border border-dashed border-input rounded-xl p-6 text-center">
                    <Users size={24} className="mx-auto mb-2 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">
                      No additional users yet. Click &quot;Add User&quot; to invite team members.
                    </p>
                  </div>
                )}

                <div className="space-y-3">
                  {data.additionalUsers.map((user, index) => (
                    <div key={index} className="flex items-start gap-3 border border-input rounded-xl p-4">
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                        <input
                          type="text"
                          value={user.name}
                          onChange={(e) => updateUser(index, "name", e.target.value)}
                          placeholder="Name"
                          className="px-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                        <input
                          type="email"
                          value={user.email}
                          onChange={(e) => updateUser(index, "email", e.target.value)}
                          placeholder="Email"
                          className="px-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                        <select
                          value={user.role}
                          onChange={(e) => updateUser(index, "role", e.target.value)}
                          className="px-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background"
                        >
                          <option value="Staff">Staff</option>
                          <option value="Manager">Manager</option>
                          <option value="Supervisor">Supervisor</option>
                          <option value="Viewer">Viewer</option>
                        </select>
                      </div>
                      <button
                        onClick={() => removeUser(index)}
                        className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors mt-0.5"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-muted/50 rounded-xl p-4">
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium">Default password:</span>{" "}
                  <code className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">Welcome@123</code>{" "}
                  — Users will be prompted to change on first login.
                </p>
              </div>
            </div>
          )}

          {/* ─── Step 4: License Activation ─── */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold mb-1">License Activation</h2>
                <p className="text-sm text-muted-foreground">Activate your license key or start a free trial</p>
              </div>

              {!data.licenseActivated ? (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2">License Key</label>
                    <input
                      type="text"
                      value={data.licenseKey}
                      onChange={(e) => updateField("licenseKey", e.target.value.toUpperCase())}
                      placeholder="XXXX-XXXX-XXXX-XXXX"
                      className="w-full px-4 py-4 border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-lg font-mono tracking-widest text-center"
                      maxLength={19}
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={activateLicense}
                      disabled={!data.licenseKey.trim() || activatingLicense}
                      className="flex-1 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                    >
                      {activatingLicense ? (
                        <>
                          <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                          Activating...
                        </>
                      ) : (
                        <>
                          <Key size={16} />
                          Activate License
                        </>
                      )}
                    </button>
                    <button
                      onClick={requestTrial}
                      disabled={activatingLicense}
                      className="flex-1 px-6 py-3 border border-input rounded-xl font-semibold hover:bg-muted transition-colors flex items-center justify-center gap-2"
                    >
                      <Sparkles size={16} />
                      Request Trial License
                    </button>
                  </div>

                  <div className="text-center">
                    <button
                      onClick={skipLicense}
                      className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
                    >
                      Skip for now (starts 14-day trial)
                    </button>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                      <Check size={16} className="text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-green-800">License Activated</p>
                      <p className="text-xs text-green-600">Your license has been verified and activated</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <LicenseDetail label="Plan" value={data.licensePlan} />
                    <LicenseDetail
                      label="Users Allowed"
                      value={data.licenseUsers === 0 ? "Unlimited" : String(data.licenseUsers)}
                    />
                    <LicenseDetail label="Valid Until" value={data.licenseValidUntil} />
                    <LicenseDetail label="Modules" value={`${data.licenseModules.length} enabled`} />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Modules Included</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {ALL_MODULES.map((mod) => {
                        const enabled = data.licenseModules.includes(mod);
                        return (
                          <div
                            key={mod}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                              enabled ? "bg-green-50 text-green-700" : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {enabled ? (
                              <Check size={14} className="text-green-500" />
                            ) : (
                              <span className="w-3.5 h-3.5 border border-muted-foreground/30 rounded" />
                            )}
                            {mod}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─── Navigation Buttons ─── */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
            {step > 1 ? (
              <button
                onClick={() => setStep(step - 1)}
                className="px-5 py-2.5 border border-input rounded-xl text-sm font-medium hover:bg-muted transition-colors flex items-center gap-2"
              >
                <ChevronLeft size={16} />
                Back
              </button>
            ) : (
              <div />
            )}

            {step < 4 ? (
              <button
                onClick={() => setStep(step + 1)}
                className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center gap-2"
              >
                Next
                <ChevronRight size={16} />
              </button>
            ) : (
              <button
                onClick={handleComplete}
                disabled={submitting}
                className="px-8 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    Setting up...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    Complete Setup
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   Reusable Sub-Components
   ================================================================ */

function WizardField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">
        {label}{required && " *"}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-2.5 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
      />
    </div>
  );
}

function LicenseDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-muted/50 rounded-xl p-3">
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import api, { type ApiResponse } from "@/lib/api";
import { useSidebar } from "@/components/layout/sidebar";
import { cn } from "@/lib/utils";
import {
  Building,
  Upload,
  Shield,
  Check,
  CreditCard,
  FileText,
  Receipt,
  AlertCircle,
} from "lucide-react";
import { FieldError } from "@/components/ui/field-error";
import {
  PATTERNS,
  required,
  minLength,
  pattern,
  hasErrors,
  type ValidationError,
} from "@/lib/validators";

/* ================================================================
   Types
   ================================================================ */

interface CompanySettings {
  // Branding
  logoUrl: string;
  companyName: string;
  companySubtitle: string;
  tradeName: string;

  // Business
  gstin: string;
  pan: string;
  cin: string;
  addressLine1: string;
  addressLine2: string;
  addressLine3: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  phone: string;
  email: string;
  website: string;

  // Bank
  accountName: string;
  bankName: string;
  branch: string;
  accountNo: string;
  ifscCode: string;

  // Tax
  gstRegistrationType: string;
  gstRateFootwearBelow1000: number;
  gstRateFootwearAbove1000: number;
  gstRateOtherGoods: number;
  hsnCodePrefix: string;

  // Invoice
  invoicePrefix: string;
  invoiceFormat: string;
  financialYearStartMonth: number;
  termsAndConditions: string;
  declaration: string;
  authorisedSignatoryName: string;
}

const defaultSettings: CompanySettings = {
  logoUrl: "",
  companyName: "",
  companySubtitle: "",
  tradeName: "",
  gstin: "",
  pan: "",
  cin: "",
  addressLine1: "",
  addressLine2: "",
  addressLine3: "",
  city: "",
  state: "",
  pincode: "",
  country: "India",
  phone: "",
  email: "",
  website: "",
  accountName: "",
  bankName: "",
  branch: "",
  accountNo: "",
  ifscCode: "",
  gstRegistrationType: "Regular",
  gstRateFootwearBelow1000: 5,
  gstRateFootwearAbove1000: 18,
  gstRateOtherGoods: 18,
  hsnCodePrefix: "",
  invoicePrefix: "",
  invoiceFormat: "",
  financialYearStartMonth: 4,
  termsAndConditions: "",
  declaration: "",
  authorisedSignatoryName: "",
};

/* Map API response (PascalCase/mixed) → local CompanySettings */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapApiToSettings(d: any): CompanySettings {
  return {
    logoUrl:                    d.companyLogo ?? d.logoUrl ?? "",
    companyName:                d.companyName ?? "",
    companySubtitle:            d.subtitle ?? d.companySubtitle ?? "",
    tradeName:                  d.tradeName ?? "",
    gstin:                      d.gSTIN ?? d.gstin ?? d.GSTIN ?? "",
    pan:                        d.pAN ?? d.pan ?? d.PAN ?? "",
    cin:                        d.cIN ?? d.cin ?? d.CIN ?? "",
    addressLine1:               d.addressLine1 ?? "",
    addressLine2:               d.addressLine2 ?? "",
    addressLine3:               d.addressLine3 ?? "",
    city:                       d.city ?? "",
    state:                      d.state ?? "",
    pincode:                    d.pincode ?? "",
    country:                    d.country ?? "India",
    phone:                      d.phone ?? "",
    email:                      d.email ?? "",
    website:                    d.website ?? "",
    accountName:                d.bankAccountName ?? d.accountName ?? "",
    bankName:                   d.bankName ?? "",
    branch:                     d.bankBranch ?? d.branch ?? "",
    accountNo:                  d.bankAccountNo ?? d.accountNo ?? "",
    ifscCode:                   d.bankIFSCode ?? d.ifscCode ?? "",
    gstRegistrationType:        d.gSTRegType ?? d.gstRegType ?? d.gstRegistrationType ?? "Regular",
    gstRateFootwearBelow1000:   Number(d.gSTRateFootwearLow ?? d.gstRateFootwearLow ?? 5),
    gstRateFootwearAbove1000:   Number(d.gSTRateFootwearHigh ?? d.gstRateFootwearHigh ?? 18),
    gstRateOtherGoods:          Number(d.gSTRateOther ?? d.gstRateOther ?? 18),
    hsnCodePrefix:              d.hSNPrefix ?? d.hsnPrefix ?? d.hsnCodePrefix ?? "",
    invoicePrefix:              d.invoicePrefix ?? "",
    invoiceFormat:              d.invoiceFormat ?? "",
    financialYearStartMonth:    Number(d.fYStartMonth ?? d.fyStartMonth ?? d.financialYearStartMonth ?? 4),
    termsAndConditions:         d.termsAndConditions ?? "",
    declaration:                d.declaration ?? "",
    authorisedSignatoryName:    d.authorisedSignatory ?? d.authorisedSignatoryName ?? "",
  };
}

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
];

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/* ================================================================
   Section navigation config
   ================================================================ */

const SECTIONS = [
  { id: "branding",  label: "Branding",     icon: Building },
  { id: "business",  label: "Business",     icon: Shield },
  { id: "bank",      label: "Bank Details", icon: CreditCard },
  { id: "tax",       label: "Tax & GST",    icon: Receipt },
  { id: "invoice",   label: "Invoice",      icon: FileText },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

/* ================================================================
   Component
   ================================================================ */

export default function CompanyMasterPage() {
  const { isCollapsed } = useSidebar();

  const [settings, setSettings] = useState<CompanySettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<ValidationError>({});
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [dragOver, setDragOver] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionId>("branding");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sectionRefs = useRef<Record<SectionId, HTMLDivElement | null>>({
    branding: null, business: null, bank: null, tax: null, invoice: null,
  });

  /* Fetch settings */
  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<ApiResponse<unknown>>("/api/auth/tenant/settings");
      if (data.success && data.data) {
        const mapped = mapApiToSettings(data.data);
        setSettings(mapped);
        if (mapped.logoUrl) setLogoPreview(mapped.logoUrl);
      }
    } catch {
      setError("Failed to load company settings. Please refresh.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  /* Track active section on scroll */
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id as SectionId);
          }
        }
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: 0 }
    );

    SECTIONS.forEach(({ id }) => {
      const el = sectionRefs.current[id];
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [loading]);

  const scrollToSection = (id: SectionId) => {
    sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveSection(id);
  };

  const updateField = <K extends keyof CompanySettings>(key: K, value: CompanySettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
    setError(null);
    setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  /* Logo handling */
  const handleLogoSelect = (file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      setError("Logo file must be under 2MB");
      return;
    }
    const validTypes = ["image/png", "image/jpeg", "image/svg+xml"];
    if (!validTypes.includes(file.type)) {
      setError("Please upload a PNG, JPG, or SVG file");
      return;
    }
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setLogoPreview(e.target?.result as string);
    reader.readAsDataURL(file);
    setSaved(false);
    setError(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleLogoSelect(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleLogoSelect(file);
  };

  /* Save — sends individual form fields so [FromForm] binding works */
  const handleSave = async () => {
    const newErrors: ValidationError = {
      companyName:
        required(settings.companyName, "Company Name") ||
        minLength(settings.companyName, 2, "Company Name"),
      gstin:    pattern(settings.gstin, PATTERNS.GSTIN, "GSTIN", "e.g. 22AAAAA0000A1Z5"),
      pan:      pattern(settings.pan, PATTERNS.PAN, "PAN", "e.g. AAAAA0000A"),
      pincode:
        required(settings.pincode, "Pincode") ||
        pattern(settings.pincode, PATTERNS.PINCODE, "Pincode", "6-digit Indian pincode"),
      phone:
        required(settings.phone, "Phone") ||
        pattern(settings.phone, PATTERNS.PHONE, "Phone", "10-digit mobile starting with 6-9"),
      email:
        required(settings.email, "Email") ||
        pattern(settings.email, PATTERNS.EMAIL, "Email"),
      ifscCode: pattern(settings.ifscCode, PATTERNS.IFSC, "IFSC Code", "e.g. HDFC0001295"),
    };

    if (hasErrors(newErrors)) {
      setErrors(newErrors);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const formData = new FormData();

      if (logoFile) formData.append("logo", logoFile);

      // Map local field names → backend property names
      formData.append("CompanyName",        settings.companyName);
      formData.append("TradeName",          settings.tradeName);
      formData.append("Subtitle",           settings.companySubtitle);
      formData.append("GSTIN",              settings.gstin);
      formData.append("PAN",                settings.pan);
      formData.append("CIN",                settings.cin);
      formData.append("AddressLine1",       settings.addressLine1);
      formData.append("AddressLine2",       settings.addressLine2);
      formData.append("AddressLine3",       settings.addressLine3);
      formData.append("City",               settings.city);
      formData.append("State",              settings.state);
      formData.append("Pincode",            settings.pincode);
      formData.append("Country",            settings.country);
      formData.append("Phone",              settings.phone);
      formData.append("Email",              settings.email);
      formData.append("Website",            settings.website);
      formData.append("BankAccountName",    settings.accountName);
      formData.append("BankName",           settings.bankName);
      formData.append("BankBranch",         settings.branch);
      formData.append("BankAccountNo",      settings.accountNo);
      formData.append("BankIFSCode",        settings.ifscCode);
      formData.append("GSTRegType",         settings.gstRegistrationType);
      formData.append("GSTRateFootwearLow", String(settings.gstRateFootwearBelow1000));
      formData.append("GSTRateFootwearHigh",String(settings.gstRateFootwearAbove1000));
      formData.append("GSTRateOther",       String(settings.gstRateOtherGoods));
      formData.append("HSNPrefix",          settings.hsnCodePrefix);
      formData.append("InvoicePrefix",      settings.invoicePrefix);
      formData.append("InvoiceFormat",      settings.invoiceFormat);
      formData.append("FYStartMonth",       String(settings.financialYearStartMonth));
      formData.append("TermsAndConditions", settings.termsAndConditions);
      formData.append("Declaration",        settings.declaration);
      formData.append("AuthorisedSignatory",settings.authorisedSignatoryName);

      await api.put("/api/auth/tenant/settings", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setSaved(true);
      setLogoFile(null);
      setTimeout(() => setSaved(false), 4000);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || "Failed to save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  /* Sidebar-aware left offset for the fixed save bar */
  const saveBarLeft = cn(
    "transition-[left] duration-300",
    isCollapsed ? "left-0 md:left-[72px]" : "left-0 md:left-[260px]"
  );

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-56" />
          <div className="h-4 bg-muted rounded w-80" />
          <div className="flex gap-2 mt-4">
            {SECTIONS.map((s) => (
              <div key={s.id} className="h-8 w-24 bg-muted rounded-full" />
            ))}
          </div>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-40 bg-muted rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-28">
      {/* ─── Page Header ─── */}
      <div className="pb-4">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
            <Building size={20} className="text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Company Master</h1>
            <p className="text-sm text-muted-foreground">
              Manage company details, logo, and tenant configuration
            </p>
          </div>
        </div>
      </div>

      {/* ─── Error Banner ─── */}
      {error && (
        <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          <AlertCircle size={15} className="shrink-0" />
          {error}
        </div>
      )}

      {/* ─── Section Tab Navigation — breaks out of layout padding, sticks at top ─── */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border -mx-4 md:-mx-6 px-4 md:px-6 py-2 mb-4">
        <div className="flex gap-1 overflow-x-auto no-scrollbar">
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => scrollToSection(id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all",
                activeSection === id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {/* ─── Section 1: Company Branding ─── */}
        <div
          id="branding"
          ref={(el) => { sectionRefs.current.branding = el; }}
        >
          <SectionCard title="Company Branding" icon={Building} description="Logo and brand identity">
            {/* Logo Upload */}
            <div className="mb-5">
              <label className="block text-sm font-medium mb-2">Company Logo</label>
              <div
                className={cn(
                  "relative border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer",
                  dragOver
                    ? "border-primary bg-primary/5"
                    : "border-input hover:border-primary/50 hover:bg-muted/30"
                )}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".png,.jpg,.jpeg,.svg"
                  onChange={handleFileInput}
                  className="hidden"
                />
                {logoPreview ? (
                  <div className="flex flex-col items-center gap-3">
                    <img
                      src={logoPreview}
                      alt="Company logo"
                      className="max-h-20 max-w-48 object-contain rounded-lg"
                    />
                    <p className="text-xs text-muted-foreground">Click or drag to replace</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center">
                      <Upload size={22} className="text-primary" />
                    </div>
                    <p className="text-sm font-medium">Drag and drop or click to upload</p>
                    <p className="text-xs text-muted-foreground">PNG, JPG, or SVG · Max 2MB</p>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                label="Company Name"
                value={settings.companyName}
                onChange={(v) => updateField("companyName", v)}
                placeholder="e.g., EL CURIO"
                required
                error={errors.companyName}
              />
              <FormField
                label="Company Subtitle"
                value={settings.companySubtitle}
                onChange={(v) => updateField("companySubtitle", v)}
                placeholder="e.g., Multi-Tenant Retail Distribution"
              />
            </div>
            <div className="mt-4">
              <FormField
                label="Trade Name / Export Name"
                value={settings.tradeName}
                onChange={(v) => updateField("tradeName", v)}
                placeholder="e.g., SKH EXPORTS"
              />
            </div>
          </SectionCard>
        </div>

        {/* ─── Section 2: Business Details ─── */}
        <div
          id="business"
          ref={(el) => { sectionRefs.current.business = el; }}
        >
          <SectionCard title="Business Details" icon={Shield} description="Registration and contact information">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                label="GSTIN"
                value={settings.gstin}
                onChange={(v) => updateField("gstin", v.toUpperCase())}
                placeholder="22AAAAA0000A1Z5"
                error={errors.gstin}
              />
              <FormField
                label="PAN"
                value={settings.pan}
                onChange={(v) => updateField("pan", v.toUpperCase())}
                placeholder="AAAAA0000A"
                error={errors.pan}
              />
              <FormField
                label="CIN"
                value={settings.cin}
                onChange={(v) => updateField("cin", v.toUpperCase())}
                placeholder="U00000MH2000PLC000000"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 mt-4">
              <FormField
                label="Address Line 1"
                value={settings.addressLine1}
                onChange={(v) => updateField("addressLine1", v)}
                placeholder="Building / Street"
                required
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  label="Address Line 2"
                  value={settings.addressLine2}
                  onChange={(v) => updateField("addressLine2", v)}
                  placeholder="Area / Locality"
                />
                <FormField
                  label="Address Line 3"
                  value={settings.addressLine3}
                  onChange={(v) => updateField("addressLine3", v)}
                  placeholder="Landmark"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <FormField
                label="City"
                value={settings.city}
                onChange={(v) => updateField("city", v)}
                placeholder="City"
                required
              />
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  State <span className="text-destructive">*</span>
                </label>
                <select
                  value={settings.state}
                  onChange={(e) => updateField("state", e.target.value)}
                  className="w-full px-3 py-2.5 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background text-sm"
                >
                  <option value="">Select State</option>
                  {INDIAN_STATES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <FormField
                label="Pincode"
                value={settings.pincode}
                onChange={(v) => updateField("pincode", v)}
                placeholder="000000"
                required
                error={errors.pincode}
              />
              <FormField
                label="Country"
                value={settings.country}
                onChange={(v) => updateField("country", v)}
                placeholder="India"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <FormField
                label="Phone"
                value={settings.phone}
                onChange={(v) => updateField("phone", v)}
                placeholder="+91 XXXXX XXXXX"
                required
                error={errors.phone}
              />
              <FormField
                label="Email"
                value={settings.email}
                onChange={(v) => updateField("email", v)}
                placeholder="info@company.com"
                type="email"
                required
                error={errors.email}
              />
              <FormField
                label="Website"
                value={settings.website}
                onChange={(v) => updateField("website", v)}
                placeholder="https://www.company.com"
              />
            </div>
          </SectionCard>
        </div>

        {/* ─── Section 3: Bank Details ─── */}
        <div
          id="bank"
          ref={(el) => { sectionRefs.current.bank = el; }}
        >
          <SectionCard title="Bank Details" icon={CreditCard} description="Banking information for invoices and payments">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                label="A/C Holder Name"
                value={settings.accountName}
                onChange={(v) => updateField("accountName", v)}
                placeholder="Account holder name"
              />
              <FormField
                label="Bank Name"
                value={settings.bankName}
                onChange={(v) => updateField("bankName", v)}
                placeholder="e.g., HDFC Bank"
              />
              <FormField
                label="Branch"
                value={settings.branch}
                onChange={(v) => updateField("branch", v)}
                placeholder="Branch name"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <FormField
                label="Account Number"
                value={settings.accountNo}
                onChange={(v) => updateField("accountNo", v)}
                placeholder="Account number"
              />
              <FormField
                label="IFSC Code"
                value={settings.ifscCode}
                onChange={(v) => updateField("ifscCode", v.toUpperCase())}
                placeholder="e.g., HDFC0001295"
                error={errors.ifscCode}
              />
            </div>
          </SectionCard>
        </div>

        {/* ─── Section 4: Tax Configuration ─── */}
        <div
          id="tax"
          ref={(el) => { sectionRefs.current.tax = el; }}
        >
          <SectionCard title="Tax & GST Configuration" icon={Receipt} description="GST rates and registration settings">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">GST Registration Type</label>
                <select
                  value={settings.gstRegistrationType}
                  onChange={(e) => updateField("gstRegistrationType", e.target.value)}
                  className="w-full px-3 py-2.5 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background text-sm"
                >
                  <option value="Regular">Regular</option>
                  <option value="Composition">Composition</option>
                  <option value="Unregistered">Unregistered</option>
                </select>
              </div>
              <FormField
                label="HSN Code Prefix"
                value={settings.hsnCodePrefix}
                onChange={(v) => updateField("hsnCodePrefix", v)}
                placeholder="e.g., 6403"
              />
            </div>

            <div className="mt-5">
              <p className="text-sm font-medium mb-3 text-muted-foreground">GST Rate Configuration</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <RateField
                  label="Footwear ≤ ₹1,000"
                  value={settings.gstRateFootwearBelow1000}
                  onChange={(v) => updateField("gstRateFootwearBelow1000", v)}
                />
                <RateField
                  label="Footwear > ₹1,000"
                  value={settings.gstRateFootwearAbove1000}
                  onChange={(v) => updateField("gstRateFootwearAbove1000", v)}
                />
                <RateField
                  label="Other Goods"
                  value={settings.gstRateOtherGoods}
                  onChange={(v) => updateField("gstRateOtherGoods", v)}
                />
              </div>
            </div>
          </SectionCard>
        </div>

        {/* ─── Section 5: Invoice Configuration ─── */}
        <div
          id="invoice"
          ref={(el) => { sectionRefs.current.invoice = el; }}
        >
          <SectionCard title="Invoice Configuration" icon={FileText} description="Numbering, terms, and signatory">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                label="Invoice Prefix"
                value={settings.invoicePrefix}
                onChange={(v) => updateField("invoicePrefix", v)}
                placeholder='e.g., "SKH"'
              />
              <FormField
                label="Invoice Format"
                value={settings.invoiceFormat}
                onChange={(v) => updateField("invoiceFormat", v)}
                placeholder="e.g., SKH/{SEQ}/{FY}"
              />
              <div>
                <label className="block text-sm font-medium mb-1.5">FY Start Month</label>
                <select
                  value={settings.financialYearStartMonth}
                  onChange={(e) => updateField("financialYearStartMonth", Number(e.target.value))}
                  className="w-full px-3 py-2.5 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background text-sm"
                >
                  {MONTHS.map((m, i) => (
                    <option key={m} value={i + 1}>{m}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium mb-1.5">Terms &amp; Conditions</label>
              <textarea
                value={settings.termsAndConditions}
                onChange={(e) => updateField("termsAndConditions", e.target.value)}
                placeholder="Enter terms and conditions to appear on invoices..."
                rows={4}
                className="w-full px-3 py-2.5 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm resize-y"
              />
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium mb-1.5">Declaration</label>
              <textarea
                value={settings.declaration}
                onChange={(e) => updateField("declaration", e.target.value)}
                placeholder="Enter declaration text..."
                rows={3}
                className="w-full px-3 py-2.5 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm resize-y"
              />
            </div>

            <div className="mt-4">
              <FormField
                label="Authorised Signatory Name"
                value={settings.authorisedSignatoryName}
                onChange={(v) => updateField("authorisedSignatoryName", v)}
                placeholder="Full name of authorised signatory"
              />
            </div>
          </SectionCard>
        </div>
      </div>

      {/* ─── Sidebar-Aware Sticky Save Bar ─── */}
      <div
        className={cn(
          "fixed bottom-0 right-0 z-30",
          "bg-background/90 backdrop-blur-xl border-t border-border",
          saveBarLeft
        )}
      >
        <div className="px-6 py-3 flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground min-w-0">
            {saved ? (
              <span className="flex items-center gap-1.5 text-green-600 font-medium">
                <Check size={15} />
                Settings saved successfully
              </span>
            ) : error ? (
              <span className="flex items-center gap-1.5 text-destructive truncate">
                <AlertCircle size={15} className="shrink-0" />
                {error}
              </span>
            ) : (
              <span className="hidden sm:inline">Make changes and click Save to update</span>
            )}
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={fetchSettings}
              disabled={saving || loading}
              className="px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
            >
              Discard
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium text-sm disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {saving ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Settings"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   Sub-Components
   ================================================================ */

function SectionCard({
  title, icon: Icon, description, children,
}: {
  title: string;
  icon: React.ElementType;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm">
      <div className="flex items-center gap-3 px-6 pt-5 pb-4 border-b border-border/60">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Icon size={16} className="text-primary" />
        </div>
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

function FormField({
  label, value, onChange, placeholder, type = "text", required, error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  error?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "w-full px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm bg-background",
          error ? "border-destructive" : "border-input"
        )}
      />
      <FieldError error={error} />
    </div>
  );
}

function RateField({
  label, value, onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">{label}</label>
      <div className="relative">
        <input
          type="number"
          min={0}
          max={100}
          step={0.5}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full px-3 py-2.5 pr-8 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm bg-background"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">%</span>
      </div>
    </div>
  );
}

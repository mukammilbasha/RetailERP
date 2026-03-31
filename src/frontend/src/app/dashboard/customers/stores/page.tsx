"use client";

import { useState, useEffect, useCallback } from "react";
import api, { type ApiResponse } from "@/lib/api";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/status-badge";
import { FieldError } from "@/components/ui/field-error";
import { required, pattern, PATTERNS, hasErrors, type ValidationError } from "@/lib/validators";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm-dialog";

/* ── Interfaces ── */

interface Client {
  clientId: string;
  clientName: string;
  marginPercent: number;
  zone: string | null;
  isActive: boolean;
}

interface Store {
  storeId: string;
  clientId: string;
  storeCode: string;
  storeName: string;
  format: string;
  isActive: boolean;
}

interface CustomerEntry {
  customerEntryId: string;
  storeId: string;
  clientId: string;
  clientName?: string;
  storeName?: string;
  entryDate: string;
  storeCode: string;
  organisation: string;
  // Billing
  billingAddress1: string;
  billingAddress2: string;
  billingAddress3: string;
  billingAddress4: string;
  billingAddress5: string;
  billingPinCode: string;
  billingCity: string;
  billingNumber: string;
  billingState: string;
  billingStateCode: string;
  billingZone: string;
  // Shipping
  sameAsBilling: boolean;
  shippingAddress1: string;
  shippingAddress2: string;
  shippingAddress3: string;
  shippingPinCode: string;
  shippingCity: string;
  shippingNumber: string;
  shippingState: string;
  shippingStateCode: string;
  shippingZone: string;
  // Contact & Tax
  contactName: string;
  contactNo: string;
  email: string;
  storeManager: string;
  managerContact: string;
  areaManager: string;
  areaContact: string;
  gstin: string;
  gstStateCode: string;
  pan: string;
  // Business Config
  businessChannel: string;
  businessModule: string;
  marginPercent: number;
  marginType: string;
  isActive: boolean;
}

/* ── Constants ── */

const STORE_FORMATS = ["RETAIL MALL", "RETAIL HIGH STREET", "OUTLET"];
const ZONES = ["NORTH", "SOUTH", "EAST", "WEST", "CENTRAL"];

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
];

const STATE_GST_CODE: Record<string, string> = {
  "Jammu and Kashmir": "01", "Himachal Pradesh": "02", "Punjab": "03",
  "Chandigarh": "04", "Uttarakhand": "05", "Haryana": "06", "Delhi": "07",
  "Rajasthan": "08", "Uttar Pradesh": "09", "Bihar": "10", "Sikkim": "11",
  "Arunachal Pradesh": "12", "Nagaland": "13", "Manipur": "14", "Mizoram": "15",
  "Tripura": "16", "Meghalaya": "17", "Assam": "18", "West Bengal": "19",
  "Jharkhand": "20", "Odisha": "21", "Chhattisgarh": "22", "Madhya Pradesh": "23",
  "Gujarat": "24", "Dadra and Nagar Haveli and Daman and Diu": "26",
  "Maharashtra": "27", "Karnataka": "29", "Goa": "30", "Lakshadweep": "31",
  "Kerala": "32", "Tamil Nadu": "33", "Puducherry": "34",
  "Andaman and Nicobar Islands": "35", "Telangana": "36", "Andhra Pradesh": "37", "Ladakh": "38",
};

const GST_CODE_STATE: Record<string, string> = Object.fromEntries(
  Object.entries(STATE_GST_CODE).map(([state, code]) => [code, state])
);

const STATE_ZONE: Record<string, string> = {
  "Delhi": "NORTH", "Haryana": "NORTH", "Punjab": "NORTH", "Himachal Pradesh": "NORTH",
  "Jammu and Kashmir": "NORTH", "Ladakh": "NORTH", "Uttarakhand": "NORTH",
  "Chandigarh": "NORTH", "Uttar Pradesh": "NORTH",
  "Rajasthan": "WEST", "Gujarat": "WEST", "Maharashtra": "WEST", "Goa": "WEST",
  "Dadra and Nagar Haveli and Daman and Diu": "WEST",
  "Madhya Pradesh": "CENTRAL", "Chhattisgarh": "CENTRAL",
  "Karnataka": "SOUTH", "Kerala": "SOUTH", "Tamil Nadu": "SOUTH",
  "Andhra Pradesh": "SOUTH", "Telangana": "SOUTH", "Puducherry": "SOUTH", "Lakshadweep": "SOUTH",
  "West Bengal": "EAST", "Odisha": "EAST", "Bihar": "EAST", "Jharkhand": "EAST",
  "Assam": "EAST", "Arunachal Pradesh": "EAST", "Nagaland": "EAST", "Manipur": "EAST",
  "Mizoram": "EAST", "Tripura": "EAST", "Meghalaya": "EAST", "Sikkim": "EAST",
  "Andaman and Nicobar Islands": "EAST",
};

/* ── Styles ── */

const inputClass = "w-full px-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary";
const selectClass = "w-full px-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background";
const labelClass = "block text-sm font-medium mb-1.5";
const sectionTitleClass = "text-sm font-semibold text-primary border-b pb-2 mb-4";
const readOnlyClass = "w-full px-3 py-2 border border-input rounded-lg text-sm bg-muted/30 font-mono";

/* ── Empty Form ── */

const emptyForm = () => ({
  clientId: "",
  storeId: "",
  storeCode: "",
  storeName: "",
  storeFormat: "",
  organisation: "",
  entryDate: new Date().toISOString().slice(0, 10),
  // Billing
  billingAddress1: "",
  billingAddress2: "",
  billingAddress3: "",
  billingPinCode: "",
  billingCity: "",
  billingState: "",
  billingStateCode: "",
  billingZone: "",
  // Shipping
  sameAsBilling: false,
  shippingAddress1: "",
  shippingAddress2: "",
  shippingAddress3: "",
  shippingPinCode: "",
  shippingCity: "",
  shippingState: "",
  shippingStateCode: "",
  shippingZone: "",
  // Contact & Tax
  contactName: "",
  contactNo: "",
  email: "",
  storeManager: "",
  managerContact: "",
  areaManager: "",
  areaContact: "",
  gstin: "",
  gstStateCode: "",
  pan: "",
  // Business Config
  businessChannel: "",
  businessModule: "",
  marginPercent: 0,
  marginType: "",
  isActive: true,
});

/* ── Component ── */

export default function StoresPage() {
  const [entries, setEntries] = useState<CustomerEntry[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<CustomerEntry | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [errors, setErrors] = useState<ValidationError>({});
  const [billingPincodeLoading, setBillingPincodeLoading] = useState(false);
  const [shippingPincodeLoading, setShippingPincodeLoading] = useState(false);
  const { showToast } = useToast();
  const { confirm: confirmDialog } = useConfirm();

  const updateForm = (field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  /* ── Data Fetching ── */

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<ApiResponse<any>>("/api/customer-entries", {
        params: { searchTerm: search || undefined, pageNumber: page, pageSize: 25 },
      });
      if (data.success) {
        setEntries(data.data?.items || []);
        setTotalCount(data.data?.totalCount || 0);
      }
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  const fetchClients = useCallback(async () => {
    try {
      const { data } = await api.get<ApiResponse<any>>("/api/clients", {
        params: { pageSize: 500 },
      });
      if (data.success) setClients(data.data?.items || []);
    } catch {
      setClients([]);
    }
  }, []);

  const fetchStores = useCallback(async () => {
    try {
      const { data } = await api.get<ApiResponse<any>>("/api/stores", {
        params: { pageSize: 500 },
      });
      if (data.success) setStores(data.data?.items || []);
    } catch {
      setStores([]);
    }
  }, []);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);
  useEffect(() => { fetchClients(); fetchStores(); }, [fetchClients, fetchStores]);

  /* ── Auto-fill helpers ── */

  const lookupPincode = async (pincode: string, prefix: "billing" | "shipping") => {
    if (!/^\d{6}$/.test(pincode)) return;
    const setLoading = prefix === "billing" ? setBillingPincodeLoading : setShippingPincodeLoading;
    setLoading(true);
    try {
      const resp = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
      const [result] = await resp.json();
      if (result?.Status === "Success" && result.PostOffice?.length > 0) {
        const po = result.PostOffice[0];
        const stateName: string = po.State || "";
        const stateCode = STATE_GST_CODE[stateName] || "";
        const zone = STATE_ZONE[stateName] || "";
        setForm((prev) => ({
          ...prev,
          [`${prefix}City`]: po.District || po.Division || po.Name || prev[`${prefix}City` as keyof typeof prev],
          [`${prefix}State`]: stateName || prev[`${prefix}State` as keyof typeof prev],
          [`${prefix}StateCode`]: stateCode || prev[`${prefix}StateCode` as keyof typeof prev],
          [`${prefix}Zone`]: zone || prev[`${prefix}Zone` as keyof typeof prev],
        }));
      }
    } catch {
      // API unavailable — user fills manually
    } finally {
      setLoading(false);
    }
  };

  const handleGstinChange = (val: string) => {
    updateForm("gstin", val);
    if (val.length >= 2) {
      const code = val.substring(0, 2);
      const stateName = GST_CODE_STATE[code];
      // Auto-extract PAN from GSTIN (characters 3-12 are PAN)
      const panFromGstin = val.length >= 12 ? val.substring(2, 12) : "";
      setForm((prev) => ({
        ...prev,
        gstin: val,
        gstStateCode: code,
        ...(panFromGstin ? { pan: panFromGstin } : {}),
        ...(stateName && !prev.billingState ? { billingState: stateName } : {}),
        ...(stateName && !prev.billingZone ? { billingZone: STATE_ZONE[stateName] || prev.billingZone } : {}),
        ...(stateName && !prev.billingStateCode ? { billingStateCode: code } : {}),
      }));
      setErrors((prev) => ({ ...prev, gstin: "", gstStateCode: "", pan: "" }));
    }
  };

  const handleClientChange = (clientId: string) => {
    const client = clients.find((c) => c.clientId === clientId);
    if (client) {
      setForm((prev) => ({
        ...prev,
        clientId,
        billingZone: client.zone || prev.billingZone,
      }));
    } else {
      updateForm("clientId", clientId);
    }
    setErrors((prev) => ({ ...prev, clientId: "" }));
  };

  const handleStoreChange = (storeId: string) => {
    const store = stores.find((s) => s.storeId === storeId);
    if (store) {
      setForm((prev) => ({
        ...prev,
        storeId,
        storeCode: store.storeCode || prev.storeCode,
        storeName: store.storeName || prev.storeName,
        storeFormat: store.format || prev.storeFormat,
        clientId: store.clientId || prev.clientId,
      }));
    } else {
      updateForm("storeId", storeId);
    }
    setErrors((prev) => ({ ...prev, storeId: "" }));
  };

  const handleSameAsBillingToggle = (checked: boolean) => {
    if (checked) {
      setForm((prev) => ({
        ...prev,
        sameAsBilling: true,
        shippingAddress1: prev.billingAddress1,
        shippingAddress2: prev.billingAddress2,
        shippingAddress3: prev.billingAddress3,
        shippingPinCode: prev.billingPinCode,
        shippingCity: prev.billingCity,
        shippingState: prev.billingState,
        shippingStateCode: prev.billingStateCode,
        shippingZone: prev.billingZone,
      }));
    } else {
      updateForm("sameAsBilling", false);
    }
  };

  /* ── Modal open/close ── */

  const openAdd = () => {
    setEditingEntry(null);
    setForm(emptyForm());
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (entry: CustomerEntry) => {
    setEditingEntry(entry);
    setErrors({});
    setForm({
      clientId: entry.clientId || "",
      storeId: entry.storeId || "",
      storeCode: entry.storeCode || "",
      storeName: entry.storeName || "",
      storeFormat: "",
      organisation: entry.organisation || "",
      entryDate: entry.entryDate ? entry.entryDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
      billingAddress1: entry.billingAddress1 || "",
      billingAddress2: entry.billingAddress2 || "",
      billingAddress3: entry.billingAddress3 || "",
      billingPinCode: entry.billingPinCode || "",
      billingCity: entry.billingCity || "",
      billingState: entry.billingState || "",
      billingStateCode: entry.billingStateCode || "",
      billingZone: entry.billingZone || "",
      sameAsBilling: entry.sameAsBilling ?? false,
      shippingAddress1: entry.shippingAddress1 || "",
      shippingAddress2: entry.shippingAddress2 || "",
      shippingAddress3: entry.shippingAddress3 || "",
      shippingPinCode: entry.shippingPinCode || "",
      shippingCity: entry.shippingCity || "",
      shippingState: entry.shippingState || "",
      shippingStateCode: entry.shippingStateCode || "",
      shippingZone: entry.shippingZone || "",
      contactName: entry.contactName || "",
      contactNo: entry.contactNo || "",
      email: entry.email || "",
      storeManager: entry.storeManager || "",
      managerContact: entry.managerContact || "",
      areaManager: entry.areaManager || "",
      areaContact: entry.areaContact || "",
      gstin: entry.gstin || "",
      gstStateCode: entry.gstStateCode || "",
      pan: entry.pan || "",
      businessChannel: entry.businessChannel || "",
      businessModule: entry.businessModule || "",
      marginPercent: entry.marginPercent ?? 0,
      marginType: entry.marginType || "",
      isActive: entry.isActive ?? true,
    });
    setModalOpen(true);
  };

  /* ── Save / Delete ── */

  const handleSave = async () => {
    const newErrors: ValidationError = {
      clientId: required(form.clientId, "Client"),
      storeId: required(form.storeId, "Store"),
      storeCode: required(form.storeCode, "Store Code"),
      gstin: form.gstin ? pattern(form.gstin, PATTERNS.GSTIN, "GSTIN", "e.g. 27AADCB2230M1ZP") : "",
      email: form.email ? pattern(form.email, PATTERNS.EMAIL, "Email") : "",
    };
    if (hasErrors(newErrors)) { setErrors(newErrors); return; }

    const payload = {
      storeId: form.storeId,
      clientId: form.clientId,
      entryDate: form.entryDate,
      storeCode: form.storeCode,
      organisation: form.organisation,
      billingAddress1: form.billingAddress1,
      billingAddress2: form.billingAddress2,
      billingAddress3: form.billingAddress3,
      billingPinCode: form.billingPinCode,
      billingCity: form.billingCity,
      billingState: form.billingState,
      billingStateCode: form.billingStateCode,
      billingZone: form.billingZone,
      sameAsBilling: form.sameAsBilling,
      shippingAddress1: form.sameAsBilling ? form.billingAddress1 : form.shippingAddress1,
      shippingAddress2: form.sameAsBilling ? form.billingAddress2 : form.shippingAddress2,
      shippingAddress3: form.sameAsBilling ? form.billingAddress3 : form.shippingAddress3,
      shippingPinCode: form.sameAsBilling ? form.billingPinCode : form.shippingPinCode,
      shippingCity: form.sameAsBilling ? form.billingCity : form.shippingCity,
      shippingState: form.sameAsBilling ? form.billingState : form.shippingState,
      shippingStateCode: form.sameAsBilling ? form.billingStateCode : form.shippingStateCode,
      shippingZone: form.sameAsBilling ? form.billingZone : form.shippingZone,
      contactName: form.contactName,
      contactNo: form.contactNo,
      email: form.email,
      storeManager: form.storeManager,
      managerContact: form.managerContact,
      areaManager: form.areaManager,
      areaContact: form.areaContact,
      gstin: form.gstin,
      gstStateCode: form.gstStateCode,
      pan: form.pan,
      businessChannel: form.businessChannel,
      businessModule: form.businessModule,
      marginPercent: form.marginPercent,
      marginType: form.marginType || "ON MRP",
      isActive: form.isActive,
    };

    try {
      if (editingEntry) {
        await api.put(`/api/customer-entries/${editingEntry.customerEntryId}`, payload);
      } else {
        await api.post("/api/customer-entries", payload);
      }
      setModalOpen(false);
      showToast("success", editingEntry ? "Customer Entry Updated" : "Customer Entry Created", editingEntry ? "The customer entry has been updated." : "A new customer entry has been created.");
      fetchEntries();
    } catch (err: any) {
      showToast("error", "Failed to Save", err.response?.data?.message || "An error occurred.");
    }
  };

  const handleDelete = async (entry: CustomerEntry) => {
    const confirmed = await confirmDialog({
      title: "Delete Customer Entry",
      message: `Are you sure you want to delete the customer entry for store "${entry.storeName || entry.storeCode}"? This action cannot be undone.`,
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!confirmed) return;
    try {
      await api.delete(`/api/customer-entries/${entry.customerEntryId}`);
      showToast("success", "Deleted", `Customer entry for "${entry.storeName || entry.storeCode}" has been removed.`);
      fetchEntries();
    } catch (err: any) {
      showToast("error", "Failed to Delete", err.response?.data?.message || "An error occurred.");
    }
  };

  /* ── Filtered stores for selected client ── */
  const clientStores = form.clientId
    ? stores.filter((s) => s.clientId === form.clientId && s.isActive)
    : stores.filter((s) => s.isActive);

  /* ── Table columns ── */

  const columns: Column<CustomerEntry>[] = [
    {
      key: "clientName",
      header: "Client",
      render: (e) => e.clientName || clients.find((c) => c.clientId === e.clientId)?.clientName || "-",
    },
    { key: "storeCode", header: "Store Code", className: "font-mono text-xs" },
    {
      key: "storeName",
      header: "Store Name",
      render: (e) => e.storeName || "-",
    },
    { key: "billingCity", header: "City" },
    { key: "billingState", header: "State" },
    { key: "billingZone", header: "Zone" },
    { key: "gstin", header: "GSTIN", className: "font-mono text-xs" },
    { key: "contactName", header: "Primary Contact" },
    {
      key: "isActive",
      header: "Status",
      render: (e) => <StatusBadge status={e.isActive ? "Active" : "Inactive"} />,
    },
  ];

  /* ── Address Section (reusable for billing / shipping) ── */

  const renderAddressSection = (prefix: "billing" | "shipping") => {
    const isBilling = prefix === "billing";
    const pLoading = isBilling ? billingPincodeLoading : shippingPincodeLoading;
    const disabled = !isBilling && form.sameAsBilling;
    const getVal = (field: string) => (form as any)[`${prefix}${field}`] || "";
    const setVal = (field: string, value: string) => updateForm(`${prefix}${field}`, value);

    return (
      <div className={disabled ? "opacity-50 pointer-events-none" : ""}>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Address Line 1</label>
            <input type="text" value={getVal("Address1")} onChange={(e) => setVal("Address1", e.target.value)} placeholder="Address line 1" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Address Line 2</label>
            <input type="text" value={getVal("Address2")} onChange={(e) => setVal("Address2", e.target.value)} placeholder="Address line 2" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Address Line 3</label>
            <input type="text" value={getVal("Address3")} onChange={(e) => setVal("Address3", e.target.value)} placeholder="Address line 3" className={inputClass} />
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4 mt-4">
          <div>
            <label className={labelClass}>
              Pincode {pLoading && <span className="text-xs text-muted-foreground ml-1">(looking up...)</span>}
            </label>
            <input
              type="text"
              value={getVal("PinCode")}
              onChange={(e) => {
                setVal("PinCode", e.target.value);
                if (e.target.value.length === 6) lookupPincode(e.target.value, prefix);
              }}
              placeholder="400001"
              maxLength={6}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>City</label>
            <input type="text" value={getVal("City")} onChange={(e) => setVal("City", e.target.value)} placeholder="City" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>State</label>
            <select
              value={getVal("State")}
              onChange={(e) => {
                const stateName = e.target.value;
                setForm((prev) => ({
                  ...prev,
                  [`${prefix}State`]: stateName,
                  [`${prefix}StateCode`]: STATE_GST_CODE[stateName] || (prev as any)[`${prefix}StateCode`],
                  [`${prefix}Zone`]: STATE_ZONE[stateName] || (prev as any)[`${prefix}Zone`],
                }));
              }}
              className={selectClass}
            >
              <option value="">Select state</option>
              {INDIAN_STATES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>State Code</label>
            <input type="text" value={getVal("StateCode")} readOnly placeholder="27" className={readOnlyClass} maxLength={2} />
          </div>
        </div>
        <div className="mt-4 max-w-xs">
          <label className={labelClass}>Zone</label>
          <select value={getVal("Zone")} onChange={(e) => setVal("Zone", e.target.value)} className={selectClass}>
            <option value="">Select zone</option>
            {ZONES.map((z) => (
              <option key={z} value={z}>{z}</option>
            ))}
          </select>
        </div>
      </div>
    );
  };

  /* ── Render ── */

  return (
    <>
      <DataTable
        title="Customer Master Entry"
        subtitle="Manage customer store entries with billing & shipping details"
        columns={columns}
        data={entries}
        totalCount={totalCount}
        pageNumber={page}
        pageSize={25}
        onPageChange={setPage}
        onSearch={setSearch}
        onAdd={openAdd}
        onEdit={openEdit}
        onDelete={handleDelete}
        onRefresh={fetchEntries}
        onImport={() => {}}
        onExport={() => {}}
        addLabel="Add Store Entry"
        loading={loading}
        keyExtractor={(e) => e.customerEntryId}
        mobileColumns={["storeName", "clientName", "billingCity", "isActive"]}
      />

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingEntry ? "Edit Customer Master Entry" : "Customer Master Entry"}
        subtitle={editingEntry ? "Update store entry details" : "Add a new customer store"}
        size="xl"
      >
        <div className="space-y-6">

          {/* ── Basic Information ── */}
          <div>
            <h3 className={sectionTitleClass}>Basic Information</h3>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className={labelClass}>Date</label>
                <input
                  type="date"
                  value={form.entryDate}
                  onChange={(e) => updateForm("entryDate", e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Client *</label>
                <select
                  value={form.clientId}
                  onChange={(e) => handleClientChange(e.target.value)}
                  className={`${selectClass} ${errors.clientId ? "border-destructive" : ""}`}
                >
                  <option value="">Select client</option>
                  {clients.map((c) => (
                    <option key={c.clientId} value={c.clientId}>{c.clientName}</option>
                  ))}
                </select>
                <FieldError error={errors.clientId} />
              </div>
              <div>
                <label className={labelClass}>Store Format *</label>
                <select
                  value={form.storeFormat}
                  onChange={(e) => updateForm("storeFormat", e.target.value)}
                  className={selectClass}
                >
                  <option value="">Select format</option>
                  {STORE_FORMATS.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Store Code *</label>
                <input
                  type="text"
                  value={form.storeCode}
                  onChange={(e) => updateForm("storeCode", e.target.value)}
                  placeholder="STR-001"
                  className={`${inputClass} ${errors.storeCode ? "border-destructive" : ""}`}
                />
                <FieldError error={errors.storeCode} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className={labelClass}>Store Name *</label>
                <select
                  value={form.storeId}
                  onChange={(e) => handleStoreChange(e.target.value)}
                  className={`${selectClass} ${errors.storeId ? "border-destructive" : ""}`}
                >
                  <option value="">Select store</option>
                  {clientStores.map((s) => (
                    <option key={s.storeId} value={s.storeId}>{s.storeName}</option>
                  ))}
                </select>
                <FieldError error={errors.storeId} />
              </div>
              <div>
                <label className={labelClass}>Organisation</label>
                <input
                  type="text"
                  value={form.organisation}
                  onChange={(e) => updateForm("organisation", e.target.value)}
                  placeholder="Enter organisation"
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {/* ── Billing Address ── */}
          <div>
            <h3 className={sectionTitleClass}>Billing Address</h3>
            {renderAddressSection("billing")}
          </div>

          {/* ── Shipping Address ── */}
          <div>
            <div className="flex items-center justify-between mb-4 border-b pb-2">
              <h3 className="text-sm font-semibold text-primary">Shipping Address</h3>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.sameAsBilling}
                  onChange={(e) => handleSameAsBillingToggle(e.target.checked)}
                  className="h-4 w-4 rounded border-input text-primary focus:ring-primary/20"
                />
                Same as Billing
              </label>
            </div>
            {renderAddressSection("shipping")}
          </div>

          {/* ── Contact & Tax Details ── */}
          <div>
            <h3 className={sectionTitleClass}>Contact & Tax Details</h3>
            {/* Primary Contact */}
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className={labelClass}>Primary Contact Name</label>
                <input type="text" value={form.contactName} onChange={(e) => updateForm("contactName", e.target.value)} placeholder="Primary contact person" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Primary Contact No</label>
                <input type="text" value={form.contactNo} onChange={(e) => updateForm("contactNo", e.target.value)} placeholder="9876543210" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Primary Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => updateForm("email", e.target.value)}
                  placeholder="store@company.com"
                  className={`${inputClass} ${errors.email ? "border-destructive" : ""}`}
                />
                <FieldError error={errors.email} />
              </div>
              <div>
                <label className={labelClass}>Store Manager</label>
                <input type="text" value={form.storeManager} onChange={(e) => updateForm("storeManager", e.target.value)} placeholder="Manager name" className={inputClass} />
              </div>
            </div>
            {/* Secondary Contact */}
            <div className="grid grid-cols-4 gap-4 mt-4">
              <div>
                <label className={labelClass}>Secondary Contact Name</label>
                <input type="text" value={form.managerContact} onChange={(e) => updateForm("managerContact", e.target.value)} placeholder="Secondary contact person" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Secondary Contact No</label>
                <input type="text" value={form.areaManager} onChange={(e) => updateForm("areaManager", e.target.value)} placeholder="9876543210" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Secondary Email</label>
                <input type="email" value={form.areaContact} onChange={(e) => updateForm("areaContact", e.target.value)} placeholder="secondary@company.com" className={inputClass} />
              </div>
              <div className="col-span-1" />
            </div>
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div>
                <label className={labelClass}>GST TIN No</label>
                <input
                  type="text"
                  value={form.gstin}
                  onChange={(e) => handleGstinChange(e.target.value.toUpperCase())}
                  placeholder="23AADCB2230M1ZP"
                  className={`${inputClass} font-mono ${errors.gstin ? "border-destructive" : ""}`}
                  maxLength={15}
                />
                <FieldError error={errors.gstin} />
              </div>
              <div>
                <label className={labelClass}>GST State Code <span className="text-xs text-muted-foreground">(auto)</span></label>
                <input type="text" value={form.gstStateCode} readOnly placeholder="27" className={readOnlyClass} />
              </div>
              <div>
                <label className={labelClass}>PAN No <span className="text-xs text-muted-foreground">(auto from GST)</span></label>
                <input
                  type="text"
                  value={form.pan}
                  onChange={(e) => updateForm("pan", e.target.value.toUpperCase())}
                  placeholder="AADCB2230M"
                  className={`${form.gstin && form.gstin.length >= 12 ? readOnlyClass : `${inputClass} font-mono`}`}
                  readOnly={!!(form.gstin && form.gstin.length >= 12)}
                  maxLength={10}
                />
              </div>
            </div>
          </div>

          {/* ── Action Buttons ── */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-sm border rounded-lg hover:bg-muted"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium"
            >
              {editingEntry ? "Update" : "Save"}
            </button>
          </div>

        </div>
      </Modal>
    </>
  );
}

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

interface Client {
  clientId: string;
  clientCode: string;
  clientName: string;
  organisation: string;
  gstin: string;
  state: string;
  stateCode: string;
  zone: string;
  email: string;
  contactNo: string;
  marginPercent: number;
  isActive: boolean;
}

// GST state code map (state name → 2-digit code)
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

// Reverse map: GST code → state name
const GST_CODE_STATE: Record<string, string> = Object.fromEntries(
  Object.entries(STATE_GST_CODE).map(([s, c]) => [c, s])
);

// State → zone mapping
const STATE_ZONE: Record<string, string> = {
  "Delhi": "NORTH", "Haryana": "NORTH", "Punjab": "NORTH", "Uttarakhand": "NORTH",
  "Himachal Pradesh": "NORTH", "Jammu and Kashmir": "NORTH", "Ladakh": "NORTH",
  "Uttar Pradesh": "NORTH", "Rajasthan": "NORTH", "Chandigarh": "NORTH",
  "Maharashtra": "WEST", "Gujarat": "WEST", "Goa": "WEST",
  "Dadra and Nagar Haveli and Daman and Diu": "WEST", "Lakshadweep": "WEST",
  "Tamil Nadu": "SOUTH", "Kerala": "SOUTH", "Karnataka": "SOUTH",
  "Telangana": "SOUTH", "Andhra Pradesh": "SOUTH", "Puducherry": "SOUTH",
  "Andaman and Nicobar Islands": "SOUTH",
  "West Bengal": "EAST", "Bihar": "EAST", "Jharkhand": "EAST",
  "Odisha": "EAST", "Sikkim": "EAST", "Arunachal Pradesh": "EAST",
  "Nagaland": "EAST", "Manipur": "EAST", "Mizoram": "EAST",
  "Tripura": "EAST", "Meghalaya": "EAST", "Assam": "EAST",
  "Madhya Pradesh": "CENTRAL", "Chhattisgarh": "CENTRAL",
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

const ZONES = ["NORTH", "SOUTH", "EAST", "WEST", "CENTRAL"];

const inputClass = "w-full px-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary";
const selectClass = "w-full px-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background";
const labelClass = "block text-sm font-medium mb-1.5";

const emptyForm = () => ({
  clientCode: "",
  clientName: "",
  organisation: "",
  gstin: "",
  state: "",
  stateCode: "",
  zone: "",
  email: "",
  contactNo: "",
  marginPercent: 0,
  isActive: true,
});

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [errors, setErrors] = useState<ValidationError>({});
  const { showToast } = useToast();
  const { confirm } = useConfirm();

  const updateForm = (field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<ApiResponse<any>>("/api/clients", {
        params: { searchTerm: search || undefined, pageNumber: page, pageSize: 25 },
      });
      if (data.success) {
        setClients(data.data?.items || []);
        setTotalCount(data.data?.totalCount || 0);
      }
    } catch {
      setClients([]);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const openAdd = () => {
    setEditingClient(null);
    setForm(emptyForm());
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (client: Client) => {
    setEditingClient(client);
    setErrors({});
    setForm({
      clientCode: client.clientCode || "",
      clientName: client.clientName || "",
      organisation: client.organisation || "",
      gstin: client.gstin || "",
      state: client.state || "",
      stateCode: client.stateCode || "",
      zone: client.zone || "",
      email: client.email || "",
      contactNo: client.contactNo || "",
      marginPercent: client.marginPercent ?? 0,
      isActive: client.isActive ?? true,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    const newErrors: ValidationError = {
      clientName: required(form.clientName, "Client Name"),
      clientCode: required(form.clientCode, "Client Code"),
      organisation: required(form.organisation, "Organisation"),
      gstin: pattern(form.gstin, PATTERNS.GSTIN, "GSTIN", "e.g. 27AADCB2230M1ZP"),
      state: required(form.state, "State"),
      zone: required(form.zone, "Zone"),
      contactNo: pattern(form.contactNo, PATTERNS.PHONE, "Contact No", "10-digit mobile number"),
      email: pattern(form.email, PATTERNS.EMAIL, "Email", "valid email address"),
    };
    if (hasErrors(newErrors)) { setErrors(newErrors); return; }
    try {
      if (editingClient) {
        await api.put(`/api/clients/${editingClient.clientId}`, form);
        showToast("success", "Client Updated", `"${form.clientName}" has been updated successfully.`);
      } else {
        await api.post("/api/clients", form);
        showToast("success", "Client Created", `"${form.clientName}" has been added successfully.`);
      }
      setModalOpen(false);
      fetchClients();
    } catch (err: any) {
      showToast("error", "Failed to Save", err.response?.data?.message || "An error occurred while saving the client.");
    }
  };

  const handleDelete = async (client: Client) => {
    const confirmed = await confirm({
      title: "Delete Client",
      message: `Are you sure you want to delete "${client.clientName}"? This action cannot be undone.`,
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!confirmed) return;
    try {
      await api.delete(`/api/clients/${client.clientId}`);
      showToast("success", "Client Deleted", `"${client.clientName}" has been removed.`);
      fetchClients();
    } catch (err: any) {
      showToast("error", "Failed to Delete", err.response?.data?.message || "An error occurred while deleting the client.");
    }
  };

  const columns: Column<Client>[] = [
    { key: "clientCode", header: "Code", className: "font-mono text-xs" },
    { key: "clientName", header: "Client Name" },
    { key: "organisation", header: "Organisation" },
    { key: "gstin", header: "GSTIN", className: "font-mono text-xs" },
    { key: "state", header: "State" },
    { key: "stateCode", header: "St. Code", className: "font-mono text-xs" },
    { key: "zone", header: "Zone" },
    { key: "email", header: "Email" },
    { key: "contactNo", header: "Contact" },
    {
      key: "marginPercent",
      header: "Margin %",
      className: "text-right",
      render: (c) => `${c.marginPercent}%`,
    },
    {
      key: "isActive",
      header: "Status",
      render: (c) => <StatusBadge status={c.isActive ? "Active" : "Inactive"} />,
    },
  ];

  return (
    <>
      <DataTable
        title="Clients"
        subtitle="Manage your distribution clients and margin configuration"
        columns={columns}
        data={clients}
        totalCount={totalCount}
        pageNumber={page}
        pageSize={25}
        onPageChange={setPage}
        onSearch={setSearch}
        onAdd={openAdd}
        onEdit={openEdit}
        onDelete={handleDelete}
        onRefresh={fetchClients}
        onImport={() => {}}
        onExport={() => {}}
        addLabel="Add Client"
        loading={loading}
        keyExtractor={(c) => c.clientId}
      />

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingClient ? "Edit Client" : "Add New Client"}
        subtitle={editingClient ? "Update client details" : "Add a new B2B distribution client"}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Client Name *</label>
              <input
                type="text"
                value={form.clientName}
                onChange={(e) => updateForm("clientName", e.target.value)}
                placeholder="INC.5"
                className={`${inputClass} ${errors.clientName ? "border-destructive" : ""}`}
              />
              <FieldError error={errors.clientName} />
            </div>
            <div>
              <label className={labelClass}>Code *</label>
              <input
                type="text"
                value={form.clientCode}
                onChange={(e) => updateForm("clientCode", e.target.value)}
                placeholder="INC5"
                className={`${inputClass} ${errors.clientCode ? "border-destructive" : ""}`}
              />
              <FieldError error={errors.clientCode} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Organisation *</label>
            <input
              type="text"
              value={form.organisation}
              onChange={(e) => updateForm("organisation", e.target.value)}
              placeholder="INC.5 SHOES PRIVATE LIMITED"
              className={`${inputClass} ${errors.organisation ? "border-destructive" : ""}`}
            />
            <FieldError error={errors.organisation} />
          </div>
          <div>
            <label className={labelClass}>GSTIN *</label>
            <input
              type="text"
              value={form.gstin}
              onChange={(e) => {
                const val = e.target.value.toUpperCase();
                if (val.length >= 2) {
                  const code = val.substring(0, 2);
                  const stateName = GST_CODE_STATE[code] || "";
                  const zone = stateName ? (STATE_ZONE[stateName] || "") : "";
                  setForm((prev) => ({
                    ...prev,
                    gstin: val,
                    stateCode: code,
                    ...(stateName ? { state: stateName } : {}),
                    ...(zone ? { zone } : {}),
                  }));
                } else {
                  setForm((prev) => ({ ...prev, gstin: val }));
                }
                setErrors((prev) => ({ ...prev, gstin: "" }));
              }}
              placeholder="23AADCI3682G1ZP"
              maxLength={15}
              className={`${inputClass} font-mono ${errors.gstin ? "border-destructive" : ""}`}
            />
            <FieldError error={errors.gstin} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>State *</label>
              <select
                value={form.state}
                onChange={(e) => {
                  const stateName = e.target.value;
                  setForm((prev) => ({
                    ...prev,
                    state: stateName,
                    stateCode: STATE_GST_CODE[stateName] || prev.stateCode,
                    zone: STATE_ZONE[stateName] || prev.zone,
                  }));
                  setErrors((prev) => ({ ...prev, state: "" }));
                }}
                className={`${selectClass} ${errors.state ? "border-destructive" : ""}`}
              >
                <option value="">Select state</option>
                {INDIAN_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <FieldError error={errors.state} />
            </div>
            <div>
              <label className={labelClass}>State Code <span className="text-xs text-muted-foreground">(auto)</span></label>
              <input
                type="text"
                value={form.stateCode}
                onChange={(e) => updateForm("stateCode", e.target.value)}
                placeholder="23"
                className={`${inputClass} font-mono`}
              />
            </div>
            <div>
              <label className={labelClass}>Zone *</label>
              <select
                value={form.zone}
                onChange={(e) => updateForm("zone", e.target.value)}
                className={`${selectClass} ${errors.zone ? "border-destructive" : ""}`}
              >
                <option value="">Select zone</option>
                {ZONES.map((z) => (
                  <option key={z} value={z}>{z}</option>
                ))}
              </select>
              <FieldError error={errors.zone} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Contact No *</label>
              <input
                type="text"
                value={form.contactNo}
                onChange={(e) => updateForm("contactNo", e.target.value)}
                placeholder="9876543210"
                className={`${inputClass} ${errors.contactNo ? "border-destructive" : ""}`}
              />
              <FieldError error={errors.contactNo} />
            </div>
            <div>
              <label className={labelClass}>Email *</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => updateForm("email", e.target.value)}
                placeholder="info@client.com"
                className={`${inputClass} ${errors.email ? "border-destructive" : ""}`}
              />
              <FieldError error={errors.email} />
            </div>
            <div>
              <label className={labelClass}>Margin %</label>
              <input
                type="number"
                value={form.marginPercent}
                onChange={(e) => updateForm("marginPercent", parseFloat(e.target.value) || 0)}
                placeholder="0"
                className={inputClass}
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => updateForm("isActive", !form.isActive)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.isActive ? "bg-primary" : "bg-gray-300"}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.isActive ? "translate-x-6" : "translate-x-1"}`}
              />
            </button>
            <span className="text-sm">Active</span>
          </div>
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
              {editingClient ? "Update Client" : "Add Client"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

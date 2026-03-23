"use client";

import { useState, useEffect, useCallback } from "react";
import api, { type ApiResponse } from "@/lib/api";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/status-badge";

interface Client {
  clientId: string;
  clientName: string;
}

interface Store {
  storeId: string;
  clientId: string;
  clientName: string;
  storeCode: string;
  storeName: string;
  storeFormat: string;
  organisation: string;
  city: string;
  state: string;
  stateCode: string;
  zone: string;
  channel: string;
  module: string;
  marginPercent: number;
  marginType: string;
  managerName: string;
  email: string;
  gstin: string;
  pan: string;
  isActive: boolean;
  // Billing Address
  billingAddress1: string;
  billingAddress2: string;
  billingAddress3: string;
  billingPincode: string;
  billingCity: string;
  billingState: string;
  billingStateCode: string;
  billingZone: string;
  // Shipping Address
  shippingAddress1: string;
  shippingAddress2: string;
  shippingAddress3: string;
  shippingPincode: string;
  shippingCity: string;
  shippingState: string;
  shippingStateCode: string;
  shippingZone: string;
  // Contact details
  contactName: string;
  contactNo: string;
  managerContact: string;
  areaManager: string;
  areaManagerContact: string;
  gstStateCode: string;
  date: string;
}

const emptyForm = (): Omit<Store, "storeId" | "clientName"> => ({
  clientId: "",
  storeCode: "",
  storeName: "",
  storeFormat: "",
  organisation: "",
  city: "",
  state: "",
  stateCode: "",
  zone: "",
  channel: "",
  module: "",
  marginPercent: 0,
  marginType: "",
  managerName: "",
  email: "",
  gstin: "",
  pan: "",
  isActive: true,
  billingAddress1: "",
  billingAddress2: "",
  billingAddress3: "",
  billingPincode: "",
  billingCity: "",
  billingState: "",
  billingStateCode: "",
  billingZone: "",
  shippingAddress1: "",
  shippingAddress2: "",
  shippingAddress3: "",
  shippingPincode: "",
  shippingCity: "",
  shippingState: "",
  shippingStateCode: "",
  shippingZone: "",
  contactName: "",
  contactNo: "",
  managerContact: "",
  areaManager: "",
  areaManagerContact: "",
  gstStateCode: "",
  date: new Date().toISOString().slice(0, 10),
});

const STORE_FORMATS = ["RETAIL MALL", "RETAIL HIGH STREET", "OUTLET"];
const CHANNELS = ["MBO", "EBO", "ECOM", "DISTRIBUTOR"];
const MODULES = ["SOR", "OUT RATE"];
const MARGIN_TYPES = ["NET OF TAXES", "GROSS"];

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
];

const inputClass = "w-full px-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary";
const selectClass = "w-full px-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background";
const labelClass = "block text-sm font-medium mb-1.5";
const sectionTitleClass = "text-sm font-semibold text-primary border-b pb-2 mb-4";

export default function StoresPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [sameAsBilling, setSameAsBilling] = useState(false);

  const updateForm = (field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const fetchStores = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<ApiResponse<any>>("/api/stores", {
        params: { searchTerm: search || undefined, pageNumber: page, pageSize: 25 },
      });
      if (data.success) {
        setStores(data.data?.items || []);
        setTotalCount(data.data?.totalCount || 0);
      }
    } catch {
      setStores([]);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  const fetchClients = useCallback(async () => {
    try {
      const { data } = await api.get<ApiResponse<any>>("/api/clients", {
        params: { pageSize: 500 },
      });
      if (data.success) {
        setClients(data.data?.items || []);
      }
    } catch {
      setClients([]);
    }
  }, []);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  useEffect(() => {
    if (sameAsBilling) {
      setForm((prev) => ({
        ...prev,
        shippingAddress1: prev.billingAddress1,
        shippingAddress2: prev.billingAddress2,
        shippingAddress3: prev.billingAddress3,
        shippingPincode: prev.billingPincode,
        shippingCity: prev.billingCity,
        shippingState: prev.billingState,
        shippingStateCode: prev.billingStateCode,
        shippingZone: prev.billingZone,
      }));
    }
  }, [
    sameAsBilling,
    form.billingAddress1,
    form.billingAddress2,
    form.billingAddress3,
    form.billingPincode,
    form.billingCity,
    form.billingState,
    form.billingStateCode,
    form.billingZone,
  ]);

  const openAdd = () => {
    setEditingStore(null);
    setForm(emptyForm());
    setSameAsBilling(false);
    setModalOpen(true);
  };

  const openEdit = (store: Store) => {
    setEditingStore(store);
    const { storeId, clientName, ...rest } = store;
    setForm({ ...emptyForm(), ...rest });
    setSameAsBilling(false);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.storeName.trim() || !form.storeCode.trim() || !form.clientId) return;
    try {
      if (editingStore) {
        await api.put(`/api/stores/${editingStore.storeId}`, form);
      } else {
        await api.post("/api/stores", form);
      }
      setModalOpen(false);
      fetchStores();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to save store");
    }
  };

  const handleDelete = async (store: Store) => {
    if (!confirm(`Delete store "${store.storeName}"?`)) return;
    try {
      await api.delete(`/api/stores/${store.storeId}`);
      fetchStores();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to delete store");
    }
  };

  const columns: Column<Store>[] = [
    {
      key: "clientName",
      header: "Client",
      render: (s) => s.clientName || clients.find((c) => c.clientId === s.clientId)?.clientName || "-",
    },
    { key: "storeCode", header: "Store Code", className: "font-mono text-xs" },
    { key: "storeName", header: "Store Name" },
    { key: "storeFormat", header: "Format" },
    { key: "organisation", header: "Organisation" },
    { key: "city", header: "City" },
    { key: "state", header: "State" },
    { key: "channel", header: "Channel" },
    { key: "module", header: "Module" },
    {
      key: "marginPercent",
      header: "Margin %",
      className: "text-right",
      render: (s) => `${s.marginPercent}%`,
    },
    { key: "marginType", header: "Margin Type" },
    { key: "managerName", header: "Manager" },
    { key: "email", header: "Email" },
    { key: "gstin", header: "GSTIN", className: "font-mono text-xs" },
    { key: "pan", header: "PAN", className: "font-mono text-xs" },
    {
      key: "isActive",
      header: "Status",
      render: (s) => <StatusBadge status={s.isActive ? "Active" : "Inactive"} />,
    },
  ];

  return (
    <>
      <DataTable
        title="Stores"
        subtitle="Manage customer stores and retail locations"
        columns={columns}
        data={stores}
        totalCount={totalCount}
        pageNumber={page}
        pageSize={25}
        onPageChange={setPage}
        onSearch={setSearch}
        onAdd={openAdd}
        onEdit={openEdit}
        onDelete={handleDelete}
        onImport={() => {}}
        onExport={() => {}}
        addLabel="Add Store"
        loading={loading}
        keyExtractor={(s) => s.storeId}
      />

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingStore ? "Edit Store" : "Customer Master Entry"}
        subtitle={editingStore ? "Update store details" : "Add a new customer store"}
        size="xl"
      >
        <div className="space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className={sectionTitleClass}>Basic Information</h3>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className={labelClass}>Date</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => updateForm("date", e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Client *</label>
                <select
                  value={form.clientId}
                  onChange={(e) => updateForm("clientId", e.target.value)}
                  className={selectClass}
                >
                  <option value="">Select client</option>
                  {clients.map((c) => (
                    <option key={c.clientId} value={c.clientId}>
                      {c.clientName}
                    </option>
                  ))}
                </select>
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
                  className={inputClass}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className={labelClass}>Store Name *</label>
                <input
                  type="text"
                  value={form.storeName}
                  onChange={(e) => updateForm("storeName", e.target.value)}
                  placeholder="Enter store name"
                  className={inputClass}
                />
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

          {/* Billing Address */}
          <div>
            <h3 className={sectionTitleClass}>Billing Address</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>Address Line 1</label>
                <input
                  type="text"
                  value={form.billingAddress1}
                  onChange={(e) => updateForm("billingAddress1", e.target.value)}
                  placeholder="Address line 1"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Address Line 2</label>
                <input
                  type="text"
                  value={form.billingAddress2}
                  onChange={(e) => updateForm("billingAddress2", e.target.value)}
                  placeholder="Address line 2"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Address Line 3</label>
                <input
                  type="text"
                  value={form.billingAddress3}
                  onChange={(e) => updateForm("billingAddress3", e.target.value)}
                  placeholder="Address line 3"
                  className={inputClass}
                />
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4 mt-4">
              <div>
                <label className={labelClass}>Pincode</label>
                <input
                  type="text"
                  value={form.billingPincode}
                  onChange={(e) => updateForm("billingPincode", e.target.value)}
                  placeholder="400001"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>City</label>
                <input
                  type="text"
                  value={form.billingCity}
                  onChange={(e) => updateForm("billingCity", e.target.value)}
                  placeholder="City"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>State</label>
                <select
                  value={form.billingState}
                  onChange={(e) => updateForm("billingState", e.target.value)}
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
                <input
                  type="text"
                  value={form.billingStateCode}
                  onChange={(e) => updateForm("billingStateCode", e.target.value)}
                  placeholder="27"
                  className={inputClass}
                />
              </div>
            </div>
            <div className="mt-4">
              <label className={labelClass}>Zone</label>
              <input
                type="text"
                value={form.billingZone}
                onChange={(e) => updateForm("billingZone", e.target.value)}
                placeholder="WEST"
                className={`${inputClass} max-w-xs`}
              />
            </div>
          </div>

          {/* Shipping Address */}
          <div>
            <div className="flex items-center justify-between border-b pb-2 mb-4">
              <h3 className="text-sm font-semibold text-primary">Shipping Address</h3>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={sameAsBilling}
                  onChange={(e) => setSameAsBilling(e.target.checked)}
                  className="rounded border-input"
                />
                Same as Billing
              </label>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>Address Line 1</label>
                <input
                  type="text"
                  value={form.shippingAddress1}
                  onChange={(e) => updateForm("shippingAddress1", e.target.value)}
                  placeholder="Address line 1"
                  className={inputClass}
                  disabled={sameAsBilling}
                />
              </div>
              <div>
                <label className={labelClass}>Address Line 2</label>
                <input
                  type="text"
                  value={form.shippingAddress2}
                  onChange={(e) => updateForm("shippingAddress2", e.target.value)}
                  placeholder="Address line 2"
                  className={inputClass}
                  disabled={sameAsBilling}
                />
              </div>
              <div>
                <label className={labelClass}>Address Line 3</label>
                <input
                  type="text"
                  value={form.shippingAddress3}
                  onChange={(e) => updateForm("shippingAddress3", e.target.value)}
                  placeholder="Address line 3"
                  className={inputClass}
                  disabled={sameAsBilling}
                />
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4 mt-4">
              <div>
                <label className={labelClass}>Pincode</label>
                <input
                  type="text"
                  value={form.shippingPincode}
                  onChange={(e) => updateForm("shippingPincode", e.target.value)}
                  placeholder="400001"
                  className={inputClass}
                  disabled={sameAsBilling}
                />
              </div>
              <div>
                <label className={labelClass}>City</label>
                <input
                  type="text"
                  value={form.shippingCity}
                  onChange={(e) => updateForm("shippingCity", e.target.value)}
                  placeholder="City"
                  className={inputClass}
                  disabled={sameAsBilling}
                />
              </div>
              <div>
                <label className={labelClass}>State</label>
                <select
                  value={form.shippingState}
                  onChange={(e) => updateForm("shippingState", e.target.value)}
                  className={selectClass}
                  disabled={sameAsBilling}
                >
                  <option value="">Select state</option>
                  {INDIAN_STATES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>State Code</label>
                <input
                  type="text"
                  value={form.shippingStateCode}
                  onChange={(e) => updateForm("shippingStateCode", e.target.value)}
                  placeholder="27"
                  className={inputClass}
                  disabled={sameAsBilling}
                />
              </div>
            </div>
            <div className="mt-4">
              <label className={labelClass}>Zone</label>
              <input
                type="text"
                value={form.shippingZone}
                onChange={(e) => updateForm("shippingZone", e.target.value)}
                placeholder="WEST"
                className={`${inputClass} max-w-xs`}
                disabled={sameAsBilling}
              />
            </div>
          </div>

          {/* Contact & Tax Details */}
          <div>
            <h3 className={sectionTitleClass}>Contact & Tax Details</h3>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className={labelClass}>Contact Name</label>
                <input
                  type="text"
                  value={form.contactName}
                  onChange={(e) => updateForm("contactName", e.target.value)}
                  placeholder="Contact person"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Contact No</label>
                <input
                  type="text"
                  value={form.contactNo}
                  onChange={(e) => updateForm("contactNo", e.target.value)}
                  placeholder="9876543210"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => updateForm("email", e.target.value)}
                  placeholder="store@company.com"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Store Manager</label>
                <input
                  type="text"
                  value={form.managerName}
                  onChange={(e) => updateForm("managerName", e.target.value)}
                  placeholder="Manager name"
                  className={inputClass}
                />
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4 mt-4">
              <div>
                <label className={labelClass}>Manager Contact</label>
                <input
                  type="text"
                  value={form.managerContact}
                  onChange={(e) => updateForm("managerContact", e.target.value)}
                  placeholder="9876543210"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Area Manager</label>
                <input
                  type="text"
                  value={form.areaManager}
                  onChange={(e) => updateForm("areaManager", e.target.value)}
                  placeholder="Area manager name"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>AM Contact</label>
                <input
                  type="text"
                  value={form.areaManagerContact}
                  onChange={(e) => updateForm("areaManagerContact", e.target.value)}
                  placeholder="9876543210"
                  className={inputClass}
                />
              </div>
              <div />
            </div>
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div>
                <label className={labelClass}>GST TIN No</label>
                <input
                  type="text"
                  value={form.gstin}
                  onChange={(e) => updateForm("gstin", e.target.value)}
                  placeholder="23AADCI3682G1ZP"
                  className={`${inputClass} font-mono`}
                />
              </div>
              <div>
                <label className={labelClass}>GST State Code</label>
                <input
                  type="text"
                  value={form.gstStateCode}
                  onChange={(e) => updateForm("gstStateCode", e.target.value)}
                  placeholder="27"
                  className={`${inputClass} font-mono`}
                />
              </div>
              <div>
                <label className={labelClass}>PAN No</label>
                <input
                  type="text"
                  value={form.pan}
                  onChange={(e) => updateForm("pan", e.target.value)}
                  placeholder="AADCI3682G"
                  className={`${inputClass} font-mono`}
                />
              </div>
            </div>
          </div>

          {/* Business Configuration */}
          <div>
            <h3 className={sectionTitleClass}>Business Configuration</h3>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className={labelClass}>Business Channel *</label>
                <select
                  value={form.channel}
                  onChange={(e) => updateForm("channel", e.target.value)}
                  className={selectClass}
                >
                  <option value="">Select channel</option>
                  {CHANNELS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Business Module *</label>
                <select
                  value={form.module}
                  onChange={(e) => updateForm("module", e.target.value)}
                  className={selectClass}
                >
                  <option value="">Select module</option>
                  {MODULES.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
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
              <div>
                <label className={labelClass}>Margin Type</label>
                <select
                  value={form.marginType}
                  onChange={(e) => updateForm("marginType", e.target.value)}
                  className={selectClass}
                >
                  <option value="">Select type</option>
                  {MARGIN_TYPES.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-center gap-3 mt-4">
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
          </div>

          {/* Action Buttons */}
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
              {editingStore ? "Update Store" : "Save"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

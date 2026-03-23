"use client";

import { useState, useEffect, useCallback } from "react";
import api, { type ApiResponse } from "@/lib/api";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/status-badge";

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

  const updateForm = (field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
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
    setModalOpen(true);
  };

  const openEdit = (client: Client) => {
    setEditingClient(client);
    setForm({
      clientCode: client.clientCode,
      clientName: client.clientName,
      organisation: client.organisation,
      gstin: client.gstin,
      state: client.state,
      stateCode: client.stateCode || "",
      zone: client.zone,
      email: client.email,
      contactNo: client.contactNo,
      marginPercent: client.marginPercent,
      isActive: client.isActive,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.clientName.trim() || !form.clientCode.trim()) return;
    try {
      if (editingClient) {
        await api.put(`/api/clients/${editingClient.clientId}`, form);
      } else {
        await api.post("/api/clients", form);
      }
      setModalOpen(false);
      fetchClients();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to save client");
    }
  };

  const handleDelete = async (client: Client) => {
    if (!confirm(`Delete client "${client.clientName}"?`)) return;
    try {
      await api.delete(`/api/clients/${client.clientId}`);
      fetchClients();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to delete client");
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
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Code *</label>
              <input
                type="text"
                value={form.clientCode}
                onChange={(e) => updateForm("clientCode", e.target.value)}
                placeholder="INC5"
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Organisation *</label>
            <input
              type="text"
              value={form.organisation}
              onChange={(e) => updateForm("organisation", e.target.value)}
              placeholder="INC.5 SHOES PRIVATE LIMITED"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>GSTIN *</label>
            <input
              type="text"
              value={form.gstin}
              onChange={(e) => updateForm("gstin", e.target.value)}
              placeholder="23AADCI3682G1ZP"
              className={`${inputClass} font-mono`}
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>State *</label>
              <select
                value={form.state}
                onChange={(e) => updateForm("state", e.target.value)}
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
                className={selectClass}
              >
                <option value="">Select zone</option>
                {ZONES.map((z) => (
                  <option key={z} value={z}>{z}</option>
                ))}
              </select>
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
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Email *</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => updateForm("email", e.target.value)}
                placeholder="info@client.com"
                className={inputClass}
              />
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

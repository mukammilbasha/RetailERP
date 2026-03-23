"use client";

import { useState, useEffect, useCallback } from "react";
import api, { type ApiResponse } from "@/lib/api";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/status-badge";
import { FieldError } from "@/components/ui/field-error";
import {
  required,
  minLength,
  maxLength,
  hasErrors,
  type ValidationError,
} from "@/lib/validators";

interface Warehouse {
  warehouseId: string;
  warehouseCode: string;
  warehouseName: string;
  address: string;
  city: string;
  state: string;
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

const inputClass = "w-full px-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary";
const selectClass = "w-full px-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background";
const labelClass = "block text-sm font-medium mb-1.5";

const emptyForm = () => ({
  warehouseCode: "",
  warehouseName: "",
  address: "",
  city: "",
  state: "",
  isActive: true,
});

export default function WarehousePage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [errors, setErrors] = useState<ValidationError>({});

  const updateForm = (field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const fetchWarehouses = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<ApiResponse<any>>("/api/warehouses", {
        params: { searchTerm: search || undefined, pageNumber: page, pageSize: 25 },
      });
      if (data.success) {
        setWarehouses(data.data?.items || []);
        setTotalCount(data.data?.totalCount || 0);
      }
    } catch {
      setWarehouses([]);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchWarehouses();
  }, [fetchWarehouses]);

  const openAdd = () => {
    setEditingWarehouse(null);
    setForm(emptyForm());
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (warehouse: Warehouse) => {
    setEditingWarehouse(warehouse);
    setForm({
      warehouseCode: warehouse.warehouseCode,
      warehouseName: warehouse.warehouseName,
      address: warehouse.address || "",
      city: warehouse.city,
      state: warehouse.state,
      isActive: warehouse.isActive,
    });
    setErrors({});
    setModalOpen(true);
  };

  const handleSave = async () => {
    const newErrors: ValidationError = {
      warehouseCode:
        required(form.warehouseCode, "Warehouse Code") ||
        minLength(form.warehouseCode, 2, "Warehouse Code") ||
        maxLength(form.warehouseCode, 10, "Warehouse Code"),
      warehouseName:
        required(form.warehouseName, "Warehouse Name") ||
        minLength(form.warehouseName, 3, "Warehouse Name"),
      city: required(form.city, "City"),
    };

    if (hasErrors(newErrors)) {
      setErrors(newErrors);
      return;
    }

    try {
      if (editingWarehouse) {
        await api.put(`/api/warehouses/${editingWarehouse.warehouseId}`, form);
      } else {
        await api.post("/api/warehouses", form);
      }
      setModalOpen(false);
      fetchWarehouses();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to save warehouse");
    }
  };

  const handleDelete = async (warehouse: Warehouse) => {
    if (!confirm(`Delete warehouse "${warehouse.warehouseName}"?`)) return;
    try {
      await api.delete(`/api/warehouses/${warehouse.warehouseId}`);
      fetchWarehouses();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to delete warehouse");
    }
  };

  const columns: Column<Warehouse>[] = [
    { key: "warehouseCode", header: "Code", className: "font-mono" },
    { key: "warehouseName", header: "Warehouse Name" },
    { key: "address", header: "Address" },
    { key: "city", header: "City" },
    { key: "state", header: "State" },
    {
      key: "isActive",
      header: "Status",
      render: (w) => <StatusBadge status={w.isActive ? "Active" : "Inactive"} />,
    },
  ];

  return (
    <>
      <DataTable
        title="Warehouses"
        subtitle="Manage distribution warehouses"
        columns={columns}
        data={warehouses}
        totalCount={totalCount}
        pageNumber={page}
        pageSize={25}
        onPageChange={setPage}
        onSearch={setSearch}
        onAdd={openAdd}
        onEdit={openEdit}
        onDelete={handleDelete}
        addLabel="Add Warehouse"
        loading={loading}
        keyExtractor={(w) => w.warehouseId}
      />

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingWarehouse ? "Edit Warehouse" : "Add New Warehouse"}
        subtitle={editingWarehouse ? "Update warehouse details" : "Add a new distribution warehouse"}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Warehouse Name *</label>
              <input
                type="text"
                value={form.warehouseName}
                onChange={(e) => updateForm("warehouseName", e.target.value)}
                placeholder="Mumbai Central Warehouse"
                className={errors.warehouseName ? `${inputClass} border-destructive` : inputClass}
              />
              <FieldError error={errors.warehouseName} />
            </div>
            <div>
              <label className={labelClass}>Code *</label>
              <input
                type="text"
                value={form.warehouseCode}
                onChange={(e) => updateForm("warehouseCode", e.target.value.toUpperCase())}
                placeholder="WH-MH"
                className={errors.warehouseCode ? `${inputClass} border-destructive` : inputClass}
              />
              <FieldError error={errors.warehouseCode} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Address *</label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => updateForm("address", e.target.value)}
              placeholder="Bhiwandi Industrial Area"
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>City *</label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => updateForm("city", e.target.value)}
                placeholder="Mumbai"
                className={errors.city ? `${inputClass} border-destructive` : inputClass}
              />
              <FieldError error={errors.city} />
            </div>
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
              {editingWarehouse ? "Update Warehouse" : "Add Warehouse"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

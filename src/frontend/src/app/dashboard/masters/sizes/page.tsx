"use client";

import { useState, useEffect, useCallback } from "react";
import api, { type ApiResponse } from "@/lib/api";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/status-badge";
import { FieldError } from "@/components/ui/field-error";
import { required, hasErrors, type ValidationError } from "@/lib/validators";

interface SizeChart {
  sizeChartId: string;
  sizeType: string;
  gender: string;
  usSize: string;
  euroSize: string;
  ukSize: string;
  indSize: string;
  inches: string;
  cm: string;
  isActive: boolean;
}

const SIZE_TYPES = ["Footwear", "Apparel"];
const FOOTWEAR_GENDERS = ["Men", "Women", "Infants", "Toddlers", "Little Kids", "Big Kids"];
const APPAREL_GENDERS = ["Men", "Women", "Boys", "Girls"];

const inputClass = "w-full px-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary";
const selectClass = "w-full px-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background";
const labelClass = "block text-sm font-medium mb-1.5";

const emptyForm = () => ({
  sizeType: "Footwear",
  gender: "Men",
  usSize: "",
  euroSize: "",
  ukSize: "",
  indSize: "",
  inches: "",
  cm: "",
  isActive: true,
});

export default function SizeChartPage() {
  const [sizes, setSizes] = useState<SizeChart[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSize, setEditingSize] = useState<SizeChart | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [errors, setErrors] = useState<ValidationError>({});

  // Tab state
  const [activeSizeType, setActiveSizeType] = useState<string>("Footwear");
  const [activeGender, setActiveGender] = useState<string>("Men");

  const updateForm = (field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const genderOptions = activeSizeType === "Footwear" ? FOOTWEAR_GENDERS : APPAREL_GENDERS;

  const fetchSizes = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<ApiResponse<any>>("/api/sizecharts", {
        params: {
          sizeType: activeSizeType,
          gender: activeGender,
          searchTerm: search || undefined,
          pageNumber: page,
          pageSize: 25,
        },
      });
      if (data.success) {
        setSizes(data.data?.items || []);
        setTotalCount(data.data?.totalCount || 0);
      }
    } catch {
      setSizes([]);
    } finally {
      setLoading(false);
    }
  }, [activeSizeType, activeGender, page, search]);

  useEffect(() => {
    fetchSizes();
  }, [fetchSizes]);

  // Reset gender when size type changes
  useEffect(() => {
    const genders = activeSizeType === "Footwear" ? FOOTWEAR_GENDERS : APPAREL_GENDERS;
    if (!genders.includes(activeGender)) {
      setActiveGender(genders[0]);
    }
  }, [activeSizeType, activeGender]);

  const openAdd = () => {
    setEditingSize(null);
    setForm({
      ...emptyForm(),
      sizeType: activeSizeType,
      gender: activeGender,
    });
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (size: SizeChart) => {
    setEditingSize(size);
    setErrors({});
    setForm({
      sizeType: size.sizeType,
      gender: size.gender,
      usSize: size.usSize,
      euroSize: size.euroSize,
      ukSize: size.ukSize,
      indSize: size.indSize,
      inches: size.inches,
      cm: size.cm,
      isActive: size.isActive ?? true,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    const newErrors: ValidationError = {
      indSize: required(form.indSize, "IND Size"),
    };
    if (hasErrors(newErrors)) { setErrors(newErrors); return; }
    try {
      if (editingSize) {
        await api.put(`/api/sizecharts/${editingSize.sizeChartId}`, form);
      } else {
        await api.post("/api/sizecharts", form);
      }
      setModalOpen(false);
      fetchSizes();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to save size");
    }
  };

  const handleDelete = async (size: SizeChart) => {
    if (!confirm(`Delete size entry "${size.usSize || size.indSize}"?`)) return;
    try {
      await api.delete(`/api/sizecharts/${size.sizeChartId}`);
      fetchSizes();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to delete size");
    }
  };

  const handleImport = () => {
    // Stub: would open file picker for CSV import
    alert("CSV Import functionality will be implemented. Please prepare a CSV with columns: US Size, Euro Size, UK Size, IND Size, Inches, CM");
  };

  const handleExport = () => {
    // Stub: would trigger CSV download
    alert("Export functionality will generate a CSV download for the current size chart view.");
  };

  const columns: Column<SizeChart>[] = [
    { key: "usSize", header: "US Sizes" },
    { key: "euroSize", header: "Euro Sizes" },
    { key: "ukSize", header: "UK Sizes" },
    { key: "indSize", header: "IND Sizes" },
    { key: "inches", header: "Inches", className: "text-right" },
    { key: "cm", header: "CM", className: "text-right" },
  ];

  // Form gender options based on selected size type in modal
  const formGenderOptions = form.sizeType === "Footwear" ? FOOTWEAR_GENDERS : APPAREL_GENDERS;

  return (
    <div className="space-y-4">
      {/* Page Title */}
      <div>
        <h1 className="text-xl font-semibold">Size Chart Master</h1>
        <p className="text-sm text-muted-foreground">
          Manage footwear and apparel size conversion charts
        </p>
      </div>

      {/* Size Type Tabs */}
      <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg w-fit">
        {SIZE_TYPES.map((type) => (
          <button
            key={type}
            onClick={() => {
              setActiveSizeType(type);
              setPage(1);
            }}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeSizeType === type
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {type} Sizes
          </button>
        ))}
      </div>

      {/* Gender Sub-Tabs */}
      <div className="flex items-center gap-2 border-b">
        {genderOptions.map((gender) => (
          <button
            key={gender}
            onClick={() => {
              setActiveGender(gender);
              setPage(1);
            }}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeGender === gender
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
            }`}
          >
            {gender}
          </button>
        ))}
      </div>

      {/* DataTable */}
      <DataTable
        title={`${activeSizeType} Sizes - ${activeGender}`}
        columns={columns}
        data={sizes}
        totalCount={totalCount}
        pageNumber={page}
        pageSize={25}
        onPageChange={setPage}
        onSearch={setSearch}
        onAdd={openAdd}
        onEdit={openEdit}
        onDelete={handleDelete}
        onImport={handleImport}
        onExport={handleExport}
        addLabel="Add Size"
        loading={loading}
        keyExtractor={(s) => s.sizeChartId}
      />

      {/* Add/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingSize ? "Edit Size" : "Add Size"}
        subtitle={editingSize ? "Update size chart entry" : "Add a new size chart entry"}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Size Type *</label>
              <select
                value={form.sizeType}
                onChange={(e) => updateForm("sizeType", e.target.value)}
                className={selectClass}
              >
                {SIZE_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Gender *</label>
              <select
                value={form.gender}
                onChange={(e) => updateForm("gender", e.target.value)}
                className={selectClass}
              >
                {formGenderOptions.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>US Size</label>
              <input
                type="text"
                value={form.usSize}
                onChange={(e) => updateForm("usSize", e.target.value)}
                placeholder="10"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Euro Size</label>
              <input
                type="text"
                value={form.euroSize}
                onChange={(e) => updateForm("euroSize", e.target.value)}
                placeholder="44"
                className={inputClass}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>UK Size</label>
              <input
                type="text"
                value={form.ukSize}
                onChange={(e) => updateForm("ukSize", e.target.value)}
                placeholder="9"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>IND Size *</label>
              <input
                type="text"
                value={form.indSize}
                onChange={(e) => { updateForm("indSize", e.target.value); setErrors((p) => ({ ...p, indSize: "" })); }}
                placeholder="9"
                className={`${inputClass} ${errors.indSize ? "border-destructive" : ""}`}
              />
              <FieldError error={errors.indSize} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>CM</label>
              <input
                type="text"
                value={form.cm}
                onChange={(e) => updateForm("cm", e.target.value)}
                placeholder="28"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Inches</label>
              <input
                type="text"
                value={form.inches}
                onChange={(e) => updateForm("inches", e.target.value)}
                placeholder="11.02"
                className={inputClass}
              />
            </div>
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
              {editingSize ? "Update Size" : "Add Size"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

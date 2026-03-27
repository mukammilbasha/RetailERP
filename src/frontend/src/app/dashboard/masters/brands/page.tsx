"use client";

import { useState, useEffect, useCallback } from "react";
import api, { type ApiResponse } from "@/lib/api";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/status-badge";
import { FieldError } from "@/components/ui/field-error";
import { required, hasErrors, type ValidationError } from "@/lib/validators";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm-dialog";

interface Brand {
  brandId: string;
  brandName: string;
  isActive: boolean;
}

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<"All" | "Active" | "Inactive">("All");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [formName, setFormName] = useState("");
  const [formActive, setFormActive] = useState(true);
  const [errors, setErrors] = useState<ValidationError>({});
  const { showToast } = useToast();
  const { confirm } = useConfirm();

  const fetchBrands = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<ApiResponse<any>>("/api/brands", {
        params: { searchTerm: search || undefined, pageNumber: page, pageSize: 25,
          isActive: activeFilter === "Active" ? true : activeFilter === "Inactive" ? false : undefined },
      });
      if (data.success) {
        setBrands(data.data.items || []);
        setTotalCount(data.data.totalCount || 0);
      }
    } catch {
      setBrands([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, activeFilter]);

  useEffect(() => { fetchBrands(); }, [fetchBrands]);

  const openAdd = () => {
    setEditingBrand(null);
    setFormName("");
    setFormActive(true);
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (brand: Brand) => {
    setEditingBrand(brand);
    setFormName(brand.brandName);
    setFormActive(brand.isActive);
    setErrors({});
    setModalOpen(true);
  };

  const handleSave = async () => {
    const newErrors: ValidationError = { brandName: required(formName, "Brand Name") };
    if (hasErrors(newErrors)) { setErrors(newErrors); return; }
    try {
      if (editingBrand) {
        await api.put(`/api/brands/${editingBrand.brandId}`, {
          name: formName,
          isActive: formActive,
        });
      } else {
        await api.post("/api/brands", { name: formName, isActive: formActive });
      }
      showToast("success", editingBrand ? "Brand Updated" : "Brand Created", editingBrand ? "Brand has been updated." : "Brand has been added.");
      setModalOpen(false);
      fetchBrands();
    } catch (err: any) {
      showToast("error", "Failed to Save", err.response?.data?.message || "An error occurred.");
    }
  };

  const handleDelete = async (brand: Brand) => {
    const confirmed = await confirm({
      title: "Delete Brand",
      message: `Are you sure you want to delete "${brand.brandName}"? This action cannot be undone.`,
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!confirmed) return;
    try {
      await api.delete(`/api/brands/${brand.brandId}`);
      showToast("success", "Deleted", `"${brand.brandName}" has been removed.`);
      fetchBrands();
    } catch (err: any) {
      showToast("error", "Failed to Delete", err.response?.data?.message || "An error occurred.");
    }
  };

  const columns: Column<Brand>[] = [
    { key: "brandName", header: "Brand Name" },
    {
      key: "isActive", header: "Status",
      render: (b) => <StatusBadge status={b.isActive ? "Active" : "Inactive"} />,
    },
  ];

  return (
    <>
      {/* Active/Inactive filter */}
      <div className="flex items-center gap-1 bg-muted/40 rounded-lg p-1 w-fit mb-4">
        {(["All", "Active", "Inactive"] as const).map((f) => (
          <button key={f} onClick={() => { setActiveFilter(f); setPage(1); }}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${activeFilter === f ? "bg-background shadow text-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`}>
            {f}
          </button>
        ))}
      </div>
      <DataTable
        title="Brands"
        subtitle="Manage product brands"
        columns={columns}
        data={brands}
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
        addLabel="Add Brand"
        loading={loading}
        keyExtractor={(b) => b.brandId}
      />

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingBrand ? "Edit Brand" : "Add Brand"}
        subtitle={editingBrand ? "Update brand details" : "Add a new brand"}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Brand Name *</label>
            <input
              type="text"
              value={formName}
              onChange={(e) => { setFormName(e.target.value); setErrors((p) => ({ ...p, brandName: "" })); }}
              placeholder="Enter brand name"
              className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${errors.brandName ? "border-destructive" : "border-input"}`}
            />
            <FieldError error={errors.brandName} />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setFormActive(!formActive)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formActive ? "bg-primary" : "bg-gray-300"}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formActive ? "translate-x-6" : "translate-x-1"}`} />
            </button>
            <span className="text-sm">Active</span>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm border rounded-lg hover:bg-muted">
              Cancel
            </button>
            <button onClick={handleSave} className="px-6 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium">
              {editingBrand ? "Update Brand" : "Add Brand"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

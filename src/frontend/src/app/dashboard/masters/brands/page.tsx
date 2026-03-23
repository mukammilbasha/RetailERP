"use client";

import { useState, useEffect, useCallback } from "react";
import api, { type ApiResponse } from "@/lib/api";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/status-badge";

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
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [formName, setFormName] = useState("");
  const [formActive, setFormActive] = useState(true);

  const fetchBrands = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<ApiResponse<any>>("/api/brands", {
        params: { searchTerm: search || undefined, pageNumber: page, pageSize: 25 },
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
  }, [page, search]);

  useEffect(() => { fetchBrands(); }, [fetchBrands]);

  const openAdd = () => {
    setEditingBrand(null);
    setFormName("");
    setFormActive(true);
    setModalOpen(true);
  };

  const openEdit = (brand: Brand) => {
    setEditingBrand(brand);
    setFormName(brand.brandName);
    setFormActive(brand.isActive);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) return;
    try {
      if (editingBrand) {
        await api.put(`/api/brands/${editingBrand.brandId}`, {
          brandName: formName,
          isActive: formActive,
        });
      } else {
        await api.post("/api/brands", { name: formName, isActive: formActive });
      }
      setModalOpen(false);
      fetchBrands();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to save brand");
    }
  };

  const handleDelete = async (brand: Brand) => {
    if (!confirm(`Delete brand "${brand.brandName}"?`)) return;
    try {
      await api.delete(`/api/brands/${brand.brandId}`);
      fetchBrands();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to delete brand");
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
              onChange={(e) => setFormName(e.target.value)}
              placeholder="Enter brand name"
              className="w-full px-4 py-2.5 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
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

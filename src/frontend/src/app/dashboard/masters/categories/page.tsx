"use client";

import { useState, useEffect, useCallback } from "react";
import api, { type ApiResponse } from "@/lib/api";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/status-badge";
import { FieldError } from "@/components/ui/field-error";
import { required, hasErrors, type ValidationError } from "@/lib/validators";

interface Category {
  categoryId: string;
  categoryName: string;
  isActive: boolean;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formName, setFormName] = useState("");
  const [formActive, setFormActive] = useState(true);
  const [errors, setErrors] = useState<ValidationError>({});

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<ApiResponse<any>>("/api/categories", {
        params: { searchTerm: search || undefined, pageNumber: page, pageSize: 25 },
      });
      if (data.success) {
        setCategories(data.data.items || []);
        setTotalCount(data.data.totalCount || 0);
      }
    } catch {
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const openAdd = () => {
    setEditingCategory(null);
    setFormName("");
    setFormActive(true);
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (category: Category) => {
    setEditingCategory(category);
    setFormName(category.categoryName);
    setFormActive(category.isActive);
    setErrors({});
    setModalOpen(true);
  };

  const handleSave = async () => {
    const newErrors: ValidationError = { categoryName: required(formName, "Category Name") };
    if (hasErrors(newErrors)) { setErrors(newErrors); return; }
    try {
      if (editingCategory) {
        await api.put(`/api/categories/${editingCategory.categoryId}`, {
          categoryName: formName,
          isActive: formActive,
        });
      } else {
        await api.post("/api/categories", { name: formName, isActive: formActive });
      }
      setModalOpen(false);
      fetchCategories();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to save category");
    }
  };

  const handleDelete = async (category: Category) => {
    if (!confirm(`Delete category "${category.categoryName}"?`)) return;
    try {
      await api.delete(`/api/categories/${category.categoryId}`);
      fetchCategories();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to delete category");
    }
  };

  const columns: Column<Category>[] = [
    { key: "categoryName", header: "Category Name" },
    {
      key: "isActive", header: "Status",
      render: (c) => <StatusBadge status={c.isActive ? "Active" : "Inactive"} />,
    },
  ];

  return (
    <>
      <DataTable
        title="Categories"
        subtitle="Manage product categories"
        columns={columns}
        data={categories}
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
        addLabel="Add Category"
        loading={loading}
        keyExtractor={(c) => c.categoryId}
      />

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingCategory ? "Edit Category" : "Add Category"}
        subtitle={editingCategory ? "Update category details" : "Add a new category"}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Category Name *</label>
            <input
              type="text"
              value={formName}
              onChange={(e) => { setFormName(e.target.value); setErrors((p) => ({ ...p, categoryName: "" })); }}
              placeholder="Enter category name"
              className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${errors.categoryName ? "border-destructive" : "border-input"}`}
            />
            <FieldError error={errors.categoryName} />
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
              {editingCategory ? "Update Category" : "Add Category"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

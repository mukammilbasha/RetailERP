"use client";

import { useState, useEffect, useCallback } from "react";
import api, { type ApiResponse } from "@/lib/api";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { FieldError } from "@/components/ui/field-error";
import { required, hasErrors, type ValidationError } from "@/lib/validators";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm-dialog";

interface Category {
  categoryId: string;
  categoryName: string;
}

interface SubCategory {
  subCategoryId: string;
  subCategoryName: string;
  categoryId: string;
  categoryName: string;
}

export default function SubCategoriesPage() {
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<"All" | "Active" | "Inactive">("All");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSubCategory, setEditingSubCategory] = useState<SubCategory | null>(null);
  const [formName, setFormName] = useState("");
  const [formCategoryId, setFormCategoryId] = useState("");
  const [errors, setErrors] = useState<ValidationError>({});
  const { showToast } = useToast();
  const { confirm } = useConfirm();

  const fetchSubCategories = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<ApiResponse<any>>("/api/subcategories", {
        params: { searchTerm: search || undefined, pageNumber: page, pageSize: 25, isActive: activeFilter === "Active" ? true : activeFilter === "Inactive" ? false : undefined },
      });
      if (data.success) {
        setSubCategories(data.data.items || []);
        setTotalCount(data.data.totalCount || 0);
      }
    } catch {
      setSubCategories([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, activeFilter]);

  const fetchCategories = useCallback(async () => {
    try {
      const { data } = await api.get<ApiResponse<any>>("/api/categories", {
        params: { pageSize: 1000 },
      });
      if (data.success) {
        setCategories(data.data.items || []);
      }
    } catch {
      setCategories([]);
    }
  }, []);

  useEffect(() => { fetchSubCategories(); }, [fetchSubCategories]);
  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const openAdd = () => {
    setEditingSubCategory(null);
    setFormName("");
    setFormCategoryId("");
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (subCategory: SubCategory) => {
    setEditingSubCategory(subCategory);
    setFormName(subCategory.subCategoryName);
    setFormCategoryId(subCategory.categoryId);
    setErrors({});
    setModalOpen(true);
  };

  const handleSave = async () => {
    const newErrors: ValidationError = {
      categoryId: required(formCategoryId, "Category"),
      subCategoryName: required(formName, "Sub Category Name"),
    };
    if (hasErrors(newErrors)) { setErrors(newErrors); return; }
    try {
      if (editingSubCategory) {
        await api.put(`/api/subcategories/${editingSubCategory.subCategoryId}`, {
          name: formName,
          parentId: formCategoryId,
        });
      } else {
        await api.post("/api/subcategories", {
          name: formName,
          parentId: formCategoryId,
        });
      }
      showToast("success", editingSubCategory ? "Sub Category Updated" : "Sub Category Created", editingSubCategory ? "Sub Category has been updated." : "Sub Category has been added.");
      setModalOpen(false);
      fetchSubCategories();
    } catch (err: any) {
      showToast("error", "Failed to Save", err.response?.data?.message || "An error occurred.");
    }
  };

  const handleDelete = async (subCategory: SubCategory) => {
    const confirmed = await confirm({
      title: "Delete Sub Category",
      message: `Are you sure you want to delete "${subCategory.subCategoryName}"? This action cannot be undone.`,
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!confirmed) return;
    try {
      await api.delete(`/api/subcategories/${subCategory.subCategoryId}`);
      showToast("success", "Deleted", `"${subCategory.subCategoryName}" has been removed.`);
      fetchSubCategories();
    } catch (err: any) {
      showToast("error", "Failed to Delete", err.response?.data?.message || "An error occurred.");
    }
  };

  const columns: Column<SubCategory>[] = [
    { key: "categoryName", header: "Category" },
    { key: "subCategoryName", header: "Sub Category Name" },
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
        title="Sub Categories"
        subtitle="Manage product sub categories"
        columns={columns}
        data={subCategories}
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
        addLabel="Add Sub Category"
        loading={loading}
        keyExtractor={(s) => s.subCategoryId}
      />

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingSubCategory ? "Edit Sub Category" : "Add Sub Category"}
        subtitle={editingSubCategory ? "Update sub category details" : "Add a new sub category"}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Category *</label>
            <select
              value={formCategoryId}
              onChange={(e) => { setFormCategoryId(e.target.value); setErrors((p) => ({ ...p, categoryId: "" })); }}
              className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-transparent ${errors.categoryId ? "border-destructive" : "border-input"}`}
            >
              <option value="">Select a category</option>
              {categories.map((cat) => (
                <option key={cat.categoryId} value={cat.categoryId}>
                  {cat.categoryName}
                </option>
              ))}
            </select>
            <FieldError error={errors.categoryId} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Sub Category Name *</label>
            <input
              type="text"
              value={formName}
              onChange={(e) => { setFormName(e.target.value); setErrors((p) => ({ ...p, subCategoryName: "" })); }}
              placeholder="Enter sub category name"
              className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${errors.subCategoryName ? "border-destructive" : "border-input"}`}
            />
            <FieldError error={errors.subCategoryName} />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm border rounded-lg hover:bg-muted">
              Cancel
            </button>
            <button onClick={handleSave} className="px-6 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium">
              {editingSubCategory ? "Update Sub Category" : "Add Sub Category"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

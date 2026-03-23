"use client";

import { useState, useEffect, useCallback } from "react";
import api, { type ApiResponse } from "@/lib/api";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { FieldError } from "@/components/ui/field-error";
import { required, hasErrors, type ValidationError } from "@/lib/validators";

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
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSubCategory, setEditingSubCategory] = useState<SubCategory | null>(null);
  const [formName, setFormName] = useState("");
  const [formCategoryId, setFormCategoryId] = useState("");
  const [errors, setErrors] = useState<ValidationError>({});

  const fetchSubCategories = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<ApiResponse<any>>("/api/subcategories", {
        params: { searchTerm: search || undefined, pageNumber: page, pageSize: 25 },
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
  }, [page, search]);

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
          subCategoryName: formName,
          categoryId: formCategoryId,
        });
      } else {
        await api.post("/api/subcategories", {
          subCategoryName: formName,
          categoryId: formCategoryId,
        });
      }
      setModalOpen(false);
      fetchSubCategories();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to save sub category");
    }
  };

  const handleDelete = async (subCategory: SubCategory) => {
    if (!confirm(`Delete sub category "${subCategory.subCategoryName}"?`)) return;
    try {
      await api.delete(`/api/subcategories/${subCategory.subCategoryId}`);
      fetchSubCategories();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to delete sub category");
    }
  };

  const columns: Column<SubCategory>[] = [
    { key: "categoryName", header: "Category" },
    { key: "subCategoryName", header: "Sub Category Name" },
  ];

  return (
    <>
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

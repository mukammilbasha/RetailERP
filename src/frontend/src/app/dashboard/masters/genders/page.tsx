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

interface Gender {
  genderId: string;
  genderName: string;
  isActive: boolean;
}

export default function GendersPage() {
  const [genders, setGenders] = useState<Gender[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<"All" | "Active" | "Inactive">("All");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGender, setEditingGender] = useState<Gender | null>(null);
  const [formName, setFormName] = useState("");
  const [formActive, setFormActive] = useState(true);
  const [errors, setErrors] = useState<ValidationError>({});
  const { showToast } = useToast();
  const { confirm } = useConfirm();

  const fetchGenders = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<ApiResponse<any>>("/api/genders", {
        params: { searchTerm: search || undefined, pageNumber: page, pageSize: 25, isActive: activeFilter === "Active" ? true : activeFilter === "Inactive" ? false : undefined },
      });
      if (data.success) {
        setGenders(data.data.items || []);
        setTotalCount(data.data.totalCount || 0);
      }
    } catch {
      setGenders([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, activeFilter]);

  useEffect(() => { fetchGenders(); }, [fetchGenders]);

  const openAdd = () => {
    setEditingGender(null);
    setFormName("");
    setFormActive(true);
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (gender: Gender) => {
    setEditingGender(gender);
    setFormName(gender.genderName);
    setFormActive(gender.isActive);
    setErrors({});
    setModalOpen(true);
  };

  const handleSave = async () => {
    const newErrors: ValidationError = { genderName: required(formName, "Gender Name") };
    if (hasErrors(newErrors)) { setErrors(newErrors); return; }
    try {
      if (editingGender) {
        await api.put(`/api/genders/${editingGender.genderId}`, {
          name: formName,
          isActive: formActive,
        });
      } else {
        await api.post("/api/genders", { name: formName, isActive: formActive });
      }
      showToast("success", editingGender ? "Gender Updated" : "Gender Created", editingGender ? "Gender has been updated." : "Gender has been added.");
      setModalOpen(false);
      fetchGenders();
    } catch (err: any) {
      showToast("error", "Failed to Save", err.response?.data?.message || "An error occurred.");
    }
  };

  const handleDelete = async (gender: Gender) => {
    const confirmed = await confirm({
      title: "Delete Gender",
      message: `Are you sure you want to delete "${gender.genderName}"? This action cannot be undone.`,
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!confirmed) return;
    try {
      await api.delete(`/api/genders/${gender.genderId}`);
      showToast("success", "Deleted", `"${gender.genderName}" has been removed.`);
      fetchGenders();
    } catch (err: any) {
      showToast("error", "Failed to Delete", err.response?.data?.message || "An error occurred.");
    }
  };

  const columns: Column<Gender>[] = [
    { key: "genderName", header: "Gender Name" },
    {
      key: "isActive", header: "Status",
      render: (g) => <StatusBadge status={g.isActive ? "Active" : "Inactive"} />,
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
        title="Genders"
        subtitle="Manage product genders"
        columns={columns}
        data={genders}
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
        addLabel="Add Gender"
        loading={loading}
        keyExtractor={(g) => g.genderId}
      />

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingGender ? "Edit Gender" : "Add Gender"}
        subtitle={editingGender ? "Update gender details" : "Add a new gender"}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Gender Name *</label>
            <input
              type="text"
              value={formName}
              onChange={(e) => { setFormName(e.target.value); setErrors((p) => ({ ...p, genderName: "" })); }}
              placeholder="Enter gender name"
              className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${errors.genderName ? "border-destructive" : "border-input"}`}
            />
            <FieldError error={errors.genderName} />
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
              {editingGender ? "Update Gender" : "Add Gender"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

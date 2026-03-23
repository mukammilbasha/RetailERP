"use client";

import { useState, useEffect, useCallback } from "react";
import api, { type ApiResponse } from "@/lib/api";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/status-badge";

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
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGender, setEditingGender] = useState<Gender | null>(null);
  const [formName, setFormName] = useState("");
  const [formActive, setFormActive] = useState(true);

  const fetchGenders = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<ApiResponse<any>>("/api/genders", {
        params: { searchTerm: search || undefined, pageNumber: page, pageSize: 25 },
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
  }, [page, search]);

  useEffect(() => { fetchGenders(); }, [fetchGenders]);

  const openAdd = () => {
    setEditingGender(null);
    setFormName("");
    setFormActive(true);
    setModalOpen(true);
  };

  const openEdit = (gender: Gender) => {
    setEditingGender(gender);
    setFormName(gender.genderName);
    setFormActive(gender.isActive);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) return;
    try {
      if (editingGender) {
        await api.put(`/api/genders/${editingGender.genderId}`, {
          genderName: formName,
          isActive: formActive,
        });
      } else {
        await api.post("/api/genders", { name: formName, isActive: formActive });
      }
      setModalOpen(false);
      fetchGenders();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to save gender");
    }
  };

  const handleDelete = async (gender: Gender) => {
    if (!confirm(`Delete gender "${gender.genderName}"?`)) return;
    try {
      await api.delete(`/api/genders/${gender.genderId}`);
      fetchGenders();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to delete gender");
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
              onChange={(e) => setFormName(e.target.value)}
              placeholder="Enter gender name"
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
              {editingGender ? "Update Gender" : "Add Gender"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

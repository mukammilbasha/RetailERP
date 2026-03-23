"use client";

import { useState, useEffect, useCallback } from "react";
import api, { type ApiResponse } from "@/lib/api";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/status-badge";
import { FieldError } from "@/components/ui/field-error";
import { required, hasErrors, type ValidationError } from "@/lib/validators";

interface Segment {
  segmentId: string;
  segmentName: string;
  isActive: boolean;
}

export default function SegmentsPage() {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSegment, setEditingSegment] = useState<Segment | null>(null);
  const [formName, setFormName] = useState("");
  const [formActive, setFormActive] = useState(true);
  const [errors, setErrors] = useState<ValidationError>({});

  const fetchSegments = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<ApiResponse<any>>("/api/segments", {
        params: { searchTerm: search || undefined, pageNumber: page, pageSize: 25 },
      });
      if (data.success) {
        setSegments(data.data.items || []);
        setTotalCount(data.data.totalCount || 0);
      }
    } catch {
      setSegments([]);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchSegments(); }, [fetchSegments]);

  const openAdd = () => {
    setEditingSegment(null);
    setFormName("");
    setFormActive(true);
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (segment: Segment) => {
    setEditingSegment(segment);
    setFormName(segment.segmentName);
    setFormActive(segment.isActive);
    setErrors({});
    setModalOpen(true);
  };

  const handleSave = async () => {
    const newErrors: ValidationError = { segmentName: required(formName, "Segment Name") };
    if (hasErrors(newErrors)) { setErrors(newErrors); return; }
    try {
      if (editingSegment) {
        await api.put(`/api/segments/${editingSegment.segmentId}`, {
          segmentName: formName,
          isActive: formActive,
        });
      } else {
        await api.post("/api/segments", { name: formName, isActive: formActive });
      }
      setModalOpen(false);
      fetchSegments();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to save segment");
    }
  };

  const handleDelete = async (segment: Segment) => {
    if (!confirm(`Delete segment "${segment.segmentName}"?`)) return;
    try {
      await api.delete(`/api/segments/${segment.segmentId}`);
      fetchSegments();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to delete segment");
    }
  };

  const columns: Column<Segment>[] = [
    { key: "segmentName", header: "Segment Name" },
    {
      key: "isActive", header: "Status",
      render: (s) => <StatusBadge status={s.isActive ? "Active" : "Inactive"} />,
    },
  ];

  return (
    <>
      <DataTable
        title="Segments"
        subtitle="Manage product segments"
        columns={columns}
        data={segments}
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
        addLabel="Add Segment"
        loading={loading}
        keyExtractor={(s) => s.segmentId}
      />

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingSegment ? "Edit Segment" : "Add Segment"}
        subtitle={editingSegment ? "Update segment details" : "Add a new segment"}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Segment Name *</label>
            <input
              type="text"
              value={formName}
              onChange={(e) => { setFormName(e.target.value); setErrors((p) => ({ ...p, segmentName: "" })); }}
              placeholder="Enter segment name"
              className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${errors.segmentName ? "border-destructive" : "border-input"}`}
            />
            <FieldError error={errors.segmentName} />
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
              {editingSegment ? "Update Segment" : "Add Segment"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

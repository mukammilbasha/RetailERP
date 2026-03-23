"use client";

import { useState, useEffect, useCallback } from "react";
import api, { type ApiResponse } from "@/lib/api";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { FieldError } from "@/components/ui/field-error";
import { required, hasErrors, type ValidationError } from "@/lib/validators";

interface Segment {
  segmentId: string;
  segmentName: string;
}

interface SubSegment {
  subSegmentId: string;
  subSegmentName: string;
  segmentId: string;
  segmentName: string;
}

export default function SubSegmentsPage() {
  const [subSegments, setSubSegments] = useState<SubSegment[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSubSegment, setEditingSubSegment] = useState<SubSegment | null>(null);
  const [formName, setFormName] = useState("");
  const [formSegmentId, setFormSegmentId] = useState("");
  const [errors, setErrors] = useState<ValidationError>({});

  const fetchSubSegments = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<ApiResponse<any>>("/api/subsegments", {
        params: { searchTerm: search || undefined, pageNumber: page, pageSize: 25 },
      });
      if (data.success) {
        setSubSegments(data.data.items || []);
        setTotalCount(data.data.totalCount || 0);
      }
    } catch {
      setSubSegments([]);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  const fetchSegments = useCallback(async () => {
    try {
      const { data } = await api.get<ApiResponse<any>>("/api/segments", {
        params: { pageSize: 1000 },
      });
      if (data.success) {
        setSegments(data.data.items || []);
      }
    } catch {
      setSegments([]);
    }
  }, []);

  useEffect(() => { fetchSubSegments(); }, [fetchSubSegments]);
  useEffect(() => { fetchSegments(); }, [fetchSegments]);

  const openAdd = () => {
    setEditingSubSegment(null);
    setFormName("");
    setFormSegmentId("");
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (subSegment: SubSegment) => {
    setEditingSubSegment(subSegment);
    setFormName(subSegment.subSegmentName);
    setFormSegmentId(subSegment.segmentId);
    setErrors({});
    setModalOpen(true);
  };

  const handleSave = async () => {
    const newErrors: ValidationError = {
      segmentId: required(formSegmentId, "Segment"),
      subSegmentName: required(formName, "Sub Segment Name"),
    };
    if (hasErrors(newErrors)) { setErrors(newErrors); return; }
    try {
      if (editingSubSegment) {
        await api.put(`/api/subsegments/${editingSubSegment.subSegmentId}`, {
          subSegmentName: formName,
          segmentId: formSegmentId,
        });
      } else {
        await api.post("/api/subsegments", {
          subSegmentName: formName,
          segmentId: formSegmentId,
        });
      }
      setModalOpen(false);
      fetchSubSegments();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to save sub segment");
    }
  };

  const handleDelete = async (subSegment: SubSegment) => {
    if (!confirm(`Delete sub segment "${subSegment.subSegmentName}"?`)) return;
    try {
      await api.delete(`/api/subsegments/${subSegment.subSegmentId}`);
      fetchSubSegments();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to delete sub segment");
    }
  };

  const columns: Column<SubSegment>[] = [
    { key: "segmentName", header: "Segment" },
    { key: "subSegmentName", header: "Sub Segment Name" },
  ];

  return (
    <>
      <DataTable
        title="Sub Segments"
        subtitle="Manage product sub segments"
        columns={columns}
        data={subSegments}
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
        addLabel="Add Sub Segment"
        loading={loading}
        keyExtractor={(s) => s.subSegmentId}
      />

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingSubSegment ? "Edit Sub Segment" : "Add Sub Segment"}
        subtitle={editingSubSegment ? "Update sub segment details" : "Add a new sub segment"}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Segment *</label>
            <select
              value={formSegmentId}
              onChange={(e) => { setFormSegmentId(e.target.value); setErrors((p) => ({ ...p, segmentId: "" })); }}
              className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-transparent ${errors.segmentId ? "border-destructive" : "border-input"}`}
            >
              <option value="">Select a segment</option>
              {segments.map((seg) => (
                <option key={seg.segmentId} value={seg.segmentId}>
                  {seg.segmentName}
                </option>
              ))}
            </select>
            <FieldError error={errors.segmentId} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Sub Segment Name *</label>
            <input
              type="text"
              value={formName}
              onChange={(e) => { setFormName(e.target.value); setErrors((p) => ({ ...p, subSegmentName: "" })); }}
              placeholder="Enter sub segment name"
              className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${errors.subSegmentName ? "border-destructive" : "border-input"}`}
            />
            <FieldError error={errors.subSegmentName} />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm border rounded-lg hover:bg-muted">
              Cancel
            </button>
            <button onClick={handleSave} className="px-6 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium">
              {editingSubSegment ? "Update Sub Segment" : "Add Sub Segment"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

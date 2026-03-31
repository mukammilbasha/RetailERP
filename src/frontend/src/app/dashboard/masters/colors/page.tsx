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

interface Color {
  colorId: string;
  colorName: string;
  colorCode: string | null;
  isActive: boolean;
}

export default function ColorsPage() {
  const [colors, setColors] = useState<Color[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<"All" | "Active" | "Inactive">("All");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingColor, setEditingColor] = useState<Color | null>(null);
  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formActive, setFormActive] = useState(true);
  const [errors, setErrors] = useState<ValidationError>({});
  const { showToast } = useToast();
  const { confirm } = useConfirm();

  const fetchColors = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<ApiResponse<any>>("/api/colors", {
        params: { searchTerm: search || undefined, pageNumber: page, pageSize: 25,
          isActive: activeFilter === "Active" ? true : activeFilter === "Inactive" ? false : undefined },
      });
      if (data.success) {
        setColors(data.data.items || []);
        setTotalCount(data.data.totalCount || 0);
      }
    } catch {
      setColors([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, activeFilter]);

  useEffect(() => { fetchColors(); }, [fetchColors]);

  const openAdd = () => {
    setEditingColor(null);
    setFormName("");
    setFormCode("");
    setFormActive(true);
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (color: Color) => {
    setEditingColor(color);
    setFormName(color.colorName);
    setFormCode(color.colorCode || "");
    setFormActive(color.isActive);
    setErrors({});
    setModalOpen(true);
  };

  const handleSave = async () => {
    const newErrors: ValidationError = { colorName: required(formName, "Color Name") };
    if (hasErrors(newErrors)) { setErrors(newErrors); return; }
    try {
      if (editingColor) {
        await api.put(`/api/colors/${editingColor.colorId}`, {
          colorName: formName,
          colorCode: formCode || null,
          isActive: formActive,
        });
      } else {
        await api.post("/api/colors", { colorName: formName, colorCode: formCode || null, isActive: formActive });
      }
      showToast("success", editingColor ? "Color Updated" : "Color Created", editingColor ? "Color has been updated." : "Color has been added.");
      setModalOpen(false);
      fetchColors();
    } catch (err: any) {
      showToast("error", "Failed to Save", err.response?.data?.message || "An error occurred.");
    }
  };

  const handleDelete = async (color: Color) => {
    const confirmed = await confirm({
      title: "Delete Color",
      message: `Are you sure you want to delete "${color.colorName}"? This action cannot be undone.`,
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!confirmed) return;
    try {
      await api.delete(`/api/colors/${color.colorId}`);
      showToast("success", "Deleted", `"${color.colorName}" has been removed.`);
      fetchColors();
    } catch (err: any) {
      showToast("error", "Failed to Delete", err.response?.data?.message || "An error occurred.");
    }
  };

  const columns: Column<Color>[] = [
    { key: "colorName", header: "Color Name" },
    { key: "colorCode", header: "Short Name", render: (c) => <span className="font-mono text-xs">{c.colorCode || "—"}</span> },
    {
      key: "isActive", header: "Status",
      render: (c) => <StatusBadge status={c.isActive ? "Active" : "Inactive"} />,
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
        title="Colors"
        subtitle="Manage product colors and their short names"
        columns={columns}
        data={colors}
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
        addLabel="Add Color"
        loading={loading}
        keyExtractor={(c) => c.colorId}
      />

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingColor ? "Edit Color" : "Add Color"}
        subtitle={editingColor ? "Update color details" : "Add a new color"}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Color Name *</label>
            <input
              type="text"
              value={formName}
              onChange={(e) => { setFormName(e.target.value); setErrors((p) => ({ ...p, colorName: "" })); }}
              placeholder="Enter color name"
              className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${errors.colorName ? "border-destructive" : "border-input"}`}
            />
            <FieldError error={errors.colorName} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Short Name</label>
            <input
              type="text"
              value={formCode}
              onChange={(e) => setFormCode(e.target.value.toUpperCase())}
              placeholder="e.g. BLK, WHT, BRN"
              maxLength={20}
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
              {editingColor ? "Update Color" : "Add Color"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

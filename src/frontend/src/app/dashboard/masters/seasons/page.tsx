"use client";

import { useState, useEffect, useCallback } from "react";
import api, { type ApiResponse } from "@/lib/api";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";

interface Season {
  seasonId: string;
  seasonCode: string;
  startDate: string;
  endDate: string;
}

export default function SeasonsPage() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSeason, setEditingSeason] = useState<Season | null>(null);
  const [formCode, setFormCode] = useState("");
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");

  const fetchSeasons = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<ApiResponse<any>>("/api/seasons", {
        params: { searchTerm: search || undefined, pageNumber: page, pageSize: 25 },
      });
      if (data.success) {
        setSeasons(data.data.items || []);
        setTotalCount(data.data.totalCount || 0);
      }
    } catch {
      setSeasons([]);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchSeasons(); }, [fetchSeasons]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    return dateStr.substring(0, 10);
  };

  const openAdd = () => {
    setEditingSeason(null);
    setFormCode("");
    setFormStartDate("");
    setFormEndDate("");
    setModalOpen(true);
  };

  const openEdit = (season: Season) => {
    setEditingSeason(season);
    setFormCode(season.seasonCode);
    setFormStartDate(formatDate(season.startDate));
    setFormEndDate(formatDate(season.endDate));
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!formCode.trim()) return;
    if (!formStartDate || !formEndDate) return;
    try {
      if (editingSeason) {
        await api.put(`/api/seasons/${editingSeason.seasonId}`, {
          seasonCode: formCode,
          startDate: formStartDate,
          endDate: formEndDate,
        });
      } else {
        await api.post("/api/seasons", {
          seasonCode: formCode,
          startDate: formStartDate,
          endDate: formEndDate,
        });
      }
      setModalOpen(false);
      fetchSeasons();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to save season");
    }
  };

  const handleDelete = async (season: Season) => {
    if (!confirm(`Delete season "${season.seasonCode}"?`)) return;
    try {
      await api.delete(`/api/seasons/${season.seasonId}`);
      fetchSeasons();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to delete season");
    }
  };

  const columns: Column<Season>[] = [
    { key: "seasonCode", header: "Season Code" },
    {
      key: "startDate", header: "Start Date",
      render: (s) => formatDate(s.startDate),
    },
    {
      key: "endDate", header: "End Date",
      render: (s) => formatDate(s.endDate),
    },
  ];

  return (
    <>
      <DataTable
        title="Seasons"
        subtitle="Manage product seasons"
        columns={columns}
        data={seasons}
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
        addLabel="Add Season"
        loading={loading}
        keyExtractor={(s) => s.seasonId}
      />

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingSeason ? "Edit Season" : "Add Season"}
        subtitle={editingSeason ? "Update season details" : "Add a new season"}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Season Code *</label>
            <input
              type="text"
              value={formCode}
              onChange={(e) => setFormCode(e.target.value)}
              placeholder="Enter season code"
              className="w-full px-4 py-2.5 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Start Date *</label>
            <input
              type="date"
              value={formStartDate}
              onChange={(e) => setFormStartDate(e.target.value)}
              className="w-full px-4 py-2.5 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">End Date *</label>
            <input
              type="date"
              value={formEndDate}
              onChange={(e) => setFormEndDate(e.target.value)}
              className="w-full px-4 py-2.5 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm border rounded-lg hover:bg-muted">
              Cancel
            </button>
            <button onClick={handleSave} className="px-6 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium">
              {editingSeason ? "Update Season" : "Add Season"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

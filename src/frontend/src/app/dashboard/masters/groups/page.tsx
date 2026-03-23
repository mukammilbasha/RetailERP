"use client";

import { useState, useEffect, useCallback } from "react";
import api, { type ApiResponse } from "@/lib/api";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/status-badge";

interface Group {
  groupId: string;
  groupName: string;
  isActive: boolean;
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [formName, setFormName] = useState("");
  const [formActive, setFormActive] = useState(true);

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<ApiResponse<any>>("/api/groups", {
        params: { searchTerm: search || undefined, pageNumber: page, pageSize: 25 },
      });
      if (data.success) {
        setGroups(data.data.items || []);
        setTotalCount(data.data.totalCount || 0);
      }
    } catch {
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchGroups(); }, [fetchGroups]);

  const openAdd = () => {
    setEditingGroup(null);
    setFormName("");
    setFormActive(true);
    setModalOpen(true);
  };

  const openEdit = (group: Group) => {
    setEditingGroup(group);
    setFormName(group.groupName);
    setFormActive(group.isActive);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) return;
    try {
      if (editingGroup) {
        await api.put(`/api/groups/${editingGroup.groupId}`, {
          groupName: formName,
          isActive: formActive,
        });
      } else {
        await api.post("/api/groups", { name: formName, isActive: formActive });
      }
      setModalOpen(false);
      fetchGroups();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to save group");
    }
  };

  const handleDelete = async (group: Group) => {
    if (!confirm(`Delete group "${group.groupName}"?`)) return;
    try {
      await api.delete(`/api/groups/${group.groupId}`);
      fetchGroups();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to delete group");
    }
  };

  const columns: Column<Group>[] = [
    { key: "groupName", header: "Group Name" },
    {
      key: "isActive", header: "Status",
      render: (g) => <StatusBadge status={g.isActive ? "Active" : "Inactive"} />,
    },
  ];

  return (
    <>
      <DataTable
        title="Groups"
        subtitle="Manage product groups"
        columns={columns}
        data={groups}
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
        addLabel="Add Group"
        loading={loading}
        keyExtractor={(g) => g.groupId}
      />

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingGroup ? "Edit Group" : "Add Group"}
        subtitle={editingGroup ? "Update group details" : "Add a new group"}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Group Name *</label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="Enter group name"
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
              {editingGroup ? "Update Group" : "Add Group"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

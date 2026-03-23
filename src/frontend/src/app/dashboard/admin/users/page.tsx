"use client";

import { useState, useEffect, useCallback } from "react";
import api, { type ApiResponse } from "@/lib/api";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDate } from "@/lib/utils";
import { FieldError } from "@/components/ui/field-error";
import { required, pattern, minLength, PATTERNS, hasErrors, type ValidationError } from "@/lib/validators";

interface User {
  userId: string;
  fullName: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

interface Role {
  roleId: string;
  roleName: string;
}

const ROLE_COLORS: Record<string, string> = {
  Admin: "bg-blue-100 text-blue-700",
  Storemanager: "bg-purple-100 text-purple-700",
  Accountuser: "bg-yellow-100 text-yellow-700",
  Viewer: "bg-green-100 text-green-700",
};

const inputClass = "w-full px-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary";
const selectClass = "w-full px-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background";
const labelClass = "block text-sm font-medium mb-1.5";

const emptyForm = () => ({
  fullName: "",
  email: "",
  role: "",
  password: "Admin@123",
  isActive: true,
});

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [errors, setErrors] = useState<ValidationError>({});

  const updateForm = (field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<ApiResponse<any>>("/api/users", {
        params: { searchTerm: search || undefined, pageNumber: page, pageSize: 25 },
      });
      if (data.success) {
        const items = data.data?.items || data.data || [];
        setUsers(Array.isArray(items) ? items : []);
        setTotalCount(data.data?.totalCount || items.length || 0);
      }
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  const fetchRoles = useCallback(async () => {
    try {
      const { data } = await api.get<ApiResponse<any>>("/api/roles");
      if (data.success) {
        const items = data.data?.items || data.data || [];
        setRoles(Array.isArray(items) ? items : []);
      }
    } catch {
      setRoles([]);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const openAdd = () => {
    setEditingUser(null);
    setForm(emptyForm());
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (user: User) => {
    setEditingUser(user);
    setErrors({});
    setForm({
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      password: "",
      isActive: user.isActive,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    const newErrors: ValidationError = {
      fullName: required(form.fullName, "Full Name"),
      email: required(form.email, "Email") || pattern(form.email, PATTERNS.EMAIL, "Email"),
      role: required(form.role, "Role"),
      password: editingUser ? "" : (required(form.password, "Password") || minLength(form.password, 6, "Password")),
    };
    if (hasErrors(newErrors)) { setErrors(newErrors); return; }
    try {
      if (editingUser) {
        await api.put(`/api/users/${editingUser.userId}`, {
          fullName: form.fullName,
          email: form.email,
          role: form.role,
          isActive: form.isActive,
        });
      } else {
        await api.post("/api/users", {
          fullName: form.fullName,
          email: form.email,
          role: form.role,
          password: form.password,
          isActive: form.isActive,
        });
      }
      setModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to save user");
    }
  };

  const handleDelete = async (user: User) => {
    if (!confirm(`Delete user "${user.fullName}"?`)) return;
    try {
      await api.delete(`/api/users/${user.userId}`);
      fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to delete user");
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const columns: Column<User>[] = [
    {
      key: "fullName",
      header: "Name",
      render: (u) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
            {getInitials(u.fullName)}
          </div>
          <span>{u.fullName}</span>
        </div>
      ),
    },
    { key: "email", header: "Email" },
    {
      key: "role",
      header: "Role",
      render: (u) => (
        <span
          className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
            ROLE_COLORS[u.role] || "bg-gray-100 text-gray-700"
          }`}
        >
          {u.role}
        </span>
      ),
    },
    {
      key: "isActive",
      header: "Status",
      render: (u) => <StatusBadge status={u.isActive ? "Active" : "Inactive"} />,
    },
    {
      key: "createdAt",
      header: "Created",
      render: (u) => (u.createdAt ? formatDate(u.createdAt) : "-"),
    },
  ];

  // Build role options: use API roles if available, otherwise fallback
  const roleOptions =
    roles.length > 0
      ? roles.map((r) => ({ value: r.roleName, label: r.roleName }))
      : [
          { value: "Admin", label: "Admin" },
          { value: "Storemanager", label: "Storemanager" },
          { value: "Accountuser", label: "Accountuser" },
          { value: "Viewer", label: "Viewer" },
        ];

  return (
    <>
      <DataTable
        title="User Management"
        subtitle="Manage user accounts and role assignments"
        columns={columns}
        data={users}
        totalCount={totalCount}
        pageNumber={page}
        pageSize={25}
        onPageChange={setPage}
        onSearch={setSearch}
        onAdd={openAdd}
        onEdit={openEdit}
        onDelete={handleDelete}
        onExport={() => {}}
        addLabel="Add User"
        loading={loading}
        keyExtractor={(u) => u.userId}
      />

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingUser ? "Edit User" : "Add New User"}
        subtitle={
          editingUser
            ? "Update user account details"
            : "Create a new user account with role assignment"
        }
      >
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Full Name *</label>
            <input
              type="text"
              value={form.fullName}
              onChange={(e) => updateForm("fullName", e.target.value)}
              placeholder="John Doe"
              className={`${inputClass} ${errors.fullName ? "border-destructive" : ""}`}
            />
            <FieldError error={errors.fullName} />
          </div>
          <div>
            <label className={labelClass}>Email *</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => updateForm("email", e.target.value)}
              placeholder="john@company.com"
              className={`${inputClass} ${errors.email ? "border-destructive" : ""}`}
            />
            <FieldError error={errors.email} />
          </div>
          <div>
            <label className={labelClass}>Role *</label>
            <select
              value={form.role}
              onChange={(e) => updateForm("role", e.target.value)}
              className={`${selectClass} ${errors.role ? "border-destructive" : ""}`}
            >
              <option value="">Select role</option>
              {roleOptions.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            <FieldError error={errors.role} />
          </div>
          {!editingUser && (
            <div>
              <label className={labelClass}>Temporary Password *</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => updateForm("password", e.target.value)}
                className={`${inputClass} ${errors.password ? "border-destructive" : ""}`}
              />
              <FieldError error={errors.password} />
              <p className="text-xs text-muted-foreground mt-1">
                User will be prompted to change on first login
              </p>
            </div>
          )}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => updateForm("isActive", !form.isActive)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.isActive ? "bg-primary" : "bg-gray-300"}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.isActive ? "translate-x-6" : "translate-x-1"}`}
              />
            </button>
            <span className="text-sm">Active</span>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-sm border rounded-lg hover:bg-muted"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium"
            >
              {editingUser ? "Update User" : "Create User"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

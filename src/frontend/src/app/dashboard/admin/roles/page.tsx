"use client";

import { useState, useEffect, useCallback } from "react";
import api, { type ApiResponse } from "@/lib/api";
import { StatusBadge } from "@/components/ui/status-badge";
import { Modal } from "@/components/ui/modal";
import { FieldError } from "@/components/ui/field-error";
import { Shield, Save, Loader2, RefreshCw, Plus, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm-dialog";

interface Role {
  id: string;
  roleName: string;
  description?: string;
  isSystem?: boolean;
}

interface Permission {
  module: string;
  canView: boolean;
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

const DEFAULT_MODULES = [
  // Dashboard
  "Dashboard",
  // Masters
  "Articles", "Brands", "Categories", "Genders", "Groups",
  "Seasons", "Segments", "Sizes", "SKUs", "SubCategories", "SubSegments",
  // Inventory & Warehouse
  "Warehouses", "Stock", "StockAdjustment", "StockFreeze",
  // Sales & Orders
  "CustomerOrders", "ProductionOrders", "SalesChannels", "Transactions", "Dispatch",
  // Billing
  "Invoices", "PackingList", "DeliveryNotes", "Receipt", "Returns",
  // People
  "Clients", "Stores",
  // Admin & System
  "Users", "Roles", "CompanyMaster", "License", "Reports", "Audit",
];

const FALLBACK_ROLES: Role[] = [
  { id: "admin", roleName: "Admin", isSystem: true },
  { id: "accountuser", roleName: "Accountuser", isSystem: true },
  { id: "storemanager", roleName: "Storemanager", isSystem: true },
  { id: "viewer", roleName: "Viewer", isSystem: true },
];

const ROLE_TAB_COLORS: Record<string, string> = {
  Admin: "bg-blue-100 text-blue-700 border-blue-300",
  Accountuser: "bg-orange-100 text-orange-700 border-orange-300",
  Storemanager: "bg-red-100 text-red-700 border-red-300",
  Viewer: "bg-green-100 text-green-700 border-green-300",
};

const inputClass = "w-full px-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary";
const labelClass = "block text-sm font-medium mb-1.5";

export default function RolesPermissionsPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [activeRoleId, setActiveRoleId] = useState<string>("");
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingPerms, setLoadingPerms] = useState(false);

  // Role CRUD modal
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [roleForm, setRoleForm] = useState({ roleName: "", description: "" });
  const [roleErrors, setRoleErrors] = useState<Record<string, string>>({});
  const [savingRole, setSavingRole] = useState(false);
  const { showToast } = useToast();
  const { confirm: confirmDialog } = useConfirm();

  const fetchRoles = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<ApiResponse<any>>("/api/roles");
      if (data.success) {
        const items = data.data?.items || data.data || [];
        const roleList: Role[] =
          Array.isArray(items) && items.length > 0
            ? items.map((r: any) => ({
                id: r.id || r.roleId,
                roleName: r.roleName,
                description: r.description,
                isSystem: r.isSystem,
              }))
            : FALLBACK_ROLES;
        setRoles(roleList);
        if (roleList.length > 0 && !activeRoleId) {
          setActiveRoleId(roleList[0].id);
        }
      }
    } catch {
      setRoles(FALLBACK_ROLES);
      if (!activeRoleId) setActiveRoleId(FALLBACK_ROLES[0].id);
    } finally {
      setLoading(false);
    }
  }, [activeRoleId]);

  const fetchPermissions = useCallback(async (roleId: string) => {
    if (!roleId) return;
    setLoadingPerms(true);
    try {
      const { data } = await api.get<ApiResponse<any>>(`/api/roles/${roleId}/permissions`);
      const perms = data.success ? data.data || [] : [];
      const apiPerms: Permission[] = Array.isArray(perms) ? perms : [];

      const permMap = new Map<string, Permission>();
      apiPerms.forEach((p: Permission) => permMap.set(p.module, p));

      const merged = DEFAULT_MODULES.map((m) => {
        const saved = permMap.get(m);
        return saved
          ? { module: m, canView: saved.canView, canAdd: saved.canAdd, canEdit: saved.canEdit, canDelete: saved.canDelete }
          : { module: m, canView: false, canAdd: false, canEdit: false, canDelete: false };
      });

      apiPerms.forEach((p: Permission) => {
        if (!DEFAULT_MODULES.includes(p.module)) merged.push(p);
      });

      setPermissions(merged);
    } catch {
      setPermissions(
        DEFAULT_MODULES.map((m) => ({ module: m, canView: false, canAdd: false, canEdit: false, canDelete: false }))
      );
    } finally {
      setLoadingPerms(false);
    }
  }, []);

  useEffect(() => { fetchRoles(); }, [fetchRoles]);

  useEffect(() => {
    if (activeRoleId) fetchPermissions(activeRoleId);
  }, [activeRoleId, fetchPermissions]);

  const togglePermission = (moduleIndex: number, field: keyof Permission) => {
    setPermissions((prev) =>
      prev.map((p, i) => (i === moduleIndex ? { ...p, [field]: !p[field] } : p))
    );
  };

  const toggleAllForModule = (moduleIndex: number) => {
    setPermissions((prev) => {
      const current = prev[moduleIndex];
      const allChecked = current.canView && current.canAdd && current.canEdit && current.canDelete;
      return prev.map((p, i) =>
        i === moduleIndex
          ? { ...p, canView: !allChecked, canAdd: !allChecked, canEdit: !allChecked, canDelete: !allChecked }
          : p
      );
    });
  };

  const handleSave = async () => {
    if (!activeRoleId) return;
    setSaving(true);
    try {
      await api.put(`/api/roles/${activeRoleId}/permissions`, { permissions });
      showToast("success", "Permissions Saved", "Role permissions have been updated successfully.");
    } catch (err: any) {
      showToast("error", "Failed to Save", err.response?.data?.message || "An error occurred.");
    } finally {
      setSaving(false);
    }
  };

  // Role CRUD
  const openAddRole = () => {
    setEditingRole(null);
    setRoleForm({ roleName: "", description: "" });
    setRoleErrors({});
    setRoleModalOpen(true);
  };

  const openEditRole = (role: Role) => {
    setEditingRole(role);
    setRoleForm({ roleName: role.roleName, description: role.description || "" });
    setRoleErrors({});
    setRoleModalOpen(true);
  };

  const handleSaveRole = async () => {
    const errors: Record<string, string> = {};
    if (!roleForm.roleName.trim()) errors.roleName = "Role name is required";
    if (Object.keys(errors).length > 0) { setRoleErrors(errors); return; }

    setSavingRole(true);
    try {
      if (editingRole) {
        await api.put(`/api/roles/${editingRole.id}`, roleForm);
      } else {
        await api.post("/api/roles", roleForm);
      }
      setRoleModalOpen(false);
      showToast("success", editingRole ? "Role Updated" : "Role Created", editingRole ? `"${roleForm.roleName}" has been updated.` : `"${roleForm.roleName}" has been created.`);
      setActiveRoleId(""); // reset so first role is selected
      fetchRoles();
    } catch (err: any) {
      showToast("error", "Failed to Save", err.response?.data?.message || "An error occurred.");
    } finally {
      setSavingRole(false);
    }
  };

  const handleDeleteRole = async (role: Role) => {
    if (role.isSystem) { showToast("error", "Cannot Delete", "System roles cannot be deleted."); return; }
    const confirmed = await confirmDialog({
      title: "Delete Role",
      message: `Are you sure you want to delete "${role.roleName}"? Users with this role will need to be reassigned. This action cannot be undone.`,
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!confirmed) return;
    try {
      await api.delete(`/api/roles/${role.id}`);
      showToast("success", "Deleted", `"${role.roleName}" has been removed.`);
      if (activeRoleId === role.id) setActiveRoleId("");
      fetchRoles();
    } catch (err: any) {
      showToast("error", "Failed to Delete", err.response?.data?.message || "An error occurred.");
    }
  };

  const activeRole = roles.find((r) => r.id === activeRoleId);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
          Loading roles...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Shield size={20} className="text-primary" />
            Roles & Permissions
          </h1>
          <p className="text-sm text-muted-foreground">
            Configure access permissions for each role
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { fetchRoles(); if (activeRoleId) fetchPermissions(activeRoleId); }}
            className="flex items-center gap-1.5 px-3 py-2.5 text-sm border rounded-lg hover:bg-muted transition-colors"
            title="Refresh"
          >
            <RefreshCw size={14} />
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium disabled:opacity-50 transition-colors"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? "Saving..." : "Save Permissions"}
          </button>
        </div>
      </div>

      {/* Role Tabs */}
      <div className="flex items-center gap-2 border-b pb-0 flex-wrap">
        {roles.map((role) => (
          <div key={role.id} className="relative group flex items-center">
            <button
              onClick={() => setActiveRoleId(role.id)}
              className={`px-4 py-2.5 text-sm font-medium rounded-t-lg border border-b-0 transition-colors ${
                activeRoleId === role.id
                  ? ROLE_TAB_COLORS[role.roleName] || "bg-primary/10 text-primary border-primary/30"
                  : "bg-muted/30 text-muted-foreground border-transparent hover:bg-muted/50"
              }`}
            >
              {role.roleName}
            </button>
            {/* Edit/Delete icons on hover */}
            {!role.isSystem && (
              <div className="absolute -top-1 -right-1 hidden group-hover:flex gap-0.5 z-10">
                <button
                  onClick={(e) => { e.stopPropagation(); openEditRole(role); }}
                  className="p-0.5 rounded bg-white border shadow-sm hover:bg-blue-50 text-blue-600"
                  title="Edit role"
                >
                  <Pencil size={10} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteRole(role); }}
                  className="p-0.5 rounded bg-white border shadow-sm hover:bg-red-50 text-red-600"
                  title="Delete role"
                >
                  <Trash2 size={10} />
                </button>
              </div>
            )}
          </div>
        ))}
        {/* Add role button */}
        <button
          onClick={openAddRole}
          className="px-3 py-2.5 text-sm font-medium rounded-t-lg border border-b-0 border-dashed border-primary/40 text-primary/70 hover:bg-primary/5 transition-colors flex items-center gap-1"
          title="Add new role"
        >
          <Plus size={14} /> New Role
        </button>
      </div>

      {/* Permission Matrix */}
      <div className="border rounded-lg overflow-hidden">
        {loadingPerms ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
              Loading permissions...
            </div>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider w-1/3">
                  Module
                </th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground text-xs uppercase tracking-wider">View</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground text-xs uppercase tracking-wider">Add</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground text-xs uppercase tracking-wider">Edit</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground text-xs uppercase tracking-wider">Delete</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground text-xs uppercase tracking-wider w-24">All</th>
              </tr>
            </thead>
            <tbody>
              {permissions.map((perm, idx) => {
                const allChecked = perm.canView && perm.canAdd && perm.canEdit && perm.canDelete;
                return (
                  <tr key={perm.module} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">{perm.module}</td>
                    <td className="px-4 py-3 text-center">
                      <input type="checkbox" checked={perm.canView} onChange={() => togglePermission(idx, "canView")}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/20 cursor-pointer" />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input type="checkbox" checked={perm.canAdd} onChange={() => togglePermission(idx, "canAdd")}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/20 cursor-pointer" />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input type="checkbox" checked={perm.canEdit} onChange={() => togglePermission(idx, "canEdit")}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/20 cursor-pointer" />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input type="checkbox" checked={perm.canDelete} onChange={() => togglePermission(idx, "canDelete")}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/20 cursor-pointer" />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input type="checkbox" checked={allChecked} onChange={() => toggleAllForModule(idx)}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/20 cursor-pointer" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Role Info Footer */}
      {activeRole && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Currently editing permissions for:</span>
          <StatusBadge status={activeRole.roleName} />
          {activeRole.isSystem && (
            <span className="text-xs text-muted-foreground">(system role)</span>
          )}
        </div>
      )}

      {/* Add/Edit Role Modal */}
      <Modal
        isOpen={roleModalOpen}
        onClose={() => setRoleModalOpen(false)}
        title={editingRole ? "Edit Role" : "Add New Role"}
        subtitle={editingRole ? "Update role name and description" : "Create a new role for user assignment"}
      >
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Role Name *</label>
            <input
              type="text"
              value={roleForm.roleName}
              onChange={(e) => { setRoleForm((p) => ({ ...p, roleName: e.target.value })); setRoleErrors((p) => ({ ...p, roleName: "" })); }}
              placeholder="e.g. Supervisor"
              className={`${inputClass} ${roleErrors.roleName ? "border-destructive" : ""}`}
            />
            <FieldError error={roleErrors.roleName} />
          </div>
          <div>
            <label className={labelClass}>Description</label>
            <input
              type="text"
              value={roleForm.description}
              onChange={(e) => setRoleForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="Optional description"
              className={inputClass}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button onClick={() => setRoleModalOpen(false)} className="px-4 py-2 text-sm border rounded-lg hover:bg-muted">
              Cancel
            </button>
            <button
              onClick={handleSaveRole}
              disabled={savingRole}
              className="flex items-center gap-2 px-6 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium disabled:opacity-50"
            >
              {savingRole ? <Loader2 size={14} className="animate-spin" /> : null}
              {editingRole ? "Update Role" : "Create Role"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

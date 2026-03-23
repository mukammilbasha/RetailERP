"use client";

import { useState, useEffect, useCallback } from "react";
import api, { type ApiResponse } from "@/lib/api";
import { StatusBadge } from "@/components/ui/status-badge";
import { Shield, Save, Loader2 } from "lucide-react";

interface Role {
  id: string;
  roleName: string;
  description?: string;
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
  "Articles",
  "Brands",
  "Categories",
  "Genders",
  "Groups",
  "Seasons",
  "Segments",
  "Sizes",
  "SKUs",
  "SubCategories",
  "SubSegments",
  // Inventory & Warehouse
  "Warehouses",
  "Stock",
  "StockAdjustment",
  "StockFreeze",
  // Sales & Orders
  "CustomerOrders",
  "ProductionOrders",
  "SalesChannels",
  "Transactions",
  "Dispatch",
  // Billing
  "Invoices",
  "PackingList",
  "DeliveryNotes",
  "Receipt",
  "Returns",
  // People
  "Clients",
  "Stores",
  // Admin & System
  "Users",
  "Roles",
  "CompanyMaster",
  "License",
  "Reports",
  "Audit",
];

const FALLBACK_ROLES: Role[] = [
  { id: "admin", roleName: "Admin" },
  { id: "accountuser", roleName: "Accountuser" },
  { id: "storemanager", roleName: "Storemanager" },
  { id: "viewer", roleName: "Viewer" },
];

const ROLE_TAB_COLORS: Record<string, string> = {
  Admin: "bg-blue-100 text-blue-700 border-blue-300",
  Accountuser: "bg-orange-100 text-orange-700 border-orange-300",
  Storemanager: "bg-red-100 text-red-700 border-red-300",
  Viewer: "bg-green-100 text-green-700 border-green-300",
};

export default function RolesPermissionsPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [activeRoleId, setActiveRoleId] = useState<string>("");
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingPerms, setLoadingPerms] = useState(false);

  const fetchRoles = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<ApiResponse<any>>("/api/roles");
      if (data.success) {
        const items = data.data?.items || data.data || [];
        const roleList: Role[] = Array.isArray(items) && items.length > 0
          ? items.map((r: any) => ({ id: r.id || r.roleId, roleName: r.roleName, description: r.description }))
          : FALLBACK_ROLES;
        setRoles(roleList);
        if (roleList.length > 0 && !activeRoleId) {
          setActiveRoleId(roleList[0].id);
        }
      }
    } catch {
      setRoles(FALLBACK_ROLES);
      if (!activeRoleId) {
        setActiveRoleId(FALLBACK_ROLES[0].id);
      }
    } finally {
      setLoading(false);
    }
  }, [activeRoleId]);

  const fetchPermissions = useCallback(async (roleId: string) => {
    if (!roleId) return;
    setLoadingPerms(true);
    try {
      const { data } = await api.get<ApiResponse<any>>(`/api/roles/${roleId}/permissions`);
      const perms = data.success ? (data.data || []) : [];
      const apiPerms: Permission[] = Array.isArray(perms) ? perms : [];

      // Merge: show all DEFAULT_MODULES, fill in saved permissions from API
      const permMap = new Map<string, Permission>();
      apiPerms.forEach((p: Permission) => permMap.set(p.module, p));

      const merged = DEFAULT_MODULES.map((m) => {
        const saved = permMap.get(m);
        return saved
          ? { module: m, canView: saved.canView, canAdd: saved.canAdd, canEdit: saved.canEdit, canDelete: saved.canDelete }
          : { module: m, canView: false, canAdd: false, canEdit: false, canDelete: false };
      });

      // Also add any API modules not in DEFAULT_MODULES
      apiPerms.forEach((p: Permission) => {
        if (!DEFAULT_MODULES.includes(p.module)) {
          merged.push(p);
        }
      });

      setPermissions(merged);
    } catch {
      setPermissions(
        DEFAULT_MODULES.map((m) => ({
          module: m,
          canView: false,
          canAdd: false,
          canEdit: false,
          canDelete: false,
        }))
      );
    } finally {
      setLoadingPerms(false);
    }
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  useEffect(() => {
    if (activeRoleId) {
      fetchPermissions(activeRoleId);
    }
  }, [activeRoleId, fetchPermissions]);

  const togglePermission = (moduleIndex: number, field: keyof Permission) => {
    setPermissions((prev) =>
      prev.map((p, i) =>
        i === moduleIndex ? { ...p, [field]: !p[field] } : p
      )
    );
  };

  const toggleAllForModule = (moduleIndex: number) => {
    setPermissions((prev) => {
      const current = prev[moduleIndex];
      const allChecked =
        current.canView && current.canAdd && current.canEdit && current.canDelete;
      return prev.map((p, i) =>
        i === moduleIndex
          ? {
              ...p,
              canView: !allChecked,
              canAdd: !allChecked,
              canEdit: !allChecked,
              canDelete: !allChecked,
            }
          : p
      );
    });
  };

  const handleSave = async () => {
    if (!activeRoleId) return;
    setSaving(true);
    try {
      await api.put(`/api/roles/${activeRoleId}/permissions`, { permissions });
      alert("Permissions saved successfully");
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to save permissions");
    } finally {
      setSaving(false);
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
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium disabled:opacity-50 transition-colors"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {saving ? "Saving..." : "Save Permissions"}
        </button>
      </div>

      {/* Role Tabs */}
      <div className="flex items-center gap-2 border-b pb-0">
        {roles.map((role) => (
          <button
            key={role.id}
            onClick={() => setActiveRoleId(role.id)}
            className={`px-4 py-2.5 text-sm font-medium rounded-t-lg border border-b-0 transition-colors ${
              activeRoleId === role.id
                ? ROLE_TAB_COLORS[role.roleName] ||
                  "bg-primary/10 text-primary border-primary/30"
                : "bg-muted/30 text-muted-foreground border-transparent hover:bg-muted/50"
            }`}
          >
            {role.roleName}
          </button>
        ))}
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
                <th className="px-4 py-3 text-center font-medium text-muted-foreground text-xs uppercase tracking-wider">
                  View
                </th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground text-xs uppercase tracking-wider">
                  Add
                </th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground text-xs uppercase tracking-wider">
                  Edit
                </th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground text-xs uppercase tracking-wider">
                  Delete
                </th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground text-xs uppercase tracking-wider w-24">
                  All
                </th>
              </tr>
            </thead>
            <tbody>
              {permissions.map((perm, idx) => {
                const allChecked =
                  perm.canView && perm.canAdd && perm.canEdit && perm.canDelete;
                return (
                  <tr
                    key={perm.module}
                    className="border-b hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium">{perm.module}</td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={perm.canView}
                        onChange={() => togglePermission(idx, "canView")}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/20 cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={perm.canAdd}
                        onChange={() => togglePermission(idx, "canAdd")}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/20 cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={perm.canEdit}
                        onChange={() => togglePermission(idx, "canEdit")}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/20 cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={perm.canDelete}
                        onChange={() => togglePermission(idx, "canDelete")}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/20 cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={allChecked}
                        onChange={() => toggleAllForModule(idx)}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/20 cursor-pointer"
                      />
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
        </div>
      )}
    </div>
  );
}

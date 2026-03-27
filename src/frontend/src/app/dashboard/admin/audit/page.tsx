"use client";

import { useState, useEffect, useCallback } from "react";
import api, { type ApiResponse } from "@/lib/api";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDate } from "@/lib/utils";
import {
  Search,
  Filter,
  Download,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";

interface AuditRecord {
  auditId: string;
  timestamp: string;
  userName: string;
  action: string;
  module: string;
  recordId: string;
  details: string;
}

const ACTIONS = ["Created", "Updated", "Deleted"];
const MODULES = [
  "Brands",
  "Articles",
  "Colours",
  "Categories",
  "Clients",
  "Stores",
  "Warehouses",
  "Stock",
  "Orders",
  "Invoices",
  "Packing",
  "Users",
];

const actionStyles: Record<string, string> = {
  Created: "bg-green-100 text-green-700",
  Updated: "bg-blue-100 text-blue-700",
  Deleted: "bg-red-100 text-red-700",
};

export default function AuditLogPage() {
  const [records, setRecords] = useState<AuditRecord[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [apiAvailable, setApiAvailable] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterUser, setFilterUser] = useState("");
  const [filterModule, setFilterModule] = useState("");
  const [filterAction, setFilterAction] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Users for filter dropdown
  const [users, setUsers] = useState<{ userId: string; fullName: string }[]>([]);

  const pageSize = 25;
  const totalPages = Math.ceil(totalCount / pageSize);
  const from = totalCount > 0 ? (page - 1) * pageSize + 1 : 0;
  const to = Math.min(page * pageSize, totalCount);

  const fetchAuditRecords = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<ApiResponse<any>>("/api/audit", {
        params: {
          searchTerm: searchTerm || undefined,
          pageNumber: page,
          pageSize,
          dateFrom: filterDateFrom || undefined,
          dateTo: filterDateTo || undefined,
          userId: filterUser || undefined,
          module: filterModule || undefined,
          action: filterAction || undefined,
        },
      });
      if (data.success) {
        setRecords(data.data?.items || []);
        setTotalCount(data.data?.totalCount || 0);
        setApiAvailable(true);
      }
    } catch {
      setRecords([]);
      setTotalCount(0);
      setApiAvailable(false);
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm, filterDateFrom, filterDateTo, filterUser, filterModule, filterAction]);

  const fetchUsers = useCallback(async () => {
    try {
      const { data } = await api.get<ApiResponse<any>>("/api/users", {
        params: { pageSize: 200 },
      });
      if (data.success) setUsers(data.data?.items || []);
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchAuditRecords();
  }, [fetchAuditRecords]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const clearFilters = () => {
    setFilterDateFrom("");
    setFilterDateTo("");
    setFilterUser("");
    setFilterModule("");
    setFilterAction("");
    setPage(1);
  };

  const hasActiveFilters =
    filterDateFrom || filterDateTo || filterUser || filterModule || filterAction;

  const formatTimestamp = (ts: string) => {
    try {
      const d = new Date(ts);
      return `${d.toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
        day: "2-digit",
      })} ${d.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })}`;
    } catch {
      return ts;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10">
            <ShieldCheck size={20} className="text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Audit Log</h1>
            <p className="text-sm text-muted-foreground">
              Complete audit trail of all system activities
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchAuditRecords}
            className="flex items-center gap-1.5 px-3 py-2 text-sm border rounded-lg hover:bg-muted transition-colors"
            title="Refresh"
          >
            <RefreshCw size={14} />
          </button>
          <button
            onClick={() => {}}
            className="flex items-center gap-1.5 px-3 py-2 text-sm border rounded-lg hover:bg-muted transition-colors"
          >
            <Download size={14} /> Export
          </button>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            placeholder="Search audit records..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1.5 px-3 py-2 text-sm border rounded-lg hover:bg-muted transition-colors ${
            hasActiveFilters ? "border-primary text-primary" : ""
          }`}
        >
          <Filter size={14} /> Filters{hasActiveFilters ? " (active)" : ""}
        </button>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="border rounded-lg p-4 bg-muted/20 space-y-3">
          <div className="grid grid-cols-5 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Date From
              </label>
              <input
                type="date"
                value={filterDateFrom}
                onChange={(e) => {
                  setFilterDateFrom(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Date To
              </label>
              <input
                type="date"
                value={filterDateTo}
                onChange={(e) => {
                  setFilterDateTo(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                User
              </label>
              <select
                value={filterUser}
                onChange={(e) => {
                  setFilterUser(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="">All Users</option>
                {users.map((u) => (
                  <option key={u.userId} value={u.userId}>
                    {u.fullName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Module
              </label>
              <select
                value={filterModule}
                onChange={(e) => {
                  setFilterModule(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="">All Modules</option>
                {MODULES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Action
              </label>
              <select
                value={filterAction}
                onChange={(e) => {
                  setFilterAction(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="">All Actions</option>
                {ACTIONS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {hasActiveFilters && (
            <div className="flex justify-end">
              <button
                onClick={clearFilters}
                className="text-xs text-primary hover:underline"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* API unavailable notice */}
      {!apiAvailable && !loading && (
        <div className="border border-yellow-200 bg-yellow-50 rounded-lg p-4 text-sm text-yellow-800">
          The audit log API is currently unavailable. Records will appear here once the
          audit service is active.
        </div>
      )}

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">
                  User
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">
                  Action
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">
                  Module
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">
                  Record ID
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">
                  Details
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                      Loading...
                    </div>
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <ShieldCheck size={32} className="text-muted-foreground/50" />
                      <p>No audit records found</p>
                      <p className="text-xs">
                        {hasActiveFilters
                          ? "Try adjusting your filters."
                          : "Audit records will appear here as system activities occur."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                records.map((record) => (
                  <tr
                    key={record.auditId}
                    className="border-b hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3 text-xs whitespace-nowrap">
                      {formatTimestamp(record.timestamp)}
                    </td>
                    <td className="px-4 py-3">{record.userName}</td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        status={record.action}
                        className={actionStyles[record.action] || ""}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground">
                        {record.module}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{record.recordId}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-xs truncate">
                      {record.details}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 bg-muted/20 border-t text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <span>Rows per page:</span>
            <select className="border rounded px-2 py-1 text-xs">
              <option>25</option>
              <option>50</option>
              <option>100</option>
            </select>
            <span>
              {from}-{to} of {totalCount}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page <= 1}
              className="p-1 rounded hover:bg-muted disabled:opacity-30"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs">
              Page {page} of {totalPages || 1}
            </span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages}
              className="p-1 rounded hover:bg-muted disabled:opacity-30"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

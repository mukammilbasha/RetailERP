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
} from "lucide-react";

interface Transaction {
  stockMovementId: string;
  movementDate: string;
  warehouseName: string;
  articleName: string;
  colourName: string;
  movementType: string;
  inQuantity: number;
  outQuantity: number;
  referenceNo: string;
}

interface Warehouse {
  warehouseId: string;
  warehouseName: string;
}

const MOVEMENT_TYPES = ["Purchase", "Production", "Sales", "Return", "Adjustment"];

const movementTypeStyles: Record<string, string> = {
  Purchase: "bg-green-100 text-green-700",
  Production: "bg-purple-100 text-purple-700",
  Sales: "bg-blue-100 text-blue-700",
  Return: "bg-orange-100 text-orange-700",
  Adjustment: "bg-yellow-100 text-yellow-700",
};

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const pageSize = 25;

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterWarehouseId, setFilterWarehouseId] = useState("");
  const [filterMovementType, setFilterMovementType] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Dropdown data
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  const totalPages = Math.ceil(totalCount / pageSize);
  const from = totalCount > 0 ? (page - 1) * pageSize + 1 : 0;
  const to = Math.min(page * pageSize, totalCount);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<ApiResponse<any>>("/api/stock/movements", {
        params: {
          searchTerm: searchTerm || undefined,
          pageNumber: page,
          pageSize,
          dateFrom: filterDateFrom || undefined,
          dateTo: filterDateTo || undefined,
          warehouseId: filterWarehouseId || undefined,
          movementType: filterMovementType || undefined,
        },
      });
      if (data.success) {
        setTransactions(data.data?.items || []);
        setTotalCount(data.data?.totalCount || 0);
      }
    } catch {
      setTransactions([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm, filterDateFrom, filterDateTo, filterWarehouseId, filterMovementType]);

  const fetchWarehouses = useCallback(async () => {
    try {
      const { data } = await api.get<ApiResponse<any>>("/api/warehouses", {
        params: { pageSize: 200 },
      });
      if (data.success) setWarehouses(data.data?.items || []);
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  useEffect(() => {
    fetchWarehouses();
  }, [fetchWarehouses]);

  const clearFilters = () => {
    setFilterDateFrom("");
    setFilterDateTo("");
    setFilterWarehouseId("");
    setFilterMovementType("");
    setPage(1);
  };

  const hasActiveFilters = filterDateFrom || filterDateTo || filterWarehouseId || filterMovementType;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Transactions</h1>
          <p className="text-sm text-muted-foreground">
            Complete stock movement ledger across all warehouses
          </p>
        </div>
        <div className="flex items-center gap-2">
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
            placeholder="Search by article, warehouse, reference..."
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
          <div className="grid grid-cols-4 gap-4">
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
                Warehouse
              </label>
              <select
                value={filterWarehouseId}
                onChange={(e) => {
                  setFilterWarehouseId(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="">All Warehouses</option>
                {warehouses.map((w) => (
                  <option key={w.warehouseId} value={w.warehouseId}>
                    {w.warehouseName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Movement Type
              </label>
              <select
                value={filterMovementType}
                onChange={(e) => {
                  setFilterMovementType(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="">All Types</option>
                {MOVEMENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
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

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">
                  Date
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">
                  Warehouse
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">
                  Article
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">
                  Colour
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">
                  Movement Type
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground text-xs uppercase tracking-wider">
                  In Qty
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground text-xs uppercase tracking-wider">
                  Out Qty
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">
                  Reference
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                      Loading...
                    </div>
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                    No transaction records found
                  </td>
                </tr>
              ) : (
                transactions.map((txn) => (
                  <tr
                    key={txn.stockMovementId}
                    className="border-b hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3">{formatDate(txn.movementDate)}</td>
                    <td className="px-4 py-3">{txn.warehouseName}</td>
                    <td className="px-4 py-3">{txn.articleName}</td>
                    <td className="px-4 py-3">{txn.colourName || "-"}</td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        status={txn.movementType}
                        className={movementTypeStyles[txn.movementType] || ""}
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      {txn.inQuantity > 0 ? (
                        <span className="font-semibold text-green-700">
                          +{txn.inQuantity}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {txn.outQuantity > 0 ? (
                        <span className="font-semibold text-red-700">
                          -{txn.outQuantity}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {txn.referenceNo || "-"}
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
